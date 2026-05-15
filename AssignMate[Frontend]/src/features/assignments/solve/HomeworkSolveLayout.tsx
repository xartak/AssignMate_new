import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import type { HomeworkResponse } from "@/features/assignments/types";
import { fetchHomeworks } from "@/features/lessons/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { useAuth } from "@/shared/hooks/useAuth";

export type SolveContext = {
  courseId: string;
  lessonOrder: string;
  homeworks: HomeworkResponse[];
  currentOrder: number | null;
  isReview: boolean;
  readOnly: boolean;
  reloadHomeworks: () => void;
};

export function HomeworkSolveLayout() {
  const { courseId = "", lessonOrder = "", homeworkOrder } = useParams();
  const location = useLocation();
  const isReview = location.pathname.endsWith("/review");
  const [reloadKey, setReloadKey] = useState(0);
  const { role } = useAuth();
  const readOnly = role === "parent";

  const homeworksState = useAsync(
    () => fetchHomeworks(courseId, lessonOrder),
    [courseId, lessonOrder, reloadKey]
  );

  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  if (homeworksState.loading) return <Loader />;
  if (homeworksState.error) return <ErrorState error={homeworksState.error} />;

  const homeworks = [...(homeworksState.data ?? [])].sort(
    (a, b) => a.order - b.order
  ) as unknown as HomeworkResponse[];
  const currentOrder = homeworkOrder ? Number(homeworkOrder) : null;
  const totalMaxScore = homeworks.reduce((sum, hw) => sum + (hw.max_score ?? 0), 0);

  if (homeworks.length === 0) {
    return (
      <div className="courses-page">
        <div className="page-header">
          <div>
            <h1>Домашнее задание</h1>
          </div>
        </div>
        <div className="courses-hero">
          <div className="muted">Домашние задания пока не добавлены.</div>
        </div>
      </div>
    );
  }

  if (!currentOrder && !isReview && homeworkOrder === undefined) {
    return (
      <Navigate
        to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/solve/${homeworks[0].order}`}
        replace
      />
    );
  }

  const ctx: SolveContext = {
    courseId,
    lessonOrder,
    homeworks,
    currentOrder,
    isReview,
    readOnly,
    reloadHomeworks: () => setReloadKey((k) => k + 1),
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Домашнее задание</h1>
        </div>
        <div className="wizard-header-pills">
          <span className="meta-pill">Максимальный балл: {totalMaxScore}</span>
        </div>
      </div>

      <div className="courses-hero wizard-content">
        <div className="wizard-steps" role="tablist">
          {homeworks.map((hw) => {
            const active = currentOrder === hw.order && !isReview;
            return (
              <Link
                key={hw.order}
                className={`wizard-step${active ? " active" : ""}`}
                to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/solve/${hw.order}`}
                title={hw.title || `ДЗ #${hw.order}`}
              >
                {hw.order}
              </Link>
            );
          })}
          {!readOnly && (
            <Link
              className={`wizard-step review${isReview ? " active" : ""}`}
              to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/solve/review`}
              title="Итог"
            >
              Итог
            </Link>
          )}
        </div>
        <Outlet context={ctx} />
      </div>
    </div>
  );
}
