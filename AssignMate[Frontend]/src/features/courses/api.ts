import { apiRequest, apiUpload, fetchAllPages } from "@/shared/api/base";
import type { Course, Lesson } from "@/shared/api/types";

export function fetchCourses() {
  return fetchAllPages<Course>("/courses/");
}

export function fetchMyCourses() {
  return fetchAllPages<Course>("/courses/my/");
}

export function fetchCourse(courseId: string) {
  return apiRequest<Course>(`/courses/${courseId}/`);
}

export function fetchLessons(courseId: string) {
  return fetchAllPages<Lesson>(`/courses/${courseId}/lessons/`);
}

export function createCourse(payload: { title: string; description: string }) {
  return apiRequest<Course>("/courses/", {
    method: "POST",
    json: payload,
  });
}

export function createLesson(
  courseId: string,
  payload: { title: string; description: string; materials?: File | null; duration?: number | null }
) {
  if (payload.materials instanceof File) {
    const form = new FormData();
    form.append("title", payload.title);
    if (payload.description) {
      form.append("description", payload.description);
    }
    if (typeof payload.duration === "number") {
      form.append("duration", String(payload.duration));
    }
    form.append("materials", payload.materials);
    return apiUpload<Lesson>(`/courses/${courseId}/lessons/`, form);
  }

  return apiRequest<Lesson>(`/courses/${courseId}/lessons/`, {
    method: "POST",
    json: {
      title: payload.title,
      description: payload.description,
      duration: payload.duration ?? null,
    },
  });
}

export function fetchInviteCode(courseId: string) {
  return apiRequest<{ course_id: number; invite_code: string; created_at: string }>(
    `/courses/${courseId}/invite-code/`,
    {
      method: "POST",
    }
  );
}

export function joinCourse(courseId: string | null, inviteCode: string) {
  const path = courseId ? `/courses/${courseId}/join/` : "/courses/join-by-code/";
  return apiRequest(path, {
    method: "POST",
    json: { invite_code: inviteCode },
  });
}
