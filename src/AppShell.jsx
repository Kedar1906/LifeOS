import { useState, useEffect } from "react";
import { signIn, signOut, getSession, onAuthChange } from "./supabase.js";
import { TABS, ICONS, clsx } from "./lib/appUtils.js";
import { useCollection } from "./hooks/useCollection.js";
import { useSingleton } from "./hooks/useSingleton.js";

// Components
import { HomeView } from "./components/HomeView.jsx";
import { PlannerView } from "./components/PlannerView.jsx";
import { GoalsView } from "./components/GoalsView.jsx";
import { HabitsView } from "./components/HabitsView.jsx";
import { FinanceView } from "./components/FinanceView.jsx";
import { Spinner } from "./components/Spinner.jsx";

// ── LOGIN with Guest option ───────────────────────────────────────────────────
function Login({ onAuth }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!email || !pw) return;
    setBusy(true); setErr("");
    const { error } = await signIn(email, pw);
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: "40px 36px", width: 380, boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>LifeOS</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Your personal life dashboard</div>
        </div>

        <label>Email</label>
        <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()} placeholder="you@email.com" style={{ marginBottom: 10 }} />
        <label>Password</label>
        <input className="inp" type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()} placeholder="••••••••" style={{ marginBottom: err ? 8 : 16 }} />
        {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{err}</div>}

        <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={go} disabled={busy}>
          {busy ? "Signing in…" : "Sign In →"}
        </button>

        {/* Guest access */}
        <button onClick={() => onAuth("guest")} style={{ width: "100%", padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", fontSize: 13, transition: "all .15s" }}
          onMouseOver={e => e.currentTarget.style.borderColor = "#818cf8"}
          onMouseOut={e => e.currentTarget.style.borderColor = "var(--border)"}>
          👁 Continue as Guest (read-only)
        </button>

        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 16, textAlign: "center", lineHeight: 1.7 }}>
          Create your account in<br />Supabase → Authentication → Users
        </div>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);   // undefined=loading, null=logged out, "guest"=guest, object=auth user
  const [tab, setTab] = useState("Home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isGuest = user === "guest";
  const goalHook = useCollection("goals", isGuest);
  const { items: pTasks } = useCollection("planner_tasks", isGuest);
  const { items: habits } = useCollection("habits", isGuest);
  const { items: expenses } = useCollection("expenses", isGuest);
  const { items: investments } = useCollection("investments", isGuest);
  const { items: insurance } = useCollection("insurance", isGuest);
  const [income] = useSingleton("finance", 0, isGuest);

  useEffect(() => {
    getSession().then(u => setUser(u || null));
    const sub = onAuthChange(u => { if (u) setUser(u); else if (user !== "guest") setUser(null); });
    return () => sub?.unsubscribe();
  }, []);

  const handleSignOut = async () => { await signOut(); setUser(null); };

  if (user === undefined) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><style>{BASE_CSS}</style><Spinner /></div>;
  if (!user || user === null) return <Login onAuth={v => setUser(v)} />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter,-apple-system,sans-serif", fontSize: 14, lineHeight: 1.5 }}>
      <style>{BASE_CSS + APP_CSS}</style>
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
          <span>⚡</span>
          <span style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LifeOS</span>
        </div>
        <button className="mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(v => !v)}>
          ☰
        </button>
        <nav className={clsx("app-nav", mobileNavOpen && "mobile-open")}>
          {TABS.map(t => <button key={t} onClick={() => { setTab(t); setMobileNavOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all .15s" }}>
            <span>{ICONS[t]}</span><span className="nav-label">{t}</span>
          </button>)}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isGuest && <span style={{ fontSize: 11, background: "#f59e0b22", color: "#f59e0b", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>👁 Guest</span>}
          <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
          <button className="icon-btn" title={isGuest ? "Exit guest mode" : "Sign out"} onClick={handleSignOut} style={{ fontSize: 15 }}>🔒</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: 20, maxWidth: 1280, margin: "0 auto", width: "100%", animation: "fadeIn .2s ease" }}>
        {tab === "Home" && <HomeView tasks={pTasks} goals={goalHook.items} habits={habits} expenses={expenses} investments={investments} insurance={insurance} income={income} onNav={setTab} isGuest={isGuest} onLogin={() => setUser(null)} />}
        {tab === "Planner" && <PlannerView goals={goalHook.items} isGuest={isGuest} />}
        {tab === "Goals" && <GoalsView goals={goalHook.items} goalHook={goalHook} plannerTasks={pTasks} isGuest={isGuest} />}
        {tab === "Habits" && <HabitsView isGuest={isGuest} />}
        {tab === "Finance" && <FinanceView isGuest={isGuest} />}
      </main>
    </div>
  );
}

const BASE_CSS = `
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2333;--border:#2a3044;--text:#e2e8f0;--muted:#64748b;--accent:#6366f1;--accent2:#818cf8;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',-apple-system,sans-serif;font-size:14px;line-height:1.5;text-align:left;}
  .btn-primary{padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;}
  .btn-primary:hover{background:var(--accent2);}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .btn-ghost{padding:8px 16px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s;}
  .btn-ghost:hover{border-color:var(--text);color:var(--text);}
  .btn-secondary{padding:5px 11px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;}
  .btn-secondary:hover{border-color:var(--accent);color:var(--accent);}
  .inp{width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;transition:border-color .15s;}
  .inp:focus{border-color:var(--accent);}
  textarea.inp{resize:vertical;}
  label{display:block;font-size:11px;color:var(--muted);margin-bottom:4px;margin-top:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
`;

const APP_CSS = `
  .icon-btn{background:none;border:none;cursor:pointer;padding:4px 6px;border-radius:6px;opacity:.6;font-size:13px;transition:all .15s;}
  .icon-btn:hover{opacity:1;background:var(--surface2);}
  .seg-ctrl{display:flex;background:var(--surface2);border-radius:8px;padding:3px;}
  .seg-btn{padding:5px 12px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:13px;border-radius:6px;font-weight:500;transition:all .15s;}
  .seg-btn.active{background:var(--accent);color:#fff;}
  .form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;}
  .link-btn{background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;font-weight:600;padding:0;}
  .link-btn:hover{color:var(--accent2);}
  .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;text-align:left;}
  .section-header h2{font-size:20px;font-weight:700;text-align:left;}
  .mobile-nav-toggle{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-size:18px;}
  .app-nav{display:flex;gap:2px;flex:1;justify-content:center;}
  .cat-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;}
  .due-badge{padding:2px 7px;border-radius:20px;font-size:11px;font-weight:600;background:#10b98122;color:#10b981;}
  .due-badge.overdue{background:#ef444422;color:#ef4444;}
  .due-badge.soon{background:#f59e0b22;color:#f59e0b;}
  .status-badge{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;}
  .s-done{background:#10b98122;color:#10b981;}
  .s-prog{background:#f59e0b22;color:#f59e0b;}
  .s-none{background:var(--surface2);color:var(--muted);}
  .empty-msg{color:var(--muted);text-align:left;padding:28px 0;font-size:13px;}
  .empty-msg.center{text-align:center;padding:28px;}
  .home-banner{background:linear-gradient(135deg,#312e81,#4f46e5,#6366f1);border-radius:12px;padding:22px 26px;margin-bottom:14px;}
  .home-greeting{font-size:22px;font-weight:800;color:#fff;margin-bottom:2px;}
  .score-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 22px;display:flex;align-items:center;margin-bottom:14px;}
  .life-center{display:flex;flex-direction:column;align-items:center;padding-right:20px;flex-shrink:0;}
  .home-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
  .home-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:left;}
  .home-card-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;font-weight:700;}
  .focus-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);}
  .focus-item:last-of-type{border-bottom:none;}
  .focus-ck{font-size:13px;color:var(--muted);width:16px;flex-shrink:0;}
  .focus-ck.done{color:#10b981;}
  .ai-fab{position:fixed;bottom:24px;right:24px;background:var(--accent);color:#fff;border:none;border-radius:50px;padding:12px 18px;cursor:pointer;font-size:18px;font-weight:700;box-shadow:0 8px 32px rgba(99,102,241,.4);z-index:150;display:flex;align-items:center;gap:8px;transition:all .2s;}
  .ai-fab:hover{background:var(--accent2);transform:translateY(-2px);}
  .ai-fab-label{font-size:13px;font-weight:600;}
  .ai-panel{position:fixed;bottom:80px;right:24px;width:380px;max-height:520px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.6);z-index:149;display:flex;flex-direction:column;overflow:hidden;}
  .ai-panel-hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface2);}
  .ai-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}
  .ai-msg{display:flex;gap:8px;align-items:flex-start;}
  .ai-me{flex-direction:row-reverse;}
  .ai-bubble{background:var(--surface2);border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.5;max-width:85%;white-space:pre-wrap;}
  .ai-bubble-me{background:var(--accent);color:#fff;}
  .ai-typing span{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--muted);margin:0 2px;animation:blink 1.4s infinite;}
  .ai-typing span:nth-child(2){animation-delay:.2s;}
  .ai-typing span:nth-child(3){animation-delay:.4s;}
  .ai-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid var(--border);}
  .ai-qbtn{background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text);transition:all .15s;white-space:nowrap;}
  .ai-qbtn:hover{border-color:var(--accent);color:var(--accent);}
  .ai-inp-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);}
  .week-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .week-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px;}
  .wdb{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;transition:all .15s;color:var(--text);}
  .wdb:hover{border-color:var(--accent);}
  .wdb-today{border-color:var(--accent);}
  .wdb-sel{background:var(--accent);border-color:var(--accent);}
  .wdb-name{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);}
  .wdb-sel .wdb-name{color:rgba(255,255,255,.7);}
  .wdb-num{font-size:16px;font-weight:700;}
  .wdb-sel .wdb-num{color:#fff;}
  .month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:14px;}
  .task-card{background:var(--surface);border-radius:8px;padding:9px 11px;margin-bottom:6px;}
  .t-done{opacity:.5;}
  .task-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s;}
  .task-card:hover .task-actions{opacity:1;}
  .fin-add-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;padding:12px;background:var(--surface);border-radius:12px;}
  .fin-add-form .inp{flex:1;min-width:120px;margin-top:0;}
  .fin-table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:12px;overflow:hidden;}
  .fin-table th{padding:9px 12px;text-align:left;font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);}
  .fin-table td{padding:9px 12px;border-bottom:1px solid var(--border);font-size:13px;}
  .fin-table tr:last-child td{border-bottom:none;}
  .fin-table tbody tr:hover{background:var(--surface2);}
  @media(max-width:860px){.home-grid{grid-template-columns:1fr;}.score-panel{flex-direction:column;}.life-center{padding-right:0;padding-bottom:14px;border-bottom:1px solid var(--border);}.ai-panel{width:calc(100vw - 32px);right:16px;}}
  @media(max-width:600px){.nav-label{display:none;}.ai-fab-label{display:none;}.mobile-nav-toggle{display:inline-flex;}.app-nav{display:none;position:absolute;top:56px;left:14px;right:14px;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--border);padding:8px;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.35);z-index:120;}.app-nav.mobile-open{display:flex;}.app-nav button{justify-content:flex-start;}.app-header{position:sticky;top:0;z-index:101;}}
`;
