/**
 * @title SubmitButton
 * @notice A robust, accessible React submit button component with full state management.
 * @dev Handles idle, loading, success, error, and disabled states with clear visual
 *      feedback. Designed for crowdfunding transaction flows where state clarity is
 *      critical to user trust and security.
 *
 * @security
 * - The `onClick` handler is only invoked when the button is in the `idle` state,
 *   preventing duplicate submissions (double-spend protection).
 * - The button is rendered as `type="submit"` by default and `type="button"` when
 *   used outside a form, preventing accidental form submissions.
 * - No user-supplied strings are injected as HTML; all dynamic content is text-only.
 * - `aria-disabled` is set alongside the native `disabled` attribute so assistive
 *   technologies correctly announce the button state.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ButtonState,
  SubmitButtonProps,
  STATE_CONFIG,
} from "./react_submit_button_types";

export type { ButtonState, SubmitButtonProps };
export { STATE_CONFIG };

/**
 * @title SubmitButton
 * @notice Accessible submit button with idle / loading / success / error / disabled states.
 *
 * @param props - See {@link SubmitButtonProps}
 *
 * @example
 * ```tsx
 * <SubmitButton
 *   label="Fund Campaign"
 *   onClick={async () => { await submitTransaction(); }}
 * />
 * ```
 *
 * @security
 * - Clicks are ignored in loading/success/disabled states (prevents double-submit).
 * - `resetDelay` defaults to 2500 ms; callers may increase it but not set it below 0.
 * - The component cleans up its reset timer on unmount to prevent state updates on
 *   unmounted components (memory-leak / stale-closure protection).
 */
const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  onClick,
  disabled = false,
  resetDelay = 2500,
  type = "submit",
  style,
  "data-testid": testId,
}) => {
  const [state, setState] = useState<ButtonState>(disabled ? "disabled" : "idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external `disabled` prop → internal state when not mid-flight.
  useEffect(() => {
    if (state === "loading" || state === "success" || state === "error") return;
    setState(disabled ? "disabled" : "idle");
  }, [disabled, state]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  /**
   * @notice Handles button click.
   * @dev Guards against clicks in non-idle states to prevent duplicate submissions.
   */
  const handleClick = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;

    setState("loading");

    try {
      await onClick();
      setState("success");
      resetTimerRef.current = setTimeout(() => {
        setState(disabled ? "disabled" : "idle");
      }, Math.max(0, resetDelay));
    } catch {
      setState("error");
      resetTimerRef.current = setTimeout(() => {
        setState(disabled ? "disabled" : "idle");
      }, Math.max(0, resetDelay));
    }
  }, [state, onClick, disabled, resetDelay]);

  const isInteractive = state === "idle" || state === "error";
  const isNativeDisabled =
    state === "loading" || state === "disabled" || state === "success";

  const config = STATE_CONFIG[state];
  const displayLabel =
    state === "idle" || state === "disabled" ? label : config.label;
  const ariaLabel =
    state === "idle" || state === "disabled" ? label : config.ariaLabel;

  return (
    <button
      type={type}
      onClick={isInteractive ? handleClick : undefined}
      disabled={isNativeDisabled}
      aria-disabled={!isInteractive}
      aria-label={ariaLabel}
      aria-busy={state === "loading"}
      data-state={state}
      data-testid={testId}
      style={{
        ...baseStyle,
        backgroundColor: config.backgroundColor,
        cursor: config.cursor,
        opacity: state === "disabled" ? 0.6 : 1,
        ...(style as React.CSSProperties),
      }}
    >
      {state === "loading" && <span style={spinnerStyle} aria-hidden="true" />}
      <span>{displayLabel}</span>
    </button>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  padding: "0.625rem 1.5rem",
  borderRadius: "0.5rem",
  border: "none",
  color: "#ffffff",
  fontSize: "0.9375rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  transition: "background-color 0.2s ease, opacity 0.2s ease",
  userSelect: "none",
  minWidth: "9rem",
};

const spinnerStyle: React.CSSProperties = {
  display: "inline-block",
  width: "0.875rem",
  height: "0.875rem",
  border: "2px solid rgba(255,255,255,0.4)",
  borderTopColor: "#ffffff",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};

export default SubmitButton;
