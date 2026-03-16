import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardCourses, fetchCourseStats, fetchCourseStudents } from "@/features/dashboard/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";

export function DashboardPage() {
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const coursesState = useAsync(fetchDashboardCourses, []);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const statsState = useAsync(
    () => (selectedCourseId ? fetchCourseStats(selectedCourseId) : Promise.resolve(null)),
    [selectedCourseId]
  );
  const studentsState = useAsync(
    () => (selectedCourseId ? fetchCourseStudents(selectedCourseId) : Promise.resolve([])),
    [selectedCourseId]
  );

  if (coursesState.loading) return <Loader />;
  if (coursesState.error) return <ErrorState error={coursesState.error} />;
  if (!coursesState.data || coursesState.data.length === 0) {
    return <EmptyState label="Нет курсов для статистики" />;
  }

  const selectedCourse = coursesState.data.find(
    (course) => String(course.id) === selectedCourseId
  );

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Общая статистика курса</h1>
          <p>Сводные показатели и студенты курса.</p>
        </div>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-list">
          {coursesState.data.map((course) => (
            <button
              key={course.id}
              className={`course-card button ${selectedCourseId === String(course.id) ? "active" : ""}`}
              onClick={() => setSelectedCourseId(String(course.id))}
            >
              <div className="course-title">{course.title || `Курс #${course.id}`}</div>
              <div className="course-desc">Учеников: {course.students_count}</div>
            </button>
          ))}
        </div>
        <div className="dashboard-stats">
          {!selectedCourseId && (
            <div className="courses-hero">
              <h3>Выберите курс</h3>
              <p>Выберите курс слева, чтобы посмотреть статистику.</p>
            </div>
          )}
          {statsState.loading && <Loader label="Загружаем статистику..." />}
          {statsState.error && <ErrorState error={statsState.error} />}
          {statsState.data && (
            <div className="dashboard-course">
              <div className="courses-hero">
                <div className="row">
                  <strong>{statsState.data.title}</strong>
                </div>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-label">Всего студентов</div>
                    <div className="stat-value">{statsState.data.students_count}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Всего уроков</div>
                    <div className="stat-value">{statsState.data.lessons_count}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Домашних заданий</div>
                    <div className="stat-value">{statsState.data.homeworks_count}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Максимум баллов</div>
                    <div className="stat-value">{statsState.data.total_max_score}</div>
                  </div>
                </div>
              </div>

              <div className="courses-hero">
                <div className="row space-between">
                  <div>
                    <h3>Ученики курса</h3>
                    <p className="muted">Всего: {statsState.data.students_count}</p>
                  </div>
                </div>
                {studentsState.loading && <Loader label="Загружаем студентов..." />}
                {studentsState.error && <ErrorState error={studentsState.error} />}
                {!studentsState.loading && !studentsState.error && studentsState.data.length === 0 && (
                  <EmptyState label="В этом курсе пока нет студентов." />
                )}
                {!studentsState.loading && !studentsState.error && studentsState.data.length > 0 && (
                  <div className="students-table">
                    <div className="students-table-header">
                      <span>Ученик</span>
                      <span>Email</span>
                      <span>Выполнено заданий</span>
                      <span>Балл</span>
                    </div>
                    {studentsState.data.map((student) => {
                      const fullName = `${student.first_name} ${student.last_name}`.trim() || "Без имени";
                      const studentPath = `/dashboard/courses/${selectedCourseId}/students/${student.student_id}`;
                      return (
                        <Link className="students-table-row" to={studentPath} key={student.student_id}>
                          <span className="students-name">{fullName}</span>
                          <span className="students-email">{student.email}</span>
                          <span>
                            {student.submissions_count} из {statsState.data.homeworks_count}
                          </span>
                          <span>{student.score_sum}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {selectedCourse && !statsState.data && !statsState.loading && !statsState.error && (
            <div className="courses-hero">
              <h3>{selectedCourse.title}</h3>
              <p>Статистика будет доступна после загрузки.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
