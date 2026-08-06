const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = ['require', 'react-native', 'browser', 'default']

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
}

// Heredado de splitwo: expo-file-system@55.x publica TypeScript con
// main "src/index.ts" y Metro no lo resuelve sin este atajo.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-file-system') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-file-system/src/index.ts'),
      type: 'sourceFile',
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
