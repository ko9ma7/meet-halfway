export const DEMO_SNAPSHOT = {
    meeting: {
        id: 'demo-meeting',
        shareId: 'demo',
        title: '금요일 저녁 친구 모임',
        deadline: '2099-12-31T23:59:00+09:00',
        status: 'closed',
        createdAt: '2026-09-18T12:00:00+09:00'
    },
    participants: [
        { id: 'd1', name: '민준', address: '홍대입구역', lat: 37.5572, lng: 126.9245, createdAt: '2026-09-18T12:01:00+09:00', isHost: true },
        { id: 'd2', name: '서연', address: '강남역', lat: 37.4979, lng: 127.0276, createdAt: '2026-09-18T12:02:00+09:00' },
        { id: 'd3', name: '지훈', address: '건대입구역', lat: 37.5404, lng: 127.0692, createdAt: '2026-09-18T12:03:00+09:00' },
        { id: 'd4', name: '하린', address: '서울역', lat: 37.5547, lng: 126.9707, createdAt: '2026-09-18T12:04:00+09:00' }
    ]
};

// Deterministic sample POIs for the public demo route. These are intentionally
// labelled as examples so the recommendation UI can always demonstrate three
// areas even when an external map API is unavailable.
const demoClusters = [
  { lat: 37.5350, lng: 126.9945, label: '이태원', offset: 0 },
  { lat: 37.5446, lng: 126.9512, label: '공덕', offset: 10 },
  { lat: 37.5614, lng: 127.0371, label: '왕십리', offset: 20 }
];

export const DEMO_PLACES = demoClusters.flatMap((cluster) => Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2;
  const ring = 0.0014 + (index % 3) * 0.00055;
  const category = index % 5 === 1 ? 'cafe' : index % 7 === 3 ? 'fast_food' : 'restaurant';
  return {
    id: `demo:${cluster.offset + index + 1}`,
    name: `${cluster.label} ${category === 'cafe' ? '예시카페' : category === 'fast_food' ? '예시분식' : '예시맛집'} ${index + 1}`,
    lat: cluster.lat + Math.sin(angle) * ring,
    lng: cluster.lng + Math.cos(angle) * ring,
    category,
    cuisine: category === 'cafe' ? '카페' : index % 2 ? '한식' : '다이닝',
    address: `${cluster.label} 추천지역 · 데모 예시 데이터`,
    provider: 'demo'
  };
}));
