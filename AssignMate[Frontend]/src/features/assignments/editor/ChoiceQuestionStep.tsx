import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { deleteHomework, updateHomework } from "@/features/assignments/api";
import type { AssignmentType, HomeworkResponse } from "@/features/assignments/types";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { ApiError } from "@/shared/api/base";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";

type EditorOption = {
  id?: number;
  text: string;
  is_correct: boolean;
};

type DraftState = {
  type: AssignmentType;
  title: string;
  description: string;
  max_score: number;
  options: EditorOption[];
};

function extractDraft(hw: HomeworkResponse): DraftState {
  const details = (hw.details as { options?: EditorOption[] } | null) ?? {};
  const options = Array.isArray(details.options) ? details.options : [];
  return {
    type: hw.type,
    title: hw.title ?? "",
    description: hw.description ?? "",
    max_score: hw.max_score ?? 0,
    options: options.map((opt) => ({
      id: opt.id,
      text: opt.text ?? "",
      is_correct: Boolean(opt.is_correct),
    })),
  };
}

export function ChoiceQuestionStep() {
  const ctx = useOutletContext<EditorContext>();
  const navigate = useNavigate();
  const hw = ctx.homeworks.find((item) => item.order === ctx.currentOrder);

  const [draft, setDraft] = useState<DraftState | null>(hw ? extractDraft(hw) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<DraftState | null>(draft);
  const pinnedHwRef = useRef<{ id: number; order: number } | null>(
    hw ? { id: hw.id, order: hw.order } : null
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persist = async (
    targetOrder: number,
    snapshot: DraftState
  ): Promise<boolean> => {
    const validOptions = snapshot.options
      .filter((o) => o.text.trim())
      .map(({ text, is_correct }) => ({ text: text.trim(), is_correct }));
    if (validOptions.length < 2) {
      setError("Нужно минимум два варианта ответа с текстом.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await updateHomework(ctx.courseId, ctx.lessonOrder, targetOrder, {
        title: snapshot.title,
        description: snapshot.description,
        max_score: snapshot.max_score,
        details: {
          shuffle_options: false,
          options: validOptions,
        },
      });
      ctx.reload();
      return true;
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
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveCurrent = async (): Promise<boolean> => {
    const snapshot = draftRef.current;
    const pinned = pinnedHwRef.current;
    if (!snapshot || !pinned) return true;
    if (!dirtyRef.current) return true;
    const ok = await persist(pinned.order, snapshot);
    if (ok) dirtyRef.current = false;
    return ok;
  };

  useEffect(() => {
    if (!hw) return;
    if (pinnedHwRef.current && pinnedHwRef.current.id === hw.id && !dirtyRef.current) {
      setDraft(extractDraft(hw));
    } else if (!pinnedHwRef.current || pinnedHwRef.current.id !== hw.id) {
      pinnedHwRef.current = { id: hw.id, order: hw.order };
      setDraft(extractDraft(hw));
      dirtyRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hw?.id, hw?.type]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current && pinnedHwRef.current && draftRef.current) {
        const snapshot = draftRef.current;
        const pinned = pinnedHwRef.current;
        dirtyRef.current = false;
        persist(pinned.order, snapshot);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hw || !draft) {
    return <div className="muted">Задание не найдено.</div>;
  }

  const isMultiple = draft.type === "MULTIPLE_CHOICE";
  const correctCount = draft.options.filter((o) => o.is_correct).length;

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    dirtyRef.current = true;
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleModeChange = (nextType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE") => {
    if (draft.type === nextType) return;
    const adjusted: EditorOption[] = nextType === "SINGLE_CHOICE"
      ? draft.options.map((opt, idx) => ({
          ...opt,
          is_correct: idx === draft.options.findIndex((o) => o.is_correct),
        }))
      : draft.options;
    dirtyRef.current = true;
    setDraft({ ...draft, type: nextType, options: adjusted });
    setError("Смена типа задания ограничена на сервере — создайте новое задание нужного типа.");
  };

  const handleOptionText = (idx: number, text: string) => {
    const next = draft.options.map((opt, i) => (i === idx ? { ...opt, text } : opt));
    updateDraft("options", next);
  };

  const handleToggleCorrect = (idx: number) => {
    const next = draft.options.map((opt, i) => {
      if (i === idx) return { ...opt, is_correct: !opt.is_correct };
      if (!isMultiple) return { ...opt, is_correct: false };
      return opt;
    });
    updateDraft("options", next);
  };

  const handleAddOption = () => {
    updateDraft("options", [
      ...draft.options,
      { text: `Вариант ${draft.options.length + 1}`, is_correct: false },
    ]);
  };

  const handleRemoveOption = (idx: number) => {
    if (draft.options.length <= 2) {
      setError("Нужно минимум два варианта ответа.");
      return;
    }
    updateDraft("options", draft.options.filter((_, i) => i !== idx));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить ДЗ #${hw.order}?`)) return;
    setDeleting(true);
    setError(null);
    try {
      dirtyRef.current = false;
      await deleteHomework(ctx.courseId, ctx.lessonOrder, hw.order);
      ctx.reload();
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/review`);
    } catch {
      setError("Не удалось удалить задание.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    await saveCurrent();
  };

  const goPrev = async () => {
    const ok = await saveCurrent();
    if (!ok) return;
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    if (idx > 0) {
      const prev = ctx.homeworks[idx - 1];
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${prev.order}`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    }
  };

  const goNext = async () => {
    const ok = await saveCurrent();
    if (!ok) return;
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    const next = ctx.homeworks[idx + 1];
    if (next) {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/${next.order}`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/editor/review`);
    }
  };

  return (
    <>
      <div className="wizard-card">
        <span className="wizard-card-title">Настройка вопроса</span>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className={draft.type === "SINGLE_CHOICE" ? "wizard-option-toggle correct" : "wizard-option-toggle"}
            onClick={() => handleModeChange("SINGLE_CHOICE")}
          >
            Один правильный ответ
          </button>
          <button
            type="button"
            className={draft.type === "MULTIPLE_CHOICE" ? "wizard-option-toggle correct" : "wizard-option-toggle"}
            onClick={() => handleModeChange("MULTIPLE_CHOICE")}
          >
            Несколько правильных ответов
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          При выборе одного правильного ответа отмечайте только один вариант — остальные автоматически становятся неверными.
        </p>
      </div>

      <div className="wizard-card">
        <span className="wizard-card-title">Задание</span>
        <input
          className="auth-input"
          value={draft.title}
          onChange={(e) => updateDraft("title", e.target.value)}
          placeholder="Введите текст задания"
        />
      </div>

      <div className="wizard-card">
        <span className="wizard-card-title">Текст задания</span>
        <textarea
          className="auth-input"
          rows={3}
          value={draft.description}
          onChange={(e) => updateDraft("description", e.target.value)}
          placeholder="Дополнительное описание или пояснение (необязательно)"
        />
      </div>

      <div className="wizard-card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="wizard-card-title">Варианты ответа</span>
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
        {draft.options.map((option, idx) => (
          <div key={idx} className="wizard-option-row">
            <input
              className="auth-input"
              value={option.text}
              onChange={(e) => handleOptionText(idx, e.target.value)}
              placeholder={`Вариант ${idx + 1}`}
            />
            <button
              type="button"
              className={option.is_correct ? "wizard-option-toggle correct" : "wizard-option-toggle"}
              onClick={() => handleToggleCorrect(idx)}
              title="Верный ответ"
            >
              {option.is_correct ? "Верный" : "Сделать верным"}
            </button>
            <button
              type="button"
              className="wizard-option-remove"
              onClick={() => handleRemoveOption(idx)}
              aria-label="Удалить вариант"
              title="Удалить вариант"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={handleAddOption} style={{ alignSelf: "flex-start" }}>
          + Добавить вариант
        </button>
        {correctCount === 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            Отметьте хотя бы один правильный ответ.
          </div>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}
      {dirtyRef.current && !saving && (
        <div className="muted" style={{ fontSize: 12 }}>Есть несохранённые изменения</div>
      )}
      {saving && <div className="muted" style={{ fontSize: 12 }}>Сохраняем…</div>}

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={goPrev}>Предыдущее</button>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Удаляем…" : "Удалить"}
          </button>
          <button type="button" className="secondary" onClick={handleSave} disabled={saving || !dirtyRef.current}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          <button type="button" className="primary" onClick={goNext}>
            Сохранить и продолжить
          </button>
        </div>
      </div>
    </>
  );
}
