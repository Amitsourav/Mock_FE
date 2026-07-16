export type User = {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  address: string | null;
  target_country: string | null;
  target_examination_id: string | null;
  role: string;
  profile_completed: boolean;
};

export type Exam = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  language: string;
  total_duration_seconds: number;
  scoring_type: string;
};

export type ProfilePayload = {
  full_name: string;
  target_country: string;
  email: string | null;
  address: string | null;
  target_examination_id: string | null;
};
