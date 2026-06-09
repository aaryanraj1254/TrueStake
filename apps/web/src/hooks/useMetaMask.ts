import { BrowserProvider, formatEther } from "ethers";
import { useCallback, useEffect, useState } from "react";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const STORAGE_KEY = "truestake:wallet";

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  // (5) ethers v6 BrowserProvider for balance reads.
  const refreshBalance = useCallback(async (addr: string) => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(addr);
      setBalance(Number(formatEther(bal)).toFixed(4));
    } catch {
      setBalance(null);
    }
  }, []);

  // Single place to apply an account change + (1) persist to localStorage.
  const applyAccount = useCallback(
    (addr: string | null) => {
      if (addr) {
        setAddress(addr);
        localStorage.setItem(STORAGE_KEY, addr);
        void refreshBalance(addr);
      } else {
        setAddress(null);
        setBalance(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [refreshBalance],
  );

  // (2) Connect with loading state + (3) error handling.
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected — install it to connect.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      applyAccount(accounts[0] ?? null);
      const cid = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
    } catch (e) {
      // 4001 = user rejected the request in the MetaMask popup.
      const code = (e as { code?: number })?.code;
      if (code === 4001) setError("Connection request rejected.");
      else setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setConnecting(false);
    }
  }, [applyAccount]);

  // Clears our local state (MetaMask has no programmatic disconnect).
  const disconnect = useCallback(() => applyAccount(null), [applyAccount]);

  // (1) Restore on page load — silently check eth_accounts (no popup) if we
  // previously connected. If the user revoked access, clear the saved address.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth || !localStorage.getItem(STORAGE_KEY)) return;
    eth
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const account = (accs as string[])[0];
        if (account) {
          applyAccount(account);
          eth.request({ method: "eth_chainId" }).then((c) => setChainId(c as string)).catch(() => {});
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {});
  }, [applyAccount]);

  // (4) React to account + chain changes from the wallet itself.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    const onAccountsChanged = (accounts: string[]) => applyAccount(accounts[0] ?? null);
    const onChainChanged = (cid: string) => {
      setChainId(cid);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) void refreshBalance(saved);
    };
    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged);
      eth.removeListener("chainChanged", onChainChanged);
    };
  }, [applyAccount, refreshBalance]);

  // Auto-dismiss errors after 4s so they behave like a transient toast.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return { address, short, balance, chainId, connect, disconnect, connecting, error, hasMetaMask };
}
