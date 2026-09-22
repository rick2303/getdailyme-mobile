Pod::Spec.new do |s|
  s.name           = 'WidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Sesion y cola de registros compartidas con el widget de getdailyme'
  s.description    = 'Deja la sesion en el llavero del App Group y lee los registros que hace el widget.'
  s.author         = 'getdailyme'
  s.homepage       = 'https://getdailyme.com'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
end
