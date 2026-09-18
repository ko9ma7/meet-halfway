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
export function buildHotspots(restaurants, participants, center, maxResults = 3) {
    if (restaurants.length === 0)
        return [];
    const cellSize = 650;
    const groups = new Map();
    for (const restaurant of restaurants) {
        const local = toLocalMeters(center, restaurant);
        const key = `${Math.floor(local.x / cellSize)}:${Math.floor(local.y / cellSize)}`;
        const group = groups.get(key) ?? [];
        group.push(restaurant);
        groups.set(key, group);
    }
    const maxCount = Math.max(...Array.from(groups.values(), (items) => items.length));
    const scored = Array.from(groups.entries()).map(([id, items]) => {
        const candidate = items.reduce((acc, item) => ({ lat: acc.lat + item.lat / items.length, lng: acc.lng + item.lng / items.length }), { lat: 0, lng: 0 });
        const centerDistanceKm = haversineKm(center, candidate);
        const participantDistances = participants.map((p) => haversineKm(p, candidate));
        const maxParticipantDistanceKm = participantDistances.length ? Math.max(...participantDistances) : 0;
        const minParticipantDistanceKm = participantDistances.length ? Math.min(...participantDistances) : 0;
        const spread = maxParticipantDistanceKm > 0 ? (maxParticipantDistanceKm - minParticipantDistanceKm) / maxParticipantDistanceKm : 0;
        const densityScore = items.length / maxCount;
        const proximityScore = Math.max(0, 1 - centerDistanceKm / 2.5);
        const fairnessScore = Math.max(0, 1 - spread);
        const score = densityScore * 0.5 + proximityScore * 0.35 + fairnessScore * 0.15;
        return {
            id,
            ...candidate,
            restaurantCount: items.length,
            score,
            centerDistanceKm,
            maxParticipantDistanceKm
        };
    });
    scored.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const hotspot of scored) {
        if (selected.every((picked) => haversineKm(picked, hotspot) >= 0.45)) {
            selected.push(hotspot);
        }
        if (selected.length >= maxResults)
            break;
    }
    return selected;
}
