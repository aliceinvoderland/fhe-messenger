# 🔐 FHE Messenger

Private on-chain messaging powered by CoFHE (Fully Homomorphic Encryption).

Send encrypted numbers/codes to any Ethereum address. Only the recipient can decrypt — the message content is never visible on-chain in plaintext.

## Architecture

```
fhe-messenger/
├── contracts/
│   └── PrivateMessenger.sol   ← Solidity contract using CoFHE
├── tasks/
│   └── deploy-messenger.js   ← Hardhat deploy task
├── scripts/                  ← (optional interaction scripts)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/
│   │   │   ├── useWallet.js      ← MetaMask + cofhejs init
│   │   │   └── useMessenger.js   ← Contract interactions
│   │   └── components/
│   │       ├── Compose.jsx       ← Send encrypted message
│   │       ├── ThreadView.jsx    ← View & decrypt messages
│   │       └── Toast.jsx
│   └── package.json
├── hardhat.config.js
└── package.json
```

## Setup

### 1. Install dependencies

```bash
# Root (Hardhat)
npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment

```bash
# Root .env
cp .env.example .env
# Add your PRIVATE_KEY (with leading 0x)
```

### 3. Deploy contract

```bash
npx hardhat deploy-messenger --network arb-sepolia
```

This automatically updates `frontend/.env` with the contract address.

### 4. Run frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## How It Works

1. **Sender** enters a recipient address and a secret number
2. **cofhejs** encrypts the number in the browser using FHE
3. Encrypted value sent to `PrivateMessenger.sol` via `sendMessage()`
4. **CoFHE coprocessor** stores the encrypted value on-chain
5. **Recipient** connects their wallet and clicks "Request Decrypt"
6. CoFHE coprocessor decrypts and returns value only to the recipient

## Contract

- Network: Arbitrum Sepolia (Chain ID: 421614)
- CoFHE contracts: `@fhenixprotocol/cofhe-contracts`
- cofhejs: `^0.3.1`

## Key Technical Notes

- `FHE.asEuint32(plaintext)` is DISABLED on testnet — only `FHE.asEuint32(InEuint32)` works
- All encryption must happen client-side via cofhejs before sending to contract
- `cofhejs.initializeWithEthers` requires `ethersProvider` + `ethersSigner` (not `provider`/`signer`)
- Use `verifierUrl: false` to avoid CORS issues in browser
- Pass encrypted value as tuple: `[ctHash, securityZone, utype, signature]`
