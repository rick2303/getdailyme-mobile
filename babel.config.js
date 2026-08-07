module.exports = function (api) {
  api.cache(true)
  return {
    // A diferencia de splitwo (que no usa className), aqui NativeWind necesita
    // su preset y el jsxImportSource: sin ellos los estilos se ignoran en
    // silencio y la app abre sin un solo estilo.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}
