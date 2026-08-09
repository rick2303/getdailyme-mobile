const { withAppBuildGradle } = require('@expo/config-plugins')

// Los archivos de `locales` (textos de permisos de iOS) generan strings
// tambien en Android sin version en el locale por defecto, y el lint de
// release lo trata como error fatal. Esas dos reglas no aplican aqui.
module.exports = function withAndroidLint(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (!gradleConfig.modResults.contents.includes("disable 'ExtraTranslation'")) {
      gradleConfig.modResults.contents +=
        "\nandroid { lint { disable 'ExtraTranslation', 'MissingTranslation' } }\n"
    }
    return gradleConfig
  })
}
