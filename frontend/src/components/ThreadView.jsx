import { useEffect, useState } from "react";
import { shortAddr, uint32ToText, EXPLORER } from "../utils/theme.js";
import FhenixMark from "./FhenixMark.jsx";

function fmt(ts) {
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleString();
}

export default function ThreadView({ message, wallet, onDecrypt, txPending }) {
  const [decResult, setDecResult] = useState(null);
  const [decLoading, setDecLoading] = useState(false);
  const [decError, setDecError] = useState(null);
  const [decPending, setDecPending] = useState(false);

  const isRecipient = message.recipient?.toLowerCase() === wallet.address?.toLowerCase();
  const isSender    = message.sender?.toLowerCase()    === wallet.address?.toLowerCase();
  const otherAddr   = isSender ? message.recipient : message.sender;
  const initials    = otherAddr ? otherAddr.slice(2, 4).toUpperCase() : "??";
  const bubbleBadge = isSender ? "YOU" : initials;

  useEffect(() => {
    setDecResult(message.revealed ? message.revealedValue : null);
    setDecLoading(false);
    setDecError(null);
    setDecPending(false);
  }, [message.id, message.revealed, message.revealedValue]);

  useEffect(() => {
    if (!decPending || decResult !== null) return undefined;

    let cancelled = false;

    const poll = async () => {
      const result = await onDecrypt(message.id, { pollOnly: true });
      if (cancelled) return;

      if (result.success) {
        setDecResult(result.value);
        setDecPending(false);
        setDecLoading(false);
      } else if (!result.pending) {
        setDecPending(false);
        setDecLoading(false);
        setDecError(result.error || "Decrypt failed");
      }
    };

    const intervalId = setInterval(poll, 2000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [decPending, decResult, message.id, onDecrypt]);

  async function handleDecrypt() {
    setDecLoading(true);
    setDecError(null);
    setDecPending(false);
    try {
      const result = await onDecrypt(message.id);
      if (result.success) {
        setDecResult(result.value);
      } else if (result.pending) {
        setDecPending(true);
      } else {
        setDecError(result.error || "Decryption failed");
      }
    } catch (e) {
      setDecError(e.message);
    } finally {
      setDecLoading(false);
    }
  }

  return (
    <div className="thread">
      <div className="thread-header">
        <div className="thread-avatar">{initials}</div>
        <div className="thread-info">
          <div className="thread-addr">{shortAddr(otherAddr)}</div>
          <div className="thread-sub">{isSender ? "You sent" : "Received"} · Message #{message.id}</div>
        </div>
        <div className="thread-tools">
          <div className="thread-seal">
            <FhenixMark className="thread-seal-mark" />
            <span>Sealed via CoFHE</span>
          </div>
          <a href={`${EXPLORER}/address/${message.recipient}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            Arbiscan ↗
          </a>
        </div>
      </div>

      <div className="thread-body">
        {/* Bubble */}
        <div className={`bubble-wrap ${isSender ? "out" : ""}`}>
          <div className="b-avatar">{bubbleBadge}</div>
          <div className="bubble">
            <div className="bubble-id">Message #{message.id}</div>
            {decResult === null ? (
              <div className="enc-pill">
                <span className="pill-dot" />
                <span className="enc-pill-text">
                  {decPending ? "Decrypt pending…" : "a3f9c…e81b"}
                </span>
              </div>
            ) : (
              <div className="dec-pill">
                <span className="pill-dot open" />
                <span className="dec-value">{uint32ToText(decResult)}</span>
              </div>
            )}
            <div className="bubble-meta">
              <span className="bubble-time">{fmt(message.timestamp)}</span>
              <span
                className={`status-chip ${
                  decResult !== null ? "dec" : decPending ? "enc" : "enc"
                }`}
              >
                {decResult !== null
                  ? "DECRYPTED"
                  : decPending
                    ? "PENDING"
                    : "ENCRYPTED"}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="info-box">
          <div className="info-box-title">Details</div>
          <div className="info-grid">
            {[["From", shortAddr(message.sender)], ["To", shortAddr(message.recipient)], ["Sent", fmt(message.timestamp)], ["Status", decResult !== null ? "Decrypted ✓" : "Encrypted 🔒"]].map(([l, v]) => (
              <div key={l}><div className="info-item-label">{l}</div><div className="info-item-val">{v}</div></div>
            ))}
          </div>
        </div>

        {/* Recipient decrypt via CoFHE request + status check */}
        {isRecipient && decResult === null && (
          <div className="action-box">
            <h4>🔓 Decrypt this message</h4>
            <p>
              Uses your signed permit for a direct CoFHE query decrypt first. If
              that path is unavailable, the app falls back to the slower on-chain
              request flow automatically.
            </p>
            {decError && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
                ⚠ {decError}
              </div>
            )}
            {decPending && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(10,240,216,0.08)", border: "1px solid rgba(10,240,216,0.18)", borderRadius: 8, fontSize: 12, color: "var(--accent)" }}>
                Decrypt request sent. CoFHE is still processing this message, and this view is checking automatically.
              </div>
            )}
            <div className="action-btns">
              <button className="btn btn-green" onClick={handleDecrypt} disabled={decLoading || decPending || txPending}>
                {decLoading
                  ? <><span className="spin" style={{ borderTopColor: "#000" }} /> Decrypting…</>
                  : decPending
                    ? "⏳ Waiting for CoFHE…"
                    : "🔓 Decrypt"}
              </button>
            </div>
          </div>
        )}

        {isRecipient && decResult !== null && (
          <div style={{ textAlign: "center", padding: 16, color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
            ✅ Decrypted successfully!
          </div>
        )}

        {isSender && !isRecipient && (
          <div className="info-box" style={{ fontSize: 13, color: "var(--text1)" }}>
            💡 Only <strong style={{ color: "var(--text0)" }}>{shortAddr(message.recipient)}</strong> can decrypt this message.
          </div>
        )}
      </div>
    </div>
  );
}
