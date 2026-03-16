export type AssignmentType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "FILL_BLANK"
  | "SHORT_ANSWER"
  | "LONG_ANSWER";

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  SINGLE_CHOICE: "Выбор одного",
  MULTIPLE_CHOICE: "Выбор нескольких",
  FILL_BLANK: "Вставить пропущенное",
  SHORT_ANSWER: "Краткий ответ",
  LONG_ANSWER: "Развернутый ответ",
};

export function getAssignmentTypeLabel(type: AssignmentType | string): string {
  if (type in ASSIGNMENT_TYPE_LABELS) {
    return ASSIGNMENT_TYPE_LABELS[type as AssignmentType];
  }
  return String(type);
}

export type QuestionOption = {
  id: number;
  text: string;
  is_correct?: boolean;
};

export type SingleChoiceDetails = {
  shuffle_options: boolean;
  options: QuestionOption[];
};

export type MultipleChoiceDetails = {
  shuffle_options: boolean;
  options: QuestionOption[];
};

export type FillBlankDetails = {
  text_template: string;
  blanks: { position: number; correct_text: string }[];
};

export type ShortAnswerDetails = {
  max_length: number;
  case_sensitive: boolean;
};

export type LongAnswerDetails = {
  max_files: number;
};

export type AssignmentDetails =
  | SingleChoiceDetails
  | MultipleChoiceDetails
  | FillBlankDetails
  | ShortAnswerDetails
  | LongAnswerDetails
  | null;

export type HomeworkResponse = {
  id: number;
  order: number;
  title: string;
  description: string;
  type: AssignmentType;
  max_score: number;
  deadline: string | null;
  details: AssignmentDetails;
};

export type SubmissionReviewStatus = "PENDING" | "REVISION" | "GRADED";
export type SubmissionTimelinessStatus = "ON_TIME" | "LATE";

export type ReviewInfo = {
  id: number;
  reviewer: number;
  score: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type SubmissionResponse = {
  id: number;
  assignment: number;
  assignment_type: AssignmentType;
  student_name: string;
  status: SubmissionReviewStatus;
  timeliness_status: SubmissionTimelinessStatus;
  review: ReviewInfo | null;
  details: unknown;
  created_at: string;
  updated_at: string;
};
