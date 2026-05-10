import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMyStats } from "@/features/dashboard/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatDateTime } from "@/shared/utils/date";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "На проверке",
  REVISION: "Переделать",
  GRADED: "Оценено",
  NOT_SUBMITTED: "Не сдано",
};

function statusPillClass(status: string) {
  if (status === "GRADED") return "status-pill status-pill-success";
  if (status === "REVISION") return "status-pill status-pill-danger";
  if (status === "PENDING") return "status-pill status-pill-warning";
  return "status-pill status-pill-neutral";
}

export function MyStatsPage() {
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const { courseId } = useParams();
  const statsState = useAsync(
    () => (courseId ? fetchMyStats(courseId) : Promise.resolve(null)),
    [courseId]
  );

  if (statsState.loading) return <Loader label="Загружаем статистику..." />;
  if (statsState.error) return <ErrorState error={statsState.error} />;
  if (!statsState.data) return <EmptyState label="Нет данных." />;

  const data = statsState.data;
  const completedLabel = `${data.submissions_count} из ${data.homeworks_count}`;
  const scoreLabel = `${data.score_sum} из ${data.total_max_score}`;
  const onTimeLabel = `${data.on_time_count} из ${data.homeworks_count}`;

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "Без дедлайна";
    return formatDateTime(deadline);
  };

  const formatScore = (status: string, score: number | null) => {
    if (status === "NOT_SUBMITTED") return "—";
    if (status === "GRADED") return score ?? "—";
    return "—";
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Моя статистика</h1>
          <p>{data.course_title}</p>
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
              <span>Действие</span>
            </div>
            {data.homeworks.map((homework) => {
              const canOpen = homework.status !== "NOT_SUBMITTED" || true;
              const homeworkPath = `/courses/${courseId}/lessons/${homework.lesson_order}/homeworks/${homework.homework_order}`;
              return (
                <div className="homeworks-table-row" key={homework.homework_id}>
                  <span className="homework-lesson">
                    {homework.lesson_order}. {homework.lesson_title}
                  </span>
                  <span className="homework-title">{homework.title}</span>
                  <span className="homework-deadline">{formatDeadline(homework.deadline)}</span>
                  <span>
                    <span className={statusPillClass(homework.status)}>
                      {STATUS_LABELS[homework.status] ?? homework.status}
                    </span>
                  </span>
                  <span className="homework-score">
                    {formatScore(homework.status, homework.score)}
                  </span>
                  <span>
                    {canOpen ? (
                      <Link to={homeworkPath} className="action-button-link">
                        Открыть
                      </Link>
                    ) : (
                      <span className="action-button-link disabled">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
