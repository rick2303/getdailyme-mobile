import ActivityKit
import SwiftUI
import WidgetKit

// La Live Activity del cronometro: banda en la pantalla de bloqueo y Dynamic
// Island con el tiempo corriendo. El reloj lo pinta el sistema con
// Text(timerInterval:), sin necesidad de actualizaciones desde la app.
struct TimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startedAt: Date
  }

  var name: String
  var colorHex: String
}

private func timerRange(_ startedAt: Date) -> ClosedRange<Date> {
  startedAt...startedAt.addingTimeInterval(12 * 3600)
}

struct TimerLockScreenView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    let tint = Color(hex: context.attributes.colorHex)
    HStack(spacing: 12) {
      ZStack {
        Circle()
          .fill(tint.opacity(0.18))
        Image(systemName: "timer")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(tint)
      }
      .frame(width: 40, height: 40)

      VStack(alignment: .leading, spacing: 1) {
        Text(context.attributes.name)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .lineLimit(1)
        Text("getdailyme")
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .foregroundStyle(.secondary)
      }

      Spacer(minLength: 8)

      Text(timerInterval: timerRange(context.state.startedAt), countsDown: false)
        .font(.system(size: 26, weight: .heavy, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(tint)
        .frame(maxWidth: 110, alignment: .trailing)
    }
    .padding(14)
  }
}

struct TimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TimerAttributes.self) { context in
      TimerLockScreenView(context: context)
        .activityBackgroundTint(Color(UIColor.systemBackground).opacity(0.9))
    } dynamicIsland: { context in
      let tint = Color(hex: context.attributes.colorHex)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: "timer")
              .font(.system(size: 15, weight: .bold))
              .foregroundStyle(tint)
            Text(context.attributes.name)
              .font(.system(size: 14, weight: .bold, design: .rounded))
              .lineLimit(1)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: timerRange(context.state.startedAt), countsDown: false)
            .font(.system(size: 22, weight: .heavy, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(tint)
            .frame(maxWidth: 90, alignment: .trailing)
            .padding(.trailing, 4)
        }
      } compactLeading: {
        Image(systemName: "timer")
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(tint)
      } compactTrailing: {
        Text(timerInterval: timerRange(context.state.startedAt), countsDown: false)
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(tint)
          .frame(maxWidth: 52)
      } minimal: {
        Image(systemName: "timer")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(tint)
      }
    }
  }
}
