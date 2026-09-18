import { APP_CONFIG, isGoogleMapsConfigured, isKakaoMapsConfigured } from '../config.js';
import { getLanguage, t } from '../i18n.js';
import { loadGoogleMaps } from './googleMaps.js';
import { loadKakaoMaps } from './kakaoMaps.js';

let lastRequestAt = 0;

async function respectRateLimit() {
  const waitMs = Math.max(0, 1100 - (Date.now() - lastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => window.setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
}

async function googleSearchAddress(query) {
  await loadGoogleMaps();
  const { Geocoder } = await window.google.maps.importLibrary('geocoding');
  const geocoder = new Geocoder();
  const { results } = await geocoder.geocode({ address: query, region: APP_CONFIG.geocodingCountryCodes.split(',')[0] || undefined });
  return (results || []).slice(0, 5).map((item) => ({
    lat: item.geometry.location.lat(),
    lng: item.geometry.location.lng(),
    displayName: item.formatted_address,
    shortName: item.address_components?.[0]?.long_name || item.formatted_address
  }));
}


async function kakaoSearchAddress(query) {
  await loadKakaoMaps();
  const places = new window.kakao.maps.services.Places();
  const geocoder = new window.kakao.maps.services.Geocoder();

  const keywordResults = await new Promise((resolve, reject) => {
    places.keywordSearch(query, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) resolve(data || []);
      else if (status === window.kakao.maps.services.Status.ZERO_RESULT) resolve([]);
      else reject(new Error(t('address.error')));
    });
  });

  if (keywordResults.length) {
    return keywordResults.slice(0, 5).map((item) => ({
      lat: Number(item.y),
      lng: Number(item.x),
      displayName: item.road_address_name || item.address_name || item.place_name,
      shortName: item.place_name || item.road_address_name || item.address_name
    }));
  }

  const addressResults = await new Promise((resolve, reject) => {
    geocoder.addressSearch(query, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) resolve(data || []);
      else if (status === window.kakao.maps.services.Status.ZERO_RESULT) resolve([]);
      else reject(new Error(t('address.error')));
    });
  });

  return addressResults.slice(0, 5).map((item) => ({
    lat: Number(item.y),
    lng: Number(item.x),
    displayName: item.road_address?.address_name || item.address_name,
    shortName: item.road_address?.building_name || item.address?.region_3depth_name || item.address_name
  }));
}

async function osmSearchAddress(query) {
  await respectRateLimit();
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    'accept-language': getLanguage()
  });
  if (APP_CONFIG.geocodingCountryCodes) params.set('countrycodes', APP_CONFIG.geocodingCountryCodes);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error(t('address.error'));
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(t('address.error'));
  const data = await response.json();
  return data.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
    shortName: item.name || item.address?.subway || item.address?.station || item.address?.road || item.address?.neighbourhood || item.display_name.split(',')[0]?.trim() || item.display_name
  }));
}

export async function searchAddress(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  if (isKakaoMapsConfigured) return kakaoSearchAddress(trimmed);
  if (isGoogleMapsConfigured) return googleSearchAddress(trimmed);
  return osmSearchAddress(trimmed);
}
