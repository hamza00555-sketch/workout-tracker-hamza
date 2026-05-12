import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const USER = "حمزة";

const GREETINGS = [
  `يلا ${USER} 💪 اليوم بنكسر الجيم!`,
  `مرحبا ${USER} 👋🔥 جاهز تتفوق على أمس؟`,
  `${USER}! الألم مؤقت، الـ gains دايمة 🏆`,
  `صباح العضلات يا ${USER} ⚡ بنشتغل اليوم؟`,
  `${USER} في البيت 🔥 الجيم ما يستاهل أكثر منك`,
];

const MUSCLE_GROUPS = {
  Chest: { emoji: "🫁", color: "#FF6B35", exercises: [
    { name: "Bench Press", emoji: "🏋️" },
    { name: "Incline Bench Press", emoji: "📐" },
    { name: "Decline Bench Press", emoji: "📉" },
    { name: "Cable Fly", emoji: "🔄" },
    { name: "Dumbbell Fly", emoji: "🦋" },
    { name: "Push-Up", emoji: "👐" },
    { name: "Chest Dip", emoji: "⬇️" },
    { name: "Pec Deck", emoji: "🦅" },
  ]},
  Back: { emoji: "🗂️", color: "#3B82F6", exercises: [
    { name: "Deadlift", emoji: "⚔️" },
    { name: "Pull-Up", emoji: "🪝" },
    { name: "Barbell Row", emoji: "🚣" },
    { name: "Cable Row", emoji: "🎯" },
    { name: "Lat Pulldown", emoji: "⬇️" },
    { name: "T-Bar Row", emoji: "🔱" },
    { name: "Face Pull", emoji: "😤" },
    { name: "Single Arm Row", emoji: "🤜" },
  ]},
  Shoulders: { emoji: "🦾", color: "#A855F7", exercises: [
    { name: "Overhead Press", emoji: "☝️" },
    { name: "Dumbbell OHP", emoji: "🏋️" },
    { name: "Lateral Raise", emoji: "🦅" },
    { name: "Front Raise", emoji: "⬆️" },
    { name: "Rear Delt Fly", emoji: "🔙" },
    { name: "Arnold Press", emoji: "💪" },
    { name: "Upright Row", emoji: "🧲" },
    { name: "Cable Lateral Raise", emoji: "🔄" },
  ]},
  Legs: { emoji: "🦵", color: "#22C55E", exercises: [
    { name: "Barbell Squat", emoji: "👑" },
    { name: "Leg Press", emoji: "🔧" },
    { name: "Romanian Deadlift", emoji: "🇷🇴" },
    { name: "Leg Extension", emoji: "🦵" },
    { name: "Leg Curl", emoji: "🌀" },
    { name: "Lunge", emoji: "🚶" },
    { name: "Hip Thrust", emoji: "🍑" },
    { name: "Calf Raise", emoji: "🧦" },
  ]},
  Biceps: { emoji: "💪", color: "#EAB308", exercises: [
    { name: "Barbell Curl", emoji: "🏋️" },
    { name: "Dumbbell Curl", emoji: "🤜" },
    { name: "Hammer Curl", emoji: "🔨" },
    { name: "Preacher Curl", emoji: "🙏" },
    { name: "Cable Curl", emoji: "🔄" },
    { name: "Incline Dumbbell Curl", emoji: "📐" },
    { name: "Concentration Curl", emoji: "🎯" },
  ]},
  Triceps: { emoji: "🔱", color: "#F97316", exercises: [
    { name: "Triceps Pushdown", emoji: "⬇️" },
    { name: "Skull Crusher", emoji: "💀" },
    { name: "Overhead Triceps", emoji: "☝️" },
    { name: "Diamond Push-Up", emoji: "💎" },
    { name: "Triceps Dip", emoji: "🏊" },
    { name: "Close-Grip Bench", emoji: "🤏" },
  ]},
  Core: { emoji: "🎯", color: "#EC4899", exercises: [
    { name: "Plank", emoji: "📏" },
    { name: "Crunches", emoji: "🌀" },
    { name: "Leg Raise", emoji: "🦵" },
    { name: "Russian Twist", emoji: "🌪️" },
    { name: "Ab Wheel", emoji: "⚙️" },
    { name: "Cable Crunch", emoji: "🔄" },
  ]},
  Cardio: { emoji: "❤️", color: "#EF4444", exercises: [
    { name: "Treadmill Run", emoji: "🏃" },
    { name: "Rowing Machine", emoji: "🚣" },
    { name: "Jump Rope", emoji: "🪢" },
    { name: "Stationary Bike", emoji: "🚴" },
    { name: "Stair Climber", emoji: "🪜" },
    { name: "Battle Ropes", emoji: "🌊" },
  ]},
};

const ROUTINES = [
  { name: "Chest Day 🫁", muscles: ["Chest", "Triceps"], exercises: [
    { muscle: "Chest", name: "Bench Press", emoji: "🏋️" },
    { muscle: "Chest", name: "Incline Bench Press", emoji: "📐" },
    { muscle: "Chest", name: "Cable Fly", emoji: "🔄" },
    { muscle: "Chest", name: "Pec Deck", emoji: "🦅" },
    { muscle: "Triceps", name: "Triceps Pushdown", emoji: "⬇️" },
    { muscle: "Triceps", name: "Skull Crusher", emoji: "💀" },
  ]},
  { name: "Pull Day 🗂️", muscles: ["Back", "Biceps"], exercises: [
    { muscle: "Back", name: "Deadlift", emoji: "⚔️" },
    { muscle: "Back", name: "Lat Pulldown", emoji: "⬇️" },
    { muscle: "Back", name: "Barbell Row", emoji: "🚣" },
    { muscle: "Back", name: "Face Pull", emoji: "😤" },
    { muscle: "Biceps", name: "Barbell Curl", emoji: "🏋️" },
    { muscle: "Biceps", name: "Hammer Curl", emoji: "🔨" },
  ]},
  { name: "Push Day 🦾", muscles: ["Chest", "Shoulders", "Triceps"], exercises: [
    { muscle: "Chest", name: "Bench Press", emoji: "🏋️" },
    { muscle: "Shoulders", name: "Overhead Press", emoji: "☝️" },
    { muscle: "Chest", name: "Incline Bench Press", emoji: "📐" },
    { muscle: "Shoulders", name: "Lateral Raise", emoji: "🦅" },
    { muscle: "Triceps", name: "Triceps Pushdown", emoji: "⬇️" },
  ]},
  { name: "Legs Day 🦵", muscles: ["Legs"], exercises: [
    { muscle: "Legs", name: "Barbell Squat", emoji: "👑" },
    { muscle: "Legs", name: "Romanian Deadlift", emoji: "🇷🇴" },
    { muscle: "Legs", name: "Leg Press", emoji: "🔧" },
    { muscle: "Legs", name: "Leg Extension", emoji: "🦵" },
    { muscle: "Legs", name: "Leg Curl", emoji: "🌀" },
    { muscle: "Legs", name: "Calf Raise", emoji: "🧦" },
  ]},
  { name: "Full Body ⚡", muscles: ["Chest", "Back", "Legs", "Shoulders"], exercises: [
    { muscle: "Chest", name: "Bench Press", emoji: "🏋️" },
    { muscle: "Back", name: "Deadlift", emoji: "⚔️" },
    { muscle: "Legs", name: "Barbell Squat", emoji: "👑" },
    { muscle: "Shoulders", name: "Overhead Press", emoji: "☝️" },
    { muscle: "Back", name: "Pull-Up", emoji: "🪝" },
    { muscle: "Core", name: "Plank", emoji: "📏" },
  ]},
  { name: "Upper Body 🏆", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"], exercises: [
    { muscle: "Chest", name: "Bench Press", emoji: "🏋️" },
    { muscle: "Back", name: "Barbell Row", emoji: "🚣" },
    { muscle: "Shoulders", name: "Overhead Press", emoji: "☝️" },
    { muscle: "Biceps", name: "Barbell Curl", emoji: "🏋️" },
    { muscle: "Triceps", name: "Triceps Pushdown", emoji: "⬇️" },
  ]},
];

const REST_PRESETS = [60, 90, 120, 180];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const today = () => new Date().toISOString().split("T")[0];

const fmtDate = (iso) => new Date(iso).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

const calcStreak = (sessions) => {
  if (!sessions.length) return 0;
  const days = [...new Set(sessions.map(s => s.date.split("T")[0]))].sort().reverse();
  let streak = 0, cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const d of days) {
    const dd = new Date(d);
    const diff = Math.round((cursor - dd) / 86400000);
    if (diff <= 1) { streak++; cursor = dd; } else break;
  }
  return streak;
};

const calc1RM = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30));

const toArabicNum = (n) => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Badge({ children, color = "#FF6B35" }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11,
      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function GlowBtn({ children, onClick, style = {}, variant = "primary", disabled = false }) {
  const base = {
    border: "none", borderRadius: 10, padding: "11px 20px",
    fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.18s ease", outline: "none",
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: "linear-gradient(135deg,#FF6B35,#FF8C5A)", color: "#fff", boxShadow: "0 4px 20px #FF6B3544" },
    ghost: { background: "transparent", color: "#888", border: "1px solid #2a2a2a" },
    danger: { background: "#EF44441a", color: "#EF4444", border: "1px solid #EF444433" },
    success: { background: "#22C55E1a", color: "#22C55E", border: "1px solid #22C55E33" },
    gold: { background: "linear-gradient(135deg,#EAB308,#F59E0B)", color: "#0a0a0a", boxShadow: "0 4px 20px #EAB30844" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      onClick={disabled ? undefined : onClick}
    >{children}</button>
  );
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e", borderRadius: 14,
      padding: 18, boxShadow: glow ? `0 0 30px ${glow}18` : "none",
      ...style,
    }}>{children}</div>
  );
}

function StatBox({ label, value, color = "#FF6B35", sub }) {
  return (
    <Card style={{ flex: 1, textAlign: "center", padding: "16px 12px" }} glow={color}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#333", fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>{sub}</div>}
      <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 12, color: "#555", marginTop: 6 }}>{label}</div>
    </Card>
  );
}

// ─── REST TIMER ───────────────────────────────────────────────────────────────

function RestTimer({ onClose }) {
  const [selected, setSelected] = useState(90);
  const [remaining, setRemaining] = useState(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000);
    } else if (remaining === 0) {
      setRunning(false);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15, 0.3].forEach(t => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 880; g.gain.setValueAtTime(0.3, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
          o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
        });
      } catch {}
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const start = () => { setRemaining(selected); setRunning(true); };
  const stop = () => { setRunning(false); clearInterval(intervalRef.current); };
  const reset = () => { stop(); setRemaining(null); };

  const pct = remaining !== null ? (remaining / selected) * 100 : 100;
  const r = 52, circ = 2 * Math.PI * r;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20,
    }}>
      <Card style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Tajawal'", fontSize: 16, fontWeight: 700 }}>⏱️ Rest Timer</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <svg width={130} height={130} viewBox="0 0 130 130" style={{ margin: "0 auto 20px", display: "block" }}>
          <circle cx={65} cy={65} r={r} fill="none" stroke="#1a1a1a" strokeWidth={8} />
          <circle cx={65} cy={65} r={r} fill="none" stroke="#FF6B35" strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" transform="rotate(-90 65 65)"
            style={{ transition: "stroke-dashoffset 1s linear", stroke: remaining === 0 ? "#22C55E" : "#FF6B35" }} />
          <text x={65} y={70} textAnchor="middle" fill="#e8e2d9"
            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 700 }}>
            {remaining !== null
              ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
              : `${String(Math.floor(selected / 60)).padStart(2, "0")}:${String(selected % 60).padStart(2, "0")}`}
          </text>
          {remaining === 0 && <text x={65} y={90} textAnchor="middle" fill="#22C55E" style={{ fontSize: 12 }}>خلصت! 🎉</text>}
        </svg>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {REST_PRESETS.map(p => (
            <button key={p} onClick={() => { setSelected(p); reset(); }} style={{
              background: selected === p ? "#FF6B3522" : "#111",
              border: `1px solid ${selected === p ? "#FF6B35" : "#2a2a2a"}`,
              borderRadius: 8, padding: "6px 12px", color: selected === p ? "#FF6B35" : "#555",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, cursor: "pointer",
            }}>{p}s</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!running && remaining === null && <GlowBtn onClick={start}>▶ ابدأ</GlowBtn>}
          {running && <GlowBtn onClick={stop} variant="danger">⏸ وقف</GlowBtn>}
          {!running && remaining !== null && remaining > 0 && <GlowBtn onClick={() => setRunning(true)}>▶ استمر</GlowBtn>}
          {remaining !== null && <GlowBtn onClick={reset} variant="ghost">↺ إعادة</GlowBtn>}
        </div>
      </Card>
    </div>
  );
}

// ─── AI PANEL ────────────────────────────────────────────────────────────────

function AIPanel({ onImport, onClose }) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);

  const ask = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResponse(""); setImported(false);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `أنت مدرب لياقة بدنية محترف تتحدث بالعربية. المستخدم اسمه حمزة.
عندما تُسأل عن روتين أو برنامج تمارين، أعطِ إجابتك كـ JSON في هذا الشكل المحدد بالضبط (لا تضف أي نص قبله أو بعده):
{
  "routine_name": "اسم الروتين",
  "exercises": [
    {"muscle": "Back", "name": "Deadlift", "emoji": "⚔️", "sets": 4, "reps_suggestion": "5"}
  ]
}
المجموعات العضلية المتاحة: Chest, Back, Shoulders, Legs, Biceps, Triceps, Core, Cardio.
إذا السؤال ليس عن روتين بل عن نصيحة عامة، أجب بشكل طبيعي بالعربية.`,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "لم أحصل على رد.";
      setResponse(text);
    } catch (e) {
      setResponse("حدث خطأ: " + e.message);
    }
    setLoading(false);
  };

  const tryImport = () => {
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (!match) return alert("ما قدرت استورد الروتين، الـ AI ما أعطى JSON واضح.");
      const data = JSON.parse(match[0]);
      if (!data.exercises?.length) return alert("ما في تمارين في الروتين.");
      onImport(data);
      setImported(true);
    } catch { alert("خطأ في استيراد الروتين."); }
  };

  const hasJSON = /\{[\s\S]*"exercises"/.test(response);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 999, padding: 20,
    }}>
      <Card style={{ width: "100%", maxWidth: 540, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Tajawal'", fontSize: 17, fontWeight: 800 }}>🤖 مساعد الـ AI</div>
            <div style={{ fontSize: 11, color: "#444", fontFamily: "'IBM Plex Mono',monospace" }}>Powered by Claude</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {["اقترح لي برنامج Push Pull Legs", "أفضل تمارين الصدر", "برنامج لزيادة الكتلة العضلية", "روتين أيام الأرجل"].map(q => (
            <button key={q} onClick={() => setPrompt(q)} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20,
              padding: "5px 12px", color: "#888", fontSize: 11, cursor: "pointer",
              fontFamily: "'Tajawal',sans-serif",
            }}>{q}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="اسأل عن أي شيء... تمارين، روتين، نصيحة، أي شيء 💬"
            rows={3}
            style={{
              flex: 1, background: "#0d0d0d", border: "1px solid #222", borderRadius: 10,
              padding: 12, color: "#e8e2d9", fontFamily: "'Tajawal',sans-serif", fontSize: 14,
              resize: "none", outline: "none",
            }}
          />
          <GlowBtn onClick={ask} disabled={loading} style={{ alignSelf: "flex-end", padding: "12px 16px" }}>
            {loading ? "⏳" : "إرسال"}
          </GlowBtn>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#FF6B35", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, padding: 20 }}>
            ⚡ Claude يفكر...
          </div>
        )}

        {response && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{
              background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10,
              padding: 14, fontFamily: "'Tajawal',sans-serif", fontSize: 14,
              color: "#ccc", lineHeight: 1.8, marginBottom: 12, whiteSpace: "pre-wrap",
            }}>{response}</div>
            {hasJSON && !imported && (
              <GlowBtn onClick={tryImport} variant="gold" style={{ width: "100%" }}>
                📥 استورد الروتين تلقائياً
              </GlowBtn>
            )}
            {imported && (
              <div style={{ textAlign: "center", color: "#22C55E", fontFamily: "'Tajawal'", fontSize: 14, padding: 8 }}>
                ✅ تم استيراد الروتين! افتح تبويب "اليوم" لتشوفه
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── PROGRESS PHOTOS ─────────────────────────────────────────────────────────

function PhotosTab() {
  const [photos, setPhotos] = useState(() => ls.get("wt_photos", []));
  const [view, setView] = useState("Front");
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();

  useEffect(() => ls.set("wt_photos", photos), [photos]);

  const addPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const p = { id: Date.now(), date: new Date().toISOString(), angle: view, src: ev.target.result };
      setPhotos(prev => [p, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filtered = photos.filter(p => p.angle === view);

  return (
    <div style={{ padding: "0 0 100px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
        {["Front", "Side", "Back"].map(a => (
          <button key={a} onClick={() => setView(a)} style={{
            background: view === a ? "#FF6B3522" : "#111",
            border: `1px solid ${view === a ? "#FF6B35" : "#2a2a2a"}`,
            borderRadius: 20, padding: "7px 18px", color: view === a ? "#FF6B35" : "#555",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, cursor: "pointer",
          }}>{a}</button>
        ))}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={addPhoto} />
        <GlowBtn onClick={() => fileRef.current?.click()} style={{ fontSize: 12, padding: "7px 16px" }}>
          + إضافة
        </GlowBtn>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#333" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <div style={{ fontFamily: "'Tajawal'", fontSize: 16, color: "#444", marginBottom: 8 }}>لا يوجد صور {view} بعد</div>
          <div style={{ fontSize: 12, color: "#2a2a2a" }}>أضف صورة لتتبع تقدمك 💪</div>
        </div>
      ) : (
        <div style={{ columns: 2, gap: 10 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setLightbox(p)} style={{
              breakInside: "avoid", marginBottom: 10, borderRadius: 12, overflow: "hidden",
              cursor: "pointer", border: "1px solid #1e1e1e",
              transition: "transform 0.2s", position: "relative",
            }}>
              <img src={p.src} alt={p.angle} style={{ width: "100%", display: "block" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent,#000a)",
                padding: "20px 10px 8px",
              }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#888" }}>
                  {fmtDate(p.date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, background: "#000000ee",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.angle} style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 14 }} />
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: "'Tajawal'", color: "#888", fontSize: 13 }}>
              {lightbox.angle} · {fmtDate(lightbox.date)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
              <GlowBtn onClick={() => setLightbox(null)} variant="ghost">إغلاق</GlowBtn>
              <GlowBtn onClick={() => { setPhotos(p => p.filter(x => x.id !== lightbox.id)); setLightbox(null); }} variant="danger">حذف</GlowBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GRAPHS TAB ───────────────────────────────────────────────────────────────

function GraphsTab({ sessions }) {
  const [selectedEx, setSelectedEx] = useState(null);

  const allExercises = [...new Set(sessions.flatMap(s => s.sets.map(x => x.name)))];

  const volumeData = sessions.slice(-10).map(s => ({
    date: s.date.split("T")[0],
    volume: s.sets.reduce((a, x) => a + x.sets.reduce((b, set) => b + (set.done ? (parseFloat(set.weight) || 0) * ((parseInt(set.r1) || 0) + (parseInt(set.r2) || 0) + (parseInt(set.r3) || 0)) : 0), 0), 0),
  }));

  const exHistory = selectedEx
    ? sessions
        .filter(s => s.sets.some(x => x.name === selectedEx))
        .map(s => {
          const sets = s.sets.filter(x => x.name === selectedEx);
          const maxW = Math.max(...sets.flatMap(x => x.sets.map(ss => parseFloat(ss.weight) || 0)));
          const maxR = Math.max(...sets.flatMap(x => x.sets.map(ss => parseInt(ss.r1) || 0)));
          return { date: s.date.split("T")[0], orm: calc1RM(maxW, maxR), weight: maxW };
        })
        .slice(-10)
    : [];

  const muscleCount = {};
  sessions.flatMap(s => s.sets).forEach(x => { muscleCount[x.muscle] = (muscleCount[x.muscle] || 0) + 1; });
  const totalSets = Object.values(muscleCount).reduce((a, b) => a + b, 0) || 1;

  // Simple SVG bar chart
  const BarChart = ({ data, valueKey, color }) => {
    if (!data.length) return <div style={{ color: "#333", textAlign: "center", padding: 20, fontSize: 13, fontFamily: "'Tajawal'" }}>لا يوجد بيانات كافية</div>;
    const max = Math.max(...data.map(d => d[valueKey])) || 1;
    const W = 300, H = 100, barW = (W - 20) / data.length - 4;
    return (
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: "100%", overflow: "visible" }}>
        {data.map((d, i) => {
          const bh = (d[valueKey] / max) * H;
          const x = 10 + i * ((W - 20) / data.length) + 2;
          return (
            <g key={i}>
              <rect x={x} y={H - bh} width={barW} height={bh} rx={3} fill={color + "88"} />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fill="#444" style={{ fontSize: 8, fontFamily: "monospace" }}>
                {d.date?.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ padding: "0 0 100px", display: "flex", flexDirection: "column", gap: 16 }}>
      <Card glow="#FF6B35">
        <div style={{ fontFamily: "'Tajawal'", fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#888" }}>
          📊 Volume أخر 10 جلسات
        </div>
        <BarChart data={volumeData} valueKey="volume" color="#FF6B35" />
      </Card>

      <Card glow="#3B82F6">
        <div style={{ fontFamily: "'Tajawal'", fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#888" }}>
          🎯 توزيع العضلات
        </div>
        {Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).map(([m, c]) => {
          const color = MUSCLE_GROUPS[m]?.color || "#555";
          const pct = Math.round((c / totalSets) * 100);
          return (
            <div key={m} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "'Tajawal'", fontSize: 13 }}>{MUSCLE_GROUPS[m]?.emoji} {m}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#444" }}>{c} sets · {pct}%</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: 4, height: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card glow="#EAB308">
        <div style={{ fontFamily: "'Tajawal'", fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#888" }}>
          📈 تطور 1RM لكل تمرين
        </div>
        <select
          value={selectedEx || ""}
          onChange={e => setSelectedEx(e.target.value)}
          style={{
            background: "#0d0d0d", border: "1px solid #222", borderRadius: 8,
            padding: "8px 12px", color: "#e8e2d9", fontFamily: "'Tajawal',sans-serif",
            fontSize: 13, width: "100%", marginBottom: 12, outline: "none",
          }}
        >
          <option value="">— اختر تمرين —</option>
          {allExercises.map(ex => <option key={ex}>{ex}</option>)}
        </select>
        {selectedEx && <BarChart data={exHistory} valueKey="orm" color="#EAB308" />}
        {selectedEx && exHistory.length > 0 && (
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#555", marginTop: 8, textAlign: "center" }}>
            Max 1RM: {Math.max(...exHistory.map(x => x.orm))} kg
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── CALENDAR HEATMAP ─────────────────────────────────────────────────────────

function CalendarHeatmap({ sessions }) {
  const counts = {};
  sessions.forEach(s => { const d = s.date.split("T")[0]; counts[d] = (counts[d] || 0) + 1; });

  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - 83);

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().split("T")[0];
    days.push({ iso, count: counts[iso] || 0 });
  }

  const weeks = [];
  let week = [];
  const firstDay = new Date(start).getDay();
  for (let i = 0; i < firstDay; i++) week.push(null);
  days.forEach(d => {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const getColor = (c) => {
    if (!c) return "#1a1a1a";
    if (c === 1) return "#FF6B3555";
    if (c === 2) return "#FF6B3588";
    return "#FF6B35";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 3, minWidth: "fit-content" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {week.map((d, di) => (
              <div key={di} title={d ? `${d.iso}: ${d.count} جلسات` : ""}
                style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: d ? getColor(d.count) : "#111",
                  cursor: d?.count ? "pointer" : "default",
                }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 10, color: "#333", fontFamily: "'IBM Plex Mono',monospace" }}>أقل</span>
        {["#1a1a1a", "#FF6B3555", "#FF6B3588", "#FF6B35"].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "#333", fontFamily: "'IBM Plex Mono',monospace" }}>أكثر</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function HamzaFit() {
  const [tab, setTab] = useState("home");
  const [sessions, setSessions] = useState(() => ls.get("wt_sessions", []));
  const [active, setActive] = useState(() => ls.get("wt_active", null));
  const [showRest, setShowRest] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // Add exercise modal state
  const [showAddEx, setShowAddEx] = useState(false);
  const [addForm, setAddForm] = useState({ muscle: "Chest", name: "", emoji: "🏋️", isCustom: false, customName: "" });
  const [expandedSet, setExpandedSet] = useState(null);

  // Routines picker
  const [showRoutines, setShowRoutines] = useState(false);

  // History expand
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => { ls.set("wt_sessions", sessions); }, [sessions]);
  useEffect(() => { ls.set("wt_active", active); }, [active]);

  const streak = calcStreak(sessions);

  const startSession = (preloadedSets) => {
    const s = {
      id: Date.now(),
      date: new Date().toISOString(),
      sets: preloadedSets || [],
      duration: null,
    };
    setActive(s);
    setTab("today");
    setShowRoutines(false);
  };

  const finishSession = () => {
    if (!active) return;
    const finished = { ...active, duration: Math.round((Date.now() - active.id) / 60000) };
    setSessions(prev => [finished, ...prev]);
    setActive(null);
    setTab("history");
  };

  const updateActive = useCallback((updater) => {
    setActive(prev => {
      const next = updater(prev);
      return next;
    });
  }, []);

  const addExercise = () => {
    const exName = addForm.isCustom ? addForm.customName : addForm.name;
    if (!exName) return;
    const newEx = {
      id: Date.now(),
      muscle: addForm.muscle,
      name: exName,
      emoji: addForm.emoji,
      sets: [{ weight: "", r1: "", r2: "", r3: "", done: false }],
    };
    updateActive(prev => ({ ...prev, sets: [...(prev.sets || []), newEx] }));
    setShowAddEx(false);
    setAddForm({ muscle: "Chest", name: "", emoji: "🏋️", isCustom: false, customName: "" });
  };

  const removeExercise = (exId) => {
    updateActive(prev => ({ ...prev, sets: prev.sets.filter(x => x.id !== exId) }));
  };

  const updateSet = (exId, setIdx, field, value) => {
    updateActive(prev => ({
      ...prev,
      sets: prev.sets.map(ex => ex.id !== exId ? ex : {
        ...ex,
        sets: ex.sets.map((s, i) => i !== setIdx ? s : { ...s, [field]: value }),
      }),
    }));
  };

  const addSet = (exId) => {
    updateActive(prev => ({
      ...prev,
      sets: prev.sets.map(ex => ex.id !== exId ? ex : {
        ...ex,
        sets: [...ex.sets, { weight: ex.sets.at(-1)?.weight || "", r1: "", r2: "", r3: "", done: false }],
      }),
    }));
  };

  const removeSet = (exId, setIdx) => {
    updateActive(prev => ({
      ...prev,
      sets: prev.sets.map(ex => ex.id !== exId ? ex : {
        ...ex,
        sets: ex.sets.filter((_, i) => i !== setIdx),
      }),
    }));
  };

  const getPrevPerf = (name) => {
    for (const s of sessions) {
      const ex = s.sets.find(x => x.name === name);
      if (ex) {
        const lastSet = ex.sets.find(ss => ss.done && ss.weight);
        if (lastSet) return `${lastSet.weight}kg × ${lastSet.r1}`;
      }
    }
    return null;
  };

  const importAIRoutine = (data) => {
    const sets = data.exercises.map((ex, i) => ({
      id: Date.now() + i,
      muscle: ex.muscle,
      name: ex.name,
      emoji: ex.emoji || "🏋️",
      sets: Array.from({ length: ex.sets || 3 }, () => ({
        weight: "", r1: ex.reps_suggestion || "", r2: ex.reps_suggestion || "", r3: "", done: false,
      })),
    }));
    if (!active) {
      startSession(sets);
    } else {
      updateActive(prev => ({ ...prev, sets: [...(prev.sets || []), ...sets] }));
      setTab("today");
    }
    setShowAI(false);
  };

  const loadRoutine = (r) => {
    const sets = r.exercises.map((ex, i) => ({
      id: Date.now() + i,
      muscle: ex.muscle,
      name: ex.name,
      emoji: ex.emoji || "🏋️",
      sets: [
        { weight: "", r1: "", r2: "", r3: "", done: false },
        { weight: "", r1: "", r2: "", r3: "", done: false },
        { weight: "", r1: "", r2: "", r3: "", done: false },
      ],
    }));
    startSession(sets);
  };

  // ── TABS ──

  const HomeTab = () => (
    <div style={{ padding: "0 0 100px" }}>
      {/* Greeting */}
      <div style={{
        background: "linear-gradient(135deg,#1a0d08,#0d0d0d)",
        border: "1px solid #FF6B3522",
        borderRadius: 16, padding: "22px 20px", marginBottom: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -20, right: -20, width: 120, height: 120,
          background: "#FF6B3510", borderRadius: "50%", filter: "blur(30px)",
        }} />
        <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 22, fontWeight: 900, marginBottom: 6, lineHeight: 1.3 }}>
          {greeting}
        </div>
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge color="#FF6B35">🔥 {toArabicNum(streak)} يوم على التوالي</Badge>
          </div>
        )}
        {streak === 0 && (
          <div style={{ fontFamily: "'Tajawal'", fontSize: 13, color: "#444" }}>ابدأ جلسة اليوم لتبدأ streak 🔥</div>
        )}
      </div>

      {/* Stats row */}
      {sessions.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <StatBox label="إجمالي الجلسات" value={sessions.length} color="#FF6B35" />
          <StatBox label="هذا الأسبوع" value={sessions.filter(s => (Date.now() - new Date(s.date)) < 7 * 86400000).length} color="#22C55E" />
          <StatBox label="Streak 🔥" value={streak} color="#EAB308" />
        </div>
      )}

      {/* Calendar */}
      {sessions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Tajawal'", fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 12 }}>
            📅 نشاط ١٢ أسبوع
          </div>
          <CalendarHeatmap sessions={sessions} />
        </Card>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!active ? (
          <>
            <GlowBtn onClick={() => startSession()} style={{ width: "100%", padding: "15px", fontSize: 16 }}>
              🚀 جلسة جديدة
            </GlowBtn>
            <GlowBtn onClick={() => setShowRoutines(true)} variant="ghost" style={{ width: "100%", padding: "13px", fontSize: 15 }}>
              📋 ابدأ بروتين جاهز
            </GlowBtn>
          </>
        ) : (
          <div style={{
            background: "#FF6B3511", border: "1px solid #FF6B3533",
            borderRadius: 12, padding: "14px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontFamily: "'Tajawal'", fontSize: 14, fontWeight: 700, color: "#FF6B35" }}>🔥 جلسة نشطة</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#555", marginTop: 2 }}>
                {active.sets.length} تمرين · {Math.round((Date.now() - active.id) / 60000)} دقيقة
              </div>
            </div>
            <GlowBtn onClick={() => setTab("today")} style={{ fontSize: 13, padding: "9px 16px" }}>
              متابعة ←
            </GlowBtn>
          </div>
        )}
        <GlowBtn onClick={() => setShowAI(true)} variant="gold" style={{ width: "100%", padding: "13px", fontSize: 15 }}>
          🤖 ساعدني بالـ AI
        </GlowBtn>
      </div>
    </div>
  );

  const TodayTab = () => {
    if (!active) return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
        <div style={{ fontFamily: "'Tajawal'", fontSize: 18, color: "#444", marginBottom: 20 }}>ما في جلسة نشطة</div>
        <GlowBtn onClick={() => startSession()} style={{ fontSize: 15, padding: "13px 28px" }}>🚀 ابدأ جلسة</GlowBtn>
      </div>
    );

    const totalDone = active.sets.flatMap(x => x.sets).filter(s => s.done).length;
    const totalSets = active.sets.flatMap(x => x.sets).length;

    return (
      <div style={{ paddingBottom: 100 }}>
        {/* Session header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#FF6B35" }}>● LIVE SESSION</div>
            <div style={{ fontFamily: "'Tajawal'", fontSize: 13, color: "#555", marginTop: 2 }}>
              {fmtTime(active.date)} · {Math.round((Date.now() - active.id) / 60000)} دقيقة
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <GlowBtn onClick={() => setShowRest(true)} variant="ghost" style={{ fontSize: 12, padding: "8px 14px" }}>⏱️ Rest</GlowBtn>
            <GlowBtn onClick={finishSession} variant="success" style={{ fontSize: 13, padding: "8px 16px" }}>✓ إنهاء</GlowBtn>
          </div>
        </div>

        {/* Progress bar */}
        {totalSets > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Tajawal'", fontSize: 12, color: "#555" }}>التقدم</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#22C55E" }}>
                {totalDone}/{totalSets}
              </span>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: 4, height: 4 }}>
              <div style={{
                height: "100%", width: `${(totalDone / totalSets) * 100}%`,
                background: "linear-gradient(90deg,#FF6B35,#22C55E)",
                borderRadius: 4, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {/* Exercises */}
        {active.sets.map(ex => {
          const prev = getPrevPerf(ex.name);
          const color = MUSCLE_GROUPS[ex.muscle]?.color || "#FF6B35";
          const isExpanded = expandedSet === ex.id;
          return (
            <Card key={ex.id} style={{ marginBottom: 12 }} glow={color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{ex.emoji}</span>
                    <span style={{ fontFamily: "'Tajawal'", fontSize: 15, fontWeight: 700 }}>{ex.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge color={color}>{MUSCLE_GROUPS[ex.muscle]?.emoji} {ex.muscle}</Badge>
                    {prev && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#444" }}>prev: {prev}</span>}
                  </div>
                </div>
                <button onClick={() => removeExercise(ex.id)} style={{
                  background: "none", border: "none", color: "#2a2a2a",
                  fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1,
                  transition: "color 0.2s",
                }}>×</button>
              </div>

              {/* Sets table */}
              <div style={{ marginBottom: 8 }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 36px", gap: 4, marginBottom: 6 }}>
                  {["#", "Weight", "Rep 1", "Rep 2", "Rep 3", "✓"].map(h => (
                    <div key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#333", textAlign: "center" }}>{h}</div>
                  ))}
                </div>
                {ex.sets.map((s, si) => (
                  <div key={si} style={{
                    display: "grid", gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 36px",
                    gap: 4, marginBottom: 5, opacity: s.done ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#333" }}>{si + 1}</span>
                    </div>
                    {["weight", "r1", "r2", "r3"].map(field => (
                      <input key={field}
                        type="number" inputMode="decimal"
                        value={s[field]}
                        onChange={e => updateSet(ex.id, si, field, e.target.value)}
                        placeholder={field === "weight" ? "kg" : "-"}
                        disabled={s.done}
                        style={{
                          background: "#0d0d0d", border: `1px solid ${s.done ? "#111" : "#222"}`,
                          borderRadius: 6, padding: "7px 4px", color: "#e8e2d9",
                          fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
                          textAlign: "center", outline: "none", width: "100%",
                          transition: "border-color 0.2s",
                        }}
                      />
                    ))}
                    <button
                      onClick={() => { updateSet(ex.id, si, "done", !s.done); if (!s.done) setShowRest(true); }}
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        border: `2px solid ${s.done ? "#22C55E" : "#2a2a2a"}`,
                        background: s.done ? "#22C55E" : "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", fontSize: 13,
                      }}
                    >{s.done ? "✓" : ""}</button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => addSet(ex.id)} style={{
                  background: "none", border: "1px dashed #2a2a2a", borderRadius: 8,
                  padding: "6px 14px", color: "#555", fontSize: 12,
                  fontFamily: "'Tajawal',sans-serif", cursor: "pointer",
                }}>+ سيت</button>
                {ex.sets.length > 1 && (
                  <button onClick={() => removeSet(ex.id, ex.sets.length - 1)} style={{
                    background: "none", border: "none", color: "#333", fontSize: 11,
                    fontFamily: "'Tajawal',sans-serif", cursor: "pointer",
                  }}>حذف آخر سيت</button>
                )}
              </div>
            </Card>
          );
        })}

        {/* Add exercise */}
        {!showAddEx ? (
          <button onClick={() => setShowAddEx(true)} style={{
            width: "100%", background: "none", border: "1px dashed #2a2a2a",
            borderRadius: 12, padding: "16px", color: "#444",
            fontFamily: "'Tajawal',sans-serif", fontSize: 15, cursor: "pointer",
            marginTop: 4,
          }}>+ إضافة تمرين</button>
        ) : (
          <Card style={{ border: "1px solid #FF6B3522" }}>
            <div style={{ fontFamily: "'Tajawal'", fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#888" }}>إضافة تمرين</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={addForm.muscle} onChange={e => setAddForm(f => ({ ...f, muscle: e.target.value, name: "", isCustom: false }))}
                style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#e8e2d9", fontFamily: "'Tajawal',sans-serif", fontSize: 14, outline: "none" }}>
                {Object.keys(MUSCLE_GROUPS).map(m => <option key={m}>{m}</option>)}
              </select>
              <select value={addForm.isCustom ? "__custom" : addForm.name}
                onChange={e => {
                  if (e.target.value === "__custom") {
                    setAddForm(f => ({ ...f, isCustom: true, name: "" }));
                  } else {
                    const ex = MUSCLE_GROUPS[addForm.muscle].exercises.find(x => x.name === e.target.value);
                    setAddForm(f => ({ ...f, name: e.target.value, emoji: ex?.emoji || "🏋️", isCustom: false }));
                  }
                }}
                style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#e8e2d9", fontFamily: "'Tajawal',sans-serif", fontSize: 14, outline: "none" }}>
                <option value="">— اختر تمرين —</option>
                {MUSCLE_GROUPS[addForm.muscle]?.exercises.map(ex => (
                  <option key={ex.name} value={ex.name}>{ex.emoji} {ex.name}</option>
                ))}
                <option value="__custom">✏️ تمرين مخصص</option>
              </select>
              {addForm.isCustom && (
                <input placeholder="اسم التمرين بالإنجليزي" value={addForm.customName}
                  onChange={e => setAddForm(f => ({ ...f, customName: e.target.value }))}
                  style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#e8e2d9", fontFamily: "'Tajawal',sans-serif", fontSize: 14, outline: "none" }} />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <GlowBtn onClick={addExercise} style={{ flex: 1 }}>إضافة</GlowBtn>
                <GlowBtn onClick={() => setShowAddEx(false)} variant="ghost" style={{ flex: 1 }}>إلغاء</GlowBtn>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const HistoryTab = () => (
    <div style={{ paddingBottom: 100 }}>
      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#333" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Tajawal'", fontSize: 18, color: "#444" }}>لا يوجد سجل بعد</div>
        </div>
      ) : sessions.map(s => {
        const muscles = [...new Set(s.sets.map(x => x.muscle))];
        const totalSets = s.sets.flatMap(x => x.sets).length;
        const doneSets = s.sets.flatMap(x => x.sets).filter(ss => ss.done).length;
        const maxW = Math.max(...s.sets.flatMap(x => x.sets.map(ss => parseFloat(ss.weight) || 0)));
        const isExpanded = expandedSession === s.id;
        return (
          <Card key={s.id} style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => setExpandedSession(isExpanded ? null : s.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Tajawal'", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  {fmtDate(s.date)}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#444", marginBottom: 8 }}>
                  {fmtTime(s.date)} · {s.duration || "—"} min
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {muscles.map(m => (
                    <Badge key={m} color={MUSCLE_GROUPS[m]?.color || "#555"}>
                      {MUSCLE_GROUPS[m]?.emoji} {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, textAlign: "center" }}>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: "#FF6B35" }}>{s.sets.length}</div>
                  <div style={{ fontSize: 10, color: "#444", fontFamily: "'Tajawal'" }}>تمرين</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: "#22C55E" }}>{doneSets}</div>
                  <div style={{ fontSize: 10, color: "#444", fontFamily: "'Tajawal'" }}>sets ✓</div>
                </div>
                {maxW > 0 && (
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: "#EAB308" }}>{maxW}</div>
                    <div style={{ fontSize: 10, color: "#444", fontFamily: "'Tajawal'" }}>max kg</div>
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 14, borderTop: "1px solid #1a1a1a", paddingTop: 14 }}>
                {s.sets.map((ex, ei) => (
                  <div key={ei} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: MUSCLE_GROUPS[ex.muscle]?.color || "#FF6B35", marginBottom: 4 }}>
                      {ex.emoji} {ex.name}
                    </div>
                    {ex.sets.map((ss, si) => (
                      <div key={si} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: ss.done ? "#555" : "#333", marginBottom: 2 }}>
                        {ss.done ? "✓" : "○"} {ss.weight}kg — {ss.r1}/{ss.r2}/{ss.r3} reps
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  const StatsTab = () => {
    if (!sessions.length) return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: "'Tajawal'", fontSize: 18, color: "#444" }}>ابدأ جلسات لتظهر الإحصائيات</div>
      </div>
    );
    const totalVol = sessions.reduce((a, s) => a + s.sets.flatMap(x => x.sets).reduce((b, ss) => {
      const w = parseFloat(ss.weight) || 0;
      const r = (parseInt(ss.r1) || 0) + (parseInt(ss.r2) || 0) + (parseInt(ss.r3) || 0);
      return b + (ss.done ? w * r : 0);
    }, 0), 0);
    const avgDur = sessions.filter(s => s.duration).reduce((a, s) => a + s.duration, 0) / sessions.filter(s => s.duration).length || 0;
    const thisWeek = sessions.filter(s => (Date.now() - new Date(s.date)) < 7 * 86400000).length;
    const totalSets = sessions.flatMap(s => s.sets.flatMap(x => x.sets)).filter(s => s.done).length;

    return (
      <div style={{ paddingBottom: 100 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <StatBox label="إجمالي الجلسات" value={sessions.length} color="#FF6B35" />
          <StatBox label="هذا الأسبوع" value={thisWeek} color="#22C55E" />
          <StatBox label="السيتات المكتملة" value={totalSets} color="#3B82F6" />
          <StatBox label="متوسط الوقت" value={`${Math.round(avgDur)}m`} color="#A855F7" />
        </div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Tajawal'", fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 4 }}>
            إجمالي الحجم التدريبي
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 700, color: "#EAB308" }}>
            {(totalVol / 1000).toFixed(1)} <span style={{ fontSize: 14, color: "#555" }}>طن</span>
          </div>
        </Card>
        <GraphsTab sessions={sessions} />
      </div>
    );
  };

  // ── RENDER ──

  const tabs = [
    { id: "home", label: "الرئيسية", icon: "🏠" },
    { id: "today", label: "اليوم", icon: "🔥", badge: active ? active.sets.length : null },
    { id: "history", label: "السجل", icon: "📋" },
    { id: "photos", label: "الصور", icon: "📸" },
    { id: "stats", label: "الإحصائيات", icon: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e2d9", direction: "rtl", maxWidth: 560, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .page { animation: fadeUp 0.22s ease forwards; }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: "#0d0d0d", borderBottom: "1px solid #141414",
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#333", marginBottom: 2 }}>
              HAMZAFIT
            </div>
            <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
              {tabs.find(t => t.id === tab)?.icon} {tabs.find(t => t.id === tab)?.label}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {streak > 0 && <Badge color="#FF6B35">🔥 {streak}</Badge>}
            <button onClick={() => setShowRest(true)} style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: 8,
              padding: "7px 10px", color: "#888", cursor: "pointer", fontSize: 14,
            }}>⏱️</button>
            <button onClick={() => setShowAI(true)} style={{
              background: "linear-gradient(135deg,#EAB30822,#F59E0B22)", border: "1px solid #EAB30833",
              borderRadius: 8, padding: "7px 10px", color: "#EAB308", cursor: "pointer", fontSize: 14,
            }}>🤖</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }} className="page" key={tab}>
        {tab === "home" && <HomeTab />}
        {tab === "today" && <TodayTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "photos" && <PhotosTab />}
        {tab === "stats" && <StatsTab />}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 560,
        background: "#0d0d0dee", borderTop: "1px solid #141414",
        backdropFilter: "blur(16px)", display: "flex", padding: "8px 4px 12px",
        zIndex: 100,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "6px 4px", position: "relative", transition: "all 0.15s",
          }}>
            {t.badge != null && t.badge > 0 && (
              <div style={{
                position: "absolute", top: 2, right: "50%", transform: "translateX(8px)",
                background: "#FF6B35", borderRadius: "50%", width: 16, height: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#fff", fontWeight: 700,
              }}>{t.badge}</div>
            )}
            <span style={{ fontSize: 20, opacity: tab === t.id ? 1 : 0.4 }}>{t.icon}</span>
            <span style={{
              fontFamily: "'Tajawal',sans-serif", fontSize: 10,
              color: tab === t.id ? "#FF6B35" : "#444", fontWeight: tab === t.id ? 700 : 400,
            }}>{t.label}</span>
            {tab === t.id && (
              <div style={{ position: "absolute", bottom: -2, width: 24, height: 2, background: "#FF6B35", borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showRest && <RestTimer onClose={() => setShowRest(false)} />}
      {showAI && <AIPanel onImport={importAIRoutine} onClose={() => setShowAI(false)} />}

      {/* Routines picker */}
      {showRoutines && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 999, padding: 20,
        }}>
          <Card style={{ width: "100%", maxWidth: 540 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Tajawal'", fontSize: 17, fontWeight: 800 }}>📋 روتينات جاهزة</span>
              <button onClick={() => setShowRoutines(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ROUTINES.map(r => (
                <button key={r.name} onClick={() => loadRoutine(r)} style={{
                  background: "#111", border: "1px solid #1e1e1e", borderRadius: 12,
                  padding: "14px 16px", cursor: "pointer", textAlign: "right",
                  transition: "border-color 0.2s",
                }}>
                  <div style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8e2d9", marginBottom: 4 }}>
                    {r.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.muscles.map(m => (
                      <Badge key={m} color={MUSCLE_GROUPS[m]?.color || "#555"}>
                        {MUSCLE_GROUPS[m]?.emoji} {m}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
