import SwiftUI
import WidgetKit

// El widget de getdailyme: cabecera con la marca, el anillo del dia, la racha
// y las actividades pendientes con su barra. Tres tamaños mas el circular de
// la pantalla de bloqueo. La app deja los datos en el App Group al registrar.

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
  brand: "#007EB6",
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

struct BrandHeader: View {
  let brand: Color

  var body: some View {
    HStack(spacing: 5) {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(brand)
      Text("Hoy")
        .font(.system(size: 12, weight: .heavy, design: .rounded))
        .foregroundStyle(.secondary)
      Spacer(minLength: 0)
    }
  }
}

struct StreakBadge: View {
  let streak: Int

  var body: some View {
    HStack(spacing: 3) {
      Image(systemName: "flame.fill")
        .font(.system(size: 11))
        .foregroundStyle(.orange)
      Text("\(streak)")
        .font(.system(size: 12, weight: .bold, design: .rounded))
        .foregroundStyle(.secondary)
    }
    .padding(.horizontal, 7)
    .padding(.vertical, 3)
    .background(Capsule().fill(Color.orange.opacity(0.14)))
  }
}

struct ActivityRow: View {
  let activity: WidgetActivity
  let compact: Bool

  var body: some View {
    HStack(spacing: 8) {
      Text(activity.name)
        .font(.system(size: compact ? 12 : 13, weight: .semibold, design: .rounded))
        .lineLimit(1)
        .frame(width: compact ? 62 : 76, alignment: .leading)
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Capsule()
            .fill(Color(hex: activity.color).opacity(0.2))
          Capsule()
            .fill(Color(hex: activity.color))
            .frame(width: max(6, geometry.size.width * activity.progress))
        }
      }
      .frame(height: 6)
      if activity.progress >= 1 {
        Image(systemName: "checkmark")
          .font(.system(size: 9, weight: .heavy))
          .foregroundStyle(Color(hex: activity.color))
      }
    }
  }
}

struct DoneMessage: View {
  let brand: Color

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "party.popper.fill")
        .font(.system(size: 14))
        .foregroundStyle(brand)
      Text("¡Día completo!")
        .font(.system(size: 14, weight: .bold, design: .rounded))
    }
  }
}

struct SmallView: View {
  let data: WidgetData

  var body: some View {
    let brand = Color(hex: data.brand)
    VStack(spacing: 0) {
      BrandHeader(brand: brand)
      Spacer(minLength: 4)
      ZStack {
        Ring(
          progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
          tint: brand,
          lineWidth: 9
        )
        VStack(spacing: 0) {
          Text("\(data.done)")
            .font(.system(size: 22, weight: .heavy, design: .rounded))
          Text("de \(data.due)")
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(.secondary)
        }
      }
      .frame(width: 72, height: 72)
      Spacer(minLength: 4)
      StreakBadge(streak: data.streak)
    }
    .widgetURL(URL(string: "getdailyme://"))
  }
}

struct MediumView: View {
  let data: WidgetData

  var body: some View {
    let brand = Color(hex: data.brand)
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        BrandHeader(brand: brand)
        StreakBadge(streak: data.streak)
      }
      HStack(spacing: 16) {
        ZStack {
          Ring(
            progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
            tint: brand,
            lineWidth: 8
          )
          VStack(spacing: 0) {
            Text("\(data.done)")
              .font(.system(size: 19, weight: .heavy, design: .rounded))
            Text("de \(data.due)")
              .font(.system(size: 9, weight: .bold, design: .rounded))
              .foregroundStyle(.secondary)
          }
        }
        .frame(width: 62, height: 62)

        VStack(alignment: .leading, spacing: 7) {
          if data.complete || data.activities.isEmpty {
            DoneMessage(brand: brand)
          } else {
            ForEach(data.activities.prefix(3)) { activity in
              ActivityRow(activity: activity, compact: true)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .widgetURL(URL(string: "getdailyme://"))
  }
}

struct LargeView: View {
  let data: WidgetData

  var body: some View {
    let brand = Color(hex: data.brand)
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        BrandHeader(brand: brand)
        StreakBadge(streak: data.streak)
      }
      HStack {
        Spacer()
        ZStack {
          Ring(
            progress: data.due > 0 ? Double(data.done) / Double(data.due) : 0,
            tint: brand,
            lineWidth: 11
          )
          VStack(spacing: 0) {
            Text("\(data.done)")
              .font(.system(size: 34, weight: .heavy, design: .rounded))
            Text("de \(data.due) metas")
              .font(.system(size: 11, weight: .bold, design: .rounded))
              .foregroundStyle(.secondary)
          }
        }
        .frame(width: 118, height: 118)
        Spacer()
      }
      if data.complete || data.activities.isEmpty {
        HStack {
          Spacer()
          DoneMessage(brand: brand)
          Spacer()
        }
      } else {
        VStack(alignment: .leading, spacing: 9) {
          Text("Pendientes")
            .font(.system(size: 11, weight: .heavy, design: .rounded))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
          ForEach(data.activities.prefix(5)) { activity in
            ActivityRow(activity: activity, compact: false)
          }
        }
      }
      Spacer(minLength: 0)
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

struct WidgetBackground: View {
  let brand: Color

  var body: some View {
    LinearGradient(
      colors: [brand.opacity(0.16), Color(UIColor.systemBackground)],
      startPoint: .topLeading,
      endPoint: .center
    )
    .background(Color(UIColor.systemBackground))
  }
}

struct GetdailymeWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var body: some View {
    let brand = Color(hex: entry.data.brand)
    switch family {
    case .accessoryCircular:
      CircularView(data: entry.data)
        .containerBackground(for: .widget) { Color.clear }
    case .systemMedium:
      MediumView(data: entry.data)
        .containerBackground(for: .widget) { WidgetBackground(brand: brand) }
    case .systemLarge:
      LargeView(data: entry.data)
        .containerBackground(for: .widget) { WidgetBackground(brand: brand) }
    default:
      SmallView(data: entry.data)
        .containerBackground(for: .widget) { WidgetBackground(brand: brand) }
    }
  }
}

struct GetdailymeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "GetdailymeWidget", provider: Provider()) { entry in
      GetdailymeWidgetView(entry: entry)
    }
    .configurationDisplayName("Tu día")
    .description("El progreso de hoy, tus pendientes y tu racha, de un vistazo.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular])
  }
}

@main
struct GetdailymeWidgets: WidgetBundle {
  var body: some Widget {
    GetdailymeWidget()
    TimerLiveActivity()
  }
}
