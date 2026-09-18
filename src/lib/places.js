import { APP_CONFIG, isGoogleMapsConfigured, isKakaoMapsConfigured } from '../config.js';
import { t } from '../i18n.js';
import { loadGoogleMaps } from './googleMaps.js';
import { loadKakaoMaps } from './kakaoMaps.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];


async function kakaoFindRestaurants(center) {
  await loadKakaoMaps();
  const places = new window.kakao.maps.services.Places();
  const radius = Math.min(APP_CONFIG.overpassRadiusMeters, 20000);
  const result = await new Promise((resolve, reject) => {
    places.categorySearch('FD6', (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) resolve(data || []);
      else if (status === window.kakao.maps.services.Status.ZERO_RESULT) resolve([]);
      else reject(new Error(t('results.placeError')));
    }, {
      location: new window.kakao.maps.LatLng(center.lat, center.lng),
      radius,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    });
  });

  return result.slice(0, APP_CONFIG.maxRestaurantMarkers).map((item) => ({
    id: String(item.id || crypto.randomUUID()),
    name: item.place_name || 'Restaurant',
    lat: Number(item.y),
    lng: Number(item.x),
    cuisine: item.category_name?.split(' > ').slice(-1)[0] || undefined,
    address: item.road_address_name || item.address_name || undefined,
    url: item.place_url || undefined
  }));
}

async function googleFindRestaurants(center) {
  await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } = await window.google.maps.importLibrary('places');
  const { places } = await Place.searchNearby({
    fields: ['id', 'displayName', 'location', 'formattedAddress', 'primaryTypeDisplayName'],
    locationRestriction: { center, radius: Math.min(APP_CONFIG.overpassRadiusMeters, 50000) },
    includedPrimaryTypes: ['restaurant'],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.POPULARITY
  });
  return (places || []).flatMap((place) => {
    if (!place.location) return [];
    const name = typeof place.displayName === 'string' ? place.displayName : place.displayName?.text;
    if (!name) return [];
    return [{
      id: String(place.id || crypto.randomUUID()),
      name,
      lat: place.location.lat(),
      lng: place.location.lng(),
      cuisine: typeof place.primaryTypeDisplayName === 'string' ? place.primaryTypeDisplayName : place.primaryTypeDisplayName?.text,
      address: place.formattedAddress || undefined
    }];
  });
}

async function osmFindRestaurants(center) {
  const radius = APP_CONFIG.overpassRadiusMeters;
  const query = `[out:json][timeout:20];nwr["amenity"="restaurant"](around:${radius},${center.lat},${center.lng});out center tags;`;
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const body = new URLSearchParams({ data: query });
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body,
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const json = await response.json();
      return (json.elements ?? []).flatMap((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (lat == null || lng == null) return [];
        const name = element.tags?.['name:ko'] || element.tags?.name || element.tags?.['name:en'];
        if (!name) return [];
        const address = [element.tags?.['addr:city'], element.tags?.['addr:street'], element.tags?.['addr:housenumber']].filter(Boolean).join(' ');
        return [{
          id: String(element.id),
          name,
          lat,
          lng,
          cuisine: element.tags?.cuisine,
          address: address || undefined
        }];
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(t('results.placeError'));
}

export async function findRestaurants(center) {
  if (isKakaoMapsConfigured) return kakaoFindRestaurants(center);
  if (isGoogleMapsConfigured) return googleFindRestaurants(center);
  return osmFindRestaurants(center);
}
