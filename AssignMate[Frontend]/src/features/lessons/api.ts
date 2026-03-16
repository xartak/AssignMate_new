import { apiRequest, fetchAllPages } from "@/shared/api/base";
import type { Lesson, Homework } from "@/shared/api/types";

export function fetchLesson(courseId: string, lessonOrder: string) {
  return apiRequest<Lesson>(`/courses/${courseId}/lessons/${lessonOrder}/`);
}

export function fetchHomeworks(courseId: string, lessonOrder: string) {
  return fetchAllPages<Homework>(
    `/courses/${courseId}/lessons/${lessonOrder}/homeworks/`
  );
}
