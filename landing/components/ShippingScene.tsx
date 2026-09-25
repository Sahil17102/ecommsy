"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Pause, Play } from "lucide-react";
export default function ShippingScene() {
  const host = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(0xffffff, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Animated delivery van, parcels and shipping routes",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(9, 8, 11);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbb5d3, 3));
    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(-4, 10, 6);
    scene.add(light);
    const world = new THREE.Group();
    scene.add(world);
    const violet = new THREE.MeshStandardMaterial({
      color: "#4E4AC3",
      roughness: 0.28,
      metalness: 0.12,
    });
    const white = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.55,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x262535,
      roughness: 0.65,
    });
    const mint = new THREE.MeshStandardMaterial({ color: 0xa9d9c9 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x343149,
      roughness: 0.18,
      metalness: 0.3,
    });
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      parent: THREE.Object3D = world,
    ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    }
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.9, 4.9, 0.16, 48),
      white,
    );
    platform.position.y = -0.2;
    world.add(platform);
    for (let i = 0; i < 2; i++) {
      const curve = new THREE.EllipseCurve(
        0,
        0,
        3.3 + i * 0.7,
        2.7 + i * 0.7,
        0,
        Math.PI * 2,
        false,
        0,
      );
      const pts = curve
        .getPoints(64)
        .map((p) => new THREE.Vector3(p.x, -0.105, p.y));
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({
          color: 0xccc6e4,
          dashSize: 0.22,
          gapSize: 0.15,
        }),
      );
      line.computeLineDistances();
      world.add(line);
    }
    const van = new THREE.Group();
    van.position.set(0.3, 0.2, 0.8);
    van.rotation.y = -0.2;
    world.add(van);
    box(2.8, 1.55, 1.5, -0.4, 1, 0, violet, van);
    box(1.05, 1.22, 1.5, 1.47, 0.8, 0, white, van);
    box(0.65, 0.58, 1.53, 1.52, 1.3, 0, glass, van);
    box(0.12, 0.35, 1.35, 2.03, 0.56, 0, white, van);
    for (const x of [-1.25, 1.4])
      for (const z of [-0.78, 0.78]) {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.39, 0.39, 0.19, 32),
          dark,
        );
        tire.rotation.x = Math.PI / 2;
        tire.position.set(x, 0.25, z);
        van.add(tire);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.17, 0.2, 24),
          white,
        );
        hub.rotation.x = Math.PI / 2;
        hub.position.copy(tire.position);
        van.add(hub);
      }
    new THREE.TextureLoader().load("/brand-mark.png", (texture) => {
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      for (const z of [-0.757, 0.757]) {
        const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), mat);
        mark.position.set(-0.4, 1.03, z);
        if (z < 0) mark.rotation.y = Math.PI;
        van.add(mark);
      }
    });
    function parcel(x: number, y: number, z: number, size: number) {
      const g = new THREE.Group();
      world.add(g);
      g.position.set(x, y, z);
      box(size, size, size, 0, size / 2, 0, white, g);
      box(size + 0.015, 0.055, size * 0.2, 0, size + 0.01, 0, violet, g);
      box(
        0.045,
        size + 0.015,
        size * 0.2,
        size / 2 + 0.01,
        size / 2,
        0,
        violet,
        g,
      );
      return g;
    }
    const parcels = [
      parcel(-2.5, 0, -1.5, 1.1),
      parcel(-1.5, 0, -2.0, 0.85),
      parcel(-2.5, 1.1, -1.5, 0.72),
      parcel(2.8, 0, -1.5, 0.7),
    ];
    for (const [x, z] of [
      [-3, 1.5],
      [2.7, -2.4],
    ]) {
      const pin = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.085, 16, 40),
        mint,
      );
      pin.position.set(x, 1.15, z);
      world.add(pin);
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 3), mint);
      stem.rotation.z = Math.PI;
      stem.position.set(x, 0.77, z);
      world.add(stem);
    }
    let targetX = 0,
      targetY = 0,
      spin = 0,
      dirty = true;
    const interactionArea = el.closest(".hero") || el;
    const pointer = (e: PointerEvent) => {
      const r = interactionArea.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 1.2;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 0.34;
      dirty = true;
    };
    const resetPointer = () => {
      targetX = 0;
      targetY = 0;
      dirty = true;
    };
    interactionArea.addEventListener("pointermove", pointer);
    interactionArea.addEventListener("pointerleave", resetPointer);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    paused.current = reduced.matches;
    setPlaying(!reduced.matches);
    let frame = 0,
      t = 0,
      lastFrame = 0;
    let visible = false;
    const visibility = () => {
      visible = !document.hidden && inView;
      if (visible && !frame) frame = requestAnimationFrame(animate);
    };
    let inView = false;
    const animate = (now: number) => {
      frame = 0;
      if (!visible) return;
      const elapsed = now - lastFrame;
      if (elapsed >= 1000 / 30) {
        lastFrame = now;
        if (!paused.current) {
          const delta = Math.min(elapsed, 50);
          t += delta * 0.001;
          spin += delta * 0.00032;
          van.position.y = 0.2 + Math.sin(t * 2) * 0.05;
          parcels[2].position.y = 1.15 + Math.sin(t) * 0.11;
        }
        const moving =
          Math.abs(spin + targetX - world.rotation.y) > 0.002 ||
          Math.abs(targetY - world.rotation.x) > 0.002;
        world.rotation.y += (spin + targetX - world.rotation.y) * 0.11;
        world.rotation.x += (targetY - world.rotation.x) * 0.11;
        if (!paused.current || dirty || moving) renderer.render(scene, camera);
        dirty = moving;
      }
      frame = requestAnimationFrame(animate);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      visibility();
    });
    intersection.observe(el);
    document.addEventListener("visibilitychange", visibility);
    renderer.render(scene, camera);
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      observer.disconnect();
      interactionArea.removeEventListener("pointermove", pointer);
      interactionArea.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", visibility);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);
  return (
    <div className="scene-wrap">
      <div className="scene" ref={host} />
      {failed && (
        <img
          className="scene-fallback"
          src="/brand-mark.png"
          alt="Searchcraft shipping boxes"
        />
      )}
      <div className="scene-note">
        <span className="status-dot" />
        Every parcel. A new possibility.
      </div>
      <button
        className="scene-toggle icon-button"
        title={playing ? "Pause animation" : "Play animation"}
        aria-label={playing ? "Pause animation" : "Play animation"}
        onClick={() => {
          paused.current = playing;
          setPlaying(!playing);
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="scene-label label-top">
        <span className="status-dot" />
        READY FOR WHAT'S NEXT
      </div>
      <div className="scene-label label-bottom">
        <span className="mini-icon">B</span>
        <div>
          From your doorstep
          <br />
          <strong>to their next favourite thing.</strong>
        </div>
      </div>
    </div>
  );
}
