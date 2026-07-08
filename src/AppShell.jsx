import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { loadCollection, upsertRow, deleteRow, loadSingleton, saveSingleton, signIn, signOut, getSession, onAuthChange } from "./supabase.js";

// ── Config ────────────────────────────────────────────────────────────────────
// Get a free Groq API key at: https://console.groq.com  (no credit card needed)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL   = "llama-3.1-8b-instant"; // free, fast

const TABS = ["Home","Planner","Goals","Habits","Finance"];
const PLAN_CATEGORIES = ["Work","Health","Learning","Mind","Personal","Finance","Roadmap Task"];
const VIEWS = ["Week","Month"];
const CAT_COLOR = {Work:"#6366f1",Health:"#10b981",Learning:"#f59e0b",Mind:"#06b6d4",Personal:"#ec4899",Finance:"#14b8a6","Roadmap Task":"#8b5cf6"};
const EXP_CATS = ["EMI","Rent","Groceries","Utilities","Entertainment","Health","Transport","Other"];
const INV_TYPES = ["Mutual Fund","Stocks","PPF","NPS","FD","Gold","Real Estate","Crypto","Other"];
const INS_TYPES = ["Life","Health","Term","Vehicle","Other"];
const COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#14b8a6","#ef4444","#8b5cf6","#f97316"];

function pColor(p){return p>=80?"#10b981":p>=50?"#f59e0b":p>0?"#ef4444":"#64748b";}
function today(){return new Date().toISOString().slice(0,10);}
function fmt(d){return d?new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):""; }
function dfn(d){if(!d)return null;return Math.ceil((new Date(d)-new Date(today()))/86400000);}function dateDiffDays(start,end){if(!start||!end)return 0;const s=new Date(start+"T00:00:00");const e=new Date(end+"T00:00:00");const diff=Math.round((e-s)/86400000)+1;return diff>0?diff:0;} function uuid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function clsx(...a){return a.filter(Boolean).join(" ");}

// ── Supabase hooks ────────────────────────────────────────────────────────────
function useCollection(table, isGuest){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{loadCollection(table).then(r=>{setItems(r);setLoading(false);});},[table]);
  const add=useCallback(async(item)=>{
    if(isGuest)return;
    const id=item.id||uuid();const full={...item,id};setItems(p=>[...p,full]);await upsertRow(table,id,full);return full;
  },[table,isGuest]);
  const replace=useCallback(async(id,full)=>{
    if(isGuest)return;
    setItems(p=>p.map(i=>i.id===id?full:i));await upsertRow(table,id,full);
  },[table,isGuest]);
  const remove=useCallback(async(id)=>{
    if(isGuest)return;
    setItems(p=>p.filter(i=>i.id!==id));await deleteRow(table,id);
  },[table,isGuest]);
  return {items,loading,add,replace,remove};
}
function useSingleton(table,def,isGuest){
  const [val,setV]=useState(def);
  const [loading,setL]=useState(true);
  useEffect(()=>{loadSingleton(table).then(v=>{if(v!==null)setV(v);setL(false);});},[table]);
  const set=useCallback(async(v)=>{
    if(isGuest)return;
    const n=typeof v==="function"?v(val):v;setV(n);await saveSingleton(table,n);
  },[table,val,isGuest]);
  return [val,set,loading];
}
function Spinner(){
  return <div style={{display:"flex",justifyContent:"center",padding:60}}>
    <div style={{width:32,height:32,border:"3px solid var(--border)",borderTop:"3px solid var(--accent)",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>;
}

// ── LOGIN with Guest option ───────────────────────────────────────────────────
function Login({onAuth}){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);

  const go=async()=>{
    if(!email||!pw)return;
    setBusy(true);setErr("");
    const{error}=await signIn(email,pw);
    if(error){setErr(error.message);setBusy(false);}
    // onAuth fires automatically via onAuthChange listener
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <style>{BASE_CSS}</style>
      <div style={{background:"var(--surface)",borderRadius:16,padding:"40px 36px",width:380,boxShadow:"0 24px 80px rgba(0,0,0,.5)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:8}}>⚡</div>
          <div style={{fontSize:24,fontWeight:800,background:"linear-gradient(135deg,#6366f1,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>LifeOS</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Your personal life dashboard</div>
        </div>

        <label>Email</label>
        <input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&go()} placeholder="you@email.com" style={{marginBottom:10}}/>
        <label>Password</label>
        <input className="inp" type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" style={{marginBottom:err?8:16}}/>
        {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12}}>{err}</div>}

        <button className="btn-primary" style={{width:"100%",marginBottom:10}} onClick={go} disabled={busy}>
          {busy?"Signing in…":"Sign In →"}
        </button>

        {/* Guest access */}
        <button onClick={()=>onAuth("guest")} style={{width:"100%",padding:"8px 16px",background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--muted)",cursor:"pointer",fontSize:13,transition:"all .15s"}}
          onMouseOver={e=>e.currentTarget.style.borderColor="#818cf8"}
          onMouseOut={e=>e.currentTarget.style.borderColor="var(--border)"}>
          👁 Continue as Guest (read-only)
        </button>

        <div style={{fontSize:11,color:"var(--muted)",marginTop:16,textAlign:"center",lineHeight:1.7}}>
          Create your account in<br/>Supabase → Authentication → Users
        </div>
      </div>
    </div>
  );
}

// ── GUEST BANNER ─────────────────────────────────────────────────────────────
function GuestBanner({onLogin}){
  return(
    <div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:13,color:"#f59e0b"}}>👁 Guest mode — read only. Data cannot be edited.</span>
      <button className="btn-primary" style={{padding:"5px 14px",fontSize:12}} onClick={onLogin}>Sign In →</button>
    </div>
  );
}

// ── AI COACH (Groq — free) ────────────────────────────────────────────────────
function AICoach({tasks,goals,habits,expenses,investments,insurance,income,hs,ws,cs,ls}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([]);
  const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false);
  const [didAuto,setDidAuto]=useState(false);
  const [apiErr,setApiErr]=useState("");
  const bot=useRef(null);
  useEffect(()=>{if(bot.current)bot.current.scrollIntoView({behavior:"smooth"});},[msgs]);

  const ctx=()=>{
    const tod=tasks.filter(t=>t.date===today());
    const tE=expenses.reduce((s,e)=>s+Number(e.amount),0);
    const tI=investments.reduce((s,i)=>s+Number(i.amount),0);
    const sR=income>0?((income-tE)/income*100).toFixed(1):0;
    const iR=income>0?(tI/income*100).toFixed(1):0;
    return `You are LifeOS AI Coach — a warm, practical personal life coach. Give specific, concise, actionable advice. Use bullet points. Be encouraging.

USER SCORES: Life=${ls??'N/A'} | Health=${hs??'N/A'} | Wealth=${ws??'N/A'} | Career=${cs??'N/A'}

GOALS (${goals.length} total):
${goals.map(g=>{const rm=g.roadmap||[];const p=rm.length?Math.round(rm.filter(r=>r.done).length/rm.length*100):0;const d=dfn(g.dueDate);return`- ${g.title} [${g.category}] ${p}% done${d!==null?`, ${d<0?Math.abs(d)+"d overdue":d+"d left"}`:""}`;}).join("\n")||"None added yet"}

HABITS (${habits.length} total):
${habits.map(h=>{const d=(h.checks||[]).filter(Boolean).length;return`- ${h.title}: ${d}/21 days (${Math.round(d/21*100)}%)`;}).join("\n")||"None added yet"}

TODAY'S TASKS (${tod.length}, ${tod.filter(t=>t.done).length} done):
${tod.map(t=>`- [${t.done?"✓":"○"}] ${t.title} [${t.category}]`).join("\n")||"Nothing planned"}

FINANCE: Income=₹${income?.toLocaleString("en-IN")||0} | Expenses=₹${tE.toLocaleString("en-IN")} (${income>0?Math.round(tE/income*100):0}%) | Investments=₹${tI.toLocaleString("en-IN")} (${iR}%) | Savings ratio=${sR}% | Insurance=${insurance.length} policies`;
  };

  const send=async(msg)=>{
    const m=msg||inp.trim();if(!m)return;
    if(!GROQ_API_KEY){
      setApiErr("Add VITE_GROQ_API_KEY to your .env file. Get a free key at console.groq.com");
      return;
    }
    const next=[...msgs,{role:"user",content:m}];
    setMsgs(next);setInp("");setBusy(true);setApiErr("");
    try{
      const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({
          model:GROQ_MODEL,
          max_tokens:800,
          messages:[
            {role:"system",content:ctx()},
            ...next.map(x=>({role:x.role,content:x.content}))
          ]
        })
      });
      if(!res.ok){const e=await res.json();throw new Error(e.error?.message||res.statusText);}
      const data=await res.json();
      const reply=data.choices?.[0]?.message?.content||"No response.";
      setMsgs(p=>[...p,{role:"assistant",content:reply}]);
    }catch(e){
      setMsgs(p=>[...p,{role:"assistant",content:`Error: ${e.message}`}]);
    }
    setBusy(false);
  };

  const openPanel=()=>{
    setOpen(true);
    if(!didAuto){
      setDidAuto(true);
      setTimeout(()=>send("Analyze my life data and give me: 1) Brief overall assessment 2) Top 3 focus areas this week to improve my life score 3) One quick win I can do today. Be concise and encouraging."),400);
    }
  };

  const QUICK=["What habits should I build?","How to improve my finances?","Which goal needs attention most?","Give me a weekly action plan"];

  return <>
    <button className="ai-fab" onClick={()=>open?setOpen(false):openPanel()}>
      {open?"✕":"🤖"}{!open&&<span className="ai-fab-label">AI Coach</span>}
    </button>
    {open&&<div className="ai-panel">
      <div className="ai-panel-hdr">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>🤖</span>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>LifeOS AI Coach</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>Powered by Groq (free) · Llama 3</div>
          </div>
        </div>
        <button className="icon-btn" onClick={()=>setOpen(false)}>✕</button>
      </div>
      <div className="ai-msgs">
        {apiErr&&<div style={{background:"#ef444422",border:"1px solid #ef444444",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#ef4444",margin:"8px 0"}}>
          ⚠️ {apiErr}<br/>
          <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{color:"#ef4444",fontWeight:600}}>Get free key →</a>
        </div>}
        {msgs.length===0&&!busy&&!apiErr&&<div style={{textAlign:"center",color:"var(--muted)",padding:"24px 16px",fontSize:13}}>
          <div style={{fontSize:32,marginBottom:8}}>👋</div>Analyzing your life data…
        </div>}
        {msgs.map((m,i)=>(
          <div key={i} className={clsx("ai-msg",m.role==="user"&&"ai-me")}>
            {m.role==="assistant"&&<span style={{fontSize:18,flexShrink:0}}>🤖</span>}
            <div className={clsx("ai-bubble",m.role==="user"&&"ai-bubble-me")}>{m.content}</div>
            {m.role==="user"&&<span style={{fontSize:18,flexShrink:0}}>👤</span>}
          </div>
        ))}
        {busy&&<div className="ai-msg"><span style={{fontSize:18}}>🤖</span><div className="ai-bubble ai-typing"><span/><span/><span/></div></div>}
        <div ref={bot}/>
      </div>
      {msgs.length>0&&!busy&&<div className="ai-quick">
        {QUICK.map(q=><button key={q} className="ai-qbtn" onClick={()=>send(q)}>{q}</button>)}
      </div>}
      <div className="ai-inp-row">
        <input className="inp" value={inp} onChange={e=>setInp(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!busy&&send()}
          placeholder="Ask your AI coach…" style={{flex:1}}/>
        <button className="btn-primary" onClick={()=>send()} disabled={busy||!inp.trim()}>Send</button>
      </div>
    </div>}
  </>;
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function Home({tasks,goals,habits,expenses,investments,insurance,income,onNav,isGuest,onLogin}){
  const tod=tasks.filter(x=>x.date===today());
  const todDone=tod.filter(x=>x.done).length;
  const habitAvg=habits.length>0?habits.reduce((s,h)=>s+(h.checks||[]).filter(Boolean).length/21,0)/habits.length:null;
  const hTasks=tasks.filter(x=>x.category==="Health");
  const hTP=hTasks.length>0?hTasks.filter(x=>x.done).length/hTasks.length:null;
  const hs=(habitAvg===null&&hTP===null)?null:Math.round(((habitAvg??0)*.6+(hTP??0)*.4)*100);
  const tE=expenses.reduce((s,e)=>s+Number(e.amount),0);
  const tI=investments.reduce((s,i)=>s+Number(i.amount),0);
  const tIn=insurance.reduce((s,i)=>s+Number(i.premium),0);
  const hasFin=income>0||expenses.length>0||investments.length>0;
  const sR=income>0?(income-tE)/income*100:0;
  const iR=income>0?tI/income*100:0;
  const ws=!hasFin?null:Math.min(100,Math.round(Math.min(sR,30)/30*40+Math.min(iR,20)/20*40+(insurance.length>0?20:0)));
  const cGoals=goals.filter(g=>["Work","Learning","Mind"].includes(g.category));
  const cTasks=tasks.filter(x=>["Work","Learning","Mind"].includes(x.category));
  const gP=cGoals.length>0?cGoals.reduce((s,g)=>{const days=dateDiffDays(g.startDate,g.dueDate);if(!days)return s;const dates=new Set(tasks.filter(t=>t.goalId===g.id&&t.done&&t.date>=g.startDate&&t.date<=g.dueDate).map(t=>t.date));const filled=dates.size;return s+(filled===days?1:filled/days);},0)/cGoals.length:null;
  const tP=cTasks.length>0?cTasks.filter(x=>x.done).length/cTasks.length:null;
  const cs=(gP===null&&tP===null)?null:Math.round(((gP??0)*.6+(tP??0)*.4)*100);
  const avail=[hs,ws,cs].filter(x=>x!==null);
  const ls=avail.length>0?Math.round(avail.reduce((a,b)=>a+b,0)/avail.length):null;
  const lc=ls===null?"#64748b":ls>=70?"#10b981":ls>=50?"#f59e0b":"#ef4444";
  const hr=new Date().getHours();
  const greet=hr<12?"Good morning ☀️":hr<17?"Good afternoon 🌤️":"Good evening 🌙";
  const getPct=g=>{const days=dateDiffDays(g.startDate,g.dueDate);if(!days)return 0;const dates=new Set(tasks.filter(t=>t.goalId===g.id&&t.done&&t.date>=g.startDate&&t.date<=g.dueDate).map(t=>t.date));const filled=dates.size;const pct=Math.round(filled/days*100);return filled===days?100:Math.min(100,pct);};
  const scores=[{label:"Health",icon:"💪",val:hs,hint:"Add Health tasks & habits"},{label:"Wealth",icon:"💰",val:ws,hint:"Add income & expenses"},{label:"Career",icon:"🚀",val:cs,hint:"Add Work/Learning goals"}];

  return <div className="section">
    {isGuest&&<GuestBanner onLogin={onLogin}/>}
    <div className="home-banner">
      <div>
        <div className="home-greeting">{greet}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.6)",marginTop:4}}>{tod.length>0?`${todDone}/${tod.length} tasks done today`:"No tasks planned today"}</div>
      </div>
    </div>

    {/* SCORE PANEL */}
    <div className="score-panel">
      <div className="life-center">
        <svg viewBox="0 0 140 140" width="128" height="128">
          <circle cx="70" cy="70" r="55" fill="none" stroke="var(--border)" strokeWidth="10"/>
          {ls!==null&&<circle cx="70" cy="70" r="55" fill="none" stroke={lc} strokeWidth="10"
            strokeDasharray={`${2*Math.PI*55*ls/100} ${2*Math.PI*55}`} strokeLinecap="round" transform="rotate(-90 70 70)"/>}
          <text x="70" y="63" textAnchor="middle" fontSize="26" fontWeight="900" fill={ls===null?"#64748b":lc}>{ls===null?"—":ls}</text>
          <text x="70" y="80" textAnchor="middle" fontSize="10" fill="var(--muted)" fontWeight="700">LIFE SCORE</text>
        </svg>
        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:2}}>{ls===null?"Add data to unlock":"Overall balance"}</div>
      </div>
      <div style={{width:1,background:"var(--border)",alignSelf:"stretch",margin:"0 20px",flexShrink:0}}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        {scores.map(s=><div key={s.label} style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,width:180,flexShrink:0}}>
            <span style={{fontSize:20}}>{s.icon}</span>
            <div><div style={{fontSize:13,fontWeight:600}}>{s.label} Score</div>{s.val===null&&<div style={{fontSize:10,color:"var(--muted)"}}>{s.hint}</div>}</div>
          </div>
          <div style={{flex:1}}>
            {s.val===null
              ?<span style={{fontSize:18,fontWeight:800,color:"#64748b"}}>—</span>
              :<><div style={{fontSize:20,fontWeight:800,color:pColor(s.val),marginBottom:4}}>{s.val}%</div>
                <div style={{height:5,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:s.val+"%",height:"100%",background:pColor(s.val),borderRadius:99,transition:"width .5s"}}/>
                </div></>
            }
          </div>
        </div>)}
      </div>
    </div>

    <div className="home-grid">
      <div className="home-card">
        <div className="home-card-hdr"><span>📌 Today's Focus</span><button className="link-btn" onClick={()=>onNav("Planner")}>Planner →</button></div>
        {tod.length===0?<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>No tasks today. {!isGuest&&<button className="link-btn" onClick={()=>onNav("Planner")}>Add →</button>}</div>
          :tod.slice(0,7).map(t=><div key={t.id} className="focus-item">
            <span className={clsx("focus-ck",t.done&&"done")}>{t.done?"✓":"○"}</span>
            <span style={{flex:1,fontSize:13,textDecoration:t.done?"line-through":"none",opacity:t.done?.5:1}}>{t.title}</span>
            <span className="cat-badge" style={{background:CAT_COLOR[t.category]+"22",color:CAT_COLOR[t.category],fontSize:10,padding:"1px 6px"}}>{t.category}</span>
          </div>)
        }
        {tod.length>0&&<div style={{marginTop:10}}>
          <div style={{height:5,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
            <div style={{width:(todDone/tod.length*100)+"%",height:"100%",background:"#10b981",borderRadius:99}}/>
          </div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{todDone}/{tod.length} done</div>
        </div>}
      </div>

      <div className="home-card">
        <div className="home-card-hdr"><span>🎯 Goals</span><button className="link-btn" onClick={()=>onNav("Goals")}>Goals →</button></div>
        {goals.length===0?<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>No goals yet. {!isGuest&&<button className="link-btn" onClick={()=>onNav("Goals")}>Add →</button>}</div>
          :goals.slice(0,5).map(g=>{const p=getPct(g);const c=pColor(p);const d=dfn(g.dueDate);return(
            <div key={g.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:600}}>{g.title}</span>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {d!==null&&<span className={clsx("due-badge",d<0&&"overdue",d<=7&&d>=0&&"soon")} style={{fontSize:10}}>{d<0?`${Math.abs(d)}d over`:d===0?"Today":`${d}d`}</span>}
                  <span style={{fontSize:12,fontWeight:700,color:c}}>{p}%</span>
                </div>
              </div>
              <div style={{height:5,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:p+"%",height:"100%",background:c,borderRadius:99,transition:"width .4s"}}/>
              </div>
            </div>);})
        }
      </div>

      <div className="home-card">
        <div className="home-card-hdr"><span>🔥 Habits</span><button className="link-btn" onClick={()=>onNav("Habits")}>Habits →</button></div>
        {habits.length===0?
          <div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}>No habits. {!isGuest&&<button className="link-btn" onClick={()=>onNav("Habits")}>Add →</button>}</div>
          :habits.map(h=>{const done=(h.checks||[]).filter(Boolean).length;return(
            <div key={h.id} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:h.color}}/>
                <span style={{fontSize:13,fontWeight:600,flex:1}}>{h.title}</span>
                <span style={{fontSize:11,color:pColor(Math.round((h.checks||[]).filter(Boolean).length/21*100)),fontWeight:700}}>{(h.checks||[]).filter(Boolean).length}/21</span>
              </div>
              <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                {Array.from({length:21},(_,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:(h.checks||[])[i]?h.color:"var(--border)"}}/>) }
              </div>
            </div>);})
        }
      </div>

      <div className="home-card">
        <div className="home-card-hdr"><span>💰 Finance</span><button className="link-btn" onClick={()=>onNav("Finance")}>Finance →</button></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[{l:"Income",v:income,c:"#10b981"},{l:"Expenses",v:tE,c:"#ef4444"},{l:"Investments",v:tI,c:"#6366f1"},{l:"Savings",v:Math.max(0,income-tE-tI-tIn),c:"#14b8a6"}].map(s=>(
            <div key={s.l} style={{background:"var(--surface2)",borderRadius:8,padding:"9px 11px"}}>
              <div style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginBottom:2}}>{s.l}</div>
              <div style={{fontSize:14,fontWeight:800,color:s.c}}>₹{Number(s.v).toLocaleString("en-IN")}</div>
            </div>))}
        </div>
        {income>0&&<div style={{height:10,background:"var(--surface2)",borderRadius:99,overflow:"hidden",display:"flex"}}>
          {[{v:tE,c:"#ef4444"},{v:tI,c:"#6366f1"},{v:tIn,c:"#f59e0b"},{v:Math.max(0,income-tE-tI-tIn),c:"#10b981"}].map((s,i)=>(
            <div key={i} style={{width:(s.v/income*100)+"%",height:"100%",background:s.c,minWidth:s.v>0?3:0}}/>))}
        </div>}
      </div>
    </div>
    {!isGuest&&<AICoach tasks={tasks} goals={goals} habits={habits} expenses={expenses} investments={investments} insurance={insurance} income={income} hs={hs} ws={ws} cs={cs} ls={ls}/>}
  </div>;
}

// ── PLANNER ───────────────────────────────────────────────────────────────────
function Planner({goals,isGuest}){
  const {items:tasks,loading,add,replace,remove}=useCollection("planner_tasks",isGuest);
  // goalHook needed to sync roadmap step done state when task is checked
  const {items:goalItems,replace:replaceGoal}=useCollection("goals",isGuest);
  const [view,setView]=useState("Week");
  const [sel,setSel]=useState(today());
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({title:"",category:"Work",date:today(),time:"",note:"",goalId:"",done:false});
  const [selectedTaskIds,setSelectedTaskIds]=useState(new Set());
  const [bulkCopyModal,setBulkCopyModal]=useState(false);
  const [copySelectedDates,setCopySelectedDates]=useState(new Set());
  const [copyCalendarMonth,setCopyCalendarMonth]=useState(today().slice(0,7));
  const [copyTask,setCopyTask]=useState(null);
  const [copyDate,setCopyDate]=useState(today());
  const openAdd=()=>{if(isGuest)return;setForm({title:"",category:"Work",date:sel,time:"",note:"",goalId:"",done:false});setModal("add");};
  const openBulkCopy=()=>{if(isGuest||selectedTaskIds.size===0)return;setCopySelectedDates(new Set());setCopyCalendarMonth(sel.slice(0,7));setBulkCopyModal(true);};
  const clearSelection=()=>setSelectedTaskIds(new Set());
  const toggleSelect=t=>{
    setSelectedTaskIds(prev=>{
      const next=new Set(prev);
      if(next.has(t.id))next.delete(t.id);
      else next.add(t.id);
      return next;
    });
  };
  const toggleSelectAllDay=()=>{
    if(isGuest)return;
    const next=new Set(selectedTaskIds);
    const allSelected=selT.length>0 && selT.every(t=>next.has(t.id));
    selT.forEach(t=>{ if(allSelected) next.delete(t.id); else next.add(t.id); });
    setSelectedTaskIds(next);
  };
  const openEdit=t=>{if(isGuest)return;setForm({...t,goalId:t.goalId||"",roadmapStepId:""});setModal(t);};
  const openCopy=t=>{if(isGuest)return;setCopyTask(t);setCopyDate(t.date||sel);};
  const save=async()=>{
    if(!form.title.trim())return;
    if(modal==="add")await add({...form});
    else await replace(modal.id,{...form,id:modal.id});
    setModal(null);
  };
  const saveCopy=async()=>{
    if(!copyTask||!copyDate)return;
    await add({...copyTask,id:undefined,date:copyDate,done:false});
    setCopyTask(null);
  };
  const copyCalendarDays=useMemo(()=>{
    const [y,m]=copyCalendarMonth.split("-");
    const year=Number(y);
    const month=Number(m)-1;
    const first=new Date(year,month,1);
    const startDay=first.getDay();
    const lead=startDay===0?6:startDay-1;
    const daysInMonth=new Date(year,month+1,0).getDate();
    const cells=[];
    for(let i=0;i<lead;i++)cells.push(null);
    for(let d=1;d<=daysInMonth;d++)cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    while(cells.length%7!==0)cells.push(null);
    return cells;
  },[copyCalendarMonth]);
  const toggleCopyDate=d=>{setCopySelectedDates(prev=>{const next=new Set(prev);if(next.has(d))next.delete(d);else next.add(d);return next;});};
  const saveBulkCopy=async()=>{
    const dates=Array.from(copySelectedDates).sort();
    if(dates.length===0)return;
    const tasksToCopy=tasks.filter(t=>selectedTaskIds.has(t.id));
    for(const task of tasksToCopy){
      for(const date of dates){
        await add({...task,id:undefined,date,done:false});
      }
    }
    setBulkCopyModal(false);
    clearSelection();
    setCopySelectedDates(new Set());
  };
  const toggle=t=>{
    if(isGuest)return;
    const newDone=!t.done;
    replace(t.id,{...t,done:newDone});
  };
  const wDates=useMemo(()=>{const b=new Date(sel+"T00:00:00");const dy=b.getDay();const m=new Date(b);m.setDate(b.getDate()-(dy===0?6:dy-1));return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d.toISOString().slice(0,10);});},[sel]);
  const mDates=useMemo(()=>{const b=new Date(sel+"T00:00:00");const y=b.getFullYear(),mo=b.getMonth(),days=new Date(y,mo+1,0).getDate();return Array.from({length:days},(_,i)=>`${y}-${String(mo+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);},[sel]);
  const selT=useMemo(()=>tasks.filter(t=>t.date===sel).sort((a,b)=>(a.time||"").localeCompare(b.time||"")),[tasks,sel]);
  const tcnt=useMemo(()=>{const m={};tasks.forEach(t=>{m[t.date]=(m[t.date]||0)+1;});return m;},[tasks]);
  const dcnt=useMemo(()=>{const m={};tasks.filter(t=>t.done).forEach(t=>{m[t.date]=(m[t.date]||0)+1;});return m;},[tasks]);
  const navW=d=>{const dt=new Date(sel+"T00:00:00");dt.setDate(dt.getDate()+d*7);setSel(dt.toISOString().slice(0,10));};
  const navM=d=>{const dt=new Date(sel+"T00:00:00");dt.setMonth(dt.getMonth()+d);setSel(dt.toISOString().slice(0,10));};
  if(loading)return<Spinner/>;
  return <div className="section">
    <div className="section-header">
      <h2>Daily Planner</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div className="seg-ctrl">{VIEWS.map(v=><button key={v} className={clsx("seg-btn",view===v&&"active")} onClick={()=>setView(v)}>{v}</button>)}</div>
        {!isGuest&&<><button className="btn-primary" onClick={openAdd}>+ Task</button><button className="btn-ghost" onClick={toggleSelectAllDay} disabled={selT.length===0}>{selT.length>0 && selT.every(t=>selectedTaskIds.has(t.id))?"Deselect all":"Select all"}</button><button className="btn-ghost" onClick={openBulkCopy} disabled={selectedTaskIds.size===0}>Bulk copy {selectedTaskIds.size>0?`(${selectedTaskIds.size})`:''}</button></>}
      </div>
    </div>
    {view==="Week"&&<>
      <div className="week-nav">
        <button className="icon-btn" onClick={()=>navW(-1)}>‹ Prev</button>
        <span style={{fontSize:13,color:"var(--muted)",fontWeight:600}}>{new Date(wDates[0]+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – {new Date(wDates[6]+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
        <button className="icon-btn" onClick={()=>navW(1)}>Next ›</button>
      </div>
      <div className="week-strip">
        {wDates.map(d=>{const c=tcnt[d]||0;const dn=dcnt[d]||0;const isT=d===today();const isS=d===sel;return(
          <button key={d} className={clsx("wdb",isT&&"wdb-today",isS&&"wdb-sel")} onClick={()=>setSel(d)}>
            <span className="wdb-name">{new Date(d+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short"})}</span>
            <span className="wdb-num">{parseInt(d.slice(8))}</span>
            <div style={{height:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {c>0&&<div style={{width:5,height:5,borderRadius:"50%",background:dn===c?"#10b981":"#6366f1"}}/>}
            </div>
          </button>);})}
      </div>
    </>}
    {view==="Month"&&<>
      <div className="week-nav">
        <button className="icon-btn" onClick={()=>navM(-1)}>‹ Prev</button>
        <span style={{fontSize:13,color:"var(--muted)",fontWeight:600}}>{new Date(sel+"T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span>
        <button className="icon-btn" onClick={()=>navM(1)}>Next ›</button>
      </div>
      <div className="month-grid">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"var(--muted)",fontWeight:600,padding:"5px 0",textTransform:"uppercase"}}>{d}</div>)}
        {(()=>{const b=new Date(sel+"T00:00:00");const fd=new Date(b.getFullYear(),b.getMonth(),1).getDay();const off=fd===0?6:fd-1;const cells=Array.from({length:off},(_,i)=><div key={"e"+i}/>);
          mDates.forEach(d=>{const c=tcnt[d]||0;const dn=dcnt[d]||0;const isT=d===today();const isS=d===sel;
            cells.push(<div key={d} onClick={()=>setSel(d)} style={{background:isS?"var(--accent)":isT?"var(--surface2)":"var(--surface)",borderRadius:6,padding:"5px 6px",minHeight:50,cursor:"pointer",border:isT&&!isS?"1px solid var(--accent)":"1px solid transparent",transition:"all .15s"}}>
              <span style={{fontSize:11,fontWeight:600,color:isS?"#fff":isT?"var(--accent)":"var(--muted)",display:"block"}}>{parseInt(d.slice(8))}</span>
              {c>0&&<div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>{Array.from({length:Math.min(c,5)},(_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<dn?"#10b981":"#6366f1"}}/>)}</div>}
            </div>);
          });return cells;})()}
      </div>
    </>}
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)",marginBottom:8,fontSize:13,fontWeight:600}}>
        <span>{new Date(sel+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</span>
        <span style={{fontSize:12,color:"var(--muted)"}}>{selT.length} task{selT.length!==1?"s":""}</span>
      </div>
      {selT.length===0 ? (
        <div style={{color:"var(--muted)",padding:"14px 0",fontSize:13}}>No tasks. {!isGuest&&<button className="link-btn" onClick={openAdd}>Add one →</button>}</div>
      ) : (
        selT.map(t => {
          const selected = selectedTaskIds.has(t.id);
          return (
          <div key={t.id} className={clsx("task-card",t.done&&"t-done")} style={{borderLeft:`4px solid ${CAT_COLOR[t.category]||"#6366f1"}`,background:selected?"rgba(99,102,241,.12)":"var(--surface)",cursor:isGuest?"default":"pointer"}} onClick={()=>!isGuest&&toggleSelect(t)}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <input type="checkbox" checked={!!t.done} onChange={e=>{e.stopPropagation();toggle(t);}} disabled={isGuest} style={{marginTop:2,accentColor:"var(--accent)",width:14,height:14,flexShrink:0,cursor:isGuest?"not-allowed":"pointer"}}/>

              <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span>
                {t.note&&<span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",opacity:.85}}> — {t.note}</span>}
              </div>

              <span className="cat-badge" style={{background:CAT_COLOR[t.category]+"22",color:CAT_COLOR[t.category]}}>{t.category}</span>
              {t.time&&<span style={{fontSize:11,color:"var(--muted)",marginLeft:6,whiteSpace:"nowrap"}}>⏰ {t.time}</span>}
              {t.goalId && (() => {
                const g = goals.find(x => x.id === t.goalId);
                return (
                  <span style={{fontSize:11,color:"#8b5cf6",background:"#8b5cf622",padding:"1px 7px",borderRadius:20,fontWeight:600,whiteSpace:"nowrap"}}>
                    🎯 {g ? g.title : "Goal"}
                  </span>
                );
              })()}

              {!isGuest && (
                <div className="task-actions">
                  <button onClick={() => openEdit(t)} className="icon-btn">✏️</button>
                  <button onClick={() => openCopy(t)} className="icon-btn">📋</button>
                  <button onClick={() => remove(t.id)} className="icon-btn">🗑</button>
                </div>
              )}
            </div>
          </div>
          )
        })
      )}
    </div>
    {modal&&<Modal title={modal==="add"?"Add Task":"Edit Task"} onClose={()=>setModal(null)} onSave={save}>
      <label>Title *</label><input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What needs to be done?" autoFocus/>
      <div className="form-row">
        <div><label>Category</label><select className="inp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{PLAN_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label>Date</label><input type="date" className="inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
        <div><label>Time</label><input type="time" className="inp" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
      </div>
      <div><label>Goal (optional)</label>
        <select className="inp" value={form.goalId} onChange={e=>setForm(f=>({...f,goalId:e.target.value}))}>
          <option value="">— None —</option>
          {goals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
      </div>
      {form.goalId && (() => {
        const linkedGoal = goals.find(g => g.id === form.goalId);
        return linkedGoal ? (
          <div style={{fontSize:11,color:"var(--muted)",marginTop:4,padding:"8px 10px",background:"var(--surface2)",borderRadius:6}}>
            Goal span: {linkedGoal.startDate ? fmt(linkedGoal.startDate) : "—"} → {linkedGoal.dueDate ? fmt(linkedGoal.dueDate) : "—"}
          </div>
        ) : null;
      })()}
      <label>Note</label><textarea className="inp" rows={2} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optional…"/>
    </Modal>}
    {copyTask&&<Modal title="Copy Task" onClose={()=>setCopyTask(null)} onSave={saveCopy}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{copyTask.title}</div>
      <label>Copy to date</label>
      <input type="date" className="inp" value={copyDate} onChange={e=>setCopyDate(e.target.value)}/>
      <div style={{fontSize:12,color:"var(--muted)",marginTop:10}}>
        A new task copy will be created on the selected date with the same category, goal, time, and note.
      </div>
    </Modal>}
    {bulkCopyModal&&<Modal title="Bulk Copy Tasks" onClose={()=>setBulkCopyModal(false)} onSave={saveBulkCopy}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{selectedTaskIds.size} task{selectedTaskIds.size!==1?'s':''} selected</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <button className="icon-btn" onClick={()=>{const [y,m]=copyCalendarMonth.split("-");const dt=new Date(Number(y),Number(m)-2,1);setCopyCalendarMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);}}>-</button>
        <span style={{fontSize:13,fontWeight:600}}>{new Date(copyCalendarMonth+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span>
        <button className="icon-btn" onClick={()=>{const [y,m]=copyCalendarMonth.split("-");const dt=new Date(Number(y),Number(m),1);setCopyCalendarMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);}}>+</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:10,fontSize:11,color:"var(--muted)",textAlign:"center"}}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} style={{padding:"4px 0",fontWeight:700}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {copyCalendarDays.map((d,index)=>(
          d ? (
            <button key={d} onClick={()=>toggleCopyDate(d)} type="button" style={{padding:10,borderRadius:8,border:copySelectedDates.has(d)?"1px solid #6366f1":"1px solid transparent",background:copySelectedDates.has(d)?"rgba(99,102,241,.18)":"var(--surface2)",cursor:"pointer"}}>{parseInt(d.slice(8))}</button>
          ) : (
            <div key={index} style={{height:34}}></div>
          )
        ))}
      </div>
      <div style={{fontSize:12,color:"var(--muted)",marginTop:10}}>
        Select one or more dates from the calendar above. Selected dates will receive copied tasks.
      </div>
    </Modal>}
  </div>;
}

// ── GOALS ─────────────────────────────────────────────────────────────────────
function Goals({goals,goalHook,plannerTasks,isGuest}){
  const {add,replace,remove,loading}=goalHook;
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({title:"",description:"",startDate:"",dueDate:"",category:"Work",roadmap:[]});
  const [rmForm,setRmForm]=useState({title:"",dueDate:"",note:""});
  const [addRmId,setAddRmId]=useState(null);
  const [exp,setExp]=useState({});
  const openAdd=()=>{if(isGuest)return;setForm({title:"",description:"",startDate:"",dueDate:"",category:"Work",roadmap:[]});setModal("add");};
  const openEdit=g=>{if(isGuest)return;setForm({...g,roadmap:g.roadmap||[]});setModal(g);};
  const save=async()=>{if(!form.title.trim())return;if(modal==="add")await add({...form,roadmap:[]});else await replace(modal.id,{...form,id:modal.id});setModal(null);};
  const addRm=async g=>{if(!rmForm.title.trim())return;await replace(g.id,{...g,roadmap:[...(g.roadmap||[]),{...rmForm,id:uuid(),done:false}]});setRmForm({title:"",dueDate:"",note:""});setAddRmId(null);};
  const togRm=async(g,id)=>{if(isGuest)return;replace(g.id,{...g,roadmap:(g.roadmap||[]).map(r=>r.id===id?{...r,done:!r.done}:r)});};
  const delRm=async(g,id)=>{if(isGuest)return;replace(g.id,{...g,roadmap:(g.roadmap||[]).filter(r=>r.id!==id)});};
  const getPct=g=>{
    const days=dateDiffDays(g.startDate,g.dueDate);
    if(!days)return 0;
    const dates=new Set(plannerTasks.filter(t=>t.goalId===g.id&&t.done&&t.date>=g.startDate&&t.date<=g.dueDate).map(t=>t.date));
    const filled=dates.size;
    const pct=Math.round(filled/days*100);
    return filled===days?100:Math.min(100,pct);
  };
  if(loading)return<Spinner/>;
  return <div className="section">
    <div className="section-header">
      <h2>Goal Planner</h2>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>{goals.length} goals · {goals.filter(g=>getPct(g)===100).length} completed</span>
        {!isGuest&&<button className="btn-primary" onClick={openAdd}>+ Goal</button>}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {goals.length===0&&<div className="empty-msg center">No goals yet.{!isGuest&&" Add your first goal!"}</div>}
      {goals.map(g=>{
        const p=getPct(g);
        const c=pColor(p);
        const d=dfn(g.dueDate);
        const spanDays = g.startDate && g.dueDate ? Math.max(1, Math.ceil((new Date(g.dueDate+"T00:00:00") - new Date(g.startDate+"T00:00:00"))/86400000) + 1) : null;
        const isE=exp[g.id];
        return(
        <div key={g.id} style={{background:"var(--surface)",borderRadius:12,padding:14,borderLeft:`4px solid ${c}`}}>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{fontSize:14,fontWeight:600,flexShrink:0}}>{g.title}</span>

                <div style={{flex:1,minWidth:120,maxWidth:260,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:6,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
                    <div style={{width:p+"%",height:"100%",background:c,borderRadius:99,transition:"width .4s"}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:c,whiteSpace:"nowrap"}}>{p}%</span>
                </div>

                <span className="cat-badge" style={{background:CAT_COLOR[g.category]+"22",color:CAT_COLOR[g.category]}}>{g.category}</span>
                {g.startDate&&<span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>Start: {fmt(g.startDate)}</span>}
                {spanDays&&<span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>{spanDays}d span</span>}
                {g.dueDate&&<span className={clsx("due-badge",d<0&&"overdue",d<=7&&d>=0&&"soon")}>{d<0?`${Math.abs(d)}d overdue`:d===0?"Today":`${d}d left`}</span>}
              </div>
              {g.description&&<div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>{g.description}</div>}
            </div>
            <div style={{display:"flex",gap:2,flexShrink:0}}>
              <button className="icon-btn" onClick={()=>setExp(e=>({...e,[g.id]:!isE}))}>{isE?"▲":"▼"}</button>
              {!isGuest&&<><button className="icon-btn" onClick={()=>openEdit(g)}>✏️</button><button className="icon-btn" onClick={()=>remove(g.id)}>🗑</button></>}
            </div>
          </div>
          {isE&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".05em"}}>
              <span>Roadmap ({(g.roadmap||[]).filter(r=>r.done).length}/{(g.roadmap||[]).length} done)</span>
              {!isGuest&&<button className="btn-secondary" onClick={()=>setAddRmId(g.id)}>+ Step</button>}
            </div>
            {(g.roadmap||[]).map((r,i)=>{
              const linkedTasks=plannerTasks.filter(t=>t.goalId===g.id&&t.roadmapStepId===r.id);
              const linkedDone=linkedTasks.filter(t=>t.done).length;
              const autoDone=linkedTasks.length>0&&linkedTasks.every(t=>t.done);
              const isStepDone=r.done||autoDone;
              return <div key={r.id} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"7px 9px",background:"var(--surface2)",borderRadius:8,marginBottom:5,opacity:isStepDone?0.65:1}}>
                <input type="checkbox" checked={!!isStepDone} onChange={()=>togRm(g,r.id)} disabled={isGuest||autoDone} style={{marginTop:2,accentColor:"var(--accent)",cursor:isGuest||autoDone?"not-allowed":"pointer"}} title={autoDone?"Auto-completed via linked tasks":""}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:500,textDecoration:isStepDone?"line-through":"none"}}>{i+1}. {r.title}</span>
                    {r.dueDate&&<span style={{fontSize:11,color:"var(--muted)"}}> · {fmt(r.dueDate)}</span>}
                    {linkedTasks.length>0&&<span style={{fontSize:10,background:"#8b5cf622",color:"#8b5cf6",padding:"1px 6px",borderRadius:20,fontWeight:600}}>
                      📋 {linkedDone}/{linkedTasks.length} tasks{autoDone?" ✓ auto":""}
                    </span>}
                  </div>
                  {r.note&&<div style={{fontSize:11,color:"var(--muted)",marginTop:2,fontStyle:"italic"}}>{r.note}</div>}
                </div>
                {!isGuest&&<button className="icon-btn" onClick={()=>delRm(g,r.id)}>✕</button>}
              </div>;
            })}
            {!(g.roadmap||[]).length&&addRmId!==g.id&&<div style={{color:"var(--muted)",fontSize:12,padding:"4px 0"}}>No steps yet.</div>}
            {!isGuest&&addRmId===g.id&&<div style={{display:"flex",flexDirection:"column",gap:7,padding:10,background:"var(--surface2)",borderRadius:8,marginTop:6}}>
              <input className="inp" placeholder="Step title *" value={rmForm.title} onChange={e=>setRmForm(f=>({...f,title:e.target.value}))} autoFocus/>
              <input type="date" className="inp" value={rmForm.dueDate} onChange={e=>setRmForm(f=>({...f,dueDate:e.target.value}))}/>
              <input className="inp" placeholder="Note (optional)" value={rmForm.note} onChange={e=>setRmForm(f=>({...f,note:e.target.value}))}/>
              <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={()=>addRm(g)}>Add</button><button className="btn-ghost" onClick={()=>setAddRmId(null)}>Cancel</button></div>
            </div>}
          </div>}
        </div>);})}
    </div>
    {!isGuest&&modal&&<Modal title={modal==="add"?"Add Goal":"Edit Goal"} onClose={()=>setModal(null)} onSave={save}>
      <label>Title *</label><input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What do you want to achieve?" autoFocus/>
      <label>Description</label><textarea className="inp" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Why is this goal important?"/>
      <div className="form-row">
        <div><label>Category</label><select className="inp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{PLAN_CATEGORIES.filter(c=>c!=="Roadmap Task").map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label>Start Date</label><input type="date" className="inp" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></div>
        <div><label>Due Date</label><input type="date" className="inp" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></div>
      </div>
    </Modal>}
  </div>;
}

// ── HABITS ────────────────────────────────────────────────────────────────────
function Habits({isGuest}){
  const {items:habits,loading,add,replace,remove}=useCollection("habits",isGuest);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({title:"",description:"",color:"#6366f1",checks:Array(21).fill(false),category:"Health",startDate:today()});
  const openAdd=()=>{if(isGuest)return;setForm({title:"",description:"",color:"#6366f1",checks:Array(21).fill(false),category:"Health",startDate:today()});setModal("add");};
  const openEdit=h=>{if(isGuest)return;setForm({...h,checks:h.checks||Array(21).fill(false),category:h.category||"Health",startDate:h.startDate||today()});setModal(h);};
  const save=async()=>{if(!form.title.trim())return;if(modal==="add")await add({...form,checks:Array(21).fill(false),startDate:form.startDate||today()});else await replace(modal.id,{...form,id:modal.id,startDate:form.startDate||today()});setModal(null);};
  const togDay=async(h,i)=>{if(isGuest)return;const c=[...(h.checks||Array(21).fill(false))];c[i]=!c[i];await replace(h.id,{...h,checks:c});};
  const getStatus=h=>{const d=(h.checks||[]).filter(Boolean).length;if(d===21)return{l:"Achieved 🏆",cls:"s-done"};if(d===0)return{l:"Not Started",cls:"s-none"};return{l:`${d}/21 days`,cls:"s-prog"};};
  const getTodayIndex=h=>{if(!h.startDate)return null;const start=new Date(h.startDate+"T00:00:00");const now=new Date(today()+"T00:00:00");const diff=Math.round((now-start)/86400000);return diff<0?null:Math.min(20,Math.max(0,diff));};
  if(loading)return<Spinner/>;
  return <div className="section">
    <div className="section-header">
      <h2>Habit Tracker</h2>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>{habits.length} habits · {habits.filter(h=>(h.checks||[]).filter(Boolean).length===21).length} achieved</span>
        {!isGuest&&<button className="btn-primary" onClick={openAdd}>+ Habit</button>}
      </div>
    </div>
    {habits.length===0&&<div className="empty-msg center">No habits yet.{!isGuest&&" Build a habit — it takes 21 days!"}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {habits.map(h=>{const st=getStatus(h);const done=(h.checks||[]).filter(Boolean).length;const p=Math.round(done/21*100);const bc=pColor(p);const todayIndex=getTodayIndex(h);return(
        <div key={h.id} style={{background:"var(--surface)",borderRadius:12,padding:14,borderLeft:`4px solid ${bc}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:h.color,flexShrink:0}}/>

            <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.title}</span>
              {h.description&&<span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.description}</span>}
              {h.category&&<span style={{fontSize:11,color:CAT_COLOR[h.category]||"#64748b",background:(CAT_COLOR[h.category]||"#64748b")+"22",padding:"1px 8px",borderRadius:20,fontWeight:600,whiteSpace:"nowrap"}}>#{h.category}</span>}
              {h.startDate&&<span style={{fontSize:11,color:"var(--muted)",background:"var(--surface2)",padding:"1px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{new Date(h.startDate+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}).replace(/\s+/g,"")}</span>}
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,minWidth:120,maxWidth:240,flexShrink:0}}>
              <div style={{flex:1,height:6,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:p+"%",height:"100%",background:bc,borderRadius:99,transition:"width .4s"}}/>
              </div>
              <span style={{fontSize:11,color:bc,fontWeight:700,whiteSpace:"nowrap"}}>{p}%</span>
            </div>

            <span style={{fontSize:11,color:"var(--muted)",marginLeft:8,whiteSpace:"nowrap",flexShrink:0}}>{done}/21</span>

            <div style={{display:"flex",gap:3,marginLeft:8,flexShrink:0,overflowX:"auto"}}>
              {Array.from({length:21},(_,i)=>(
                <button key={i} onClick={()=>togDay(h,i)} disabled={isGuest}
                  style={{width:22,height:22,borderRadius:4,border:`1px solid ${(h.checks||[])[i]?h.color:"var(--border)"}`,background:(h.checks||[])[i]?h.color:"var(--surface2)",cursor:isGuest?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s",padding:0,position:"relative"}}
                  title={`Day ${i+1}`}>
                  <span style={{fontSize:9,color:(h.checks||[])[i]?"#fff":"var(--muted)",fontWeight:600,lineHeight:1}}>{i+1}</span>
                  {todayIndex!==null&&todayIndex===i&&<span style={{position:"absolute",top:2,right:2,width:5,height:5,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 0 2px rgba(16,185,129,0.2)"}}/>}
                </button>
              ))}
            </div>

            {!isGuest&&<div style={{display:"flex",gap:2,flexShrink:0}}>
              <button className="icon-btn" onClick={()=>openEdit(h)}>✏️</button>
              <button className="icon-btn" onClick={()=>remove(h.id)}>🗑</button>
            </div>}
          </div>
        </div>);})}
    </div>
    {!isGuest&&modal&&<Modal title={modal==="add"?"Add Habit":"Edit Habit"} onClose={()=>setModal(null)} onSave={save}>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:10}}>
        <div>
          <label>Habit Name *</label>
          <input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Read 30 mins daily" autoFocus/>
        </div>
        <div>
          <label>Start Date</label>
          <input type="date" className="inp" value={form.startDate||today()} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
        </div>
      </div>
      <label>Description</label><input className="inp" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Why this habit?"/>
      <label>Category</label>
      <select className="inp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
        {PLAN_CATEGORIES.filter(c=>c!="Roadmap Task").map(c=><option key={c}>{c}</option>)}
      </select>
      <label>Color</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
        {COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"3px solid transparent",boxShadow:form.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>)}
      </div>
    </Modal>}
  </div>;
}

// ── FINANCE ───────────────────────────────────────────────────────────────────
function Finance({isGuest}){
  const [income,setIncome]=useSingleton("finance",0,isGuest);
  const {items:exp,loading:el,add:aE,remove:rE}=useCollection("expenses",isGuest);
  const {items:inv,loading:il,add:aI,remove:rI}=useCollection("investments",isGuest);
  const {items:ins,loading:insl,add:aIn,remove:rIn}=useCollection("insurance",isGuest);
  const [tab,setTab]=useState("Overview");
  const [ef,setEf]=useState({name:"",amount:"",category:"EMI"});
  const [ivf,setIvf]=useState({name:"",amount:"",type:"Mutual Fund",expectedReturn:""});
  const [inf,setInf]=useState({name:"",premium:"",type:"Life",coverage:"",renewalDate:""});
  const tE=exp.reduce((s,e)=>s+Number(e.amount),0);
  const tI=inv.reduce((s,i)=>s+Number(i.amount),0);
  const tIn=ins.reduce((s,i)=>s+Number(i.premium),0);
  const tC=tE+tI+tIn;
  const sR=income>0?((income-tE)/income*100).toFixed(1):0;
  const iR=income>0?(tI/income*100).toFixed(1):0;
  const hs=income>0?Math.min(100,Math.round(Math.min(Number(sR),30)/30*40+Math.min(Number(iR),20)/20*40+(ins.length>0?20:0))):0;
  const sc=hs>=70?"#10b981":hs>=40?"#f59e0b":"#ef4444";
  if(el||il||insl)return<Spinner/>;
  return <div className="section">
    <div className="section-header">
      <h2>Financial Tracker</h2>
      {!isGuest&&<div style={{display:"flex",alignItems:"center",gap:10}}>
        <label style={{fontSize:13,color:"var(--muted)",whiteSpace:"nowrap",marginTop:0}}>Monthly Income ₹</label>
        <input type="number" className="inp" style={{width:150}} value={income||""} placeholder="e.g. 100000" onChange={e=>setIncome(Number(e.target.value))}/>
      </div>}
      {isGuest&&income>0&&<span style={{fontSize:13,color:"var(--muted)"}}>Income: ₹{income.toLocaleString("en-IN")}/mo</span>}
    </div>
    <div className="seg-ctrl" style={{marginBottom:16}}>
      {["Overview","Expenses","Investments","Insurance"].map(t=><button key={t} className={clsx("seg-btn",tab===t&&"active")} onClick={()=>setTab(t)}>{t}</button>)}
    </div>
    {tab==="Overview"&&<>
      {!income&&<div style={{background:"var(--surface)",borderRadius:12,padding:18,marginBottom:14,color:"var(--muted)",fontSize:13}}>{isGuest?"No income data set.":"👋 Set your monthly income above to see your financial health score."}</div>}
      {income>0&&<div style={{background:"var(--surface2)",borderRadius:12,padding:18,display:"flex",alignItems:"center",gap:20,marginBottom:14}}>
        <svg viewBox="0 0 100 100" style={{width:100,height:100,flexShrink:0}}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke={sc} strokeWidth="10"
            strokeDasharray={`${2*Math.PI*40*hs/100} ${2*Math.PI*40}`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill={sc}>{hs}</text>
        </svg>
        <div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Financial Health Score</div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>{hs>=70?"Excellent! Well-balanced finances.":hs>=40?"Fair. Consider increasing savings & investments.":"Needs attention. Review your ratios."}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <div style={{fontSize:12,color:Number(sR)>=20?"#10b981":"#f59e0b"}}>Savings: {sR}% <span style={{color:"var(--muted)"}}>(Target 20%+)</span></div>
            <div style={{fontSize:12,color:Number(iR)>=15?"#10b981":"#f59e0b"}}>Investments: {iR}% <span style={{color:"var(--muted)"}}>(Target 15%+)</span></div>
            <div style={{fontSize:12,color:ins.length>0?"#10b981":"#f59e0b"}}>Insurance: {ins.length>0?"Covered ✓":"Not covered ✗"}</div>
          </div>
        </div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Income",v:`₹${income.toLocaleString("en-IN")}`,c:"#10b981"},{l:"Expenses",v:`₹${tE.toLocaleString("en-IN")}`,c:"#ef4444"},{l:"Investments",v:`₹${tI.toLocaleString("en-IN")}`,c:"#6366f1"},{l:"Insurance",v:`₹${tIn.toLocaleString("en-IN")}`,c:"#f59e0b"},{l:"Net Savings",v:`₹${Math.max(0,income-tC).toLocaleString("en-IN")}`,c:"#14b8a6"}].map(s=>(
          <div key={s.l} style={{background:"var(--surface)",borderRadius:12,padding:14,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:3,fontWeight:500}}>{s.l}</div>
          </div>))}
      </div>
      {income>0&&<div>
        <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>Income Allocation</div>
        <div style={{height:14,background:"var(--surface2)",borderRadius:99,overflow:"hidden",display:"flex"}}>
          {[{v:tE,c:"#ef4444"},{v:tI,c:"#6366f1"},{v:tIn,c:"#f59e0b"},{v:Math.max(0,income-tC),c:"#10b981"}].map((s,i)=><div key={i} style={{width:(s.v/income*100)+"%",height:"100%",background:s.c,minWidth:s.v>0?4:0}}/>)}
        </div>
        <div style={{display:"flex",gap:14,marginTop:7,flexWrap:"wrap"}}>
          {[["Expenses","#ef4444"],["Investments","#6366f1"],["Insurance","#f59e0b"],["Savings","#10b981"]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:9,height:9,borderRadius:2,background:c}}/><span style={{color:"var(--muted)"}}>{l}</span></div>))}
        </div>
      </div>}
    </>}
    {["Expenses","Investments","Insurance"].includes(tab)&&<>
      {!isGuest&&tab==="Expenses"&&<div className="fin-add-form">
        <input className="inp" placeholder="Expense name" value={ef.name} onChange={e=>setEf(f=>({...f,name:e.target.value}))}/>
        <input type="number" className="inp" placeholder="Amount ₹/mo" value={ef.amount} onChange={e=>setEf(f=>({...f,amount:e.target.value}))}/>
        <select className="inp" value={ef.category} onChange={e=>setEf(f=>({...f,category:e.target.value}))}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select>
        <button className="btn-primary" onClick={async()=>{if(!ef.name||!ef.amount)return;await aE({...ef,amount:Number(ef.amount)});setEf({name:"",amount:"",category:"EMI"});}}>Add</button>
      </div>}
      {tab==="Expenses"&&<table className="fin-table"><thead><tr><th>Name</th><th>Category</th><th>Monthly (₹)</th>{!isGuest&&<th></th>}</tr></thead>
        <tbody>
          {exp.map(e=><tr key={e.id}><td>{e.name}</td><td><span className="cat-badge" style={{background:"#ef444422",color:"#ef4444"}}>{e.category}</span></td><td>₹{Number(e.amount).toLocaleString("en-IN")}</td>{!isGuest&&<td><button className="icon-btn" onClick={()=>rE(e.id)}>🗑</button></td>}</tr>)}
          {!exp.length&&<tr><td colSpan={4} style={{textAlign:"center",color:"var(--muted)",padding:24}}>No expenses added</td></tr>}
          {exp.length>0&&<tr style={{fontWeight:700,background:"var(--surface2)"}}><td colSpan={2}><strong>Total</strong></td><td><strong>₹{tE.toLocaleString("en-IN")}</strong></td>{!isGuest&&<td/>}</tr>}
        </tbody>
      </table>}
      {!isGuest&&tab==="Investments"&&<div className="fin-add-form">
        <input className="inp" placeholder="Investment name" value={ivf.name} onChange={e=>setIvf(f=>({...f,name:e.target.value}))}/>
        <input type="number" className="inp" placeholder="Monthly (₹)" value={ivf.amount} onChange={e=>setIvf(f=>({...f,amount:e.target.value}))}/>
        <select className="inp" value={ivf.type} onChange={e=>setIvf(f=>({...f,type:e.target.value}))}>{INV_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <input type="number" className="inp" placeholder="Return %" value={ivf.expectedReturn} onChange={e=>setIvf(f=>({...f,expectedReturn:e.target.value}))} style={{maxWidth:120}}/>
        <button className="btn-primary" onClick={async()=>{if(!ivf.name||!ivf.amount)return;await aI({...ivf,amount:Number(ivf.amount)});setIvf({name:"",amount:"",type:"Mutual Fund",expectedReturn:""});}}>Add</button>
      </div>}
      {tab==="Investments"&&<table className="fin-table"><thead><tr><th>Name</th><th>Type</th><th>Monthly (₹)</th><th>Return</th>{!isGuest&&<th></th>}</tr></thead>
        <tbody>
          {inv.map(i=><tr key={i.id}><td>{i.name}</td><td><span className="cat-badge" style={{background:"#6366f122",color:"#6366f1"}}>{i.type}</span></td><td>₹{Number(i.amount).toLocaleString("en-IN")}</td><td>{i.expectedReturn?`${i.expectedReturn}% p.a.`:"—"}</td>{!isGuest&&<td><button className="icon-btn" onClick={()=>rI(i.id)}>🗑</button></td>}</tr>)}
          {!inv.length&&<tr><td colSpan={5} style={{textAlign:"center",color:"var(--muted)",padding:24}}>No investments added</td></tr>}
          {inv.length>0&&<tr style={{fontWeight:700,background:"var(--surface2)"}}><td colSpan={2}><strong>Total</strong></td><td><strong>₹{tI.toLocaleString("en-IN")}</strong></td><td/>{!isGuest&&<td/>}</tr>}
        </tbody>
      </table>}
      {!isGuest&&tab==="Insurance"&&<div className="fin-add-form">
        <input className="inp" placeholder="Policy name" value={inf.name} onChange={e=>setInf(f=>({...f,name:e.target.value}))}/>
        <input type="number" className="inp" placeholder="Premium ₹/mo" value={inf.premium} onChange={e=>setInf(f=>({...f,premium:e.target.value}))}/>
        <select className="inp" value={inf.type} onChange={e=>setInf(f=>({...f,type:e.target.value}))}>{INS_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <input className="inp" placeholder="Coverage (e.g. ₹1Cr)" value={inf.coverage} onChange={e=>setInf(f=>({...f,coverage:e.target.value}))}/>
        <input type="date" className="inp" value={inf.renewalDate} onChange={e=>setInf(f=>({...f,renewalDate:e.target.value}))} title="Renewal Date"/>
        <button className="btn-primary" onClick={async()=>{if(!inf.name||!inf.premium)return;await aIn({...inf,premium:Number(inf.premium)});setInf({name:"",premium:"",type:"Life",coverage:"",renewalDate:""});}}>Add</button>
      </div>}
      {tab==="Insurance"&&<table className="fin-table"><thead><tr><th>Policy</th><th>Type</th><th>Premium/mo</th><th>Coverage</th><th>Renewal</th>{!isGuest&&<th></th>}</tr></thead>
        <tbody>
          {ins.map(i=><tr key={i.id}><td>{i.name}</td><td><span className="cat-badge" style={{background:"#f59e0b22",color:"#f59e0b"}}>{i.type}</span></td><td>₹{Number(i.premium).toLocaleString("en-IN")}</td><td>{i.coverage||"—"}</td><td>{i.renewalDate?fmt(i.renewalDate):"—"}</td>{!isGuest&&<td><button className="icon-btn" onClick={()=>rIn(i.id)}>🗑</button></td>}</tr>)}
          {!ins.length&&<tr><td colSpan={6} style={{textAlign:"center",color:"var(--muted)",padding:24}}>No policies added</td></tr>}
          {ins.length>0&&<tr style={{fontWeight:700,background:"var(--surface2)"}}><td colSpan={2}><strong>Total Premium</strong></td><td><strong>₹{tIn.toLocaleString("en-IN")}</strong></td><td colSpan={3}/></tr>}
        </tbody>
      </table>}
    </>}
  </div>;
}

function Modal({title,children,onClose,onSave}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:"var(--surface)",borderRadius:12,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.6)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 17px",borderBottom:"1px solid var(--border)"}}><h3 style={{fontSize:15,fontWeight:700}}>{title}</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
      <div style={{padding:16}}>{children}</div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,padding:"11px 17px",borderTop:"1px solid var(--border)"}}><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSave}>Save</button></div>
    </div>
  </div>;
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(undefined);   // undefined=loading, null=logged out, "guest"=guest, object=auth user
  const [tab,setTab]=useState("Home");
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const isGuest = user==="guest";
  const goalHook=useCollection("goals",isGuest);
  const {items:pTasks}=useCollection("planner_tasks",isGuest);
  const {items:habits}=useCollection("habits",isGuest);
  const {items:expenses}=useCollection("expenses",isGuest);
  const {items:investments}=useCollection("investments",isGuest);
  const {items:insurance}=useCollection("insurance",isGuest);
  const [income]=useSingleton("finance",0,isGuest);
  const ICONS={Home:"🏠",Planner:"📅",Goals:"🎯",Habits:"🔥",Finance:"💰"};

  useEffect(()=>{
    getSession().then(u=>setUser(u||null));
    const sub=onAuthChange(u=>{ if(u)setUser(u); else if(user!=="guest")setUser(null); });
    return()=>sub?.unsubscribe();
  },[]);

  const handleSignOut=async()=>{ await signOut(); setUser(null); };

  if(user===undefined)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><style>{BASE_CSS}</style><Spinner/></div>;
  if(!user||user===null)return <Login onAuth={v=>setUser(v)}/>;

  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)",color:"var(--text)",fontFamily:"Inter,-apple-system,sans-serif",fontSize:14,lineHeight:1.5}}>
    <style>{BASE_CSS+APP_CSS}</style>
    <header style={{display:"flex",alignItems:"center",gap:14,padding:"0 20px",height:56,background:"var(--surface)",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:7,fontWeight:800,fontSize:17,flexShrink:0}}>
        <span>⚡</span>
        <span style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>LifeOS</span>
      </div>
      <button className="mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded={mobileNavOpen} onClick={()=>setMobileNavOpen(v=>!v)}>
        ☰
      </button>
      <nav className={clsx("app-nav", mobileNavOpen && "mobile-open")}>
        {TABS.map(t=><button key={t} onClick={()=>{setTab(t);setMobileNavOpen(false);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,border:"none",background:tab===t?"var(--accent)":"transparent",color:tab===t?"#fff":"var(--muted)",cursor:"pointer",fontSize:13,fontWeight:500,transition:"all .15s"}}>
          <span>{ICONS[t]}</span><span className="nav-label">{t}</span>
        </button>)}
      </nav>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {isGuest&&<span style={{fontSize:11,background:"#f59e0b22",color:"#f59e0b",padding:"3px 8px",borderRadius:20,fontWeight:600}}>👁 Guest</span>}
        <span style={{color:"var(--muted)",fontSize:12,whiteSpace:"nowrap"}}>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</span>
        <button className="icon-btn" title={isGuest?"Exit guest mode":"Sign out"} onClick={handleSignOut} style={{fontSize:15}}>🔒</button>
      </div>
    </header>
    <main style={{flex:1,padding:20,maxWidth:1280,margin:"0 auto",width:"100%",animation:"fadeIn .2s ease"}}>
      {tab==="Home"&&<Home tasks={pTasks} goals={goalHook.items} habits={habits} expenses={expenses} investments={investments} insurance={insurance} income={income} onNav={setTab} isGuest={isGuest} onLogin={()=>setUser(null)}/>}
      {tab==="Planner"&&<Planner goals={goalHook.items} isGuest={isGuest}/>}
      {tab==="Goals"&&<Goals goals={goalHook.items} goalHook={goalHook} plannerTasks={pTasks} isGuest={isGuest}/>}
      {tab==="Habits"&&<Habits isGuest={isGuest}/>}
      {tab==="Finance"&&<Finance isGuest={isGuest}/>}
    </main>
  </div>;
}

const BASE_CSS=`
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
const APP_CSS=`
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
