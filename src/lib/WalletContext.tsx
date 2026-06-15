"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { connectMetaMask, requestPermissionGrant, type PermissionGrant } from "@/lib/wallet";

interface WalletState {
  address: string | null;
  grant: PermissionGrant | null;
  connecting: boolean;
  granting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  requestGrant: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [grant, setGrant] = useState<PermissionGrant | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      setAddress(await connectMetaMask());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const requestGrant = useCallback(async () => {
    setGranting(true);
    setError(null);
    try {
      const next = await requestPermissionGrant();
      setGrant(next);
      setAddress(next.accountAddress);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Permission grant failed");
    } finally {
      setGranting(false);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, grant, connecting, granting, error, connect, requestGrant }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
}
