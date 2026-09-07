const PALETTES = {
  idle: {
    coreHi: "#cffafe",
    coreMid: "#22d3ee",
    coreLow: "#1d4ed8",
    coreDeep: "#101a4d",
    glow: "rgba(34, 211, 238, 0.6)",
  },
  positive: {
    coreHi: "#d1fae5",
    coreMid: "#34d399",
    coreLow: "#047857",
    coreDeep: "#052e22",
    glow: "rgba(52, 211, 153, 0.65)",
  },
  negative: {
    coreHi: "#ffe4e6",
    coreMid: "#fb7185",
    coreLow: "#be123c",
    coreDeep: "#40071a",
    glow: "rgba(251, 113, 133, 0.65)",
  },
  neutral: {
    coreHi: "#eef2ff",
    coreMid: "#a5b4fc",
    coreLow: "#475569",
    coreDeep: "#101527",
    glow: "rgba(165, 180, 252, 0.6)",
  },
};

/**
 * Pure-CSS 3D orb: a glowing sphere wrapped in tilted, spinning orbit
 * rings with satellite dots. `mood` recolors the core/glow to match the
 * dominant sentiment; `chips` float around it as depth layers.
 */
export default function Orb3D({
  size = 250,
  mood = "idle",
  chips = [],
  className = "",
  style = {},
}) {
  const p = PALETTES[mood] || PALETTES.idle;

  return (
    <div
      className={`orb3d ${className}`}
      style={{
        "--orb": `${size}px`,
        "--core-hi": p.coreHi,
        "--core-mid": p.coreMid,
        "--core-low": p.coreLow,
        "--core-deep": p.coreDeep,
        "--glow-c": p.glow,
        ...style,
      }}
      aria-hidden="true"
    >
      <div className="orb3d__core" />
      <div className="orb3d__ring orb3d__ring--x">
        <span className="orb3d__sat" />
      </div>
      <div className="orb3d__ring orb3d__ring--y" />
      <div className="orb3d__ring orb3d__ring--z">
        <span className="orb3d__sat" />
      </div>

      {chips.map((c) => (
        <span
          key={c.id}
          className="orb3d__chip-slot"
          style={{
            top: c.top,
            left: c.left,
            transform: `translateZ(${c.z || 90}px)`,
          }}
        >
          <span
            className="orb3d__chip"
            style={{ animation: `float-y ${5 + (c.delay || 0)}s ease-in-out ${c.delay || 0}s infinite`, ...(c.style || {}) }}
          >
            {c.text}
          </span>
        </span>
      ))}
    </div>
  );
}
