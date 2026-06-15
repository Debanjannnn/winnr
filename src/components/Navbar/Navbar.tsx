"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { shortAddress } from "@/lib/wallet";
import { useWallet } from "@/lib/WalletContext";

interface NavbarProps {
  showAgentPanel?: boolean;
  onBack?: (() => void) | undefined;
  onShowAgentPanelChange?: (shown: boolean) => void;
}

export function Navbar({ showAgentPanel = true, onBack, onShowAgentPanelChange }: NavbarProps = {}) {
  const { address, grant, connecting, granting, error, connect, requestGrant } = useWallet();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const grantLabel = granting ? "Granting..." : grant ? "Granted" : "Grant";
  const walletLabel = connecting ? "..." : address ? shortAddress(address) : "Connect";

  useEffect(() => {
    if (!settingsOpen && !notificationsOpen) return;
    const close = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [settingsOpen, notificationsOpen]);

  return (
    <header className="workflow-navbar relative flex h-[94px] items-start bg-[#080b0c] px-4 pt-[29px] font-sans lg:px-8 xl:px-[44px]">
      
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-[48%] bg-[radial-gradient(45%_90%_at_78%_0%,rgba(97,74,162,0.12),transparent_72%)]"
      />

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="relative flex h-[38px] items-center gap-[7px] rounded-[9px] border border-[#171b20] bg-[#0c1013] px-[14px] text-[14px] font-semibold text-[#cdd2da] transition hover:border-[#2b3038] hover:text-white"
        >
          <span className="text-[18px] leading-none">‹</span>
          Back
        </button>
      ) : null}

      <div className="relative ml-auto flex min-w-0 items-center gap-[13px]">
        <div className="hidden h-[38px] w-[430px] items-center rounded-[9px] border border-[#12161a] bg-[#070909] pl-[17px] pr-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_12px_28px_rgba(0,0,0,0.28)] lg:flex">
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#363b40]">Search...</span>
          <kbd className="grid h-[27px] w-[27px] place-items-center rounded-[6px] border border-[#15191f] bg-[#181b20] text-[15px] font-semibold leading-none text-[#babdc5] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            /
          </kbd>
        </div>

        {/* <IconButton label="Favorites">
          <StarIcon />
        </IconButton> */}
        <div ref={notificationsRef} className="relative">
          <IconButton
            label="Notifications"
            borderless
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setSettingsOpen(false);
            }}
          >
            <BellIcon />
          </IconButton>

          <AnimatePresence>
            {notificationsOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute right-0 top-[48px] z-30 w-[326px] pt-3"
              >
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0c1013]/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-[14px] py-[12px]">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#777f8b]">Notifications</div>
                      <div className="mt-[3px] text-[13px] leading-[18px] text-[#d6dae1]">Agent network activity</div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#777f8b]">
                      3
                    </span>
                  </div>
                  <div className="px-[14px] py-[24px] text-center">
                    <div className="text-[14px] text-[#f1f1f4]">No notifications</div>
                    <div className="mt-[5px] text-[12.5px] leading-snug text-[#7f8793]">
                      Agent updates will appear here.
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div ref={settingsRef} className="relative">
          <IconButton label="Settings" onClick={() => setSettingsOpen((open) => !open)}>
            <SettingsIcon />
          </IconButton>

          <AnimatePresence>
            {settingsOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute right-0 top-[48px] z-30 w-[310px] pt-3"
              >
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0c1013]/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <div className="border-b border-white/[0.06] px-[14px] py-[12px]">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#777f8b]">Settings</div>
                    <div className="mt-[3px] text-[13px] leading-[18px] text-[#d6dae1]">Choose how much agent context stays visible.</div>
                  </div>

                  <div className="p-2">
                    <label className="group flex cursor-pointer items-center gap-3 rounded-[14px] p-3 transition-colors duration-200 hover:bg-white/[0.045]">
                      {/* <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-white/[0.07] bg-white/[0.035] text-[#b9bdc6] transition-colors group-hover:text-white">
                        <SettingsIcon />
                      </span> */}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-[#f1f1f4]">Show AI panel</span>
                        <span className="mt-[3px] block text-[12.5px] leading-snug text-[#7f8793]">
                          Untick to use the fourth column for cards.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showAgentPanel}
                        onChange={(event) => onShowAgentPanelChange?.(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="relative h-[24px] w-[42px] shrink-0 rounded-full border border-[#242a34] bg-[#12161b] transition-colors peer-checked:border-[#5b5870] peer-checked:bg-[#282636]">
                        <motion.span
                          className="absolute left-[3px] top-[3px] h-[16px] w-[16px] rounded-full"
                          animate={{
                            x: showAgentPanel ? 18 : 0,
                            backgroundColor: showAgentPanel ? "#843cf5" : "#87909c"
                          }}
                          transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
                        />
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          onClick={requestGrant}
          disabled={granting}
          title={error ?? undefined}
          whileHover={{ y: granting ? 0 : -1 }}
          whileTap={{ scale: granting ? 1 : 0.985 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="hidden h-[38px] min-w-[128px] items-center justify-center gap-[9px] rounded-[8px] border border-[#5b5870] bg-[linear-gradient(180deg,#282636,#1b1c25)] text-[14px] font-bold text-[#f2eefc] shadow-[0_0_0_1px_rgba(122,88,198,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:border-[#766ca2] hover:bg-[linear-gradient(180deg,#322d45,#20212b)] disabled:opacity-70 sm:flex"
        >
          {grantLabel}
          <DownArrowIcon />
        </motion.button>

        <motion.button
          type="button"
          onClick={connect}
          disabled={connecting}
          title={error ?? undefined}
          whileHover={{ y: connecting ? 0 : -1 }}
          whileTap={{ scale: connecting ? 1 : 0.985 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="hidden h-[38px] min-w-[92px] items-center justify-center gap-[8px] rounded-[9px] border border-[#14181d] bg-[#080a0b] px-[7px] text-[15px] font-bold text-[#eeeeef] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#262b32] disabled:opacity-70 sm:flex"
        >
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full border border-[#232831] bg-[#171a1f] text-[#b7bbc3]">
            <WalletIcon />
          </span>
          {walletLabel}
        </motion.button>
      </div>

      {error ? (
        <div
          role="alert"
          className="absolute right-4 top-[60px] z-40 max-w-[420px] rounded-[10px] border border-[#7a2f33] bg-[#1c1012] px-[14px] py-[10px] text-[12.5px] leading-snug text-[#f4d4d6] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
        >
          {error}
        </div>
      ) : null}
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
  borderless
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  borderless?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 460, damping: 32 }}
      className={`grid h-[38px] w-[38px] place-items-center rounded-[8px] bg-[#090b0d] text-[#b9bdc6] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:text-white ${
        borderless ? "" : "border border-[#11151a] hover:border-[#262b33]"
      }`}
    >
      {children}
    </motion.button>
  );
}

function SettingsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.85 2.8h2.3l.42 1.82c.43.14.84.31 1.22.52l1.58-.99 1.62 1.62-.99 1.58c.21.38.38.79.52 1.22l1.82.42v2.3l-1.82.42c-.14.43-.31.84-.52 1.22l.99 1.58-1.62 1.62-1.58-.99c-.38.21-.79.38-1.22.52l-.42 1.82h-2.3l-.42-1.82a6.3 6.3 0 0 1-1.22-.52l-1.58.99-1.62-1.62.99-1.58a6.3 6.3 0 0 1-.52-1.22l-1.82-.42v-2.3l1.82-.42c.14-.43.31-.84.52-1.22l-.99-1.58 1.62-1.62 1.58.99c.38-.21.79-.38 1.22-.52l.42-1.82Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10.15" r="2.45" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="m10 2.8 2.1 4.26 4.7.68-3.4 3.31.8 4.68L10 13.52 5.8 15.73l.8-4.68-3.4-3.31 4.7-.68L10 2.8Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3.1a4.15 4.15 0 0 0-4.15 4.15c0 4.1-1.7 5.45-1.7 5.45h11.7s-1.7-1.35-1.7-5.45A4.15 4.15 0 0 0 10 3.1Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path d="M8.45 15.2a1.7 1.7 0 0 0 3.1 0" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function DownArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#969ba6]" aria-hidden>
      <path d="M8 3v9M4.25 8.25 8 12l3.75-3.75" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="5" width="14" height="10" rx="2.4" stroke="currentColor" strokeWidth="1.35" />
      <path d="M13.4 10h2" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}
