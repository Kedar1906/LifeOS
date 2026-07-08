import { useState } from "react";
import { EXP_CATS, INS_TYPES, INV_TYPES, fmt } from "../lib/appUtils";
import { useSingleton } from "../hooks/useSingleton";
import { useCollection } from "../hooks/useCollection";
import { Spinner } from "./Spinner";

export function FinanceView({ isGuest }) {
  const [income, setIncome, incomeLoading] = useSingleton("finance", 0, isGuest);
  const { items: expenses, loading: expensesLoading, add: addExpense, remove: removeExpense } = useCollection("expenses", isGuest);
  const { items: investments, loading: investmentsLoading, add: addInvestment, remove: removeInvestment } = useCollection("investments", isGuest);
  const { items: insurance, loading: insuranceLoading, add: addInsurance, remove: removeInsurance } = useCollection("insurance", isGuest);
  const [tab, setTab] = useState("Overview");
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", category: "EMI" });
  const [investmentForm, setInvestmentForm] = useState({ name: "", amount: "", type: "Mutual Fund", expectedReturn: "" });
  const [insuranceForm, setInsuranceForm] = useState({ name: "", premium: "", type: "Life", coverage: "", renewalDate: "" });

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalInvestments = investments.reduce((sum, investment) => sum + Number(investment.amount), 0);
  const totalInsurance = insurance.reduce((sum, policy) => sum + Number(policy.premium), 0);
  const totalCashOutflow = totalExpenses + totalInvestments + totalInsurance;
  const savingsRatio = income > 0 ? ((income - totalExpenses) / income * 100).toFixed(1) : 0;
  const investmentRatio = income > 0 ? (totalInvestments / income * 100).toFixed(1) : 0;
  const healthScore = income > 0 ? Math.min(100, Math.round(Math.min(Number(savingsRatio), 30) / 30 * 40 + Math.min(Number(investmentRatio), 20) / 20 * 40 + (insurance.length > 0 ? 20 : 0))) : 0;
  const scoreColor = healthScore >= 70 ? "#10b981" : healthScore >= 40 ? "#f59e0b" : "#ef4444";

  if (expensesLoading || investmentsLoading || insuranceLoading || incomeLoading) return <Spinner />;

  return (
    <div className="section">
      <div className="section-header">
        <h2>Financial Tracker</h2>
        {!isGuest && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", marginTop: 0 }}>Monthly Income ₹</label>
          <input type="number" className="inp" style={{ width: 150 }} value={income || ""} placeholder="e.g. 100000" onChange={(event) => setIncome(Number(event.target.value))} />
        </div>}
        {isGuest && income > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>Income: ₹{income.toLocaleString("en-IN")}/mo</span>}
      </div>

      <div className="seg-ctrl" style={{ marginBottom: 16 }}>
        {['Overview', 'Expenses', 'Investments', 'Insurance'].map((entry) => <button key={entry} className={entry === tab ? 'seg-btn active' : 'seg-btn'} onClick={() => setTab(entry)}>{entry}</button>)}
      </div>

      {tab === 'Overview' && <>
        {!income && <div style={{ background: "var(--surface)", borderRadius: 12, padding: 18, marginBottom: 14, color: "var(--muted)", fontSize: 13 }}>{isGuest ? "No income data set." : "👋 Set your monthly income above to see your financial health score."}</div>}
        {income > 0 && <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 18, display: "flex", alignItems: "center", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
          <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, flexShrink: 0 }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={scoreColor} strokeWidth="10" strokeDasharray={`${2 * Math.PI * 40 * healthScore / 100} ${2 * Math.PI * 40}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
            <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill={scoreColor}>{healthScore}</text>
          </svg>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Financial Health Score</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{healthScore >= 70 ? "Excellent! Well-balanced finances." : healthScore >= 40 ? "Fair. Consider increasing savings & investments." : "Needs attention. Review your ratios."}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 12, color: Number(savingsRatio) >= 20 ? "#10b981" : "#f59e0b" }}>Savings: {savingsRatio}% <span style={{ color: "var(--muted)" }}>(Target 20%+)</span></div>
              <div style={{ fontSize: 12, color: Number(investmentRatio) >= 15 ? "#10b981" : "#f59e0b" }}>Investments: {investmentRatio}% <span style={{ color: "var(--muted)" }}>(Target 15%+)</span></div>
              <div style={{ fontSize: 12, color: insurance.length > 0 ? "#10b981" : "#f59e0b" }}>Insurance: {insurance.length > 0 ? "Covered ✓" : "Not covered ✗"}</div>
            </div>
          </div>
        </div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[{ l: "Income", v: `₹${income.toLocaleString("en-IN")}`, c: "#10b981" }, { l: "Expenses", v: `₹${totalExpenses.toLocaleString("en-IN")}`, c: "#ef4444" }, { l: "Investments", v: `₹${totalInvestments.toLocaleString("en-IN")}`, c: "#6366f1" }, { l: "Insurance", v: `₹${totalInsurance.toLocaleString("en-IN")}`, c: "#f59e0b" }, { l: "Net Savings", v: `₹${Math.max(0, income - totalCashOutflow).toLocaleString("en-IN")}`, c: "#14b8a6" }].map((summary) => <div key={summary.l} style={{ background: "var(--surface)", borderRadius: 12, padding: 14, borderTop: `3px solid ${summary.c}` }}><div style={{ fontSize: 15, fontWeight: 800, color: summary.c }}>{summary.v}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>{summary.l}</div></div>)}
        </div>

        {income > 0 && <div><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Income Allocation</div><div style={{ height: 14, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", display: "flex" }}>{[{ v: totalExpenses, c: "#ef4444" }, { v: totalInvestments, c: "#6366f1" }, { v: totalInsurance, c: "#f59e0b" }, { v: Math.max(0, income - totalCashOutflow), c: "#10b981" }].map((summary, index) => <div key={index} style={{ width: (summary.v / income * 100) + "%", height: "100%", background: summary.c, minWidth: summary.v > 0 ? 4 : 0 }} />)}</div><div style={{ display: "flex", gap: 14, marginTop: 7, flexWrap: "wrap" }}>{[['Expenses', '#ef4444'], ['Investments', '#6366f1'], ['Insurance', '#f59e0b'], ['Savings', '#10b981']].map(([label, color]) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: color }} /><span style={{ color: "var(--muted)" }}>{label}</span></div>)}</div></div>}
      </>}

      {['Expenses', 'Investments', 'Insurance'].includes(tab) && <>
        {!isGuest && tab === 'Expenses' && <div className="fin-add-form"><input className="inp" placeholder="Expense name" value={expenseForm.name} onChange={(event) => setExpenseForm((current) => ({ ...current, name: event.target.value }))} /><input type="number" className="inp" placeholder="Amount ₹/mo" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} /><select className="inp" value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}>{EXP_CATS.map((category) => <option key={category}>{category}</option>)}</select><button className="btn-primary" onClick={async () => { if (!expenseForm.name || !expenseForm.amount) return; await addExpense({ ...expenseForm, amount: Number(expenseForm.amount) }); setExpenseForm({ name: "", amount: "", category: "EMI" }); }}>Add</button></div>}
        {tab === 'Expenses' && <table className="fin-table"><thead><tr><th>Name</th><th>Category</th><th>Monthly (₹)</th>{!isGuest && <th></th>}</tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td>{expense.name}</td><td><span className="cat-badge" style={{ background: "#ef444422", color: "#ef4444" }}>{expense.category}</span></td><td>₹{Number(expense.amount).toLocaleString("en-IN")}</td>{!isGuest && <td><button className="icon-btn" onClick={() => removeExpense(expense.id)}>🗑</button></td>}</tr>)}{!expenses.length && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No expenses added</td></tr>{expenses.length > 0 && <tr style={{ fontWeight: 700, background: "var(--surface2)" }}><td colSpan={2}><strong>Total</strong></td><td><strong>₹{totalExpenses.toLocaleString("en-IN")}</strong></td>{!isGuest && <td />}</tr>}</tbody></table>}

        {!isGuest && tab === 'Investments' && <div className="fin-add-form"><input className="inp" placeholder="Investment name" value={investmentForm.name} onChange={(event) => setInvestmentForm((current) => ({ ...current, name: event.target.value }))} /><input type="number" className="inp" placeholder="Monthly (₹)" value={investmentForm.amount} onChange={(event) => setInvestmentForm((current) => ({ ...current, amount: event.target.value }))} /><select className="inp" value={investmentForm.type} onChange={(event) => setInvestmentForm((current) => ({ ...current, type: event.target.value }))}>{INV_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input type="number" className="inp" placeholder="Return %" value={investmentForm.expectedReturn} onChange={(event) => setInvestmentForm((current) => ({ ...current, expectedReturn: event.target.value }))} style={{ maxWidth: 120 }} /><button className="btn-primary" onClick={async () => { if (!investmentForm.name || !investmentForm.amount) return; await addInvestment({ ...investmentForm, amount: Number(investmentForm.amount) }); setInvestmentForm({ name: "", amount: "", type: "Mutual Fund", expectedReturn: "" }); }}>Add</button></div>}
        {tab === 'Investments' && <table className="fin-table"><thead><tr><th>Name</th><th>Type</th><th>Monthly (₹)</th><th>Return</th>{!isGuest && <th></th>}</tr></thead><tbody>{investments.map((investment) => <tr key={investment.id}><td>{investment.name}</td><td><span className="cat-badge" style={{ background: "#6366f122", color: "#6366f1" }}>{investment.type}</span></td><td>₹{Number(investment.amount).toLocaleString("en-IN")}</td><td>{investment.expectedReturn ? `${investment.expectedReturn}% p.a.` : "—"}</td>{!isGuest && <td><button className="icon-btn" onClick={() => removeInvestment(investment.id)}>🗑</button></td>}</tr>)}{!investments.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No investments added</td></tr>{investments.length > 0 && <tr style={{ fontWeight: 700, background: "var(--surface2)" }}><td colSpan={2}><strong>Total</strong></td><td><strong>₹{totalInvestments.toLocaleString("en-IN")}</strong></td><td />{!isGuest && <td />}</tr>}</tbody></table>}

        {!isGuest && tab === 'Insurance' && <div className="fin-add-form"><input className="inp" placeholder="Policy name" value={insuranceForm.name} onChange={(event) => setInsuranceForm((current) => ({ ...current, name: event.target.value }))} /><input type="number" className="inp" placeholder="Premium ₹/mo" value={insuranceForm.premium} onChange={(event) => setInsuranceForm((current) => ({ ...current, premium: event.target.value }))} /><select className="inp" value={insuranceForm.type} onChange={(event) => setInsuranceForm((current) => ({ ...current, type: event.target.value }))}>{INS_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input className="inp" placeholder="Coverage (e.g. ₹1Cr)" value={insuranceForm.coverage} onChange={(event) => setInsuranceForm((current) => ({ ...current, coverage: event.target.value }))} /><input type="date" className="inp" value={insuranceForm.renewalDate} onChange={(event) => setInsuranceForm((current) => ({ ...current, renewalDate: event.target.value }))} title="Renewal Date" /><button className="btn-primary" onClick={async () => { if (!insuranceForm.name || !insuranceForm.premium) return; await addInsurance({ ...insuranceForm, premium: Number(insuranceForm.premium) }); setInsuranceForm({ name: "", premium: "", type: "Life", coverage: "", renewalDate: "" }); }}>Add</button></div>}
        {tab === 'Insurance' && <table className="fin-table"><thead><tr><th>Policy</th><th>Type</th><th>Premium/mo</th><th>Coverage</th><th>Renewal</th>{!isGuest && <th></th>}</tr></thead><tbody>{insurance.map((policy) => <tr key={policy.id}><td>{policy.name}</td><td><span className="cat-badge" style={{ background: "#f59e0b22", color: "#f59e0b" }}>{policy.type}</span></td><td>₹{Number(policy.premium).toLocaleString("en-IN")}</td><td>{policy.coverage || "—"}</td><td>{policy.renewalDate ? fmt(policy.renewalDate) : "—"}</td>{!isGuest && <td><button className="icon-btn" onClick={() => removeInsurance(policy.id)}>🗑</button></td>}</tr>)}{!insurance.length && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No policies added</td></tr>{insurance.length > 0 && <tr style={{ fontWeight: 700, background: "var(--surface2)" }}><td colSpan={2}><strong>Total Premium</strong></td><td><strong>₹{totalInsurance.toLocaleString("en-IN")}</strong></td><td colSpan={3} /></tr>}</tbody></table>}
      </>}
    </div>
  );
}
