import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type {
  FillBlankDetails,
  HomeworkResponse,
  LongAnswerDetails,
  MultipleChoiceDetails,
  ShortAnswerDetails,
  SingleChoiceDetails,
  SubmissionResponse,
} from "@/features/assignments/types";
import { SingleChoiceForm } from "@/features/assignments/forms/SingleChoiceForm";
import { MultipleChoiceForm } from "@/features/assignments/forms/MultipleChoiceForm";
import { FillBlankForm } from "@/features/assignments/forms/FillBlankForm";
import { ShortAnswerForm } from "@/features/assignments/forms/ShortAnswerForm";
import { LongAnswerForm } from "@/features/assignments/forms/LongAnswerForm";
import {
  clearHomeworkDraft,
  loadHomeworkDraft,
  saveHomeworkDraft,
  type HomeworkDraftPayload,
} from "@/shared/storage/homeworkDrafts";
import type { SolveContext } from "@/features/assignments/solve/HomeworkSolveLayout";
import { fetchSubmissions } from "@/features/assignments/api";

function buildEmptyDraft(hw: HomeworkResponse): HomeworkDraftPayload {
  switch (hw.type) {
    case "SINGLE_CHOICE":
      return { selected_option: null };
    case "MULTIPLE_CHOICE":
      return { selected_options: [] };
    case "FILL_BLANK": {
      const details = hw.details as FillBlankDetails | null;
      const answers = details?.blanks
        ? details.blanks.map((b) => ({ position: b.position, answer_text: "" }))
        : [];
      return { answers };
    }
    case "SHORT_ANSWER":
      return { answer_text: "" };
    case "LONG_ANSWER":
      return { answer_text: "", files: [] };
    default:
      return {};
  }
}

function normalizeFillBlankAnswers(
  details: FillBlankDetails | null,
  answers: { position: number; answer_text: string }[] | undefined
) {
  if (!details?.blanks) return answers ?? [];
  const byPos = new Map((answers ?? []).map((a) => [a.position, a.answer_text]));
  return details.blanks.map((blank) => ({
    position: blank.position,
    answer_text: byPos.get(blank.position) ?? "",
  }));
}

function submissionToDraft(hw: HomeworkResponse, details: unknown): HomeworkDraftPayload | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  switch (hw.type) {
    case "SINGLE_CHOICE": {
      const opt = d.selected_option as { id: number } | null;
      return { selected_option: opt?.id ?? null };
    }
    case "MULTIPLE_CHOICE": {
      const opts = (d.selected_options as { id: number }[] | null) ?? [];
      return { selected_options: opts.map((o) => o.id) };
    }
    case "FILL_BLANK": {
      const answers = (d.answers as { position: number; answer_text: string }[] | null) ?? [];
      return { answers };
    }
    case "SHORT_ANSWER":
      return { answer_text: (d.answer_text as string) ?? "" };
    case "LONG_ANSWER":
      return { answer_text: (d.answer_text as string) ?? "", files: [] };
    default:
      return null;
  }
}

export function SolveQuestionStep() {
  const ctx = useOutletContext<SolveContext>();
  const navigate = useNavigate();
  const hw = ctx.homeworks.find((item) => item.order === ctx.currentOrder);
  const draftKey = hw
    ? `homework-solve:${ctx.courseId}:${ctx.lessonOrder}:${hw.order}`
    : null;

  const [draft, setDraft] = useState<HomeworkDraftPayload | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const saveTimer = useRef<number | null>(null);

  const [existingSubmission, setExistingSubmission] = useState<SubmissionResponse | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!hw || !draftKey) return;
      setLoadingDraft(true);
      const stored = await loadHomeworkDraft(draftKey);
      if (cancelled) return;
      if (stored && stored.type === hw.type) {
        setDraft(stored.payload);
      } else {
        setDraft(buildEmptyDraft(hw));
      }
      setLoadingDraft(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [draftKey, hw?.id, hw?.type]);

  useEffect(() => {
    if (!hw || !draftKey || loadingDraft || !draft) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const type = hw.type;
    saveTimer.current = window.setTimeout(() => {
      saveHomeworkDraft(draftKey, type, draft);
    }, 300);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draftKey, hw?.id, hw?.type, loadingDraft]);

  useEffect(() => {
    if (!hw || ctx.readOnly) {
      setExistingSubmission(null);
      setSubmissionLoading(false);
      return;
    }
    setSubmissionLoading(true);
    setExistingSubmission(null);
    fetchSubmissions(ctx.courseId, ctx.lessonOrder, String(hw.order))
      .then((subs) => setExistingSubmission(subs[0] ?? null))
      .catch(() => setExistingSubmission(null))
      .finally(() => setSubmissionLoading(false));
  }, [hw?.id, ctx.courseId, ctx.lessonOrder, ctx.readOnly]);

  const { readOnly } = ctx;
  const isSubmitted = Boolean(existingSubmission && existingSubmission.status !== "REVISION");
  const submittedDraft = isSubmitted && hw ? submissionToDraft(hw, existingSubmission!.details) : null;

  if (!hw) return <div className="muted">Задание не найдено.</div>;

  const goPrev = () => {
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    if (idx > 0) {
      const prev = ctx.homeworks[idx - 1];
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/solve/${prev.order}`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    }
  };

  const goNext = () => {
    const idx = ctx.homeworks.findIndex((item) => item.order === hw.order);
    const next = ctx.homeworks[idx + 1];
    if (next) {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/solve/${next.order}`);
    } else if (!ctx.readOnly) {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/solve/review`);
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}`);
    }
  };

  const handleReset = async () => {
    if (draftKey) {
      await clearHomeworkDraft(draftKey);
    }
    setDraft(buildEmptyDraft(hw));
  };

  const renderForm = (d: HomeworkDraftPayload, disabled = false) => {
    switch (hw.type) {
      case "SINGLE_CHOICE":
        return (
          <SingleChoiceForm
            details={hw.details as SingleChoiceDetails}
            value={d.selected_option ?? null}
            onChange={(selected_option) => setDraft({ ...d, selected_option })}
            disabled={disabled}
          />
        );
      case "MULTIPLE_CHOICE":
        return (
          <MultipleChoiceForm
            details={hw.details as MultipleChoiceDetails}
            value={d.selected_options ?? []}
            onChange={(selected_options) => setDraft({ ...d, selected_options })}
            disabled={disabled}
          />
        );
      case "FILL_BLANK":
        return (
          <FillBlankForm
            details={hw.details as FillBlankDetails}
            value={normalizeFillBlankAnswers(hw.details as FillBlankDetails, d.answers)}
            onChange={(answers) => setDraft({ ...d, answers })}
            disabled={disabled}
          />
        );
      case "SHORT_ANSWER":
        return (
          <ShortAnswerForm
            details={hw.details as ShortAnswerDetails}
            value={d.answer_text ?? ""}
            onChange={(answer_text) => setDraft({ ...d, answer_text })}
            disabled={disabled}
          />
        );
      case "LONG_ANSWER":
        return (
          <LongAnswerForm
            details={hw.details as LongAnswerDetails}
            value={{ answer_text: d.answer_text ?? "", files: d.files ?? [] }}
            onChange={(value) => setDraft({ ...d, ...value })}
            disabled={disabled}
          />
        );
      default:
        return <div className="muted">Неизвестный тип задания.</div>;
    }
  };

  const renderAnswerCard = () => {
    if (readOnly) {
      return (
        <div className="wizard-card">
          <span className="wizard-card-title muted">Просмотр задания</span>
          <p className="muted">Вы просматриваете задание в режиме чтения.</p>
        </div>
      );
    }
    if (submissionLoading) {
      return (
        <div className="wizard-card">
          <span className="wizard-card-title">Ваш ответ</span>
          <div className="muted">Загружаем черновик…</div>
        </div>
      );
    }
    if (isSubmitted && submittedDraft) {
      return (
        <div className="wizard-card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="wizard-card-title">Ваш ответ</span>
            <span className="status-pill status-pill-success">Сдано</span>
          </div>
          {renderForm(submittedDraft, true)}
        </div>
      );
    }
    return (
      <div className="wizard-card">
        <span className="wizard-card-title">Ваш ответ</span>
        {loadingDraft ? <div className="muted">Загружаем черновик…</div> : draft && renderForm(draft)}
      </div>
    );
  };

  return (
    <>
      <div className="wizard-card">
        <span className="wizard-card-title">Описание задания</span>
        <div>{hw.description || hw.title || "—"}</div>
      </div>

      {renderAnswerCard()}

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={goPrev}>Предыдущее</button>
        <div className="row" style={{ gap: 10 }}>
          {!readOnly && !isSubmitted && (
            <button type="button" className="danger" onClick={handleReset} title="Очистить ответ">
              Очистить
            </button>
          )}
          <button type="button" className="primary" onClick={goNext}>
            Следующее
          </button>
        </div>
      </div>
    </>
  );
}
