import { APP_CONFIG, isGoogleMapsConfigured, isKakaoMapsConfigured } from '../config.js';
import { haversineKm } from './geo.js';
import { t } from '../i18n.js';
import { loadGoogleMaps } from './googleMaps.js';
import { loadKakaoMaps } from './kakaoMaps.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function destinationPoint(origin, distanceKm, bearingDeg) {
  const radiusKm = 6371.0088;
  const angular = distanceKm / radiusKm;
  const bearing = bearingDeg * Math.PI / 180;
  const lat1 = origin.lat * Math.PI / 180;
  const lng1 = origin.lng * Math.PI / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
    Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
    Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

function adaptiveSearchRadiusKm(center, participants = []) {
  const distances = participants.map((participant) => haversineKm(center, participant));
  const maxDistance = Math.max(...distances, 0);
  // Urban groups should not search an entire metropolitan area. Long-distance
  // groups can widen enough to reach a real town near the midpoint.
  if (maxDistance <= 10) return clamp(maxDistance * 0.55, 3.4, 5.2);
  if (maxDistance <= 25) return clamp(maxDistance * 0.42, 5.0, 9.0);
  if (maxDistance <= 60) return clamp(maxDistance * 0.32, 8.0, 16.0);
  return clamp(maxDistance * 0.24, 15.0, 28.0);
}

function searchCenters(center, participants = []) {
  const radiusKm = adaptiveSearchRadiusKm(center, participants);
  const firstRingKm = clamp(radiusKm * 0.52, 1.8, 10.5);
  const points = [{ ...center, ring: 0 }];
  for (let bearing = 0; bearing < 360; bearing += 45) {
    points.push({ ...destinationPoint(center, firstRingKm, bearing), ring: 1 });
  }
  if (radiusKm >= 16) {
    const secondRingKm = clamp(radiusKm * 0.82, 11, 22);
    for (let bearing = 0; bearing < 360; bearing += 90) {
      points.push({ ...destinationPoint(center, secondRingKm, bearing + 22.5), ring: 2 });
    }
  }
  return { points, radiusKm };
}

function normalizeKakaoPlace(item, category) {
  return {
    id: `kakao:${item.id || crypto.randomUUID()}`,
    name: item.place_name || (category === 'cafe' ? 'Cafe' : category === 'transit' ? 'Station' : 'Restaurant'),
    lat: Number(item.y),
    lng: Number(item.x),
    category,
    cuisine: item.category_name?.split(' > ').slice(-1)[0] || undefined,
    address: item.road_address_name || item.address_name || undefined,
    url: item.place_url || undefined,
    phone: item.phone || undefined,
    isMeetingAnchor: category === 'transit',
    provider: 'kakao'
  };
}

async function kakaoCategorySearch(center, categoryCode, category, radiusMeters, page = 1) {
  const places = new window.kakao.maps.services.Places();
  return new Promise((resolve, reject) => {
    places.categorySearch(categoryCode, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        resolve((data || []).map((item) => normalizeKakaoPlace(item, category)));
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        resolve([]);
      } else {
        reject(new Error(t('results.placeError')));
      }
    }, {
      location: new window.kakao.maps.LatLng(center.lat, center.lng),
      radius: Math.min(20000, radiusMeters),
      sort: window.kakao.maps.services.SortBy.DISTANCE,
      page
    });
  });
}

async function kakaoDiscoverPlaces(center, participants) {
  await loadKakaoMaps();
  const { points, radiusKm } = searchCenters(center, participants);
  const localRadius = Math.min(12000, Math.max(2400, radiusKm * 1000 * 0.66));
  const jobs = [];
  points.forEach((point, index) => {
    jobs.push(kakaoCategorySearch(point, 'FD6', 'restaurant', localRadius, 1));
    jobs.push(kakaoCategorySearch(point, 'CE7', 'cafe', localRadius, 1));
    jobs.push(kakaoCategorySearch(point, 'SW8', 'transit', localRadius, 1));
    // The literal midpoint gets one extra page because it is the fairest area.
    if (index === 0) {
      jobs.push(kakaoCategorySearch(point, 'FD6', 'restaurant', localRadius, 2));
      jobs.push(kakaoCategorySearch(point, 'CE7', 'cafe', localRadius, 2));
    }
  });
  const settled = await Promise.allSettled(jobs);
  const merged = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return dedupePlaces(merged);
}

async function googleDiscoverPlaces(center, participants) {
  await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } = await window.google.maps.importLibrary('places');
  const { points, radiusKm } = searchCenters(center, participants);
  const localRadius = Math.min(15000, Math.max(2800, radiusKm * 1000 * 0.68));
  const primaryTypes = [
    ['restaurant', 'restaurant'],
    ['cafe', 'cafe'],
    ['subway_station', 'transit'],
    ['train_station', 'transit']
  ];
  const jobs = points.slice(0, 9).flatMap((point) => primaryTypes.map(async ([type, category]) => {
    const { places } = await Place.searchNearby({
      fields: ['id', 'displayName', 'location', 'formattedAddress', 'primaryTypeDisplayName', 'rating', 'userRatingCount', 'googleMapsURI', 'nationalPhoneNumber'],
      locationRestriction: { center: point, radius: localRadius },
      includedPrimaryTypes: [type],
      maxResultCount: 20,
      rankPreference: SearchNearbyRankPreference.POPULARITY
    });
    return (places || []).flatMap((place) => {
      if (!place.location) return [];
      const name = typeof place.displayName === 'string' ? place.displayName : place.displayName?.text;
      if (!name) return [];
      return [{
        id: `google:${place.id || crypto.randomUUID()}`,
        name,
        lat: place.location.lat(),
        lng: place.location.lng(),
        category,
        cuisine: typeof place.primaryTypeDisplayName === 'string' ? place.primaryTypeDisplayName : place.primaryTypeDisplayName?.text,
        address: place.formattedAddress || undefined,
        rating: Number.isFinite(place.rating) ? place.rating : undefined,
        reviewCount: Number.isFinite(place.userRatingCount) ? place.userRatingCount : undefined,
        phone: place.nationalPhoneNumber || undefined,
        url: place.googleMapsURI || undefined,
        isMeetingAnchor: category === 'transit',
        provider: 'google'
      }];
    });
  }));
  const settled = await Promise.allSettled(jobs);
  return dedupePlaces(settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
}

function osmCategory(tags = {}) {
  if (tags.railway === 'station' || tags.railway === 'halt' || tags.railway === 'subway_entrance') return 'transit';
  const amenity = tags.amenity;
  if (amenity === 'cafe') return 'cafe';
  if (amenity === 'fast_food' || amenity === 'food_court') return 'fast_food';
  if (amenity === 'bar' || amenity === 'pub') return 'bar';
  return 'restaurant';
}

async function osmDiscoverPlaces(center, participants) {
  const radiusKm = adaptiveSearchRadiusKm(center, participants);
  const radius = Math.round(Math.min(48000, Math.max(APP_CONFIG.overpassRadiusMeters, radiusKm * 1000)));
  const query = `[out:json][timeout:28];(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub)$"](around:${radius},${center.lat},${center.lng});nwr["railway"~"^(station|halt|subway_entrance)$"](around:${radius},${center.lat},${center.lng}););out body center qt 2400;`;
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const body = new URLSearchParams({ data: query });
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 14000);
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
      return dedupePlaces((json.elements ?? []).flatMap((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (lat == null || lng == null) return [];
        const tags = element.tags || {};
        const name = tags['name:ko'] || tags.name || tags['name:en'];
        if (!name) return [];
        const address = [tags['addr:city'], tags['addr:district'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
        return [{
          id: `osm:${element.type}:${element.id}`,
          name,
          lat: Number(lat),
          lng: Number(lng),
          category: osmCategory(tags),
          cuisine: tags.cuisine,
          address: address || undefined,
          phone: tags.phone || tags['contact:phone'] || undefined,
          website: tags.website || tags['contact:website'] || undefined,
          openingHours: tags.opening_hours || undefined,
          isMeetingAnchor: Boolean(tags.railway === 'station' || tags.railway === 'halt' || tags.railway === 'subway_entrance'),
          provider: 'osm'
        }];
      }));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(t('results.placeError'));
}

function dedupePlaces(places) {
  const byId = new Map();
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !place.name) continue;
    const coordinateKey = `${place.name.toLowerCase()}|${place.lat.toFixed(5)}|${place.lng.toFixed(5)}`;
    const key = place.id || coordinateKey;
    if (!byId.has(key)) byId.set(key, place);
  }
  return [...byId.values()];
}

export function placesNear(point, places, preferredRadiusKm = 1.35, minItems = 8) {
  const radii = [preferredRadiusKm, preferredRadiusKm * 1.45, preferredRadiusKm * 2.05]
    .map((radius) => Math.min(4.2, radius));
  for (const radius of radii) {
    const nearby = places
      .filter((place) => !place.isMeetingAnchor)
      .map((place) => ({ ...place, distanceKm: haversineKm(point, place) }))
      .filter((place) => place.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (nearby.length >= minItems || radius === radii.at(-1)) return nearby;
  }
  return [];
}

export async function discoverMeetingPlaces(center, participants = []) {
  if (isKakaoMapsConfigured) {
    try {
      const places = await kakaoDiscoverPlaces(center, participants);
      if (places.filter((place) => !place.isMeetingAnchor).length >= 12) return places;
      console.warn('[MeetHalfway] Kakao returned too few meeting places; supplementing with OpenStreetMap.', places.length);
      const fallback = await osmDiscoverPlaces(center, participants).catch(() => []);
      return dedupePlaces([...places, ...fallback]);
    } catch (error) {
      console.warn('[MeetHalfway] Kakao place discovery unavailable; falling back to OpenStreetMap/Overpass.', error);
      return osmDiscoverPlaces(center, participants);
    }
  }
  if (isGoogleMapsConfigured) {
    try {
      const places = await googleDiscoverPlaces(center, participants);
      if (places.filter((place) => !place.isMeetingAnchor).length >= 12) return places;
      const fallback = await osmDiscoverPlaces(center, participants).catch(() => []);
      return dedupePlaces([...places, ...fallback]);
    } catch (error) {
      console.warn('[MeetHalfway] Google place discovery unavailable; falling back to OpenStreetMap/Overpass.', error);
      return osmDiscoverPlaces(center, participants);
    }
  }
  return osmDiscoverPlaces(center, participants);
}

// Backward-compatible export used by older cached builds.
export async function findRestaurants(center, participants = []) {
  const places = await discoverMeetingPlaces(center, participants);
  return places.filter((place) => place.category === 'restaurant' || place.category === 'fast_food');
}
