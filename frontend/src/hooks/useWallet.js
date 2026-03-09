import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { CHAIN_ID, RPC_URL } from "../utils/theme.js";

function formatCofheError(error, fallbackMessage) {
  if (!error) return fallbackMessage;

  const messages = [error.message, error.cause?.message].filter(Boolean);
  if (messages.length === 0) return fallbackMessage;

  return [...new Set(messages)].join(": ");
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isUserRejected(error) {
  const message = [error?.message, error?.cause?.message].filter(Boolean).join(" ");
  return error?.code === 4001 || /user rejected|user denied|rejected request|cancelled/i.test(message);
}

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cofheReady, setCofheReady] = useState(false);

  const signerRef = useRef(null);
  const cofhejsRef = useRef(null);
  const permitRef = useRef(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef(null);
  const initializedAccountRef = useRef(null);
  const initializedChainIdRef = useRef(null);

  const hasMetaMask =
    typeof window !== "undefined" && Boolean(window.ethereum);

  const resetWalletState = useCallback((full = false) => {
    signerRef.current = null;
    permitRef.current = null;
    initializedAccountRef.current = null;
    initializedChainIdRef.current = null;
    if (full) {
      cofhejsRef.current = null;
      initializedRef.current = false;
      initPromiseRef.current = null;
      setCofheReady(false);
    }
  }, []);

  const initCofhe = useCallback(async (signer) => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const [signerAddress, network] = await Promise.all([
      signer.getAddress(),
      provider.getNetwork(),
    ]);
    const currentChainId = Number(network.chainId);

    if (
      initializedRef.current &&
      cofhejsRef.current &&
      initializedAccountRef.current === signerAddress &&
      initializedChainIdRef.current === currentChainId
    ) {
      return cofhejsRef.current;
    }

    if (initPromiseRef.current) {
      await initPromiseRef.current;
      if (
        initializedRef.current &&
        cofhejsRef.current &&
        initializedAccountRef.current === signerAddress &&
        initializedChainIdRef.current === currentChainId
      ) {
        return cofhejsRef.current;
      }
    }

    initPromiseRef.current = (async () => {
      const { cofhejs } = await import("cofhejs/web");
      cofhejsRef.current = cofhejs;

      console.log("[wallet] initializing cofhejs...");

      const initResult = await cofhejs.initializeWithEthers({
        ethersProvider: provider,
        ethersSigner: signer,
        environment: "TESTNET",
        generatePermit: false,
      });

      console.log("[wallet] initResult:", initResult);

      if (initResult?.success === false) {
        throw new Error(
          `cofhejs init failed [${initResult?.error?.code}]: ${formatCofheError(
            initResult?.error,
            "Unknown initialization error"
          )}`
        );
      }

      initializedRef.current = true;
      initializedAccountRef.current = signerAddress;
      initializedChainIdRef.current = currentChainId;
      setCofheReady(true);
      console.log("[wallet] cofhejs READY");

      return cofhejs;
    })();

    try {
      await initPromiseRef.current;
      return cofhejsRef.current;
    } catch (e) {
      cofhejsRef.current = null;
      initializedRef.current = false;
      initializedAccountRef.current = null;
      initializedChainIdRef.current = null;
      setCofheReady(false);
      throw e;
    } finally {
      initPromiseRef.current = null;
    }
  }, []);

  const reconnect = useCallback(
    async (addr) => {
      if (!window.ethereum) return;

      setAddress(addr);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      const signer = await provider.getSigner();
      signerRef.current = signer;

      await initCofhe(signer);
    },
    [initCofhe]
  );

  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts[0]) {
          reconnect(accounts[0]).catch((e) => {
            console.error("[wallet] reconnect failed:", e);
            setError(e.message);
          });
        }
      })
      .catch(() => {});

    const onAccountsChanged = (accounts) => {
      if (accounts[0]) {
        resetWalletState(false);
        reconnect(accounts[0]).catch((e) => {
          console.error("[wallet] account change reconnect failed:", e);
          setError(e.message);
        });
      } else {
        setAddress(null);
        setChainId(null);
        resetWalletState(true);
      }
    };

    const onChainChanged = async (id) => {
      const nextChainId = parseInt(id, 16);
      setChainId(nextChainId);

      resetWalletState(true);
      setCofheReady(false);

      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts[0]) {
          try {
            await reconnect(accounts[0]);
          } catch (e) {
            console.error("[wallet] chain change reconnect failed:", e);
            setError(e.message);
          }
        }
      }
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [reconnect, resetWalletState]);

  const ensurePermit = useCallback(async () => {
    if (!signerRef.current) {
      throw new Error("wallet not connected");
    }

    if (!cofhejsRef.current || !initializedRef.current) {
      await initCofhe(signerRef.current);
    }

    const cofhejs = cofhejsRef.current;
    if (!cofhejs) {
      throw new Error("cofhejs not loaded");
    }

    const permitProvider =
      signerRef.current.provider || new ethers.BrowserProvider(window.ethereum);

    if (permitRef.current?.isValid?.().valid) {
      const domainValid = await permitRef.current
        .checkSignedDomainValid(permitProvider)
        .catch(() => false);

      if (domainValid) {
        return permitRef.current;
      }
    }

    const addr = await signerRef.current.getAddress();

    const existingPermit = cofhejs.getPermit?.();
    if (existingPermit?.success && existingPermit.data?.isValid?.().valid) {
      const domainValid = await existingPermit.data
        .checkSignedDomainValid(permitProvider)
        .catch(() => false);

      if (domainValid) {
        permitRef.current = existingPermit.data;
        return permitRef.current;
      }
    }

    const [{ Permit, SealingKey, permitStore }, naclModule] = await Promise.all([
      import("cofhejs/web"),
      import("tweetnacl"),
    ]);
    const nacl = naclModule.default || naclModule;
    const keyPair = nacl.box.keyPair();
    const network = await permitProvider.getNetwork();

    permitRef.current = new Permit({
      name: "FHE Messenger",
      type: "self",
      issuer: addr,
      expiration: 1000000000000,
      recipient: ethers.ZeroAddress,
      validatorId: 0,
      validatorContract: ethers.ZeroAddress,
      sealingPair: new SealingKey(
        bytesToHex(keyPair.secretKey),
        bytesToHex(keyPair.publicKey)
      ),
      issuerSignature: "0x",
      recipientSignature: "0x",
    });

    try {
      await permitRef.current.sign(signerRef.current);
    } catch (error) {
      permitRef.current = null;

      if (isUserRejected(error)) {
        throw new Error("Permit signature was cancelled");
      }

      throw error;
    }

    const chainKey = network.chainId.toString();
    permitStore.setPermit(chainKey, addr, permitRef.current);
    permitStore.setActivePermitHash(chainKey, addr, permitRef.current.getHash());

    return permitRef.current;
  }, [initCofhe]);

  const decryptCiphertext = useCallback(
    async (ctHash, utype) => {
      if (!signerRef.current) {
        throw new Error("wallet not connected");
      }

      await initCofhe(signerRef.current);
      await ensurePermit();

      const cofhejs = cofhejsRef.current;
      if (!cofhejs) {
        throw new Error("cofhejs not loaded");
      }

      const result = await cofhejs.decrypt(BigInt(ctHash), utype);
      if (!result?.success) {
        throw new Error(
          `Decrypt failed: ${formatCofheError(
            result?.error,
            "Unknown decryption error"
          )}`
        );
      }

      return result.data;
    },
    [ensurePermit, initCofhe]
  );

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not installed.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      await reconnect(accounts[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [reconnect]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    resetWalletState(true);
  }, [resetWalletState]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x66eee" }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x66eee",
              chainName: "Arbitrum Sepolia",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ["https://sepolia.arbiscan.io"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const encryptValue = useCallback(
    async (value) => {
      if (!signerRef.current) {
        throw new Error("wallet not connected");
      }

      await initCofhe(signerRef.current);

      const cofhejs = cofhejsRef.current;
      const { Encryptable } = await import("cofhejs/web");

      const result = await cofhejs.encrypt([
        Encryptable.uint32(BigInt(value)),
      ]);

      if (!result?.success) {
        throw new Error(
          "Encryption failed: " + JSON.stringify(result?.error || {})
        );
      }

      const enc = result.data[0];
      return [enc.ctHash, enc.securityZone, enc.utype, enc.signature];
    },
    [initCofhe]
  );

  return {
    address,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    chainId,
    loading,
    error,
    hasMetaMask,
    isConnected: Boolean(address),
    isCorrectNetwork: chainId === CHAIN_ID,
    cofheReady,
    cofhejs: cofhejsRef,
    signer: signerRef.current,
    connect,
    disconnect,
    switchNetwork,
    encryptValue,
    ensurePermit,
    decryptCiphertext,
  };
}
