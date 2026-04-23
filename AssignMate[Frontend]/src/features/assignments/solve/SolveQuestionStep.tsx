import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type {
  FillBlankDetails,
  HomeworkResponse,
  LongAnswerDetails,
  MultipleChoiceDetails,
  ShortAnswerDetails,
  SingleChoiceDetails,
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

  if (!hw || !draft) return <div className="muted">Задание не найдено.</div>;

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
    } else {
      navigate(`/courses/${ctx.courseId}/lessons/${ctx.lessonOrder}/homeworks/solve/review`);
    }
  };

  const handleReset = async () => {
    if (draftKey) {
      await clearHomeworkDraft(draftKey);
    }
    setDraft(buildEmptyDraft(hw));
  };

  const renderForm = () => {
    switch (hw.type) {
      case "SINGLE_CHOICE":
        return (
          <SingleChoiceForm
            details={hw.details as SingleChoiceDetails}
            value={draft.selected_option ?? null}
            onChange={(selected_option) => setDraft({ ...draft, selected_option })}
          />
        );
      case "MULTIPLE_CHOICE":
        return (
          <MultipleChoiceForm
            details={hw.details as MultipleChoiceDetails}
            value={draft.selected_options ?? []}
            onChange={(selected_options) => setDraft({ ...draft, selected_options })}
          />
        );
      case "FILL_BLANK":
        return (
          <FillBlankForm
            details={hw.details as FillBlankDetails}
            value={normalizeFillBlankAnswers(hw.details as FillBlankDetails, draft.answers)}
            onChange={(answers) => setDraft({ ...draft, answers })}
          />
        );
      case "SHORT_ANSWER":
        return (
          <ShortAnswerForm
            details={hw.details as ShortAnswerDetails}
            value={draft.answer_text ?? ""}
            onChange={(answer_text) => setDraft({ ...draft, answer_text })}
          />
        );
      case "LONG_ANSWER":
        return (
          <LongAnswerForm
            details={hw.details as LongAnswerDetails}
            value={{ answer_text: draft.answer_text ?? "", files: draft.files ?? [] }}
            onChange={(value) => setDraft({ ...draft, ...value })}
          />
        );
      default:
        return <div className="muted">Неизвестный тип задания.</div>;
    }
  };

  return (
    <>
      <div className="wizard-card">
        <span className="wizard-card-title">Описание задания</span>
        <div>{hw.description || hw.title || "—"}</div>
      </div>

      <div className="wizard-card">
        <span className="wizard-card-title">Ваш ответ</span>
        {loadingDraft ? <div className="muted">Загружаем черновик…</div> : renderForm()}
      </div>

      <div className="wizard-footer">
        <button type="button" className="secondary" onClick={goPrev}>Предыдущее</button>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="danger" onClick={handleReset} title="Очистить ответ">
            Очистить
          </button>
          <button type="button" className="primary" onClick={goNext}>
            Следующее
          </button>
        </div>
      </div>
    </>
  );
}
