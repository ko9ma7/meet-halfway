// MeetHalfway runtime configuration.
// For direct static hosting, edit only this object.
// GitHub Actions normally generates dist/config.js from Repository Variables.
window.__MEET_HALFWAY_CONFIG__ = window.__MEET_HALFWAY_CONFIG__ || {
  mapProvider: 'kakao', // 'kakao', 'osm', or 'google'
  kakaoMapsJavaScriptKey: '',
  googleMapsApiKey: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  geocodingCountryCodes: 'kr',
  overpassRadiusMeters: 2500,
  defaultLanguage: 'auto',
  defaultStyle: 'aurora'
};
