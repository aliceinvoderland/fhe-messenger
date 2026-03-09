export default function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✗" : "i"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
