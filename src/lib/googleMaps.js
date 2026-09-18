import { APP_CONFIG, isGoogleMapsConfigured } from '../config.js';
import { getLanguage } from '../i18n.js';

let loaderPromise = null;

export function loadGoogleMaps() {
  if (!isGoogleMapsConfigured) return Promise.reject(new Error('Google Maps API key is not configured.'));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = `__meetHalfwayGoogleMapsReady_${Date.now()}`;
    const params = new URLSearchParams({
      key: APP_CONFIG.googleMapsApiKey,
      v: 'weekly',
      loading: 'async',
      callback: callbackName,
      language: getLanguage()
    });
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.meetHalfwayGoogleMaps = 'true';
    const timer = window.setTimeout(() => {
      delete window[callbackName];
      script.remove();
      reject(new Error('Google Maps load timeout.'));
    }, 12000);
    window[callbackName] = () => {
      window.clearTimeout(timer);
      delete window[callbackName];
      if (window.google?.maps?.importLibrary) resolve(window.google.maps);
      else reject(new Error('Google Maps did not initialize.'));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      delete window[callbackName];
      reject(new Error('Google Maps failed to load.'));
    };
    document.head.append(script);
  });

  return loaderPromise;
}
