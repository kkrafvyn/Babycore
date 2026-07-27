# Capacitor plugins and bridge
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

-keep public class * extends com.getcapacitor.Plugin { *; }

-keep @com.getcapacitor.NativePlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# Readable crash reports in Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# App shell
-keep class com.cradlyn.app.** { *; }

# Native wearables / Health Connect
-keep class com.babycore.wearables.** { *; }
-keep class androidx.health.connect.** { *; }
-dontwarn androidx.health.connect.**

# Firebase / Google Play services (when google-services.json is present)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.**

# Kotlin metadata used by reflection
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
