import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { deleteHomework, updateHomework } from "@/features/assignments/api";
import type { AssignmentType, HomeworkResponse } from "@/features/assignments/types";
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
  const dirtyRef = useRef(false);
  const draftRef = useRef<DraftState | null>(draft);
  const pinnedHwRef = useRef<{ id: number; order: number; type: AssignmentType } | null>(
    hw ? { id: hw.id, order: hw.order, type: hw.type } : null
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persist = async (
    target: { order: number; type: AssignmentType },
    snapshot: DraftState
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const details =
        target.type === "SHORT_ANSWER"
          ? { max_length: snapshot.max_length, case_sensitive: false }
          : { max_files: snapshot.max_files };
      await updateHomework(ctx.courseId, ctx.lessonOrder, target.order, {
        title: snapshot.title,
        description: snapshot.description,
        max_score: snapshot.max_score,
        details,
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
    const ok = await persist({ order: pinned.order, type: pinned.type }, snapshot);
    if (ok) dirtyRef.current = false;
    return ok;
  };

  useEffect(() => {
    if (!hw) return;
    if (pinnedHwRef.current && pinnedHwRef.current.id === hw.id && !dirtyRef.current) {
      setDraft(extractDraft(hw));
    } else if (!pinnedHwRef.current || pinnedHwRef.current.id !== hw.id) {
      pinnedHwRef.current = { id: hw.id, order: hw.order, type: hw.type };
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
        persist({ order: pinned.order, type: pinned.type }, snapshot);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hw || !draft) return <div className="muted">Задание не найдено.</div>;

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    dirtyRef.current = true;
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
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
