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
        this.render(pending.participants, pending.center, pending.restaurants, pending.hotspots);
      }
    }).catch((error) => {
      if (this.destroyed || !this.container) return;
      this.container.innerHTML = `<div class="map-unavailable"><strong>${t('map.failed')}</strong><span>${escape(error instanceof Error ? error.message : t('map.network'))}</span></div>`;
    });
  }

  render(participants, center, restaurants = [], hotspots = []) {
    const L = window.L;
    if (!this.map || !L) {
      this.pendingRender = { participants, center, restaurants, hotspots };
      return;
    }
    this.clearLayers();
    const bounds = L.latLngBounds([]);
    participants.forEach((participant, index) => {
      const marker = L.circleMarker([participant.lat, participant.lng], {
        radius: participant.isHost ? 10 : 8,
        weight: 3,
        color: participant.isHost ? '#5949e8' : '#198e73',
        fillColor: participant.isHost ? '#7c6dfc' : '#33b892',
        fillOpacity: 0.95
      }).addTo(this.map);
      marker.bindPopup(`<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}${participant.isHost ? `<br><small>${t('meeting.host')}</small>` : ''}`);
      marker.bindTooltip(`${index + 1}. ${escape(participant.name)}`, { direction: 'top', offset: [0, -6] });
      this.layers.push(marker);
      bounds.extend([participant.lat, participant.lng]);
    });
    if (center) {
      const marker = L.circleMarker([center.lat, center.lng], { radius: 11, weight: 4, color: '#b33a1f', fillColor: '#ff795c', fillOpacity: 1 }).addTo(this.map);
      marker.bindPopup(`<strong>${t('map.center')}</strong><br><small>${t('results.algorithm')}</small>`);
      marker.bindTooltip(t('map.centerShort'), { permanent: true, direction: 'top', offset: [0, -9], className: 'map-label map-label--center' });
      this.layers.push(marker);
      bounds.extend([center.lat, center.lng]);
    }
    hotspots.forEach((hotspot, index) => {
      const marker = L.circleMarker([hotspot.lat, hotspot.lng], { radius: 16 - index * 2, weight: 3, color: '#c58a13', fillColor: '#ffc857', fillOpacity: 0.78 }).addTo(this.map);
      marker.bindPopup(`<strong>${t('map.recommendation', { n: index + 1 })}</strong><br>${t('map.restaurantCount', { count: hotspot.restaurantCount })}`);
      marker.bindTooltip(t('results.candidate', { n: index + 1 }), { direction: 'top', offset: [0, -10] });
      this.layers.push(marker);
      bounds.extend([hotspot.lat, hotspot.lng]);
    });
    restaurants.forEach((restaurant) => {
      const marker = L.circleMarker([restaurant.lat, restaurant.lng], { radius: 4, weight: 1, color: '#815f16', fillColor: '#f2b638', fillOpacity: 0.82 }).addTo(this.map);
      marker.bindPopup(`<strong>${escape(restaurant.name)}</strong>${restaurant.cuisine ? `<br><small>${escape(restaurant.cuisine)}</small>` : ''}`);
      this.layers.push(marker);
    });
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.22), { maxZoom: 15 });
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
      this.map = new Map(this.container, {
        center: initial,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false
      });
      this.infoWindow = new InfoWindow();
      if (this.pendingRender) {
        const pending = this.pendingRender;
        this.pendingRender = null;
        this.render(pending.participants, pending.center, pending.restaurants, pending.hotspots);
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

  render(participants, center, restaurants = [], hotspots = []) {
    if (!this.map || !window.google?.maps) {
      this.pendingRender = { participants, center, restaurants, hotspots };
      return;
    }
    this.clearLayers();
    const bounds = new window.google.maps.LatLngBounds();
    participants.forEach((participant) => {
      const position = { lat: participant.lat, lng: participant.lng };
      this.addCircle(position, {
        radius: participant.isHost ? 125 : 95,
        strokeColor: participant.isHost ? '#5949e8' : '#198e73',
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: participant.isHost ? '#7c6dfc' : '#33b892',
        fillOpacity: 0.9
      }, `<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}${participant.isHost ? `<br><small>${t('meeting.host')}</small>` : ''}`);
      bounds.extend(position);
    });
    if (center) {
      const position = { lat: center.lat, lng: center.lng };
      this.addCircle(position, { radius: 150, strokeColor: '#b33a1f', strokeOpacity: 1, strokeWeight: 4, fillColor: '#ff795c', fillOpacity: 0.95 }, `<strong>${t('map.center')}</strong><br><small>${t('results.algorithm')}</small>`);
      bounds.extend(position);
    }
    hotspots.forEach((hotspot, index) => {
      const position = { lat: hotspot.lat, lng: hotspot.lng };
      this.addCircle(position, { radius: 210 - index * 25, strokeColor: '#c58a13', strokeOpacity: 1, strokeWeight: 3, fillColor: '#ffc857', fillOpacity: 0.48 }, `<strong>${t('map.recommendation', { n: index + 1 })}</strong><br>${t('map.restaurantCount', { count: hotspot.restaurantCount })}`);
      bounds.extend(position);
    });
    restaurants.forEach((restaurant) => {
      const position = { lat: restaurant.lat, lng: restaurant.lng };
      this.addCircle(position, { radius: 42, strokeColor: '#815f16', strokeOpacity: 0.9, strokeWeight: 1, fillColor: '#f2b638', fillOpacity: 0.78 }, `<strong>${escape(restaurant.name)}</strong>${restaurant.cuisine ? `<br><small>${escape(restaurant.cuisine)}</small>` : ''}`);
    });
    if (!bounds.isEmpty()) this.map.fitBounds(bounds, 44);
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.setMap(null));
    this.layers = [];
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
      this.map = new window.kakao.maps.Map(this.container, {
        center: new window.kakao.maps.LatLng(initial.lat, initial.lng),
        level: 8
      });
      const zoomControl = new window.kakao.maps.ZoomControl();
      this.map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      if (this.pendingRender) {
        const pending = this.pendingRender;
        this.pendingRender = null;
        this.render(pending.participants, pending.center, pending.restaurants, pending.hotspots);
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
          this.fallback.render(pending.participants, pending.center, pending.restaurants, pending.hotspots);
        }
      }, 700);
    });
  }

  addCircle(position, options, html) {
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(position.lat, position.lng);
    const circle = new kakao.maps.Circle({
      center,
      radius: options.radius,
      strokeWeight: options.strokeWeight || 2,
      strokeColor: options.strokeColor,
      strokeOpacity: options.strokeOpacity ?? 1,
      fillColor: options.fillColor,
      fillOpacity: options.fillOpacity ?? 0.8
    });
    circle.setMap(this.map);
    const info = new kakao.maps.InfoWindow({ content: `<div style="min-width:150px;padding:9px 10px;line-height:1.45">${html}</div>`, removable: true });
    kakao.maps.event.addListener(circle, 'click', () => { info.setPosition(center); info.open(this.map); });
    this.layers.push(circle);
    return center;
  }

  render(participants, center, restaurants = [], hotspots = []) {
    if (this.fallback) {
      this.fallback.render(participants, center, restaurants, hotspots);
      return;
    }
    if (!this.map || !window.kakao?.maps) {
      this.pendingRender = { participants, center, restaurants, hotspots };
      return;
    }
    this.clearLayers();
    const bounds = new window.kakao.maps.LatLngBounds();
    participants.forEach((participant) => {
      const position = { lat: participant.lat, lng: participant.lng };
      bounds.extend(this.addCircle(position, {
        radius: participant.isHost ? 125 : 95,
        strokeColor: participant.isHost ? '#5949e8' : '#198e73',
        strokeWeight: 3,
        fillColor: participant.isHost ? '#7c6dfc' : '#33b892',
        fillOpacity: 0.9
      }, `<strong>${escape(participant.name)}</strong><br>${escape(participant.address)}${participant.isHost ? `<br><small>${t('meeting.host')}</small>` : ''}`));
    });
    if (center) {
      bounds.extend(this.addCircle(center, { radius: 150, strokeColor: '#b33a1f', strokeWeight: 4, fillColor: '#ff795c', fillOpacity: 0.95 }, `<strong>${t('map.center')}</strong><br><small>${t('results.algorithm')}</small>`));
    }
    hotspots.forEach((hotspot, index) => {
      bounds.extend(this.addCircle(hotspot, { radius: 210 - index * 25, strokeColor: '#c58a13', strokeWeight: 3, fillColor: '#ffc857', fillOpacity: 0.48 }, `<strong>${t('map.recommendation', { n: index + 1 })}</strong><br>${t('map.restaurantCount', { count: hotspot.restaurantCount })}`));
    });
    restaurants.forEach((restaurant) => {
      this.addCircle(restaurant, { radius: 42, strokeColor: '#815f16', strokeWeight: 1, fillColor: '#f2b638', fillOpacity: 0.78 }, `<strong>${escape(restaurant.name)}</strong>${restaurant.cuisine ? `<br><small>${escape(restaurant.cuisine)}</small>` : ''}`);
    });
    if (!bounds.isEmpty()) this.map.setBounds(bounds, 48, 48, 48, 48);
  }

  clearLayers() {
    this.layers.forEach((layer) => layer.setMap(null));
    this.layers = [];
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

  render(participants, center, restaurants = [], hotspots = []) {
    this.adapter?.render(participants, center, restaurants, hotspots);
  }

  destroy() {
    this.adapter?.destroy();
  }
}
