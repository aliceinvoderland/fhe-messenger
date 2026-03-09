import { useState } from "react";
import { textToUint32 } from "../utils/theme.js";
import FhenixMark from "./FhenixMark.jsx";

export default function Compose({ wallet, txPending, onSend, onCancel }) {
  const [recipient, setRecipient] = useState("");
  const [rawInput,  setRawInput]  = useState("");
  const [err, setErr] = useState("");

  // Preview what value will actually be encrypted
  const previewValue = rawInput.trim()
    ? textToUint32(rawInput.trim())
    : null;

  function validate() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
      setErr("Invalid Ethereum address — must start with 0x and be 42 chars");
      return false;
    }
    if (recipient.toLowerCase() === wallet.address?.toLowerCase()) {
      setErr("You cannot send a message to yourself");
      return false;
    }
    if (!rawInput.trim()) {
      setErr("Please enter a value to send");
      return false;
    }
    setErr("");
    return true;
  }

  async function handleSend() {
    if (!validate()) return;
    const uint32Val = textToUint32(rawInput.trim());
    await onSend(recipient, uint32Val);
  }

  return (
    <div className="compose">
      <div className="pane-header">
        <div className="pane-header-copy">
          <span className="eyebrow">New Payload</span>
          <h2>Compose an encrypted message</h2>
          <p>Your value is sealed with cofhejs before the transaction is submitted.</p>
        </div>
        <div className="pane-logo">
          <FhenixMark className="pane-mark" />
        </div>
      </div>

      <div className="pane-body compose-grid">
        <div className="compose-main">
          <div className="field">
            <label className="field-label">Recipient Address</label>
            <input
              className="field-input"
              placeholder="0x..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />
            <span className="field-hint">The Ethereum address of the person you want to message.</span>
          </div>

          <div className="field">
            <label className="field-label">Secret Value</label>
            <input
              className="field-input"
              placeholder='e.g. 42 or "Hi!" (up to 4 chars)'
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
            />
            <span className="field-hint">
              Enter a number (0–4,294,967,295) <strong>or</strong> up to 4 text characters.
              Text is encoded as a number before encryption.
            </span>
          </div>

          {err && (
            <div className="field-error-box">
              <span className="field-err">⚠ {err}</span>
            </div>
          )}
        </div>

        <div className="compose-side">
          <div className="enc-box">
            <div className="enc-icon">FHE</div>
            <div>
              <div className="enc-label">Sealing Preview</div>
              <div className="enc-sub">
                {previewValue !== null
                  ? `"${rawInput.trim()}" -> uint32 ${previewValue} -> sealed before send`
                  : "Enter a value to preview the uint32 payload before encryption"}
              </div>
            </div>
          </div>

          <div className="steps">
            <div className="steps-title">Flow</div>
            {[
              "cofhejs encrypts the value in your browser",
              "Ciphertext is submitted to the messenger contract",
              "The recipient sees the sealed payload in their inbox",
              "Decrypt runs through CoFHE when the recipient opens it",
            ].map((s, i) => (
              <div className="step" key={i}>
                <div className="step-n">{i + 1}</div>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pane-footer">
        <span className="footer-note">From <span>{wallet.shortAddress}</span> · Arbitrum Sepolia</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={txPending}>Cancel</button>
          <button className="btn btn-green" onClick={handleSend} disabled={txPending || !recipient || !rawInput.trim()}>
            {txPending ? <><span className="spin" style={{ borderTopColor: "#000" }} /> Encrypting…</> : "🔐 Encrypt & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
