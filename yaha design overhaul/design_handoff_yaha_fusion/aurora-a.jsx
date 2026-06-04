/* YAHA — Accurate screens: Journal, Trackers, TrackerDetail */

/* ===================== JOURNAL ===================== */
function ScreenJournal() {
  return (
    <div className="scr">
      <div className="topspace" />

      {/* Fixed date nav header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 14px 12px", flex: "none",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="icon-btn" style={{ width: 36, height: 36, borderRadius: 10 }}>
          <Icon d={I.menu} size={18} />
        </div>
        <div className="icon-btn" style={{ width: 36, height: 36, borderRadius: 10 }}>
          <Icon d={I.chevL} size={16} />
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Saturday</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 1 }}>May 30, 2026</div>
        </div>
        <div className="icon-btn" style={{ width: 36, height: 36, borderRadius: 10, opacity: 0.35 }}>
          <Icon d={I.chevR} size={16} />
        </div>
        <div style={{ width: 36 }} /> {/* spacer to match hamburger */}
      </div>

      <div className="scr-scroll">
        {/* Correlations */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 10px" }}>
          <span className="eyebrow">Correlations</span>
          <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: 0 }}>+ New</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", marginBottom: 22 }}>
          <div className="card card-2" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Calorie Balance</div>
            <div className="metric" style={{ fontSize: 28, color: "var(--faint)", marginTop: 8, letterSpacing: "0.05em" }}>— — —</div>
          </div>
          <div className="card card-2" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Recovery Index</div>
            <div className="metric" style={{ fontSize: 28, color: "var(--faint)", marginTop: 8, letterSpacing: "0.05em" }}>— — —</div>
          </div>
        </div>

        {/* Entries header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="eyebrow">Entries</span>
          <span className="chip" style={{ padding: "4px 11px", fontSize: 10, fontWeight: 700 }}>5 trackers</span>
        </div>

        {/* Supplements group */}
        <TrackerGroup
          name="Supplements"
          color="var(--c-sleep)"
          entryLabel="1 Entry"
          entries={
            <EntryCard
              time="12:55 PM"
              src="chat"
              fields={[
                ["Creatine Monohydrate", "7 grams"],
                ["Magnesium Citrate (G)", "4 grams"],
              ]}
            />
          }
        />

        {/* Notes group */}
        <TrackerGroup
          name="Notes"
          color="var(--c-mood)"
          entryLabel="1 Entry"
          entries={
            <EntryCard
              time="9:13 AM"
              src="chat"
              fields={[["Benchmark Day", "No", true]]}
            />
          }
        />

        {/* Food group */}
        <TrackerGroup
          name="Food"
          color="var(--c-nutrition)"
          entryLabel="2 Entries"
          entries={<>
            <EntryCard
              time="12:54 PM"
              src="chat"
              fields={[
                ["Item Name", "Protein Bowl"],
                ["Calories", "502 Kcal"],
                ["Protein", "36.92 g"],
                ["Carbs", "38.45 g"],
              ]}
            />
            <EntryCard
              time="8:10 AM"
              src="chat"
              fields={[
                ["Item Name", "Oats + Whey"],
                ["Calories", "380 Kcal"],
              ]}
            />
            <DailyTotals
              color="var(--c-nutrition)"
              onConfigure={() => {}}
              fields={[
                { label: "Calories", value: "882 kcal", agg: "total" },
                { label: "Protein",  value: "36.92 g",  agg: "total" },
                { label: "Carbs",    value: "38.45 g",  agg: "total" },
              ]}
            />
          </>}
        />
      </div>
      <TabBar active="journal" />
    </div>
  );
}

/* ===================== TRACKERS LIST ===================== */
const TRACKERS = [
  { name: "Food",            type: "nutrition", fields: 6,  color: "var(--c-nutrition)" },
  { name: "Supplements",     type: "custom",    fields: 2,  color: "var(--c-sleep)"     },
  { name: "Hyrox benchmark", type: "workout",   fields: 5,  color: "var(--c-workout)"   },
  { name: "Notes",           type: "custom",    fields: 2,  color: "var(--c-mood)"      },
];

function TrackerListCard({ name, type, fields, color }) {
  return (
    <div className="card" style={{
      position: "relative", overflow: "hidden", padding: "16px 16px 14px",
      boxShadow: `0 0 0 1px ${color}15`,
    }}>
      {/* top gradient accent line */}
      <div style={{
        position: "absolute", inset: "0 0 auto", height: 1,
        background: `linear-gradient(to right, transparent, ${color}70, transparent)`,
      }} />
      {/* corner ambient glow */}
      <div style={{
        position: "absolute", right: -28, top: -28, width: 100, height: 100,
        borderRadius: "50%", background: color, opacity: 0.07, filter: "blur(28px)",
        pointerEvents: "none",
      }} />

      {/* icon + name + badges + stacked action buttons */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8, position: "relative" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flex: "none",
          background: `${color}18`, border: `1px solid ${color}30`,
          boxShadow: `0 0 14px -4px ${color}50`,
          display: "grid", placeItems: "center", color: color,
        }}>
          <Icon d={I.activity} size={20} sw={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="disp" style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", display: "block" }}>{name}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            <span style={{
              borderRadius: 999, padding: "3px 9px",
              fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
              background: `${color}18`, color: color, border: `1px solid ${color}28`,
            }}>{type}</span>
            <span style={{
              borderRadius: 999, padding: "3px 9px",
              fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
              background: "var(--raise)", color: "var(--muted)", border: "1px solid var(--border)",
            }}>{fields} fields</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "none" }}>
          <button className="chip" style={{ gap: 5, padding: "7px 13px", fontSize: 12, fontWeight: 700, background: `${color}14`, color: color, borderColor: `${color}28` }}>
            <Icon d={I.journal} size={13} /> Log Entry
          </button>
          <button className="chip" style={{ gap: 5, padding: "7px 13px", fontSize: 12, fontWeight: 700 }}>
            <Icon d={I.pencil} size={13} /> Edit Schema
          </button>
          <button className="chip" style={{ gap: 5, padding: "7px 13px", fontSize: 12, fontWeight: 700 }}>
            <Icon d={I.eye} size={13} /> View History
          </button>
        </div>
      </div>

      {/* no bottom divider — view history is in the button stack above */}
    </div>
  );
}

function ScreenTrackers() {
  return (
    <div className="scr">
      <div className="topspace" />
      <div className="scr-scroll">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em" }}>Trackers</h1>
          <button className="btn btn-accent" style={{ height: 40, padding: "0 16px", fontSize: 13, borderRadius: "var(--r-pill)" }}>
            <Icon d={I.plus} size={15} sw={2.4} /> New Tracker
          </button>
        </div>
        <div className="stack">
          {TRACKERS.map(t => <TrackerListCard key={t.name} {...t} />)}
        </div>
      </div>
      <TabBar active="tracker" />
    </div>
  );
}

/* ===================== TRACKER DETAIL ===================== */
function ScreenTrackerDetail() {
  const [showConfig, setShowConfig] = React.useState(false);
  const color = "var(--c-nutrition)";
  const totalsFields = [
    { label: "Duration",         value: "46m",      agg: "total",   unit: "" },
    { label: "Workout Cals",     value: "527 kcal", agg: "total",   unit: "kcal",  default: "sum" },
    { label: "Avg. Heart Rate",  value: "145 bpm",  agg: "average", unit: "bpm",   default: "avg" },
    { label: "Max. Heart Rate",  value: "176.5 bpm",agg: "average", unit: "bpm",   default: "avg" },
    { label: "Training Intensity",value: "5.75",    agg: "average", unit: "",      default: "avg" },
    { label: "Distance",         value: "1.24 km",  agg: "total",   unit: "km",    default: "sum" },
  ];
  return (
    <div className="scr" style={{ position: "relative" }}>
      <div className="topspace" />
      <div className="scr-scroll">
        {/* back link */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
          <Icon d={I.chevL} size={14} style={{ color: "var(--muted)" }} />
          <span className="flabel" style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Back to Trackers</span>
        </div>

        {/* tracker hero */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flex: "none",
            background: `${color}18`, border: `1px solid ${color}30`,
            boxShadow: `0 0 18px -4px ${color}50`,
            display: "grid", placeItems: "center", color: color,
          }}>
            <Icon d={I.trendUp} size={24} sw={2} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em", margin: 0 }}>Food</h1>
            <div className="flabel" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginTop: 5 }}>
              100 total entries · 6 fields
            </div>
          </div>
        </div>

        {/* Log Entry — full-width below hero like sc2 */}
        <button className="btn btn-accent" style={{ width: "100%", height: 52, marginBottom: 8, gap: 10, fontSize: 14, fontWeight: 900, letterSpacing: "0.08em" }}>
          <Icon d={I.journal} size={20} />
          LOG ENTRY
        </button>

        {/* TODAY — open by default */}
        <CollapsibleDay label="Today" defaultOpen={true}>
          <div className="card card-2" style={{ marginBottom: 4 }}>
            <EntryCard
              time="12:54 PM"
              src="chat"
              actions
              fields={[
                ["Item Name", "Protein Bowl"],
                ["Calories", "502 Kcal"],
                ["Protein", "36.92 g"],
                ["Carbs", "38.45 g"],
                ["Fat", "19.09 g"],
                ["Meal Notes", "120g yo, 55g froyo, 30g CM, 60g straw, 25g BB, 30g evoc", true],
              ]}
            />
            <EntryCard
              time="12:31 PM"
              src="chat"
              actions
              fields={[
                ["Item Name", "Protein Bar (Half)"],
                ["Calories", "149.18 Kcal"],
                ["Protein", "8.45 g"],
                ["Carbs", "11.38 g"],
              ]}
            />
          </div>
          <DailyTotals
            color={color}
            onConfigure={() => setShowConfig(true)}
            fields={[
              { label: "Calories",  value: "651.18 kcal", agg: "total" },
              { label: "Protein",   value: "45.37 g",     agg: "total" },
              { label: "Carbs",     value: "49.83 g",     agg: "total" },
              { label: "Fat",       value: "19.09 g",     agg: "total" },
            ]}
          />
        </CollapsibleDay>

        {/* Thursday — collapsed by default */}
        <CollapsibleDay label="Thursday, May 28" defaultOpen={false}>
          <div className="card card-2" style={{ marginBottom: 4 }}>
            <EntryCard
              time="1:15 PM"
              src="chat"
              actions
              fields={[
                ["Item Name", "Chicken & Rice"],
                ["Calories", "620 Kcal"],
                ["Protein", "48 g"],
                ["Carbs", "52 g"],
              ]}
            />
          </div>
        </CollapsibleDay>

        {/* Wednesday — collapsed by default */}
        <CollapsibleDay label="Wednesday, May 27" defaultOpen={false}>
          <div className="card card-2" style={{ marginBottom: 4 }}>
            <EntryCard
              time="7:30 AM"
              src="telegram"
              actions
              fields={[
                ["Item Name", "Greek Yogurt Bowl"],
                ["Calories", "310 Kcal"],
                ["Protein", "28 g"],
                ["Carbs", "24 g"],
              ]}
            />
          </div>
        </CollapsibleDay>
      </div>
      <TabBar active="tracker" />
      {showConfig && (
        <ConfigureModal
          title="Food"
          onClose={() => setShowConfig(false)}
          fields={[
            { label: "Calories",  unit: "kcal", default: "sum" },
            { label: "Protein",   unit: "g",    default: "sum" },
            { label: "Carbs",     unit: "g",    default: "sum" },
            { label: "Fat",       unit: "g",    default: "avg" },
            { label: "Item Name", unit: "",     default: "hide" },
            { label: "Meal Notes",unit: "",     default: "hide" },
          ]}
        />
      )}
    </div>
  );
}

/* Tracker detail with configure modal open — for canvas */
function ScreenTrackerDetailConfig() {
  const [showConfig, setShowConfig] = React.useState(true);
  const color = "var(--c-nutrition)";
  return (
    <div className="scr" style={{ position: "relative" }}>
      <div className="topspace" />
      <div className="scr-scroll">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
          <Icon d={I.chevL} size={14} style={{ color: "var(--muted)" }} />
          <span className="flabel" style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Back to Trackers</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, flex: "none", background: `${color}18`, border: `1px solid ${color}30`, display: "grid", placeItems: "center", color: color }}>
            <Icon d={I.trendUp} size={24} sw={2} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 900, fontSize: 28, margin: 0 }}>Food</h1>
            <div className="flabel" style={{ fontSize: 10, color: "var(--muted)", marginTop: 5, letterSpacing: "0.12em" }}>100 total entries · 6 fields</div>
          </div>
        </div>
        <button className="btn btn-accent" style={{ width: "100%", height: 52, marginBottom: 8, gap: 10, fontSize: 14, fontWeight: 900 }}>
          <Icon d={I.journal} size={20} /> LOG ENTRY
        </button>
      </div>
      <TabBar active="tracker" />
      {showConfig && (
        <ConfigureModal
          title="Food"
          onClose={() => setShowConfig(false)}
          fields={[
            { label: "Calories",   unit: "kcal", default: "sum"  },
            { label: "Protein",    unit: "g",    default: "sum"  },
            { label: "Carbs",      unit: "g",    default: "sum"  },
            { label: "Fat",        unit: "g",    default: "avg"  },
            { label: "Item Name",  unit: "",     default: "hide" },
            { label: "Meal Notes", unit: "",     default: "hide" },
          ]}
        />
      )}
    </div>
  );
}

Object.assign(window, { ScreenJournal, ScreenTrackers, ScreenTrackerDetail, ScreenTrackerDetailConfig });
