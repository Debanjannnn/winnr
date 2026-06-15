"use client";

import type { ReactElement } from "react";

export type WorkflowView = "markets" | "positions";

const NAV_ITEMS: {
  label: string;
  icon: (props: { className?: string }) => ReactElement;
  view: WorkflowView;
}[] = [
  { label: "Markets", icon: MarketLogo, view: "markets" },
  { label: "Positions", icon: PortfolioLogo, view: "positions" }
];

export function Sidebar({
  active = "markets",
  collapsed = false,
  onCollapsedChange,
  onNavigate
}: {
  active?: WorkflowView;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: (view: WorkflowView) => void;
}) {
  return (
    <aside
      className={`workflow-sidebar fixed left-0 top-0 z-20 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#17191d] bg-[#080b0c] font-sans transition-[width,padding] duration-200 xl:flex ${
        collapsed ? "w-[72px] px-[16px] py-[32px]" : "w-[176px] px-[16px] py-[32px]"
      }`}
    >
      <div className="flex items-center justify-center">
        <a href="#" aria-label="Home" className="shrink-0">
          <img
            src="/logo-winnr-png.png"
            alt="Winnr"
            className="sidebar-logo"
          />
        </a>
      </div>

      <nav className={`flex flex-col gap-[10px] ${collapsed ? "mt-[56px] items-center" : "mt-[56px]"}`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.view;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.view)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`flex h-[42px] items-center rounded-[8px] text-[13px] font-semibold transition-colors ${
                collapsed ? "w-[40px] justify-center px-0" : "w-full gap-[12px] px-[11px]"
              } ${
                isActive ? "bg-[#15161c] text-[#eeeaff]" : "text-[#747980] hover:text-[#f3f0ff]"
              }`}
            >
              <Icon className="h-[19px] w-[19px] shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        onClick={() => onCollapsedChange?.(!collapsed)}
        className={`grid h-[38px] place-items-center rounded-[8px] text-[#747980] transition hover:bg-[#12161b] hover:text-white ${
          collapsed ? "w-[40px]" : "w-full"
        }`}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>
    </aside>
  );
}


function MarketLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.5 15.5 9 11l3.2 3.2 7.3-7.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 6.5h4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PortfolioLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8.2h14v11.3H5V8.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 8.2V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5v1.7M5 12.3h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
