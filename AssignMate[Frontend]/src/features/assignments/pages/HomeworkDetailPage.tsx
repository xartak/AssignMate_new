import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createHomework,
  deleteHomework,
  fetchHomework,
  fetchSubmissions,
  submitHomework,
  updateHomework,
} from "@/features/assignments/api";
import { fetchCourse } from "@/features/courses/api";
import { fetchHomeworks } from "@/features/lessons/api";
import type {
  AssignmentType,
  HomeworkResponse,
  SingleChoiceDetails,
  MultipleChoiceDetails,
  FillBlankDetails,
  ShortAnswerDetails,
  LongAnswerDetails,
  SubmissionResponse,
} from "@/features/assignments/types";
import { useAsync } from "@/shared/hooks/useAsync";
import { resolveFileUrl } from "@/shared/api/base";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { NumberInput } from "@/shared/ui/NumberInput";
import { SingleChoiceForm } from "@/features/assignments/forms/SingleChoiceForm";
import { MultipleChoiceForm } from "@/features/assignments/forms/MultipleChoiceForm";
import { FillBlankForm } from "@/features/assignments/forms/FillBlankForm";
import { ShortAnswerForm } from "@/features/assignments/forms/ShortAnswerForm";
import { LongAnswerForm } from "@/features/assignments/forms/LongAnswerForm";
import { useAuth } from "@/shared/hooks/useAuth";
import { formatDateTime } from "@/shared/utils/date";
import type { ApiError } from "@/shared/api/base";
import {
  clearHomeworkDraft,
  loadHomeworkDraft,
  saveHomeworkDraft,
  type HomeworkDraftPayload,
} from "@/shared/storage/homeworkDrafts";

const HOMEWORK_TYPE_ITEMS: { type: AssignmentType; label: string }[] = [
  { type: "SINGLE_CHOICE", label: "Выбор одного" },
  { type: "MULTIPLE_CHOICE", label: "Выбор нескольких" },
  { type: "FILL_BLANK", label: "Вставить пропуск" },
  { type: "SHORT_ANSWER", label: "Краткий ответ" },
  { type: "LONG_ANSWER", label: "Развернутый ответ" },
];

function buildHomeworkTemplate(
  type: AssignmentType,
  title: string,
): {
  title: string;
  description: string;
  type: AssignmentType;
  max_score: number;
  deadline: null;
  details: Record<string, unknown>;
} {
  if (type === "SINGLE_CHOICE") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        shuffle_options: false,
        options: [
          { text: "Вариант 1", is_correct: true },
          { text: "Вариант 2", is_correct: false },
        ],
      },
    };
  }
  if (type === "MULTIPLE_CHOICE") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        shuffle_options: false,
        options: [
          { text: "Вариант 1", is_correct: true },
          { text: "Вариант 2", is_correct: false },
        ],
      },
    };
  }
  if (type === "FILL_BLANK") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        text_template: "Заполните пропуск в тексте.",
        blanks: [{ position: 1, correct_text: "Ответ" }],
      },
    };
  }
  if (type === "SHORT_ANSWER") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        max_length: 200,
        case_sensitive: false,
      },
    };
  }
  return {
    title,
    description: "",
    type,
    max_score: 5,
    deadline: null,
    details: {
      max_files: 3,
    },
  };
}

function buildEmptyDraft(homework: HomeworkResponse): HomeworkDraftPayload {
  switch (homework.type) {
    case "SINGLE_CHOICE":
      return { selected_option: null };
    case "MULTIPLE_CHOICE":
      return { selected_options: [] };
    case "FILL_BLANK": {
      const details = homework.details as FillBlankDetails | null;
      const answers = details?.blanks
        ? details.blanks.map((blank) => ({ position: blank.position, answer_text: "" }))
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
  answers: { position: number; answer_text: string }[] | undefined,
) {
  if (!details?.blanks) return answers ?? [];
  const byPosition = new Map((answers ?? []).map((item) => [item.position, item.answer_text]));
  return details.blanks.map((blank) => ({
    position: blank.position,
    answer_text: byPosition.get(blank.position) ?? "",
  }));
}

function buildDraftFromSubmission(
  homework: HomeworkResponse,
  submission: SubmissionResponse,
): HomeworkDraftPayload {
  const details = submission.details as Record<string, any> | null;
  if (!details) return buildEmptyDraft(homework);

  switch (homework.type) {
    case "SINGLE_CHOICE":
      return { selected_option: details.selected_option?.id ?? null };
    case "MULTIPLE_CHOICE":
      return {
        selected_options: Array.isArray(details.selected_options)
          ? details.selected_options.map((option: { id: number }) => option.id)
          : [],
      };
    case "FILL_BLANK": {
      const answers = Array.isArray(details.answers) ? details.answers : [];
      const normalized = normalizeFillBlankAnswers(
        homework.details as FillBlankDetails | null,
        answers,
      );
      return { answers: normalized };
    }
    case "SHORT_ANSWER":
      return { answer_text: details.answer_text ?? "" };
    case "LONG_ANSWER":
      return { answer_text: details.answer_text ?? "", files: [] };
    default:
      return buildEmptyDraft(homework);
  }
}

function renderStudentSubmission(homework: HomeworkResponse, submission: SubmissionResponse) {
  const submissionDetails = submission.details as Record<string, any> | null;
  if (!submissionDetails) {
    return <div className="muted">Ответ не заполнен.</div>;
  }

  if (submission.assignment_type === "SINGLE_CHOICE") {
    const selected = submissionDetails["selected_option"] as { text?: string } | null;
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        <div className="submission-answer-list">
          <div className="submission-answer-item">{selected?.text || "—"}</div>
        </div>
      </div>
    );
  }

  if (submission.assignment_type === "MULTIPLE_CHOICE") {
    const selected = (submissionDetails["selected_options"] as { text?: string }[]) || [];
    const texts = selected.map((option) => option.text || "—");
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        {texts.length === 0 ? (
          <div>—</div>
        ) : (
          <div className="submission-answer-list">
            {texts.map((text, index) => (
              <div key={`${text}-${index}`} className="submission-answer-item">
                {text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (submission.assignment_type === "FILL_BLANK") {
    const answers = (submissionDetails["answers"] as { position: number; answer_text: string }[]) || [];
    const sorted = [...answers].sort((a, b) => a.position - b.position);
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        {sorted.length === 0 ? (
          <div>—</div>
        ) : (
          <div className="submission-answer-list">
            {sorted.map((answer, index) => (
              <div key={index} className="submission-answer-item">
                Пропуск {answer.position}: {answer.answer_text || "—"}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (submission.assignment_type === "SHORT_ANSWER") {
    const answerText = (submissionDetails["answer_text"] as string) || "";
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        <div>{answerText || "—"}</div>
      </div>
    );
  }

  if (submission.assignment_type === "LONG_ANSWER") {
    const answerText = (submissionDetails["answer_text"] as string) || "";
    const files = (submissionDetails["files"] as { id: number; file: string }[]) || [];
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        <div>{answerText || "—"}</div>
        <div className="muted">Файлы</div>
        {files.length === 0 ? (
          <div>—</div>
        ) : (
          <div className="submission-answer-list">
            {files.map((file) => (
              <a
                key={file.id}
                className="submission-file"
                href={resolveFileUrl(file.file)}
                target="_blank"
                rel="noreferrer"
              >
                Файл #{file.id}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div className="muted">Ответ не поддерживается.</div>;
}

function renderForm(
  homework: HomeworkResponse,
  draft: HomeworkDraftPayload,
  onChange: (next: HomeworkDraftPayload) => void,
  disabled: boolean,
) {
  if (!homework.details) {
    return <div className="card">Детали задания отсутствуют</div>;
  }
  switch (homework.type) {
    case "SINGLE_CHOICE":
      return (
        <SingleChoiceForm
          details={homework.details as SingleChoiceDetails}
          value={draft.selected_option ?? null}
          onChange={(selected_option) => onChange({ ...draft, selected_option })}
          disabled={disabled}
        />
      );
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceForm
          details={homework.details as MultipleChoiceDetails}
          value={draft.selected_options ?? []}
          onChange={(selected_options) => onChange({ ...draft, selected_options })}
          disabled={disabled}
        />
      );
    case "FILL_BLANK":
      return (
        <FillBlankForm
          details={homework.details as FillBlankDetails}
          value={normalizeFillBlankAnswers(
            homework.details as FillBlankDetails,
            draft.answers,
          )}
          onChange={(answers) => onChange({ ...draft, answers })}
          disabled={disabled}
        />
      );
    case "SHORT_ANSWER":
      return (
        <ShortAnswerForm
          details={homework.details as ShortAnswerDetails}
          value={draft.answer_text ?? ""}
          onChange={(answer_text) => onChange({ ...draft, answer_text })}
          disabled={disabled}
        />
      );
    case "LONG_ANSWER":
      return (
        <LongAnswerForm
          details={homework.details as LongAnswerDetails}
          value={{
            answer_text: draft.answer_text ?? "",
            files: draft.files ?? [],
          }}
          onChange={(value) => onChange({ ...draft, ...value })}
          disabled={disabled}
        />
      );
    default:
      return <div className="card">Неизвестный тип задания</div>;
  }
}

export function HomeworkDetailPage() {
  const { courseId = "", lessonOrder = "", homeworkOrder = "" } = useParams();
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [submissionsKey, setSubmissionsKey] = useState(0);
  const [homeworksNavKey, setHomeworksNavKey] = useState(0);
  const [homeworkKey, setHomeworkKey] = useState(0);
  const homeworksNavState = useAsync(
    () => fetchHomeworks(courseId, lessonOrder),
    [courseId, lessonOrder, homeworksNavKey],
  );
  const courseState = useAsync(() => fetchCourse(courseId), [courseId]);
  const homeworkState = useAsync(
    () => fetchHomework(courseId, lessonOrder, homeworkOrder),
    [courseId, lessonOrder, homeworkOrder, homeworkKey]
  );
  const submissionsState = useAsync(
    () => fetchSubmissions(courseId, lessonOrder, homeworkOrder),
    [courseId, lessonOrder, homeworkOrder, submissionsKey]
  );
  const [status, setStatus] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [draft, setDraft] = useState<HomeworkDraftPayload | null>(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [lastSubmission, setLastSubmission] = useState<SubmissionResponse | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [creatingType, setCreatingType] = useState<AssignmentType | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const assignmentType = useMemo<AssignmentType | null>(() => {
    if (!homeworkState.data) return null;
    return homeworkState.data.type;
  }, [homeworkState.data]);

  const isStudent = role === "student";
  const studentSubmission = useMemo(() => {
    if (!isStudent || !submissionsState.data || submissionsState.data.length === 0) {
      return null;
    }
    return [...submissionsState.data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [isStudent, submissionsState.data]);
  const displaySubmission = lastSubmission ?? studentSubmission;
  const canEdit = isStudent && (!displaySubmission || displaySubmission.status === "REVISION");
  const canSubmit = canEdit;
  const homeworksList = homeworksNavState.data ?? [];
  const canManageHomework = role === "admin" || (role === "teacher" && courseState.data?.author === userId);
  const steps = homeworksList.length > 0 ? homeworksList : homeworkState.data ? [homeworkState.data] : [];
  const totalMaxScore = steps.reduce((sum, item) => sum + (item.max_score ?? 0), 0);
  const courseTitle = courseState.data?.title ?? `Курс ${courseId}`;
  const currentOrder = Number(homeworkOrder);
  const currentIndex = homeworksList.findIndex((hw) => hw.order === currentOrder);
  const prevHomework = currentIndex > 0 ? homeworksList[currentIndex - 1] : null;
  const nextHomework =
    currentIndex >= 0 && currentIndex < homeworksList.length - 1 ? homeworksList[currentIndex + 1] : null;
  const draftKey = `homework:${courseId}:${lessonOrder}:${homeworkOrder}`;

  useEffect(() => {
    if (!homeworkState.data) return;
    setScoreDraft(String(homeworkState.data.max_score ?? 0));
  }, [homeworkState.data]);

  useEffect(() => {
    let cancelled = false;
    const initDraft = async () => {
      if (!homeworkState.data) return;
      setDraftLoading(true);
      const stored = await loadHomeworkDraft(draftKey);
      if (cancelled) return;
      if (stored && stored.type === homeworkState.data.type) {
        setDraft(stored.payload);
      } else if (canEdit && studentSubmission) {
        setDraft(buildDraftFromSubmission(homeworkState.data, studentSubmission));
      } else {
        setDraft(buildEmptyDraft(homeworkState.data));
      }
      setDraftLoading(false);
    };
    initDraft();
    return () => {
      cancelled = true;
    };
  }, [draftKey, homeworkState.data, canEdit, studentSubmission]);

  useEffect(() => {
    if (!canEdit) {
      clearHomeworkDraft(draftKey);
    }
  }, [canEdit, draftKey]);

  useEffect(() => {
    if (!canEdit || draftLoading || !homeworkState.data || !draft) return;
    const draftType = homeworkState.data.type;
    const draftSnapshot = draft;
    const handle = window.setTimeout(() => {
      saveHomeworkDraft(draftKey, draftType, draftSnapshot);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, canEdit, draftLoading, draftKey, homeworkState.data]);

  const effectiveDraft = draft ?? (homeworkState.data ? buildEmptyDraft(homeworkState.data) : {});

  if (
    homeworkState.loading ||
    submissionsState.loading ||
    homeworksNavState.loading
  ) {
    return <Loader />;
  }
  if (homeworkState.error) return <ErrorState error={homeworkState.error} />;
  if (!homeworkState.data) return <EmptyState label="Домашка не найдена" />;

  const handleSubmit = async () => {
    if (!assignmentType || !homeworkState.data) return;
    if (!canSubmit) {
      setStatus("Ответ уже отправлен и ожидает проверки.");
      return;
    }

    let payload: unknown = null;
    if (assignmentType === "SINGLE_CHOICE") {
      const details = homeworkState.data.details as SingleChoiceDetails | null;
      const selected = effectiveDraft.selected_option;
      const optionIds = new Set((details?.options ?? []).map((option) => option.id));
      if (selected == null || !optionIds.has(selected)) {
        if (selected != null) {
          setDraft((prev) => (prev ? { ...prev, selected_option: null } : prev));
        }
        setStatus("Выберите вариант ответа.");
        return;
      }
      payload = { selected_option: selected };
    } else if (assignmentType === "MULTIPLE_CHOICE") {
      const details = homeworkState.data.details as MultipleChoiceDetails | null;
      const optionIds = new Set((details?.options ?? []).map((option) => option.id));
      const rawSelected = effectiveDraft.selected_options ?? [];
      const selected = rawSelected.filter((id) => optionIds.has(id));
      if (selected.length === 0) {
        setStatus("Выберите хотя бы один вариант ответа.");
        return;
      }
      if (selected.length !== rawSelected.length) {
        setDraft((prev) => (prev ? { ...prev, selected_options: selected } : prev));
      }
      payload = { selected_options: selected };
    } else if (assignmentType === "FILL_BLANK") {
      const answers = normalizeFillBlankAnswers(
        homeworkState.data.details as FillBlankDetails | null,
        effectiveDraft.answers,
      );
      if (answers.length === 0) {
        setStatus("Заполните все пропуски.");
        return;
      }
      if (answers.some((answer) => !answer.answer_text?.trim())) {
        setStatus("Заполните все пропуски.");
        return;
      }
      payload = {
        answers: answers.map((answer) => ({
          ...answer,
          answer_text: answer.answer_text.trim(),
        })),
      };
    } else if (assignmentType === "SHORT_ANSWER") {
      if (!effectiveDraft.answer_text?.trim()) {
        setStatus("Введите ответ.");
        return;
      }
      const maxLength = (homeworkState.data.details as ShortAnswerDetails | null)?.max_length;
      const trimmed = effectiveDraft.answer_text.trim();
      if (maxLength && trimmed.length > maxLength) {
        setStatus(`Ответ не должен превышать ${maxLength} символов.`);
        return;
      }
      payload = { answer_text: trimmed };
    } else if (assignmentType === "LONG_ANSWER") {
      if (!effectiveDraft.answer_text?.trim()) {
        setStatus("Введите ответ.");
        return;
      }
      const maxFiles = (homeworkState.data.details as LongAnswerDetails | null)?.max_files;
      const files = effectiveDraft.files ?? [];
      if (maxFiles && files.length > maxFiles) {
        setStatus(`Можно прикрепить максимум ${maxFiles} файлов.`);
        return;
      }
      const trimmed = effectiveDraft.answer_text.trim();
      payload = {
        answer_text: trimmed,
        files,
      };
    }

    if (!payload) {
      setStatus("Ответ не заполнен.");
      return;
    }

    setSubmitLoading(true);
    setStatus("Отправляем...");
    try {
      const result = await submitHomework(
        courseId,
        lessonOrder,
        homeworkOrder,
        assignmentType,
        payload as never
      );
      setLastSubmission(result);
      setSubmissionsKey((prev) => prev + 1);
      setStatus("Ответ отправлен");
      clearHomeworkDraft(draftKey);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setStatus(details);
      } else {
        setStatus("Не удалось отправить ответ");
      }
      console.error(error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateHomework = async (type: AssignmentType) => {
    const lastOrder = homeworksList.length > 0 ? Math.max(...homeworksList.map((item) => item.order)) : 0;
    const nextOrder = lastOrder + 1;
    const template = buildHomeworkTemplate(type, `Новое ДЗ ${nextOrder}`);
    setCreatingType(type);
    setCreateError(null);
    try {
      const created = await createHomework(courseId, lessonOrder, template);
      setShowTypeMenu(false);
      setHomeworksNavKey((prev) => prev + 1);
      navigate(`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${created.order}`);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setCreateError(details);
      } else {
        setCreateError("Не удалось создать домашнее задание.");
      }
    } finally {
      setCreatingType(null);
    }
  };

  const handleSaveScore = async () => {
    const parsed = Number(scoreDraft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStatus("Баллы должны быть неотрицательным числом.");
      return;
    }
    setScoreSaving(true);
    setStatus(null);
    try {
      await updateHomework(courseId, lessonOrder, homeworkOrder, { max_score: parsed });
      setHomeworksNavKey((prev) => prev + 1);
      setHomeworkKey((prev) => prev + 1);
      setStatus("Баллы сохранены.");
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setStatus(details);
      } else {
        setStatus("Не удалось сохранить баллы.");
      }
    } finally {
      setScoreSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    const confirmed = window.confirm(`Удалить ДЗ #${homeworkOrder}?`);
    if (!confirmed) return;
    setDeleteLoading(true);
    setStatus(null);
    try {
      await deleteHomework(courseId, lessonOrder, homeworkOrder);
      setHomeworksNavKey((prev) => prev + 1);
      navigate(`/courses/${courseId}/lessons/${lessonOrder}`);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setStatus(details);
      } else {
        setStatus("Не удалось удалить задание.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Домашнее задание</h1>
          <div className="meta-row">
            <span className="course-tag">{courseTitle}</span>
            <span className="course-tag">Урок {lessonOrder}</span>
          </div>
        </div>
        <div className="meta-row">
          <span className="meta-pill">Балл за задание: {homeworkState.data.max_score}</span>
          <span className="meta-pill">Максимальный балл: {totalMaxScore}</span>
          {homeworkState.data.deadline && (
            <span
              className={`meta-pill ${
                new Date(homeworkState.data.deadline).getTime() < Date.now() ? "danger" : ""
              }`}
            >
              Дедлайн: {formatDateTime(homeworkState.data.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="courses-hero homework-panel">
        <div className="homework-steps">
          {steps.map((homework) => (
            <Link
              key={homework.order}
              className={`homework-step ${homework.order === currentOrder ? "active" : ""}`}
              to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homework.order}`}
              title={homework.title}
            >
              <span className="homework-step-order">{homework.order}</span>
              <span className="homework-step-score">{homework.max_score}</span>
            </Link>
          ))}
          {canManageHomework && (
            <div className="homework-add-wrap">
              <button
                className="homework-add-trigger"
                type="button"
                onClick={() => setShowTypeMenu((prev) => !prev)}
                aria-label="Добавить домашнее задание"
              >
                +
              </button>
              {showTypeMenu && (
                <div className="homework-type-popover">
                  {HOMEWORK_TYPE_ITEMS.map((item) => (
                    <button
                      key={item.type}
                      className="homework-type-option"
                      type="button"
                      disabled={creatingType !== null}
                      onClick={() => handleCreateHomework(item.type)}
                    >
                      {creatingType === item.type ? "Создаем..." : item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {createError && <div className="auth-error">{createError}</div>}
        {canManageHomework && (
          <div className="homework-manage-row">
            <div className="homework-score-edit">
              <span className="muted">Баллы за это задание</span>
              <NumberInput
                min={0}
                value={scoreDraft}
                onChange={setScoreDraft}
                placeholder="Баллы"
              />
              <button
                className="secondary"
                type="button"
                disabled={scoreSaving}
                onClick={handleSaveScore}
              >
                {scoreSaving ? "Сохраняем..." : "Сохранить баллы"}
              </button>
            </div>
            <button
              className="danger"
              type="button"
              disabled={deleteLoading}
              onClick={handleDeleteCurrent}
            >
              {deleteLoading ? "Удаляем..." : `Удалить ДЗ #${homeworkOrder}`}
            </button>
          </div>
        )}
        <div className="homework-box">
          <div className="muted">Описание задания</div>
          <div>{homeworkState.data.description || "Описание отсутствует"}</div>
        </div>
        <div className="homework-box">
          <div className="muted">Задание</div>
          {homeworkState.data.title && <div>{homeworkState.data.title}</div>}
          <div className="homework-form">
            {isStudent ? (
              canEdit ? (
                draftLoading ? (
                  <div className="muted">Загружаем черновик...</div>
                ) : (
                  renderForm(homeworkState.data, effectiveDraft, setDraft, false)
                )
              ) : displaySubmission ? (
                renderStudentSubmission(homeworkState.data, displaySubmission)
              ) : (
                <div className="muted">Ответ не найден.</div>
              )
            ) : (
              <div className="muted">Решение домашнего задания доступно только студентам.</div>
            )}
          </div>
        </div>
        {status && <div className="muted">{status}</div>}
        <div className="homework-actions">
          <button
            className="homework-nav-button"
            type="button"
            disabled={!prevHomework}
            onClick={() => {
              if (prevHomework) {
                navigate(`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${prevHomework.order}`);
              }
            }}
          >
            Предыдущее
          </button>
          <div className="homework-actions-right">
            {nextHomework ? (
              <button
                className="homework-nav-button"
                type="button"
                onClick={() => {
                  navigate(`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${nextHomework.order}`);
                }}
              >
                Следующее
              </button>
            ) : (
              canEdit && (
                <button
                  className="auth-button"
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitLoading || draftLoading}
                >
                  {submitLoading ? "Отправляем..." : "Сохранить и отправить"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
