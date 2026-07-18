import { Check, HelpCircle, Minus, Zap, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ErrorType } from "./types";

/**
 * The one definition of the five error types, shared by the strategy breakdown
 * and the per-question grid so their colours and labels never diverge.
 *
 * Each type carries a UNIQUE ICON as well as a colour. That icon is the
 * accessibility guarantee: the mandated red/amber/green triad is inherently hard
 * for red-green colour-vision deficiency (conceptual vs careless is the tight
 * pair), so identity must never rest on hue alone. Colour reinforces; the icon
 * and the always-present label carry the meaning. Colours are CSS variables so
 * light and dark are each hand-tuned (see globals.css --et-*).
 */
export type ErrorTypeMeta = {
  key: ErrorType;
  label: string;
  /** CSS variable holding the theme-aware colour. */
  cssVar: string;
  Icon: LucideIcon;
};

/** Display order for legends and the stacked breakdown. */
export const ERROR_TYPES: ErrorTypeMeta[] = [
  { key: "correct", label: "Correct", cssVar: "--et-correct", Icon: Check },
  { key: "careless", label: "Careless", cssVar: "--et-careless", Icon: Zap },
  { key: "conceptual", label: "Conceptual", cssVar: "--et-conceptual", Icon: X },
  { key: "guess", label: "Guess", cssVar: "--et-guess", Icon: HelpCircle },
  { key: "unattempted", label: "Unattempted", cssVar: "--et-unattempted", Icon: Minus },
];

export const ERROR_TYPE_BY_KEY: Record<ErrorType, ErrorTypeMeta> = Object.fromEntries(
  ERROR_TYPES.map((t) => [t.key, t])
) as Record<ErrorType, ErrorTypeMeta>;

/** `var(--et-careless)` etc., for inline SVG fills and style props. */
export function errorTypeColor(key: ErrorType): string {
  return `var(${ERROR_TYPE_BY_KEY[key].cssVar})`;
}
