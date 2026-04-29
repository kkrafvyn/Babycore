Pod::Spec.new do |s|
  s.name = 'NativeWearables'
  s.version = '0.1.0'
  s.summary = 'Capacitor bridge for Apple HealthKit and Android Health Connect'
  s.license = 'MIT'
  s.homepage = 'https://babycore.vercel.app'
  s.author = 'BabyCore'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.framework = 'HealthKit'
  s.swift_version = '5.9'
end
