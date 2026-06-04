/* YAHA shared primitives — icons + tab bar. Exports to window. */

const Icon = ({ d, size = 22, sw = 1.7, fill = "none", style }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const I = {
  home:     ["M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z", "M9 21V12h6v9"],
  journal:  ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  tracker:  ["M12 3l4.5 2.6v5.2L12 13.4 7.5 10.8V5.6z", "M12 13.4V21", "M7.5 10.8 3 13.4", "M16.5 10.8 21 13.4"],
  gear:     ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
  plus:     ["M12 5v14", "M5 12h14"],
  bell:     ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"],
  moon:     "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  sun:      ["M12 2v2","M12 20v2","M4.22 4.22l1.42 1.42","M18.36 18.36l1.42 1.42","M2 12h2","M20 12h2","M4.22 19.78l1.42-1.42","M18.36 5.64l1.42-1.42","M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
  flame:    "M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .4-2 1-2.5C9 11 9.5 6 12 3Z",
  dumbbell: ["M3 9v6","M6 7v10","M18 7v10","M21 9v6","M6 12h12"],
  drop:     "M12 3.5c3 4 5.5 6.5 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3 2.5-5.5 5.5-9.5Z",
  heart:    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  bolt:     "M13 2 4 14h7l-1 8 9-12h-7z",
  chevR:    "M9 5l7 7-7 7",
  chevL:    "M15 5l-7 7 7 7",
  chevD:    "M5 9l7 7 7-7",
  search:   ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z","M21 21l-3.5-3.5"],
  cal:      ["M3 4h18v18H3z","M3 9h18","M8 2v4","M16 2v4"],
  check:    "M5 12l4.5 4.5L19 7",
  x:        ["M6 6l12 12","M18 6 6 18"],
  send:     ["M5 12 21 4l-7 16-2.5-6.5z","M11.5 13.5 21 4"],
  sliders:  ["M4 7h10","M18 7h2","M4 17h2","M10 17h10","M16 5v4","M8 15v4"],
  download: ["M12 4v10","M8 11l4 4 4-4","M5 19h14"],
  edit:     ["M5 19h14","M14 5l4 4-9 9H5v-4z"],
  arrowUp:  ["M12 19V5","M6 11l6-6 6 6"],
  bowl:     ["M3.5 11h17a8.5 8.5 0 0 1-17 0Z","M5 11a7 7 0 0 1 14 0"],
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  trash:    ["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"],
  pencil:   ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
  menu:     ["M3 6h18","M3 12h18","M3 18h18"],
  eye:      ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  flask:    ["M9 3h6","M5 21h14","M10 3v8l-5 10","M14 3v8l5 10"],
  trendUp:  ["M3 17l6-6 4 4 8-9","M14 8h5v5"],
  msgSq:    ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  boxes:    ["M2 7.5 12 2l10 5.5-10 5.5z","M2 7.5v9L12 22l10-5.5v-9","M12 12.5v9","M7 5v9","M17 5v9"],
};

/* ---- real 5-tab bottom nav ---- */
function TabBar({ active = "dashboard" }) {
  const tabs = [
    { k: "dashboard", icon: I.home,    label: "Dashboard" },
    { k: "journal",   icon: I.journal, label: "Journal" },
    { k: "chat",      icon: I.chat,    label: "Chat",     lg: true },
    { k: "tracker",   icon: I.boxes,   label: "Trackers" },
    { k: "gear",      icon: I.gear,    label: "Settings" },
  ];
  return (
    <nav className="tabbar">
      {tabs.map(t => {
        const on = active === t.k;
        return (
          <div key={t.k} className={"tab" + (on ? " active" : "")}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 12px", borderRadius: 99 }}>
              {on && (
                <span style={{
                  position: "absolute", inset: 0, borderRadius: 99,
                  background: `color-mix(in oklch, var(--accent) 14%, transparent)`,
                }} />
              )}
              <Icon d={t.icon} size={t.lg ? 24 : 21} sw={on ? 2.2 : 1.6}
                style={{ position: "relative", filter: on ? `drop-shadow(0 0 6px color-mix(in oklch, var(--accent) 55%, transparent))` : "none" }} />
            </div>
            <span>{t.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

/* ---- conic ring ---- */
function Ring({ pct = 70, size = 120, track = "var(--raise)", color = "var(--accent)", children }) {
  return (
    <div className="ring" style={{
      width: size, height: size,
      background: `conic-gradient(${color} ${pct * 3.6}deg, ${track} 0)`,
    }}>
      <div className="ring-val">{children}</div>
    </div>
  );
}

/* ---- source badge ---- */
function SourceBadge({ src = "chat" }) {
  const map = {
    chat:     { label: "CHAT",     bg: "color-mix(in oklch, var(--accent) 18%, transparent)", color: "var(--accent)", border: "color-mix(in oklch, var(--accent) 30%, transparent)" },
    telegram: { label: "TELEGRAM", bg: "color-mix(in oklch, var(--accent2) 18%, transparent)", color: "var(--accent2)", border: "color-mix(in oklch, var(--accent2) 30%, transparent)" },
    web:      { label: "WEB",      bg: "color-mix(in oklch, var(--c-nutrition) 18%, transparent)", color: "var(--c-nutrition)", border: "color-mix(in oklch, var(--c-nutrition) 30%, transparent)" },
    manual:   { label: "MANUAL",   bg: "var(--raise)", color: "var(--muted)", border: "var(--border)" },
  };
  const s = map[src] || map.chat;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: "3px 7px",
      fontSize: 10, fontWeight: 900, letterSpacing: "0.1em",
    }}>{s.label}</span>
  );
}

/* ---- entry card (inner) ---- */
function EntryCard({ time, src, fields, actions }) {
  return (
    <div style={{ borderRadius: "var(--r-sm)", background: "var(--bg)", padding: "11px 13px", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="label mono" style={{ fontSize: 11 }}>{time}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SourceBadge src={src} />
          {actions && (
            <div style={{ display: "flex", gap: 8 }}>
              <Icon d={I.pencil} size={14} style={{ color: "var(--faint)" }} />
              <Icon d={I.trash} size={14} style={{ color: "var(--faint)" }} />
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {fields.map(([k, v, wide]) => (
          <div key={k} style={wide ? { gridColumn: "1/-1" } : {}}>
            <div className="flabel" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3, fontFamily: "var(--mono)" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- tracker group card (journal) — collapsible ---- */
function TrackerGroup({ name, color, entries, entryLabel }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="card" style={{
      marginBottom: "var(--gap)",
      boxShadow: `0 0 0 1px ${color}22, inset 0 0 24px ${color}06`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flex: "none",
          background: `${color}18`, border: `1px solid ${color}28`,
          display: "grid", placeItems: "center",
        }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block" }} />
        </div>
        <span className="disp" style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{name}</span>
        <span style={{
          borderRadius: 999, padding: "4px 11px",
          fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
          background: `${color}14`, color: color, border: `1px solid ${color}28`,
        }}>{entryLabel}</span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 28, height: 28, borderRadius: "50%", flex: "none",
            background: "var(--raise)", border: "1px solid var(--border)",
            display: "grid", placeItems: "center", color: "var(--muted)",
          }}
        >
          <Icon d={open ? I.chevD : I.chevR} size={13} />
        </button>
      </div>
      {open && <div style={{ marginTop: 10 }}>{entries}</div>}
    </div>
  );
}

/* ---- collapsible day section (tracker detail) ---- */
function CollapsibleDay({ label, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", cursor: "pointer", userSelect: "none" }}
      >
        <span className="eyebrow flabel">{label}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <button style={{
          width: 26, height: 26, borderRadius: "50%", flex: "none",
          background: "var(--raise)", border: "1px solid var(--border)",
          display: "grid", placeItems: "center", color: "var(--muted)",
          pointerEvents: "none",
        }}>
          <Icon d={open ? I.chevD : I.chevR} size={12} />
        </button>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

/* ---- Daily Totals & Averages card ---- */
function DailyTotals({ color = "var(--c-workout)", fields = [], onConfigure }) {
  return (
    <div className="card" style={{
      marginTop: 10,
      border: `1px solid ${color}28`,
      boxShadow: `0 0 0 1px ${color}10, inset 0 0 28px ${color}06`,
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon d={I.trendUp} size={14} style={{ color: color }} sw={2.2} />
        <span className="disp" style={{ fontSize: 12, flex: 1, letterSpacing: "0.08em", textTransform: "uppercase", color: color }}>Daily Totals &amp; Averages</span>
        <button
          onClick={onConfigure}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--raise)", border: "1px solid var(--border)",
            borderRadius: "var(--r-pill)", padding: "4px 10px",
            color: "var(--muted)", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em",
          }}
        >
          <Icon d={I.gear} size={11} sw={1.6} /> CONFIGURE
        </button>
      </div>
      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
        {fields.map(f => (
          <div key={f.label}>
            <div className="flabel" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--text)" }}>{f.value}</div>
            <div className="flabel" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{f.agg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Configure modal (bottom sheet) ---- */
function ConfigureModal({ title, fields = [], onClose }) {
  const [vals, setVals] = React.useState(() => Object.fromEntries(fields.map(f => [f.label, f.default || "avg"])));
  const set = (k, v) => setVals(s => ({ ...s, [k]: v }));
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--r-lg) var(--r-lg) 0 0",
        padding: "20px var(--pad) 36px", maxHeight: "82%", overflowY: "auto",
        border: "1px solid var(--border2)", borderBottom: "none",
      }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--c-workout)18", border: "1px solid var(--c-workout)30", display: "grid", placeItems: "center", color: "var(--c-workout)" }}>
            <Icon d={I.activity} size={18} sw={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
            <div className="flabel" style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, letterSpacing: "0.12em" }}>TOTALS CONFIG</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--raise)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
            <Icon d={I.x} size={16} sw={2} />
          </button>
        </div>
        <div className="flabel" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.12em", marginBottom: 14 }}>CHOOSE WHAT SHOWS IN THE TOTALS ROW</div>
        {/* field rows */}
        <div className="stack" style={{ gap: 0 }}>
          {fields.map((f, i) => (
            <div key={f.label} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
              borderBottom: i < fields.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ flex: 1 }}>
                <div className="disp" style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
                {f.unit && <div className="flabel" style={{ fontSize: 10, color: "var(--faint)", marginTop: 2 }}>{f.unit}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["sum","avg","hide"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => set(f.label, opt)}
                    style={{
                      padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                      letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid",
                      background: vals[f.label] === opt ? "var(--raise)" : "transparent",
                      color: vals[f.label] === opt ? "var(--text)" : "var(--faint)",
                      borderColor: vals[f.label] === opt ? "var(--border2)" : "var(--border)",
                    }}
                  >{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 20, height: 50 }}>Save</button>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, I, TabBar, Ring, SourceBadge, EntryCard, TrackerGroup, CollapsibleDay, DailyTotals, ConfigureModal });
