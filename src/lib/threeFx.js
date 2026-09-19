const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
let threePromise = null;

function loadThree() {
  if (!threePromise) threePromise = import(THREE_CDN);
  return threePromise;
}

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function geoOffsets(center, hotspot) {
  const radians = (Number(center.lat) || 0) * Math.PI / 180;
  const dx = (Number(hotspot.lng) - Number(center.lng)) * 111.32 * Math.cos(radians);
  const dz = (Number(hotspot.lat) - Number(center.lat)) * 110.57;
  return { x: dx, z: -dz, distance: Math.hypot(dx, dz) };
}

function shortLabel(value, fallback) {
  const text = String(value || fallback || '').trim();
  if (text.length <= 15) return text;
  return `${text.slice(0, 14)}…`;
}

export function mountRecommendationScene(container, { center, hotspots, selectedIndex, onSelect, labels = {} } = {}) {
  if (!container || !center || !Array.isArray(hotspots) || hotspots.length === 0) return { destroy() {} };

  let destroyed = false;
  let renderer = null;
  let resizeObserver = null;
  let animationFrame = 0;
  let pointerMoveHandler = null;
  let pointerDownHandler = null;
  let labelButtons = [];
  let candidateGroups = [];
  let midpointGroup = null;
  let scene = null;
  let camera = null;
  let raycaster = null;
  let pointer = null;
  let width = 1;
  let height = 1;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  container.innerHTML = `
    <div class="three-point-stage" aria-hidden="true">
      <canvas class="three-point-canvas"></canvas>
      <div class="three-point-glow"></div>
    </div>
    <div class="three-point-labels" aria-label="${String(labels.title || 'Recommendation checkpoints').replaceAll('"', '&quot;')}">
      ${hotspots.map((hotspot, index) => {
        const selected = selectedIndex === index;
        const name = shortLabel(hotspot.areaLabel || hotspot.areaName, `${labels.pick || 'Pick'} ${index + 1}`);
        return `<button type="button" class="three-point-label ${selected ? 'is-selected' : ''}" data-three-label-index="${index}" aria-pressed="${selected}"><span>${labels.pick || '추천'} ${index + 1}</span><strong>${name}</strong><i aria-hidden="true">${selected ? '✓' : index + 1}</i></button>`;
      }).join('')}
    </div>
    <div class="three-point-copy">
      <span class="three-live-badge"><i></i>Three.js</span>
      <div><strong>${labels.title || '중간점 중심 추천 포인트'}</strong><small>${labels.hint || '빛나는 포인트를 눌러 추천지역을 선택하거나 해제하세요.'}</small></div>
    </div>`;

  labelButtons = [...container.querySelectorAll('[data-three-label-index]')];
  labelButtons.forEach((button) => button.addEventListener('click', () => onSelect?.(Number(button.dataset.threeLabelIndex))));

  if (!webglAvailable()) {
    container.classList.add('is-three-fallback');
    return { destroy() { destroyed = true; } };
  }

  void loadThree().then((THREE) => {
    if (destroyed) return;
    const canvas = container.querySelector('.three-point-canvas');
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 5.4, 7.4);
    camera.lookAt(0, 0.45, 0);

    const primary = new THREE.Color(cssColor('--primary', '#6d5dfc'));
    const accent = new THREE.Color(cssColor('--accent', '#27a785'));
    const warning = new THREE.Color('#f4b63b');
    const text = new THREE.Color(cssColor('--text', '#1d2330'));
    const candidateColors = [primary, accent, warning];

    scene.add(new THREE.HemisphereLight(0xffffff, text, 1.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.35);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.PointLight(primary, 18, 15, 2);
    rim.position.set(-3, 3, -2);
    scene.add(rim);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.5, 0.16, 96),
      new THREE.MeshPhysicalMaterial({ color: text, transparent: true, opacity: 0.055, roughness: 0.55, metalness: 0.12, clearcoat: 0.35 })
    );
    platform.position.y = -0.08;
    platform.receiveShadow = true;
    scene.add(platform);

    [1.05, 1.9, 2.75].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.018, 128),
        new THREE.MeshBasicMaterial({ color: index === 2 ? accent : primary, transparent: true, opacity: index === 2 ? 0.16 : 0.11, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      scene.add(ring);
    });

    const spokes = hotspots.map((hotspot) => geoOffsets(center, hotspot));
    const maxDistance = Math.max(...spokes.map((item) => item.distance), 0.25);
    const scale = Math.min(2.7 / maxDistance, 4.2);

    midpointGroup = new THREE.Group();
    const midpointBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.5, 0.18, 48),
      new THREE.MeshPhysicalMaterial({ color: primary, roughness: 0.24, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 })
    );
    midpointBase.position.y = 0.1;
    midpointBase.castShadow = true;
    midpointGroup.add(midpointBase);

    const midpointOrb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.31, 3),
      new THREE.MeshPhysicalMaterial({ color: primary, emissive: primary, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.12, transmission: 0.12, thickness: 0.55, clearcoat: 1 })
    );
    midpointOrb.position.y = 0.62;
    midpointOrb.castShadow = true;
    midpointGroup.add(midpointOrb);

    const midpointRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.49, 0.035, 18, 72),
      new THREE.MeshBasicMaterial({ color: warning, transparent: true, opacity: 0.82 })
    );
    midpointRing.rotation.x = Math.PI / 2;
    midpointRing.position.y = 0.61;
    midpointGroup.add(midpointRing);
    midpointGroup.userData.orb = midpointOrb;
    midpointGroup.userData.ring = midpointRing;
    scene.add(midpointGroup);

    const candidateObjects = [];
    hotspots.slice(0, 3).forEach((hotspot, index) => {
      const pos = spokes[index];
      const group = new THREE.Group();
      const color = candidateColors[index % candidateColors.length].clone();
      const isSelected = selectedIndex === index;
      group.position.set(pos.x * scale, 0, pos.z * scale);
      group.userData.basePosition = group.position.clone();
      group.userData.candidateIndex = index;
      group.userData.phase = index * 1.7;

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.055, 0),
        new THREE.Vector3(group.position.x, 0.055, group.position.z)
      ]);
      const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: isSelected ? 0.72 : 0.26 }));
      scene.add(line);

      const pedestalHeight = 0.28 + (3 - index) * 0.06;
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.43, pedestalHeight, 40),
        new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.34, clearcoat: 0.95, clearcoatRoughness: 0.16, transparent: true, opacity: isSelected ? 1 : 0.82 })
      );
      pedestal.position.y = pedestalHeight / 2;
      pedestal.castShadow = true;
      pedestal.userData.candidateIndex = index;
      group.add(pedestal);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(isSelected ? 0.34 : 0.29, 40, 26),
        new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: isSelected ? 0.5 : 0.12, roughness: 0.1, metalness: 0.16, clearcoat: 1, transmission: 0.08, thickness: 0.35 })
      );
      orb.position.y = pedestalHeight + 0.35;
      orb.castShadow = true;
      orb.userData.candidateIndex = index;
      group.add(orb);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(isSelected ? 0.51 : 0.43, isSelected ? 0.045 : 0.026, 16, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isSelected ? 0.9 : 0.42 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = orb.position.y;
      ring.userData.candidateIndex = index;
      group.add(ring);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(isSelected ? 0.62 : 0.48, isSelected ? 0.72 : 0.54, 72),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isSelected ? 0.17 : 0.07, side: THREE.DoubleSide, depthWrite: false })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.025;
      halo.userData.candidateIndex = index;
      group.add(halo);

      group.userData.orb = orb;
      group.userData.ring = ring;
      group.userData.halo = halo;
      group.traverse((object) => {
        if (object.isMesh) {
          object.userData.candidateIndex = index;
          candidateObjects.push(object);
        }
      });
      scene.add(group);
      candidateGroups.push(group);
    });

    const particles = [];
    for (let i = 0; i < 90; i += 1) {
      const angle = (i / 90) * Math.PI * 2 * 7.3;
      const radius = 0.5 + (i / 90) * 3.0;
      particles.push(Math.cos(angle) * radius, 0.12 + (i % 7) * 0.013, Math.sin(angle) * radius);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
    const pointCloud = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: primary, size: 0.035, transparent: true, opacity: 0.27, sizeAttenuation: true }));
    scene.add(pointCloud);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    let targetCameraX = 0;
    let targetCameraY = 5.4;

    const resize = () => {
      if (!renderer || !camera || destroyed) return;
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(230, Math.min(390, rect.width * 0.36));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderFrame(performance.now());
    };

    const positionLabels = () => {
      if (!camera) return;
      candidateGroups.forEach((group, index) => {
        const button = labelButtons[index];
        if (!button) return;
        const v = group.position.clone();
        v.y = group.userData.orb.position.y + 0.5;
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        button.style.setProperty('--label-x', `${x}px`);
        button.style.setProperty('--label-y', `${y}px`);
      });
    };

    const renderFrame = (time) => {
      if (!renderer || !scene || !camera || destroyed) return;
      const seconds = time * 0.001;
      if (!reduceMotion) {
        midpointGroup.rotation.y = seconds * 0.28;
        midpointGroup.userData.ring.rotation.z = seconds * 0.72;
        const midpointPulse = 1 + Math.sin(seconds * 2.15) * 0.045;
        midpointGroup.userData.orb.scale.setScalar(midpointPulse);
        candidateGroups.forEach((group, index) => {
          const base = group.userData.basePosition;
          group.position.x = base.x;
          group.position.z = base.z;
          group.position.y = Math.sin(seconds * 1.3 + group.userData.phase) * 0.045;
          group.userData.ring.rotation.z = seconds * (index % 2 ? -0.48 : 0.48);
          if (selectedIndex === index) {
            const pulse = 1 + Math.sin(seconds * 2.4) * 0.06;
            group.userData.halo.scale.setScalar(pulse);
          }
        });
        pointCloud.rotation.y = seconds * 0.025;
        camera.position.x += (targetCameraX - camera.position.x) * 0.035;
        camera.position.y += (targetCameraY - camera.position.y) * 0.035;
        camera.lookAt(0, 0.45, 0);
      }
      renderer.render(scene, camera);
      positionLabels();
      if (!reduceMotion) animationFrame = requestAnimationFrame(renderFrame);
    };

    pointerMoveHandler = (event) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.set(nx, ny);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(candidateObjects, false);
      canvas.style.cursor = hits.length ? 'pointer' : 'default';
      if (!reduceMotion) {
        targetCameraX = nx * 0.28;
        targetCameraY = 5.4 + ny * 0.12;
      }
    };

    pointerDownHandler = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(candidateObjects, false)[0];
      const index = Number(hit?.object?.userData?.candidateIndex);
      if (Number.isInteger(index)) onSelect?.(index);
    };

    canvas.addEventListener('pointermove', pointerMoveHandler, { passive: true });
    canvas.addEventListener('pointerdown', pointerDownHandler);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    container.classList.add('is-three-ready');
    resize();
    if (!reduceMotion) animationFrame = requestAnimationFrame(renderFrame);
  }).catch(() => {
    if (!destroyed) container.classList.add('is-three-fallback');
  });

  return {
    destroy() {
      destroyed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      const canvas = container.querySelector('.three-point-canvas');
      if (canvas && pointerMoveHandler) canvas.removeEventListener('pointermove', pointerMoveHandler);
      if (canvas && pointerDownHandler) canvas.removeEventListener('pointerdown', pointerDownHandler);
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss?.();
      }
      scene?.traverse?.((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      container.innerHTML = '';
    }
  };
}
