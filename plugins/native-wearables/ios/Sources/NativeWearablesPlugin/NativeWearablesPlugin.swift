import Foundation
import Capacitor
import HealthKit

@objc(NativeWearablesPlugin)
public class NativeWearablesPlugin: CAPPlugin {
  private let healthStore = HKHealthStore()
  private let isoFormatter = ISO8601DateFormatter()

  @objc func isAvailable(_ call: CAPPluginCall) {
    let available = HKHealthStore.isHealthDataAvailable()
    call.resolve([
      "available": available,
      "source": available ? "apple_health" : NSNull(),
      "reason": available ? NSNull() : "HealthKit is unavailable on this device."
    ])
  }

  @objc func requestPermissions(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable() else {
      call.resolve([
        "granted": false,
        "source": NSNull(),
        "reason": "HealthKit is unavailable on this device."
      ])
      return
    }

    let readTypes = readAuthorizationTypes()
    healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, error in
      DispatchQueue.main.async {
        if let error = error {
          call.resolve([
            "granted": false,
            "source": "apple_health",
            "reason": error.localizedDescription
          ])
          return
        }

        call.resolve([
          "granted": success,
          "source": "apple_health",
          "reason": success ? NSNull() : "HealthKit permission was denied."
        ])
      }
    }
  }

  @objc func syncSince(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable() else {
      call.reject("HealthKit is unavailable on this device.")
      return
    }

    let startDate = parseStartDate(from: call)
    let group = DispatchGroup()
    let lock = NSLock()
    var allSamples: [[String: Any]] = []

    let appendSamples: ([[String: Any]]) -> Void = { samples in
      lock.lock()
      allSamples.append(contentsOf: samples)
      lock.unlock()
    }

    group.enter()
    queryQuantitySamples(
      identifier: .stepCount,
      from: startDate,
      unit: HKUnit.count(),
      unitLabel: "steps",
      dataType: "steps"
    ) { samples in
      appendSamples(samples)
      group.leave()
    }

    group.enter()
    queryQuantitySamples(
      identifier: .heartRate,
      from: startDate,
      unit: HKUnit.count().unitDivided(by: .minute()),
      unitLabel: "bpm",
      dataType: "heart_rate"
    ) { samples in
      appendSamples(samples)
      group.leave()
    }

    group.enter()
    queryQuantitySamples(
      identifier: .bodyTemperature,
      from: startDate,
      unit: HKUnit.degreeCelsius(),
      unitLabel: "C",
      dataType: "temperature"
    ) { samples in
      appendSamples(samples)
      group.leave()
    }

    group.enter()
    querySleepSamples(from: startDate) { samples in
      appendSamples(samples)
      group.leave()
    }

    group.enter()
    queryWorkoutSamples(from: startDate) { samples in
      appendSamples(samples)
      group.leave()
    }

    group.notify(queue: .main) {
      let sorted = allSamples.sorted { left, right in
        let leftDate = String(describing: left["recordedAt"] ?? "")
        let rightDate = String(describing: right["recordedAt"] ?? "")
        return leftDate > rightDate
      }

      call.resolve([
        "source": "apple_health",
        "samples": sorted
      ])
    }
  }

  private func parseStartDate(from call: CAPPluginCall) -> Date {
    if let since = call.getString("since"), let parsed = isoFormatter.date(from: since) {
      return parsed
    }

    return Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date(timeIntervalSinceNow: -604800)
  }

  private func readAuthorizationTypes() -> Set<HKObjectType> {
    var types = Set<HKObjectType>()

    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
      types.insert(steps)
    }

    if let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate) {
      types.insert(heartRate)
    }

    if let bodyTemperature = HKObjectType.quantityType(forIdentifier: .bodyTemperature) {
      types.insert(bodyTemperature)
    }

    if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
      types.insert(sleep)
    }

    types.insert(HKObjectType.workoutType())
    return types
  }

  private func queryQuantitySamples(
    identifier: HKQuantityTypeIdentifier,
    from startDate: Date,
    unit: HKUnit,
    unitLabel: String,
    dataType: String,
    completion: @escaping ([[String: Any]]) -> Void
  ) {
    guard let sampleType = HKObjectType.quantityType(forIdentifier: identifier) else {
      completion([])
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
    let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
    let query = HKSampleQuery(sampleType: sampleType, predicate: predicate, limit: 250, sortDescriptors: sortDescriptors) {
      _, samples, _ in
      let entries = (samples as? [HKQuantitySample] ?? []).map { sample in
        [
          "dataType": dataType,
          "value": sample.quantity.doubleValue(for: unit),
          "unit": unitLabel,
          "recordedAt": self.isoFormatter.string(from: sample.endDate),
          "source": "apple_health"
        ] as [String: Any]
      }
      completion(entries)
    }

    healthStore.execute(query)
  }

  private func querySleepSamples(from startDate: Date, completion: @escaping ([[String: Any]]) -> Void) {
    guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
      completion([])
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
    let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
    let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 250, sortDescriptors: sortDescriptors) {
      _, samples, _ in
      let entries = (samples as? [HKCategorySample] ?? []).compactMap { sample -> [String: Any]? in
        if sample.value == HKCategoryValueSleepAnalysis.inBed.rawValue ||
            sample.value == HKCategoryValueSleepAnalysis.awake.rawValue {
          return nil
        }

        let hours = sample.endDate.timeIntervalSince(sample.startDate) / 3600.0
        return [
          "dataType": "sleep",
          "value": hours,
          "unit": "hours",
          "recordedAt": self.isoFormatter.string(from: sample.endDate),
          "source": "apple_health"
        ]
      }
      completion(entries)
    }

    healthStore.execute(query)
  }

  private func queryWorkoutSamples(from startDate: Date, completion: @escaping ([[String: Any]]) -> Void) {
    let workoutType = HKObjectType.workoutType()
    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
    let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
    let query = HKSampleQuery(sampleType: workoutType, predicate: predicate, limit: 250, sortDescriptors: sortDescriptors) {
      _, samples, _ in
      let entries = (samples as? [HKWorkout] ?? []).map { workout in
        [
          "dataType": "activity",
          "value": workout.duration / 60.0,
          "unit": "minutes",
          "recordedAt": self.isoFormatter.string(from: workout.endDate),
          "source": "apple_health"
        ] as [String: Any]
      }
      completion(entries)
    }

    healthStore.execute(query)
  }
}
