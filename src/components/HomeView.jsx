import { AICoach } from "./AICoach";
import { CAT_COLOR, clsx, dateDiffDays, dfn, pColor, today } from "../lib/appUtils";

export function HomeView({ tasks, goals, habits, expenses, investments, insurance, income, onNav, isGuest, onLogin }) {
  const tod = tasks.filter((task) => task.date === today());
  const todDone = tod.filter((task) => task.done).length;
  const habitAvg = habits.length > 0 ? habits.reduce((sum, habit) => sum + (habit.checks || []).filter(Boolean).length / 21, 0) / habits.length : null;
  const hTasks = tasks.filter((task) => task.category === "Health");
  const hTP = hTasks.length > 0 ? hTasks.filter((task) => task.done).length / hTasks.length : null;
  const hs = habitAvg === null && hTP === null ? null : Math.round(((habitAvg ?? 0) * 0.6 + (hTP ?? 0) * 0.4) * 100);
  const tE = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const tI = investments.reduce((sum, investment) => sum + Number(investment.amount), 0);
  const tIn = insurance.reduce((sum, item) => sum + Number(item.premium), 0);
  const hasFin = income > 0 || expenses.length > 0 || investments.length > 0;
  const sR = income > 0 ? (income - tE) / income * 100 : 0;
  const iR = income > 0 ? tI / income * 100 : 0;
  const ws = !hasFin ? null : Math.min(100, Math.round(Math.min(sR, 30) / 30 * 40 + Math.min(iR, 20) / 20 * 40 + (insurance.length > 0 ? 20 : 0)));
  const cGoals = goals.filter((goal) => ["Work", "Learning", "Mind"].includes(goal.category));
  const cTasks = tasks.filter((task) => ["Work", "Learning", "Mind"].includes(task.category));
  const gP = cGoals.length > 0 ? cGoals.reduce((sum, goal) => { const days = dateDiffDays(goal.startDate, goal.dueDate); if (!days) return sum; const dates = new Set(tasks.filter((task) => task.goalId === goal.id && task.done && task.date >= goal.startDate && task.date <= goal.dueDate).map((task) => task.date)); const filled = dates.size; return sum + (filled === days ? 1 : filled / days); }, 0) / cGoals.length : null;
  const tP = cTasks.length > 0 ? cTasks.filter((task) => task.done).length / cTasks.length : null;
  const cs = gP === null && tP === null ? null : Math.round(((gP ?? 0) * 0.6 + (tP ?? 0) * 0.4) * 100);
  const avail = [hs, ws, cs].filter((value) => value !== null);
  const ls = avail.length > 0 ? Math.round(avail.reduce((sum, value) => sum + value, 0) / avail.length) : null;
  const lc = ls === null ? "#64748b" : ls >= 70 ? "#10b981" : ls >= 50 ? "#f59e0b" : "#ef4444";
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning ☀️" : hr < 17 ? "Good afternoon 🌤️" : "Good evening 🌙";
  const getPct = (goal) => { const days = dateDiffDays(goal.startDate, goal.dueDate); if (!days) return 0; const dates = new Set(tasks.filter((task) => task.goalId === goal.id && task.done && task.date >= goal.startDate && task.date <= goal.dueDate).map((task) => task.date)); const filled = dates.size; const pct = Math.round(filled / days * 100); return filled === days ? 100 : Math.min(100, pct); };
  const scores = [{ label: "Health", icon: "💪", val: hs, hint: "Add Health tasks & habits" }, { label: "Wealth", icon: "💰", val: ws, hint: "Add income & expenses" }, { label: "Career", icon: "🚀", val: cs, hint: "Add Work/Learning goals" }];

  return (
    <div className="section">
      {isGuest && <GuestBanner onLogin={onLogin} />}
      <div className="home-banner">
        <div>
          <div className="home-greeting">{greet}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{tod.length > 0 ? `${todDone}/${tod.length} tasks done today` : "No tasks planned today"}</div>
        </div>
      </div>

      <div className="score-panel">
        <div className="life-center">
          <svg viewBox="0 0 140 140" width="128" height="128">
            <circle cx="70" cy="70" r="55" fill="none" stroke="var(--border)" strokeWidth="10" />
            {ls !== null && <circle cx="70" cy="70" r="55" fill="none" stroke={lc} strokeWidth="10" strokeDasharray={`${2 * Math.PI * 55 * ls / 100} ${2 * Math.PI * 55}`} strokeLinecap="round" transform="rotate(-90 70 70)" />}
            <text x="70" y="63" textAnchor="middle" fontSize="26" fontWeight="900" fill={ls === null ? "#64748b" : lc}>{ls === null ? "—" : ls}</text>
            <text x="70" y="80" textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="700">LIFE SCORE</text>
          </svg>
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 2 }}>{ls === null ? "Add data to unlock" : "Overall balance"}</div>
        </div>
        <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch", margin: "0 20px", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {scores.map((score) => (
            <div key={score.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: 180, flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>{score.icon}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{score.label} Score</div>{score.val === null && <div style={{ fontSize: 10, color: "var(--muted)" }}>{score.hint}</div>}</div>
              </div>
              <div style={{ flex: 1 }}>
                {score.val === null ? <span style={{ fontSize: 18, fontWeight: 800, color: "#64748b" }}>—</span> : <><div style={{ fontSize: 20, fontWeight: 800, color: pColor(score.val), marginBottom: 4 }}>{score.val}%</div><div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: score.val + "%", height: "100%", background: pColor(score.val), borderRadius: 99, transition: "width .5s" }} /></div></>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="home-grid">
        <div className="home-card">
          <div className="home-card-hdr"><span>📌 Today's Focus</span><button className="link-btn" onClick={() => onNav("Planner")}>Planner →</button></div>
          {tod.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>No tasks today. {!isGuest && <button className="link-btn" onClick={() => onNav("Planner")}>Add →</button>}</div> : tod.slice(0, 7).map((task) => <div key={task.id} className="focus-item"><span className={clsx("focus-ck", task.done && "done")}>{task.done ? "✓" : "○"}</span><span style={{ flex: 1, fontSize: 13, textDecoration: task.done ? "line-through" : "none", opacity: task.done ? 0.5 : 1 }}>{task.title}</span><span className="cat-badge" style={{ background: CAT_COLOR[task.category] + "22", color: CAT_COLOR[task.category], fontSize: 10, padding: "1px 6px" }}>{task.category}</span></div>)}
          {tod.length > 0 && <div style={{ marginTop: 10 }}><div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: (todDone / tod.length * 100) + "%", height: "100%", background: "#10b981", borderRadius: 99 }} /></div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{todDone}/{tod.length} done</div></div>}
        </div>

        <div className="home-card">
          <div className="home-card-hdr"><span>🎯 Goals</span><button className="link-btn" onClick={() => onNav("Goals")}>Goals →</button></div>
          {goals.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>No goals yet. {!isGuest && <button className="link-btn" onClick={() => onNav("Goals")}>Add →</button>}</div> : goals.slice(0, 5).map((goal) => { const progress = getPct(goal); const c = pColor(progress); const deadline = dfn(goal.dueDate); return (<div key={goal.id} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{goal.title}</span><div style={{ display: "flex", gap: 5, alignItems: "center" }}>{deadline !== null && <span className={clsx("due-badge", deadline < 0 && "overdue", deadline <= 7 && deadline >= 0 && "soon")} style={{ fontSize: 10 }}>{deadline < 0 ? `${Math.abs(deadline)}d over` : deadline === 0 ? "Today" : `${deadline}d`}</span>}<span style={{ fontSize: 12, fontWeight: 700, color: c }}>{progress}%</span></div></div><div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: progress + "%", height: "100%", background: c, borderRadius: 99, transition: "width .4s" }} /></div></div>); })}
        </div>

        <div className="home-card">
          <div className="home-card-hdr"><span>🔥 Habits</span><button className="link-btn" onClick={() => onNav("Habits")}>Habits →</button></div>
          {habits.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>No habits. {!isGuest && <button className="link-btn" onClick={() => onNav("Habits")}>Add →</button>}</div> : habits.map((habit) => { const done = (habit.checks || []).filter(Boolean).length; return (<div key={habit.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: habit.color }} /><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{habit.title}</span><span style={{ fontSize: 11, color: pColor(Math.round((habit.checks || []).filter(Boolean).length / 21 * 100)), fontWeight: 700 }}>{(habit.checks || []).filter(Boolean).length}/21</span></div><div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{Array.from({ length: 21 }, (_, index) => <div key={index} style={{ width: 10, height: 10, borderRadius: 2, background: (habit.checks || [])[index] ? habit.color : "var(--border)" }} />)}</div></div>); })}
        </div>

        <div className="home-card">
          <div className="home-card-hdr"><span>💰 Finance</span><button className="link-btn" onClick={() => onNav("Finance")}>Finance →</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[{ l: "Income", v: income, c: "#10b981" }, { l: "Expenses", v: tE, c: "#ef4444" }, { l: "Investments", v: tI, c: "#6366f1" }, { l: "Savings", v: Math.max(0, income - tE - tI - tIn), c: "#14b8a6" }].map((summary) => (
              <div key={summary.l} style={{ background: "var(--surface2)", borderRadius: 8, padding: "9px 11px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 2 }}>{summary.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: summary.c }}>₹{Number(summary.v).toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
          {income > 0 && <div style={{ height: 10, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", display: "flex" }}>{[{ v: tE, c: "#ef4444" }, { v: tI, c: "#6366f1" }, { v: tIn, c: "#f59e0b" }, { v: Math.max(0, income - tE - tI - tIn), c: "#10b981" }].map((summary, index) => <div key={index} style={{ width: (summary.v / income * 100) + "%", height: "100%", background: summary.c, minWidth: summary.v > 0 ? 3 : 0 }} />)}</div>}
        </div>
      </div>

      {!isGuest && <AICoach tasks={tasks} goals={goals} habits={habits} expenses={expenses} investments={investments} insurance={insurance} income={income} hs={hs} ws={ws} cs={cs} ls={ls} />}
    </div>
  );
}

function GuestBanner({ onLogin }) {
  return (
    <div style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#f59e0b" }}>👁 Guest mode — read only. Data cannot be edited.</span>
      <button className="btn-primary" style={{ padding: "5px 14px", fontSize: 12 }} onClick={onLogin}>Sign In →</button>
    </div>
  );
}
