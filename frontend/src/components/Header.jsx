import React from "react";
import { NETWORK_NAME, EXPLORER } from "../utils/theme.js";

const S = {
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px", height: 64,
    borderBottom: "1px solid rgba(10,240,216,0.1)",
    background: "rgba(8,15,24,0.95)",
    backdropFilter: "blur(12px)",
    position: "sticky", top: 0, zIndex: 100,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
  },
  logoIcon: {
    width: 36, height: 36,
    background: "linear-gradient(135deg, #0af0d8, #7c5cbf)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  logoText: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 16, fontWeight: 700, color: "#e8f4f0",
    letterSpacing: "-0.5px",
  },
  logoSub: { fontSize: 11, color: "#4a7a70", marginTop: 1 },
  right: { display: "flex", alignItems: "center", gap: 12 },
  badge: {
    padding: "4px 10px", borderRadius: 20,
    background: "rgba(10,240,216,0.08)",
    border: "1px solid rgba(10,240,216,0.2)",
    fontSize: 11, color: "#0af0d8",
    fontFamily: "'Space Mono', monospace",
  },
  addrBtn: {
    padding: "6px 14px", borderRadius: 8,
    background: "rgba(10,240,216,0.06)",
    border: "1px solid rgba(10,240,216,0.15)",
    color: "#7fb3a8", fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    cursor: "pointer",
  },
  connectBtn: {
    padding: "8px 20px", borderRadius: 8,
    background: "linear-gradient(135deg, #0af0d8, #05b8a4)",
    color: "#080f18", fontSize: 14, fontWeight: 600,
    cursor: "pointer",
  },
  wrongNet: {
    padding: "6px 14px", borderRadius: 8,
    background: "rgba(240,80,80,0.1)",
    border: "1px solid rgba(240,80,80,0.3)",
    color: "#f05050", fontSize: 13, cursor: "pointer",
  },
};

export default function Header({ wallet }) {
  const { isConnected, shortAddress, isCorrectNetwork, cofheReady,
          connect, disconnect, switchNetwork, loading } = wallet;

  return (
    <header style={S.header}>
      <div style={S.logo}>
        <div style={S.logoIcon}>🔐</div>
        <div>
          <div style={S.logoText}>FHE Messenger</div>
          <div style={S.logoSub}>Private on-chain messaging · Fhenix CoFHE</div>
        </div>
      </div>
      <div style={S.right}>
        {isConnected && (
          <span style={S.badge}>
            {cofheReady ? "🟢 FHE Ready" : "🟡 FHE Init..."}
          </span>
        )}
        <span style={S.badge}>{NETWORK_NAME}</span>
        {!isConnected ? (
          <button style={S.connectBtn} onClick={connect} disabled={loading}>
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : !isCorrectNetwork ? (
          <button style={S.wrongNet} onClick={switchNetwork}>
            ⚠ Switch to Arbitrum Sepolia
          </button>
        ) : (
          <button style={S.addrBtn} onClick={disconnect} title="Click to disconnect">
            {shortAddress}
          </button>
        )}
      </div>
    </header>
  );
}
