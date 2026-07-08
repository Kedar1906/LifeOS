export function Modal({ title, children, onClose, onSave }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 17px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "11px 17px", borderTop: "1px solid var(--border)" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
