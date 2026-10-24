'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface VercelIconMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  hasBadge?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}

interface VercelIconsMenuWithTooltipProps {
  items: VercelIconMenuItem[];
  className?: string;
}

export function VercelIconsMenuWithTooltip({
  items,
  className = '',
}: VercelIconsMenuWithTooltipProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={`relative inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 ${className}`}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isHovered = hoveredIndex === idx;

        return (
          <div key={item.id} className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={item.onClick}
              onMouseEnter={() => setHoveredIndex(idx)}
              onFocus={() => setHoveredIndex(idx)}
              onBlur={() => setHoveredIndex(null)}
              aria-label={item.label}
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {isHovered && (
                <motion.span
                  layoutId="skiper43-hover-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-brand-50 dark:bg-brand-950/70"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.hasBadge && (
                <span
                  className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                  aria-hidden="true"
                />
              )}
            </button>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <span>{item.label}</span>
                  {item.shortcut && item.shortcut.length > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      {item.shortcut.map((key) => (
                        <kbd
                          key={key}
                          className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-300"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export const Skiper43 = VercelIconsMenuWithTooltip;
export default VercelIconsMenuWithTooltip;

