

/**
 * ThreeBackground — hero particle network rendered with Three.js.
 * Brand-colored dots with connecting lines, gentle depth drift, pointer parallax.
 * (Solid materials only — no gradients, no post-processing.)
 */
import { useEffect, useRef } from "react";
import type { Mesh, Material } from "three";

export default function ThreeBackground({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        60,
        mount.clientWidth / Math.max(1, mount.clientHeight),
        0.1,
        100
      );
      camera.position.z = 14;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      const isDark = document.documentElement.classList.contains("dark");
      const primary = new THREE.Color(isDark ? "#4d84b5" : "#3368A0");
      const secondary = new THREE.Color("#66A3BF");

      // --- Particle field -------------------------------------------------
      const COUNT = 130;
      const positions = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 26;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        seeds[i] = Math.random() * Math.PI * 2;
      }

      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const dotMaterial = new THREE.PointsMaterial({
        color: secondary,
        size: 0.09,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
      });
      const points = new THREE.Points(dotGeometry, dotMaterial);
      scene.add(points);

      // --- Connection lines between nearby particles ----------------------
      const MAX_LINES = 220;
      const linePositions = new Float32Array(MAX_LINES * 6);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: primary,
        transparent: true,
        opacity: 0.16,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);

      // --- A few larger accent spheres for depth --------------------------
      const accentGeometry = new THREE.SphereGeometry(0.14, 16, 16);
      const accents: Mesh[] = [];
      for (let i = 0; i < 6; i++) {
        const material = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? primary : secondary,
          transparent: true,
          opacity: 0.5,
        });
        const sphere = new THREE.Mesh(accentGeometry, material);
        sphere.position.set(
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8
        );
        accents.push(sphere);
        scene.add(sphere);
      }

      // --- Pointer parallax ------------------------------------------------
      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        const rect = mount.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const onResize = () => {
        const w = mount.clientWidth;
        const h = Math.max(1, mount.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      const vecA = new THREE.Vector3();
      const vecB = new THREE.Vector3();

      const animate = (time: number) => {
        if (disposed) return;
        const t = time * 0.001;

        for (let i = 0; i < COUNT; i++) {
          const ix = i * 3;
          positions[ix + 1] += Math.sin(t * 0.6 + seeds[i]) * 0.0022;
          positions[ix] += Math.cos(t * 0.4 + seeds[i]) * 0.0016;
        }
        dotGeometry.attributes.position.needsUpdate = true;

        // Rebuild line segments between close particles
        let lineIndex = 0;
        for (let i = 0; i < COUNT && lineIndex < MAX_LINES; i++) {
          vecA.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          for (let j = i + 1; j < COUNT && lineIndex < MAX_LINES; j++) {
            vecB.set(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
            if (vecA.distanceToSquared(vecB) < 4.2) {
              const o = lineIndex * 6;
              linePositions[o] = vecA.x;
              linePositions[o + 1] = vecA.y;
              linePositions[o + 2] = vecA.z;
              linePositions[o + 3] = vecB.x;
              linePositions[o + 4] = vecB.y;
              linePositions[o + 5] = vecB.z;
              lineIndex++;
            }
          }
        }
        for (let k = lineIndex * 6; k < MAX_LINES * 6; k++) linePositions[k] = 0;
        lineGeometry.attributes.position.needsUpdate = true;

        accents.forEach((sphere, i) => {
          sphere.position.y += Math.sin(t * 0.5 + i * 1.7) * 0.0018;
          sphere.rotation.y = t * 0.2 + i;
        });

        points.rotation.y = pointer.x * 0.06 + t * 0.012;
        lines.rotation.y = points.rotation.y;
        camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.03;
        camera.position.y += (-pointer.y * 0.6 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        dotGeometry.dispose();
        dotMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        accentGeometry.dispose();
        accents.forEach((a) => (a.material as Material).dispose());
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
