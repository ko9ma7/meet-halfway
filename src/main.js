import { APP_CONFIG, isGoogleMapsConfigured, isKakaoMapsConfigured, isSupabaseConfigured } from './config.js';
import { DEMO_PLACES, DEMO_SNAPSHOT } from './lib/demo.js';
import { geometricMedian, buildHotspots, haversineKm } from './lib/geo.js';
import { describeArea, searchAddress } from './lib/geocoding.js';
import { MeetingMap } from './lib/map.js';
import { discoverMeetingPlaces, placesNear } from './lib/places.js';
import { repository } from './lib/repository.js';
import { copyText, escapeHtml, isMeetingClosed, randomToken, showToast, toLocalDateTimeInput } from './lib/utils.js';
import { SUPPORTED_LANGUAGES, formatCountdownLocalized, formatDateTimeLocalized, getLanguage, setLanguage, t } from './i18n.js';

const app = document.querySelector('#app');
if (!app) throw new Error('App root not found.');

const STYLE_KEY = 'meet-halfway.style';
const THEME_KEY = 'meet-halfway.theme';
const STYLES = ['aurora', 'ocean', 'forest', 'sunset'];
let activeMap = null;
let activeInterval = null;
let routeVersion = 0;

function cleanupView() {
  activeMap?.destroy();
  activeMap = null;
  if (activeInterval !== null) {
    window.clearInterval(activeInterval);
    activeInterval = null;
  }
}

function getTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
}

function setTheme(preference) {
  localStorage.setItem(THEME_KEY, preference);
  if (preference === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = preference;
}

function getStyle() {
  const stored = localStorage.getItem(STYLE_KEY);
  return STYLES.includes(stored) ? stored : APP_CONFIG.defaultStyle;
}

function setStyle(style) {
  const value = STYLES.includes(style) ? style : 'aurora';
  localStorage.setItem(STYLE_KEY, value);
  document.documentElement.dataset.style = value;
}

function applyDocumentLanguage() {
  document.documentElement.lang = getLanguage();
  document.title = `${t('brand')} — ${t('home.title2')}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('home.description'));
}

function renderCurrentRoute() {
  applyDocumentLanguage();
  route();
}

function languageOptions() {
  return SUPPORTED_LANGUAGES.map((language) => `<option value="${language.code}" ${language.code === getLanguage() ? 'selected' : ''}>${escapeHtml(language.label)}</option>`).join('');
}

function styleOptions() {
  return STYLES.map((style) => `<option value="${style}" ${style === getStyle() ? 'selected' : ''}>${escapeHtml(t(`style.${style}`))}</option>`).join('');
}

function themeOptions() {
  return ['system', 'light', 'dark'].map((theme) => `<option value="${theme}" ${theme === getTheme() ? 'selected' : ''}>${escapeHtml(t(`theme.${theme}`))}</option>`).join('');
}

function headerHtml() {
  return `
    <header class="site-header">
      <a class="brand" href="#/" aria-label="${escapeHtml(t('brand'))}">
        <span class="brand-mark" aria-hidden="true"><img src="./favicon.svg" alt="" /></span>
        <span class="brand-copy"><strong>${escapeHtml(t('brand'))}</strong><small>${escapeHtml(t('brand.en'))}</small></span>
      </a>
      <nav class="header-actions" aria-label="Primary navigation">
        <a class="text-link" href="#/demo">${escapeHtml(t('nav.demo'))}</a>
        <a class="text-link" href="#/about">${escapeHtml(t('nav.about'))}</a>
        <label class="toolbar-select" title="${escapeHtml(t('nav.language'))}"><span>文</span><select id="language-select" aria-label="${escapeHtml(t('nav.language'))}">${languageOptions()}</select></label>
        <label class="toolbar-select" title="${escapeHtml(t('nav.style'))}"><span>◆</span><select id="style-select" aria-label="${escapeHtml(t('nav.style'))}">${styleOptions()}</select></label>
        <label class="toolbar-select toolbar-select--theme" title="${escapeHtml(t('nav.theme'))}"><span>◐</span><select id="theme-select" aria-label="${escapeHtml(t('nav.theme'))}">${themeOptions()}</select></label>
      </nav>
    </header>`;
}

function footerHtml() {
  const provider = isKakaoMapsConfigured ? 'Kakao Maps' : isGoogleMapsConfigured ? 'Google Maps' : 'OpenStreetMap';
  return `
    <footer class="site-footer">
      <div><strong>${escapeHtml(t('brand'))}</strong><span class="footer-product">${escapeHtml(t('brand.en'))}</span></div>
      <p>${escapeHtml(t('footer.privacy'))}</p>
      <p>${escapeHtml(t('footer.osm'))} · <strong>${provider}</strong></p>
      <nav><a href="#/about">${escapeHtml(t('nav.about'))}</a><a href="./README.md" target="_blank" rel="noreferrer">README</a></nav>
    </footer>`;
}

function bindGlobalUi() {
  document.querySelector('#language-select')?.addEventListener('change', (event) => {
    setLanguage(event.target.value);
    renderCurrentRoute();
  });
  document.querySelector('#style-select')?.addEventListener('change', (event) => {
    setStyle(event.target.value);
  });
  document.querySelector('#theme-select')?.addEventListener('change', (event) => {
    setTheme(event.target.value);
  });
}

function bindAddressPicker(input, results) {
  let selected = null;
  let selectedText = '';
  let timer = 0;
  let requestId = 0;

  const renderResults = (items) => {
    if (items.length === 0) {
      results.innerHTML = `<div class="address-empty">${escapeHtml(t('address.empty'))}</div>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = items.map((item, index) => `
      <button type="button" class="address-option" data-index="${index}">
        <strong>${escapeHtml(item.shortName)}</strong>
        <span>${escapeHtml(item.displayName)}</span>
      </button>`).join('');
    results.hidden = false;
    results.querySelectorAll('.address-option').forEach((button) => {
      button.addEventListener('click', () => {
        const item = items[Number(button.dataset.index)];
        if (!item) return;
        selected = item;
        selectedText = item.displayName;
        input.value = item.displayName;
        results.hidden = true;
        input.setCustomValidity('');
      });
    });
  };

  const runSearch = async () => {
    const query = input.value.trim();
    if (query.length < 2) {
      results.hidden = true;
      return;
    }
    const id = ++requestId;
    results.innerHTML = `<div class="address-empty">${escapeHtml(t('address.searching'))}</div>`;
    results.hidden = false;
    try {
      const items = await searchAddress(query);
      if (id !== requestId) return;
      renderResults(items);
    } catch (error) {
      if (id !== requestId) return;
      const message = error instanceof Error ? error.message : t('address.error');
      results.innerHTML = `<div class="address-empty address-empty--error">${escapeHtml(message)}</div>`;
      results.hidden = false;
    }
  };

  input.addEventListener('input', () => {
    if (input.value !== selectedText) selected = null;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void runSearch(), 420);
  });
  input.addEventListener('blur', () => window.setTimeout(() => (results.hidden = true), 180));
  input.addEventListener('focus', () => {
    if (results.innerHTML.trim() && input.value.trim().length >= 2) results.hidden = false;
  });

  return {
    ensureSelected: async () => {
      if (selected && input.value === selectedText) return selected;
      const items = await searchAddress(input.value);
      const first = items[0];
      if (!first) {
        input.setCustomValidity(t('address.invalid'));
        input.reportValidity();
        throw new Error(t('address.notFound'));
      }
      selected = first;
      selectedText = first.displayName;
      input.value = first.displayName;
      input.setCustomValidity('');
      return first;
    }
  };
}

function localModeNotice() {
  if (isSupabaseConfigured) return '';
  return `<div class="notice notice--warning" role="note"><strong>${escapeHtml(t('local.title'))}</strong><span>${escapeHtml(t('local.description'))}</span></div>`;
}

function heroMapHtml() {
  return `
    <div class="mini-map">
      <span class="mini-person p1">Hongdae</span>
      <span class="mini-person p2">Gangnam</span>
      <span class="mini-person p3">Konkuk</span>
      <span class="mini-person p4">Seoul Sta.</span>
      <span class="mini-center">${escapeHtml(t('home.map.center'))}</span>
      <svg viewBox="0 0 460 330" aria-hidden="true">
        <path d="M70 75 C170 120 210 155 245 170" />
        <path d="M382 258 C315 235 275 205 245 170" />
        <path d="M390 90 C320 115 285 145 245 170" />
        <path d="M85 255 C145 225 195 200 245 170" />
      </svg>
      <div class="mini-card"><strong>${escapeHtml(t('home.map.done'))}</strong><span>${escapeHtml(t('home.map.note'))}</span></div>
    </div>`;
}

function renderHome() {
  cleanupView();
  routeVersion += 1;
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  deadline.setHours(20, 0, 0, 0);
  app.innerHTML = `
    ${headerHtml()}
    <main id="main">
      <section class="hero shell">
        <div class="hero-copy">
          <span class="eyebrow">${escapeHtml(t('home.eyebrow'))}</span>
          <h1>${escapeHtml(t('home.title1'))}<br><span>${escapeHtml(t('home.title2'))}</span>${escapeHtml(t('home.title3'))}</h1>
          <p>${escapeHtml(t('home.description'))}</p>
          <div class="hero-actions"><a class="button button--primary" href="#create">${escapeHtml(t('home.create'))}</a><a class="button button--ghost" href="#/demo">${escapeHtml(t('home.demo'))}</a></div>
          <div class="trust-row"><span>${escapeHtml(t('home.trust1'))}</span><span>${escapeHtml(t('home.trust2'))}</span><span>${escapeHtml(t('home.trust3'))}</span></div>
        </div>
        <div class="hero-visual" aria-label="${escapeHtml(t('brand'))} preview">${heroMapHtml()}</div>
      </section>

      <section class="style-showcase shell" aria-label="Theme styles">
        ${STYLES.map((style) => `<button type="button" class="style-chip style-chip--${style} ${style === getStyle() ? 'is-active' : ''}" data-style-choice="${style}"><i></i><span>${escapeHtml(t(`style.${style}`))}</span></button>`).join('')}
      </section>

      <section class="create-section shell" id="create">
        ${localModeNotice()}
        <div class="section-heading"><span class="eyebrow">${escapeHtml(t('create.eyebrow'))}</span><h2>${escapeHtml(t('create.title'))}</h2><p>${escapeHtml(t('create.description'))}</p></div>
        <form class="create-card" id="create-form">
          <div class="field field--wide"><label for="meeting-title">${escapeHtml(t('create.meetingName'))}</label><input id="meeting-title" maxlength="60" required placeholder="${escapeHtml(t('create.meetingPlaceholder'))}" autocomplete="off" /></div>
          <div class="field"><label for="creator-name">${escapeHtml(t('create.myName'))}</label><input id="creator-name" maxlength="30" required placeholder="${escapeHtml(t('create.namePlaceholder'))}" autocomplete="name" /></div>
          <div class="field"><label for="meeting-deadline">${escapeHtml(t('create.deadline'))}</label><input id="meeting-deadline" type="datetime-local" required value="${toLocalDateTimeInput(deadline)}" min="${toLocalDateTimeInput(new Date(Date.now() + 30 * 60 * 1000))}" /></div>
          <div class="field field--wide address-field"><label for="creator-address">${escapeHtml(t('create.address'))}</label><input id="creator-address" required placeholder="${escapeHtml(t('create.addressPlaceholder'))}" autocomplete="off" aria-describedby="creator-address-help" /><small id="creator-address-help">${escapeHtml(t('create.addressHelp'))}</small><div class="address-results" id="creator-address-results" hidden></div></div>
          <div class="form-footer field--wide"><label class="consent"><input type="checkbox" required /><span>${escapeHtml(t('create.consent'))}</span></label><button class="button button--primary button--large" type="submit" id="create-submit">${escapeHtml(t('create.submit'))} <span aria-hidden="true">→</span></button></div>
        </form>
      </section>

      <section class="steps-section shell" aria-labelledby="steps-title">
        <div class="section-heading section-heading--center"><span class="eyebrow">${escapeHtml(t('steps.eyebrow'))}</span><h2 id="steps-title">${escapeHtml(t('steps.title'))}</h2></div>
        <div class="steps-grid">
          ${[1,2,3].map((number) => `<article class="step-card"><span>${number}</span><h3>${escapeHtml(t(`steps.${number}.title`))}</h3><p>${escapeHtml(t(`steps.${number}.body`))}</p></article>`).join('')}
        </div>
      </section>
    </main>
    ${footerHtml()}`;
  bindGlobalUi();
  document.querySelectorAll('[data-style-choice]').forEach((button) => button.addEventListener('click', () => {
    setStyle(button.dataset.styleChoice);
    renderHome();
  }));

  const form = document.querySelector('#create-form');
  const addressInput = document.querySelector('#creator-address');
  const addressResults = document.querySelector('#creator-address-results');
  if (!form || !addressInput || !addressResults) return;
  const picker = bindAddressPicker(addressInput, addressResults);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = document.querySelector('#create-submit');
    const title = document.querySelector('#meeting-title')?.value.trim() ?? '';
    const creatorName = document.querySelector('#creator-name')?.value.trim() ?? '';
    const deadlineValue = document.querySelector('#meeting-deadline')?.value ?? '';
    if (!title || !creatorName || !deadlineValue) return;
    try {
      if (button) { button.disabled = true; button.textContent = t('create.submitting'); }
      const location = await picker.ensureSelected();
      const adminToken = randomToken(32);
      const participantToken = randomToken(24);
      const result = await repository.createMeeting({
        title, creatorName, creatorAddress: location.displayName,
        deadline: new Date(deadlineValue).toISOString(), lat: location.lat, lng: location.lng,
        adminToken, participantToken
      });
      localStorage.setItem(`meet-halfway.admin.${result.shareId}`, adminToken);
      localStorage.setItem(`meet-halfway.participant.${result.shareId}`, participantToken);
      showToast(t('create.success'), 'success');
      window.location.hash = `#/m/${result.shareId}`;
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('create.error'), 'error');
      if (button) { button.disabled = false; button.innerHTML = `${escapeHtml(t('create.submit'))} <span aria-hidden="true">→</span>`; }
    }
  });
}

function renderAbout() {
  cleanupView();
  routeVersion += 1;
  const cards = ['fair', 'share', 'map', 'privacy', 'stack', 'languages'];
  app.innerHTML = `
    ${headerHtml()}
    <main id="main" class="about-main shell">
      <section class="about-hero"><span class="eyebrow">${escapeHtml(t('about.eyebrow'))}</span><h1>${escapeHtml(t('about.title'))}</h1><p>${escapeHtml(t('about.intro'))}</p><div class="about-provider"><span>Map provider</span><strong>${isKakaoMapsConfigured ? 'Kakao Maps' : isGoogleMapsConfigured ? 'Google Maps' : 'OpenStreetMap'}</strong><span>Data</span><strong>${isSupabaseConfigured ? 'Supabase RPC' : 'Local demo'}</strong></div></section>
      <section class="about-grid">${cards.map((key, index) => `<article class="about-card"><span>${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(t(`about.${key}.title`))}</h2><p>${escapeHtml(t(`about.${key}.body`))}</p></article>`).join('')}</section>
      <section class="admin-ready"><div><span class="eyebrow">ADMIN READY</span><h2>One map setting, interchangeable provider.</h2><p><code>MAP_PROVIDER=kakao</code> + <code>KAKAO_MAPS_JAVASCRIPT_KEY</code> enables Kakao map, address search, and restaurant discovery. Google and key-free OpenStreetMap modes remain available.</p></div><a class="button button--primary" href="#/">${escapeHtml(t('notfound.home'))}</a></section>
    </main>
    ${footerHtml()}`;
  bindGlobalUi();
}

function participantListHtml(snapshot, center) {
  return snapshot.participants.map((participant, index) => {
    const distance = center ? `${haversineKm(participant, center).toFixed(1)}km` : '';
    return `<article class="participant-row"><span class="avatar" aria-hidden="true">${escapeHtml(participant.name.slice(0,1).toUpperCase())}</span><div class="participant-main"><div><strong>${escapeHtml(participant.name)}</strong>${participant.isHost ? `<span class="host-badge">${escapeHtml(t('meeting.host'))}</span>` : ''}</div><p>${escapeHtml(participant.address)}</p></div><div class="participant-meta"><span>${index + 1}</span>${distance ? `<small>${distance}</small>` : ''}</div></article>`;
  }).join('');
}

function nearestPlaceName(hotspot, places) {
  const closest = [...places].sort((a,b) => haversineKm(a, hotspot) - haversineKm(b, hotspot))[0];
  return hotspot.areaName || (closest ? t('results.nearby', { name: closest.name }) : t('results.midpointNearby'));
}

function externalMapUrl(point) {
  if (point.url) return point.url;
  if (isKakaoMapsConfigured) return `https://map.kakao.com/link/map/${encodeURIComponent(point.name || point.areaName || '어?중간')},${point.lat},${point.lng}`;
  if (isGoogleMapsConfigured) return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`;
}

function categoryLabel(category) {
  if (category === 'cafe') return t('results.categoryCafe');
  if (category === 'fast_food') return t('results.categoryQuick');
  if (category === 'bar') return t('results.categoryBar');
  return t('results.categoryRestaurant');
}

function matchesCategory(place, category) {
  if (category === 'all') return true;
  if (category === 'quick') return place.category === 'fast_food' || place.category === 'bar';
  return place.category === category;
}

function candidateNearbyPlaces(candidate, allPlaces) {
  if (!candidate) return [];
  return placesNear(candidate, allPlaces, Math.min(1.6, candidate.clusterRadiusKm ? candidate.clusterRadiusKm * 1.25 : 1.35), 8);
}

function resultsHtml(snapshot, allPlaces, hotspots, selectedIndex = 0, selectedCategory = 'all') {
  const center = geometricMedian(snapshot.participants);
  if (!center) return `<div class="empty-state">${escapeHtml(t('results.noParticipants'))}</div>`;
  const distances = snapshot.participants.map((p) => haversineKm(p, center));
  const avg = distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length);
  const max = Math.max(...distances, 0);
  const selected = Number.isInteger(selectedIndex) ? (hotspots[selectedIndex] || null) : null;

  const candidateCards = hotspots.length ? hotspots.map((hotspot, index) => {
    const isSelected = selected?.id === hotspot.id;
    const areaName = hotspot.areaLabel || nearestPlaceName(hotspot, allPlaces);
    return `
      <article class="candidate-card ${isSelected ? 'is-selected' : ''}" data-candidate-card-index="${index}" tabindex="0" role="button" aria-pressed="${isSelected}">
        <div class="candidate-card-head"><span class="candidate-rank">${escapeHtml(t('results.candidate', { n: index + 1 }))}</span><div class="candidate-badges">${index === 0 ? '<span class="candidate-best">BEST</span>' : ''}${hotspot.recommendationTier === 'expanded' ? `<span class="candidate-expanded">${escapeHtml(t('results.expandedCandidate'))}</span>` : ''}</div></div>
        <h3>${escapeHtml(areaName)}</h3>
        <div class="candidate-metrics">
          <span><strong>${hotspot.placeCount || 0}</strong>${escapeHtml(t('results.placeCount'))}</span>
          <span><strong>${hotspot.restaurantCount || 0}</strong>${escapeHtml(t('results.restaurantCountShort'))}</span>
          <span><strong>${hotspot.cafeCount || 0}</strong>${escapeHtml(t('results.cafeCount'))}</span>
        </div>
        <p>${escapeHtml(t('results.centerDistanceLabel'))} <strong>${hotspot.centerDistanceKm.toFixed(1)}km</strong> · ${escapeHtml(t('results.maxTravelLabel'))} <strong>${hotspot.maxParticipantDistanceKm.toFixed(1)}km</strong></p>
        <div class="candidate-actions"><button type="button" class="button ${isSelected ? 'button--primary' : 'button--ghost'} button--small" data-candidate-index="${index}">${escapeHtml(t(isSelected ? 'results.unselectArea' : 'results.selectArea'))}</button><a href="${externalMapUrl(hotspot)}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openMap'))}</a></div>
      </article>`;
  }).join('') : `<div class="empty-state"><strong>${escapeHtml(t('results.fallbackTitle'))}</strong><span>${escapeHtml(t('results.fallbackBody'))}</span></div>`;

  let detail = '';
  if (selected) {
    const nearby = candidateNearbyPlaces(selected, allPlaces);
    const counts = {
      all: nearby.length,
      restaurant: nearby.filter((place) => place.category === 'restaurant').length,
      cafe: nearby.filter((place) => place.category === 'cafe').length,
      quick: nearby.filter((place) => place.category === 'fast_food' || place.category === 'bar').length
    };
    const categories = [
      ['all', t('results.all')],
      ['restaurant', t('results.categoryRestaurant')],
      ['cafe', t('results.categoryCafe')],
      ['quick', t('results.categoryQuick')]
    ];
    const visible = nearby.filter((place) => matchesCategory(place, selectedCategory)).slice(0, 24);
    const placeCards = visible.length ? visible.map((place) => `
      <article class="place-card" data-place-id="${escapeHtml(String(place.id))}" tabindex="0" role="button" aria-label="${escapeHtml(place.name)}">
        <div class="place-card-main"><span class="place-category place-category--${escapeHtml(place.category || 'restaurant')}">${escapeHtml(categoryLabel(place.category))}</span><h4>${escapeHtml(place.name)}</h4><p>${escapeHtml(place.address || place.cuisine || t('results.dataSource'))}</p>${Number.isFinite(place.rating) ? `<div class="place-rating">★ ${Number(place.rating).toFixed(1)}${place.reviewCount ? ` · ${escapeHtml(String(place.reviewCount))}` : ''}</div>` : ''}</div>
        <div class="place-card-side"><strong>${place.distanceKm.toFixed(1)}km</strong><span class="place-card-map-hint">${escapeHtml(t('results.showOnMap'))}</span><a href="${externalMapUrl(place)}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPlace'))} ↗</a></div>
      </article>`).join('') : `<div class="empty-state place-empty"><strong>${escapeHtml(t('results.noPlacesInCategory'))}</strong></div>`;
    detail = `
      <section class="selected-area-card">
        <div class="selected-area-heading"><div><span class="eyebrow">${escapeHtml(t('results.selectedArea'))}</span><h3>${escapeHtml(selected.areaLabel || nearestPlaceName(selected, allPlaces))}</h3><p>${escapeHtml(t('results.selectedHint'))}</p></div><a class="button button--ghost button--small" href="${externalMapUrl(selected)}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openMap'))}</a></div>
        <div class="map-explore-tip"><span class="map-explore-icon">⌖</span><div><strong>${escapeHtml(t('results.mapTip'))}</strong><span>${escapeHtml(t('results.mapTipBody'))}</span></div></div>
        <div class="place-filter" role="tablist" aria-label="${escapeHtml(t('results.placesHeading'))}">${categories.map(([value, label]) => `<button type="button" role="tab" aria-selected="${selectedCategory === value}" class="filter-chip ${selectedCategory === value ? 'is-active' : ''}" data-place-category="${value}">${escapeHtml(label)} <span>${counts[value] || 0}</span></button>`).join('')}</div>
        <div class="places-header"><h3>${escapeHtml(t('results.placesHeading'))}</h3><span>${nearby.length} · ${escapeHtml(t('results.dataSource'))}</span></div>
        <div class="place-list">${placeCards}</div>
      </section>`;
  }

  return `
    <div class="result-summary"><div><span>${escapeHtml(t('results.avgDistance'))}</span><strong>${avg.toFixed(1)}km</strong></div><div><span>${escapeHtml(t('results.maxDistance'))}</span><strong>${max.toFixed(1)}km</strong></div><div><span>${escapeHtml(t('results.placeCount'))}</span><strong>${allPlaces.filter((place) => !place.isMeetingAnchor).length}</strong></div><div><span>${escapeHtml(t('results.recommendationCount'))}</span><strong>${hotspots.length}</strong></div></div>
    <div class="recommendation-explainer"><strong>${escapeHtml(t('results.title'))}</strong><span>${escapeHtml(t('results.recommendationIntro'))}</span>${hotspots[0]?.recommendationRadiusKm ? `<em>${escapeHtml(t('results.recommendationRadius', { distance: hotspots[0].recommendationRadiusKm.toFixed(1) }))}</em>` : ''}</div>
    <div class="candidate-grid">${candidateCards}</div>
    ${detail}
    <div class="result-note">${escapeHtml(t('results.note'))}</div>`;
}

function activateResultExperience(resultPanel, snapshot, allPlaces, hotspots, center) {
  let selectedIndex = hotspots.length ? 0 : null;
  let selectedCategory = 'all';
  const mapElement = document.querySelector('#meeting-map');

  const toggleCandidate = (index) => {
    if (!Number.isInteger(index) || !hotspots[index]) return;
    selectedIndex = selectedIndex === index ? null : index;
    selectedCategory = 'all';
    paint();
    document.querySelector('.meeting-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const mapCandidateHandler = (event) => {
    const index = Number(event.detail?.index);
    if (Number.isInteger(index)) toggleCandidate(index);
  };
  mapElement?.addEventListener('meet-halfway:candidate-select', mapCandidateHandler);

  const paint = () => {
    resultPanel.innerHTML = resultsHtml(snapshot, allPlaces, hotspots, selectedIndex, selectedCategory);
    const selected = Number.isInteger(selectedIndex) ? (hotspots[selectedIndex] || null) : null;
    const nearby = selected ? candidateNearbyPlaces(selected, allPlaces) : [];
    const visiblePlaces = nearby.filter((place) => matchesCategory(place, selectedCategory)).slice(0, APP_CONFIG.maxRestaurantMarkers);
    activeMap?.render(snapshot.participants, center, visiblePlaces, hotspots, selected ? { focusCandidate: selected } : {});

    resultPanel.querySelectorAll('[data-candidate-index]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCandidate(Number(button.dataset.candidateIndex));
      });
    });
    resultPanel.querySelectorAll('[data-candidate-card-index]').forEach((card) => {
      const activate = (event) => {
        if (event.target.closest('a,button')) return;
        toggleCandidate(Number(card.dataset.candidateCardIndex));
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a,button')) {
          event.preventDefault();
          toggleCandidate(Number(card.dataset.candidateCardIndex));
        }
      });
    });
    resultPanel.querySelectorAll('[data-place-category]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.placeCategory || 'all';
        paint();
      });
    });
    resultPanel.querySelectorAll('[data-place-id]').forEach((card) => {
      const focus = (event) => {
        if (event.target.closest('a,button')) return;
        activeMap?.focusPlace(card.dataset.placeId);
        document.querySelector('#meeting-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      card.addEventListener('click', focus);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activeMap?.focusPlace(card.dataset.placeId);
          document.querySelector('#meeting-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  };

  paint();
}

async function renderMeeting(shareId) {
  cleanupView();
  const version = ++routeVersion;
  app.innerHTML = `${headerHtml()}<main id="main" class="meeting-main shell"><div class="page-loading" role="status"><span class="spinner"></span><strong>${escapeHtml(t('meeting.loading'))}</strong></div></main>${footerHtml()}`;
  bindGlobalUi();
  try {
    const snapshot = shareId === 'demo' ? DEMO_SNAPSHOT : await repository.getMeeting(shareId);
    if (version !== routeVersion) return;
    if (!snapshot) { renderNotFound(t('meeting.notFound')); return; }
    const closed = shareId === 'demo' || isMeetingClosed(snapshot.meeting.status, snapshot.meeting.deadline);
    const center = closed ? geometricMedian(snapshot.participants) : null;
    const adminToken = localStorage.getItem(`meet-halfway.admin.${shareId}`);
    const isAdmin = Boolean(adminToken) && shareId !== 'demo';
    const main = document.querySelector('#main');
    if (!main) return;
    const summary = `${t('meeting.peopleEntered', { count: snapshot.participants.length })} ${closed ? t('meeting.closedSummary') : t('meeting.openSummary', { deadline: formatDateTimeLocalized(snapshot.meeting.deadline) })}`;
    main.innerHTML = `
      ${!isSupabaseConfigured && shareId !== 'demo' ? localModeNotice() : ''}
      <section class="meeting-hero"><div><div class="meeting-status-row"><span class="status-badge ${closed ? 'status-badge--closed' : ''}">${escapeHtml(closed ? t('meeting.closed') : t('meeting.open'))}</span><span id="countdown">${escapeHtml(closed ? t('meeting.closed') : formatCountdownLocalized(snapshot.meeting.deadline))}</span></div><h1>${escapeHtml(snapshot.meeting.title)}</h1><p>${escapeHtml(summary)}</p></div><div class="meeting-actions"><button class="button button--primary" id="share-button" type="button">${escapeHtml(t('meeting.share'))}</button>${isAdmin && !closed ? `<button class="button button--ghost" id="close-button" type="button">${escapeHtml(t('meeting.closeNow'))}</button>` : ''}${!isAdmin && shareId !== 'demo' ? `<button class="button button--text" id="admin-access" type="button">${escapeHtml(t('meeting.adminAccess'))}</button>` : ''}</div></section>
      <section class="meeting-grid"><div class="map-panel"><div class="map-toolbar"><span><strong>${escapeHtml(t('meeting.map'))}</strong> · ${escapeHtml(t('meeting.participants'))} ${snapshot.participants.length}</span><span class="map-legend"><i class="legend-user"></i>${escapeHtml(t('meeting.legendStart'))} <i class="legend-center"></i>${escapeHtml(t('meeting.legendCenter'))} <i class="legend-food"></i>${escapeHtml(t('meeting.legendFood'))}</span></div><div id="meeting-map" class="meeting-map" aria-label="Meeting map"></div></div>
      <aside class="side-panel"><div class="side-panel-header"><div><span class="eyebrow">${escapeHtml(t('meeting.participants'))}</span><h2>${escapeHtml(t('meeting.startPoints'))}</h2></div><span class="count-pill">${snapshot.participants.length}</span></div><div class="participant-list">${participantListHtml(snapshot, center)}</div>
      ${closed ? `<div class="closed-message"><strong>${escapeHtml(t('meeting.closedMessage'))}</strong><span>${escapeHtml(t('meeting.closedHint'))}</span></div>` : `<form class="join-form" id="join-form"><div class="join-form-heading"><strong>${escapeHtml(t('join.title'))}${localStorage.getItem(`meet-halfway.participant.${shareId}`) ? ` · ${escapeHtml(t('join.edit'))}` : ''}</strong><span>${escapeHtml(t('join.hint'))}</span></div><div class="field"><label for="join-name">${escapeHtml(t('join.name'))}</label><input id="join-name" maxlength="30" required placeholder="${escapeHtml(t('join.namePlaceholder'))}" autocomplete="name" /></div><div class="field address-field"><label for="join-address">${escapeHtml(t('join.address'))}</label><input id="join-address" required placeholder="${escapeHtml(t('join.addressPlaceholder'))}" autocomplete="off" /><div class="address-results" id="join-address-results" hidden></div></div><button class="button button--primary button--block" id="join-submit" type="submit">${escapeHtml(t('join.submit'))}</button></form>`}</aside></section>
      ${closed ? `<section class="results-section" aria-labelledby="results-title"><div class="section-heading"><span class="eyebrow">${escapeHtml(t('results.eyebrow'))}</span><h2 id="results-title">${escapeHtml(t('results.title'))}</h2><p>${escapeHtml(t('results.description'))}</p></div><div id="result-panel" class="result-panel"><div class="page-loading page-loading--compact"><span class="spinner"></span><strong>${escapeHtml(t('results.loading'))}</strong></div></div></section>` : ''}
      <dialog class="admin-dialog" id="admin-dialog"><form method="dialog" id="admin-form"><div class="dialog-heading"><h2>${escapeHtml(t('admin.title'))}</h2><button class="icon-button" value="cancel" aria-label="Close">×</button></div><p>${escapeHtml(t('admin.body'))}</p><label class="field"><span>${escapeHtml(t('admin.key'))}</span><input id="admin-key-input" required autocomplete="off" /></label><div class="dialog-actions"><button class="button button--ghost" value="cancel">${escapeHtml(t('admin.cancel'))}</button><button class="button button--primary" value="default" id="admin-save">${escapeHtml(t('admin.save'))}</button></div></form></dialog>`;
    bindGlobalUi();
    activeMap = new MeetingMap('meeting-map', snapshot.participants[0] ?? undefined);
    activeMap.render(snapshot.participants, center);

    document.querySelector('#share-button')?.addEventListener('click', async () => {
      const url = window.location.href;
      try {
        if (navigator.share) await navigator.share({ title: snapshot.meeting.title, text: t('meeting.shareText'), url });
        else { await copyText(url); showToast(t('meeting.copySuccess'), 'success'); }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        showToast(t('meeting.shareError'), 'error');
      }
    });

    const closeButton = document.querySelector('#close-button');
    closeButton?.addEventListener('click', async () => {
      const token = localStorage.getItem(`meet-halfway.admin.${shareId}`);
      if (!token || !window.confirm(t('meeting.closeConfirm'))) return;
      try {
        closeButton.disabled = true;
        closeButton.textContent = t('meeting.closing');
        await repository.closeMeeting(shareId, token);
        showToast(t('meeting.closeSuccess'), 'success');
        await renderMeeting(shareId);
      } catch (error) {
        closeButton.disabled = false;
        closeButton.textContent = t('meeting.closeNow');
        showToast(error instanceof Error ? error.message : t('meeting.closeError'), 'error');
      }
    });

    const adminDialog = document.querySelector('#admin-dialog');
    document.querySelector('#admin-access')?.addEventListener('click', () => adminDialog?.showModal());
    document.querySelector('#admin-form')?.addEventListener('submit', (event) => {
      const input = document.querySelector('#admin-key-input');
      if (!input?.value.trim()) { event.preventDefault(); return; }
      localStorage.setItem(`meet-halfway.admin.${shareId}`, input.value.trim());
      showToast(t('admin.saved'), 'success');
      window.setTimeout(() => void renderMeeting(shareId), 0);
    });

    if (!closed && shareId !== 'demo') {
      const joinForm = document.querySelector('#join-form');
      const joinInput = document.querySelector('#join-address');
      const joinResults = document.querySelector('#join-address-results');
      if (joinForm && joinInput && joinResults) {
        const picker = bindAddressPicker(joinInput, joinResults);
        joinForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (!joinForm.reportValidity()) return;
          const name = document.querySelector('#join-name')?.value.trim() ?? '';
          if (!name) return;
          const button = document.querySelector('#join-submit');
          try {
            if (button) { button.disabled = true; button.textContent = t('join.saving'); }
            const location = await picker.ensureSelected();
            let participantToken = localStorage.getItem(`meet-halfway.participant.${shareId}`);
            if (!participantToken) {
              participantToken = randomToken(24);
              localStorage.setItem(`meet-halfway.participant.${shareId}`, participantToken);
            }
            await repository.addParticipant({ shareId, name, address: location.displayName, lat: location.lat, lng: location.lng, participantToken });
            showToast(t('join.success'), 'success');
            await renderMeeting(shareId);
          } catch (error) {
            if (button) { button.disabled = false; button.textContent = t('join.submit'); }
            showToast(error instanceof Error ? error.message : t('join.error'), 'error');
          }
        });
      }
    }

    if (!closed) {
      activeInterval = window.setInterval(() => {
        const countdown = document.querySelector('#countdown');
        if (!countdown) return;
        const text = formatCountdownLocalized(snapshot.meeting.deadline);
        countdown.textContent = text;
        if (new Date(snapshot.meeting.deadline).getTime() <= Date.now()) void renderMeeting(shareId);
      }, 30_000);
    }

    if (closed) {
      const resultPanel = document.querySelector('#result-panel');
      const calculatedCenter = geometricMedian(snapshot.participants);
      if (!resultPanel || !calculatedCenter) return;
      try {
        const places = shareId === 'demo' ? DEMO_PLACES : await discoverMeetingPlaces(calculatedCenter, snapshot.participants);
        if (version !== routeVersion) return;
        const hotspots = buildHotspots(places, snapshot.participants, calculatedCenter, 3);
        for (const hotspot of hotspots) {
          if (version !== routeVersion) return;
          if (hotspot.areaLabel) {
            hotspot.areaName = hotspot.areaLabel;
            continue;
          }
          try {
            hotspot.areaName = await describeArea(hotspot);
          } catch {
            hotspot.areaName = '';
          }
        }
        if (version !== routeVersion) return;
        activateResultExperience(resultPanel, snapshot, places, hotspots, calculatedCenter);
      } catch (error) {
        if (version !== routeVersion) return;
        resultPanel.innerHTML = `<div class="notice notice--error"><strong>${escapeHtml(t('results.placeError'))}</strong><span>${escapeHtml(error instanceof Error ? error.message : t('map.network'))}</span></div>${resultsHtml(snapshot, [], [])}`;
        activeMap?.render(snapshot.participants, calculatedCenter);
      }
    }
  } catch (error) {
    if (version !== routeVersion) return;
    renderNotFound(error instanceof Error ? error.message : t('meeting.notFound'));
  }
}

function renderNotFound(message = t('notfound.title')) {
  cleanupView();
  routeVersion += 1;
  app.innerHTML = `${headerHtml()}<main id="main" class="not-found shell"><span class="not-found-code">${escapeHtml(t('notfound.code'))}</span><h1>${escapeHtml(message)}</h1><p>${escapeHtml(t('notfound.body'))}</p><div><a class="button button--primary" href="#/">${escapeHtml(t('notfound.home'))}</a><button class="button button--ghost" id="back-button" type="button">${escapeHtml(t('notfound.back'))}</button></div></main>${footerHtml()}`;
  bindGlobalUi();
  document.querySelector('#back-button')?.addEventListener('click', () => history.back());
}

function route() {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '#' || hash === '') return renderHome();
  if (hash === '#/about') return renderAbout();
  if (hash === '#/demo') return void renderMeeting('demo');
  const match = hash.match(/^#\/m\/([a-zA-Z0-9_-]+)$/);
  if (match?.[1]) return void renderMeeting(match[1]);
  return renderNotFound();
}

setStyle(getStyle());
setTheme(getTheme());
applyDocumentLanguage();
window.addEventListener('hashchange', route);
route();
