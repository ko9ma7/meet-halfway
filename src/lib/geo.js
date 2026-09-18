const EARTH_RADIUS_KM = 6371.0088;

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a, b) {
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);
  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function geometricMedian(points) {
  if (points.length === 0) return null;
  if (points.length === 1) return { ...points[0] };
  let current = points.reduce((acc, p) => ({
    lat: acc.lat + p.lat / points.length,
    lng: acc.lng + p.lng / points.length
  }), { lat: 0, lng: 0 });

  for (let iteration = 0; iteration < 80; iteration += 1) {
    let numeratorLat = 0;
    let numeratorLng = 0;
    let denominator = 0;
    let snapped = null;
    for (const point of points) {
      const distance = Math.max(haversineKm(current, point), 1e-7);
      if (distance < 1e-6) {
        snapped = point;
        break;
      }
      const weight = 1 / distance;
      numeratorLat += point.lat * weight;
      numeratorLng += point.lng * weight;
      denominator += weight;
    }
    if (snapped) return { ...snapped };
    const next = { lat: numeratorLat / denominator, lng: numeratorLng / denominator };
    if (haversineKm(current, next) < 0.0001) return next;
    current = next;
  }
  return current;
}

function toLocalMeters(origin, point) {
  const latScale = 110_540;
  const lngScale = 111_320 * Math.cos(degToRad(origin.lat));
  return {
    x: (point.lng - origin.lng) * lngScale,
    y: (point.lat - origin.lat) * latScale
  };
}

function categoryWeight(place) {
  if (place.category === 'restaurant') return 1;
  if (place.category === 'fast_food') return 0.86;
  if (place.category === 'cafe') return 0.74;
  if (place.category === 'bar') return 0.58;
  return 0.5;
}

function weightedCenter(items) {
  const weightSum = items.reduce((sum, place) => sum + categoryWeight(place), 0) || 1;
  return items.reduce((acc, place) => {
    const weight = categoryWeight(place);
    acc.lat += place.lat * weight / weightSum;
    acc.lng += place.lng * weight / weightSum;
    return acc;
  }, { lat: 0, lng: 0 });
}

function candidateFromGroup(id, group, places, participants, center, clusterRadiusKm) {
  if (!group.length) return null;
  const preliminary = weightedCenter(group);
  const nearby = places.filter((place) => haversineKm(preliminary, place) <= clusterRadiusKm);
  const effective = nearby.length ? nearby : group;
  const candidate = weightedCenter(effective);
  const participantDistances = participants.map((p) => haversineKm(p, candidate));
  const maxParticipantDistanceKm = Math.max(...participantDistances, 0);
  const avgParticipantDistanceKm = participantDistances.length
    ? participantDistances.reduce((sum, value) => sum + value, 0) / participantDistances.length
    : 0;
  const restaurantCount = effective.filter((place) => place.category === 'restaurant' || place.category === 'fast_food').length;
  const cafeCount = effective.filter((place) => place.category === 'cafe').length;
  return {
    id,
    ...candidate,
    placeCount: effective.length,
    restaurantCount,
    cafeCount,
    densityWeight: effective.reduce((sum, place) => sum + categoryWeight(place), 0),
    centerDistanceKm: haversineKm(center, candidate),
    maxParticipantDistanceKm,
    avgParticipantDistanceKm,
    nearbyPlaceIds: effective.map((place) => place.id)
  };
}

function uniqueCandidates(candidates) {
  const result = [];
  for (const candidate of candidates) {
    if (!candidate || !Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) continue;
    const duplicate = result.some((existing) => haversineKm(existing, candidate) < 0.12);
    if (!duplicate) result.push(candidate);
  }
  return result;
}

export function buildHotspots(places, participants, center, maxResults = 3) {
  if (!places.length) return [];

  const centerParticipantDistances = participants.map((p) => haversineKm(p, center));
  const centerMaxDistance = Math.max(...centerParticipantDistances, 1);
  const centerAvgDistance = centerParticipantDistances.length
    ? centerParticipantDistances.reduce((sum, value) => sum + value, 0) / centerParticipantDistances.length
    : 0;

  const searchScaleKm = Math.min(55, Math.max(12, centerMaxDistance * 0.34));
  const clusterRadiusKm = centerMaxDistance > 90 ? 2.6 : centerMaxDistance > 45 ? 2.2 : centerMaxDistance > 20 ? 1.65 : 1.05;
  const primarySeparationKm = Math.min(10, Math.max(1.25, centerMaxDistance * 0.04));

  // 1) Density candidates around every real place.
  const seedCandidates = places.map((seed) => {
    const group = places.filter((place) => haversineKm(seed, place) <= clusterRadiusKm);
    return candidateFromGroup(`seed:${seed.id}`, group, places, participants, center, clusterRadiusKm);
  });

  // 2) Grid buckets prevent one large commercial district from collapsing every
  // candidate onto exactly the same weighted center. They also create distinct
  // neighbourhood choices inside a large city.
  const bucketMeters = Math.max(650, Math.min(2200, clusterRadiusKm * 850));
  const buckets = new Map();
  for (const place of places) {
    const local = toLocalMeters(center, place);
    const key = `${Math.floor(local.x / bucketMeters)}:${Math.floor(local.y / bucketMeters)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(place);
  }
  const gridCandidates = [...buckets.entries()].map(([key, group]) =>
    candidateFromGroup(`grid:${key}`, group, places, participants, center, Math.max(0.8, clusterRadiusKm * 0.82))
  );

  // 3) Micro-neighbourhood anchors are only used as a fallback when one very
  // dense district would otherwise collapse all weighted centers together.
  // They are still derived exclusively from real POIs.
  const microRadiusKm = Math.max(0.32, Math.min(0.72, clusterRadiusKm * 0.34));
  const microCandidates = places.map((seed) => {
    const group = places.filter((place) => haversineKm(seed, place) <= microRadiusKm);
    return candidateFromGroup(`micro:${seed.id}`, group.length ? group : [seed], places, participants, center, microRadiusKm);
  });

  const raw = uniqueCandidates([...seedCandidates, ...gridCandidates, ...microCandidates]);
  if (!raw.length) return [];

  const maxDensity = Math.max(...raw.map((item) => item.densityWeight), 1);
  const maxPlaceCount = Math.max(...raw.map((item) => item.placeCount), 1);

  for (const candidate of raw) {
    const densityScore = (candidate.densityWeight / maxDensity) * 0.7 + (candidate.placeCount / maxPlaceCount) * 0.3;
    const proximityScore = Math.max(0, 1 - candidate.centerDistanceKm / searchScaleKm);
    const maxFairness = Math.max(0, 1 - Math.max(0, candidate.maxParticipantDistanceKm - centerMaxDistance) / searchScaleKm);
    const avgFairness = centerAvgDistance > 0
      ? Math.max(0, 1 - Math.max(0, candidate.avgParticipantDistanceKm - centerAvgDistance) / searchScaleKm)
      : 1;
    candidate.score = densityScore * 0.48 + proximityScore * 0.23 + maxFairness * 0.19 + avgFairness * 0.10;
  }

  raw.sort((a, b) => b.score - a.score || b.placeCount - a.placeCount || a.centerDistanceKm - b.centerDistanceKm);

  const selected = [];
  const addWithSeparation = (separationKm, minPlaces) => {
    for (const hotspot of raw) {
      if (hotspot.placeCount < minPlaces) continue;
      if (selected.some((picked) => picked.id === hotspot.id || haversineKm(picked, hotspot) < 0.12)) continue;
      if (selected.every((picked) => haversineKm(picked, hotspot) >= separationKm)) selected.push(hotspot);
      if (selected.length >= maxResults) return true;
    }
    return selected.length >= maxResults;
  };

  // Prefer clearly different commercial districts first, then progressively
  // relax only the separation threshold. We never fabricate a coordinate.
  addWithSeparation(primarySeparationKm, 3);
  if (selected.length < maxResults) addWithSeparation(Math.max(0.75, primarySeparationKm * 0.55), 2);
  if (selected.length < maxResults) addWithSeparation(0.35, 1);

  // Final diversity pass: choose the candidate that is furthest from the
  // already selected candidates while still considering the recommendation score.
  while (selected.length < maxResults) {
    const pool = raw.filter((candidate) => !selected.some((picked) => picked.id === candidate.id || haversineKm(picked, candidate) < 0.1));
    if (!pool.length) break;
    pool.sort((a, b) => {
      const diversityA = selected.length ? Math.min(...selected.map((picked) => haversineKm(picked, a))) : 0;
      const diversityB = selected.length ? Math.min(...selected.map((picked) => haversineKm(picked, b))) : 0;
      const utilityA = a.score + Math.min(diversityA, 8) * 0.035;
      const utilityB = b.score + Math.min(diversityB, 8) * 0.035;
      return utilityB - utilityA;
    });
    selected.push(pool[0]);
  }

  return selected.slice(0, maxResults);
}
