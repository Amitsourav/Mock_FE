import {
  BookOpen,
  Briefcase,
  Cog,
  GraduationCap,
  Landmark,
  LineChart,
  type LucideIcon,
  Map,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";

export type CategoryTheme = { icon: LucideIcon; color: string };

/**
 * A category's icon + accent colour, resolved by keyword against the category
 * name *and its exams* (so "Competitive Exam for Further Study in India", whose
 * name has no clue, still resolves via JEE/NEET/CAT). Each theme has a distinct
 * hue so categories are told apart by colour, not just by reading. First match
 * wins; anything unknown falls back to a neutral slate target.
 *
 * The colours are used as decorative icon-tile accents, always beside the
 * category name — reinforcement, never the sole signal.
 */
const THEMES: { keywords: string[]; icon: LucideIcon; color: string }[] = [
  { keywords: ["engineer", "jee", "bitsat", "gate", "technical"], icon: Cog, color: "#4f46e5" },
  { keywords: ["medical", "neet", "aiims", "mbbs", "nurs", "pharma", "health"], icon: Stethoscope, color: "#e11d48" },
  { keywords: ["mba", "management", "cat", "xat", "snap", "nmat", "cmat"], icon: Briefcase, color: "#7c3aed" },
  { keywords: ["abroad", "gre", "gmat", "ielts", "toefl", "sat", "d-mat", "dmat", "duolingo"], icon: GraduationCap, color: "#0d9488" },
  { keywords: ["govern", "govt", "upsc", "ssc", "bank", "railway", "defence", "police", "civil", "job"], icon: Landmark, color: "#d97706" },
  { keywords: ["k6", "k12", "k-12", "class", "school", "cbse", "icse", "board"], icon: BookOpen, color: "#16a34a" },
];

const FALLBACK: CategoryTheme = { icon: Target, color: "#64748b" };

export function categoryTheme(
  category: { code: string; name: string },
  examNames: string[] = []
): CategoryTheme {
  const haystack = `${category.code} ${category.name} ${examNames.join(" ")}`.toLowerCase();
  for (const theme of THEMES) {
    if (theme.keywords.some((k) => haystack.includes(k))) {
      return { icon: theme.icon, color: theme.color };
    }
  }
  return FALLBACK;
}

/** Icon-only accessor (kept for the onboarding cards, which match on name alone). */
export function categoryIcon(category: { code: string; name: string }): LucideIcon {
  return categoryTheme(category).icon;
}

/** The four value props shown on the Step 1 desktop panel. */
export const ONBOARDING_BENEFITS: { icon: LucideIcon; label: string }[] = [
  { icon: Sparkles, label: "Personalized mock tests" },
  { icon: LineChart, label: "AI performance insights" },
  { icon: BookOpen, label: "Progress tracking" },
  { icon: Map, label: "Study roadmap" },
];
