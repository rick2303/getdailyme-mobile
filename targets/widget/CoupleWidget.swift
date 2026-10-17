import AppIntents
import Foundation
import SwiftUI
import WidgetKit

// MARK: - Pareja
//
// Como esta tu pareja ahora mismo y el boton de "pienso en ti", que manda el
// toque sin abrir la app. Los textos llegan ya traducidos desde la app
// (lib/widget-couple.ts): el widget no tiene diccionario.
//
// El estado es una clave y no un emoji; aqui cada clave tiene su SF Symbol,
// los mismos conceptos que los iconos de lucide de la app.

struct CoupleData: Codable {
  let brand: String
  let paired: Bool
  let partnerId: String?
  let partnerName: String
  let partnerInitials: String
  let partnerAvatar: String?
  let mood: String?
  let moodLabel: String?
  let moodAt: String?
  let receivedLabel: String
  let pingLabel: String
  let sentLabel: String
  let tooSoonLabel: String
  let emptyTitle: String
  let emptyBody: String
}

private let pingSentKey = "couplePingSentAt"
// Lo que dura el "Enviado" en el boton tras tocarlo.
private let sentVisibleSeconds: Double = 60

let placeholderCouple = CoupleData(
  brand: "#007EB6",
  paired: true,
  partnerId: nil,
  partnerName: "Sofía",
  partnerInitials: "S",
  partnerAvatar: nil,
  mood: "happy",
  moodLabel: "Feliz",
  moodAt: "18:40",
  receivedLabel: "Sofía pensó en ti 3 veces hoy",
  pingLabel: "Pienso en ti",
  sentLabel: "Le llegó a Sofía",
  tooSoonLabel: "Ya le llegó",
  emptyTitle: "Pareja",
  emptyBody: "Empareja tu cuenta desde Amigos para verla aquí."
)

func loadCoupleData() -> CoupleData? {
  guard
    let defaults = UserDefaults(suiteName: widgetAppGroup),
    let raw = defaults.string(forKey: "widgetCouple"),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(CoupleData.self, from: data)
}

func moodSymbol(_ mood: String?) -> String? {
  switch mood {
  case "happy": return "face.smiling"
  case "loving": return "heart.fill"
  case "excited": return "sparkles"
  case "calm": return "leaf.fill"
  case "tired": return "moon.zzz.fill"
  case "busy": return "briefcase.fill"
  case "stressed": return "bolt.fill"
  case "sad": return "cloud.rain.fill"
  default: return nil
  }
}

// MARK: - El toque

private struct PingRow: Decodable {
  let outcome: String
  let ping_id: String?
}

actor CouplePinger {
  static let shared = CouplePinger()

  private func request(_ path: String, _ session: WidgetSession, _ body: Data) -> URLRequest? {
    guard let url = URL(string: session.url + path) else { return nil }
    var request = URLRequest(url: url, timeoutInterval: 8)
    request.httpMethod = "POST"
    request.setValue(session.anonKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body
    return request
  }

  /// Devuelve si el toque salio (o ya habia salido hace nada, que para quien
  /// toca es lo mismo).
  func ping() async -> Bool {
    guard
      let session = loadWidgetSession(),
      session.expiresAt > Date().timeIntervalSince1970 + 30,
      let rpc = request("/rest/v1/rpc/send_couple_ping", session, Data("{}".utf8))
    else { return false }

    do {
      let (data, response) = try await URLSession.shared.data(for: rpc)
      guard
        let status = (response as? HTTPURLResponse)?.statusCode,
        (200..<300).contains(status),
        let row = try JSONDecoder().decode([PingRow].self, from: data).first
      else { return false }

      if row.outcome == "sent", let pingId = row.ping_id,
        let body = try? JSONSerialization.data(withJSONObject: ["type": "couple_ping", "pingId": pingId]),
        let push = request("/functions/v1/push-notify", session, body)
      {
        _ = try? await URLSession.shared.data(for: push)
      }
      return row.outcome == "sent" || row.outcome == "too_soon"
    } catch {
      return false
    }
  }
}

struct PingPartnerIntent: AppIntent {
  static let title: LocalizedStringResource = "Pienso en ti"
  static let isDiscoverable: Bool = false

  init() {}

  func perform() async throws -> some IntentResult {
    if await CouplePinger.shared.ping() {
      UserDefaults(suiteName: widgetAppGroup)?.set(Date().timeIntervalSince1970, forKey: pingSentKey)
      WidgetCenter.shared.reloadTimelines(ofKind: "CoupleWidget")
    }
    return .result()
  }
}

// MARK: - Linea de tiempo

struct CoupleEntry: TimelineEntry {
  let date: Date
  let data: CoupleData?
  let justSent: Bool
}

struct CoupleProvider: TimelineProvider {
  func placeholder(in context: Context) -> CoupleEntry {
    CoupleEntry(date: Date(), data: placeholderCouple, justSent: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (CoupleEntry) -> Void) {
    completion(CoupleEntry(date: Date(), data: loadCoupleData() ?? placeholderCouple, justSent: false))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CoupleEntry>) -> Void) {
    let now = Date()
    let data = loadCoupleData()
    let sentAt = UserDefaults(suiteName: widgetAppGroup)?.double(forKey: pingSentKey) ?? 0
    let sentUntil = Date(timeIntervalSince1970: sentAt + sentVisibleSeconds)

    if sentUntil > now {
      // Dos entradas: "Enviado" ahora y el boton normal cuando pase el minuto.
      completion(
        Timeline(
          entries: [
            CoupleEntry(date: now, data: data, justSent: true),
            CoupleEntry(date: sentUntil, data: data, justSent: false),
          ],
          policy: .after(Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now)
        )
      )
      return
    }

    let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
    completion(
      Timeline(entries: [CoupleEntry(date: now, data: data, justSent: false)], policy: .after(refresh))
    )
  }
}

// MARK: - Vistas

struct PartnerAvatar: View {
  let data: CoupleData
  let brand: Color
  let size: CGFloat

  private var image: UIImage? {
    guard let avatar = data.partnerAvatar, let bytes = Data(base64Encoded: avatar) else { return nil }
    return UIImage(data: bytes)
  }

  var body: some View {
    Group {
      if let image {
        Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
      } else {
        ZStack {
          brand.opacity(0.18)
          Text(data.partnerInitials)
            .font(.system(size: size * 0.38, weight: .bold))
            .foregroundStyle(brand)
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
  }
}

struct PingButton: View {
  let data: CoupleData
  let brand: Color
  let justSent: Bool

  var body: some View {
    Button(intent: PingPartnerIntent()) {
      HStack(spacing: 6) {
        Image(systemName: justSent ? "checkmark" : "heart.fill")
          .font(.system(size: 13, weight: .bold))
        Text(justSent ? data.sentLabel : data.pingLabel)
          .font(.system(size: 13, weight: .bold))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .foregroundStyle(.white)
      .frame(maxWidth: .infinity, minHeight: 36)
      .background(brand, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
    .buttonStyle(.plain)
  }
}

struct MoodLine: View {
  let data: CoupleData
  let brand: Color

  var body: some View {
    HStack(spacing: 4) {
      if let symbol = moodSymbol(data.mood) {
        Image(systemName: symbol)
          .font(.system(size: 11, weight: .semibold))
          .foregroundStyle(brand)
      }
      Text(data.moodAt.map { "\(data.moodLabel ?? "") · \($0)" } ?? (data.moodLabel ?? ""))
        .font(.system(size: 11))
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }
}

struct CoupleWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: CoupleEntry

  var body: some View {
    let data = entry.data
    let brand = Color(hex: data?.brand ?? "#007EB6")

    Group {
      if let data, data.paired {
        if family == .systemMedium {
          HStack(spacing: 14) {
            PartnerAvatar(data: data, brand: brand, size: 64)
            VStack(alignment: .leading, spacing: 6) {
              Text(data.partnerName).font(.system(size: 15, weight: .bold)).lineLimit(1)
              MoodLine(data: data, brand: brand)
              Text(data.receivedLabel)
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
                .lineLimit(1)
              Spacer(minLength: 0)
              PingButton(data: data, brand: brand, justSent: entry.justSent)
            }
          }
          .padding(14)
        } else {
          VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
              PartnerAvatar(data: data, brand: brand, size: 36)
              Text(data.partnerName).font(.system(size: 13, weight: .bold)).lineLimit(1)
            }
            MoodLine(data: data, brand: brand)
            Spacer(minLength: 0)
            PingButton(data: data, brand: brand, justSent: entry.justSent)
          }
          .padding(12)
        }
      } else {
        VStack(spacing: 4) {
          Image(systemName: "heart.circle")
            .font(.system(size: 22))
            .foregroundStyle(brand)
          Text(data?.emptyTitle ?? "Pareja").font(.system(size: 14, weight: .semibold))
          Text(data?.emptyBody ?? "")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
        .padding(12)
      }
    }
    .widgetURL(URL(string: "getdailyme://couple"))
    .containerBackground(for: .widget) { WidgetBackground(brand: brand) }
  }
}

struct CoupleWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CoupleWidget", provider: CoupleProvider()) { entry in
      CoupleWidgetView(entry: entry)
    }
    .configurationDisplayName("Pareja")
    .description("Cómo está tu pareja, y «pienso en ti» de un toque.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
