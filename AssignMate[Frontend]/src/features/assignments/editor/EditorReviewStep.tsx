import { useNavigate, useOutletContext } from "react-router-dom";
import type { HomeworkResponse } from "@/features/assignments/types";
import { homeworkStatus } from "@/features/assignments/editor/HomeworkEditorLayout";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "Вопрос с выбором ответа",
  MULTIPLE_CHOICE: "Вопрос с несколькими ответами",
  FILL_BLANK: "Заполнение пропусков",
  SHORT_ANSWER: "Краткий ответ",
  LONG_ANSWER: "Развёрнутый ответ",
};

function statusPill(status: "complete" | "partial" | "missing") {
  if (status === "complete") return <span className="status-pill status-pill-success">Заполнено</span>;
  if (status === "partial") return <span className="status-pill status-pill-warning">Заполнено частично</span>;
  return <span className="status-pill status-pill-danger">Требует настройки</span>;
}

function summarize(hw: HomeworkResponse): string {
  const details = hw.details as Record<string, unknown> | null;
  if (!details) return "—";
  switch (hw.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const options = (details as { options?: { is_correct?: boolean }[] }).options ?? [];
      const correct = options.filter((o) => o.is_correct).length;
      return `${options.length} вариант(ов), ${correct} правильн.`;
    }
    case "FILL_BLANK": {
      const blanks = (details as { blanks?: unknown[] }).blanks ?? [];
      return `${blanks.length} пропуск(ов)`;
    }
    case "SHORT_ANSWER": {
      const maxLen = (details as { max_length?: number }).max_length;
      return `До ${maxLen ?? "?"} символов`;
    }
    case "LONG_ANSWER": {
      const maxFiles = (details as { max_files?: number }).max_files;
      return `До ${maxFiles ?? "?"} файлов`;
    }
    default:
      return "—";
  }
}

export function EditorReviewStep() {
  const ctx = useOutletContext<EditorContext>();
  const navigate = useNavigate();

  const homeworks = ctx.homeworks;
  const totalMaxScore = homeworks.reduce((sum, hw) => sum + (hw.max_score ?? 0), 0);
  const needSettings = homeworks.filter((hw) => homeworkStatus(hw) !== "complete").length;

  const handleBackToEdit = () => {
    const firstBad = homeworks.find((hw) => homeworkStatus(hw) !== "complete");
    const target = firstBad ?? homeworks[0];
    if (target) {
      navigate(
        `/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${target.order}`
      );
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    }
  };

  const handlePublish = () => {
    navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
  };

  return (
    <>
      <div>
        <h3 style={{ margin: "0 0 4px" }}>Проверьте домашнее задание перед сохранением</h3>
        <p className="muted" style={{ margin: 0 }}>
          Ниже показаны добавленные задания, их типы и степень готовности. Вы можете вернуться к редактированию, чтобы внести изменения.
        </p>
      </div>

      {homeworks.length === 0 ? (
        <div className="muted">Заданий пока нет. Добавьте первое задание, нажав «+».</div>
      ) : (
        <div className="wizard-review-table">
          {homeworks.map((hw) => (
            <div key={hw.order} className="wizard-review-row">
              <span className="num">{hw.order}</span>
              <div>
                <div className="title">
                  Задание {hw.order} — {TYPE_LABEL[hw.type] ?? hw.type}
                </div>
                <div className="summary">{hw.title || "Без названия"} · {summarize(hw)}</div>
              </div>
              <span className="meta-pill">{hw.max_score} балл.</span>
              {statusPill(homeworkStatus(hw))}
            </div>
          ))}
        </div>
      )}

      <div className="wizard-card">
        <span className="wizard-card-title">Общие параметры</span>
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Количество заданий</div>
            <div style={{ fontWeight: 600 }}>{homeworks.length}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Суммарный максимальный балл</div>
            <div style={{ fontWeight: 600 }}>{totalMaxScore}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Требуют настройки</div>
            <div style={{ fontWeight: 600 }}>{needSettings}</div>
          </div>
        </div>
      </div>

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={handleBackToEdit}>
          Вернуться к редактированию
        </button>
        <button
          type="button"
          className="primary"
          onClick={handlePublish}
          disabled={homeworks.length === 0}
        >
          Сохранить и опубликовать
        </button>
      </div>
    </>
  );
}
