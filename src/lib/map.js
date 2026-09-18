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
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function placeLabel(place) {
  const category = place.category === 'cafe' ? t('results.categoryCafe')
    : place.category === 'fast_food' ? t('results.categoryQuick')
      : place.category === 'bar' ? t('results.categoryBar')
        : t('results.categoryRestaurant');
  return `<strong>${escape(place.name)}</strong><br><small>${escape(category)}${place.cuisine ? ` · ${escape(place.cuisine)}` : ''}</small>${place.address ? `<br><small>${escape(place.address)}</small>` : ''}`;
}

function placeColors(category) {
  if (category === 'cafe') return { stroke: '#6841c4', fill: '#8e67e8' };
  if (category === 'fast_food') return { stroke: '#18745b', fill: '#32a67e' };
  if (category === 'bar') return { stroke: '#2f5d9b', fill: '#4e86cf' };
  return { stroke: '#9a6515', fill: '#f0b433' };
}

function candidateLabel(hotspot, index) {
  const name = hotspot.areaName || t('results.candidate', { n: index + 1 });
  return `<strong>${escape(t('map.recommendation', { n: index + 1 }))} · ${escape(name)}</strong><br>${escape(t('results.placeCluster', { count: hotspot.placeCount || hotspot.restaurantCount || 0 }))}`;
}

class LeafletMeetingMap {
  map = null;
  layers = [];
  container = null;
  pendingRender = null;
  destroyed = false;

  constructor(elementId, initial) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    this.container.innerHTML = `<div class="map-unavailable"><span class="spinner"></span><strong>${t('map.loading')}</strong></div>`;
    void loadLeaflet().then((L) => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = '';
      this.map = L.map(elementId, { zoomControl: true, scrollWheelZoom: false }).setView([initial.lat, initial.lng], 11);
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
        fillOpacity: focusCandidate ? 0.52 : 0.95
      }).addTo(this.map);
      marker.bindPopup(`<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}${participant.isHost ? `<br><small>${t('meeting.host')}</small>` : ''}`);
      if (!focusCandidate) marker.bindTooltip(`${index + 1}. ${escape(participant.name)}`, { direction: 'top', offset: [0, -6] });
      this.layers.push(marker);
      overviewBounds.extend([participant.lat, participant.lng]);
    });

    if (center) {
      const marker = L.circleMarker([center.lat, center.lng], { radius: 8, weight: 2, dashArray: '4 4', color: '#b33a1f', fillColor: '#ff795c', fillOpacity: focusCandidate ? 0.35 : 0.82 }).addTo(this.map);
      marker.bindPopup(`<strong>${t('map.center')}</strong><br><small>${t('results.algorithm')}</small>`);
      this.layers.push(marker);
      overviewBounds.extend([center.lat, center.lng]);
    }

    hotspots.forEach((hotspot, index) => {
      const selected = Boolean(focusCandidate && hotspot.id === focusCandidate.id);
      if (selected) {
        const area = L.circle([hotspot.lat, hotspot.lng], {
          radius: 950,
          weight: 2,
          color: '#e0553e',
          fillColor: '#ff795c',
          fillOpacity: 0.08
        }).addTo(this.map);
        this.layers.push(area);
      }
      const marker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: selected ? 18 : 13,
        weight: selected ? 4 : 3,
        color: selected ? '#b33a1f' : '#c58a13',
        fillColor: selected ? '#ff795c' : '#ffc857',
        fillOpacity: 0.88
      }).addTo(this.map);
      marker.bindPopup(candidateLabel(hotspot, index));
      marker.bindTooltip(`${index + 1}. ${escape(hotspot.areaName || t('results.candidate', { n: index + 1 }))}`, { permanent: selected, direction: 'top', offset: [0, -11], className: selected ? 'map-label map-label--selected' : 'map-label' });
      this.layers.push(marker);
      overviewBounds.extend([hotspot.lat, hotspot.lng]);
      if (selected) focusBounds.extend([hotspot.lat, hotspot.lng]);
    });

    places.forEach((place) => {
      const colors = placeColors(place.category);
      const marker = L.circleMarker([place.lat, place.lng], { radius: 6, weight: 1.5, color: colors.stroke, fillColor: colors.fill, fillOpacity: 0.9 }).addTo(this.map);
      marker.bindPopup(placeLabel(place));
      marker.bindTooltip(escape(place.name), { direction: 'top', offset: [0, -4] });
      this.layers.push(marker);
      if (focusCandidate) focusBounds.extend([place.lat, place.lng]);
      else overviewBounds.extend([place.lat, place.lng]);
    });

    if (focusCandidate && focusBounds.isValid()) this.map.fitBounds(focusBounds.pad(0.18), { maxZoom: 15 });
    else if (overviewBounds.isValid()) this.map.fitBounds(overviewBounds.pad(0.2), { maxZoom: 12 });
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.remove());
    this.layers = [];
  }

  destroy() {
    this.destroyed = true;
    this.map?.remove();
    this.map = null;
    this.pendingRender = null;
  }
}

class GoogleMeetingMap {
  map = null;
  layers = [];
  infoWindow = null;
  container = null;
  pendingRender = null;
  destroyed = false;

  constructor(elementId, initial) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
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
      if (selected) this.addCircle(position, { radius: 950, strokeColor: '#e0553e', strokeOpacity: 0.55, strokeWeight: 2, fillColor: '#ff795c', fillOpacity: 0.06 }, candidateLabel(hotspot, index));
      this.addCircle(position, { radius: selected ? 240 : 180, strokeColor: selected ? '#b33a1f' : '#c58a13', strokeOpacity: 1, strokeWeight: selected ? 4 : 3, fillColor: selected ? '#ff795c' : '#ffc857', fillOpacity: 0.62 }, candidateLabel(hotspot, index));
      overviewBounds.extend(position);
      if (selected) focusBounds.extend(position);
    });
    places.forEach((place) => {
      const position = { lat: place.lat, lng: place.lng };
      const colors = placeColors(place.category);
      this.addCircle(position, { radius: 55, strokeColor: colors.stroke, strokeOpacity: 0.95, strokeWeight: 1, fillColor: colors.fill, fillOpacity: 0.82 }, placeLabel(place));
      if (focusCandidate) focusBounds.extend(position); else overviewBounds.extend(position);
    });
    if (focusCandidate && !focusBounds.isEmpty()) this.map.fitBounds(focusBounds, 58);
    else if (!overviewBounds.isEmpty()) this.map.fitBounds(overviewBounds, 44);
  }

  clearLayers() { this.layers.forEach((layer) => layer.setMap(null)); this.layers = []; }
  destroy() { this.destroyed = true; this.clearLayers(); this.map = null; this.pendingRender = null; if (this.container) this.container.innerHTML = ''; }
}

class KakaoMeetingMap {
  map = null;
  layers = [];
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
      console.warn('[MeetHalfway] Kakao map unavailable; falling back to OpenStreetMap.', error);
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
    const info = new kakao.maps.InfoWindow({ content: `<div style="min-width:170px;padding:9px 10px;line-height:1.45">${html}</div>`, removable: true });
    kakao.maps.event.addListener(circle, 'click', () => { info.setPosition(location); info.open(this.map); });
    this.layers.push(circle);
    return location;
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
      const position = { lat: participant.lat, lng: participant.lng };
      overviewBounds.extend(this.addCircle(position, { radius: participant.isHost ? 110 : 85, strokeColor: participant.isHost ? '#5949e8' : '#198e73', strokeWeight: 3, fillColor: participant.isHost ? '#7c6dfc' : '#33b892', fillOpacity: focusCandidate ? 0.35 : 0.85 }, `<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}`));
    });
    if (center) {
      overviewBounds.extend(this.addCircle(center, { radius: 120, strokeColor: '#b33a1f', strokeWeight: 2, fillColor: '#ff795c', fillOpacity: focusCandidate ? 0.18 : 0.7 }, `<strong>${t('map.center')}</strong>`));
    }
    hotspots.forEach((hotspot, index) => {
      const selected = Boolean(focusCandidate && hotspot.id === focusCandidate.id);
      if (selected) this.addCircle(hotspot, { radius: 950, strokeColor: '#e0553e', strokeWeight: 2, strokeOpacity: 0.55, fillColor: '#ff795c', fillOpacity: 0.06 }, candidateLabel(hotspot, index));
      const location = this.addCircle(hotspot, { radius: selected ? 240 : 180, strokeColor: selected ? '#b33a1f' : '#c58a13', strokeWeight: selected ? 4 : 3, fillColor: selected ? '#ff795c' : '#ffc857', fillOpacity: 0.62 }, candidateLabel(hotspot, index));
      overviewBounds.extend(location);
      if (selected) focusBounds.extend(location);
    });
    places.forEach((place) => {
      const colors = placeColors(place.category);
      const location = this.addCircle(place, { radius: 55, strokeColor: colors.stroke, strokeWeight: 1, fillColor: colors.fill, fillOpacity: 0.82 }, placeLabel(place));
      if (focusCandidate) focusBounds.extend(location); else overviewBounds.extend(location);
    });
    if (focusCandidate && !focusBounds.isEmpty()) this.map.setBounds(focusBounds, 64, 64, 64, 64);
    else if (!overviewBounds.isEmpty()) this.map.setBounds(overviewBounds, 48, 48, 48, 48);
  }

  clearLayers() { this.layers.forEach((layer) => layer.setMap(null)); this.layers = []; }
  destroy() { this.destroyed = true; this.fallback?.destroy(); this.fallback = null; this.clearLayers(); this.map = null; this.pendingRender = null; if (this.container) this.container.innerHTML = ''; }
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
  destroy() { this.adapter?.destroy(); }
}
