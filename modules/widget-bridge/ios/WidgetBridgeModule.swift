import ExpoModulesCore
import Foundation
import Security

private let appGroup = "group.com.getdailyme.app"
private let keychainService = "com.getdailyme.widget"
private let keychainAccount = "session"
private let logPrefix = "widgetLog."

private func keychainQuery() -> [String: Any] {
  [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: keychainService,
    kSecAttrAccount as String: keychainAccount,
    kSecAttrAccessGroup as String: appGroup,
  ]
}

private func storeSession(_ json: String) {
  guard let data = json.data(using: .utf8) else { return }
  let query = keychainQuery()
  let update: [String: Any] = [
    kSecValueData as String: data,
    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
  ]
  let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
  if status == errSecItemNotFound {
    var insert = query
    insert.merge(update) { _, new in new }
    SecItemAdd(insert as CFDictionary, nil)
  }
}

private func deleteSession() {
  SecItemDelete(keychainQuery() as CFDictionary)
}

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("setSession") { (json: String) in
      storeSession(json)
    }

    Function("clearSession") {
      deleteSession()
    }

    Function("readLogs") { () -> [String] in
      guard let defaults = UserDefaults(suiteName: appGroup) else { return [] }
      return defaults.dictionaryRepresentation()
        .filter { $0.key.hasPrefix(logPrefix) }
        .compactMap { $0.value as? String }
    }

    Function("removeLogs") { (ids: [String]) in
      guard let defaults = UserDefaults(suiteName: appGroup) else { return }
      for id in ids {
        defaults.removeObject(forKey: logPrefix + id)
      }
    }
  }
}
