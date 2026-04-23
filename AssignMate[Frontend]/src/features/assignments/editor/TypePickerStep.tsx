import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { createHomework } from "@/features/assignments/api";
import type { AssignmentType } from "@/features/assignments/types";
import type { ApiError } from "@/shared/api/base";
import { buildHomeworkTemplate, HOMEWORK_TYPE_META } from "@/features/assignments/editor/templates";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";

export function TypePickerStep() {
  const ctx = useOutletContext<EditorContext>();
  const navigate = useNavigate();
  const [creatingType, setCreatingType] = useState<AssignmentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (type: AssignmentType) => {
    const lastOrder = ctx.homeworks.length > 0
      ? Math.max(...ctx.homeworks.map((hw) => hw.order))
      : 0;
    const nextOrder = lastOrder + 1;
    const template = buildHomeworkTemplate(type, `Новое ДЗ ${nextOrder}`);
    setCreatingType(type);
    setError(null);
    try {
      const created = await createHomework(ctx.courseId, ctx.lessonOrder, template);
      ctx.reload();
      navigate(
        `/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${created.order}`
      );
    } catch (err) {
      const apiError = err as ApiError | null;
      const details = apiError?.details;
      setError(
        typeof details === "string"
          ? details
          : details
          ? JSON.stringify(details, null, 2)
          : "Не удалось создать задание"
      );
    } finally {
      setCreatingType(null);
    }
  };

  const handleBack = () => {
    navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
  };

  return (
    <>
      <div>
        <h3 style={{ margin: "0 0 4px" }}>Выбор типа задания</h3>
        <p className="muted" style={{ margin: 0 }}>
          Выберите формат нового задания для добавления в домашнюю работу.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="wizard-type-grid">
        {HOMEWORK_TYPE_META.map((item) => (
          <button
            key={item.type}
            type="button"
            className="wizard-type-card"
            onClick={() => handlePick(item.type)}
            disabled={creatingType !== null}
          >
            <span className="wizard-type-icon" aria-hidden>
              {item.icon}
            </span>
            <h4>{item.label}</h4>
            <p>{item.description}</p>
            {creatingType === item.type && (
              <span className="muted" style={{ fontSize: 12 }}>
                Создаем…
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={handleBack}>
          Предыдущее
        </button>
      </div>
    </>
  );
}
