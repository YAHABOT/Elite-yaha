/* YAHA — Dashboard, three directions. Exports DashAurora / DashEmber / DashTide. */

const wkSleep = [72, 80, 67, 88, 84, 91, 86];

/* ============================================================
   AURORA — soft, round, lime + lilac, a hero energy ring
   ============================================================ */
function DashAurora() {
  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">
        <header className="hdr">
          <div>
            <div className="hdr-kick">Fri · May 30</div>
            <h1 className="hdr-title">Morning, Alex</h1>
          </div>
          <div className="spacer" />
          <div className="icon-btn"><Icon d={I.bell} size={20} /></div>
          <div className="avatar">A</div>
        </header>

        {/* morning protocol hero */}
        <div className="card" style={{
          background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 22%, var(--surface)), var(--surface))",
          borderColor: "var(--border2)", marginBottom: "var(--gap)", display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--accent)", color: "var(--accent-ink)", display: "grid", placeItems: "center", flex: "none" }}>
            <Icon d={I.sun} size={24} sw={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, whiteSpace: "nowrap" }}>Morning Protocol</div>
            <div className="label">3 steps · ~2 min to log</div>
          </div>
          <button className="btn btn-accent" style={{ height: 40, padding: "0 16px" }}>Start <Icon d={I.chevR} size={16} sw={2.4} /></button>
        </div>

        {/* energy ring hero */}
        <div className="card" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="eyebrow">Energy balance</div>
            <span className="chip chip-ghost" style={{ padding: "5px 10px", fontSize: 12 }}>Today</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 14 }}>
            <Ring pct={84} size={132}>
              <div className="metric" style={{ fontSize: 30 }}>1,840</div>
              <div className="label" style={{ fontSize: 11, marginTop: 2 }}>of 2,200 kcal</div>
            </Ring>
            <div className="stack" style={{ flex: 1, gap: 14 }}>
              {[["Consumed", "1,840", "var(--c-nutrition)"], ["Burned", "540", "var(--c-workout)"], ["Net", "1,300", "var(--accent2)"]].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="dot" style={{ background: c }} />
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ fontSize: 12 }}>{k}</div>
                    <div className="metric" style={{ fontSize: 19 }}>{v}<span className="unit">kcal</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sleep + move row */}
        <div className="card-row" style={{ marginBottom: "var(--gap)" }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d={I.moon} size={16} style={{ color: "var(--c-sleep)" }} />
              <span className="eyebrow">Sleep</span>
            </div>
            <div className="metric" style={{ fontSize: 26, marginTop: 12 }}>7<span className="unit">h</span> 1<span className="unit">m</span></div>
            <div className="label" style={{ marginTop: 4 }}>Score <b style={{ color: "var(--text)" }}>86</b> · RHR 53</div>
            <div className="spark" style={{ marginTop: 12 }}>
              {wkSleep.map((v, i) => <i key={i} className={i === 6 ? "on" : ""} style={{ height: `${v}%`, background: i === 6 ? "var(--c-sleep)" : "var(--raise)" }} />)}
            </div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d={I.dumbbell} size={16} style={{ color: "var(--c-workout)" }} />
              <span className="eyebrow">Move</span>
            </div>
            <div className="metric" style={{ fontSize: 26, marginTop: 12 }}>540<span className="unit">kcal</span></div>
            <div className="label" style={{ marginTop: 4 }}>1 session · 48 min</div>
            <div className="bar" style={{ marginTop: 16 }}><i style={{ width: "68%", background: "var(--c-workout)" }} /></div>
            <div className="label" style={{ fontSize: 11, marginTop: 7 }}>68% of weekly goal</div>
          </div>
        </div>

        {/* correlator widgets */}
        <div className="eyebrow" style={{ margin: "6px 2px 10px" }}>Daily summary</div>
        <div className="card-row">
          <div className="card card-2" style={{ flex: 1 }}>
            <div className="label" style={{ fontSize: 12 }}>Calorie balance</div>
            <div className="metric" style={{ fontSize: 24, marginTop: 8, color: "var(--accent)" }}>−360</div>
            <div className="label" style={{ fontSize: 11, marginTop: 2 }}>deficit · on track</div>
          </div>
          <div className="card card-2" style={{ flex: 1 }}>
            <div className="label" style={{ fontSize: 12 }}>Sleep vs Energy</div>
            <div className="metric" style={{ fontSize: 24, marginTop: 8 }}>86<span className="unit">/</span>92</div>
            <div className="label" style={{ fontSize: 11, marginTop: 2 }}>rested & charged</div>
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

/* ============================================================
   EMBER — instrument: dense tile grid, mono, hairlines, coral
   ============================================================ */
function DashEmber() {
  const tiles = [
    { k: "Calories", v: "1,840", u: "/ 2,200", c: "var(--c-nutrition)", icon: I.bowl },
    { k: "Sleep", v: "7:01", u: "score 86", c: "var(--c-sleep)", icon: I.moon },
    { k: "Workout", v: "540", u: "kcal · 48m", c: "var(--c-workout)", icon: I.dumbbell },
    { k: "Water", v: "1.6", u: "/ 2.5 L", c: "var(--c-water)", icon: I.drop },
    { k: "Mood", v: "8.0", u: "/ 10", c: "var(--c-mood)", icon: I.heart },
    { k: "RHR", v: "53", u: "bpm", c: "var(--c-heart)", icon: I.heart },
  ];
  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">
        <header className="hdr" style={{ paddingBottom: 14 }}>
          <div>
            <div className="hdr-kick">2026 · 05 · 30</div>
            <h1 className="hdr-title" style={{ fontSize: 26 }}>Daily readout</h1>
          </div>
          <div className="spacer" />
          <div className="icon-btn"><Icon d={I.search} size={19} /></div>
          <div className="avatar">A</div>
        </header>

        {/* protocol bar */}
        <button className="card" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", marginBottom: "var(--gap)", borderLeft: "3px solid var(--accent)" }}>
          <Icon d={I.sun} size={20} style={{ color: "var(--accent)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Morning Protocol</div>
            <div className="label" style={{ fontSize: 12 }}>Day not started · 3 steps</div>
          </div>
          <span className="chip chip-accent" style={{ padding: "6px 12px" }}>Start day</span>
        </button>

        {/* tile grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          {tiles.map(t => (
            <div key={t.k} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="eyebrow">{t.k}</span>
                <Icon d={t.icon} size={15} style={{ color: t.c }} />
              </div>
              <div className="metric" style={{ fontSize: 23, marginTop: 10 }}>{t.v}</div>
              <div className="label mono" style={{ fontSize: 11, marginTop: 3 }}>{t.u}</div>
            </div>
          ))}
        </div>

        {/* week bar chart */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span className="eyebrow">Sleep efficiency · 7d</span>
            <span className="label mono" style={{ fontSize: 12, color: "var(--accent)" }}>avg 82%</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
            {wkSleep.map((v, i) => (
              <div key={i} style={{ flex: 1, height: `${v}%`, borderRadius: "4px 4px 0 0", background: i === 6 ? "var(--accent)" : "var(--raise)" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["M","T","W","T","F","S","S"].map((l, i) => (
              <span key={i} className="label mono" style={{ flex: 1, textAlign: "center", fontSize: 10 }}>{l}</span>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

/* ============================================================
   TIDE — airy, very round, big thin numbers, cyan, minimal
   ============================================================ */
function DashTide() {
  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">
        <header className="hdr" style={{ paddingBottom: 24 }}>
          <div>
            <div className="hdr-kick">Friday, May 30</div>
            <h1 className="hdr-title" style={{ fontWeight: 700 }}>Hey Alex</h1>
            <div className="hdr-sub">You're rested and ahead of your goals.</div>
          </div>
          <div className="spacer" />
          <div className="avatar">A</div>
        </header>

        {/* big focal number */}
        <div className="card" style={{ textAlign: "center", padding: "30px 22px", marginBottom: "var(--gap)" }}>
          <div className="eyebrow">Readiness</div>
          <div className="metric" style={{ fontSize: 76, fontWeight: 400, margin: "10px 0 4px", color: "var(--accent)" }}>92</div>
          <div className="label">Sleep 86 · HRV high · low strain</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
            {[88, 92, 95].map((v, i) => (
              <div key={i} style={{ flex: 1, maxWidth: 70 }}>
                <div className="bar" style={{ height: 5 }}><i style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* protocol */}
        <button className="card" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 16, marginBottom: "var(--gap)" }}>
          <Icon d={I.sun} size={24} style={{ color: "var(--accent)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Start your morning</div>
            <div className="label" style={{ fontSize: 13 }}>Log sleep, weight & intention</div>
          </div>
          <Icon d={I.chevR} size={20} style={{ color: "var(--muted)" }} />
        </button>

        {/* two quiet stats */}
        <div className="card-row">
          <div className="card" style={{ flex: 1, textAlign: "center" }}>
            <Icon d={I.bowl} size={20} style={{ color: "var(--c-nutrition)" }} />
            <div className="metric" style={{ fontSize: 28, margin: "12px 0 2px", fontWeight: 400 }}>1,840</div>
            <div className="label" style={{ fontSize: 12 }}>kcal · 360 left</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: "center" }}>
            <Icon d={I.moon} size={20} style={{ color: "var(--c-sleep)" }} />
            <div className="metric" style={{ fontSize: 28, margin: "12px 0 2px", fontWeight: 400 }}>7:01</div>
            <div className="label" style={{ fontSize: 12 }}>asleep · score 86</div>
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

Object.assign(window, { DashAurora, DashEmber, DashTide });
