"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORIES, SORT_OPTIONS } from "./data";
import { RefreshIcon, SlidersIcon } from "./icons";

interface FilterRowProps {
  category: string;
  onCategoryChange: (slug: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function FilterRow({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  onRefresh,
  refreshing
}: FilterRowProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex h-[50px] items-center gap-[12px] rounded-[10px] border border-[#14181c] bg-[#090d0e] px-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="relative shrink-0">
        <FilterButton label="Sort markets" onClick={() => setSortOpen((open) => !open)}>
          <SlidersIcon />
        </FilterButton>
        <AnimatePresence>
        {sortOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute left-0 top-[42px] z-20 w-[168px] rounded-[8px] border border-[#1b2027] bg-[#0c1013] p-[5px] shadow-[0_18px_36px_rgba(0,0,0,0.4)]"
            >
              {SORT_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSortChange(option.value);
                    setSortOpen(false);
                  }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  className={`flex w-full items-center justify-between rounded-[6px] px-[10px] py-[7px] text-[13px] transition ${
                    sort === option.value ? "bg-[#1b1f27] text-white" : "text-[#aeb4be] hover:text-white"
                  }`}
                >
                  {option.label}
                  {sort === option.value ? <span>✓</span> : null}
                </motion.button>
              ))}
            </motion.div>
          </>
        ) : null}
        </AnimatePresence>
      </div>

      <FilterButton label="Refresh markets" onClick={onRefresh}>
        <span className={refreshing ? "animate-spin" : undefined}>
          <RefreshIcon />
        </span>
      </FilterButton>

      <div className="relative ml-[36px] flex min-w-0 flex-1 items-center justify-between gap-[12px] overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => {
          const active = category === cat.slug;
          return (
            <motion.button
              key={cat.slug || "all"}
              type="button"
              onClick={() => onCategoryChange(cat.slug)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
              className={`relative flex h-[50px] shrink-0 items-center whitespace-nowrap text-[12px] font-semibold leading-none transition ${
                active ? "text-[#f4f0ff]" : "text-[#9a9da5] hover:text-white"
              }`}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId="active-category-underline"
                  className="absolute bottom-0 left-0 h-[2px] w-full bg-[#b052ff]"
                />
              ) : null}
              {cat.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function FilterButton({
  children,
  label,
  onClick
}: {
  children: React.ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 460, damping: 32 }}
      className="grid h-[36px] w-[45px] shrink-0 place-items-center rounded-[8px] border border-[#171b20] bg-[#101317] text-[#b5bac3] transition hover:border-[#2b3038] hover:text-white"
    >
      {children}
    </motion.button>
  );
}
