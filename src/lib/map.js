import { isGoogleMapsConfigured, isKakaoMapsConfigured } from '../config.js';
import { t } from '../i18n.js';
import { loadGoogleMaps } from './googleMaps.js';
import { loadKakaoMaps } from './kakaoMaps.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-meet-halfway-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.dataset.meetHalfwayLeaflet = 'true';
      document.head.append(link);
    }
    const existing = document.querySelector('script[data-meet-halfway-leaflet]');
    if (existing) {
      const wait = () => window.L ? resolve(window.L) : window.setTimeout(wait, 50);
      wait();
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.meetHalfwayLeaflet = 'true';
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error(t('map.network')));
    }, 7000);
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.L) resolve(window.L);
      else reject(new Error(t('map.failed')));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(t('map.failed')));
    };
    document.head.append(script);
  });
  return leafletPromise;
}

function escape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function categoryText(category) {
  if (category === 'cafe') return t('results.categoryCafe');
  if (category === 'fast_food') return t('results.categoryQuick');
  if (category === 'bar') return t('results.categoryBar');
  return t('results.categoryRestaurant');
}

function providerText(provider) {
  if (provider === 'kakao') return 'Kakao';
  if (provider === 'google') return 'Google';
  if (provider === 'demo') return t('map.demoData');
  return 'OpenStreetMap';
}

function externalPlaceUrl(place) {
  if (place.url) return place.url;
  return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`;
}

function placeIcon(category) {
  if (category === 'cafe') return '☕';
  if (category === 'fast_food') return '●';
  if (category === 'bar') return '◆';
  return '●';
}

function placePopupHtml(place) {
  const detail = place.address || place.cuisine || t('results.dataSource');
  const rating = Number.isFinite(place.rating)
    ? `<span class="map-popup-rating">★ ${Number(place.rating).toFixed(1)}${place.reviewCount ? ` <small>(${escape(place.reviewCount)})</small>` : ''}</span>`
    : '';
  const meta = [
    place.distanceKm != null ? `${Number(place.distanceKm).toFixed(1)}km` : '',
    place.phone || '',
    place.openingHours || ''
  ].filter(Boolean).map((value) => `<span>${escape(value)}</span>`).join('');
  const shareText = `${place.name}${place.address ? ` · ${place.address}` : ''}`;
  return `
    <div class="map-place-popup">
      <div class="map-place-popup-top"><span class="map-place-badge map-place-badge--${escape(place.category || 'restaurant')}">${escape(categoryText(place.category))}</span>${rating}</div>
      <strong class="map-place-popup-name">${escape(place.name)}</strong>
      <p>${escape(detail)}</p>
      ${meta ? `<div class="map-place-meta">${meta}</div>` : ''}
      <small class="map-place-source">${escape(t('map.provider'))}: ${escape(providerText(place.provider))}</small>
      <div class="map-place-actions">
        ${place.address ? `<button type="button" data-map-copy="${escape(place.address)}">${escape(t('map.copyAddress'))}</button>` : ''}
        <button type="button" data-map-share-name="${escape(place.name)}" data-map-share-text="${escape(shareText)}" data-map-share-url="${escape(externalPlaceUrl(place))}">${escape(t('map.sharePlace'))}</button>
        <a href="${escape(externalPlaceUrl(place))}" target="_blank" rel="noreferrer">${escape(t('map.openPlace'))} ↗</a>
      </div>
    </div>`;
}

function placeColors(category) {
  if (category === 'cafe') return { stroke: '#6841c4', fill: '#8e67e8' };
  if (category === 'fast_food') return { stroke: '#18745b', fill: '#32a67e' };
  if (category === 'bar') return { stroke: '#2f5d9b', fill: '#4e86cf' };
  return { stroke: '#9a6515', fill: '#f0b433' };
}

function candidateLabel(hotspot, index) {
  const name = hotspot.areaName || t('results.candidate', { n: index + 1 });
  return `<div class="map-candidate-popup"><strong>${escape(t('map.recommendation', { n: index + 1 }))}</strong><span>${escape(name)}</span><small>${escape(t('results.placeCluster', { count: hotspot.placeCount || hotspot.restaurantCount || 0 }))}</small></div>`;
}

function bindPopupActions(container) {
  if (!container || container.dataset.popupActionsBound === 'true') return;
  container.dataset.popupActionsBound = 'true';
  container.addEventListener('click', async (event) => {
    const copyButton = event.target.closest('[data-map-copy]');
    if (copyButton) {
      event.preventDefault();
      const text = copyButton.dataset.mapCopy || '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      const original = copyButton.textContent;
      copyButton.textContent = t('map.copied');
      window.setTimeout(() => { copyButton.textContent = original; }, 1200);
      return;
    }
    const shareButton = event.target.closest('[data-map-share-name]');
    if (shareButton) {
      event.preventDefault();
      const payload = {
        title: shareButton.dataset.mapShareName || '어?중간',
        text: shareButton.dataset.mapShareText || '',
        url: shareButton.dataset.mapShareUrl || location.href
      };
      if (navigator.share) {
        try { await navigator.share(payload); } catch { /* user cancelled */ }
      } else {
        const text = `${payload.text}\n${payload.url}`;
        try { await navigator.clipboard.writeText(text); } catch { /* no-op */ }
        const original = shareButton.textContent;
        shareButton.textContent = t('map.copied');
        window.setTimeout(() => { shareButton.textContent = original; }, 1200);
      }
    }
  });
}

class LeafletMeetingMap {
  map = null;
  layers = [];
  placeLayers = new Map();
  container = null;
  pendingRender = null;
  destroyed = false;

  constructor(elementId, initial) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    bindPopupActions(this.container);
    this.container.innerHTML = `<div class="map-unavailable"><span class="spinner"></span><strong>${t('map.loading')}</strong></div>`;
    void loadLeaflet().then((L) => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = '';
      this.map = L.map(elementId, { zoomControl: true, scrollWheelZoom: true }).setView([initial.lat, initial.lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);
      if (this.pendingRender) {
        const pending = this.pendingRender;
        this.pendingRender = null;
        this.render(pending.participants, pending.center, pending.places, pending.hotspots, pending.options);
      }
    }).catch((error) => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = `<div class="map-unavailable"><strong>${t('map.failed')}</strong><span>${escape(error instanceof Error ? error.message : t('map.network'))}</span></div>`;
    });
  }

  render(participants, center, places = [], hotspots = [], options = {}) {
    const L = window.L;
    if (!this.map || !L) {
      this.pendingRender = { participants, center, places, hotspots, options };
      return;
    }
    this.clearLayers();
    const overviewBounds = L.latLngBounds([]);
    const focusBounds = L.latLngBounds([]);
    const focusCandidate = options.focusCandidate || null;

    participants.forEach((participant, index) => {
      const marker = L.circleMarker([participant.lat, participant.lng], {
        radius: participant.isHost ? 9 : 7,
        weight: 3,
        color: participant.isHost ? '#5949e8' : '#198e73',
        fillColor: participant.isHost ? '#7c6dfc' : '#33b892',
        fillOpacity: focusCandidate ? 0.42 : 0.95
      }).addTo(this.map);
      marker.bindPopup(`<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}${participant.isHost ? `<br><small>${t('meeting.host')}</small>` : ''}`);
      if (!focusCandidate) marker.bindTooltip(`${index + 1}. ${escape(participant.name)}`, { direction: 'top', offset: [0, -6] });
      this.layers.push(marker);
      overviewBounds.extend([participant.lat, participant.lng]);
    });

    if (center) {
      const marker = L.circleMarker([center.lat, center.lng], { radius: 8, weight: 2, dashArray: '4 4', color: '#b33a1f', fillColor: '#ff795c', fillOpacity: focusCandidate ? 0.25 : 0.82 }).addTo(this.map);
      marker.bindPopup(`<strong>${t('map.center')}</strong><br><small>${t('results.algorithm')}</small>`);
      this.layers.push(marker);
      overviewBounds.extend([center.lat, center.lng]);
    }

    hotspots.forEach((hotspot, index) => {
      const selected = Boolean(focusCandidate && hotspot.id === focusCandidate.id);
      if (selected) {
        const area = L.circle([hotspot.lat, hotspot.lng], {
          radius: 1200,
          weight: 2,
          color: '#e0553e',
          fillColor: '#ff795c',
          fillOpacity: 0.07
        }).addTo(this.map);
        this.layers.push(area);
      }
      const pin = L.marker([hotspot.lat, hotspot.lng], {
        icon: L.divIcon({
          className: 'candidate-map-pin-wrap',
          html: `<span class="candidate-map-pin ${selected ? 'is-selected' : ''}" data-rank="${index + 1}"></span>`,
          iconSize: [38, 46],
          iconAnchor: [19, 42],
          popupAnchor: [0, -38]
        }),
        zIndexOffset: selected ? 900 : 500
      }).addTo(this.map);
      pin.bindPopup(candidateLabel(hotspot, index), { maxWidth: 280 });
      pin.bindTooltip(`${escape(t('results.candidate', { n: index + 1 }))} · ${escape(hotspot.areaName || '')}`, { permanent: selected, direction: 'top', offset: [0, -36], className: selected ? 'map-label map-label--selected' : 'map-label' });
      this.layers.push(pin);
      overviewBounds.extend([hotspot.lat, hotspot.lng]);
      if (selected) focusBounds.extend([hotspot.lat, hotspot.lng]);
    });

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: L.divIcon({
          className: 'food-map-pin-wrap',
          html: `<span class="food-map-pin food-map-pin--${escape(place.category || 'restaurant')}"><b>${placeIcon(place.category)}</b></span>`,
          iconSize: [30, 38],
          iconAnchor: [15, 34],
          popupAnchor: [0, -30]
        }),
        zIndexOffset: 200
      }).addTo(this.map);
      marker.bindPopup(placePopupHtml(place), { maxWidth: 320, minWidth: 250, className: 'food-map-popup' });
      marker.bindTooltip(escape(place.name), { direction: 'top', offset: [0, -25], opacity: 0.92 });
      this.layers.push(marker);
      this.placeLayers.set(String(place.id), marker);
      if (focusCandidate) focusBounds.extend([place.lat, place.lng]);
      else overviewBounds.extend([place.lat, place.lng]);
    });

    if (focusCandidate && focusBounds.isValid()) this.map.fitBounds(focusBounds.pad(0.16), { maxZoom: 15 });
    else if (overviewBounds.isValid()) this.map.fitBounds(overviewBounds.pad(0.2), { maxZoom: 12 });
  }

  focusPlace(placeId) {
    const marker = this.placeLayers.get(String(placeId));
    if (!marker || !this.map) return;
    const location = marker.getLatLng();
    this.map.flyTo(location, Math.max(this.map.getZoom(), 16), { duration: 0.45 });
    window.setTimeout(() => marker.openPopup(), 280);
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.remove());
    this.layers = [];
    this.placeLayers.clear();
  }

  destroy() {
    this.destroyed = true;
    this.map?.remove();
    this.map = null;
    this.pendingRender = null;
    this.placeLayers.clear();
  }
}

class GoogleMeetingMap {
  map = null;
  layers = [];
  placeLayers = new Map();
  infoWindow = null;
  container = null;
  pendingRender = null;
  destroyed = false;

  constructor(elementId, initial) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    bindPopupActions(this.container);
    this.container.innerHTML = `<div class="map-unavailable"><span class="spinner"></span><strong>${t('map.loading')}</strong></div>`;
    void loadGoogleMaps().then(async () => {
      if (this.destroyed || !this.container) return;
      const { Map, InfoWindow } = await window.google.maps.importLibrary('maps');
      this.container.innerHTML = '';
      this.map = new Map(this.container, { center: initial, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false });
      this.infoWindow = new InfoWindow();
      if (this.pendingRender) {
        const pending = this.pendingRender;
        this.pendingRender = null;
        this.render(pending.participants, pending.center, pending.places, pending.hotspots, pending.options);
      }
    }).catch((error) => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = `<div class="map-unavailable"><strong>${t('map.failed')}</strong><span>${escape(error instanceof Error ? error.message : t('map.network'))}</span></div>`;
    });
  }

  addCircle(position, options, html) {
    const circle = new window.google.maps.Circle({ map: this.map, center: position, ...options });
    circle.addListener('click', () => {
      this.infoWindow?.setContent(html);
      this.infoWindow?.setPosition(position);
      this.infoWindow?.open({ map: this.map });
    });
    this.layers.push(circle);
    return circle;
  }

  render(participants, center, places = [], hotspots = [], options = {}) {
    if (!this.map || !window.google?.maps) {
      this.pendingRender = { participants, center, places, hotspots, options };
      return;
    }
    this.clearLayers();
    const overviewBounds = new window.google.maps.LatLngBounds();
    const focusBounds = new window.google.maps.LatLngBounds();
    const focusCandidate = options.focusCandidate || null;

    participants.forEach((participant) => {
      const position = { lat: participant.lat, lng: participant.lng };
      this.addCircle(position, { radius: participant.isHost ? 110 : 85, strokeColor: participant.isHost ? '#5949e8' : '#198e73', strokeOpacity: 0.9, strokeWeight: 3, fillColor: participant.isHost ? '#7c6dfc' : '#33b892', fillOpacity: focusCandidate ? 0.35 : 0.85 }, `<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}`);
      overviewBounds.extend(position);
    });
    if (center) {
      const position = { lat: center.lat, lng: center.lng };
      this.addCircle(position, { radius: 120, strokeColor: '#b33a1f', strokeOpacity: 0.7, strokeWeight: 2, fillColor: '#ff795c', fillOpacity: focusCandidate ? 0.18 : 0.7 }, `<strong>${t('map.center')}</strong>`);
      overviewBounds.extend(position);
    }
    hotspots.forEach((hotspot, index) => {
      const position = { lat: hotspot.lat, lng: hotspot.lng };
      const selected = Boolean(focusCandidate && hotspot.id === focusCandidate.id);
      if (selected) this.addCircle(position, { radius: 1100, strokeColor: '#e0553e', strokeOpacity: 0.55, strokeWeight: 2, fillColor: '#ff795c', fillOpacity: 0.06 }, candidateLabel(hotspot, index));
      this.addCircle(position, { radius: selected ? 240 : 180, strokeColor: selected ? '#b33a1f' : '#c58a13', strokeOpacity: 1, strokeWeight: selected ? 4 : 3, fillColor: selected ? '#ff795c' : '#ffc857', fillOpacity: 0.62 }, candidateLabel(hotspot, index));
      overviewBounds.extend(position);
      if (selected) focusBounds.extend(position);
    });
    places.forEach((place) => {
      const position = { lat: place.lat, lng: place.lng };
      const colors = placeColors(place.category);
      const circle = this.addCircle(position, { radius: 62, strokeColor: colors.stroke, strokeOpacity: 0.95, strokeWeight: 1, fillColor: colors.fill, fillOpacity: 0.88 }, placePopupHtml(place));
      this.placeLayers.set(String(place.id), { circle, position, html: placePopupHtml(place) });
      if (focusCandidate) focusBounds.extend(position); else overviewBounds.extend(position);
    });
    if (focusCandidate && !focusBounds.isEmpty()) this.map.fitBounds(focusBounds, 58);
    else if (!overviewBounds.isEmpty()) this.map.fitBounds(overviewBounds, 44);
  }

  focusPlace(placeId) {
    const item = this.placeLayers.get(String(placeId));
    if (!item || !this.map) return;
    this.map.panTo(item.position);
    this.map.setZoom(Math.max(this.map.getZoom() || 0, 16));
    this.infoWindow?.setContent(item.html);
    this.infoWindow?.setPosition(item.position);
    this.infoWindow?.open({ map: this.map });
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.setMap(null));
    this.layers = [];
    this.placeLayers.clear();
  }
  destroy() {
    this.destroyed = true;
    this.clearLayers();
    this.map = null;
    this.pendingRender = null;
    if (this.container) this.container.innerHTML = '';
  }
}

class KakaoMeetingMap {
  map = null;
  layers = [];
  placeLayers = new Map();
  container = null;
  pendingRender = null;
  destroyed = false;
  fallback = null;
  elementId = '';
  initial = null;

  constructor(elementId, initial) {
    this.elementId = elementId;
    this.initial = initial;
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    bindPopupActions(this.container);
    this.container.innerHTML = `<div class="map-unavailable"><span class="spinner"></span><strong>${t('map.loading')}</strong></div>`;
    void loadKakaoMaps().then(() => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = '';
      this.map = new window.kakao.maps.Map(this.container, { center: new window.kakao.maps.LatLng(initial.lat, initial.lng), level: 8 });
      this.map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);
      if (this.pendingRender) {
        const pending = this.pendingRender;
        this.pendingRender = null;
        this.render(pending.participants, pending.center, pending.places, pending.hotspots, pending.options);
      }
    }).catch((error) => {
      if (this.destroyed || !this.container) return;
      console.warn('[EO?JUNGAN] Kakao map unavailable; falling back to OpenStreetMap.', error);
      this.container.innerHTML = `<div class="map-unavailable"><strong>Kakao Maps 연결 실패 · OpenStreetMap으로 전환합니다.</strong><span>${escape(error instanceof Error ? error.message : t('map.network'))}</span></div>`;
      window.setTimeout(() => {
        if (this.destroyed || !this.container) return;
        this.fallback = new LeafletMeetingMap(this.elementId, this.initial);
        if (this.pendingRender) {
          const pending = this.pendingRender;
          this.pendingRender = null;
          this.fallback.render(pending.participants, pending.center, pending.places, pending.hotspots, pending.options);
        }
      }, 450);
    });
  }

  addCircle(position, options, html) {
    const kakao = window.kakao;
    const location = new kakao.maps.LatLng(position.lat, position.lng);
    const circle = new kakao.maps.Circle({ center: location, radius: options.radius, strokeWeight: options.strokeWeight || 2, strokeColor: options.strokeColor, strokeOpacity: options.strokeOpacity ?? 1, fillColor: options.fillColor, fillOpacity: options.fillOpacity ?? 0.8 });
    circle.setMap(this.map);
    const info = new kakao.maps.InfoWindow({ content: `<div class="kakao-info-shell">${html}</div>`, removable: true });
    kakao.maps.event.addListener(circle, 'click', () => { info.setPosition(location); info.open(this.map); });
    this.layers.push(circle);
    return { location, circle, info };
  }

  render(participants, center, places = [], hotspots = [], options = {}) {
    if (this.fallback) return this.fallback.render(participants, center, places, hotspots, options);
    if (!this.map || !window.kakao?.maps) {
      this.pendingRender = { participants, center, places, hotspots, options };
      return;
    }
    this.clearLayers();
    const overviewBounds = new window.kakao.maps.LatLngBounds();
    const focusBounds = new window.kakao.maps.LatLngBounds();
    const focusCandidate = options.focusCandidate || null;

    participants.forEach((participant) => {
      const item = this.addCircle(participant, { radius: participant.isHost ? 110 : 85, strokeColor: participant.isHost ? '#5949e8' : '#198e73', strokeWeight: 3, fillColor: participant.isHost ? '#7c6dfc' : '#33b892', fillOpacity: focusCandidate ? 0.35 : 0.85 }, `<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}`);
      overviewBounds.extend(item.location);
    });
    if (center) {
      const item = this.addCircle(center, { radius: 120, strokeColor: '#b33a1f', strokeWeight: 2, fillColor: '#ff795c', fillOpacity: focusCandidate ? 0.18 : 0.7 }, `<strong>${t('map.center')}</strong>`);
      overviewBounds.extend(item.location);
    }
    hotspots.forEach((hotspot, index) => {
      const selected = Boolean(focusCandidate && hotspot.id === focusCandidate.id);
      if (selected) this.addCircle(hotspot, { radius: 1100, strokeColor: '#e0553e', strokeWeight: 2, strokeOpacity: 0.55, fillColor: '#ff795c', fillOpacity: 0.06 }, candidateLabel(hotspot, index));
      const item = this.addCircle(hotspot, { radius: selected ? 240 : 180, strokeColor: selected ? '#b33a1f' : '#c58a13', strokeWeight: selected ? 4 : 3, fillColor: selected ? '#ff795c' : '#ffc857', fillOpacity: 0.62 }, candidateLabel(hotspot, index));
      overviewBounds.extend(item.location);
      if (selected) focusBounds.extend(item.location);
    });
    places.forEach((place) => {
      const colors = placeColors(place.category);
      const item = this.addCircle(place, { radius: 64, strokeColor: colors.stroke, strokeWeight: 1, fillColor: colors.fill, fillOpacity: 0.88 }, placePopupHtml(place));
      this.placeLayers.set(String(place.id), item);
      if (focusCandidate) focusBounds.extend(item.location); else overviewBounds.extend(item.location);
    });
    if (focusCandidate && !focusBounds.isEmpty()) this.map.setBounds(focusBounds, 64, 64, 64, 64);
    else if (!overviewBounds.isEmpty()) this.map.setBounds(overviewBounds, 48, 48, 48, 48);
  }

  focusPlace(placeId) {
    if (this.fallback) return this.fallback.focusPlace(placeId);
    const item = this.placeLayers.get(String(placeId));
    if (!item || !this.map) return;
    this.map.panTo(item.location);
    this.map.setLevel(Math.min(this.map.getLevel(), 4));
    item.info.open(this.map);
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.setMap(null));
    this.layers = [];
    this.placeLayers.clear();
  }
  destroy() {
    this.destroyed = true;
    this.fallback?.destroy();
    this.fallback = null;
    this.clearLayers();
    this.map = null;
    this.pendingRender = null;
    if (this.container) this.container.innerHTML = '';
  }
}

export class MeetingMap {
  adapter;
  constructor(elementId, initial = { lat: 37.5665, lng: 126.978 }) {
    this.adapter = isKakaoMapsConfigured
      ? new KakaoMeetingMap(elementId, initial)
      : isGoogleMapsConfigured
        ? new GoogleMeetingMap(elementId, initial)
        : new LeafletMeetingMap(elementId, initial);
  }
  render(participants, center, places = [], hotspots = [], options = {}) {
    this.adapter?.render(participants, center, places, hotspots, options);
  }
  focusPlace(placeId) {
    this.adapter?.focusPlace?.(placeId);
  }
  destroy() { this.adapter?.destroy(); }
}
