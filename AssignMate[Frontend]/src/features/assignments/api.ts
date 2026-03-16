import { apiRequest, apiUpload, fetchAllPages } from "@/shared/api/base";
import type { HomeworkResponse, SubmissionResponse, AssignmentType } from "@/features/assignments/types";

export function fetchHomework(courseId: string, lessonOrder: string, homeworkOrder: string) {
  return apiRequest<HomeworkResponse>(
    `/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homeworkOrder}/`
  );
}

export function createHomework(
  courseId: string,
  lessonOrder: string,
  payload: {
    title: string;
    description: string;
    type: AssignmentType;
    max_score: number;
    deadline?: string | null;
    details: Record<string, unknown>;
  }
) {
  return apiRequest<HomeworkResponse>(
    `/courses/${courseId}/lessons/${lessonOrder}/homeworks/`,
    {
      method: "POST",
      json: payload,
    }
  );
}

export type SubmissionPayload =
  | { selected_option: number }
  | { selected_options: number[] }
  | { answers: { position: number; answer_text: string }[] }
  | { answer_text: string }
  | { answer_text: string; files?: File[] };

export function submitHomework(
  courseId: string,
  lessonOrder: string,
  homeworkOrder: string,
  type: AssignmentType,
  payload: SubmissionPayload
) {
  const path = `/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homeworkOrder}/submissions/`;

  if (type === "LONG_ANSWER") {
    const form = new FormData();
    if ("answer_text" in payload) {
      form.append("answer_text", payload.answer_text);
    }
    if ("files" in payload && payload.files) {
      payload.files.forEach((file) => form.append("files", file));
    }
    return apiUpload<SubmissionResponse>(path, form);
  }

  return apiRequest<SubmissionResponse>(path, {
    method: "POST",
    json: payload,
  });
}

export function fetchSubmissions(
  courseId: string,
  lessonOrder: string,
  homeworkOrder: string
) {
  return fetchAllPages<SubmissionResponse>(
    `/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homeworkOrder}/submissions/`
  );
}

export function reviewSubmission(
  courseId: string,
  lessonOrder: string,
  homeworkOrder: string,
  submissionId: number,
  payload: { score?: number; comment?: string; return_for_revision?: boolean }
) {
  return apiRequest<SubmissionResponse>(
    `/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homeworkOrder}/submissions/${submissionId}/review/`,
    {
      method: "POST",
      json: payload,
    }
  );
}
