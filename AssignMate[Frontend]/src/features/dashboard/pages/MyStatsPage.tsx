import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMyStats } from "@/features/dashboard/api";
import { fetchChildren, type ChildLink } from "@/features/auth/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { useAuth } from "@/shared/hooks/useAuth";
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
  const { role } = useAuth();
  const isParent = role === "parent";

  const [children, setChildren] = useState<ChildLink[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isParent) return;
    setChildrenLoading(true);
    fetchChildren()
      .then((list) => {
        setChildren(list);
        if (list.length > 0 && selectedChildId === undefined) {
          setSelectedChildId(String(list[0].student_id));
        }
      })
      .finally(() => setChildrenLoading(false));
  }, [isParent]);

  const statsState = useAsync(
    () => {
      if (!courseId) return Promise.resolve(null);
      if (isParent && selectedChildId === undefined) return Promise.resolve(null);
      return fetchMyStats(courseId, isParent ? selectedChildId : undefined);
    },
    [courseId, isParent ? selectedChildId : ""]
  );

  if (childrenLoading) return <Loader label="Загружаем данные..." />;
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

  const selectedChild = children.find((c) => String(c.student_id) === selectedChildId);
  const pageTitle = isParent && selectedChild
    ? `Статистика: ${selectedChild.first_name} ${selectedChild.last_name}`.trim()
    : "Моя статистика";

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{data.course_title}</p>
        </div>
        {isParent && children.length > 1 && (
          <div>
            <label htmlFor="childSelect" className="muted" style={{ marginRight: 8 }}>
              Ученик:
            </label>
            <select
              id="childSelect"
              value={selectedChildId ?? ""}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {children.map((child) => (
                <option key={child.student_id} value={String(child.student_id)}>
                  {`${child.first_name} ${child.last_name}`.trim() || child.email}
                </option>
              ))}
            </select>
          </div>
        )}
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
                    <Link to={homeworkPath} className="action-button-link">
                      Открыть
                    </Link>
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
