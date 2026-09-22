import AppIntents
import Foundation
import Security
import WidgetKit

let widgetAppGroup = "group.com.getdailyme.app"
private let keychainService = "com.getdailyme.widget"
private let keychainAccount = "session"
private let logPrefix = "widgetLog."

struct WidgetSession: Codable {
  let url: String
  let anonKey: String
  let userId: String
  let accessToken: String
  let expiresAt: Double
}

func loadWidgetSession() -> WidgetSession? {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: keychainService,
    kSecAttrAccount as String: keychainAccount,
    kSecAttrAccessGroup as String: widgetAppGroup,
    kSecReturnData as String: true,
    kSecMatchLimit as String: kSecMatchLimitOne,
  ]
  var result: AnyObject?
  guard
    SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
    let data = result as? Data
  else { return nil }
  return try? JSONDecoder().decode(WidgetSession.self, from: data)
}

struct WidgetLogEntry: Codable {
  let id: String
  let activityId: String
  let userId: String
  let amount: Int
  let loggedAt: String
  let localDate: String
  var sent: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case activityId = "activity_id"
    case userId = "user_id"
    case amount
    case loggedAt = "logged_at"
    case localDate = "local_date"
    case sent
  }
}

private struct LogInsert: Encodable {
  let id: String
  let activity_id: String
  let user_id: String
  let amount: Int
  let logged_at: String
  let local_date: String
}

func dayKey(_ date: Date, _ timeZone: TimeZone) -> String {
  let formatter = DateFormatter()
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = timeZone
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

private func isoString(_ date: Date) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  formatter.timeZone = TimeZone(identifier: "UTC")
  return formatter.string(from: date)
}

private func saveLog(_ entry: WidgetLogEntry, _ defaults: UserDefaults) {
  guard
    let data = try? JSONEncoder().encode(entry),
    let raw = String(data: data, encoding: .utf8)
  else { return }
  defaults.set(raw, forKey: logPrefix + entry.id)
}

private func saveWidgetData(_ data: WidgetData, _ defaults: UserDefaults) {
  guard
    let encoded = try? JSONEncoder().encode(data),
    let raw = String(data: encoded, encoding: .utf8)
  else { return }
  defaults.set(raw, forKey: "widgetData")
}

private enum SendOutcome {
  case created
  case settled
  case failed
}

private func makeRequest(_ path: String, _ session: WidgetSession, _ body: Data) -> URLRequest? {
  guard let url = URL(string: session.url + path) else { return nil }
  var request = URLRequest(url: url, timeoutInterval: 8)
  request.httpMethod = "POST"
  request.setValue(session.anonKey, forHTTPHeaderField: "apikey")
  request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
  request.setValue("application/json", forHTTPHeaderField: "Content-Type")
  request.httpBody = body
  return request
}

private func sendLog(_ entry: WidgetLogEntry, _ session: WidgetSession) async -> SendOutcome {
  guard session.expiresAt > Date().timeIntervalSince1970 + 30 else { return .failed }
  let insert = LogInsert(
    id: entry.id,
    activity_id: entry.activityId,
    user_id: entry.userId,
    amount: entry.amount,
    logged_at: entry.loggedAt,
    local_date: entry.localDate
  )
  guard
    let body = try? JSONEncoder().encode(insert),
    var request = makeRequest("/rest/v1/activity_logs", session, body)
  else { return .failed }
  request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

  do {
    let (_, response) = try await URLSession.shared.data(for: request)
    guard let status = (response as? HTTPURLResponse)?.statusCode else { return .failed }
    if (200..<300).contains(status) { return .created }
    if status == 409 { return .settled }
    return .failed
  } catch {
    return .failed
  }
}

private func announce(_ logId: String, _ session: WidgetSession) async {
  guard
    let body = try? JSONSerialization.data(withJSONObject: ["type": "friend_log", "logId": logId]),
    let request = makeRequest("/functions/v1/push-notify", session, body)
  else { return }
  _ = try? await URLSession.shared.data(for: request)
}

actor WidgetLogger {
  static let shared = WidgetLogger()

  func log(activityId: String) async {
    guard
      let session = loadWidgetSession(),
      let defaults = UserDefaults(suiteName: widgetAppGroup),
      let stored = storedWidgetData(),
      stored.userId == session.userId
    else { return }

    let timeZone = stored.zone
    let now = Date()
    let today = dayKey(now, timeZone)
    let data = stored.forDay(today)

    guard
      let activity = data.activities.first(where: { $0.activityId == activityId }),
      activity.canLog
    else { return }

    let entry = WidgetLogEntry(
      id: UUID().uuidString.lowercased(),
      activityId: activityId,
      userId: session.userId,
      amount: activity.step ?? 1,
      loggedAt: isoString(now),
      localDate: today,
      sent: false
    )
    saveLog(entry, defaults)
    saveWidgetData(data.bumped(activityId: activityId, today: today), defaults)
    WidgetCenter.shared.reloadTimelines(ofKind: "GetdailymeWidget")

    let outcome = await sendLog(entry, session)
    guard outcome != .failed else { return }
    var sent = entry
    sent.sent = true
    saveLog(sent, defaults)
    if outcome == .created { await announce(entry.id, session) }
  }
}

struct LogActivityIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrar actividad"
  static let isDiscoverable: Bool = false

  @Parameter(title: "Actividad")
  var activityId: String

  init() {}

  init(activityId: String) {
    self.activityId = activityId
  }

  func perform() async throws -> some IntentResult {
    await WidgetLogger.shared.log(activityId: activityId)
    return .result()
  }
}
