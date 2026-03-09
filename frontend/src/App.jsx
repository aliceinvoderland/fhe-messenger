import { useState, useCallback } from "react";
import { useWallet }    from "./hooks/useWallet.js";
import { useMessenger } from "./hooks/useMessenger.js";
import Compose          from "./components/Compose.jsx";
import ThreadView       from "./components/ThreadView.jsx";
import Toast            from "./components/Toast.jsx";
import FhenixMark       from "./components/FhenixMark.jsx";
import { shortAddr, timeAgo, CONTRACT_ADDRESS } from "./utils/theme.js";

export default function App() {
  const wallet    = useWallet();
  const messenger = useMessenger(wallet);
  const [tab,      setTab]      = useState("inbox");
  const [selected, setSelected] = useState(null);
  const [compose,  setCompose]  = useState(false);
  const [toasts,   setToasts]   = useState([]);

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const messages = tab === "inbox" ? messenger.inbox : messenger.outbox;
  const selMsg   = selected !== null
    ? [...messenger.inbox, ...messenger.outbox].find(m => m.id === selected)
    : null;

  async function handleSend(recipient, uint32Value) {
    try {
      const hash = await messenger.sendMessage(recipient, uint32Value);
      toast(`Sent! TX: ${hash.slice(0, 12)}…`, "success");
      setCompose(false);
    } catch (e) {
      toast(e.message?.slice(0, 90) || "Send failed", "error");
    }
  }

  const contractShort = CONTRACT_ADDRESS.slice(0, 14) + "…";

  return (
    <div className="root">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo-box">
            <FhenixMark className="brand-mark" />
          </div>
          <div className="brand-copy">
            <span className="logo-text">FHE Messenger</span>
            <span className="logo-sub">Encrypted payloads on Fhenix CoFHE</span>
          </div>
          <span className="badge">CoFHE</span>
        </div>
        <div className="topbar-right">
          <span className="net-badge">Arbitrum Sepolia</span>
          {wallet.isConnected && (
            <span className={`ready-badge ${wallet.cofheReady ? "on" : ""}`}>
              {wallet.cofheReady ? "FHE ready" : "Initializing"}
            </span>
          )}
          {wallet.isConnected ? (
            <>
              <span className="addr-chip">{wallet.shortAddress}</span>
              <button className="btn btn-ghost btn-sm" onClick={wallet.disconnect}>Disconnect</button>
            </>
          ) : (
            <button className="btn btn-green btn-sm" onClick={wallet.connect} disabled={wallet.loading}>
              {wallet.loading ? <span className="spin" /> : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="body">

        {/* Sidebar */}
        {wallet.isConnected && wallet.isCorrectNetwork && (
          <aside className="sidebar">
            <div className="sidebar-hero">
              <div className="sidebar-hero-copy">
                <span className="sidebar-label">Encrypted Inbox</span>
                <h2>Private notes with public settlement.</h2>
                <p>
                  Seal values in the browser, commit them on Arbitrum Sepolia,
                  and reveal them only to the intended wallet.
                </p>
              </div>
              <div className="sidebar-hero-mark">
                <FhenixMark className="sidebar-logo" />
              </div>
            </div>
            <div className="stats-strip">
              <div className="stat-block">
                <span className="stat-label">Inbox</span>
                <strong>{messenger.inbox.length}</strong>
              </div>
              <div className="stat-block">
                <span className="stat-label">Sent</span>
                <strong>{messenger.outbox.length}</strong>
              </div>
              <div className="stat-block">
                <span className="stat-label">Contract</span>
                <strong>{CONTRACT_ADDRESS.slice(0, 8)}…</strong>
              </div>
            </div>
            <div className="sidebar-top">
              <span className="sidebar-top-label">Messages</span>
              <button className="btn btn-green btn-sm" onClick={() => { setCompose(true); setSelected(null); }}>
                + New
              </button>
            </div>
            <div className="tabs">
              <div className={`tab ${tab === "inbox"  ? "on" : ""}`} onClick={() => setTab("inbox")}>
                Inbox {messenger.inbox.length  > 0 ? `(${messenger.inbox.length})`  : ""}
              </div>
              <div className={`tab ${tab === "outbox" ? "on" : ""}`} onClick={() => setTab("outbox")}>
                Sent {messenger.outbox.length > 0 ? `(${messenger.outbox.length})` : ""}
              </div>
            </div>
            <div className="msg-list">
              {messenger.loading && <div className="empty">Loading…</div>}
              {!messenger.loading && messages.length === 0 && (
                <div className="empty">
                  {tab === "inbox"
                    ? "No messages yet.\nWhen someone sends you an encrypted message it appears here."
                    : "No sent messages yet.\nCompose a new message to get started."}
                </div>
              )}
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`msg-row ${selected === m.id ? "selected" : ""}`}
                  onClick={() => { setSelected(m.id); setCompose(false); }}
                >
                  <div className="msg-row-top">
                    <span className="msg-row-addr">
                      {tab === "inbox" ? shortAddr(m.sender) : shortAddr(m.recipient)}
                    </span>
                    <span className="msg-row-time">{timeAgo(m.timestamp)}</span>
                  </div>
                  <div className="msg-row-preview">
                    <span className={`preview-dot ${m.revealed ? "revealed" : ""}`} />
                    <span>{m.revealed ? `Value: ${m.revealedValue}` : "Sealed payload"}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="main">
          {!wallet.isConnected && (
            <div className="center-screen">
              <div className="connect-card">
                <div className="connect-hero">
                  <div className="connect-icon">
                    <FhenixMark className="connect-mark" />
                  </div>
                  <div className="connect-copy">
                    <span className="eyebrow">Fhenix CoFHE</span>
                    <h1>Encrypted messages, locally sealed.</h1>
                    <p>
                      Send private uint32 values on-chain. Payloads are encrypted
                      in the browser, settled publicly, and decrypted only by the
                      recipient.
                    </p>
                  </div>
                </div>
                <div className="features">
                  {["Encrypted in-browser before submission","Only the recipient can decrypt","Stored on Arbitrum Sepolia","Backed by Fhenix CoFHE execution"].map((f, i) => (
                    <div className="feat" key={i}><div className="feat-dot" />{f}</div>
                  ))}
                </div>
                <button className="btn btn-green" style={{ width: "100%", padding: "12px" }} onClick={wallet.connect} disabled={wallet.loading}>
                  {wallet.loading ? <><span className="spin" /> Connecting…</> : "Connect MetaMask"}
                </button>
                {wallet.error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 10 }}>{wallet.error}</p>}
              </div>
            </div>
          )}

          {wallet.isConnected && !wallet.isCorrectNetwork && (
            <div className="wrong-net">
              <div className="wrong-net-mark">
                <FhenixMark className="wrong-net-logo" />
              </div>
              <h3>Wrong Network</h3>
              <p>Switch to Arbitrum Sepolia (Chain ID 421614)</p>
              <button className="btn btn-green" onClick={wallet.switchNetwork}>Switch Network</button>
            </div>
          )}

          {wallet.isConnected && wallet.isCorrectNetwork && compose && (
            <Compose wallet={wallet} txPending={messenger.txPending} onSend={handleSend} onCancel={() => setCompose(false)} />
          )}

          {wallet.isConnected && wallet.isCorrectNetwork && !compose && selMsg && (
            <ThreadView key={selMsg.id} message={selMsg} wallet={wallet} onDecrypt={messenger.decryptMessage} txPending={messenger.txPending} />
          )}

          {wallet.isConnected && wallet.isCorrectNetwork && !compose && !selMsg && (
            <div className="welcome">
              <div className="welcome-card">
                <div className="big">
                  <FhenixMark className="welcome-logo" />
                </div>
                <span className="eyebrow">Private Inbox</span>
                <h3>Pick a thread or ship a fresh sealed payload.</h3>
                <p>Select a message from the left or compose a new encrypted value for another wallet.</p>
                <div className="welcome-stats">
                  <div className="welcome-stat">
                    <span>Inbox</span>
                    <strong>{messenger.inbox.length}</strong>
                  </div>
                  <div className="welcome-stat">
                    <span>Sent</span>
                    <strong>{messenger.outbox.length}</strong>
                  </div>
                  <div className="welcome-stat">
                    <span>Contract</span>
                    <strong>{contractShort}</strong>
                  </div>
                </div>
                <button className="btn btn-green welcome-btn" onClick={() => setCompose(true)}>Compose Message</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Status bar ── */}
      {wallet.isConnected && (
        <footer className="statusbar">
          <div className="dot" />
          <span>{wallet.shortAddress}</span>
          <span>·</span>
          <span>CoFHE {wallet.cofheReady ? "ready" : "initializing…"}</span>
          <span>·</span>
          <span>{contractShort}</span>
          <span className="refresh-btn" onClick={messenger.loadMessages}>↻ Refresh</span>
        </footer>
      )}

      <div className="made-by">
        <div className="made-by-copy">
          <span className="eyebrow">Made By</span>
          <strong>@anshika_eth_</strong>
          <a
            href="https://x.com/anshika_eth_?s=21"
            target="_blank"
            rel="noreferrer"
            className="made-by-link"
          >
            x.com/anshika_eth_
          </a>
        </div>
        <a
          href="https://x.com/anshika_eth_?s=21"
          target="_blank"
          rel="noreferrer"
          className="btn btn-green made-by-btn"
        >
          Follow on X
        </a>
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}
