import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";

/**
 * Редирект со старого URL /homeworks/:order на новые flow:
 * - ученик/родитель → solve/:order
 * - автор/админ/ассистент → editor/:order
 */
export function HomeworkRedirect() {
  const { courseId, lessonOrder, homeworkOrder } = useParams();
  const { role } = useAuth();
  const target =
    role === "student" || role === "parent"
      ? `/courses/${courseId}/lessons/${lessonOrder}/homeworks/solve/${homeworkOrder}`
      : `/courses/${courseId}/lessons/${lessonOrder}/homeworks/editor/${homeworkOrder}`;
  return <Navigate to={target} replace />;
}
