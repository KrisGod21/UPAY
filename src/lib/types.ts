export type UserRole = "admin" | "coordinator" | "teacher" | "volunteer" | "student";
export type LearningLevel = "foundation" | "level_1" | "level_2" | "level_3" | "bridge";
export type AttendanceStatus = "present" | "absent" | "late";
export type AttendanceMethod = "face" | "manual";
export type DeliveryStatus = "scheduled" | "delivered" | "skipped";
export type CertificateType = "participation" | "service_100" | "service_250" | "excellence";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  phone: string | null;
  zone_id: string | null;
  center_id: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  availability: string | null;
  joined_on: string | null;
  active: boolean;
  created_at: string;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  state: string;
  coordinator_id: string | null;
  created_at: string;
}

export interface Center {
  id: string;
  zone_id: string;
  name: string;
  code: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  started_on: string | null;
  active: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  center_id: string;
  full_name: string;
  student_code: string;
  dob: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  level: LearningLevel;
  photo_url: string | null;
  face_descriptor: number[] | null;
  enrolled_on: string;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface ClassSession {
  id: string;
  center_id: string;
  conducted_by: string | null;
  session_date: string;
  subject: string | null;
  curriculum_unit_id: string | null;
  lat: number | null;
  lng: number | null;
  faces_detected: number;
  auto_matched: number;
  notes: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  confidence: number | null;
  overridden: boolean;
  marked_by: string | null;
  created_at: string;
}

export interface VolunteerCheckin {
  id: string;
  volunteer_id: string;
  center_id: string;
  check_in_at: string;
  check_out_at: string | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  location_verified: boolean;
  hours: number;
  created_at: string;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  subject: string;
  level: LearningLevel;
  description: string | null;
  content_md: string | null;
  resource_url: string | null;
  duration_min: number;
  sequence_no: number;
  created_by: string | null;
  created_at: string;
}

export interface CenterCurriculum {
  id: string;
  center_id: string;
  unit_id: string;
  scheduled_for: string;
  status: DeliveryStatus;
  delivered_on: string | null;
  delivered_by: string | null;
}

export type QuestionType = "mcq" | "short" | "numeric";

export interface Question {
  n: number;
  type: QuestionType;
  prompt: string;
  options?: string[];
  marks: number;
}

export interface AnswerKeyEntry {
  n: number;
  answer: string;
  accept?: string[];
}

export interface Assessment {
  id: string;
  title: string;
  subject: string;
  level: LearningLevel;
  center_id: string | null;
  created_by: string | null;
  ai_generated: boolean;
  total_marks: number;
  questions: Question[];
  answer_key: AnswerKeyEntry[];
  created_at: string;
}

export interface GradedAnswer {
  n: number;
  read: string;
  expected: string;
  correct: boolean;
  marks: number;
  awarded: number;
}

export interface AssessmentResult {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  max_score: number;
  percentage: number;
  answers: GradedAnswer[];
  ocr_text: string | null;
  ai_feedback: string | null;
  graded_by_ai: boolean;
  verified_by: string | null;
  verified_at: string | null;
  taken_on: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  volunteer_id: string;
  cert_type: CertificateType;
  serial: string;
  hours: number;
  sessions_count: number;
  period_start: string | null;
  period_end: string | null;
  issued_on: string;
  created_at: string;
}

/** Chart instruction emitted by UpayGPT and rendered with Recharts. */
export interface ChartSpec {
  type: "bar" | "line" | "area" | "pie" | "none";
  x: string;
  y: string[];
  title?: string;
  stacked?: boolean;
}

export interface AiQuery {
  id: string;
  user_id: string | null;
  question: string;
  generated_sql: string | null;
  row_count: number | null;
  result_json: Record<string, unknown>[] | null;
  chart_spec: ChartSpec | null;
  answer: string | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}
