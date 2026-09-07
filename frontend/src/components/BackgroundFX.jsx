import { useEffect, useRef } from "react";

/**
 * Full-screen ambient background:
 *  - a lightweight canvas "3D" starfield (stars move toward the viewer with depth projection)
 *  - drifting nebula blobs (CSS)
 *  - a faint perspective grid horizon
 */
export default function BackgroundFX() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let stars = [];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const FOV = 320; // focal length for perspective projection

    function seed() {
      stars = [];
      const count = Math.min(240, Math.max(90, Math.floor((w * h) / 9000)));
      for (let i = 0; i < count; i += 1) {
        stars.push(makeStar(true));
      }
    }

    function makeStar(far) {
      return {
        x: (Math.random() * 2 - 1) * 1.4,
        y: (Math.random() * 2 - 1) * 1.4,
        z: far ? 0.25 + Math.random() * 0.75 : Math.random(), // 0 = far, 1 = near
        speed: 0.0012 + Math.random() * 0.0022,
        hue: Math.random(),
        phase: Math.random() * Math.PI * 2,
      };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function frame(t) {
      // ease pointer toward target for a smooth parallax feel
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const cx = w / 2 + (pointer.x - 0.5) * 60;
      const cy = h / 2 + (pointer.y - 0.5) * 40;

      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        if (!reduced) {
          s.z += s.speed;
          if (s.z > 1) Object.assign(s, makeStar(false));
        }

        const k = FOV / (0.12 + s.z * 1.1); // scale grows as z -> 1
        const sx = cx + s.x * k;
        const sy = cy + s.y * k * 0.62;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) {
          Object.assign(s, makeStar(true));
          continue;
        }

        const depth = s.z * s.z;
        const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * 0.0012 + s.phase);
        const alpha = depth * tw * 0.9;
        const radius = 0.35 + depth * 1.7;

        ctx.beginPath();
        if (s.hue > 0.86) {
          ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`;
        } else if (s.hue < 0.12) {
          ctx.fillStyle = `rgba(196, 181, 253, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(226, 232, 255, ${alpha})`;
        }
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    function onPointer(e) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="bg-canvas" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="orb-blob orb-blob--a" />
      <div className="orb-blob orb-blob--b" />
      <div className="orb-blob orb-blob--c" />
      <div className="grid-horizon" />
    </div>
  );
}
