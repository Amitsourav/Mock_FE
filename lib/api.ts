import { getAccessToken } from "./supabase";
import type {
  AttemptDetail,
  AttemptListItem,
  AttemptState,
  CatalogExam,
  ConceptMastery,
  DashboardInsight,
  DashboardSummary,
  ExamSummary,
  IntegrityEvent,
  MockTest,
  MockTestGroups,
  Paper,
  ProfilePayload,
  RefItem,
  SkillStat,
  StateItem,
  StrategyData,
  StreamOut,
  StreamPayload,
  User,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL. Copy .env.example to .env.local.");
}

/**
 * Thrown for any non-2xx response. `unauthorized` drives the route-back-to-start
 * branch; `code` carries the machine-readable reason from a structured 422
 * (e.g. "country_required") so a form can map it to the right field.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
  get unauthorized() {
    return this.status === 401;
  }
}

/**
 * Reads FastAPI's `detail`, which comes in three shapes:
 *  - a plain string,
 *  - the framework's validation-error array (`[{ msg }]`),
 *  - our structured object `{ code, message }` (e.g. 422 profile errors).
 * Returns a human message plus the code when the object form carries one.
 */
function readDetail(body: unknown): { message: string | null; code: string | null } {
  if (!body || typeof body !== "object") return { message: null, code: null };
  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === "string") return { message: detail, code: null };

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && typeof (item as { msg?: unknown }).msg === "string"
          ? (item as { msg: string }).msg
          : null
      )
      .filter((m): m is string => Boolean(m));
    return { message: messages.length ? messages.join(". ") : null, code: null };
  }

  if (detail && typeof detail === "object") {
    const obj = detail as { code?: unknown; message?: unknown };
    return {
      message: typeof obj.message === "string" ? obj.message : null,
      code: typeof obj.code === "string" ? obj.code : null,
    };
  }

  return { message: null, code: null };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    // Network-level failure: fetch rejects, so there is no status to report.
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const { message, code } = readDetail(body);
    if (response.status === 401) {
      throw new ApiError(401, "Your session has expired. Please sign in again.");
    }
    throw new ApiError(response.status, message ?? "Something went wrong. Please try again.", code);
  }

  return response.json() as Promise<T>;
}

export function getMe() {
  return request<User>("/me");
}

export function updateProfile(payload: ProfilePayload) {
  return request<User>("/me/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Reference data for the cascading profile form -------------------------

export function getStates() {
  return request<StateItem[]>("/reference/states");
}

export function getMockCategories() {
  return request<RefItem[]>("/reference/mock-categories");
}

/** The Exam dropdown, dependent on the chosen mock category. Unknown code → 404. */
export function getCategoryExams(categoryCode: string) {
  return request<CatalogExam[]>(
    `/reference/mock-categories/${encodeURIComponent(categoryCode)}/exams`
  );
}

export function getCountries() {
  return request<RefItem[]>("/reference/countries");
}

/**
 * The public exam catalog. Onboarding joins this by `code` onto the cascade's
 * exams to show a description and duration on each exam card — the cascade
 * endpoint returns neither.
 */
export function getExamCatalog() {
  return request<ExamSummary[]>("/exams");
}

// --- Exam stream -----------------------------------------------------------

/** The user's current stream, or null if none has been selected. */
export function getStream() {
  return request<StreamOut | null>("/me/stream");
}

/** Switch stream (append-only server-side). 422 → structured detail on bad input. */
export function switchStream(payload: StreamPayload) {
  return request<StreamOut>("/me/stream", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Mock tests ------------------------------------------------------------

/** Mocks for the current stream, pre-grouped. 409 {code:"no_stream"} if none selected. */
export function getMockTests() {
  return request<MockTestGroups>("/mock-tests");
}

export function getMockTest(id: string) {
  return request<MockTest>(`/mock-tests/${encodeURIComponent(id)}`);
}

// --- Dashboard -------------------------------------------------------------

export function getDashboardSummary() {
  return request<DashboardSummary>("/dashboard/summary");
}

/** Attempts oldest→newest, ready for the trend line. */
export function getAttempts() {
  return request<AttemptListItem[]>("/dashboard/attempts");
}

/** Skills weakest-first, for the radar / weakness list. */
export function getSkills() {
  return request<SkillStat[]>("/dashboard/skills");
}

export function getAttemptDetail(id: string) {
  return request<AttemptDetail>(`/dashboard/attempts/${encodeURIComponent(id)}`);
}

// --- AI insight layer ------------------------------------------------------

/** The headline story. Null when the user has no attempts yet. */
export function getInsight() {
  return request<DashboardInsight | null>("/dashboard/insight");
}

/** Concept mastery, weakest-first (already ordered by gap_priority). */
export function getConcepts() {
  return request<ConceptMastery[]>("/dashboard/concepts");
}

export function getStrategy() {
  return request<StrategyData>("/dashboard/strategy");
}

// --- Test player (attempt + paper) -----------------------------------------

/** Freeze a random 76-question paper. 409 {code:"attempt_already_active"} → resume instead. */
export function startAttempt(examinationId: string) {
  return request<AttemptState>(`/exams/${encodeURIComponent(examinationId)}/attempts`, {
    method: "POST",
  });
}

/** The user's in-progress attempt for this exam. Throws ApiError 404 {code:"no_active_attempt"}. */
export function getCurrentAttempt(examinationId: string) {
  return request<AttemptState>(
    `/exams/${encodeURIComponent(examinationId)}/attempts/current`
  );
}

/** The whole frozen paper — call after start/resume and on reload. Carries saved picks + remaining time. */
export function getPaper(attemptId: string) {
  return request<Paper>(`/attempts/${encodeURIComponent(attemptId)}/paper`);
}

/** Autosave one answer. 409 {code:"attempt_expired"} once the overall time is up. */
export function saveAnswer(
  attemptId: string,
  body: { question_id: string; selected_option_id: string; is_marked_for_review?: boolean }
) {
  return request<{ saved: boolean; attempt_id: string; question_id: string; answered_at: string }>(
    `/attempts/${encodeURIComponent(attemptId)}/answers`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/** Finalise the attempt. No scoring — returns a status message to show the user. */
export function submitAttempt(attemptId: string) {
  return request<{ status: string; message: string }>(
    `/attempts/${encodeURIComponent(attemptId)}/submit`,
    { method: "POST" }
  );
}

/** Log integrity events (focus/fullscreen). Batched; logged for review, not scored. */
export function postAttemptEvents(attemptId: string, events: IntegrityEvent[]) {
  return request<{ ok?: boolean }>(`/attempts/${encodeURIComponent(attemptId)}/events`, {
    method: "POST",
    body: JSON.stringify({ events }),
  });
}
