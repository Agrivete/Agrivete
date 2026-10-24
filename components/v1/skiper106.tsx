'use client';

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export type SmoothInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(function SmoothInput(
  { className = '', type = 'text', value, onChange, onFocus, onBlur, onKeyUp, onClick, onSelect, ...props },
  forwardedRef
) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [caretIndex, setCaretIndex] = useState(0);
  const [caretX, setCaretX] = useState(0);

  const stringValue = value !== undefined && value !== null ? String(value) : '';
  const isPassword = type === 'password';
  // For password inputs, browsers render bullet masks ('•') instead of raw characters
  const displayBeforeCaret = isPassword
    ? '•'.repeat(caretIndex)
    : stringValue.slice(0, caretIndex);

  const syncCaret = () => {
    const el = innerRef.current;
    if (!el) return;
    try {
      const pos = el.selectionStart ?? stringValue.length;
      setCaretIndex(pos);
    } catch {
      // selectionStart is not supported on some input types (e.g., email in older browsers);
      // fall back to the end of the current string value.
      setCaretIndex(stringValue.length);
    }
  };

  useEffect(() => {
    syncCaret();
  }, [stringValue, type]);

  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    const input = innerRef.current;
    if (!mirror || !input) return;
    const measuredWidth = mirror.offsetWidth;
    const scrollLeft = input.scrollLeft || 0;
    const maxVisibleWidth = Math.max(0, input.clientWidth - 48);
    setCaretX(Math.min(Math.max(0, measuredWidth - scrollLeft), maxVisibleWidth));
  }, [displayBeforeCaret, focused, stringValue, type]);

  return (
    <div className="relative w-full">
      {/* Hidden mirror span used to compute exact pixel width of text/masked password up to caret */}
      <span
        ref={mirrorRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed top-0 left-0 whitespace-pre text-sm font-normal"
        style={{ fontFamily: 'var(--font-sans, inherit)' }}
      >
        {displayBeforeCaret}
      </span>

      <input
        {...props}
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        type={type}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          syncCaret();
        }}
        onFocus={(e) => {
          setFocused(true);
          syncCaret();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onKeyUp={(e) => {
          syncCaret();
          onKeyUp?.(e);
        }}
        onClick={(e) => {
          syncCaret();
          onClick?.(e);
        }}
        onSelect={(e) => {
          syncCaret();
          onSelect?.(e);
        }}
        style={{ caretColor: focused ? 'transparent' : undefined }}
        className={className}
      />

      {focused && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scaleY: 0.7 }}
          animate={{ opacity: 1, scaleY: 1, x: caretX }}
          transition={{
            x: { type: 'spring', stiffness: 520, damping: 34, mass: 0.4 },
            opacity: { duration: 0.12 },
          }}
          className="pointer-events-none absolute top-1/2 left-9 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-600 shadow-[0_0_8px_rgba(124,179,66,0.65)] dark:bg-brand-400"
        />
      )}
    </div>
  );
});

export const Skiper106 = SmoothInput;
export default SmoothInput;

