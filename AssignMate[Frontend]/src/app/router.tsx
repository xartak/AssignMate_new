import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { RequireTeacher } from "@/app/guards/RequireTeacher";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { CourseListPage } from "@/features/courses/pages/CourseListPage";
import { CourseDetailPage } from "@/features/courses/pages/CourseDetailPage";
import { LessonDetailPage } from "@/features/lessons/pages/LessonDetailPage";
import { HomeworkDetailPage } from "@/features/assignments/pages/HomeworkDetailPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { StudentStatsPage } from "@/features/dashboard/pages/StudentStatsPage";
import { CabinetPage } from "@/features/cabinet/pages/CabinetPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <CabinetPage /> },
      { path: "courses", element: <CourseListPage /> },
      { path: "cabinet", element: <CabinetPage /> },
      { path: "courses/:courseId", element: <CourseDetailPage /> },
      { path: "courses/:courseId/lessons/:lessonOrder", element: <LessonDetailPage /> },
      {
        path: "courses/:courseId/lessons/:lessonOrder/homeworks/:homeworkOrder",
        element: <HomeworkDetailPage />,
      },
      {
        path: "dashboard",
        element: (
          <RequireTeacher>
            <DashboardPage />
          </RequireTeacher>
        ),
      },
      {
        path: "dashboard/courses/:courseId/students/:studentId",
        element: (
          <RequireTeacher>
            <StudentStatsPage />
          </RequireTeacher>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
