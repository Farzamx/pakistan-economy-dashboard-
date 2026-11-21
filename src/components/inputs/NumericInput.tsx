"use client";

// The one numeric input every PEIC tool uses. Visually it is the bare <input> the tools already styled (pass className / id / placeholder / aria-* as before),
// so each tool keeps its own prefix ("Rs"), suffix ("%") and layout. What it changes is the typing behaviour: see lib/numericInput.ts for why the old
// type="number" + `value={x === 0 ? "" : x}` pattern could not accept 0, 0.5 or a cleared field.
//
//   value / onValueChange   the number the tool holds (0 = "not entered", as the tools already treat it) and how it is told about a new one
//   min / max               bounds applied to the number the tool receives (the text stays as typed until the field loses focus)
//   integer                 whole numbers only
//   emptyBehavior="keep"    for fields that always need a value (years): emptying the box tells the tool nothing and the last value returns on blur
import { useState, type FocusEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { arrowState, blurState, initialState, isOutOfRange, syncState, typeInto, type NumericRules } from "@/lib/numericInput";

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step" | "inputMode">;

export interface NumericInputProps extends NativeProps, NumericRules {
  value: number;
  onValueChange: (value: number) => void;
  step?: number;
}

export default function NumericInput({ value, onValueChange, min, max, step = 1, integer, allowNegative, emptyValue, emptyBehavior, maxDecimals, showZero, onBlur, onKeyDown, ...rest }: NumericInputProps) {
  const rules: NumericRules = { min, max, integer, allowNegative, emptyValue, emptyBehavior, maxDecimals, showZero };
  const [state, setState] = useState(() => initialState(value, rules));
  // The tool changed the value on its own (reset, profile sync...): adopt it unless the text already means that value. (Adjusting state while rendering is React's documented pattern for this.)
  const synced = syncState(state, value, rules);
  if (synced !== state) setState(synced);
  const draft = synced.draft;

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      spellCheck={false}
      value={draft}
      aria-invalid={isOutOfRange(draft, rules) || undefined}
      onChange={(e) => {
        const r = typeInto(synced, e.target.value, value, rules);
        setState(r.state);
        if (r.commit !== undefined) onValueChange(r.commit);
      }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => {
        setState(blurState(synced, value, rules));
        onBlur?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const r = arrowState(synced, value, e.key === "ArrowUp" ? 1 : -1, step, rules);
          setState(r.state);
          if (r.commit !== undefined) onValueChange(r.commit);
        }
        onKeyDown?.(e);
      }}
    />
  );
}
