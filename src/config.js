const runtime = window.__MEET_HALFWAY_CONFIG__ || window.__MIDDLE_MEET_CONFIG__ || {};

export const APP_CONFIG = {
  serviceName: '어?중간',
  mapProvider: ['osm', 'google', 'kakao'].includes(String(runtime.mapProvider || '').toLowerCase())
    ? String(runtime.mapProvider).toLowerCase()
    : 'osm',
  googleMapsApiKey: String(runtime.googleMapsApiKey || '').trim(),
  kakaoMapsJavaScriptKey: String(runtime.kakaoMapsJavaScriptKey || '').trim(),
  supabaseUrl: String(runtime.supabaseUrl || '').trim(),
  supabasePublishableKey: String(runtime.supabasePublishableKey || runtime.supabaseAnonKey || '').trim(),
  geocodingCountryCodes: String(runtime.geocodingCountryCodes || 'kr').trim(),
  overpassRadiusMeters: Number(runtime.overpassRadiusMeters || 2500),
  maxRestaurantMarkers: 60,
  defaultLanguage: String(runtime.defaultLanguage || 'auto'),
  defaultStyle: ['aurora', 'ocean', 'forest', 'sunset'].includes(String(runtime.defaultStyle || '').toLowerCase())
    ? String(runtime.defaultStyle).toLowerCase()
    : 'aurora'
};

export const isSupabaseConfigured = Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabasePublishableKey);
export const isGoogleMapsConfigured = APP_CONFIG.mapProvider === 'google' && Boolean(APP_CONFIG.googleMapsApiKey);
export const isKakaoMapsConfigured = APP_CONFIG.mapProvider === 'kakao' && Boolean(APP_CONFIG.kakaoMapsJavaScriptKey);
