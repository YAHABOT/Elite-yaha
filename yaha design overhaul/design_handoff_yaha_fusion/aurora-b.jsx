/* YAHA Aurora-B — Dashboard (accurate), Chat, Settings */

/* ===================== DASHBOARD (ACCURATE) ===================== */
function ScreenDashboard() {
  const today = "Friday, May 30";
  const widgets = [
    { label: "Sleep score",   value: "86",    unit: "",     color: "var(--c-sleep)"     },
    { label: "Calories",      value: "1,840", unit: "kcal", color: "var(--c-nutrition)" },
    { label: "Workout",       value: "540",   unit: "kcal", color: "var(--c-workout)"   },
    { label: "Water",         value: "1.6",   unit: "L",    color: "var(--c-water)"     },
    { label: "Mood",          value: "8.0",   unit: "/10",  color: "var(--c-mood)"      },
    { label: "Weight",        value: "78.2",  unit: "kg",   color: "var(--accent2)"     },
  ];
  const icons = [I.moon, I.bowl, I.dumbbell, I.drop, I.heart, I.arrowUp];

  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">

        {/* Morning protocol banner */}
        <div className="card" style={{
          background: `linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, var(--surface)), var(--surface))`,
          borderColor: "var(--border2)", marginBottom: "var(--gap)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flex: "none",
              background: "var(--accent)", color: "var(--accent-ink)",
              display: "grid", placeItems: "center",
            }}>
              <Icon d={I.sun} size={22} sw={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>Morning Protocol</div>
              <div className="label" style={{ fontSize: 12, marginTop: 2 }}>Start logging your day · 3 steps</div>
            </div>
            <button className="btn btn-accent" style={{ height: 40, padding: "0 14px", fontSize: 13 }}>
              Start <Icon d={I.chevR} size={14} sw={2.4} />
            </button>
          </div>
        </div>

        {/* Skip button */}
        <button style={{
          width: "100%", borderRadius: "var(--r-md)",
          border: "1px solid var(--border)", background: "transparent",
          padding: "10px 0", marginBottom: 20,
          fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--faint)",
        }}>
          Skip Morning Routine
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-0.02em", margin: 0 }}>Dashboard</h1>
            <div className="label" style={{ fontSize: 12, marginTop: 3 }}>{today}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="chip" style={{ padding: "7px 12px", fontSize: 11, gap: 5 }}>
              <Icon d={I.pencil} size={12} /> Edit
            </button>
            <button className="chip" style={{
              padding: "7px 12px", fontSize: 11, gap: 5,
              background: "color-mix(in oklch, var(--accent) 14%, transparent)",
              color: "var(--accent)", borderColor: "color-mix(in oklch, var(--accent) 30%, transparent)",
            }}>
              <Icon d={I.plus} size={12} sw={2.4} /> Add Widget
            </button>
          </div>
        </div>

        {/* Widget grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
          {widgets.map((w, i) => (
            <div key={w.label} className="card" style={{
              padding: 0, overflow: "hidden",
              boxShadow: `0 0 0 1px ${w.color}18`,
            }}>
              {/* top accent line */}
              <div style={{ height: 2, background: `linear-gradient(to right, transparent, ${w.color}, transparent)` }} />
              <div style={{ padding: "14px 14px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ color: w.color }}>
                    <Icon d={icons[i]} size={16} sw={2} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>{w.label}</span>
                </div>
                <div className="metric" style={{ fontSize: 26 }}>{w.value}</div>
                <div className="label mono" style={{ fontSize: 11, marginTop: 2 }}>{w.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="dashboard" />
    </div>
  );
}

/* ===================== CHAT ===================== */
function ScreenChat() {
  return (
    <div className="scr">
      <div className="topspace" />
      {/* chat header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 var(--pad) 12px",
        borderBottom: "1px solid var(--border)", flex: "none",
      }}>
        <div className="icon-btn" style={{ borderRadius: 10, width: 36, height: 36 }}>
          <Icon d={I.chevL} size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>YAHA Assistant</div>
          <div className="label mono" style={{ fontSize: 11 }}>Logging session · active</div>
        </div>
        <button className="chip" style={{ padding: "7px 12px", fontSize: 11, gap: 5, color: "var(--accent)", borderColor: "color-mix(in oklch, var(--accent) 30%, transparent)" }}>
          <Icon d={I.plus} size={12} sw={2.4} /> New Chat
        </button>
      </div>

      {/* messages */}
      <div className="scr-scroll" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 130 }}>
        {/* AI */}
        <div style={{ maxWidth: "82%" }}>
          <div className="card" style={{ padding: "12px 15px", borderTopLeftRadius: 5 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>Morning! What did you have for breakfast?</div>
          </div>
        </div>
        {/* User */}
        <div style={{ maxWidth: "82%", alignSelf: "flex-end" }}>
          <div style={{
            padding: "12px 15px", borderRadius: "var(--r-md)", borderTopRightRadius: 5,
            background: "var(--accent)", color: "var(--accent-ink)",
            fontSize: 14, lineHeight: 1.5, fontWeight: 500,
          }}>
            Protein Bowl — eggs, rice, veggies about 500 cal
          </div>
        </div>
        {/* AI + action card */}
        <div style={{ maxWidth: "88%" }}>
          <div className="card" style={{ padding: "12px 15px", borderTopLeftRadius: 5, marginBottom: 10 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>Got it — I'm logging <b>502 kcal</b> to your Food tracker. Does this look right?</div>
          </div>
          {/* confirm card */}
          <div className="card" style={{ borderColor: "var(--border2)", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span className="dot" style={{ background: "var(--c-nutrition)", width: 10, height: 10 }} />
              <span className="eyebrow" style={{ color: "var(--text)" }}>Log · Food</span>
              <SourceBadge src="chat" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 14 }}>
              {[["Item Name","Protein Bowl"],["Calories","502 Kcal"],["Protein","36.92 g"],["Carbs","38.45 g"]].map(([k,v]) => (
                <div key={k}>
                  <div className="flabel" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--mono)" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-accent" style={{ flex: 1, height: 42 }}>
                <Icon d={I.check} size={15} sw={2.4} /> Confirm
              </button>
              <button className="btn btn-ghost" style={{ height: 42, width: 46, padding: 0 }}>
                <Icon d={I.x} size={15} sw={2.4} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* input dock */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, zIndex: 40, padding: "10px var(--pad) 10px", background: "color-mix(in oklch, var(--surface) 90%, transparent)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
        <div className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, borderColor: "var(--border2)" }}>
          <div className="icon-btn" style={{ width: 34, height: 34, borderRadius: "50%", flex: "none" }}>
            <Icon d={I.plus} size={16} sw={2.4} />
          </div>
          <span className="label" style={{ flex: 1, fontSize: 14 }}>Log something…</span>
          <button style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: "var(--accent)", color: "var(--accent-ink)",
            display: "grid", placeItems: "center", flex: "none",
          }}>
            <Icon d={I.send} size={16} fill="currentColor" sw={0} />
          </button>
        </div>
      </div>
      <TabBar active="chat" />
    </div>
  );
}

/* ===================== SETTINGS ===================== */
function SGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="eyebrow" style={{ margin: "0 2px 10px" }}>{title}</div>
      <div className="card" style={{ padding: "4px 16px" }}>{children}</div>
    </div>
  );
}
function SRow({ icon, c, label, detail, toggle, on, last }) {
  return (
    <div className="lrow" style={{ borderColor: last ? "transparent" : "var(--border)" }}>
      {icon && (
        <div className="swatch" style={{ background: `color-mix(in oklch, ${c} 18%, transparent)` }}>
          <Icon d={icon} size={16} style={{ color: c }} />
        </div>
      )}
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
      {detail && <span className="label mono" style={{ fontSize: 13 }}>{detail}</span>}
      {toggle
        ? <div className={"tog" + (on ? " on" : "")} />
        : <Icon d={I.chevR} size={16} style={{ color: "var(--faint)" }} />
      }
    </div>
  );
}
function ScreenSettings() {
  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">
        <h1 style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.03em", marginBottom: 4 }}>Settings</h1>
        <div className="label" style={{ fontSize: 13, marginBottom: 24 }}>Account, targets &amp; preferences</div>

        {/* profile */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Alex Mercer</div>
            <div className="label" style={{ fontSize: 12, marginTop: 2 }}>alex@yaha.app</div>
          </div>
          <button className="btn btn-ghost" style={{ height: 36, padding: "0 14px", fontSize: 12 }}>Edit</button>
        </div>

        <SGroup title="Daily targets">
          <SRow icon={I.bowl}     c="var(--c-nutrition)" label="Calories" detail="2,200 kcal" />
          <SRow icon={I.moon}     c="var(--c-sleep)"     label="Sleep"    detail="8h 00m" />
          <SRow icon={I.drop}     c="var(--c-water)"     label="Water"    detail="2.5 L" />
          <SRow icon={I.bolt}     c="var(--c-workout)"   label="Steps"    detail="9,000" last />
        </SGroup>

        <SGroup title="Integrations">
          <SRow icon={I.msgSq}    c="var(--accent2)"     label="Telegram bot"  detail="@alex" />
          <SRow icon={I.bell}     c="var(--accent)"      label="Reminders"     toggle on last />
        </SGroup>

        <SGroup title="Data">
          <SRow icon={I.download} c="var(--muted)"       label="Export all data"  detail="JSON" />
          <SRow icon={I.boxes}    c="var(--muted)"        label="Import backup"    last />
        </SGroup>

        <SGroup title="Appearance">
          <SRow icon={I.moon}     c="var(--accent2)"     label="OLED dark"        detail="On" />
          <SRow icon={I.sliders}  c="var(--accent)"      label="Theme · Ember"    last />
        </SGroup>

        <div className="label" style={{ textAlign: "center", fontSize: 12, marginTop: 8 }}>YAHA · v26.0</div>
      </div>
      <TabBar active="gear" />
    </div>
  );
}

Object.assign(window, { ScreenDashboard, ScreenChat, ScreenSettings });
