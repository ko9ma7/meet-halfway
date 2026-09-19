const EARTH_RADIUS_KM = 6371.0088;

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

/**
 * Keep recommendations visually and practically close to the fair midpoint.
 * Dense city meetings should stay within a few kilometres. Long-distance
 * meetings may expand enough to reach a real town/commercial district, but the
 * recommendation radius still grows much slower than attendee distance.
 */
export function recommendationRadiusKm(participants, center) {
  if (!center || !participants?.length) return 2.5;
  const maxDistance = Math.max(...participants.map((p) => haversineKm(p, center)), 0);
  if (maxDistance <= 10) return clamp(maxDistance * 0.32, 1.8, 3.0);
  if (maxDistance <= 25) return clamp(maxDistance * 0.28, 3.0, 5.5);
  if (maxDistance <= 60) return clamp(maxDistance * 0.23, 5.0, 10.0);
  return clamp(maxDistance * 0.19, 9.0, 22.0);
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
  if (place.isMeetingAnchor || place.category === 'transit') return 0.72;
  if (place.category === 'restaurant') return 1;
  if (place.category === 'fast_food') return 0.9;
  if (place.category === 'cafe') return 0.82;
  if (place.category === 'bar') return 0.62;
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

function dominantAreaLabel(items) {
  const counts = new Map();
  for (const item of items) {
    if (!item.areaLabel) continue;
    counts.set(item.areaLabel, (counts.get(item.areaLabel) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
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
  const venues = effective.filter((place) => !place.isMeetingAnchor && place.category !== 'transit');
  const anchors = effective.filter((place) => place.isMeetingAnchor || place.category === 'transit');
  const restaurantCount = venues.filter((place) => place.category === 'restaurant' || place.category === 'fast_food').length;
  const cafeCount = venues.filter((place) => place.category === 'cafe').length;
  const barCount = venues.filter((place) => place.category === 'bar').length;
  const diversityCount = [restaurantCount > 0, cafeCount > 0, barCount > 0].filter(Boolean).length;
  return {
    id,
    ...candidate,
    areaLabel: dominantAreaLabel(effective),
    placeCount: venues.length,
    restaurantCount,
    cafeCount,
    barCount,
    anchorCount: anchors.length,
    diversityCount,
    densityWeight: venues.reduce((sum, place) => sum + categoryWeight(place), 0),
    centerDistanceKm: haversineKm(center, candidate),
    maxParticipantDistanceKm,
    avgParticipantDistanceKm,
    nearbyPlaceIds: venues.map((place) => place.id)
  };
}

function uniqueCandidates(candidates) {
  const result = [];
  for (const candidate of candidates) {
    if (!candidate || !Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) continue;
    const duplicate = result.some((existing) => haversineKm(existing, candidate) < 0.1);
    if (!duplicate) result.push(candidate);
  }
  return result;
}

function candidatePool(raw, radiusKm, centerMaxDistance, radiusScale = 1) {
  const allowedRadius = radiusKm * radiusScale;
  const maxTravelAllowance = Math.max(0.8, allowedRadius * 0.55);
  return raw.filter((candidate) => (
    candidate.centerDistanceKm <= allowedRadius &&
    candidate.maxParticipantDistanceKm <= centerMaxDistance + maxTravelAllowance
  ));
}

function selectDistinct(pool, maxResults, separationKm, minPlaces, selected = []) {
  for (const candidate of pool) {
    if (candidate.placeCount < minPlaces) continue;
    if (selected.some((picked) => picked.id === candidate.id || haversineKm(picked, candidate) < 0.1)) continue;
    if (selected.every((picked) => haversineKm(picked, candidate) >= separationKm)) selected.push(candidate);
    if (selected.length >= maxResults) break;
  }
  return selected;
}

export function buildHotspots(places, participants, center, maxResults = 3) {
  if (!places.length || !center) return [];

  const centerParticipantDistances = participants.map((p) => haversineKm(p, center));
  const centerMaxDistance = Math.max(...centerParticipantDistances, 1);
  const centerAvgDistance = centerParticipantDistances.length
    ? centerParticipantDistances.reduce((sum, value) => sum + value, 0) / centerParticipantDistances.length
    : 0;
  const fairRadiusKm = recommendationRadiusKm(participants, center);

  // Cluster size describes one walkable commercial area, not an entire city.
  const clusterRadiusKm = centerMaxDistance <= 12
    ? 0.7
    : centerMaxDistance <= 30
      ? 1.05
      : centerMaxDistance <= 70
        ? 1.4
        : 1.9;
  const primarySeparationKm = clamp(fairRadiusKm * 0.3, 0.55, 2.2);

  const seedCandidates = places.map((seed) => {
    const group = places.filter((place) => haversineKm(seed, place) <= clusterRadiusKm);
    return candidateFromGroup(`seed:${seed.id}`, group, places, participants, center, clusterRadiusKm);
  });

  // Grid candidates help identify nearby but distinct downtown pockets without
  // letting a single huge metropolitan cluster become one recommendation.
  const bucketMeters = Math.max(450, Math.min(1400, clusterRadiusKm * 760));
  const buckets = new Map();
  for (const place of places) {
    const local = toLocalMeters(center, place);
    const key = `${Math.floor(local.x / bucketMeters)}:${Math.floor(local.y / bucketMeters)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(place);
  }
  const gridCandidates = [...buckets.entries()].map(([key, group]) =>
    candidateFromGroup(`grid:${key}`, group, places, participants, center, Math.max(0.55, clusterRadiusKm * 0.78))
  );

  const microRadiusKm = clamp(clusterRadiusKm * 0.42, 0.3, 0.72);
  const microCandidates = places.map((seed) => {
    const group = places.filter((place) => haversineKm(seed, place) <= microRadiusKm);
    return candidateFromGroup(`micro:${seed.id}`, group.length ? group : [seed], places, participants, center, microRadiusKm);
  });

  const raw = uniqueCandidates([...seedCandidates, ...gridCandidates, ...microCandidates]);
  if (!raw.length) return [];

  const maxDensity = Math.max(...raw.map((item) => item.densityWeight), 1);
  const maxPlaceCount = Math.max(...raw.map((item) => item.placeCount), 1);
  const maxAnchorCount = Math.max(...raw.map((item) => item.anchorCount || 0), 1);

  for (const candidate of raw) {
    const densityScore = (candidate.densityWeight / maxDensity) * 0.68 + (candidate.placeCount / maxPlaceCount) * 0.32;
    const diversityScore = clamp(candidate.diversityCount / 2, 0, 1);
    const anchorScore = clamp((candidate.anchorCount || 0) / maxAnchorCount, 0, 1);
    const proximityScore = Math.max(0, 1 - candidate.centerDistanceKm / Math.max(fairRadiusKm, 0.1));
    const maxFairness = Math.max(0, 1 - Math.max(0, candidate.maxParticipantDistanceKm - centerMaxDistance) / Math.max(fairRadiusKm, 0.1));
    const avgFairness = centerAvgDistance > 0
      ? Math.max(0, 1 - Math.max(0, candidate.avgParticipantDistanceKm - centerAvgDistance) / Math.max(fairRadiusKm, 0.1))
      : 1;
    // Midpoint/fairness now outrank raw density. Dense nightlife several km away
    // should not beat a slightly smaller but genuinely central meeting district.
    candidate.score = densityScore * 0.27 + anchorScore * 0.11 + diversityScore * 0.07 + proximityScore * 0.29 + maxFairness * 0.18 + avgFairness * 0.08;
    candidate.recommendationRadiusKm = fairRadiusKm;
    candidate.clusterRadiusKm = clusterRadiusKm;
  }

  raw.sort((a, b) => b.score - a.score || a.centerDistanceKm - b.centerDistanceKm || b.placeCount - a.placeCount);

  // Strict midpoint band first. Only if that cannot produce enough real
  // commercial pockets do we expand in small, explicit steps. No city-wide
  // "fill to 3" pass is allowed anymore.
  const tiers = [
    { scale: 1, name: 'core' },
    { scale: 1.22, name: 'nearby' },
    { scale: 1.45, name: 'expanded' }
  ];
  const selected = [];

  for (const tier of tiers) {
    const pool = candidatePool(raw, fairRadiusKm, centerMaxDistance, tier.scale);
    selectDistinct(pool, maxResults, primarySeparationKm, 4, selected);
    if (selected.length < maxResults) selectDistinct(pool, maxResults, Math.max(0.42, primarySeparationKm * 0.62), 2, selected);
    for (const candidate of selected) {
      if (!candidate.recommendationTier) candidate.recommendationTier = tier.name;
    }
    if (selected.length >= maxResults) break;
  }

  // A final compact pass may accept a one-POI anchor, but still inside the hard
  // midpoint boundary. It never searches farther just to manufacture 3 cards.
  if (selected.length < maxResults) {
    const hardPool = candidatePool(raw, fairRadiusKm, centerMaxDistance, 1.45);
    selectDistinct(hardPool, maxResults, 0.32, 1, selected);
    for (const candidate of selected) {
      if (!candidate.recommendationTier) candidate.recommendationTier = 'expanded';
    }
  }

  return selected.slice(0, maxResults);
}
