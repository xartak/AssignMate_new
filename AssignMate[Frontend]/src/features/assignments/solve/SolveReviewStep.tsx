import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type {
  AssignmentType,
  FillBlankDetails,
  HomeworkResponse,
  LongAnswerDetails,
  MultipleChoiceDetails,
  ShortAnswerDetails,
  SingleChoiceDetails,
  SubmissionResponse,
} from "@/features/assignments/types";
import { fetchSubmissions, submitHomework, type SubmissionPayload } from "@/features/assignments/api";
import {
  clearHomeworkDraft,
  loadHomeworkDraft,
  type HomeworkDraftPayload,
} from "@/shared/storage/homeworkDrafts";
import type { ApiError } from "@/shared/api/base";
import type { SolveContext } from "@/features/assignments/solve/HomeworkSolveLayout";

type DraftMap = Record<number, HomeworkDraftPayload | null>;
type SubmissionMap = Record<number, SubmissionResponse | null>;

type AnswerStatus = "answered" | "partial" | "empty";

function classifyDraft(hw: HomeworkResponse, draft: HomeworkDraftPayload | null): AnswerStatus {
  if (!draft) return "empty";
  switch (hw.type) {
    case "SINGLE_CHOICE":
      return draft.selected_option != null ? "answered" : "empty";
    case "MULTIPLE_CHOICE":
      return (draft.selected_options?.length ?? 0) > 0 ? "answered" : "empty";
    case "FILL_BLANK": {
      const blanks = (hw.details as FillBlankDetails | null)?.blanks ?? [];
      if (blanks.length === 0) return "empty";
      const filled = (draft.answers ?? []).filter((a) => a.answer_text?.trim()).length;
      if (filled === 0) return "empty";
      if (filled < blanks.length) return "partial";
      return "answered";
    }
    case "SHORT_ANSWER":
      return draft.answer_text?.trim() ? "answered" : "empty";
    case "LONG_ANSWER": {
      const hasText = Boolean(draft.answer_text?.trim());
      const hasFiles = (draft.files?.length ?? 0) > 0;
      if (hasText && hasFiles) return "answered";
      if (hasText || hasFiles) return "partial";
      return "empty";
    }
    default:
      return "empty";
  }
}

function statusPill(status: AnswerStatus) {
  if (status === "answered") return <span className="status-pill status-pill-success">Ответ дан</span>;
  if (status === "partial") return <span className="status-pill status-pill-warning">Частично заполнено</span>;
  return <span className="status-pill status-pill-danger">Нет ответа</span>;
}

function buildPayload(hw: HomeworkResponse, draft: HomeworkDraftPayload | null): SubmissionPayload | null {
  if (!draft) return null;
  switch (hw.type) {
    case "SINGLE_CHOICE": {
      const options = (hw.details as SingleChoiceDetails | null)?.options ?? [];
      const ids = new Set(options.map((o) => o.id));
      const sel = draft.selected_option;
      if (sel == null || !ids.has(sel)) return null;
      return { selected_option: sel };
    }
    case "MULTIPLE_CHOICE": {
      const options = (hw.details as MultipleChoiceDetails | null)?.options ?? [];
      const ids = new Set(options.map((o) => o.id));
      const sel = (draft.selected_options ?? []).filter((id) => ids.has(id));
      if (sel.length === 0) return null;
      return { selected_options: sel };
    }
    case "FILL_BLANK": {
      const blanks = (hw.details as FillBlankDetails | null)?.blanks ?? [];
      const byPos = new Map((draft.answers ?? []).map((a) => [a.position, a.answer_text]));
      const answers = blanks.map((b) => ({
        position: b.position,
        answer_text: (byPos.get(b.position) ?? "").trim(),
      }));
      if (answers.some((a) => !a.answer_text)) return null;
      return { answers };
    }
    case "SHORT_ANSWER": {
      const trimmed = (draft.answer_text ?? "").trim();
      if (!trimmed) return null;
      const maxLen = (hw.details as ShortAnswerDetails | null)?.max_length;
      if (maxLen && trimmed.length > maxLen) return null;
      return { answer_text: trimmed };
    }
    case "LONG_ANSWER": {
      const trimmed = (draft.answer_text ?? "").trim();
      if (!trimmed) return null;
      const maxFiles = (hw.details as LongAnswerDetails | null)?.max_files;
      const files = draft.files ?? [];
      if (maxFiles && files.length > maxFiles) return null;
      return { answer_text: trimmed, files };
    }
    default:
      return null;
  }
}

export function SolveReviewStep() {
  const ctx = useOutletContext<SolveContext>();
  const navigate = useNavigate();

  // All hooks before conditional returns
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [submissionsMap, setSubmissionsMap] = useState<SubmissionMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const draftResult: DraftMap = {};
      const subResult: SubmissionMap = {};
      for (const hw of ctx.homeworks) {
        const key = `homework-solve:${ctx.courseId}:${ctx.lessonOrder}:${hw.order}`;
        let subs: SubmissionResponse[] = [];
        const stored = await loadHomeworkDraft(key);
        if (!ctx.readOnly) {
          try {
            subs = await fetchSubmissions(ctx.courseId, ctx.lessonOrder, String(hw.order));
          } catch {
            subs = [];
          }
        }
        if (cancelled) return;
        draftResult[hw.order] = stored?.type === hw.type ? stored.payload : null;
        subResult[hw.order] = subs[0] ?? null;
      }
      if (!cancelled) {
        setDrafts(draftResult);
        setSubmissionsMap(subResult);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ctx.homeworks, ctx.courseId, ctx.lessonOrder, ctx.readOnly]);

  if (ctx.readOnly) {
    return (
      <div className="wizard-card">
        <p className="muted">Вы просматриваете задание в режиме чтения. Сдача недоступна.</p>
        <div className="wizard-footer" style={{ marginTop: 16 }}>
          <button type="button" className="secondary" onClick={() => navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`)}>
            Вернуться к уроку
          </button>
        </div>
      </div>
    );
  }

  const handleSubmitAll = async () => {
    setSubmitting(true);
    setStatus(null);
    setErrors({});
    const nextErrors: Record<number, string> = {};
    for (const hw of ctx.homeworks) {
      const existing = submissionsMap[hw.order] ?? null;
      if (existing && existing.status !== "REVISION") continue;

      const draft = drafts[hw.order] ?? null;
      const payload = buildPayload(hw, draft);
      if (!payload) {
        nextErrors[hw.order] = "Ответ не заполнен или не прошёл валидацию.";
        continue;
      }
      try {
        await submitHomework(
          ctx.courseId,
          ctx.lessonOrder,
          String(hw.order),
          hw.type as AssignmentType,
          payload
        );
        await clearHomeworkDraft(`homework-solve:${ctx.courseId}:${ctx.lessonOrder}:${hw.order}`);
      } catch (err) {
        const apiError = err as ApiError | null;
        const details = apiError?.details;
        nextErrors[hw.order] =
          typeof details === "string"
            ? details
            : details
            ? JSON.stringify(details)
            : "Ошибка отправки";
      }
    }
    setErrors(nextErrors);
    setSubmitting(false);
    if (Object.keys(nextErrors).length === 0) {
      setStatus("Все задания отправлены.");
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    } else {
      setStatus(`Отправлено с ошибками (${Object.keys(nextErrors).length}). См. таблицу.`);
    }
  };

  const handleReturn = () => {
    const first = ctx.homeworks[0];
    if (first) {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/solve/${first.order}`);
    }
  };

  return (
    <>
      <div>
        <h3 style={{ margin: "0 0 4px" }}>Проверьте ответы перед отправкой</h3>
        <p className="muted" style={{ margin: 0 }}>
          Ниже показано, какие задания имеют ответы. Вы можете вернуться к попытке, чтобы внести изменения.
        </p>
      </div>

      {loading ? (
        <div className="muted">Собираем черновики…</div>
      ) : (
        <div className="wizard-review-table">
          {ctx.homeworks.map((hw) => {
            const existing = submissionsMap[hw.order] ?? null;
            const isAlreadySubmitted = Boolean(existing && existing.status !== "REVISION");
            const draft = drafts[hw.order] ?? null;
            const st = isAlreadySubmitted ? ("answered" as AnswerStatus) : classifyDraft(hw, draft);
            const err = errors[hw.order];
            return (
              <div key={hw.order} className="wizard-review-row">
                <span className="num">{hw.order}</span>
                <div>
                  <div className="title">Задание {hw.order}</div>
                  <div className="summary">{hw.title || "Без названия"}</div>
                  {err && <div className="auth-error" style={{ marginTop: 4 }}>{err}</div>}
                </div>
                <span className="meta-pill">{hw.max_score} балл.</span>
                {isAlreadySubmitted
                  ? <span className="status-pill status-pill-success">Сдано</span>
                  : statusPill(st)}
              </div>
            );
          })}
        </div>
      )}

      {status && <div className="muted">{status}</div>}

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={handleReturn}>
          Вернуться к попытке
        </button>
        <button
          type="button"
          className="primary"
          onClick={handleSubmitAll}
          disabled={submitting || loading || ctx.homeworks.length === 0}
        >
          {submitting ? "Отправляем…" : "Сохранить и отправить"}
        </button>
      </div>
    </>
  );
}
