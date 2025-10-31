// animateRotation.js

/** Easing（可换任意你喜欢的）：easeInOutCubic */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  t = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - t, 3);
}

export function makeAnimator(ctx) {
  const {
    THREE,
    poseGroup,
    worldBox,
    boxHelper,
    AABBParams,         // { rotAnimation, duration }
    render,             // () => { renderer.render(scene, camera); … }
  } = ctx;

  function measuredAABB_fromBox3_toOverlay(box3, camera, overlayCanvas) {
    const { min, max } = box3;
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];

    let minX = +Infinity, maxX = -Infinity, minY = +Infinity, maxY = -Infinity;
    const v = new THREE.Vector3();

    const W = overlayCanvas.width;   // device px (already DPR-scaled)
    const H = overlayCanvas.height;

    const toPxX = xNdc => (xNdc * 0.5 + 0.5) * W;
    const toPxY = yNdc => (1 - (yNdc * 0.5 + 0.5)) * H;

    for (const p of corners) {
      v.copy(p).project(camera);
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }

    const x0 = toPxX(minX), x1 = toPxX(maxX);
    const y0 = toPxY(maxY), y1 = toPxY(minY);

    const rect = { x: x0, y: y0, w: (x1 - x0), h: (y1 - y0) };
    const wh = rect.w / rect.h;
    return { rect, wh };
  }

  // Compute the zoom needed to fit Box3 to a target on-screen width (CSS px)
  function fitCameraAABBWidthPx({
    box3, camera, overlayCanvas, targetPx, clamp = [0.1, 1000], apply = true
  }) {
    const dpr = overlayCanvas.width / overlayCanvas.clientWidth || window.devicePixelRatio || 1;
    const targetPx_device = targetPx * dpr;

    const m1 = measuredAABB_fromBox3_toOverlay(box3, camera, overlayCanvas);
    const w1 = m1.rect.w; // device px
    if (w1 <= 0 || !isFinite(w1)) return false;

    const s = targetPx_device / w1;
    const newZoom = THREE.MathUtils.clamp(camera.zoom * s, clamp[0], clamp[1]);
    if (!isFinite(newZoom) || newZoom <= 0) return false;

    let m2;
    if (apply) {
      camera.zoom = newZoom;
      camera.updateProjectionMatrix();
      m2 = measuredAABB_fromBox3_toOverlay(box3, camera, overlayCanvas);
    } else {
      const old = camera.zoom;
      camera.zoom = newZoom;
      camera.updateProjectionMatrix();
      m2 = measuredAABB_fromBox3_toOverlay(box3, camera, overlayCanvas);
      camera.zoom = old;
      camera.updateProjectionMatrix();
    }
    return Object.assign(m2, { finalZoom: newZoom });
  }

  let _animRAF = null;
  let _animCancel = null;

  function cancel() {
    if (_animCancel) { _animCancel(); _animCancel = null; }
    if (_animRAF) { cancelAnimationFrame(_animRAF); _animRAF = null; }
  }

  function animateRotation({
    offsetYawDeg = -15,
    offsetPitchDeg = 15,
    onFrame
  } = {}) {
    if (AABBParams.rotAnimation !== true) return;
    cancel();

    const startTime = performance.now();
    let stopped = false;
    _animCancel = () => { stopped = true; };

    const qEnd = poseGroup.getWorldQuaternion(new THREE.Quaternion());
    const qYawOff = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(offsetYawDeg));
    const qPitchOff = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(offsetPitchDeg));
    const qStartWorld = qYawOff.multiply(qPitchOff).multiply(qEnd).normalize();

    if (poseGroup.parent) {
      const qParentWorld = poseGroup.parent.getWorldQuaternion(new THREE.Quaternion());
      const qParentInv = qParentWorld.invert();
      const qStartLocal = qParentInv.multiply(qStartWorld);
      poseGroup.quaternion.copy(qStartLocal);
    } else {
      poseGroup.quaternion.copy(qStartWorld);
    }
    poseGroup.updateMatrixWorld(true);

    function frame(now) {
      if (stopped) return;

      const t = Math.min(1, (now - startTime) / (AABBParams.duration * 1000));
      const k = easeOutCubic ? easeOutCubic(t) : t;

      const qCurWorld = new THREE.Quaternion();
      THREE.Quaternion.slerp(qStartWorld, qEnd, qCurWorld, k);

      if (poseGroup.parent) {
        const qParentWorld2 = poseGroup.parent.getWorldQuaternion(new THREE.Quaternion());
        const qParentInv2 = qParentWorld2.invert();
        const qLocal = qParentInv2.multiply(qCurWorld);
        poseGroup.quaternion.copy(qLocal);
      } else {
        poseGroup.quaternion.copy(qCurWorld);
      }

      poseGroup.updateMatrixWorld(true);
      worldBox.setFromObject(poseGroup);
      boxHelper.box.copy(worldBox);
      boxHelper.updateMatrixWorld(true);

      if (typeof render === 'function') render();
      if (onFrame) onFrame(k);

      if (t < 1) {
        _animRAF = requestAnimationFrame(frame);
      } else {
        _animRAF = null;
        _animCancel = null;
      }
    }

    _animRAF = requestAnimationFrame(frame);
  }

  function runPoseAndZoomAnimation({
    worldBox,
    camera,
    overlayCanvas,
    targetPx,
    clamp = [0.1, 5000],
    zoomBehavior = true,
    startFactor = 0.5,
    zoomEase = (k) => k,
    rotationOpts = {}
  }) {
    const measured = fitCameraAABBWidthPx({
      box3: worldBox,
      camera,
      overlayCanvas,
      targetPx,
      clamp,
      apply: false
    });

    if (!measured || !isFinite(measured.finalZoom) || measured.finalZoom <= 0) {
      // No valid final zoom: only rotate if rotation is enabled
      if (AABBParams.rotAnimation === true) animateRotation(rotationOpts);
      return measured;
    }

    const zEnd = measured.finalZoom;

    // ----- SNAP (no zoom animation) -----
    if (zoomBehavior === false) {
      camera.zoom = zEnd;
      camera.updateProjectionMatrix();
      // Render immediately so the snap is visible even if rotation is off
      if (typeof render === 'function') render();

      if (AABBParams.rotAnimation === true) {
        animateRotation(rotationOpts);
      }
      return measured;
    }

    // ----- ANIMATE ZOOM -----
    const zStart = THREE.MathUtils.clamp(zEnd * startFactor, 1e-6, 1e9);

    if (AABBParams.rotAnimation === true) {
      // Drive via rotation's RAF
      camera.zoom = zStart;
      camera.updateProjectionMatrix();
      if (typeof render === 'function') render();

      animateRotation({
        ...rotationOpts,
        onFrame: (k) => {
          const kk = zoomEase ? zoomEase(k) : k;
          const z = THREE.MathUtils.lerp(zStart, zEnd, kk);
          camera.zoom = z;
          camera.updateProjectionMatrix();
          if (typeof render === 'function') render();
          rotationOpts.onFrame && rotationOpts.onFrame(k);
        }
      });
    } else {
      // Rotation is OFF → run a zoom-only RAF so targetPx still applies
      let start = null;
      const durMs = (AABBParams.duration || 0.8) * 1000; // fallback duration

      function tick(ts) {
        if (start == null) start = ts;
        const t = Math.min(1, (ts - start) / durMs);
        const kk = zoomEase ? zoomEase(t) : t;
        const z = THREE.MathUtils.lerp(zStart, zEnd, kk);
        camera.zoom = z;
        camera.updateProjectionMatrix();
        if (typeof render === 'function') render();
        if (t < 1) requestAnimationFrame(tick);
      }

      // Start zoom-only animation (or snap to start then animate)
      camera.zoom = zStart;
      camera.updateProjectionMatrix();
      if (typeof render === 'function') render();
      requestAnimationFrame(tick);
    }

    return measured;
  }

  // API
  animateRotation.cancel = cancel;
  return { animateRotation, runPoseAndZoomAnimation, cancel };
}
