import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import type { HomeworkResponse } from "@/features/assignments/types";
import { fetchHomeworks } from "@/features/lessons/api";
import { fetchCourse } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { useAuth } from "@/shared/hooks/useAuth";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";

export function homeworkStatus(hw: HomeworkResponse): "complete" | "partial" | "missing" {
  const hasTitle = Boolean(hw.title && hw.title.trim());
  const details = hw.details as Record<string, unknown> | null;
  switch (hw.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const options = (details as { options?: { text?: string; is_correct?: boolean }[] } | null)?.options ?? [];
      const hasOptions = options.length >= 2 && options.every((o) => o.text && o.text.trim());
      const hasCorrect = options.some((o) => o.is_correct);
      if (hasTitle && hasOptions && hasCorrect) return "complete";
      if (hasTitle || hasOptions) return "partial";
      return "missing";
    }
    case "FILL_BLANK": {
      const blanks = (details as { blanks?: { correct_text?: string }[] } | null)?.blanks ?? [];
      const hasBlanks = blanks.length > 0 && blanks.every((b) => b.correct_text && b.correct_text.trim());
      const hasTemplate = Boolean((details as { text_template?: string } | null)?.text_template?.trim());
      if (hasTitle && hasBlanks && hasTemplate) return "complete";
      if (hasTitle || hasBlanks) return "partial";
      return "missing";
    }
    case "SHORT_ANSWER":
    case "LONG_ANSWER":
      return hasTitle ? "complete" : "missing";
    default:
      return "missing";
  }
}

export type EditorContext = {
  courseId: string;
  lessonOrder: string;
  homeworks: HomeworkResponse[];
  currentOrder: number | null;
  isReview: boolean;
  reload: () => void;
};

export function HomeworkEditorLayout() {
  const { courseId = "", lessonOrder = "", homeworkOrder } = useParams();
  const location = useLocation();
  const isReview = location.pathname.endsWith("/review");
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);

  const courseState = useAsync(() => fetchCourse(courseId), [courseId]);
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

  useEffect(() => {
    if (courseState.loading) return;
    const canManage = role === "admin" || (role === "teacher" && courseState.data?.author === userId);
    if (!canManage) {
      navigate(`/courses/${courseId}/lessons/${lessonOrder}`, { replace: true });
    }
  }, [courseState.loading, courseState.data, role, userId, courseId, lessonOrder, navigate]);

  if (courseState.loading || homeworksState.loading) return <Loader />;
  if (homeworksState.error) return <ErrorState error={homeworksState.error} />;

  const homeworks = [...(homeworksState.data ?? [])].sort(
    (a, b) => a.order - b.order
  ) as unknown as HomeworkResponse[];
  const currentOrder = homeworkOrder ? Number(homeworkOrder) : null;
  const totalMaxScore = homeworks.reduce((sum, hw) => sum + (hw.max_score ?? 0), 0);

  const ctx: EditorContext = {
    courseId,
    lessonOrder,
    homeworks,
    currentOrder,
    isReview,
    reload: () => setReloadKey((k) => k + 1),
  };

  const reviewPath = `/courses/${courseId}/lessons/${lessonOrder}/homeworks/editor/review`;
  const addPath = `/courses/${courseId}/lessons/${lessonOrder}/homeworks/editor`;

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Домашнее задание</h1>
          <p className="muted">Конструктор набора заданий к уроку</p>
        </div>
        <div className="wizard-header-pills">
          <span className="meta-pill">Максимальный балл: {totalMaxScore}</span>
        </div>
      </div>

      <div className="courses-hero wizard-content">
        <div className="wizard-steps" role="tablist">
          {homeworks.map((hw) => {
            const status = homeworkStatus(hw);
            const active = currentOrder === hw.order && !isReview;
            return (
              <Link
                key={hw.order}
                className={`wizard-step${active ? " active" : ""} status-${status}`}
                to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/editor/${hw.order}`}
                title={hw.title || `ДЗ #${hw.order}`}
              >
                {hw.order}
              </Link>
            );
          })}
          {homeworks.length > 0 && (
            <Link
              to={reviewPath}
              className={`wizard-step review${isReview ? " active" : ""}`}
              title="Итог"
            >
              Итог
            </Link>
          )}
          <Link
            to={addPath}
            className="wizard-step add"
            title="Добавить задание"
            aria-label="Добавить задание"
          >
            +
          </Link>
        </div>
        <Outlet context={ctx} />
      </div>
    </div>
  );
}
