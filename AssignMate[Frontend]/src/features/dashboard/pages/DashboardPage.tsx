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
            <div className="courses-hero dashboard-placeholder">
              <svg
                className="dashboard-placeholder-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M4 6h16M4 12h10M4 18h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <h3>Выберите курс</h3>
              <p>
                Выберите курс слева, чтобы посмотреть статистику и перейти к проверке
                домашних заданий.
              </p>
            </div>
          )}
          {statsState.loading ? <Loader label="Загружаем статистику..." /> : null}
          {statsState.error ? <ErrorState error={statsState.error} /> : null}
          {statsState.data ? (() => {
            const stats = statsState.data;
            const students = studentsState.data ?? [];
            return (
              <div className="dashboard-course">
                <div className="courses-hero">
                  <div className="row">
                    <strong>{stats.title}</strong>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-card">
                      <div className="stat-label">Всего студентов</div>
                      <div className="stat-value">{stats.students_count}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Всего уроков</div>
                      <div className="stat-value">{stats.lessons_count}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Домашних заданий</div>
                      <div className="stat-value">{stats.homeworks_count}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Максимум баллов</div>
                      <div className="stat-value">{stats.total_max_score}</div>
                    </div>
                  </div>
                </div>

                <div className="courses-hero">
                  <div className="row space-between">
                    <div>
                      <h3>Ученики курса</h3>
                      <p className="muted">Всего: {stats.students_count}</p>
                    </div>
                  </div>
                  {studentsState.loading ? <Loader label="Загружаем студентов..." /> : null}
                  {studentsState.error ? <ErrorState error={studentsState.error} /> : null}
                  {!studentsState.loading && !studentsState.error && students.length === 0 ? (
                    <EmptyState label="В этом курсе пока нет студентов." />
                  ) : null}
                  {!studentsState.loading && !studentsState.error && students.length > 0 ? (
                    <div className="students-table">
                      <div className="students-table-header">
                        <span>Ученик</span>
                        <span>Email</span>
                        <span>Выполнено заданий</span>
                        <span>Балл</span>
                      </div>
                      {students.map((student) => {
                        const fullName = `${student.first_name} ${student.last_name}`.trim() || "Без имени";
                        const studentPath = `/dashboard/courses/${selectedCourseId}/students/${student.student_id}`;
                        return (
                          <Link className="students-table-row" to={studentPath} key={student.student_id}>
                            <span className="students-name">{fullName}</span>
                            <span className="students-email">{student.email}</span>
                            <span>
                              {student.submissions_count} из {stats.homeworks_count}
                            </span>
                            <span>{student.score_sum}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })() : null}
          {selectedCourse && !statsState.data && !statsState.loading && !statsState.error ? (
            <div className="courses-hero">
              <h3>{selectedCourse.title}</h3>
              <p>Статистика будет доступна после загрузки.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
