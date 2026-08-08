import ActivityKit
import ExpoModulesCore

// El puente del cronometro hacia ActivityKit: arrancar y terminar la Live
// Activity del timer. La misma struct vive en el target del widget; ActivityKit
// las empareja por nombre y forma.
struct TimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startedAt: Date
  }

  var name: String
  var colorHex: String
}

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("startActivity") { (name: String, colorHex: String, startedAtMs: Double) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      let attributes = TimerAttributes(name: name, colorHex: colorHex)
      let state = TimerAttributes.ContentState(
        startedAt: Date(timeIntervalSince1970: startedAtMs / 1000)
      )

      Task {
        for activity in Activity<TimerAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        _ = try? Activity.request(
          attributes: attributes,
          content: .init(state: state, staleDate: nil)
        )
      }
    }

    Function("endActivity") {
      guard #available(iOS 16.2, *) else { return }
      Task {
        for activity in Activity<TimerAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
    }
  }
}
