package com.babycore.wearables

import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

@CapacitorPlugin(name = "NativeWearables")
class NativeWearablesPlugin : Plugin() {
    private val providerPackageName = "com.google.android.apps.healthdata"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pendingPermissionCall: PluginCall? = null
    private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null

    private val readPermissions = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(BodyTemperatureRecord::class),
    )

    override fun load() {
        permissionLauncher = bridge.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) { grantedPermissions: Set<String> ->
            val call = pendingPermissionCall ?: return@registerForActivityResult
            pendingPermissionCall = null

            val granted = grantedPermissions.containsAll(readPermissions)
            val payload = JSObject().apply {
                put("granted", granted)
                put("source", "health_connect")
                if (!granted) {
                    put("reason", "Health Connect permissions were not fully granted.")
                }
            }
            call.resolve(payload)
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val availability = getAvailability()
        val payload = JSObject().apply {
            put("available", availability.available)
            put("source", "health_connect")
            availability.reason?.let { put("reason", it) }
        }
        call.resolve(payload)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val availability = getAvailability()
        if (!availability.available) {
            call.resolve(
                JSObject().apply {
                    put("granted", false)
                    put("source", "health_connect")
                    put("reason", availability.reason ?: "Health Connect is unavailable on this device.")
                },
            )
            return
        }

        if (pendingPermissionCall != null) {
            call.resolve(
                JSObject().apply {
                    put("granted", false)
                    put("source", "health_connect")
                    put("reason", "A Health Connect permission request is already in progress.")
                },
            )
            return
        }

        scope.launch {
            try {
                val grantedPermissions = getClient().permissionController.getGrantedPermissions()
                if (grantedPermissions.containsAll(readPermissions)) {
                    call.resolve(
                        JSObject().apply {
                            put("granted", true)
                            put("source", "health_connect")
                            put("reason", JSONObject.NULL)
                        },
                    )
                    return@launch
                }
            } catch (error: Exception) {
                call.resolve(
                    JSObject().apply {
                        put("granted", false)
                        put("source", "health_connect")
                        put("reason", error.localizedMessage ?: "Unable to inspect Health Connect permissions.")
                    },
                )
                return@launch
            }

            Handler(Looper.getMainLooper()).post {
                val launcher = permissionLauncher
                if (launcher == null) {
                    call.resolve(
                        JSObject().apply {
                            put("granted", false)
                            put("source", "health_connect")
                            put("reason", "Health Connect permission launcher is unavailable.")
                        },
                    )
                } else {
                    pendingPermissionCall = call
                    launcher.launch(readPermissions)
                }
            }
        }
    }

    @PluginMethod
    fun syncSince(call: PluginCall) {
        val availability = getAvailability()
        if (!availability.available) {
            call.reject(availability.reason ?: "Health Connect is unavailable on this device.")
            return
        }

        scope.launch {
            try {
                val client = getClient()
                val grantedPermissions = client.permissionController.getGrantedPermissions()
                if (!grantedPermissions.containsAll(readPermissions)) {
                    call.reject("Health Connect permissions are required before syncing.")
                    return@launch
                }

                val start = parseStartInstant(call)
                val end = Instant.now()
                val samples = mutableListOf<JSObject>()

                samples += readHeartRateSamples(client, start, end)
                samples += readStepSamples(client, start, end)
                samples += readSleepSamples(client, start, end)
                samples += readExerciseSamples(client, start, end)
                samples += readTemperatureSamples(client, start, end)

                val sorted = samples.sortedByDescending { sample ->
                    sample.getString("recordedAt") ?: ""
                }

                val payload = JSObject().apply {
                    put("source", "health_connect")
                    put("samples", JSArray().also { array -> sorted.forEach(array::put) })
                }

                call.resolve(payload)
            } catch (error: Exception) {
                call.reject(error.localizedMessage ?: "Unable to sync Health Connect data.")
            }
        }
    }

    private fun getAvailability(): AvailabilityStatus {
        return when (HealthConnectClient.getSdkStatus(context, providerPackageName)) {
            HealthConnectClient.SDK_AVAILABLE -> AvailabilityStatus(true, null)
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> AvailabilityStatus(
                false,
                "Health Connect needs to be installed or updated on this device.",
            )
            else -> AvailabilityStatus(false, "Health Connect is unavailable on this Android device.")
        }
    }

    private fun getClient(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    private fun parseStartInstant(call: PluginCall): Instant {
        val since = call.getString("since")
        return try {
            if (since.isNullOrBlank()) {
                Instant.now().minus(7, ChronoUnit.DAYS)
            } else {
                Instant.parse(since)
            }
        } catch (_: Exception) {
            Instant.now().minus(7, ChronoUnit.DAYS)
        }
    }

    private suspend fun readHeartRateSamples(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<JSObject> {
        val response = client.readRecords(
            ReadRecordsRequest<HeartRateRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageSize = 250,
            ),
        )

        return response.records.flatMap { record ->
            record.samples.map { sample ->
                sampleObject(
                    dataType = "heart_rate",
                    value = sample.beatsPerMinute.toDouble(),
                    unit = "bpm",
                    recordedAt = sample.time.toString(),
                )
            }
        }
    }

    private suspend fun readStepSamples(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<JSObject> {
        val response = client.readRecords(
            ReadRecordsRequest<StepsRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageSize = 250,
            ),
        )

        return response.records.map { record ->
            sampleObject(
                dataType = "steps",
                value = record.count.toDouble(),
                unit = "steps",
                recordedAt = record.endTime.toString(),
            )
        }
    }

    private suspend fun readSleepSamples(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<JSObject> {
        val response = client.readRecords(
            ReadRecordsRequest<SleepSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageSize = 250,
            ),
        )

        return response.records.map { record ->
            val hours = Duration.between(record.startTime, record.endTime).toMinutes().toDouble() / 60.0
            sampleObject(
                dataType = "sleep",
                value = hours,
                unit = "hours",
                recordedAt = record.endTime.toString(),
            )
        }
    }

    private suspend fun readExerciseSamples(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<JSObject> {
        val response = client.readRecords(
            ReadRecordsRequest<ExerciseSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageSize = 250,
            ),
        )

        return response.records.map { record ->
            val minutes = Duration.between(record.startTime, record.endTime).toMinutes().toDouble()
            sampleObject(
                dataType = "activity",
                value = minutes,
                unit = "minutes",
                recordedAt = record.endTime.toString(),
            )
        }
    }

    private suspend fun readTemperatureSamples(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<JSObject> {
        val response = client.readRecords(
            ReadRecordsRequest<BodyTemperatureRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageSize = 250,
            ),
        )

        return response.records.map { record ->
            sampleObject(
                dataType = "temperature",
                value = record.temperature.inCelsius,
                unit = "C",
                recordedAt = record.time.toString(),
            )
        }
    }

    private fun sampleObject(
        dataType: String,
        value: Double,
        unit: String,
        recordedAt: String,
    ): JSObject {
        return JSObject().apply {
            put("dataType", dataType)
            put("value", value)
            put("unit", unit)
            put("recordedAt", recordedAt)
            put("source", "health_connect")
        }
    }

    private data class AvailabilityStatus(
        val available: Boolean,
        val reason: String?,
    )
}
