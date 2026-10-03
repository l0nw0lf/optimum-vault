import * as THREE from "three";
import { canOccupy, EYE, routeLength, SPAWN, zoneKey } from "@/game/layout";
import type { Metrics, Pt } from "@/game/types";
import { buildWorld, type SignalBuilt } from "@/game/world";

export type EngineHooks = {
  onInteract: (id: string) => void;
  onFocus: (id: string | null) => void;
  onReady: () => void;
  onFail: (message: string) => void;
};

export type EngineHandle = {
  dispose: () => void;
  setLocked: (locked: boolean) => void;
  beginOpening: (onDone: () => void) => void;
  startAudio: () => void;
  setMuted: (muted: boolean) => void;
  markAnswered: (id: string) => void;
  enterFinale: () => void;
  getMetrics: () => Metrics;
  tryInteract: () => boolean;
  finishOpening: () => void;
};

const LOOK_SENS = 0.00215;
const DRAG_SENS = 0.0046;
const TOUCH_SENS = 0.0054;
const WALK = 3.55;
const ACCEL = 16;
const FRICTION = 12;
const REACH = 8;

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPosition: () => { x: number; z: number };
      setKeys: (codes: string[]) => void;
      debugInteract?: (id: string) => void;
    };
  }
}

function approach(current: number, target: number, delta: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= delta) return target;
  return current + Math.sign(diff) * delta;
}

function signalFrom(obj: THREE.Object3D | null): string | null {
  let cursor: THREE.Object3D | null = obj;
  while (cursor) {
    if (typeof cursor.userData.signalId === "string") return cursor.userData.signalId;
    cursor = cursor.parent;
  }
  return null;
}

export function mountEngine(canvas: HTMLCanvasElement, hooks: EngineHooks): EngineHandle {
  let disposed = false;
  let phase: "gate" | "opening" | "explore" | "finale" = "gate";
  let locked = false;
  let muted = false;
  const keys = new Set<string>();
  const injected = new Set<string>();
  const answered = new Set<string>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pos = new THREE.Vector3(SPAWN.x, EYE, SPAWN.z);
  const vel = { x: 0, z: 0 };
  let yaw = 0;
  let pitch = 0;
  let bob = 0;
  let openingT = 0;
  let openingDone: (() => void) | null = null;
  let exploreSeconds = 0;
  let movingTime = 0;
  let pathLength = 0;
  let optimal = 0;
  const checkpoints: Pt[] = [{ x: SPAWN.x, z: SPAWN.z }];
  const visitedSignals = new Set<string>();
  const zones = new Set<string>();
  let focusId: string | null = null;
  let ePrev = false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarseQuery = window.matchMedia("(pointer: coarse)");

  let stickX = 0;
  let stickY = 0;
  let dragging = false;
  let dragMode: "look" | "move" = "look";
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;
  let moved = false;
  let pointerId = -1;

  let audioCtx: AudioContext | null = null;
  let master: GainNode | null = null;

  const world = buildWorld();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 80);
  camera.rotation.order = "YXZ";
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.setClearColor(0x050506, 1);

  let elapsed = 0;
  let lastNow = performance.now();

  function held(code: string): boolean {
    return keys.has(code) || injected.has(code);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const narrow = Math.min(w, h) < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = narrow ? 76 : 68;
    camera.updateProjectionMatrix();
  }

  function applyAudioGain() {
    if (!master || !audioCtx) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.018, audioCtx.currentTime, 0.05);
  }

  function startAudio() {
    if (disposed) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) {
      audioCtx = new Ctx();
      master = audioCtx.createGain();
      master.gain.value = muted ? 0 : 0.018;
      master.connect(audioCtx.destination);
      const low = audioCtx.createOscillator();
      low.type = "sine";
      low.frequency.value = 58;
      const mid = audioCtx.createOscillator();
      mid.type = "triangle";
      mid.frequency.value = 87;
      const midGain = audioCtx.createGain();
      midGain.gain.value = 0.22;
      low.connect(master);
      mid.connect(midGain);
      midGain.connect(master);
      low.start();
      mid.start();
    }
    void audioCtx.resume();
    applyAudioGain();
  }

  function setMuted(next: boolean) {
    muted = next;
    applyAudioGain();
  }

  function markZone() {
    const key = zoneKey(pos.x, pos.z);
    if (key) zones.add(key);
  }

  function metrics(): Metrics {
    const byRoom: Record<string, number> = { living: 0, gallery: 0, study: 0 };
    for (const key of zones) {
      const room = key.split("-")[0] ?? "";
      if (room in byRoom) byRoom[room] = (byRoom[room] ?? 0) + 1;
    }
    const fullRooms = Object.values(byRoom).filter((count) => count >= 4).length;
    const directness =
      pathLength < 0.4 ? 1 : Math.max(0, Math.min(1, optimal / pathLength));
    return {
      moveDuty: exploreSeconds > 0.2 ? Math.max(0, Math.min(1, movingTime / exploreSeconds)) : 0,
      avgSpeed: movingTime > 0.15 ? pathLength / movingTime : 0,
      pathLength,
      directness,
      fullRooms,
      zoneCoverage: zones.size / 12,
      exploreSeconds,
    };
  }

  function raycast(ndcX: number, ndcY: number): string | null {
    if (phase !== "explore") return null;
    pointer.set(ndcX, ndcY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      world.signals.map((s) => s.root),
      true,
    );
    for (const hit of hits) {
      if (hit.distance > REACH) continue;
      const id = signalFrom(hit.object);
      if (id && !answered.has(id)) return id;
    }
    return null;
  }

  function ndcFromClient(cx: number, cy: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((cx - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      y: -((cy - rect.top) / Math.max(1, rect.height)) * 2 + 1,
    };
  }

  function interact(id: string | null) {
    if (!id || locked || phase !== "explore" || answered.has(id)) return;
    if (!visitedSignals.has(id)) {
      const here = { x: pos.x, z: pos.z };
      const prev = checkpoints[checkpoints.length - 1] ?? here;
      optimal += routeLength(prev, here);
      checkpoints.push(here);
      visitedSignals.add(id);
    }
    hooks.onInteract(id);
  }

  function spinTree(root: THREE.Object3D, dt: number) {
    root.traverse((obj) => {
      const spin = obj.userData.spin;
      if (typeof spin === "number") obj.rotation.y += spin * dt;
    });
  }

  function pulseSignals(elapsed: number) {
    world.signals.forEach((signal, index) => {
      const alive = !answered.has(signal.id);
      const pulse = alive ? 0.72 + Math.sin(elapsed * 2.1 + index) * 0.28 : 0.12;
      for (const mat of signal.glows) mat.emissiveIntensity = (alive ? 1.7 : 0.2) * pulse;
      signal.light.intensity = alive ? 1.4 + pulse : 0.12;
    });
  }

  function updateFocus() {
    if (phase !== "explore" || locked) {
      if (focusId !== null) {
        focusId = null;
        hooks.onFocus(null);
      }
      return;
    }
    const next = raycast(0, 0);
    if (next !== focusId) {
      focusId = next;
      hooks.onFocus(next);
    }
  }

  function stepMove(dt: number) {
    if (phase !== "explore" || locked) {
      vel.x = approach(vel.x, 0, FRICTION * dt);
      vel.z = approach(vel.z, 0, FRICTION * dt);
      return;
    }
    let axisX = 0;
    let axisZ = 0;
    if (held("KeyW") || held("ArrowUp")) axisZ += 1;
    if (held("KeyS") || held("ArrowDown")) axisZ -= 1;
    if (held("KeyD") || held("ArrowRight")) axisX += 1;
    if (held("KeyA") || held("ArrowLeft")) axisX -= 1;
    axisX += stickX;
    axisZ += -stickY;
    const len = Math.hypot(axisX, axisZ);
    if (len > 1) {
      axisX /= len;
      axisZ /= len;
    }
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const wishX = fx * axisZ + rx * axisX;
    const wishZ = fz * axisZ + rz * axisX;
    const moving = len > 0.08;
    vel.x = approach(vel.x, moving ? wishX * WALK : 0, (moving ? ACCEL : FRICTION) * dt);
    vel.z = approach(vel.z, moving ? wishZ * WALK : 0, (moving ? ACCEL : FRICTION) * dt);

    const nx = pos.x + vel.x * dt;
    const nz = pos.z + vel.z * dt;
    if (canOccupy(nx, nz)) {
      pos.x = nx;
      pos.z = nz;
    } else if (canOccupy(nx, pos.z)) {
      pos.x = nx;
      vel.z = 0;
    } else if (canOccupy(pos.x, nz)) {
      pos.z = nz;
      vel.x = 0;
    } else {
      vel.x = 0;
      vel.z = 0;
    }

    const speed = Math.hypot(vel.x, vel.z);
    pathLength += speed * dt;
    if (speed > 0.25) movingTime += dt;
    if (!reduced && speed > 0.4) bob += dt * speed * 1.6;
    markZone();
  }

  function placeCamera() {
    if (phase === "gate" || phase === "opening") {
      const t = phase === "gate" ? 0 : Math.min(1, openingT / 2.2);
      const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      const open = reduced ? 1.25 : easeDoor(t) * 1.28;
      world.doorL.rotation.y = open;
      world.doorR.rotation.y = -open;
      camera.position.set(0, 1.58, 6.35 - eased * 6.9);
      camera.rotation.set(reduced ? 0 : Math.sin(t * 2) * 0.01, 0, 0);
      return;
    }
    const speed = Math.hypot(vel.x, vel.z);
    const bobY = reduced ? 0 : Math.sin(bob) * Math.min(0.035, speed * 0.01);
    camera.position.set(pos.x, EYE + bobY, pos.z);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function easeDoor(t: number): number {
    const u = Math.max(0, Math.min(1, t / 0.58));
    return u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
  }

  function completeOpening() {
    if (phase === "explore" || phase === "finale") return;
    phase = "explore";
    pos.set(SPAWN.x, EYE, SPAWN.z);
    yaw = 0;
    pitch = 0;
    vel.x = 0;
    vel.z = 0;
    ePrev = held("Enter") || held("NumpadEnter") || held("KeyE");
    const done = openingDone;
    openingDone = null;
    done?.();
  }

  function step(dt: number) {
    if (phase === "opening") {
      openingT += dt;
      if (openingT >= 2.2) completeOpening();
    } else if (phase === "explore") {
      exploreSeconds += dt;
      const eNow = held("KeyE") || held("Enter") || held("NumpadEnter");
      if (eNow && !ePrev) interact(raycast(0, 0));
      ePrev = eNow;
      stepMove(dt);
    }
    const elapsedNow = elapsed;
    if (phase === "explore" || phase === "finale") {
      pulseSignals(elapsedNow);
      for (const signal of world.signals) spinTree(signal.root, dt);
      world.dust.rotation.y += dt * 0.02;
    } else {
      world.gateDust.rotation.y += dt * 0.04;
      const positions = world.gateDust.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = positions.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        const y = arr[i] ?? 0;
        arr[i] = y > 4.6 ? 0.2 : y + dt * 0.18;
      }
      positions.needsUpdate = true;
    }
    placeCamera();
    updateFocus();
  }

  function frame() {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(Math.max(0, (now - lastNow) / 1000), 0.05);
    lastNow = now;
    elapsed += dt;
    step(dt);
    const scene = phase === "explore" || phase === "finale" ? world.apartment : world.gate;
    renderer.render(scene, camera);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") {
      event.preventDefault();
    }
    keys.add(event.code);
  }
  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }
  function clearKeys() {
    keys.clear();
  }

  function onPointerDown(event: PointerEvent) {
    if (phase !== "explore" || locked) return;
    dragging = true;
    moved = false;
    pointerId = event.pointerId;
    downX = lastX = event.clientX;
    downY = lastY = event.clientY;
    const rect = canvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / Math.max(1, rect.width);
    dragMode = coarseQuery.matches && nx < 0.48 ? "move" : "look";
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 7) moved = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (document.pointerLockElement === canvas) return;
    if (dragMode === "look") {
      const sens = coarseQuery.matches ? TOUCH_SENS : DRAG_SENS;
      yaw -= dx * sens;
      pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * sens));
    } else {
      stickX = Math.max(-1, Math.min(1, (event.clientX - downX) / 72));
      stickY = Math.max(-1, Math.min(1, (event.clientY - downY) / 72));
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId && pointerId !== -1) return;
    const wasMove = dragMode === "move";
    dragging = false;
    stickX = 0;
    stickY = 0;
    pointerId = -1;
    if (moved || locked || phase !== "explore") return;
    if (wasMove) return;
    const ndc = ndcFromClient(event.clientX, event.clientY);
    const fromLock = document.pointerLockElement === canvas;
    const id = raycast(fromLock ? 0 : ndc.x, fromLock ? 0 : ndc.y);
    if (id) interact(id);
    else if (!coarseQuery.matches) {
      canvas.requestPointerLock?.();
    }
  }

  function onMouseLook(event: MouseEvent) {
    if (document.pointerLockElement !== canvas || phase !== "explore" || locked) return;
    yaw -= event.movementX * LOOK_SENS;
    pitch = Math.max(-1.35, Math.min(1.35, pitch + event.movementY * LOOK_SENS));
  }

  function onContext(event: Event) {
    event.preventDefault();
  }

  resize();
  renderer.setAnimationLoop(frame);
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", clearKeys);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("mousemove", onMouseLook);
  canvas.addEventListener("contextmenu", onContext);

  if (import.meta.env.DEV) {
    window.__controlsTest = {
      getYaw: () => yaw,
      getSpeed: () => Math.hypot(vel.x, vel.z),
      getPosition: () => ({ x: pos.x, z: pos.z }),
      setKeys: (codes: string[]) => {
        injected.clear();
        for (const code of codes) injected.add(code);
      },
      debugInteract: (id: string) => interact(id),
    };
  }

  hooks.onReady();

  return {
    dispose: () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("mousemove", onMouseLook);
      canvas.removeEventListener("contextmenu", onContext);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      audioCtx?.close().catch(() => undefined);
      renderer.dispose();
      renderer.forceContextLoss();
      if (window.__controlsTest) delete window.__controlsTest;
    },
    setLocked: (next) => {
      locked = next;
      if (next) {
        stickX = 0;
        stickY = 0;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        if (focusId !== null) {
          focusId = null;
          hooks.onFocus(null);
        }
      }
    },
    beginOpening: (onDone) => {
      if (phase === "explore" || phase === "finale") {
        onDone();
        return;
      }
      if (reduced) {
        phase = "explore";
        world.doorL.rotation.y = 1.25;
        world.doorR.rotation.y = -1.25;
        onDone();
        return;
      }
      phase = "opening";
      openingT = 0;
      openingDone = onDone;
    },
    startAudio,
    setMuted,
    markAnswered: (id) => {
      answered.add(id);
      const signal: SignalBuilt | undefined = world.signals.find((s) => s.id === id);
      if (!signal) return;
      for (const mat of signal.glows) mat.emissiveIntensity = 0.15;
      signal.light.intensity = 0.08;
    },
    enterFinale: () => {
      phase = "finale";
      locked = true;
      vel.x = 0;
      vel.z = 0;
    },
    getMetrics: metrics,
    tryInteract: () => {
      if (phase !== "explore" || locked) return false;
      const aimed = raycast(0, 0);
      if (aimed) {
        interact(aimed);
        return true;
      }
      let best: string | null = null;
      let bestD = 7;
      for (const signal of world.signals) {
        if (answered.has(signal.id)) continue;
        const d = Math.hypot(signal.root.position.x - pos.x, signal.root.position.z - pos.z);
        if (d < bestD) {
          bestD = d;
          best = signal.id;
        }
      }
      if (!best) return false;
      interact(best);
      return true;
    },
    finishOpening: () => {
      completeOpening();
    },
  };
}
