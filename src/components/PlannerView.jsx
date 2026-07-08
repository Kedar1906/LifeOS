import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";
import { PLAN_CATEGORIES, VIEWS, CAT_COLOR, clsx, fmt, today } from "../lib/appUtils";
import { useCollection } from "../hooks/useCollection";

export function PlannerView({ goals, isGuest }) {
  const { items: tasks, loading, add, replace, remove } = useCollection("planner_tasks", isGuest);
  const { items: goalItems, replace: replaceGoal } = useCollection("goals", isGuest);
  const [view, setView] = useState("Week");
  const [selectedDate, setSelectedDate] = useState(today());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", category: "Work", date: today(), time: "", note: "", goalId: "", done: false });
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [bulkCopyModal, setBulkCopyModal] = useState(false);
  const [copySelectedDates, setCopySelectedDates] = useState(new Set());
  const [copyCalendarMonth, setCopyCalendarMonth] = useState(today().slice(0, 7));
  const [copyTask, setCopyTask] = useState(null);
  const [copyDate, setCopyDate] = useState(today());

  const openAdd = () => { if (isGuest) return; setForm({ title: "", category: "Work", date: selectedDate, time: "", note: "", goalId: "", done: false }); setModal("add"); };
  const openBulkCopy = () => { if (isGuest || selectedTaskIds.size === 0) return; setCopySelectedDates(new Set()); setCopyCalendarMonth(selectedDate.slice(0, 7)); setBulkCopyModal(true); };
  const clearSelection = () => setSelectedTaskIds(new Set());
  const toggleSelect = (task) => { setSelectedTaskIds((prev) => { const next = new Set(prev); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; }); };
  const toggleSelectAllDay = () => { if (isGuest) return; const next = new Set(selectedTaskIds); const allSelected = selectedTasks.length > 0 && selectedTasks.every((task) => next.has(task.id)); selectedTasks.forEach((task) => { if (allSelected) next.delete(task.id); else next.add(task.id); }); setSelectedTaskIds(next); };
  const openEdit = (task) => { if (isGuest) return; setForm({ ...task, goalId: task.goalId || "", roadmapStepId: "" }); setModal(task); };
  const openCopy = (task) => { if (isGuest) return; setCopyTask(task); setCopyDate(task.date || selectedDate); };
  const save = async () => { if (!form.title.trim()) return; if (modal === "add") await add({ ...form }); else await replace(modal.id, { ...form, id: modal.id }); setModal(null); };
  const saveCopy = async () => { if (!copyTask || !copyDate) return; await add({ ...copyTask, id: undefined, date: copyDate, done: false }); setCopyTask(null); };
  const toggle = (task) => { if (isGuest) return; const newDone = !task.done; replace(task.id, { ...task, done: newDone }); };
  const copyCalendarDays = useMemo(() => { const [year, month] = copyCalendarMonth.split("-"); const first = new Date(Number(year), Number(month) - 1, 1); const startDay = first.getDay(); const lead = startDay === 0 ? 6 : startDay - 1; const daysInMonth = new Date(Number(year), Number(month), 0).getDate(); const cells = []; for (let index = 0; index < lead; index += 1) cells.push(null); for (let day = 1; day <= daysInMonth; day += 1) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`); while (cells.length % 7 !== 0) cells.push(null); return cells; }, [copyCalendarMonth]);
  const toggleCopyDate = (date) => { setCopySelectedDates((prev) => { const next = new Set(prev); if (next.has(date)) next.delete(date); else next.add(date); return next; }); };
  const saveBulkCopy = async () => { const dates = Array.from(copySelectedDates).sort(); if (dates.length === 0) return; const tasksToCopy = tasks.filter((task) => selectedTaskIds.has(task.id)); for (const task of tasksToCopy) { for (const date of dates) { await add({ ...task, id: undefined, date, done: false }); } } setBulkCopyModal(false); clearSelection(); setCopySelectedDates(new Set()); };
  const weekDates = useMemo(() => { const base = new Date(selectedDate + "T00:00:00"); const day = base.getDay(); const monday = new Date(base); monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1)); return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date.toISOString().slice(0, 10); }); }, [selectedDate]);
  const monthDates = useMemo(() => { const base = new Date(selectedDate + "T00:00:00"); const year = base.getFullYear(); const month = base.getMonth(); const days = new Date(year, month + 1, 0).getDate(); return Array.from({ length: days }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`); }, [selectedDate]);
  const selectedTasks = useMemo(() => tasks.filter((task) => task.date === selectedDate).sort((left, right) => (left.time || "").localeCompare(right.time || "")), [tasks, selectedDate]);
  const taskCountByDate = useMemo(() => { const map = {}; tasks.forEach((task) => { map[task.date] = (map[task.date] || 0) + 1; }); return map; }, [tasks]);
  const doneCountByDate = useMemo(() => { const map = {}; tasks.filter((task) => task.done).forEach((task) => { map[task.date] = (map[task.date] || 0) + 1; }); return map; }, [tasks]);
  const navigateWeek = (delta) => { const date = new Date(selectedDate + "T00:00:00"); date.setDate(date.getDate() + delta * 7); setSelectedDate(date.toISOString().slice(0, 10)); };
  const navigateMonth = (delta) => { const date = new Date(selectedDate + "T00:00:00"); date.setMonth(date.getMonth() + delta); setSelectedDate(date.toISOString().slice(0, 10)); };

  if (loading) return <Spinner />;

  return (
    <div className="section">
      <div className="section-header">
        <h2>Daily Planner</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg-ctrl">{VIEWS.map((entry) => <button key={entry} className={clsx("seg-btn", view === entry && "active")} onClick={() => setView(entry)}>{entry}</button>)}</div>
          {!isGuest && <><button className="btn-primary" onClick={openAdd}>+ Task</button><button className="btn-ghost" onClick={toggleSelectAllDay} disabled={selectedTasks.length === 0}>{selectedTasks.length > 0 && selectedTasks.every((task) => selectedTaskIds.has(task.id)) ? "Deselect all" : "Select all"}</button><button className="btn-ghost" onClick={openBulkCopy} disabled={selectedTaskIds.size === 0}>Bulk copy {selectedTaskIds.size > 0 ? `(${selectedTaskIds.size})` : ""}</button></>}
        </div>
      </div>

      {view === "Week" && <>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => navigateWeek(-1)}>‹ Prev</button>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{new Date(weekDates[0] + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(weekDates[6] + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          <button className="icon-btn" onClick={() => navigateWeek(1)}>Next ›</button>
        </div>
        <div className="week-strip">
          {weekDates.map((date) => { const count = taskCountByDate[date] || 0; const done = doneCountByDate[date] || 0; const isToday = date === today(); const isSelected = date === selectedDate; return (<button key={date} className={clsx("wdb", isToday && "wdb-today", isSelected && "wdb-sel")} onClick={() => setSelectedDate(date)}><span className="wdb-name">{new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span><span className="wdb-num">{parseInt(date.slice(8), 10)}</span><div style={{ height: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>{count > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: done === count ? "#10b981" : "#6366f1" }} />}</div></button>); })}
        </div>
      </>}

      {view === "Month" && <>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => navigateMonth(-1)}>‹ Prev</button>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          <button className="icon-btn" onClick={() => navigateMonth(1)}>Next ›</button>
        </div>
        <div className="month-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", fontWeight: 600, padding: "5px 0", textTransform: "uppercase" }}>{day}</div>)}
          {(() => { const base = new Date(selectedDate + "T00:00:00"); const firstDay = new Date(base.getFullYear(), base.getMonth(), 1).getDay(); const offset = firstDay === 0 ? 6 : firstDay - 1; const cells = Array.from({ length: offset }, (_, index) => <div key={`empty-${index}`} />); monthDates.forEach((date) => { const count = taskCountByDate[date] || 0; const done = doneCountByDate[date] || 0; const isToday = date === today(); const isSelected = date === selectedDate; cells.push(<div key={date} onClick={() => setSelectedDate(date)} style={{ background: isSelected ? "var(--accent)" : isToday ? "var(--surface2)" : "var(--surface)", borderRadius: 6, padding: "5px 6px", minHeight: 50, cursor: "pointer", border: isToday && !isSelected ? "1px solid var(--accent)" : "1px solid transparent", transition: "all .15s" }}><span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--muted)", display: "block" }}>{parseInt(date.slice(8), 10)}</span>{count > 0 && <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>{Array.from({ length: Math.min(count, 5) }, (_, index) => <div key={index} style={{ width: 5, height: 5, borderRadius: "50%", background: index < done ? "#10b981" : "#6366f1" }} />)}</div>}</div>); }); return cells; })()}
        </div>
      </>}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
          <span>{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}</span>
        </div>
        {selectedTasks.length === 0 ? <div style={{ color: "var(--muted)", padding: "14px 0", fontSize: 13 }}>No tasks. {!isGuest && <button className="link-btn" onClick={openAdd}>Add one →</button>}</div> : selectedTasks.map((task) => { const selected = selectedTaskIds.has(task.id); return (<div key={task.id} className={clsx("task-card", task.done && "t-done")} style={{ borderLeft: `4px solid ${CAT_COLOR[task.category] || "#6366f1"}`, background: selected ? "rgba(99,102,241,.12)" : "var(--surface)", cursor: isGuest ? "default" : "pointer" }} onClick={() => !isGuest && toggleSelect(task)}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><input type="checkbox" checked={!!task.done} onChange={(event) => { event.stopPropagation(); toggle(task); }} disabled={isGuest} style={{ marginTop: 2, accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0, cursor: isGuest ? "not-allowed" : "pointer" }} /><div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</span>{task.note && <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.85 }}> — {task.note}</span>}</div><span className="cat-badge" style={{ background: CAT_COLOR[task.category] + "22", color: CAT_COLOR[task.category] }}>{task.category}</span>{task.time && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6, whiteSpace: "nowrap" }}>⏰ {task.time}</span>{task.goalId && (() => { const goal = goals.find((entry) => entry.id === task.goalId); return <span style={{ fontSize: 11, color: "#8b5cf6", background: "#8b5cf622", padding: "1px 7px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" }}>🎯 {goal ? goal.title : "Goal"}</span>; })()}{!isGuest && <div className="task-actions"><button onClick={() => openEdit(task)} className="icon-btn">✏️</button><button onClick={() => openCopy(task)} className="icon-btn">📋</button><button onClick={() => remove(task.id)} className="icon-btn">🗑</button></div>}</div></div>); })}
      </div>

      {modal && <Modal title={modal === "add" ? "Add Task" : "Edit Task"} onClose={() => setModal(null)} onSave={save}><label>Title *</label><input className="inp" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to be done?" autoFocus /><div className="form-row"><div><label>Category</label><select className="inp" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{PLAN_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div><div><label>Date</label><input type="date" className="inp" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></div><div><label>Time</label><input type="time" className="inp" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} /></div></div><div><label>Goal (optional)</label><select className="inp" value={form.goalId} onChange={(event) => setForm((current) => ({ ...current, goalId: event.target.value }))}><option value="">— None —</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div>{form.goalId && (() => { const linkedGoal = goals.find((goal) => goal.id === form.goalId); return linkedGoal ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, padding: "8px 10px", background: "var(--surface2)", borderRadius: 6 }}>Goal span: {linkedGoal.startDate ? fmt(linkedGoal.startDate) : "—"} → {linkedGoal.dueDate ? fmt(linkedGoal.dueDate) : "—"}</div> : null; })()}<label>Note</label><textarea className="inp" rows={2} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional…" /></Modal>}

      {copyTask && <Modal title="Copy Task" onClose={() => setCopyTask(null)} onSave={saveCopy}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{copyTask.title}</div><label>Copy to date</label><input type="date" className="inp" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>A new task copy will be created on the selected date with the same category, goal, time, and note.</div></Modal>}

      {bulkCopyModal && <Modal title="Bulk Copy Tasks" onClose={() => setBulkCopyModal(false)} onSave={saveBulkCopy}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? "s" : ""} selected</div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><button className="icon-btn" onClick={() => { const [year, month] = copyCalendarMonth.split("-"); const date = new Date(Number(year), Number(month) - 2, 1); setCopyCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`); }}>-</button><span style={{ fontSize: 13, fontWeight: 600 }}>{new Date(copyCalendarMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span><button className="icon-btn" onClick={() => { const [year, month] = copyCalendarMonth.split("-"); const date = new Date(Number(year), Number(month), 1); setCopyCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`); }}>+</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10, fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} style={{ padding: "4px 0", fontWeight: 700 }}>{day}</div>)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>{copyCalendarDays.map((date, index) => (date ? <button key={date} onClick={() => toggleCopyDate(date)} type="button" style={{ padding: 10, borderRadius: 8, border: copySelectedDates.has(date) ? "1px solid #6366f1" : "1px solid transparent", background: copySelectedDates.has(date) ? "rgba(99,102,241,.18)" : "var(--surface2)", cursor: "pointer" }}>{parseInt(date.slice(8), 10)}</button> : <div key={index} style={{ height: 34 }} />))}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Select one or more dates from the calendar above. Selected dates will receive copied tasks.</div></Modal>}
    </div>
  );
}
