import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { RPC_URL, CONTRACT_ADDRESS, CONTRACT_ABI } from "../utils/theme.js";

const GAS_PRICE_MULTIPLIER = 3n;
const GAS_LIMIT_MULTIPLIER = 14n;
const GAS_LIMIT_DIVISOR = 10n;
const SEND_MESSAGE_FALLBACK_GAS_LIMIT = 1_200_000n;
const REQUEST_DECRYPT_FALLBACK_GAS_LIMIT = 900_000n;
const SEND_MESSAGE_MAX_ATTEMPTS = 3;
const SEND_RETRY_DELAY_MS = 900;
const DECRYPT_POLL_ATTEMPTS = 30;
const DECRYPT_POLL_INITIAL_MS = 1_000;
const DECRYPT_POLL_MAX_MS = 4_000;
const UINT32_UTYPE = 4;

function getErrorMessage(error, fallback = "Unknown error") {
  const messages = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.cause?.shortMessage,
    error?.cause?.reason,
    error?.cause?.message,
  ].filter(Boolean);

  return messages.length > 0 ? [...new Set(messages)].join(": ") : fallback;
}

function isExecutionRevert(error) {
  const message = getErrorMessage(error, "").toLowerCase();

  return (
    error?.code === "CALL_EXCEPTION" ||
    error?.code === "UNPREDICTABLE_GAS_LIMIT" ||
    message.includes("execution reverted") ||
    message.includes("call exception") ||
    message.includes("missing revert data") ||
    message.includes("revert") ||
    message.includes("require(false)")
  );
}

async function getFeeOverrides(provider) {
  const feeData = await provider.getFeeData();

  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return {
      maxFeePerGas: feeData.maxFeePerGas * GAS_PRICE_MULTIPLIER,
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas * GAS_PRICE_MULTIPLIER,
    };
  }

  if (feeData.gasPrice) {
    return {
      gasPrice: feeData.gasPrice * GAS_PRICE_MULTIPLIER,
    };
  }

  throw new Error("Unable to determine gas price");
}

async function buildTxOverrides(
  provider,
  estimateFn,
  estimateArgs,
  fallbackGasLimit
) {
  const feeOverrides = await getFeeOverrides(provider);

  try {
    const estimatedGas = await estimateFn(...estimateArgs);
    return {
      ...feeOverrides,
      gasLimit: (estimatedGas * GAS_LIMIT_MULTIPLIER) / GAS_LIMIT_DIVISOR,
    };
  } catch (error) {
    if (isExecutionRevert(error)) {
      throw error;
    }

    console.warn("[tx] gas estimation failed, using fallback gas limit", error);
    return {
      ...feeOverrides,
      gasLimit: fallbackGasLimit,
    };
  }
}

function readContract() {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    new ethers.JsonRpcProvider(RPC_URL)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyDecryptedValue(messages, messageId, value) {
  return messages.map((message) =>
    message.id === Number(messageId)
      ? { ...message, revealed: true, revealedValue: value }
      : message
  );
}

function isUserRejected(error) {
  const message = [error?.message, error?.cause?.message].filter(Boolean).join(" ");
  return error?.code === 4001 || /user rejected|user denied|rejected request|cancelled/i.test(message);
}

export function useMessenger(wallet) {
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState(null);

  const markMessageDecrypted = useCallback((messageId, value) => {
    setInbox((current) => applyDecryptedValue(current, messageId, value));
    setOutbox((current) => applyDecryptedValue(current, messageId, value));
  }, []);

  const loadMessages = useCallback(async () => {
    if (!wallet.address) return;

    setLoading(true);

    try {
      const contract = readContract();

      const [inboxIds, outboxIds] = await Promise.all([
        contract.getInbox(wallet.address),
        contract.getOutbox(wallet.address),
      ]);

      const fetchMessage = async (id) => {
        const [sender, recipient, contentHandle, timestamp, revealedValue, revealed] =
          await contract.messages(id);

        return {
          id: Number(id),
          sender,
          recipient,
          contentHandle: contentHandle.toString(),
          timestamp: Number(timestamp),
          revealed,
          revealedValue: Number(revealedValue),
        };
      };

      const [inboxMessages, outboxMessages] = await Promise.all([
        Promise.all([...inboxIds].map(fetchMessage)),
        Promise.all([...outboxIds].map(fetchMessage)),
      ]);

      setInbox([...inboxMessages].reverse());
      setOutbox([...outboxMessages].reverse());
    } catch (e) {
      console.error("[messages] loadMessages error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.isConnected && wallet.isCorrectNetwork) {
      loadMessages();
    }
  }, [wallet.isConnected, wallet.isCorrectNetwork, wallet.address, loadMessages]);

  const sendMessage = useCallback(
    async (recipient, uint32Value) => {
      setTxPending(true);
      setError(null);

      try {
        if (!window.ethereum) {
          throw new Error("MetaMask not installed");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const normalizedRecipient = ethers.getAddress(recipient);

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );

        let lastError;

        for (let attempt = 1; attempt <= SEND_MESSAGE_MAX_ATTEMPTS; attempt += 1) {
          try {
            const encrypted = await wallet.encryptValue(uint32Value);
            const overrides = await buildTxOverrides(
              provider,
              contract.sendMessage.estimateGas,
              [normalizedRecipient, encrypted],
              SEND_MESSAGE_FALLBACK_GAS_LIMIT
            );

            const tx = await contract.sendMessage(
              normalizedRecipient,
              encrypted,
              overrides
            );
            await tx.wait();
            await loadMessages();

            return tx.hash;
          } catch (error) {
            lastError = error;

            if (isExecutionRevert(error) && attempt < SEND_MESSAGE_MAX_ATTEMPTS) {
              console.warn(
                `[send] attempt ${attempt} reverted, regenerating ciphertext and retrying`,
                error
              );
              await sleep(SEND_RETRY_DELAY_MS * attempt);
              continue;
            }

            break;
          }
        }

        throw lastError;
      } catch (e) {
        const message = isExecutionRevert(e)
          ? "Encrypted input was rejected by CoFHE. The app retried automatically, but this send still failed. Try sending again."
          : getErrorMessage(e, "Send failed");

        setError(message);
        throw new Error(message);
      } finally {
        setTxPending(false);
      }
    },
    [wallet, loadMessages]
  );

  const requestDecrypt = useCallback(async (messageId) => {
    setTxPending(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const numericMessageId = Number(messageId);
      const overrides = await buildTxOverrides(
        provider,
        contract.requestDecrypt.estimateGas,
        [numericMessageId],
        REQUEST_DECRYPT_FALLBACK_GAS_LIMIT
      );

      const tx = await contract.requestDecrypt(numericMessageId, overrides);
      await tx.wait();

      return tx.hash;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setTxPending(false);
    }
  }, []);

  const getSignerContract = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, []);

  const checkDecrypted = useCallback(
    async (messageId, existingContract) => {
      try {
        const contract = existingContract || await getSignerContract();

        const [value, ready] = await contract.getDecryptedContent(
          Number(messageId)
        );

        if (ready) {
          markMessageDecrypted(messageId, Number(value));
        }

        return {
          success: true,
          ready,
          value: Number(value),
        };
      } catch (e) {
        setError(e.message);
        return {
          success: false,
          ready: false,
          value: 0,
          error: e.message,
        };
      }
    },
    [markMessageDecrypted, getSignerContract]
  );

  const queryDecryptMessage = useCallback(
    async (messageId) => {
      if (typeof wallet.decryptCiphertext !== "function") {
        throw new Error("Direct decrypt is unavailable");
      }

      const numericMessageId = Number(messageId);
      const cachedMessage = [...inbox, ...outbox].find(
        (message) => message.id === numericMessageId
      );

      let contentHandle = cachedMessage?.contentHandle;

      if (!contentHandle) {
        const contract = readContract();
        const message = await contract.messages(numericMessageId);
        contentHandle = (message.content ?? message[2])?.toString();
      }

      if (!contentHandle) {
        throw new Error("Encrypted content handle not found");
      }

      const decryptedValue = await wallet.decryptCiphertext(
        contentHandle,
        UINT32_UTYPE
      );
      const numericValue = Number(decryptedValue);

      markMessageDecrypted(numericMessageId, numericValue);

      return {
        success: true,
        value: numericValue,
      };
    },
    [wallet.decryptCiphertext, inbox, outbox, markMessageDecrypted]
  );

  const decryptMessage = useCallback(
    async (messageId, options = {}) => {
      try {
        setError(null);
        const { pollOnly = false } = options;

        if (!wallet.isConnected) {
          throw new Error("Wallet not connected");
        }

        if (!wallet.isCorrectNetwork) {
          throw new Error("Wrong network");
        }

        try {
          return await queryDecryptMessage(messageId);
        } catch (directDecryptError) {
          if (isUserRejected(directDecryptError)) {
            throw directDecryptError;
          }

          console.warn(
            "[decrypt] direct query decrypt unavailable, falling back to tx request",
            directDecryptError
          );
        }

        const signerContract = await getSignerContract();
        const current = await checkDecrypted(messageId, signerContract);
        if (current.success && current.ready) {
          return {
            value: current.value,
            success: true,
          };
        }

        if (pollOnly) {
          return {
            value: 0,
            success: false,
            pending: true,
          };
        }

        await requestDecrypt(messageId);

        for (let attempt = 0; attempt < DECRYPT_POLL_ATTEMPTS; attempt += 1) {
          // Exponential backoff: 1s, 1.5s, 2s, 2.5s, 3s, ... capped at 4s
          const delay = Math.min(
            DECRYPT_POLL_INITIAL_MS + attempt * 500,
            DECRYPT_POLL_MAX_MS
          );
          await sleep(delay);

          const result = await checkDecrypted(messageId, signerContract);

          if (!result.success) {
            throw new Error(result.error || "Decrypt failed");
          }

          if (result.ready) {
            return {
              value: result.value,
              success: true,
            };
          }
        }

        return {
          value: 0,
          success: false,
          pending: true,
        };
      } catch (e) {
        console.error("[decrypt] ERROR object:", e);
        console.error("[decrypt] ERROR message:", e?.message);
        setError(e?.message || "Decrypt failed");

        return {
          value: 0,
          success: false,
          pending: false,
          error: e?.message || "Decrypt failed",
        };
      }
    },
    [
      wallet.isConnected,
      wallet.isCorrectNetwork,
      requestDecrypt,
      checkDecrypted,
      getSignerContract,
      queryDecryptMessage,
    ]
  );

  return {
    inbox,
    outbox,
    loading,
    txPending,
    error,
    sendMessage,
    requestDecrypt,
    checkDecrypted,
    decryptMessage,
    loadMessages,
    contractAddress: CONTRACT_ADDRESS,
  };
}
