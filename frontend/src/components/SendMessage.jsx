import React, { useState } from "react";

const S = {
  card: {
    background: "rgba(13,26,39,0.8)",
    border: "1px solid rgba(10,240,216,0.12)",
    borderRadius: 16, padding: 24,
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: 16, fontWeight: 600, color: "#e8f4f0",
    marginBottom: 4, display: "flex", alignItems: "center", gap: 8,
  },
  sub: { fontSize: 13, color: "#4a7a70", marginBottom: 20 },
  label: { fontSize: 12, color: "#7fb3a8", marginBottom: 6, display: "block" },
  input: {
    width: "100%", padding: "10px 14px",
    background: "rgba(18,32,53,0.8)",
    border: "1px solid rgba(10,240,216,0.15)",
    borderRadius: 8, color: "#e8f4f0", fontSize: 14,
    marginBottom: 14,
    fontFamily: "'Space Mono', monospace",
  },
  row: { display: "flex", gap: 12, marginBottom: 14 },
  numInput: {
    flex: 1, padding: "10px 14px",
    background: "rgba(18,32,53,0.8)",
    border: "1px solid rgba(10,240,216,0.15)",
    borderRadius: 8, color: "#e8f4f0", fontSize: 14,
    fontFamily: "'Space Mono', monospace",
  },
  previewInput: {
    flex: 2, padding: "10px 14px",
    background: "rgba(18,32,53,0.8)",
    border: "1px solid rgba(10,240,216,0.15)",
    borderRadius: 8, color: "#e8f4f0", fontSize: 14,
  },
  hint: {
    fontSize: 12, color: "#4a7a70",
    background: "rgba(10,240,216,0.04)",
    border: "1px solid rgba(10,240,216,0.08)",
    borderRadius: 8, padding: "8px 12px", marginBottom: 16,
  },
  btn: {
    width: "100%", padding: "12px",
    background: "linear-gradient(135deg, #0af0d8, #05b8a4)",
    border: "none", borderRadius: 10,
    color: "#080f18", fontWeight: 700, fontSize: 15,
    cursor: "pointer",
  },
  btnDisabled: {
    width: "100%", padding: "12px",
    background: "rgba(10,240,216,0.15)",
    border: "none", borderRadius: 10,
    color: "#4a7a70", fontWeight: 700, fontSize: 15,
    cursor: "not-allowed",
  },
};

export default function SendMessage({ onSend, sending, cofheReady }) {
  const [recipient, setRecipient]       = useState("");
  const [secretValue, setSecretValue]   = useState("");
  const [preview, setPreview]           = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!recipient || !secretValue) return;
    onSend({
      recipient,
      secretValue: parseInt(secretValue),
      preview: preview || `Secret message`,
    });
    setRecipient("");
    setSecretValue("");
    setPreview("");
  }

  const canSend = cofheReady && recipient && secretValue && !sending;

  return (
    <div style={S.card}>
      <div style={S.title}>✉️ Send Private Message</div>
      <div style={S.sub}>Your secret value is encrypted before leaving your browser. Nobody can see it on-chain.</div>

      <div style={S.hint}>
        🔐 The <strong>Secret Value</strong> (a number) is encrypted using Fhenix CoFHE. Only the recipient can decrypt it.
        The <strong>Hint</strong> is public and visible to everyone.
      </div>

      <form onSubmit={handleSubmit}>
        <label style={S.label}>Recipient Address</label>
        <input
          style={S.input}
          placeholder="0x..."
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
        />

        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Secret Value (encrypted)</label>
            <input
              style={S.numInput}
              type="number"
              placeholder="e.g. 42"
              min="0"
              max="4294967295"
              value={secretValue}
              onChange={e => setSecretValue(e.target.value)}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Public Hint (visible to all)</label>
            <input
              style={S.previewInput}
              placeholder="e.g. Check this out!"
              value={preview}
              onChange={e => setPreview(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          style={canSend ? S.btn : S.btnDisabled}
          disabled={!canSend}
        >
          {sending ? "🔐 Encrypting & Sending..." : !cofheReady ? "⏳ FHE Initializing..." : "🔐 Encrypt & Send"}
        </button>
      </form>
    </div>
  );
}
