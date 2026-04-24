import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { deleteHomework, updateHomework } from "@/features/assignments/api";
import type { HomeworkResponse } from "@/features/assignments/types";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { ApiError } from "@/shared/api/base";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";

type Blank = { position: number; correct_text: string };

type DraftState = {
  title: string;
  description: string;
  max_score: number;
  text_template: string;
  blanks: Blank[];
};

function extractDraft(hw: HomeworkResponse): DraftState {
  const details = (hw.details as { text_template?: string; blanks?: Blank[] } | null) ?? {};
  return {
    title: hw.title ?? "",
    description: hw.description ?? "",
    max_score: hw.max_score ?? 0,
    text_template: details.text_template ?? "",
    blanks: Array.isArray(details.blanks)
      ? details.blanks.map((b) => ({
          position: b.position,
          correct_text: b.correct_text ?? "",
        }))
      : [],
  };
}

export function FillBlankStep() {
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
    const validBlanks = snapshot.blanks
      .filter((b) => b.correct_text.trim())
      .map((b) => ({ position: b.position, correct_text: b.correct_text.trim() }));
    if (validBlanks.length === 0 || !snapshot.text_template.trim()) {
      setError("Заполните текст задания и правильные ответы.");
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
          text_template: snapshot.text_template,
          blanks: validBlanks,
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
  }, [hw?.id]);

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

  if (!hw || !draft) return <div className="muted">Задание не найдено.</div>;

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    dirtyRef.current = true;
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleAddBlank = () => {
    const nextPos = draft.blanks.length > 0
      ? Math.max(...draft.blanks.map((b) => b.position)) + 1
      : 1;
    updateDraft("blanks", [...draft.blanks, { position: nextPos, correct_text: "" }]);
  };

  const handleRemoveBlank = (idx: number) => {
    updateDraft("blanks", draft.blanks.filter((_, i) => i !== idx));
  };

  const handleBlankText = (idx: number, text: string) => {
    updateDraft(
      "blanks",
      draft.blanks.map((b, i) => (i === idx ? { ...b, correct_text: text } : b))
    );
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

  const blanksInText = (draft.text_template.match(/_{3,}/g) ?? []).length;

  return (
    <>
      <div className="wizard-card">
        <span className="wizard-card-title">Настройка вопроса</span>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Отметьте пропуски в тексте последовательностью из трёх или более подчёркиваний (<code>___</code>), затем укажите правильные ответы ниже.
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
          rows={5}
          value={draft.text_template}
          onChange={(e) => updateDraft("text_template", e.target.value)}
          placeholder="Например: Столица России — ___, а самый большой океан — ___."
        />
        <div className="muted" style={{ fontSize: 12 }}>
          Пропусков в тексте: {blanksInText}. Полей для заполнения: {draft.blanks.length}.
        </div>
      </div>

      <div className="wizard-card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="wizard-card-title">Поля для заполнения</span>
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
        {draft.blanks.map((blank, idx) => (
          <div key={idx} className="wizard-option-row">
            <span className="muted" style={{ minWidth: 100, fontSize: 13 }}>
              Пропуск {blank.position}
            </span>
            <input
              className="auth-input"
              value={blank.correct_text}
              onChange={(e) => handleBlankText(idx, e.target.value)}
              placeholder="Правильный ответ"
            />
            <button
              type="button"
              className="wizard-option-remove"
              onClick={() => handleRemoveBlank(idx)}
              aria-label="Удалить пропуск"
              title="Удалить пропуск"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={handleAddBlank} style={{ alignSelf: "flex-start" }}>
          + Добавить пропуск
        </button>
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
