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
  /** True for the launchable dMAT full mock; other mocks still gate to coming-soon. */
  is_playable: boolean;
  /** Non-null only when is_playable — the exam to start an attempt against. */
  examination_id: string | null;
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

/**
 * One option as it appears in a REVIEW (a submitted, scored attempt). Unlike
 * `PaperOption` this carries `is_correct` — the answer key is only ever exposed
 * after submission, never from the live paper.
 */
export type ReviewOption = {
  id: string;
  label: string | null;
  content_md: string;
  position: number;
  is_correct: boolean;
};

/**
 * A single question re-opened from a finished attempt: the paper content, the
 * answer key, and what the student actually did. Fetched lazily per question —
 * option images arrive as base64 data URIs, so 76 of these in one payload would
 * be far heavier than the attempt report needs.
 *
 * 🔴 Backend: `GET /dashboard/attempts/{id}/questions/{question_no}`. The UI
 * degrades to the metadata it already has from `AttemptQuestion` when this 404s,
 * so shipping the frontend ahead of the endpoint is safe.
 */
export type AttemptQuestionReview = {
  question_no: number;
  section_name: string;
  skill_name: string | null;
  kc_code: string | null;
  kc_name: string | null;
  difficulty: string | null;
  question_type: string;
  content_md: string;
  stimulus_md: string | null;
  options: ReviewOption[];
  /** Null when the question was left unattempted. */
  selected_option_id: string | null;
  /** Redundant with `options[].is_correct`; either source is accepted. */
  correct_option_id: string | null;
  error_type: ErrorType;
  is_correct: boolean;
  time_spent_ms: number;
  marked_for_review: boolean;
  /** Authored/AI worked solution. Rendered only when present. */
  explanation_md?: string | null;
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

// --- Leaderboard ------------------------------------------------------------

export type LeaderboardEntry = {
  rank: number;
  display_name: string; // already display-safe (first name + initial)
  value: number;
  is_me: boolean;
  /** Rank movement vs the previous period (+2 = climbed two places). Optional —
   *  backend contract extension; the UI hides arrows when absent. */
  delta_rank?: number | null;
};

export type LeaderboardOut = {
  scope: string; // "stream"
  metric: string; // e.g. "best_score"
  stream_code?: string | null;
  /** Optional contract extension: which period this board covers. */
  timeframe?: "week" | "all";
  entries: LeaderboardEntry[]; // top-10, sorted
  /** Optional contract extension: the ranks immediately around the student,
   *  for when they sit outside the visible top-10. */
  around_me?: LeaderboardEntry[];
  me: {
    rank: number | null;
    value: number | null;
    total_participants: number;
    /** Optional contract extension: my rank movement vs the previous period. */
    delta_rank?: number | null;
  };
};

// --- Share links ------------------------------------------------------------

export type SharePayload = {
  scope: "dashboard" | "attempt" | "leaderboard";
  attempt_id?: string;
};

export type ShareLinkOut = { token: string; url: string; expires_at: string | null };

/** The frozen dashboard snapshot served publicly by GET /share/{token}. */
export type SharedDashboardSnapshot = {
  scope: "dashboard";
  shared_by: string;
  generated_at: string;
  summary: DashboardSummary;
  insight: DashboardInsight | null;
  skills: SkillStat[];
  concepts: ConceptMastery[];
  strategy: StrategyData | null;
  attempts: AttemptListItem[];
};

/** The frozen single-attempt snapshot. `attempt` is the attempt-detail shape. */
export type SharedAttemptSnapshot = {
  scope: "attempt";
  shared_by: string;
  generated_at: string;
  attempt: AttemptDetail;
};

/** The frozen leaderboard snapshot — `is_me` in it marks the SHARER's rows. */
export type SharedLeaderboardSnapshot = {
  scope: "leaderboard";
  shared_by: string;
  generated_at: string;
  leaderboard: LeaderboardOut;
};

export type SharedReport =
  | SharedDashboardSnapshot
  | SharedAttemptSnapshot
  | SharedLeaderboardSnapshot;

// --- College predictor (dMAT → German Master's readiness) -------------------

/** Anabin recognition status: "H+" recognized · "H+/-" case-by-case · "H-" not recognized. */
export type AnabinInstitution = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  institution_type: string | null;
  status: string;
};

/** The three UG fields that trigger the dMAT requirement. Anything else → 422. */
export type DmatField = "engineering" | "commerce_finance_economics" | "business_management";

export type AcademicsPayload = {
  ug_percentage?: number | null;
  twelfth_percentage?: number | null;
  dmat_field?: DmatField | null;
};

export type PredictionEligibility = {
  institution_id: string;
  institution_name: string;
  status: string;
  recognized: boolean;
  meaning: string;
};

export type CollegeReadiness =
  | "strong"
  | "target"
  | "reach"
  | "low"
  | "eligibility_risk"
  | "unknown";

/** "Show the working" — every sub-score behind the readiness number. */
export type PredictionBreakdown = {
  ug_percentage?: number | null;
  german_grade?: number | null;
  academic_score?: number | null;
  dmat_percentile?: number | null;
  dmat_score?: number | null;
  twelfth_percentage?: number | null;
  twelfth_score?: number | null;
  competitiveness?: number | null;
  eligibility_multiplier?: number | null;
  readiness_score?: number | null;
};

export type CollegePrediction = {
  applicable: boolean;
  eligibility: PredictionEligibility | null;
  dmat: { percentile: number; band: string; best_score: number } | null;
  readiness: CollegeReadiness;
  readiness_note: string;
  readiness_score: number | null;
  breakdown: PredictionBreakdown | null;
  missing_inputs: string[];
  /** The MAIN admission story: dMAT = APS entry ticket to all public
   *  universities in the field from Summer 2027. Render prominently. */
  dmat_admission_note: string;
  /** Still returned by the backend but UNUSED by the UI — the ticket now shows
   *  real public universities from /dashboard/target-programs instead. */
  universities_scoring_dmat: { name: string; program: string; note: string }[];
  disclaimer: string;
};

export type TargetProgram = {
  name: string;
  university: string;
  city: string | null;
  languages: string[];
  subject: string | null;
  tuition: string | null;
  duration: string | null;
  application_deadline: string | null;
  link: string | null;
  /** "open" = zulassungsfrei · "restricted" = NC/selective · null = unknown →
   *  render NOTHING (the data source is gated; most values are null for now). */
  admission_mode?: "open" | "restricted" | null;
  /** Application-list bucket. safe = Fallback · target = Moderate · reach = Aim.
   *  Eligibility is already baked in server-side (only recognized H+ degrees get "safe"). */
  tier?: "safe" | "target" | "reach" | null;
};

export type TargetProgramsOut = {
  applicable: boolean;
  eligibility: PredictionEligibility | null;
  /** The student's dMAT field (defaults server-side to their saved one); null → prompt to pick. */
  field: { key: DmatField; label: string } | null;
  /** Always true — private universities are filtered out server-side. */
  public_only: boolean;
  /** Admission-mode counts over the whole matched set. Show the headline only
   *  when open + restricted > 0 — never render "0 open · 0 restricted". */
  admission_summary?: { open: number; restricted: number; unknown: number };
  /** Counts for the 3 buckets over the whole matched set. */
  tier_summary: { safe: number; target: number; reach: number };
  total_matched: number;
  programs: TargetProgram[];
  note: string;
};

// --- Test player (attempt + paper) -----------------------------------------

export type AttemptState = {
  id: string;
  examination_id: string;
  status: string;
  expires_at: string | null;
};

export type PaperOption = {
  id: string;
  label: string | null;
  content_md: string;
  position: number;
};

export type PaperQuestion = {
  id: string;
  section_code: string;
  section_name: string;
  position: number; // 1..total, already in exam order
  question_type: string;
  content_md: string;
  stimulus_md: string | null; // shared passage (General Academic items)
  options: PaperOption[];
  selected_option_id: string | null; // saved pick, for resume
  is_marked_for_review: boolean;
};

export type PaperSection = { code: string; name: string; count: number };

/** Integrity signals logged during an attempt (server keeps the durable record). */
export type IntegrityEventType =
  | "focus_lost"
  | "focus_regained"
  | "fullscreen_exit"
  | "fullscreen_enter";

export type IntegrityEvent = { event_type: IntegrityEventType; client_occurred_at: string };

/** The full frozen paper. NO correct-answer fields are ever present. */
export type Paper = {
  attempt_id: string;
  exam_code: string;
  status: string;
  expires_at: string | null;
  server_time: string;
  remaining_seconds: number;
  total_questions: number;
  sections: PaperSection[];
  questions: PaperQuestion[];
};

// --- Dates & News (backend ingestion) --------------------------------------

/** A schedule milestone. `date` is ISO yyyy-mm-dd, or null for undated ones. */
export type ImportantDate = {
  label: string;
  date: string | null;
  /** Human form to render, e.g. "15 Sep 2026" or "Summer 2027". */
  display: string;
};

export type NewsCategory =
  | "aps"
  | "dmat"
  | "visa"
  | "exams"
  | "scholarships"
  | "deadlines"
  | "general";

export type NewsItem = {
  id: string;
  source_name: string;
  /** Null for items scraped from prose (no page of their own). */
  url: string | null;
  title: string;
  summary: string | null;
  category: NewsCategory;
  published_at: string;
};
