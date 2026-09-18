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
    if (points.length === 0)
        return null;
    if (points.length === 1)
        return { ...points[0] };
    let current = points.reduce((acc, p) => ({ lat: acc.lat + p.lat / points.length, lng: acc.lng + p.lng / points.length }), { lat: 0, lng: 0 });
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
        if (snapped)
            return { ...snapped };
        const next = { lat: numeratorLat / denominator, lng: numeratorLng / denominator };
        if (haversineKm(current, next) < 0.0001)
            return next;
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
export function buildHotspots(places, participants, center, maxResults = 3) {
    if (places.length === 0)
        return [];
    const centerParticipantDistances = participants.map((p) => haversineKm(p, center));
    const centerMaxDistance = Math.max(...centerParticipantDistances, 1);
    const centerAvgDistance = centerParticipantDistances.length
        ? centerParticipantDistances.reduce((sum, value) => sum + value, 0) / centerParticipantDistances.length
        : 0;
    const searchScaleKm = Math.min(45, Math.max(12, centerMaxDistance * 0.3));
    const clusterRadiusKm = centerMaxDistance > 60 ? 2.2 : centerMaxDistance > 20 ? 1.7 : 1.15;
    const minSeparationKm = Math.min(8, Math.max(1.7, centerMaxDistance * 0.045));
    const categoryWeight = (place) => {
        if (place.category === 'restaurant') return 1;
        if (place.category === 'fast_food') return 0.85;
        if (place.category === 'cafe') return 0.72;
        return 0.52;
    };
    const raw = places.map((seed) => {
        const nearby = places.filter((place) => haversineKm(seed, place) <= clusterRadiusKm);
        const weightSum = nearby.reduce((sum, place) => sum + categoryWeight(place), 0) || 1;
        const candidate = nearby.reduce((acc, place) => {
            const weight = categoryWeight(place);
            acc.lat += place.lat * weight / weightSum;
            acc.lng += place.lng * weight / weightSum;
            return acc;
        }, { lat: 0, lng: 0 });
        const participantDistances = participants.map((p) => haversineKm(p, candidate));
        const maxParticipantDistanceKm = Math.max(...participantDistances, 0);
        const avgParticipantDistanceKm = participantDistances.length
            ? participantDistances.reduce((sum, value) => sum + value, 0) / participantDistances.length
            : 0;
        const centerDistanceKm = haversineKm(center, candidate);
        const restaurantCount = nearby.filter((place) => place.category === 'restaurant' || place.category === 'fast_food').length;
        const cafeCount = nearby.filter((place) => place.category === 'cafe').length;
        return {
            id: String(seed.id || `${candidate.lat}:${candidate.lng}`),
            ...candidate,
            placeCount: nearby.length,
            restaurantCount,
            cafeCount,
            densityWeight: weightSum,
            centerDistanceKm,
            maxParticipantDistanceKm,
            avgParticipantDistanceKm,
            nearbyPlaceIds: nearby.map((place) => place.id)
        };
    });
    const maxDensity = Math.max(...raw.map((item) => item.densityWeight), 1);
    const maxPlaceCount = Math.max(...raw.map((item) => item.placeCount), 1);
    for (const candidate of raw) {
        const densityScore = (candidate.densityWeight / maxDensity) * 0.72 + (candidate.placeCount / maxPlaceCount) * 0.28;
        const proximityScore = Math.max(0, 1 - candidate.centerDistanceKm / searchScaleKm);
        const maxFairness = Math.max(0, 1 - Math.max(0, candidate.maxParticipantDistanceKm - centerMaxDistance) / searchScaleKm);
        const avgFairness = centerAvgDistance > 0
            ? Math.max(0, 1 - Math.max(0, candidate.avgParticipantDistanceKm - centerAvgDistance) / searchScaleKm)
            : 1;
        candidate.score = densityScore * 0.5 + proximityScore * 0.22 + maxFairness * 0.18 + avgFairness * 0.10;
    }
    raw.sort((a, b) => b.score - a.score || b.placeCount - a.placeCount || a.centerDistanceKm - b.centerDistanceKm);
    const selected = [];
    for (const hotspot of raw) {
        if (hotspot.placeCount < 2) continue;
        if (selected.every((picked) => haversineKm(picked, hotspot) >= minSeparationKm)) {
            selected.push(hotspot);
        }
        if (selected.length >= maxResults) break;
    }
    // If a rural area has only one dense cluster, still return distinct alternatives
    // instead of collapsing the result to one point.
    if (selected.length < maxResults) {
        for (const hotspot of raw) {
            if (selected.some((picked) => picked.id === hotspot.id)) continue;
            if (selected.every((picked) => haversineKm(picked, hotspot) >= Math.max(1, minSeparationKm * 0.5))) {
                selected.push(hotspot);
            }
            if (selected.length >= maxResults) break;
        }
    }
    return selected.slice(0, maxResults);
}
