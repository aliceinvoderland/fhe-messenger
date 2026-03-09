// Hardcoded deployed contract address (fallback if .env doesn't load)
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x355B66dFbC5aD61361c9a9eB9cdfB51FaaDb9605";

export const NETWORK_NAME = "Arbitrum Sepolia";
export const CHAIN_ID     = 421614;
export const RPC_URL      = "https://sepolia-rollup.arbitrum.io/rpc";
export const EXPLORER     = "https://sepolia.arbiscan.io";

// ABI matching deployed PrivateMessenger.sol exactly
export const CONTRACT_ABI = [
  "function sendMessage(address recipient, tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encContent) external",
  "function requestDecrypt(uint256 messageId) external",
  "function getDecryptedContent(uint256 messageId) external view returns (uint256 value, bool ready)",
  "function getInbox(address user) external view returns (uint256[])",
  "function getOutbox(address user) external view returns (uint256[])",
  "function messages(uint256 id) external view returns (address sender, address recipient, uint256 content, uint256 timestamp, uint256 revealedValue, bool revealed)",
  "function getMessage(uint256 id) external view returns (address sender, address recipient, uint256 timestamp, bool revealed, uint256 revealedValue)",
  "function messageCount() external view returns (uint256)",
  "event MessageSent(uint256 indexed id, address indexed sender, address indexed recipient, uint256 timestamp)",
  "event DecryptRequested(uint256 indexed id, address indexed recipient)",
];

export function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function timeAgo(ts) {
  const ms   = ts > 1e12 ? ts : ts * 1000;
  const diff = Date.now() - ms;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

export function textToUint32(text) {
  if (!isNaN(Number(text)) && text.trim() !== "") return Number(text) >>> 0;
  const clean = String(text).slice(0, 4);
  let num = 0;
  for (let i = 0; i < clean.length; i++) num = (num << 8) | (clean.charCodeAt(i) & 0xff);
  return num >>> 0;
}

export function uint32ToText(num) {
  if (!num && num !== 0) return "";
  const bytes = [];
  let n = num >>> 0;
  while (n > 0) { bytes.unshift(n & 0xff); n >>>= 8; }
  const str = bytes.map(b => String.fromCharCode(b)).join("").replace(/\0/g, "");
  return /^[\x20-\x7E]+$/.test(str) && str.length > 0 ? str + " (" + num + ")" : String(num);
}
