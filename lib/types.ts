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
