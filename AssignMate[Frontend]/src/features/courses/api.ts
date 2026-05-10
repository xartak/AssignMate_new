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

export function updateCourse(courseId: string, payload: { title?: string; description?: string }) {
  return apiRequest<Course>(`/courses/${courseId}/`, {
    method: "PATCH",
    json: payload,
  });
}

export function deleteCourse(courseId: string) {
  return apiRequest(`/courses/${courseId}/`, {
    method: "DELETE",
  });
}

export function createLesson(
  courseId: string,
  payload: { title: string; description: string; materials?: File[]; duration?: number | null }
) {
  if (payload.materials && payload.materials.length > 0) {
    const form = new FormData();
    form.append("title", payload.title);
    if (payload.description) {
      form.append("description", payload.description);
    }
    if (typeof payload.duration === "number") {
      form.append("duration", String(payload.duration));
    }
    payload.materials.forEach((file) => form.append("materials", file));
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

export function updateLesson(
  courseId: string,
  order: number,
  payload: { title?: string; description?: string; materials?: File[]; duration?: number | null }
) {
  if (payload.materials && payload.materials.length > 0) {
    const form = new FormData();
    if (payload.title !== undefined) form.append("title", payload.title);
    if (payload.description !== undefined) form.append("description", payload.description);
    if (typeof payload.duration === "number") {
      form.append("duration", String(payload.duration));
    }
    payload.materials.forEach((file) => form.append("materials", file));
    return apiUpload<Lesson>(`/courses/${courseId}/lessons/${order}/`, form, "PATCH");
  }

  return apiRequest<Lesson>(`/courses/${courseId}/lessons/${order}/`, {
    method: "PATCH",
    json: {
      title: payload.title,
      description: payload.description,
      duration: payload.duration ?? null,
    },
  });
}

export function deleteLesson(courseId: string, order: number) {
  return apiRequest(`/courses/${courseId}/lessons/${order}/`, {
    method: "DELETE",
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

export function joinCourse(inviteCode: string) {
  return apiRequest("/courses/join-by-code/", {
    method: "POST",
    json: { invite_code: inviteCode },
  });
}

export type AssistantPermissions = {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  can_edit_homework: boolean;
  can_review_homework: boolean;
  can_add_homework: boolean;
  can_add_materials: boolean;
};

export function fetchMyPermissions(courseId: string) {
  return apiRequest<AssistantPermissions>(`/courses/${courseId}/my-permissions/`);
}

export function fetchCourseAssistants(courseId: string) {
  return apiRequest<AssistantPermissions[]>(`/courses/${courseId}/assistants/`);
}

export function updateAssistantPermissions(
  courseId: string,
  userId: number,
  permissions: Partial<Omit<AssistantPermissions, "user_id" | "email" | "first_name" | "last_name">>
) {
  return apiRequest<AssistantPermissions>(`/courses/${courseId}/staff/${userId}/permissions/`, {
    method: "PATCH",
    json: permissions,
  });
}

export function addCourseAssistant(courseId: string, email: string) {
  return apiRequest<AssistantPermissions>(`/courses/${courseId}/add-assistant/`, {
    method: "POST",
    json: { email },
  });
}

export function removeCourseAssistant(courseId: string, userId: number) {
  return apiRequest(`/courses/${courseId}/remove-assistant/${userId}/`, {
    method: "DELETE",
  });
}
