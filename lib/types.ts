export type User = {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null; // nullable now: users can sign in by email, so the backend may have no phone yet
  role: string;
  profile_completed: boolean;
  state_code: string | null;
  mock_category_code: string | null;
  catalog_exam_code: string | null;
  target_country_code: string | null;
};

export type ProfilePayload = {
  full_name: string;
  phone: string; // E.164, e.g. "+919876543210"
  state_code: string;
  mock_category_code: string;
  catalog_exam_code: string;
  /** Required only when the chosen exam requires a country; null otherwise. */
  target_country_code: string | null;
};

/** A code/name option for a reference dropdown. */
export type RefItem = { code: string; name: string };

/** An Indian State or Union Territory. */
export type StateItem = RefItem & { kind: "state" | "ut" };

/** An exam within a mock category. `requires_country` drives the conditional Country field. */
export type CatalogExam = RefItem & {
  requires_country: boolean;
  default_country_code: string | null;
};

/**
 * The public exam catalog (GET /exams). Carries the marketing-facing copy the
 * cascade's CatalogExam omits — `description` and `total_duration_seconds` — so
 * the onboarding exam cards can join it by `code` for a subtitle and duration.
 */
export type ExamSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  language: string;
  total_duration_seconds: number | null;
  scoring_type: string;
};

// --- Exam stream -----------------------------------------------------------

export type StreamOut = {
  category_code: string;
  catalog_exam_code: string;
  catalog_exam_name: string;
  variant_code: string | null;
  target_country_code: string | null;
  source: string;
  selected_at: string;
};

export type StreamPayload = {
  catalog_exam_code: string;
  variant_code: string | null;
  target_country_code: string | null;
};

// --- Mock tests ------------------------------------------------------------

export type MockScope = "full" | "subject" | "chapter";

export type MockTest = {
  id: string;
  scope: MockScope;
  title: string;
  description: string | null;
  subject_code: string | null;
  subject_name: string | null;
  chapter_code: string | null;
  chapter_name: string | null;
  variant_code: string | null;
  duration_seconds: number;
  total_questions: number;
  difficulty: string | null;
  /** Kept in the model for later; every CTA is gated to the coming-soon modal for now. */
  is_playable: boolean;
};

export type SubjectGroup = {
  subject_code: string;
  subject_name: string;
  subject_mocks: MockTest[];
  chapter_mocks: MockTest[];
};

export type MockTestGroups = {
  category_code: string;
  catalog_exam_code: string;
  catalog_exam_name: string;
  full_mocks: MockTest[];
  sectional_mocks: MockTest[];
  subjects: SubjectGroup[];
};

// --- Dashboard -------------------------------------------------------------

export type DashboardSummary = {
  total_attempts: number;
  avg_score: number;
  best_score: number;
  avg_accuracy_pct: number;
  latest_percentile: number;
  first_accuracy_pct: number;
  improvement_pct: number;
  total_time_seconds: number;
};

export type AttemptListItem = {
  id: string;
  mock_title: string;
  catalog_exam_code: string;
  submitted_at: string;
  duration_seconds: number;
  total_questions: number;
  correct: number;
  score: number;
  max_score: number;
  percentile: number | null;
  accuracy_pct: number;
};

export type SkillStat = {
  skill_code: string;
  skill_name: string;
  attempts: number;
  avg_accuracy_pct: number;
  avg_time_ms: number;
};

export type AttemptSection = {
  section_name: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  accuracy_pct: number;
  avg_time_ms: number;
};

export type AttemptSkill = {
  skill_code: string;
  skill_name: string;
  total: number;
  correct: number;
  accuracy_pct: number;
  avg_time_ms: number;
};

/** How a question went, beyond right/wrong — drives the per-question colouring. */
export type ErrorType = "correct" | "careless" | "conceptual" | "guess" | "unattempted";

export type AttemptQuestion = {
  question_no: number;
  section_name: string;
  skill_code: string;
  kc_code: string | null;
  error_type: ErrorType;
  is_correct: boolean;
  time_spent_ms: number;
  difficulty: string | null;
  marked_for_review: boolean;
};

/** The qualitative insight attached to a single attempt. */
export type AttemptInsight = {
  headline: string;
  goal: string;
  current_status: string;
  gap_diagnosis: string;
  calibration_note: string;
  next_actions: string[];
  recommended_method: string;
  behavior_archetype: string;
  pacing_note: string;
  negative_marking_loss: number;
  guess_rate: number;
  calibration_gap: number;
  generated_by: string;
};

export type AttemptDetail = {
  attempt: AttemptListItem;
  sections: AttemptSection[];
  skills: AttemptSkill[];
  questions: AttemptQuestion[];
  insight: AttemptInsight | null;
};

// --- AI insight layer ------------------------------------------------------

export type StudyStep = { step: number; focus: string; action: string };

/** The dashboard headline story. Null when the user has no attempts yet. */
export type DashboardInsight = {
  stream_catalog_exam_code: string;
  summary: string;
  persistent_strengths: string[];
  persistent_gaps: string[];
  predicted_score: number;
  predicted_band_low: number;
  predicted_band_high: number;
  study_plan: StudyStep[];
  generated_by: string;
  created_at: string;
};

/** Concept-level mastery, weakest-first (ordered by gap_priority desc). */
export type ConceptMastery = {
  kc_code: string;
  kc_name: string;
  subject_name: string;
  p_mastery: number; // 0–1
  retention_probability: number; // 0–1
  gap_priority: number;
  careless_rate: number;
  conceptual_gap_score: number;
  n_opportunities: number;
};

export type ErrorDistribution = {
  correct: number;
  conceptual: number;
  careless: number;
  guess: number;
  unattempted: number;
};

/** Behavioural / test-strategy analytics. */
export type StrategyData = {
  attempts: number;
  error_distribution: ErrorDistribution;
  careless_share_pct: number;
  avg_guess_rate: number;
  total_negative_marking_loss: number;
  avg_calibration_gap: number;
  dominant_archetype: string;
  pacing_note: string;
};
