import { apiRequest, fetchAllPages } from "@/shared/api/base";
import type {
  DashboardCourse,
  CourseStats,
  CourseStudentStats,
  CourseStudentDetail,
} from "@/shared/api/types";

export function fetchDashboardCourses() {
  return fetchAllPages<DashboardCourse>("/dashboard/courses/");
}

export function fetchCourseStats(courseId: string) {
  return apiRequest<CourseStats>(`/dashboard/courses/${courseId}/`);
}

export function fetchCourseStudents(courseId: string) {
  return apiRequest<CourseStudentStats[]>(`/dashboard/courses/${courseId}/students/`);
}

export function fetchCourseStudentDetail(courseId: string, studentId: string) {
  return apiRequest<CourseStudentDetail>(
    `/dashboard/courses/${courseId}/students/${studentId}/`
  );
}
