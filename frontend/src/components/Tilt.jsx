import { useCallback, useRef } from "react";

/**
 * Interactive 3D tilt wrapper.
 * Rotates its children in 3D toward the pointer and shows a moving glare.
 * Usage: <Tilt max={10}><div className="glass ...">…</div></Tilt>
 */
export default function Tilt({
  children,
  max = 8,
  className = "",
  style = {},
  glare = true,
  scale = 1.015,
}) {
  const ref = useRef(null);
  const state = useRef({ rx: 0, ry: 0, tilt: false });

  const onMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      // rotate around Y by horizontal position, X by vertical position
      const rx = (py - 0.5) * -2 * max;
      const ry = (px - 0.5) * 2 * max;

      const s = state.current;
      s.rx = rx;
      s.ry = ry;
      s.tilt = true;

      el.style.setProperty("--rx", `${ry.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      el.classList.add("is-tilting");
    },
    [max],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    state.current.tilt = false;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("is-tilting");
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{ ...style, "--s": scale }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
      {glare && <div className="glare" aria-hidden="true" />}
    </div>
  );
}
