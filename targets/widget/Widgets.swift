import SwiftUI
import WidgetKit

// El widget de getdailyme: el anillo del dia con racha (chico), el anillo mas
// las actividades pendientes (mediano) y el anillo compacto para la pantalla
// de bloqueo. La app deja los datos en el App Group cada vez que registras.

struct WidgetActivity: Codable, Identifiable {
  var id: String { name }
  let name: String
  let color: String
  let progress: Double
}

struct WidgetData: Codable {
  let done: Int
  let due: Int
  let streak: Int
  let brand: String
  let complete: Bool
  let activities: [WidgetActivity]
}

let placeholderData = WidgetData(
  done: 3,
  due: 5,
  streak: 12,
  brand: "#6B4EE6",
  complete: false,
  activities: [
    WidgetActivity(name: "Agua", color: "#3D7BE8", progress: 0.75),
    WidgetActivity(name: "Leer", color: "#C08A2D", progress: 0.4),
    WidgetActivity(name: "Caminar", color: "#2E9E5B", progress: 0.0),
  ]
)

func loadWidgetData() -> WidgetData {
  guard
    let defaults = UserDefaults(suiteName: "group.com.getdailyme.app"),
    let raw = defaults.string(forKey: "widgetData"),
    let data = raw.data(using: .utf8),
    let parsed = try? JSONDecoder().decode(WidgetData.self, from: data)
  else {
    return placeholderData
  }
  return parsed
}

extension Color {
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    let r = Double((value >> 16) & 0xFF) / 255
    let g = Double((value >> 8) & 0xFF) / 255
    let b = Double(value & 0xFF) / 255
    self.init(red: r, green: g, blue: b)
  }
}

struct Entry: TimelineEntry {
  let date: Date
  let data: WidgetData
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: Date(), data: placeholderData)
  }

  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: Date(), data: loadWidgetData()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let entry = Entry(date: Date(), data: loadWidgetData())
    let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}

struct Ring: View {
  let progress: Double
  let tint: Color
  let lineWidth: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .stroke(tint.opacity(0.2), lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: max(0.02, min(progress, 1)))
        .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
  }
}

struct SmallView: View {
  let data: WidgetData

  var body: some View {
    VStack(spacing: 6) {
      ZStack {
        Ring(
          progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
          tint: Color(hex: data.brand),
          lineWidth: 9
        )
        Text("\(data.done)/\(data.due)")
          .font(.system(size: 18, weight: .heavy, design: .rounded))
      }
      .frame(width: 74, height: 74)

      HStack(spacing: 3) {
        Image(systemName: "flame.fill")
          .font(.system(size: 12))
          .foregroundStyle(.orange)
        Text("\(data.streak)")
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundStyle(.secondary)
      }
    }
    .widgetURL(URL(string: "getdailyme://"))
  }
}

struct MediumView: View {
  let data: WidgetData

  var body: some View {
    HStack(spacing: 16) {
      VStack(spacing: 6) {
        ZStack {
          Ring(
            progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
            tint: Color(hex: data.brand),
            lineWidth: 9
          )
          Text("\(data.done)/\(data.due)")
            .font(.system(size: 17, weight: .heavy, design: .rounded))
        }
        .frame(width: 68, height: 68)

        HStack(spacing: 3) {
          Image(systemName: "flame.fill")
            .font(.system(size: 11))
            .foregroundStyle(.orange)
          Text("\(data.streak)")
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(.secondary)
        }
      }

      VStack(alignment: .leading, spacing: 8) {
        if data.complete || data.activities.isEmpty {
          Text(data.complete ? "¡Día completo!" : "Registra algo hoy")
            .font(.system(size: 14, weight: .bold, design: .rounded))
            .foregroundStyle(.secondary)
        } else {
          ForEach(data.activities.prefix(3)) { activity in
            HStack(spacing: 8) {
              ZStack {
                Ring(progress: activity.progress, tint: Color(hex: activity.color), lineWidth: 4)
              }
              .frame(width: 20, height: 20)
              Text(activity.name)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .lineLimit(1)
              Spacer(minLength: 0)
            }
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .widgetURL(URL(string: "getdailyme://"))
  }
}

struct CircularView: View {
  let data: WidgetData

  var body: some View {
    ZStack {
      Ring(
        progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
        tint: .white,
        lineWidth: 6
      )
      Text("\(data.done)/\(data.due)")
        .font(.system(size: 13, weight: .heavy, design: .rounded))
    }
    .widgetURL(URL(string: "getdailyme://"))
  }
}

struct GetdailymeWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var body: some View {
    switch family {
    case .accessoryCircular:
      CircularView(data: entry.data)
        .containerBackground(for: .widget) { Color.clear }
    case .systemMedium:
      MediumView(data: entry.data)
        .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    default:
      SmallView(data: entry.data)
        .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    }
  }
}

struct GetdailymeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "GetdailymeWidget", provider: Provider()) { entry in
      GetdailymeWidgetView(entry: entry)
    }
    .configurationDisplayName("Tu día")
    .description("El progreso de hoy y tu racha, de un vistazo.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
  }
}

@main
struct GetdailymeWidgets: WidgetBundle {
  var body: some Widget {
    GetdailymeWidget()
  }
}
