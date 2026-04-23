import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { deleteHomework, updateHomework } from "@/features/assignments/api";
import type { HomeworkResponse } from "@/features/assignments/types";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { ApiError } from "@/shared/api/base";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";

type DraftState = {
  title: string;
  description: string;
  max_score: number;
  max_length: number;
  max_files: number;
};

function extractDraft(hw: HomeworkResponse): DraftState {
  const details = (hw.details as { max_length?: number; max_files?: number } | null) ?? {};
  return {
    title: hw.title ?? "",
    description: hw.description ?? "",
    max_score: hw.max_score ?? 0,
    max_length: details.max_length ?? 200,
    max_files: details.max_files ?? 3,
  };
}

export function ShortLongAnswerStep() {
  const ctx = useOutletContext<EditorContext>();
  const navigate = useNavigate();
  const hw = ctx.homeworks.find((item) => item.order === ctx.currentOrder);

  const [draft, setDraft] = useState<DraftState | null>(hw ? extractDraft(hw) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!hw) return;
    setDraft(extractDraft(hw));
    initialised.current = false;
  }, [hw?.id]);

  useEffect(() => {
    if (!draft || !hw) return;
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const courseId = ctx.courseId;
    const lessonOrder = ctx.lessonOrder;
    const order = hw.order;
    const type = hw.type;
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const details =
          type === "SHORT_ANSWER"
            ? { max_length: draft.max_length, case_sensitive: false }
            : { max_files: draft.max_files };
        await updateHomework(courseId, lessonOrder, order, {
          title: draft.title,
          description: draft.description,
          max_score: draft.max_score,
          details,
        });
      } catch (err) {
        const apiError = err as ApiError | null;
        const details = apiError?.details;
        setError(
          typeof details === "string"
            ? details
            : details
            ? JSON.stringify(details, null, 2)
            : "Не удалось сохранить"
        );
      } finally {
        setSaving(false);
      }
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hw?.id, hw?.type]);

  if (!hw || !draft) return <div className="muted">Задание не найдено.</div>;

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить ДЗ #${hw.order}?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteHomework(ctx.courseId, ctx.lessonOrder, hw.order);
      ctx.reload();
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/review`);
    } catch {
      setError("Не удалось удалить задание.");
    } finally {
      setDeleting(false);
    }
  };

  const goPrev = () => {
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    if (idx > 0) {
      const prev = ctx.homeworks[idx - 1];
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${prev.order}`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    }
  };

  const goNext = () => {
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    const next = ctx.homeworks[idx + 1];
    if (next) {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${next.order}`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/review`);
    }
  };

  const isShort = hw.type === "SHORT_ANSWER";

  return (
    <>
      <div className="wizard-card">
        <span className="wizard-card-title">
          {isShort ? "Краткий ответ" : "Развёрнутый ответ"}
        </span>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {isShort
            ? "Ученик отвечает в одну-две строки. Задайте максимальную длину ответа."
            : "Ученик пишет развёрнутый ответ и может прикрепить файлы. Задайте их максимальное количество."}
        </p>
      </div>

      <div className="wizard-card">
        <span className="wizard-card-title">Задание</span>
        <input
          className="auth-input"
          value={draft.title}
          onChange={(e) => updateDraft("title", e.target.value)}
          placeholder="Название задания"
        />
      </div>

      <div className="wizard-card">
        <span className="wizard-card-title">Текст задания</span>
        <textarea
          className="auth-input"
          rows={4}
          value={draft.description}
          onChange={(e) => updateDraft("description", e.target.value)}
          placeholder="Подробное описание задания для ученика"
        />
      </div>

      <div className="wizard-card">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {isShort ? "Максимальная длина ответа" : "Максимум файлов"}
            </span>
            <div style={{ width: 110 }}>
              <NumberInput
                min={1}
                value={isShort ? String(draft.max_length) : String(draft.max_files)}
                onChange={(v) =>
                  updateDraft(isShort ? "max_length" : "max_files", Number(v) || 1)
                }
              />
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="muted" style={{ fontSize: 13 }}>Баллы за вопрос</span>
            <div style={{ width: 110 }}>
              <NumberInput
                min={0}
                value={String(draft.max_score)}
                onChange={(v) => updateDraft("max_score", Number(v) || 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {saving && <div className="muted" style={{ fontSize: 12 }}>Сохраняем…</div>}

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={goPrev}>Предыдущее</button>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Удаляем…" : "Удалить"}
          </button>
          <button type="button" className="primary" onClick={goNext}>
            Сохранить и продолжить
          </button>
        </div>
      </div>
    </>
  );
}
