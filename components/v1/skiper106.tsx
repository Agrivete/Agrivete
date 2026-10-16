'use client';

import { forwardRef, useRef, useState, useEffect, useCallback, type InputHTMLAttributes, type RefObject } from 'react';
import { motion, animate } from 'motion/react';

interface SmoothInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  spring?: { type: 'spring'; stiffness: number; damping: number; mass: number };
  passwordChar?: string;
  error?: boolean;
}

const defaultSpring = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.5 };
const defaultPasswordChar = '•';

function getCaretPosition(input: HTMLInputElement): number {
  return input.selectionStart ?? 0;
}

function getComputedFont(input: HTMLInputElement): string {
  const style = window.getComputedStyle(input);
  return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  (
    {
      className = '',
      spring: springConfig = defaultSpring,
      passwordChar = defaultPasswordChar,
      type = 'text',
      disabled,
      readOnly,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedby,
      error,
      ...props
    },
    forwardedRef
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const caretRef = useRef<HTMLSpanElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [caretPosition, setCaretPosition] = useState(0);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [animationFailed, setAnimationFailed] = useState(false);
    const isPassword = type === 'password';

    const combinedRef = useCallback((node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef && typeof forwardedRef === 'object' && node) {
        (forwardedRef as RefObject<HTMLInputElement>).current = node;
      }
    }, [forwardedRef]);

    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
      const input = inputRef.current;
      if (!input) return;

      const handleInput = () => {
        const pos = getCaretPosition(input);
        setCaretPosition(pos);
      };

      const handleSelectionChange = () => {
        if (document.activeElement === input) {
          setCaretPosition(getCaretPosition(input));
        }
      };

      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);

      input.addEventListener('input', handleInput);
      input.addEventListener('select', handleSelectionChange);
      input.addEventListener('keyup', handleSelectionChange);
      input.addEventListener('click', handleSelectionChange);
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);

      return () => {
        input.removeEventListener('input', handleInput);
        input.removeEventListener('select', handleSelectionChange);
        input.removeEventListener('keyup', handleSelectionChange);
        input.removeEventListener('click', handleSelectionChange);
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      };
    }, [isPassword, passwordChar]);

    const getCaretX = useCallback(() => {
      const input = inputRef.current;
      const canvas = canvasRef.current;
      if (!input || !canvas) return 0;

      const font = getComputedStyle(input);
      const paddingLeft = parseFloat(font.paddingLeft) || 0;
      const textBeforeCaret = isPassword
        ? passwordChar.repeat(caretPosition)
        : input.value.slice(0, caretPosition);

      const ctx = canvas.getContext('2d');
      if (!ctx) return paddingLeft;

      ctx.font = getComputedFont(input);
      const textWidth = ctx.measureText(textBeforeCaret).width;

      return paddingLeft + textWidth;
    }, [caretPosition, isPassword, passwordChar]);

    useEffect(() => {
      const caret = caretRef.current;
      if (!caret || prefersReducedMotion || animationFailed) return;

      const x = getCaretX();
      try {
        animate(caret, { x }, springConfig);
      } catch {
        setAnimationFailed(true);
      }
    }, [caretPosition, getCaretX, prefersReducedMotion, springConfig, animationFailed]);

    const inputClasses = `h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition 
      focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600 
      disabled:cursor-not-allowed disabled:bg-slate-50 caret-transparent
      ${error ? 'border-red-400' : 'border-slate-300'}
      ${className}`;

    return (
      <div className="relative w-full" style={{ fontFamily: 'var(--font-sans)' }}>
        <input
          ref={combinedRef}
          className={inputClasses}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          disabled={disabled}
          readOnly={readOnly}
          {...props}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            opacity: 0,
            width: '100%',
            height: '100%',
          }}
          aria-hidden="true"
        />
        {!animationFailed && (
          <motion.span
            ref={caretRef}
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '2px',
              height: '1.25rem',
              backgroundColor: 'var(--color-brand-700)',
              opacity: isFocused ? 1 : 0,
              pointerEvents: 'none',
              transition: 'opacity 150ms ease',
              zIndex: 10,
            }}
            animate={{ x: prefersReducedMotion || animationFailed ? getCaretX() : 0 }}
            initial={{ x: getCaretX() }}
            transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
          />
        )}
      </div>
    );
  }
);

SmoothInput.displayName = 'SmoothInput';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition caret-primary
            focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600 
            disabled:cursor-not-allowed disabled:bg-slate-50
            ${error ? 'border-red-400' : 'border-slate-300'}
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';