import { useEffect, useRef, useState } from "react";
import { clsx, pColor, today, dfn } from "../lib/appUtils";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL = "llama-3.1-8b-instant";

export function AICoach({ tasks, goals, habits, expenses, investments, insurance, income, hs, ws, cs, ls }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const [didAuto, setDidAuto] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const bot = useRef(null);

  useEffect(() => {
    if (bot.current) bot.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const ctx = () => {
    const tod = tasks.filter((task) => task.date === today());
    const tE = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const tI = investments.reduce((sum, investment) => sum + Number(investment.amount), 0);
    const sR = income > 0 ? ((income - tE) / income * 100).toFixed(1) : 0;
    const iR = income > 0 ? (tI / income * 100).toFixed(1) : 0;
    return `You are LifeOS AI Coach — a warm, practical personal life coach. Give specific, concise, actionable advice. Use bullet points. Be encouraging.

USER SCORES: Life=${ls ?? "N/A"} | Health=${hs ?? "N/A"} | Wealth=${ws ?? "N/A"} | Career=${cs ?? "N/A"}

GOALS (${goals.length} total):
${goals.map((goal) => { const rm = goal.roadmap || []; const p = rm.length ? Math.round(rm.filter((step) => step.done).length / rm.length * 100) : 0; const d = dfn(goal.dueDate); return `- ${goal.title} [${goal.category}] ${p}% done${d !== null ? `, ${d < 0 ? Math.abs(d) + "d overdue" : d + "d left"}` : ""}`; }).join("\n") || "None added yet"}

HABITS (${habits.length} total):
${habits.map((habit) => { const d = (habit.checks || []).filter(Boolean).length; return `- ${habit.title}: ${d}/21 days (${Math.round(d / 21 * 100)}%)`; }).join("\n") || "None added yet"}

TODAY'S TASKS (${tod.length}, ${tod.filter((task) => task.done).length} done):
${tod.map((task) => `- [${task.done ? "✓" : "○"}] ${task.title} [${task.category}]`).join("\n") || "Nothing planned"}

FINANCE: Income=₹${income?.toLocaleString("en-IN") || 0} | Expenses=₹${tE.toLocaleString("en-IN")} (${income > 0 ? Math.round(tE / income * 100) : 0}%) | Investments=₹${tI.toLocaleString("en-IN")} (${iR}%) | Savings ratio=${sR}% | Insurance=${insurance.length} policies`;
  };

  const send = async (message) => {
    const text = message || inp.trim();
    if (!text) return;

    if (!GROQ_API_KEY) {
      setApiErr("Add VITE_GROQ_API_KEY to your .env file. Get a free key at console.groq.com");
      return;
    }

    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInp("");
    setBusy(true);
    setApiErr("");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 800,
          messages: [
            { role: "system", content: ctx() },
            ...next.map((entry) => ({ role: entry.role, content: entry.content }))
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || response.statusText);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "No response.";
      setMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      setMsgs((prev) => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
    }

    setBusy(false);
  };

  const openPanel = () => {
    setOpen(true);
    if (!didAuto) {
      setDidAuto(true);
      setTimeout(() => send("Analyze my life data and give me: 1) Brief overall assessment 2) Top 3 focus areas this week to improve my life score 3) One quick win I can do today. Be concise and encouraging."), 400);
    }
  };

  const QUICK = ["What habits should I build?", "How to improve my finances?", "Which goal needs attention most?", "Give me a weekly action plan"];

  return (
    <>
      <button className="ai-fab" onClick={() => (open ? setOpen(false) : openPanel())}>
        {open ? "✕" : "🤖"}
        {!open && <span className="ai-fab-label">AI Coach</span>}
      </button>
      {open && (
        <div className="ai-panel">
          <div className="ai-panel-hdr">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>LifeOS AI Coach</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Powered by Groq (free) · Llama 3</div>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="ai-msgs">
            {apiErr && (
              <div style={{ background: "#ef444422", border: "1px solid #ef444444", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#ef4444", margin: "8px 0" }}>
                ⚠️ {apiErr}
                <br />
                <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "#ef4444", fontWeight: 600 }}>Get free key →</a>
              </div>
            )}
            {msgs.length === 0 && !busy && !apiErr && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "24px 16px", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                Analyzing your life data…
              </div>
            )}
            {msgs.map((message, index) => (
              <div key={index} className={clsx("ai-msg", message.role === "user" && "ai-me")}>
                {message.role === "assistant" && <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>}
                <div className={clsx("ai-bubble", message.role === "user" && "ai-bubble-me")}>{message.content}</div>
                {message.role === "user" && <span style={{ fontSize: 18, flexShrink: 0 }}>👤</span>}
              </div>
            ))}
            {busy && (
              <div className="ai-msg">
                <span style={{ fontSize: 18 }}>🤖</span>
                <div className="ai-bubble ai-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={bot} />
          </div>
          {msgs.length > 0 && !busy && (
            <div className="ai-quick">
              {QUICK.map((question) => (
                <button key={question} className="ai-qbtn" onClick={() => send(question)}>{question}</button>
              ))}
            </div>
          )}
          <div className="ai-inp-row">
            <input className="inp" value={inp} onChange={(event) => setInp(event.target.value)} onKeyDown={(event) => event.key === "Enter" && !busy && send()} placeholder="Ask your AI coach…" style={{ flex: 1 }} />
            <button className="btn-primary" onClick={() => send()} disabled={busy || !inp.trim()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
