const STORAGE_KEY = 'meet-halfway.language';

export const SUPPORTED_LANGUAGES = [
  { code: 'ko', label: '한국어', tag: 'ko-KR' },
  { code: 'en', label: 'English', tag: 'en-US' },
  { code: 'ja', label: '日本語', tag: 'ja-JP' },
  { code: 'zh', label: '中文', tag: 'zh-CN' }
];

const messages = {
  ko: {
    brand: '어?중간',
    'brand.en': 'EO?JUNGAN',
    'nav.demo': '예시 보기',
    'nav.about': '서비스 소개',
    'nav.language': '언어',
    'nav.style': '컬러 스타일',
    'nav.theme': '화면 테마',
    'theme.system': '시스템',
    'theme.light': '라이트',
    'theme.dark': '다크',
    'style.aurora': 'Aurora',
    'style.ocean': 'Ocean',
    'style.forest': 'Forest',
    'style.sunset': 'Sunset',
    'home.eyebrow': '모임 장소, 감 대신 균형으로',
    'home.title1': '모두의 출발점 사이,',
    'home.title2': '만나기 좋은 곳',
    'home.title3': '을 찾습니다.',
    'home.description': '모임 링크를 만들고 각자 출발 위치를 입력하세요. 마감되면 이동 거리의 균형과 주변 식당 밀집도를 함께 계산해 후보 지역을 보여드립니다.',
    'home.create': '모임 링크 만들기',
    'home.demo': '완성 예시 보기',
    'home.trust1': '회원가입 없음',
    'home.trust2': '공유 링크 참여',
    'home.trust3': '모바일 최적화',
    'home.map.done': '4명 입력 완료',
    'home.map.note': '균형 지점 + 맛집 밀집도 계산',
    'home.map.center': '만남 후보',
    'create.eyebrow': '01 · 모임 만들기',
    'create.title': '첫 출발 위치를 입력하면 공유 링크가 만들어집니다.',
    'create.description': '참석자에게 공개해도 괜찮은 위치를 입력하세요. 정확한 집 주소 대신 가까운 역이나 랜드마크를 권장합니다.',
    'create.meetingName': '모임 이름',
    'create.meetingPlaceholder': '예: 금요일 저녁 친구 모임',
    'create.myName': '내 이름',
    'create.namePlaceholder': '예: 민준',
    'create.deadline': '입력 마감',
    'create.address': '출발 위치',
    'create.addressPlaceholder': '역명, 도로명, 건물명을 검색하세요',
    'create.addressHelp': '주소 검색 결과를 선택하면 좌표가 함께 저장됩니다.',
    'create.consent': '공유 링크를 아는 참석자에게 입력한 위치가 표시될 수 있음을 확인했습니다.',
    'create.submit': '모임 링크 만들기',
    'create.submitting': '링크 만드는 중…',
    'create.success': '모임 링크를 만들었습니다.',
    'create.error': '모임을 만들지 못했습니다.',
    'local.title': '현재 로컬 데모 모드입니다.',
    'local.description': '같은 브라우저에서는 전체 기능을 시험할 수 있습니다. 여러 기기에서 같은 링크를 쓰려면 README의 공유 저장소 설정을 완료하세요.',
    'steps.eyebrow': '간단한 흐름',
    'steps.title': '링크 하나로 장소 결정까지',
    'steps.1.title': '모임 링크 생성',
    'steps.1.body': '모임 이름, 생성자 이름, 출발 위치, 입력 마감을 정합니다.',
    'steps.2.title': '참석자 위치 수집',
    'steps.2.body': '단체 대화방에 링크를 공유하면 각자 이름과 출발 위치를 추가합니다.',
    'steps.3.title': '중간지점·맛집 확인',
    'steps.3.body': '마감 후 균형 중간지점과 주변 식당 밀집 후보를 지도에서 비교합니다.',
    'about.eyebrow': 'ABOUT 어?중간',
    'about.title': '모두에게 설명하기 쉬운, 공유형 중간지점 찾기',
    'about.intro': '어?중간은 “어디서 만나?”라는 질문에 각자의 출발점을 모아 답하는 서비스입니다. 수학적 중간점을 참고하되 산이나 외곽 좌표를 그대로 목적지로 쓰지 않고, 주변의 실제 상권과 먹을 곳 밀도를 함께 비교해 만나기 좋은 후보 지역을 보여줍니다.',
    'about.fair.title': '공정한 중심 계산',
    'about.fair.body': '단순 평균 대신 기하학적 중앙값을 사용해 한 명의 먼 출발점 때문에 결과가 과도하게 끌리는 현상을 줄입니다.',
    'about.share.title': '링크 중심 참여',
    'about.share.body': '회원가입 없이 모임별 공유 링크로 들어와 이름과 출발점을 저장할 수 있습니다.',
    'about.map.title': '교체 가능한 지도 공급자',
    'about.map.body': 'Kakao Maps, OpenStreetMap, Google Maps를 지원합니다. 관리자 설정 한 곳에서 공급자를 선택합니다.',
    'about.privacy.title': '개인정보 최소화',
    'about.privacy.body': '집 주소보다는 역·랜드마크 사용을 권장하며, 관리자 키와 참가자 수정 토큰 원문은 브라우저에만 저장합니다.',
    'about.stack.title': '배포 구조',
    'about.stack.body': 'GitHub Pages + 정적 ES Modules + 선택적 Supabase RPC 구조입니다. build dependency가 없어 배포가 단순합니다.',
    'about.languages.title': '다국어·다중 스타일',
    'about.languages.body': '한국어, 영어, 일본어, 중국어를 제공하며 Aurora, Ocean, Forest, Sunset 컬러 스타일과 Light/Dark/System 테마를 조합할 수 있습니다.',
    'meeting.loading': '모임 정보를 불러오는 중…',
    'meeting.notFound': '모임을 찾을 수 없습니다.',
    'meeting.share': '공유하기',
    'meeting.copySuccess': '공유 링크를 복사했습니다.',
    'meeting.shareText': '출발 위치를 입력해주세요.',
    'meeting.shareError': '공유에 실패했습니다. 주소창의 링크를 복사해주세요.',
    'meeting.participants': '참석자',
    'meeting.peopleEntered': '{count}명이 출발 위치를 입력했습니다.',
    'meeting.closedSummary': '아래에서 실제로 만나기 좋은 추천 지역과 먹을 곳을 확인하세요.',
    'meeting.openSummary': '입력 마감은 {deadline}입니다.',
    'meeting.map': '지도',
    'meeting.startPoints': '출발 위치',
    'meeting.legendStart': '출발점',
    'meeting.legendCenter': '중간점',
    'meeting.legendFood': '식당',
    'meeting.host': '생성자',
    'meeting.deadline': '입력 마감',
    'meeting.open': '입력 받는 중',
    'meeting.closed': '입력 마감',
    'meeting.closeNow': '지금 마감하기',
    'meeting.closing': '마감 처리 중…',
    'meeting.closeConfirm': '지금 입력을 마감하고 결과를 계산할까요? 이후 새 참가자는 위치를 추가할 수 없습니다.',
    'meeting.closeSuccess': '모임 입력을 마감했습니다.',
    'meeting.closeError': '마감 처리에 실패했습니다.',
    'meeting.adminAccess': '관리키 입력',
    'meeting.closedMessage': '입력이 마감되었습니다.',
    'meeting.closedHint': '결과는 지도와 아래 추천 지역에서 확인할 수 있습니다.',
    'join.title': '내 위치 추가',
    'join.edit': '수정',
    'join.hint': '집 주소 대신 가까운 역/랜드마크를 권장합니다.',
    'join.name': '이름',
    'join.namePlaceholder': '이름 또는 닉네임',
    'join.address': '출발 위치',
    'join.addressPlaceholder': '역명, 도로명, 건물명 검색',
    'join.submit': '위치 저장하기',
    'join.saving': '저장 중…',
    'join.success': '출발 위치를 저장했습니다.',
    'join.error': '위치를 저장하지 못했습니다.',
    'address.searching': '주소를 찾는 중…',
    'address.empty': '검색 결과가 없습니다. 역명이나 도로명으로 다시 검색해보세요.',
    'address.error': '주소 검색에 실패했습니다.',
    'address.invalid': '검색 가능한 출발 위치를 입력해주세요.',
    'address.notFound': '주소를 찾지 못했습니다.',
    'results.eyebrow': '02 · 결과',
    'results.title': '만나기 좋은 지역을 계산했습니다.',
    'results.description': '수학적 중간점을 기준으로 주변 상권을 탐색해 실제로 만나기 좋은 지역 3곳과 먹을 곳을 보여드립니다.',
    'results.loading': '중간점 주변 상권과 음식점·카페를 탐색하는 중…',
    'results.noParticipants': '계산할 참석자 위치가 없습니다.',
    'results.candidate': '추천 {n}',
    'results.nearby': '{name} 주변',
    'results.midpointNearby': '중간지점 인근',
    'results.restaurantCell': '식당 밀집 셀 {count}곳',
    'results.fromCenter': '중간점에서 {distance}km',
    'results.avgDistance': '평균 직선거리',
    'results.maxDistance': '최대 직선거리',
    'results.restaurantCount': '주변 식당',
    'results.algorithm': '기하학적 중앙값 기준',
    'results.openMap': '지도 크게 보기 ↗',
    'results.restaurant': '음식점',
    'results.restaurantHeading': '주변 식당',
    'results.dataSource': '지도 데이터 기준',
    'results.note': '현재 버전은 도로·대중교통 시간이 아닌 직선거리 균형을 기준으로 합니다. 식당 후보는 중간지점과의 거리, 참석자 간 균형, 식당 밀집도를 함께 반영합니다.',
    'results.fallbackTitle': '식당 후보를 만들 만큼 데이터가 충분하지 않습니다.',
    'results.fallbackBody': '중간지점 자체는 계산되었습니다. 지도에서 중심점을 확인하고 주변 장소를 직접 비교해주세요.',
    'results.placeError': '식당 데이터를 불러오지 못했습니다.',
    'results.placeCluster': '먹을 곳 {count}곳',
    'results.recommendationIntro': '수학적 중간점이 산이나 외곽에 있어도 그대로 만나라고 하지 않습니다. 중간점 주변의 실제 상권 밀도와 거리 균형을 함께 비교해 3개 지역을 추천합니다.',
    'results.selectArea': '이 지역 보기',
    'results.unselectArea': '선택 해제',
    'results.expandedCandidate': '확장 후보',
    'results.recommendationRadius': '중간점 우선 반경 {distance}km 안에서 상권을 먼저 고릅니다.',
    'results.selectedArea': '선택한 만남 지역',
    'results.selectedHint': '지도가 이 지역으로 확대되었습니다. 아래에서 종류별로 먹을 곳을 골라보세요.',
    'results.placesHeading': '이 지역에서 먹을 곳',
    'results.all': '전체',
    'results.categoryRestaurant': '음식점',
    'results.categoryCafe': '카페',
    'results.categoryQuick': '간편식',
    'results.categoryBar': '주점',
    'results.noPlacesInCategory': '이 카테고리의 장소가 없습니다.',
    'results.placeCount': '먹을 곳',
    'results.cafeCount': '카페',
    'results.restaurantCountShort': '식당',
    'results.centerDistanceLabel': '수학적 중간점에서',
    'results.maxTravelLabel': '가장 먼 참석자까지',
    'results.openPlace': '장소 보기',
    'results.recommendationCount': '추천 지역',
    'results.showOnMap': '지도에서 보기',
    'results.mapTip': '지도에서 맛집처럼 바로 둘러보세요',
    'results.mapTipBody': '위 지도에 선택 지역의 음식점·카페가 핀으로 표시됩니다. 핀을 누르면 주소, 거리, 공유와 외부 지도 링크가 오버레이로 열립니다.',
    'admin.title': '생성자 관리키',
    'admin.body': '모임을 만든 브라우저가 아니라면 생성 때 보관한 관리키를 입력해 마감 권한을 불러올 수 있습니다.',
    'admin.key': '관리키',
    'admin.cancel': '취소',
    'admin.save': '저장',
    'admin.saved': '관리키를 저장했습니다. 마감 시 서버에서 유효성을 확인합니다.',
    'notfound.code': '404',
    'notfound.title': '페이지를 찾을 수 없습니다.',
    'notfound.body': '공유 링크가 만료되었거나 주소가 잘못되었을 수 있습니다.',
    'notfound.home': '홈으로 이동',
    'notfound.back': '이전 페이지',
    'footer.privacy': '출발 위치는 공유 링크를 가진 사람에게 보일 수 있습니다. 집 주소 대신 가까운 역·건물·랜드마크 입력을 권장합니다.',
    'footer.osm': '지도 공급자: Kakao Maps / OpenStreetMap / Google Maps',
    'map.loading': '지도를 준비하는 중…',
    'map.failed': '지도를 불러오지 못했습니다.',
    'map.network': '네트워크 연결과 지도 API 설정을 확인해주세요.',
    'map.center': '균형 중간지점',
    'map.centerShort': '중간지점',
    'map.recommendation': '추천 지역 {n}',
    'map.recommendationZone': '중간점 우선 추천권 · 반경 {distance}km',
    'map.restaurantCount': '반경 셀 내 식당 {count}곳',
    'map.copyAddress': '주소 복사',
    'map.sharePlace': '공유',
    'map.openPlace': '상세 보기',
    'map.copied': '복사됨',
    'map.provider': '데이터',
    'map.demoData': '예시 데이터',
    'count.closed': '입력 마감',
    'count.days': '{days}일 {hours}시간 남음',
    'count.hours': '{hours}시간 {minutes}분 남음',
    'count.minutes': '{minutes}분 남음'
  },
  en: {
    brand: '어?중간', 'brand.en': 'EO?JUNGAN',
    'nav.demo': 'Demo', 'nav.about': 'About', 'nav.language': 'Language', 'nav.style': 'Color style', 'nav.theme': 'Theme',
    'theme.system': 'System', 'theme.light': 'Light', 'theme.dark': 'Dark',
    'style.aurora': 'Aurora', 'style.ocean': 'Ocean', 'style.forest': 'Forest', 'style.sunset': 'Sunset',
    'home.eyebrow': 'Choose a meeting place by balance, not guesswork', 'home.title1': 'Between everyone’s starting points,', 'home.title2': 'find a fair place', 'home.title3': 'to meet.',
    'home.description': 'Create a meeting link and let everyone enter where they start. At the deadline, EO?JUNGAN compares distance balance and restaurant density to suggest meeting areas.',
    'home.create': 'Create meeting link', 'home.demo': 'View finished demo', 'home.trust1': 'No account required', 'home.trust2': 'Join by shared link', 'home.trust3': 'Mobile friendly',
    'home.map.done': '4 people added', 'home.map.note': 'Balanced center + restaurant density', 'home.map.center': 'Meet here',
    'create.eyebrow': '01 · CREATE MEETING', 'create.title': 'Add the first starting point to generate a shareable link.', 'create.description': 'Enter a location you are comfortable sharing with attendees. A station or landmark is safer than an exact home address.',
    'create.meetingName': 'Meeting name', 'create.meetingPlaceholder': 'e.g. Friday dinner', 'create.myName': 'Your name', 'create.namePlaceholder': 'e.g. Alex', 'create.deadline': 'Entry deadline', 'create.address': 'Starting location', 'create.addressPlaceholder': 'Search station, street, or landmark', 'create.addressHelp': 'Select a search result to store its coordinates.', 'create.consent': 'I understand that people with the shared link may see the location I enter.', 'create.submit': 'Create meeting link', 'create.submitting': 'Creating link…', 'create.success': 'Meeting link created.', 'create.error': 'Could not create the meeting.',
    'local.title': 'Local demo mode is active.', 'local.description': 'All features work in this browser. To share one live meeting across devices, complete the shared-storage setup in README.',
    'steps.eyebrow': 'Simple flow', 'steps.title': 'From one link to one meeting place', 'steps.1.title': 'Create the link', 'steps.1.body': 'Set the meeting name, host, starting point, and deadline.', 'steps.2.title': 'Collect starting points', 'steps.2.body': 'Share the link in your group chat and let attendees add their name and location.', 'steps.3.title': 'Compare midpoint areas', 'steps.3.body': 'After closing, compare the balanced midpoint and restaurant-heavy candidate areas on the map.',
    'about.eyebrow': 'ABOUT 어?중간', 'about.title': 'A shareable midpoint finder that is easy to explain to everyone', 'about.intro': 'EO?JUNGAN (어?중간) answers “Where should we meet?” by collecting everyone’s starting points, using the mathematical midpoint as a reference, and then comparing real commercial clusters to suggest practical meeting areas.',
    'about.fair.title': 'Balanced center', 'about.fair.body': 'It uses a geometric median instead of a simple average, reducing the pull from one unusually distant starting point.', 'about.share.title': 'Link-based participation', 'about.share.body': 'No account is required. Each meeting has its own share link for entering names and starting locations.', 'about.map.title': 'Replaceable map provider', 'about.map.body': 'Kakao Maps, OpenStreetMap, and Google Maps are supported from one administrator configuration point.', 'about.privacy.title': 'Minimal personal data', 'about.privacy.body': 'The UI recommends stations and landmarks instead of home addresses. Admin and edit tokens stay in the browser in plaintext.', 'about.stack.title': 'Deployment model', 'about.stack.body': 'GitHub Pages + static ES modules + optional Supabase RPC. There are no build dependencies.', 'about.languages.title': 'Languages and styles', 'about.languages.body': 'Korean, English, Japanese, and Chinese are included, with Aurora, Ocean, Forest, and Sunset palettes plus Light/Dark/System themes.',
    'meeting.loading': 'Loading meeting…', 'meeting.notFound': 'Meeting not found.', 'meeting.share': 'Share', 'meeting.copySuccess': 'Share link copied.', 'meeting.shareText': 'Please add your starting location.', 'meeting.shareError': 'Sharing failed. Copy the URL from the address bar.', 'meeting.participants': 'Attendees', 'meeting.peopleEntered': '{count} people added a starting location.', 'meeting.closedSummary': 'See practical meeting areas and nearby food & drink options below.', 'meeting.openSummary': 'Entries close at {deadline}.', 'meeting.map': 'Map', 'meeting.startPoints': 'Starting locations', 'meeting.legendStart': 'Start', 'meeting.legendCenter': 'Midpoint', 'meeting.legendFood': 'Restaurant', 'meeting.host': 'Host', 'meeting.deadline': 'Entry deadline', 'meeting.open': 'Collecting entries', 'meeting.closed': 'Closed', 'meeting.closeNow': 'Close entries now', 'meeting.closing': 'Closing…', 'meeting.closeConfirm': 'Close entries now and calculate results? New attendees will no longer be able to add locations.', 'meeting.closeSuccess': 'Meeting entries closed.', 'meeting.closeError': 'Could not close the meeting.', 'meeting.adminAccess': 'Enter admin key', 'meeting.closedMessage': 'Entries are closed.', 'meeting.closedHint': 'See the map and suggested areas below.',
    'join.title': 'Add my location', 'join.edit': 'Edit', 'join.hint': 'Use a nearby station or landmark instead of your exact home address.', 'join.name': 'Name', 'join.namePlaceholder': 'Name or nickname', 'join.address': 'Starting location', 'join.addressPlaceholder': 'Search station, street, or landmark', 'join.submit': 'Save location', 'join.saving': 'Saving…', 'join.success': 'Starting location saved.', 'join.error': 'Could not save the location.',
    'address.searching': 'Searching locations…', 'address.empty': 'No results. Try a station or street name.', 'address.error': 'Address search failed.', 'address.invalid': 'Enter a searchable starting location.', 'address.notFound': 'No location found.',
    'results.eyebrow': '02 · RESULTS', 'results.title': 'We calculated meeting-friendly areas.', 'results.description': 'We use the mathematical midpoint as a reference, then search nearby commercial clusters to suggest three practical meeting areas.', 'results.loading': 'Searching commercial areas, restaurants, and cafes around the midpoint…', 'results.noParticipants': 'No attendee locations are available to calculate.', 'results.candidate': 'Pick {n}', 'results.nearby': 'Near {name}', 'results.midpointNearby': 'Near the midpoint', 'results.restaurantCell': '{count} restaurants in this cluster', 'results.fromCenter': '{distance} km from midpoint', 'results.avgDistance': 'Average straight-line distance', 'results.maxDistance': 'Maximum straight-line distance', 'results.restaurantCount': 'Nearby restaurants', 'results.algorithm': 'Geometric median basis', 'results.openMap': 'Open larger map ↗', 'results.restaurant': 'Restaurant', 'results.restaurantHeading': 'Nearby restaurants', 'results.dataSource': 'Map provider data', 'results.note': 'This version balances straight-line distance rather than road or transit time. Restaurant candidates combine midpoint proximity, attendee balance, and restaurant density.', 'results.fallbackTitle': 'There is not enough restaurant data to create candidate clusters.', 'results.fallbackBody': 'The midpoint is still available. Use the map to compare places around the center.', 'results.placeError': 'Could not load restaurant data.',
    'results.placeCluster': '{count} food & drink places', 'results.recommendationIntro': 'The mathematical midpoint can land on a mountain or roadside. EO?JUNGAN instead compares nearby commercial clusters with distance balance and suggests three practical areas.', 'results.selectArea': 'View this area', 'results.unselectArea': 'Clear selection', 'results.expandedCandidate': 'Expanded', 'results.recommendationRadius': 'Recommendations first stay within {distance}km of the midpoint.', 'results.selectedArea': 'Selected meeting area', 'results.selectedHint': 'The map is zoomed into this area. Filter nearby places by category below.', 'results.placesHeading': 'Places to eat and drink here', 'results.all': 'All', 'results.categoryRestaurant': 'Restaurants', 'results.categoryCafe': 'Cafes', 'results.categoryQuick': 'Quick bites', 'results.categoryBar': 'Bars', 'results.noPlacesInCategory': 'No places in this category.', 'results.placeCount': 'Food & drink', 'results.cafeCount': 'Cafes', 'results.restaurantCountShort': 'Restaurants', 'results.centerDistanceLabel': 'From mathematical midpoint', 'results.maxTravelLabel': 'Farthest attendee', 'results.openPlace': 'Open place', 'results.recommendationCount': 'Suggested areas', 'results.showOnMap': 'Show on map', 'results.mapTip': 'Explore places directly on the map', 'results.mapTipBody': 'Restaurants and cafes in the selected area appear as pins above. Tap a pin for address, distance, sharing, and an external map link.',
    'admin.title': 'Host admin key', 'admin.body': 'If this is not the browser that created the meeting, enter the admin key saved at creation time to restore closing permission.', 'admin.key': 'Admin key', 'admin.cancel': 'Cancel', 'admin.save': 'Save', 'admin.saved': 'Admin key saved. The server will validate it when closing.',
    'notfound.code': '404', 'notfound.title': 'Page not found.', 'notfound.body': 'The shared link may be invalid or expired.', 'notfound.home': 'Go home', 'notfound.back': 'Go back',
    'footer.privacy': 'Starting locations can be visible to anyone with the meeting link. Prefer a nearby station, building, or landmark over an exact home address.', 'footer.osm': 'Map providers: Kakao Maps / OpenStreetMap / Google Maps',
    'map.loading': 'Preparing map…', 'map.failed': 'Could not load the map.', 'map.network': 'Check your network connection and map API configuration.', 'map.center': 'Balanced midpoint', 'map.centerShort': 'Midpoint', 'map.recommendation': 'Suggested area {n}', 'map.recommendationZone': 'Preferred midpoint zone · {distance}km radius', 'map.restaurantCount': '{count} restaurants in this cluster', 'map.copyAddress': 'Copy address', 'map.sharePlace': 'Share', 'map.openPlace': 'Details', 'map.copied': 'Copied', 'map.provider': 'Data', 'map.demoData': 'Demo data',
    'count.closed': 'Entries closed', 'count.days': '{days}d {hours}h left', 'count.hours': '{hours}h {minutes}m left', 'count.minutes': '{minutes}m left'
  },
  ja: {
    brand: '어?중간', 'brand.en': 'EO?JUNGAN',
    'nav.demo': 'デモ', 'nav.about': 'サービス紹介', 'nav.language': '言語', 'nav.style': 'カラースタイル', 'nav.theme': 'テーマ',
    'theme.system': 'システム', 'theme.light': 'ライト', 'theme.dark': 'ダーク', 'style.aurora': 'Aurora', 'style.ocean': 'Ocean', 'style.forest': 'Forest', 'style.sunset': 'Sunset',
    'home.eyebrow': '勘ではなくバランスで集合場所を決める', 'home.title1': 'みんなの出発地点の間から、', 'home.title2': '会いやすい場所', 'home.title3': 'を探します。', 'home.description': '共有リンクを作り、参加者がそれぞれの出発地点を入力します。締切後、距離のバランスと周辺の飲食店密度から候補エリアを表示します。', 'home.create': '集合リンクを作る', 'home.demo': '完成例を見る', 'home.trust1': '会員登録不要', 'home.trust2': '共有リンクで参加', 'home.trust3': 'モバイル対応', 'home.map.done': '4人入力済み', 'home.map.note': 'バランス地点 + 飲食店密度', 'home.map.center': '集合候補',
    'create.eyebrow': '01 · 集合を作成', 'create.title': '最初の出発地点を入力すると共有リンクが作成されます。', 'create.description': '参加者に共有してもよい地点を入力してください。自宅の正確な住所より駅やランドマークをおすすめします。', 'create.meetingName': '集合名', 'create.meetingPlaceholder': '例：金曜の夕食会', 'create.myName': '自分の名前', 'create.namePlaceholder': '例：ミナ', 'create.deadline': '入力締切', 'create.address': '出発地点', 'create.addressPlaceholder': '駅名・道路名・建物名を検索', 'create.addressHelp': '検索結果を選ぶと座標も保存されます。', 'create.consent': '共有リンクを知る参加者に入力地点が表示される場合があることを確認しました。', 'create.submit': '集合リンクを作る', 'create.submitting': 'リンク作成中…', 'create.success': '集合リンクを作成しました。', 'create.error': '集合を作成できませんでした。',
    'local.title': '現在はローカルデモモードです。', 'local.description': 'このブラウザでは全機能を試せます。複数端末で同じ集合リンクを使うにはREADMEの共有ストレージ設定を完了してください。',
    'steps.eyebrow': 'かんたんな流れ', 'steps.title': 'リンク一つで集合場所決定まで', 'steps.1.title': 'リンク作成', 'steps.1.body': '集合名、主催者、出発地点、締切を決めます。', 'steps.2.title': '出発地点を収集', 'steps.2.body': 'グループチャットにリンクを共有し、参加者が名前と出発地点を追加します。', 'steps.3.title': '中間地点と飲食店を確認', 'steps.3.body': '締切後、バランスのよい中間地点と飲食店が多い候補エリアを地図で比較します。',
    'about.eyebrow': 'ABOUT 어?중간', 'about.title': 'みんなに説明しやすい共有型の中間地点検索', 'about.intro': '어?중간（EO?JUNGAN）は「どこで会う？」という問いに、参加者の出発地点を集め、数学的中間点を参考に実際の商業エリアを比較して集合候補を提案するサービスです。', 'about.fair.title': '公平な中心計算', 'about.fair.body': '単純平均ではなく幾何学的中央値を使い、一人だけ遠い地点による偏りを抑えます。', 'about.share.title': 'リンク中心の参加', 'about.share.body': '会員登録なしで、集合ごとの共有リンクから名前と出発地点を保存できます。', 'about.map.title': '交換可能な地図プロバイダー', 'about.map.body': 'Kakao Maps、OpenStreetMap、Google Mapsを管理者設定から切り替えられます。', 'about.privacy.title': '個人情報を最小化', 'about.privacy.body': '自宅住所より駅やランドマークを推奨し、管理キーと編集トークンの原文はブラウザにのみ保存します。', 'about.stack.title': '配布構成', 'about.stack.body': 'GitHub Pages + 静的ES Modules + 任意のSupabase RPCです。ビルド依存はありません。', 'about.languages.title': '多言語・多スタイル', 'about.languages.body': '韓国語、英語、日本語、中国語と4種類のカラースタイル、Light/Dark/Systemテーマを提供します。',
    'meeting.loading': '集合情報を読み込み中…',
    'meeting.peopleEntered': '{count}人が出発地点を入力しました。',
    'meeting.closedSummary': '下で実際に集まりやすいおすすめエリアと飲食スポットを確認してください。',
    'meeting.openSummary': '入力締切は {deadline} です。',
    'meeting.map': '地図',
    'meeting.startPoints': '出発地点',
    'meeting.legendStart': '出発点',
    'meeting.legendCenter': '中間点',
    'meeting.legendFood': '飲食店', 'meeting.notFound': '集合が見つかりません。', 'meeting.share': '共有', 'meeting.copySuccess': '共有リンクをコピーしました。', 'meeting.shareText': '出発地点を入力してください。', 'meeting.shareError': '共有に失敗しました。アドレスバーのURLをコピーしてください。', 'meeting.participants': '参加者', 'meeting.peopleEntered': '{count}人が出発地点を入力しました。', 'meeting.closedSummary': '下で実際に集まりやすいおすすめエリアと飲食スポットを確認してください。', 'meeting.openSummary': '入力締切は {deadline} です。', 'meeting.map': '地図', 'meeting.startPoints': '出発地点', 'meeting.legendStart': '出発点', 'meeting.legendCenter': '中間点', 'meeting.legendFood': '飲食店', 'meeting.host': '主催者', 'meeting.deadline': '入力締切', 'meeting.open': '入力受付中', 'meeting.closed': '受付終了', 'meeting.closeNow': '今すぐ締め切る', 'meeting.closing': '締切処理中…', 'meeting.closeConfirm': '今すぐ入力を締め切って結果を計算しますか？以後、新しい参加者は地点を追加できません。', 'meeting.closeSuccess': '入力を締め切りました。', 'meeting.closeError': '締切処理に失敗しました。', 'meeting.adminAccess': '管理キーを入力', 'meeting.closedMessage': '入力は締め切られました。', 'meeting.closedHint': '地図と下のおすすめエリアで結果を確認できます。',
    'join.title': '自分の地点を追加', 'join.edit': '修正', 'join.hint': '正確な自宅住所ではなく近くの駅やランドマークをおすすめします。', 'join.name': '名前', 'join.namePlaceholder': '名前またはニックネーム', 'join.address': '出発地点', 'join.addressPlaceholder': '駅名・道路名・建物名を検索', 'join.submit': '地点を保存', 'join.saving': '保存中…', 'join.success': '出発地点を保存しました。', 'join.error': '地点を保存できませんでした。',
    'address.searching': '住所を検索中…', 'address.empty': '検索結果がありません。駅名や道路名でもう一度検索してください。', 'address.error': '住所検索に失敗しました。', 'address.invalid': '検索できる出発地点を入力してください。', 'address.notFound': '住所が見つかりません。',
    'results.eyebrow': '02 · 結果', 'results.title': '会いやすいエリアを計算しました。', 'results.description': '数学的中間点を基準に周辺の商業エリアを探し、実際に集まりやすい3エリアと飲食スポットを表示します。', 'results.loading': '中間点周辺の商業エリア・飲食店・カフェを探索中…', 'results.noParticipants': '計算できる参加者地点がありません。', 'results.candidate': 'おすすめ {n}', 'results.nearby': '{name} 周辺', 'results.midpointNearby': '中間地点周辺', 'results.restaurantCell': 'この区画に飲食店 {count} 件', 'results.fromCenter': '中間地点から {distance}km', 'results.avgDistance': '平均直線距離', 'results.maxDistance': '最大直線距離', 'results.restaurantCount': '周辺飲食店', 'results.algorithm': '幾何学的中央値基準', 'results.openMap': '大きな地図で見る ↗', 'results.restaurant': '飲食店', 'results.restaurantHeading': '周辺の飲食店', 'results.dataSource': '地図データ基準', 'results.note': '現在のバージョンは道路・公共交通の時間ではなく直線距離のバランスを基準にします。候補は中間地点との距離、参加者間のバランス、飲食店密度を合わせて評価します。', 'results.fallbackTitle': '候補エリアを作るための飲食店データが不足しています。', 'results.fallbackBody': '中間地点は計算済みです。地図で中心周辺を比較してください。', 'results.placeError': '飲食店データを読み込めませんでした。',
    'results.placeCluster': '飲食スポット {count}件', 'results.recommendationIntro': '数学的な中間点が山や郊外になる場合でも、そこを集合場所にはしません。周辺の商業密度と距離バランスを比較し、実用的な3エリアを提案します。', 'results.selectArea': 'このエリアを見る', 'results.unselectArea': '選択解除', 'results.expandedCandidate': '拡張候補', 'results.recommendationRadius': 'まず中間点から半径 {distance}km 以内の商業エリアを優先します。', 'results.selectedArea': '選択した集合エリア', 'results.selectedHint': '地図をこのエリアに拡大しました。下でカテゴリ別に店を選べます。', 'results.placesHeading': 'このエリアの飲食スポット', 'results.all': 'すべて', 'results.categoryRestaurant': '飲食店', 'results.categoryCafe': 'カフェ', 'results.categoryQuick': '軽食', 'results.categoryBar': 'バー', 'results.noPlacesInCategory': 'このカテゴリの場所はありません。', 'results.placeCount': '飲食スポット', 'results.cafeCount': 'カフェ', 'results.restaurantCountShort': '飲食店', 'results.centerDistanceLabel': '数学的中間点から', 'results.maxTravelLabel': '最も遠い参加者まで', 'results.openPlace': '場所を見る', 'results.recommendationCount': 'おすすめエリア', 'results.showOnMap': '地図で見る', 'results.mapTip': '地図上でお店を直接探せます', 'results.mapTipBody': '選択エリアの飲食店・カフェがピンで表示されます。ピンを押すと住所・距離・共有・外部地図リンクを確認できます。',
    'admin.title': '主催者管理キー', 'admin.body': '作成したブラウザではない場合、作成時に保存した管理キーを入力すると締切権限を復元できます。', 'admin.key': '管理キー', 'admin.cancel': 'キャンセル', 'admin.save': '保存', 'admin.saved': '管理キーを保存しました。締切時にサーバーで確認します。',
    'notfound.code': '404', 'notfound.title': 'ページが見つかりません。', 'notfound.body': '共有リンクが無効または期限切れの可能性があります。', 'notfound.home': 'ホームへ', 'notfound.back': '前へ戻る', 'footer.privacy': '出発地点は共有リンクを知る人に表示される場合があります。正確な自宅住所より駅・建物・ランドマークを推奨します。', 'footer.osm': '地図プロバイダー: Kakao Maps / OpenStreetMap / Google Maps',
    'map.loading': '地図を準備中…', 'map.failed': '地図を読み込めませんでした。', 'map.network': 'ネットワーク接続と地図API設定を確認してください。', 'map.center': 'バランス中間地点', 'map.centerShort': '中間地点', 'map.recommendation': 'おすすめエリア {n}', 'map.recommendationZone': '中間点優先エリア・半径 {distance}km', 'map.restaurantCount': 'この区画に飲食店 {count} 件', 'map.copyAddress': '住所をコピー', 'map.sharePlace': '共有', 'map.openPlace': '詳細', 'map.copied': 'コピー済み', 'map.provider': 'データ', 'map.demoData': 'デモデータ',
    'count.closed': '受付終了', 'count.days': '残り {days}日 {hours}時間', 'count.hours': '残り {hours}時間 {minutes}分', 'count.minutes': '残り {minutes}分'
  },
  zh: {
    brand: '어?중간', 'brand.en': 'EO?JUNGAN',
    'nav.demo': '查看示例', 'nav.about': '关于服务', 'nav.language': '语言', 'nav.style': '配色', 'nav.theme': '主题',
    'theme.system': '跟随系统', 'theme.light': '浅色', 'theme.dark': '深色', 'style.aurora': 'Aurora', 'style.ocean': 'Ocean', 'style.forest': 'Forest', 'style.sunset': 'Sunset',
    'home.eyebrow': '不用猜，用平衡决定见面地点', 'home.title1': '在每个人的出发点之间，', 'home.title2': '找到更合适的见面地点', 'home.title3': '。', 'home.description': '创建聚会链接，让每个人填写出发地点。截止后会综合距离平衡和餐厅密度，给出候选区域。', 'home.create': '创建聚会链接', 'home.demo': '查看完整示例', 'home.trust1': '无需注册', 'home.trust2': '通过共享链接参与', 'home.trust3': '适配手机', 'home.map.done': '已填写 4 人', 'home.map.note': '平衡中心 + 餐厅密度', 'home.map.center': '见面候选',
    'create.eyebrow': '01 · 创建聚会', 'create.title': '填写第一个出发地点后即可生成共享链接。', 'create.description': '请输入可以向参与者公开的位置。建议填写附近车站或地标，而不是精确家庭住址。', 'create.meetingName': '聚会名称', 'create.meetingPlaceholder': '例如：周五晚餐', 'create.myName': '你的名字', 'create.namePlaceholder': '例如：小林', 'create.deadline': '填写截止时间', 'create.address': '出发地点', 'create.addressPlaceholder': '搜索车站、道路或建筑', 'create.addressHelp': '选择搜索结果后会同时保存坐标。', 'create.consent': '我确认，知道共享链接的参与者可能看到我填写的位置。', 'create.submit': '创建聚会链接', 'create.submitting': '正在创建链接…', 'create.success': '聚会链接已创建。', 'create.error': '无法创建聚会。',
    'local.title': '当前为本地演示模式。', 'local.description': '此浏览器可测试全部功能。若要让多台设备使用同一个实时链接，请完成README中的共享存储设置。',
    'steps.eyebrow': '简单流程', 'steps.title': '一个链接完成地点决定', 'steps.1.title': '创建聚会链接', 'steps.1.body': '设置聚会名称、创建者、出发地点和截止时间。', 'steps.2.title': '收集参与者地点', 'steps.2.body': '把链接发到群聊，每个人填写姓名和出发地点。', 'steps.3.title': '查看中间点与餐厅', 'steps.3.body': '截止后在地图上比较平衡中间点和餐厅密集候选区域。',
    'about.eyebrow': 'ABOUT 어?중간', 'about.title': '容易向所有人说明的共享式中间点工具', 'about.intro': '어?중간（EO?JUNGAN）用一个共享链接收集参与者的出发地点，以数学中间点为参考，再比较真实商业区域，回答“在哪里见面？”这个问题。', 'about.fair.title': '公平的中心计算', 'about.fair.body': '使用几何中位数而不是简单平均，降低单个远距离出发点对结果的过度拉动。', 'about.share.title': '以链接为中心参与', 'about.share.body': '无需注册，每个聚会都有独立共享链接，可填写姓名和出发位置。', 'about.map.title': '可替换地图供应商', 'about.map.body': '支持 Kakao Maps、OpenStreetMap 和 Google Maps，可在管理员配置中切换。', 'about.privacy.title': '最少个人信息', 'about.privacy.body': '界面建议使用车站或地标而不是家庭住址，管理员密钥和编辑令牌原文仅保存在浏览器中。', 'about.stack.title': '部署结构', 'about.stack.body': 'GitHub Pages + 静态ES Modules + 可选Supabase RPC，无构建依赖。', 'about.languages.title': '多语言与多样式', 'about.languages.body': '提供韩语、英语、日语、中文，以及Aurora、Ocean、Forest、Sunset四种配色和Light/Dark/System主题。',
    'meeting.loading': '正在加载聚会信息…',
    'meeting.peopleEntered': '已有 {count} 人填写出发地点。',
    'meeting.closedSummary': '请在下方查看更适合实际见面的推荐区域和餐饮地点。',
    'meeting.openSummary': '填写截止时间为 {deadline}。',
    'meeting.map': '地图',
    'meeting.startPoints': '出发地点',
    'meeting.legendStart': '出发点',
    'meeting.legendCenter': '中间点',
    'meeting.legendFood': '餐厅', 'meeting.notFound': '找不到聚会。', 'meeting.share': '分享', 'meeting.copySuccess': '共享链接已复制。', 'meeting.shareText': '请填写你的出发地点。', 'meeting.shareError': '分享失败，请复制地址栏中的链接。', 'meeting.participants': '参与者', 'meeting.peopleEntered': '已有 {count} 人填写出发地点。', 'meeting.closedSummary': '请在下方查看更适合实际见面的推荐区域和餐饮地点。', 'meeting.openSummary': '填写截止时间为 {deadline}。', 'meeting.map': '地图', 'meeting.startPoints': '出发地点', 'meeting.legendStart': '出发点', 'meeting.legendCenter': '中间点', 'meeting.legendFood': '餐厅', 'meeting.host': '创建者', 'meeting.deadline': '填写截止', 'meeting.open': '正在收集', 'meeting.closed': '已截止', 'meeting.closeNow': '立即截止', 'meeting.closing': '正在截止…', 'meeting.closeConfirm': '现在停止填写并计算结果吗？之后新的参与者将无法添加位置。', 'meeting.closeSuccess': '已停止收集位置。', 'meeting.closeError': '截止处理失败。', 'meeting.adminAccess': '输入管理员密钥', 'meeting.closedMessage': '填写已经截止。', 'meeting.closedHint': '可在地图和下方推荐区域查看结果。',
    'join.title': '添加我的位置', 'join.edit': '修改', 'join.hint': '建议使用附近车站或地标，不要填写精确家庭地址。', 'join.name': '姓名', 'join.namePlaceholder': '姓名或昵称', 'join.address': '出发地点', 'join.addressPlaceholder': '搜索车站、道路或建筑', 'join.submit': '保存位置', 'join.saving': '正在保存…', 'join.success': '出发地点已保存。', 'join.error': '无法保存位置。',
    'address.searching': '正在搜索地址…', 'address.empty': '没有搜索结果，请尝试车站或道路名称。', 'address.error': '地址搜索失败。', 'address.invalid': '请输入可搜索的出发地点。', 'address.notFound': '未找到地址。',
    'results.eyebrow': '02 · 结果', 'results.title': '已计算适合见面的区域。', 'results.description': '以数学中间点为参考，搜索周边商业区域，并推荐三个更适合实际见面的区域和餐饮地点。', 'results.loading': '正在搜索中间点周边的商业区域、餐厅和咖啡馆…', 'results.noParticipants': '没有可用于计算的参与者位置。', 'results.candidate': '推荐 {n}', 'results.nearby': '{name} 附近', 'results.midpointNearby': '中间点附近', 'results.restaurantCell': '该区域餐厅 {count} 家', 'results.fromCenter': '距中间点 {distance}km', 'results.avgDistance': '平均直线距离', 'results.maxDistance': '最大直线距离', 'results.restaurantCount': '周边餐厅', 'results.algorithm': '基于几何中位数', 'results.openMap': '打开大地图 ↗', 'results.restaurant': '餐厅', 'results.restaurantHeading': '周边餐厅', 'results.dataSource': '地图数据', 'results.note': '当前版本依据直线距离平衡，而不是道路或公共交通时间。候选区域综合中间点距离、参与者平衡和餐厅密度。', 'results.fallbackTitle': '餐厅数据不足，无法生成候选区域。', 'results.fallbackBody': '中间点已计算完成，请在地图上直接比较中心附近地点。', 'results.placeError': '无法加载餐厅数据。',
    'results.placeCluster': '餐饮地点 {count} 个', 'results.recommendationIntro': '数学中间点可能落在山里或偏僻道路上。어?중간 会结合附近商业密度和距离平衡，推荐三个更适合实际见面的区域。', 'results.selectArea': '查看此区域', 'results.unselectArea': '取消选择', 'results.expandedCandidate': '扩展候选', 'results.recommendationRadius': '优先在距中间点 {distance}km 半径内选择商业区域。', 'results.selectedArea': '已选见面区域', 'results.selectedHint': '地图已放大到此区域，可在下方按类别筛选餐饮地点。', 'results.placesHeading': '此区域的餐饮地点', 'results.all': '全部', 'results.categoryRestaurant': '餐厅', 'results.categoryCafe': '咖啡馆', 'results.categoryQuick': '快餐', 'results.categoryBar': '酒吧', 'results.noPlacesInCategory': '此类别暂无地点。', 'results.placeCount': '餐饮地点', 'results.cafeCount': '咖啡馆', 'results.restaurantCountShort': '餐厅', 'results.centerDistanceLabel': '距数学中间点', 'results.maxTravelLabel': '最远参与者距离', 'results.openPlace': '查看地点', 'results.recommendationCount': '推荐区域', 'results.showOnMap': '在地图查看', 'results.mapTip': '直接在地图上浏览餐饮地点', 'results.mapTipBody': '所选区域的餐厅和咖啡馆会显示为地图图钉。点击图钉可查看地址、距离、分享和外部地图链接。',
    'admin.title': '创建者管理员密钥', 'admin.body': '如果不是创建聚会时使用的浏览器，请输入创建时保存的管理员密钥，以恢复截止权限。', 'admin.key': '管理员密钥', 'admin.cancel': '取消', 'admin.save': '保存', 'admin.saved': '管理员密钥已保存，截止时服务器会验证。',
    'notfound.code': '404', 'notfound.title': '找不到此页面。', 'notfound.body': '共享链接可能无效或已过期。', 'notfound.home': '返回首页', 'notfound.back': '返回上一页', 'footer.privacy': '出发地点可能对拥有共享链接的人可见。建议填写附近车站、建筑或地标，而不是精确家庭地址。', 'footer.osm': '地图供应商：Kakao Maps / OpenStreetMap / Google Maps',
    'map.loading': '正在准备地图…', 'map.failed': '无法加载地图。', 'map.network': '请检查网络连接和地图API设置。', 'map.center': '平衡中间点', 'map.centerShort': '中间点', 'map.recommendation': '推荐区域 {n}', 'map.recommendationZone': '中间点优先推荐圈 · 半径 {distance}km', 'map.restaurantCount': '该区域餐厅 {count} 家', 'map.copyAddress': '复制地址', 'map.sharePlace': '分享', 'map.openPlace': '详情', 'map.copied': '已复制', 'map.provider': '数据', 'map.demoData': '示例数据',
    'count.closed': '已截止', 'count.days': '剩余 {days}天 {hours}小时', 'count.hours': '剩余 {hours}小时 {minutes}分钟', 'count.minutes': '剩余 {minutes}分钟'
  }
};

function detectLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (messages[stored]) return stored;
  const language = (navigator.language || 'ko').toLowerCase();
  if (language.startsWith('ja')) return 'ja';
  if (language.startsWith('zh')) return 'zh';
  if (language.startsWith('en')) return 'en';
  return 'ko';
}

let currentLanguage = detectLanguage();

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  currentLanguage = messages[language] ? language : 'ko';
  localStorage.setItem(STORAGE_KEY, currentLanguage);
  document.documentElement.lang = currentLanguage;
}

export function getLocaleTag(language = currentLanguage) {
  return SUPPORTED_LANGUAGES.find((item) => item.code === language)?.tag || 'ko-KR';
}

export function t(key, variables = {}) {
  const template = messages[currentLanguage]?.[key] ?? messages.en[key] ?? messages.ko[key] ?? key;
  return Object.entries(variables).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

export function formatDateTimeLocalized(iso) {
  return new Intl.DateTimeFormat(getLocaleTag(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function formatCountdownLocalized(deadlineIso) {
  const diff = new Date(deadlineIso).getTime() - Date.now();
  if (diff <= 0) return t('count.closed');
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return t('count.days', { days, hours });
  if (hours > 0) return t('count.hours', { hours, minutes: mins });
  return t('count.minutes', { minutes: Math.max(1, mins) });
}

setLanguage(currentLanguage);
