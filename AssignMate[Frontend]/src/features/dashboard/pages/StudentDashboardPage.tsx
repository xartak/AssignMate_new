import { useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMyCourses } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";

export function StudentDashboardPage() {
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const coursesState = useAsync(fetchMyCourses, []);

  if (coursesState.loading) return <Loader />;
  if (coursesState.error) return <ErrorState error={coursesState.error} />;
  if (!coursesState.data || coursesState.data.length === 0) {
    return <EmptyState label="Нет доступных курсов" />;
  }

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Моя статистика</h1>
          <p>Выберите курс, чтобы посмотреть успеваемость.</p>
        </div>
      </div>
      <div className="courses-grid">
        {coursesState.data.map((course) => (
          <Link
            key={course.id}
            to={`/courses/${course.id}/my-stats`}
            className="course-card"
          >
            <div className="course-title">{course.title}</div>
            <div className="course-desc">{course.description || "Описание отсутствует"}</div>
            <div className="course-meta">
              <span className="course-tag">статистика</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
