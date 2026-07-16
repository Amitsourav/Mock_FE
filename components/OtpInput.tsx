"use client";

import { useEffect, useId, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent, ChangeEvent } from "react";

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  /** Fired once the 6th digit lands, from typing, pasting or SMS autofill. */
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Bumped by the parent on a wrong code — triggers the shake and refocuses box 1. */
  shakeKey?: number;
};

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  shakeKey = 0,
}: OtpInputProps) {
  const groupId = useId();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH).split("").slice(0, LENGTH);

  const focusBox = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    target?.focus();
    target?.select();
  };

  // Land the caret in box 1 on arrival, and again whenever the parent bumps
  // shakeKey after a wrong code — so both entering and retrying are just typing.
  // This is also what lets iOS offer the SMS code: autofill needs the focus.
  useEffect(() => {
    focusBox(0);
  }, [shakeKey]);

  const commit = (next: string) => {
    onChange(next);
    if (next.length === LENGTH) onComplete(next);
  };

  /**
   * One handler for typing, pasting and iOS autofill: they all arrive here as
   * input events. A multi-character value means it wasn't a keystroke, so we
   * spread it across the boxes from the current position.
   */
  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const incoming = event.target.value.replace(/\D/g, "");
    if (!incoming) return;

    if (incoming.length > 1) {
      const next = (value.slice(0, index) + incoming).slice(0, LENGTH);
      commit(next);
      focusBox(next.length >= LENGTH ? LENGTH - 1 : next.length);
      return;
    }

    const chars = value.padEnd(LENGTH).split("");
    chars[index] = incoming;
    const next = chars.join("").trimEnd();
    commit(next);
    if (index < LENGTH - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.padEnd(LENGTH).split("");
      if (chars[index]?.trim()) {
        // Filled box: clear it, stay put.
        chars[index] = " ";
        onChange(chars.join("").trimEnd());
      } else if (index > 0) {
        // Empty box: clear the one behind and step back.
        chars[index - 1] = " ";
        onChange(chars.join("").trimEnd());
        focusBox(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  // Explicit paste handling: some browsers don't surface a paste as an input
  // event when the box already holds a character.
  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const next = (value.slice(0, index) + pasted).slice(0, LENGTH);
    commit(next);
    focusBox(next.length >= LENGTH ? LENGTH - 1 : next.length);
  };

  return (
    <div
      role="group"
      aria-labelledby={groupId}
      key={shakeKey}
      className={`flex justify-between gap-2 ${shakeKey > 0 && invalid ? "animate-shake" : ""}`}
    >
      <span id={groupId} className="sr-only">
        Enter the 6-digit verification code
      </span>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={digits[index]?.trim() ?? ""}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          // Only box 1 claims the SMS code, so iOS doesn't offer autofill six times.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          className={`h-[56px] w-full min-w-0 rounded-[12px] border bg-surface-field text-center text-[22px] font-medium text-ink transition-[border-color] duration-200 ease-out focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 ${
            invalid ? "border-error" : "border-hairline"
          }`}
        />
      ))}
    </div>
  );
}
