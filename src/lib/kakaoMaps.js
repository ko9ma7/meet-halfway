import { APP_CONFIG, isKakaoMapsConfigured } from '../config.js';

let loaderPromise = null;

export function loadKakaoMaps() {
  if (!isKakaoMapsConfigured) return Promise.reject(new Error('Kakao Maps JavaScript key is not configured.'));
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-meet-halfway-kakao]');
    if (existing) {
      const timer = window.setTimeout(() => reject(new Error('Kakao Maps load timeout.')), 12000);
      const wait = () => {
        if (window.kakao?.maps?.load) {
          window.clearTimeout(timer);
          window.kakao.maps.load(() => resolve(window.kakao.maps));
        } else window.setTimeout(wait, 50);
      };
      wait();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(APP_CONFIG.kakaoMapsJavaScriptKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.dataset.meetHalfwayKakao = 'true';
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error('Kakao Maps load timeout.'));
    }, 12000);
    script.onload = () => {
      window.clearTimeout(timer);
      if (!window.kakao?.maps?.load) {
        reject(new Error('Kakao Maps did not initialize.'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Kakao Maps failed to load.'));
    };
    document.head.append(script);
  });

  return loaderPromise;
}
