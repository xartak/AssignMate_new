import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchCourseStudentDetail } from "@/features/dashboard/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "На проверке",
  REVISION: "Переделать",
  GRADED: "Оценено",
  NOT_SUBMITTED: "Не сдано",
};

export function StudentStatsPage() {
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const { courseId, studentId } = useParams();
  const statsState = useAsync(
    () =>
      courseId && studentId
        ? fetchCourseStudentDetail(courseId, studentId)
        : Promise.resolve(null),
    [courseId, studentId]
  );

  if (statsState.loading) return <Loader />;
  if (statsState.error) return <ErrorState error={statsState.error} />;
  if (!statsState.data) return <EmptyState label="Нет данных по студенту." />;

  const data = statsState.data;
  const fullName = `${data.first_name} ${data.last_name}`.trim() || "Без имени";
  const completedLabel = `${data.submissions_count} из ${data.homeworks_count}`;
  const scoreLabel = `${data.score_sum} из ${data.total_max_score}`;
  const onTimeLabel = `${data.on_time_count} из ${data.homeworks_count}`;

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "Без дедлайна";
    return new Date(deadline).toLocaleString();
  };

  const formatStatus = (status: string) => STATUS_LABELS[status] ?? status;

  const formatScore = (status: string, score: number | null) => {
    if (status === "PENDING") return "на проверке";
    if (status === "REVISION") return "переделать";
    if (status === "NOT_SUBMITTED") return "—";
    if (status === "GRADED") return score ?? "—";
    return score ?? "—";
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Статистика по ученику</h1>
          <p>{fullName}</p>
        </div>
      </div>

      <div className="courses-hero">
        <div className="row">
          <strong>{data.course_title}</strong>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Выполнено заданий</div>
            <div className="stat-value">{completedLabel}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Балл</div>
            <div className="stat-value">{scoreLabel}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Сдано вовремя</div>
            <div className="stat-value">{onTimeLabel}</div>
          </div>
        </div>
      </div>

      <div className="courses-hero">
        <div className="row space-between">
          <div>
            <h3>Домашние задания</h3>
            <p className="muted">Всего: {data.homeworks_count}</p>
          </div>
        </div>
        {data.homeworks.length === 0 ? (
          <EmptyState label="Домашних заданий пока нет." />
        ) : (
          <div className="homeworks-table">
            <div className="homeworks-table-header">
              <span>Урок</span>
              <span>Название</span>
              <span>Срок сдачи</span>
              <span>Статус</span>
              <span>Оценка</span>
            </div>
            {data.homeworks.map((homework) => (
              <div className="homeworks-table-row" key={homework.homework_id}>
                <span>
                  {homework.lesson_order}. {homework.lesson_title}
                </span>
                <span>{homework.title}</span>
                <span>{formatDeadline(homework.deadline)}</span>
                <span>{formatStatus(homework.status)}</span>
                <span>{formatScore(homework.status, homework.score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
