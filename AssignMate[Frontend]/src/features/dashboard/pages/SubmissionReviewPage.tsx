import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchHomework,
  fetchSubmission,
  fetchSubmissions,
  reviewSubmission,
} from "@/features/assignments/api";
import type {
  FillBlankDetails,
  HomeworkResponse,
  LongAnswerDetails,
  MultipleChoiceDetails,
  ShortAnswerDetails,
  SingleChoiceDetails,
  SubmissionResponse,
} from "@/features/assignments/types";
import { getAssignmentTypeLabel } from "@/features/assignments/types";
import { fetchCourseStudentDetail } from "@/features/dashboard/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { NumberInput } from "@/shared/ui/NumberInput";
import { formatDateTime } from "@/shared/utils/date";
import type { ApiError } from "@/shared/api/base";

const STATUS_TEXT: Record<string, string> = {
  PENDING: "На проверке",
  REVISION: "На доработке",
  GRADED: "Оценено",
};

const TIMELINESS_TEXT: Record<string, string> = {
  ON_TIME: "В срок",
  LATE: "С опозданием",
};

function statusPillClass(status: string) {
  if (status === "GRADED") return "status-pill status-pill-success";
  if (status === "REVISION") return "status-pill status-pill-danger";
  if (status === "PENDING") return "status-pill status-pill-warning";
  return "status-pill status-pill-neutral";
}

function timelinessPillClass(value: string) {
  if (value === "ON_TIME") return "status-pill status-pill-success";
  if (value === "LATE") return "status-pill status-pill-warning";
  return "status-pill status-pill-neutral";
}

type Option = { id: number; text: string; is_correct?: boolean };

function renderAssignmentPrompt(hw: HomeworkResponse) {
  switch (hw.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const details = hw.details as SingleChoiceDetails | MultipleChoiceDetails | null;
      const options = details?.options ?? [];
      return (
        <div className="answer-options">
          {options.map((option, index) => (
            <div
              key={option.id}
              className={`answer-option ${option.is_correct ? "correct" : ""}`}
            >
              <span className="answer-option-num">{index + 1}</span>
              <span className="answer-option-text">{option.text}</span>
              {option.is_correct ? (
                <span className="answer-option-badge correct">Верный</span>
              ) : null}
            </div>
          ))}
        </div>
      );
    }
    case "FILL_BLANK": {
      const details = hw.details as FillBlankDetails | null;
      return (
        <div className="answer-blanks">
          <div className="answer-blanks-template">{details?.text_template || ""}</div>
          {details?.blanks?.length ? (
            <div className="answer-blanks-list">
              <div className="muted answer-blanks-caption">Правильные ответы</div>
              {details.blanks.map((blank) => (
                <div key={blank.position} className="answer-blank-row">
                  <span className="answer-blank-pos">#{blank.position}</span>
                  <span className="answer-blank-correct">{blank.correct_text}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
    case "SHORT_ANSWER": {
      const details = hw.details as ShortAnswerDetails | null;
      return (
        <div className="answer-hint">
          <div className="muted">Краткий текстовый ответ</div>
          {details?.max_length ? (
            <div className="muted" style={{ marginTop: 4 }}>
              Макс. длина: {details.max_length} симв.
            </div>
          ) : null}
        </div>
      );
    }
    case "LONG_ANSWER": {
      const details = hw.details as LongAnswerDetails | null;
      return (
        <div className="answer-hint">
          <div className="muted">Развернутый ответ с возможностью прикрепить файлы</div>
          {details?.max_files ? (
            <div className="muted" style={{ marginTop: 4 }}>
              Макс. файлов: {details.max_files}
            </div>
          ) : null}
        </div>
      );
    }
    default:
      return <div className="muted">Нет описания типа задания</div>;
  }
}

function renderStudentAnswer(hw: HomeworkResponse, submission: SubmissionResponse) {
  const details = (submission.details ?? {}) as Record<string, unknown>;

  switch (submission.assignment_type) {
    case "SINGLE_CHOICE": {
      const selected = details.selected_option as Option | null;
      const optionsAll = (hw.details as SingleChoiceDetails | null)?.options ?? [];
      return (
        <div className="answer-options">
          {optionsAll.map((option, index) => {
            const isSelected = selected?.id === option.id;
            const isCorrect = Boolean(option.is_correct);
            const cls =
              isSelected && isCorrect
                ? "correct selected"
                : isSelected
                ? "wrong selected"
                : isCorrect
                ? "correct"
                : "";
            return (
              <div key={option.id} className={`answer-option ${cls}`}>
                <span className="answer-option-num">{index + 1}</span>
                <span className="answer-option-text">{option.text}</span>
                {isSelected && (
                  <span className="answer-option-badge">Ответ студента</span>
                )}
                {!isSelected && isCorrect && (
                  <span className="answer-option-badge correct">Верный</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    case "MULTIPLE_CHOICE": {
      const selectedList = (details.selected_options as Option[] | undefined) ?? [];
      const selectedIds = new Set(selectedList.map((o) => o.id));
      const optionsAll = (hw.details as MultipleChoiceDetails | null)?.options ?? [];
      return (
        <div className="answer-options">
          {optionsAll.map((option, index) => {
            const isSelected = selectedIds.has(option.id);
            const isCorrect = Boolean(option.is_correct);
            const cls =
              isSelected && isCorrect
                ? "correct selected"
                : isSelected
                ? "wrong selected"
                : isCorrect
                ? "correct"
                : "";
            return (
              <div key={option.id} className={`answer-option ${cls}`}>
                <span className="answer-option-num">{index + 1}</span>
                <span className="answer-option-text">{option.text}</span>
                {isSelected && (
                  <span className="answer-option-badge">Выбрано</span>
                )}
                {!isSelected && isCorrect && (
                  <span className="answer-option-badge correct">Верный</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    case "FILL_BLANK": {
      const answers = (details.answers as { position: number; answer_text: string }[] | undefined) ?? [];
      const blanks = (hw.details as FillBlankDetails | null)?.blanks ?? [];
      const correctByPos = new Map(blanks.map((b) => [b.position, b.correct_text]));
      return (
        <div className="answer-blanks-list">
          {answers.map((answer) => {
            const correct = correctByPos.get(answer.position);
            const isCorrect =
              correct != null && answer.answer_text.trim() === correct.trim();
            return (
              <div key={answer.position} className="answer-blank-row">
                <span className="answer-blank-pos">#{answer.position}</span>
                <span
                  className={`answer-blank-value ${isCorrect ? "correct" : "wrong"}`}
                >
                  {answer.answer_text || "—"}
                </span>
                {!isCorrect && correct != null && (
                  <span className="answer-blank-expected">ожидалось: {correct}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    case "SHORT_ANSWER": {
      const text = (details.answer_text as string | undefined) ?? "";
      return <div className="answer-text">{text || <span className="muted">Пусто</span>}</div>;
    }
    case "LONG_ANSWER": {
      const text = (details.answer_text as string | undefined) ?? "";
      const files = (details.files as { id: number; file: string }[] | undefined) ?? [];
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const origin = (() => {
        try {
          return new URL(apiBase).origin;
        } catch {
          return "";
        }
      })();
      return (
        <div className="answer-long">
          <div className="answer-text">
            {text || <span className="muted">Без текстового ответа</span>}
          </div>
          {files.length > 0 && (
            <div className="answer-files">
              <div className="muted answer-files-caption">Прикреплённые файлы</div>
              {files.map((file) => {
                const href = file.file.startsWith("http")
                  ? file.file
                  : `${origin}${file.file}`;
                const name = file.file.split("/").pop() ?? file.file;
                return (
                  <a
                    key={file.id}
                    className="answer-file-link"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="answer-file-icon" aria-hidden>
                      📎
                    </span>
                    <span className="answer-file-name">{name}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    default:
      return <div className="muted">Ответ отсутствует</div>;
  }
}

function formatApiError(error: unknown) {
  const apiError = error as ApiError | null;
  const details = apiError?.details;
  if (typeof details === "string") return details;
  if (details && typeof details === "object") {
    const firstKey = Object.keys(details)[0];
    if (firstKey) {
      const value = (details as Record<string, unknown>)[firstKey];
      return typeof value === "string" ? value : JSON.stringify(value);
    }
  }
  return apiError?.status ? `Ошибка ${apiError.status}` : "Ошибка отправки";
}

export function SubmissionReviewPage() {
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  const { courseId, studentId, homeworkOrder } = useParams();
  const navigate = useNavigate();

  const studentState = useAsync(
    () =>
      courseId && studentId
        ? fetchCourseStudentDetail(courseId, studentId)
        : Promise.resolve(null),
    [courseId, studentId]
  );

  const homeworkEntry = useMemo(() => {
    if (!studentState.data || !homeworkOrder) return null;
    return (
      studentState.data.homeworks.find(
        (item) => String(item.homework_order) === String(homeworkOrder)
      ) ?? null
    );
  }, [studentState.data, homeworkOrder]);

  const lessonOrder = homeworkEntry?.lesson_order ?? null;

  const homeworkState = useAsync(
    () =>
      courseId && lessonOrder != null && homeworkOrder
        ? fetchHomework(courseId, String(lessonOrder), homeworkOrder)
        : Promise.resolve(null),
    [courseId, lessonOrder, homeworkOrder]
  );

  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId || lessonOrder == null || !homeworkOrder || !studentId) return;
      setSubmissionLoading(true);
      setSubmissionError(null);
      try {
        const all = await fetchSubmissions(courseId, String(lessonOrder), homeworkOrder);
        const match = all.find((item) => String(item.student) === String(studentId)) ?? null;
        if (!cancelled) setSubmission(match);
      } catch (err) {
        if (!cancelled) setSubmissionError(err);
      } finally {
        if (!cancelled) setSubmissionLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonOrder, homeworkOrder, studentId]);

  const [formOpen, setFormOpen] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!submission) return;
    if (submission.review === null) {
      setFormOpen(true);
      setScoreInput("");
      setCommentInput("");
    } else {
      setFormOpen(false);
      setScoreInput(String(submission.review.score));
      setCommentInput(submission.review.comment ?? "");
    }
  }, [submission?.id, submission?.review?.id]);

  if (studentState.loading) return <Loader label="Загружаем данные ученика..." />;
  if (studentState.error) return <ErrorState error={studentState.error} />;
  if (!studentState.data) return <EmptyState label="Данные ученика не найдены." />;

  if (!homeworkEntry) {
    return <EmptyState label="Домашнее задание не найдено у этого ученика." />;
  }

  if (homeworkState.loading) return <Loader label="Загружаем задание..." />;
  if (homeworkState.error) return <ErrorState error={homeworkState.error} />;
  if (!homeworkState.data) return <EmptyState label="Задание не найдено." />;

  const homework = homeworkState.data;
  const student = studentState.data;
  const studentName =
    `${student.first_name} ${student.last_name}`.trim() || "Без имени";

  if (submissionLoading) return <Loader label="Загружаем ответ студента..." />;
  if (submissionError) return <ErrorState error={submissionError} />;
  if (!submission) {
    return (
      <div className="courses-page">
        <div className="page-header">
          <div>
            <h1>Проверка домашнего задания</h1>
            <p>
              {studentName} · {homework.title}
            </p>
          </div>
        </div>
        <EmptyState label="Студент ещё не сдал это задание." />
      </div>
    );
  }

  const maxScore = homework.max_score;

  const handleGrade = async () => {
    if (!courseId || lessonOrder == null || !homeworkOrder) return;
    const score = Number(scoreInput);
    if (!Number.isFinite(score) || scoreInput.trim() === "") {
      setFormError("Введите оценку от 0 до " + maxScore + ".");
      return;
    }
    if (score < 0 || score > maxScore) {
      setFormError("Оценка должна быть от 0 до " + maxScore + ".");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      const updated = await reviewSubmission(
        courseId,
        String(lessonOrder),
        homeworkOrder,
        submission.id,
        { score, comment: commentInput.trim(), return_for_revision: false }
      );
      setSubmission(updated);
      setFormOpen(false);
      setSuccessMessage("Ревью сохранено.");
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!courseId || lessonOrder == null || !homeworkOrder) return;
    const comment = commentInput.trim();
    if (!comment) {
      setFormError("Для возврата на доработку укажите комментарий.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      const updated = await reviewSubmission(
        courseId,
        String(lessonOrder),
        homeworkOrder,
        submission.id,
        { comment, return_for_revision: true }
      );
      setSubmission(updated);
      setFormOpen(false);
      setSuccessMessage("Задание отправлено на доработку.");
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    if (!courseId || lessonOrder == null || !homeworkOrder) return;
    try {
      const fresh = await fetchSubmission(
        courseId,
        String(lessonOrder),
        homeworkOrder,
        submission.id
      );
      setSubmission(fresh);
    } catch {
      // ignore
    }
  };

  const openEditForm = () => {
    setFormOpen(true);
    setFormError(null);
    setSuccessMessage(null);
    if (submission.review) {
      setScoreInput(String(submission.review.score));
      setCommentInput(submission.review.comment ?? "");
    }
  };

  const scoreNum = Number(scoreInput);
  const gradeDisabled =
    submitting ||
    scoreInput.trim() === "" ||
    !Number.isFinite(scoreNum) ||
    scoreNum < 0 ||
    scoreNum > maxScore;
  const returnDisabled = submitting || commentInput.trim().length === 0;

  const review = submission.review;
  const backPath = `/dashboard/courses/${courseId}/students/${studentId}`;

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Проверка домашнего задания</h1>
          <p>
            {studentName} · {homework.title}
          </p>
        </div>
        <Link to={backPath} className="action-button-link secondary">
          К ученику
        </Link>
      </div>

      <div className="courses-hero">
        <div className="row space-between wrap">
          <div className="row wrap" style={{ gap: 10 }}>
            <span className={statusPillClass(submission.status)}>
              {STATUS_TEXT[submission.status] ?? submission.status}
            </span>
            <span className={timelinessPillClass(submission.timeliness_status)}>
              {TIMELINESS_TEXT[submission.timeliness_status] ?? submission.timeliness_status}
            </span>
            <span className="meta-pill">{getAssignmentTypeLabel(homework.type)}</span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Отправлено {formatDateTime(submission.created_at)}
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Макс. балл</div>
            <div className="stat-value">{maxScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Текущая оценка</div>
            <div className="stat-value">
              {review ? `${review.score} / ${maxScore}` : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Урок</div>
            <div className="stat-value stat-value-small">
              {homeworkEntry.lesson_order}. {homeworkEntry.lesson_title}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Статус</div>
            <div className="stat-value stat-value-small">
              {STATUS_TEXT[submission.status] ?? submission.status}
            </div>
          </div>
        </div>
      </div>

      <div className="submission-review-panel">
        <div className="courses-hero">
          <h3>Условие задания</h3>
          {homework.description ? (
            <p className="answer-description">{homework.description}</p>
          ) : (
            <p className="muted">Описание отсутствует.</p>
          )}
          {renderAssignmentPrompt(homework)}
        </div>
        <div className="courses-hero">
          <h3>Ответ студента</h3>
          {renderStudentAnswer(homework, submission)}
        </div>
      </div>

      <div className="courses-hero review-form">
        <div className="row space-between wrap" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Оценивание</h3>
          {review && !formOpen && (
            <button type="button" className="secondary" onClick={openEditForm}>
              Переоценить
            </button>
          )}
        </div>

        {review && !formOpen && (
          <div className="review-card">
            <div className="row space-between wrap">
              <div>
                <div className="review-score">
                  <span className="review-score-value">{review.score}</span>
                  <span className="review-score-total">/ {maxScore}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Проверено {formatDateTime(review.updated_at)}
                </div>
              </div>
              <span className={statusPillClass(submission.status)}>
                {STATUS_TEXT[submission.status] ?? submission.status}
              </span>
            </div>
            {review.comment ? (
              <div className="review-comment">{review.comment}</div>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>Без комментария</div>
            )}
          </div>
        )}

        {formOpen && (
          <div className="review-form-body">
            <div className="review-form-row">
              <label htmlFor="review-score">Оценка (0–{maxScore})</label>
              <NumberInput
                id="review-score"
                value={scoreInput}
                min={0}
                max={maxScore}
                onChange={setScoreInput}
                placeholder="0"
              />
            </div>
            <div className="review-form-row">
              <label htmlFor="review-comment">Комментарий</label>
              <textarea
                id="review-comment"
                className="auth-input"
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                rows={4}
                placeholder="Напишите обратную связь для студента..."
              />
            </div>

            {formError && <div className="auth-error">{formError}</div>}

            <div className="wizard-footer">
              {review && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setFormOpen(false);
                    setFormError(null);
                    handleRefresh();
                  }}
                  disabled={submitting}
                >
                  Отмена
                </button>
              )}
              <div className="row" style={{ gap: 10, marginLeft: "auto" }}>
                <button
                  type="button"
                  className="danger"
                  onClick={handleReturn}
                  disabled={returnDisabled}
                  title={
                    returnDisabled && !submitting
                      ? "Укажите комментарий"
                      : undefined
                  }
                >
                  Вернуть на доработку
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleGrade}
                  disabled={gradeDisabled}
                >
                  {submitting ? "Сохраняем…" : "Оценить"}
                </button>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="review-success">{successMessage}</div>
        )}
      </div>

      <div className="row" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="secondary" onClick={() => navigate(backPath)}>
          Вернуться к ученику
        </button>
      </div>
    </div>
  );
}
