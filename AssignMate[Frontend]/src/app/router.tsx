import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { RequireTeacher } from "@/app/guards/RequireTeacher";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { CourseListPage } from "@/features/courses/pages/CourseListPage";
import { CourseDetailPage } from "@/features/courses/pages/CourseDetailPage";
import { LessonDetailPage } from "@/features/lessons/pages/LessonDetailPage";
import { HomeworkRedirect } from "@/features/assignments/pages/HomeworkRedirect";
import { HomeworkEditorLayout } from "@/features/assignments/editor/HomeworkEditorLayout";
import { EditorRouter } from "@/features/assignments/editor/EditorRouter";
import { EditorReviewStep } from "@/features/assignments/editor/EditorReviewStep";
import { HomeworkSolveLayout } from "@/features/assignments/solve/HomeworkSolveLayout";
import { SolveQuestionStep } from "@/features/assignments/solve/SolveQuestionStep";
import { SolveReviewStep } from "@/features/assignments/solve/SolveReviewStep";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { StudentStatsPage } from "@/features/dashboard/pages/StudentStatsPage";
import { SubmissionReviewPage } from "@/features/dashboard/pages/SubmissionReviewPage";
import { MyStatsPage } from "@/features/dashboard/pages/MyStatsPage";
import { StudentDashboardPage } from "@/features/dashboard/pages/StudentDashboardPage";
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
      { path: "courses/:courseId/my-stats", element: <MyStatsPage /> },
      { path: "student-dashboard", element: <StudentDashboardPage /> },
      { path: "courses/:courseId/lessons/:lessonOrder", element: <LessonDetailPage /> },
      {
        path: "courses/:courseId/lessons/:lessonOrder/homeworks/editor",
        element: <HomeworkEditorLayout />,
        children: [
          { index: true, element: <EditorRouter /> },
          { path: "review", element: <EditorReviewStep /> },
          { path: ":homeworkOrder", element: <EditorRouter /> },
        ],
      },
      {
        path: "courses/:courseId/lessons/:lessonOrder/homeworks/solve",
        element: <HomeworkSolveLayout />,
        children: [
          { index: true, element: <div /> },
          { path: "review", element: <SolveReviewStep /> },
          { path: ":homeworkOrder", element: <SolveQuestionStep /> },
        ],
      },
      {
        path: "courses/:courseId/lessons/:lessonOrder/homeworks/:homeworkOrder",
        element: <HomeworkRedirect />,
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
      {
        path: "dashboard/courses/:courseId/students/:studentId/homeworks/:homeworkOrder",
        element: (
          <RequireTeacher>
            <SubmissionReviewPage />
          </RequireTeacher>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
