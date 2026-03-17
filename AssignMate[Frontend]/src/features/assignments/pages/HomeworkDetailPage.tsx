import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchHomework, fetchSubmissions, submitHomework, reviewSubmission } from "@/features/assignments/api";
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
import { getAssignmentTypeLabel } from "@/features/assignments/types";
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

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: "На проверке",
  REVISION: "Возвращено",
  GRADED: "Оценено",
};

const TIMELINESS_LABELS: Record<string, string> = {
  ON_TIME: "Во время",
  LATE: "Опоздал",
};

const statusPillClass = (status?: string) => {
  if (status === "PENDING") return "meta-pill warning";
  if (status === "GRADED") return "meta-pill success";
  return "meta-pill";
};

const timelinessPillClass = (status?: string) => {
  if (status === "ON_TIME") return "meta-pill success";
  if (status === "LATE") return "meta-pill danger";
  return "meta-pill";
};

function renderSubmissionWithTask(homework: HomeworkResponse, submission: SubmissionResponse) {
  const assignmentDetails = homework.details as Record<string, unknown> | null;
  const submissionDetails = submission.details as Record<string, unknown> | null;

  if (!assignmentDetails || !submissionDetails) {
    return <div className="muted">Ответ не заполнен.</div>;
  }

  if (submission.assignment_type === "SINGLE_CHOICE") {
    const options =
      (assignmentDetails["options"] as { id: number; text: string; is_correct?: boolean }[]) || [];
    const selected = submissionDetails["selected_option"] as { id?: number; text?: string } | null;
    const correct = options.find((option) => option.is_correct);
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        <div className="submission-answer-list">
          <div className="submission-answer-item">{selected?.text || "—"}</div>
        </div>
        {correct?.text && (
          <>
            <div className="muted">Правильный ответ</div>
            <div className="submission-answer-list">
              <div className="submission-answer-item">{correct.text}</div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (submission.assignment_type === "MULTIPLE_CHOICE") {
    const options =
      (assignmentDetails["options"] as { id: number; text: string; is_correct?: boolean }[]) || [];
    const selected = (submissionDetails["selected_options"] as { id?: number; text?: string }[]) || [];
    const selectedIds = new Set(selected.map((opt) => opt.id));
    const selectedTexts = selected.map((opt) => {
      if (opt.text) return opt.text;
      const fromOptions = options.find((option) => option.id === opt.id);
      return fromOptions?.text ?? "—";
    });
    const correctTexts = options.filter((option) => option.is_correct).map((option) => option.text);
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        {selectedTexts.length === 0 ? (
          <div>—</div>
        ) : (
          <div className="submission-answer-list">
            {selectedTexts.map((text, index) => (
              <div key={`${text}-${index}`} className="submission-answer-item">
                {text || "—"}
              </div>
            ))}
          </div>
        )}
        {correctTexts.length > 0 && (
          <>
            <div className="muted">Правильные ответы</div>
            <div className="submission-answer-list">
              {correctTexts.map((text, index) => (
                <div key={`${text}-${index}`} className="submission-answer-item">
                  {text}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (submission.assignment_type === "FILL_BLANK") {
    const blanks =
      (assignmentDetails["blanks"] as { position: number; correct_text: string }[]) || [];
    const answers = (submissionDetails["answers"] as { position: number; answer_text: string }[]) || [];
    const sortedAnswers = [...answers].sort((a, b) => a.position - b.position);
    const correctByPosition = new Map(blanks.map((blank) => [blank.position, blank.correct_text]));
    return (
      <div className="submission-details">
        <div className="muted">Ответ ученика</div>
        {sortedAnswers.length === 0 ? (
          <div>—</div>
        ) : (
          <div className="submission-answer-list">
            {sortedAnswers.map((answer, index) => (
              <div key={index} className="submission-answer-item">
                Пропуск {answer.position}: {answer.answer_text || "—"}
                {correctByPosition.has(answer.position) && (
                  <div className="muted">
                    Правильный ответ: {correctByPosition.get(answer.position) || "—"}
                  </div>
                )}
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
  onSubmit: (payload: unknown) => void
) {
  if (!homework.details) {
    return <div className="card">Детали задания отсутствуют</div>;
  }
  switch (homework.type) {
    case "SINGLE_CHOICE":
      return (
        <SingleChoiceForm
          details={homework.details as SingleChoiceDetails}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceForm
          details={homework.details as MultipleChoiceDetails}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "FILL_BLANK":
      return (
        <FillBlankForm
          details={homework.details as FillBlankDetails}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "SHORT_ANSWER":
      return (
        <ShortAnswerForm
          details={homework.details as ShortAnswerDetails}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "LONG_ANSWER":
      return (
        <LongAnswerForm
          details={homework.details as LongAnswerDetails}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    default:
      return <div className="card">Неизвестный тип задания</div>;
  }
}

export function HomeworkDetailPage() {
  const { courseId = "", lessonOrder = "", homeworkOrder = "" } = useParams();
  const { role } = useAuth();
  const [submissionsKey, setSubmissionsKey] = useState(0);
  const homeworksNavState = useAsync(() => fetchHomeworks(courseId, lessonOrder), [courseId, lessonOrder]);
  const homeworkState = useAsync(
    () => fetchHomework(courseId, lessonOrder, homeworkOrder),
    [courseId, lessonOrder, homeworkOrder]
  );
  const submissionsState = useAsync(
    () => fetchSubmissions(courseId, lessonOrder, homeworkOrder),
    [courseId, lessonOrder, homeworkOrder, submissionsKey]
  );
  const [status, setStatus] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SubmissionResponse | null>(null);
  const [reviewScores, setReviewScores] = useState<Record<number, string>>({});
  const [reviewComments, setReviewComments] = useState<Record<number, string>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<number, string>>({});
  const [reviewLoadingId, setReviewLoadingId] = useState<number | null>(null);
  const [reviewEditOpen, setReviewEditOpen] = useState<Record<number, boolean>>({});
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
  const isReviewer = role === "teacher" || role === "admin" || role === "assistant";
  const studentSubmission = useMemo(() => {
    if (!isStudent || !submissionsState.data || submissionsState.data.length === 0) {
      return null;
    }
    return [...submissionsState.data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [isStudent, submissionsState.data]);
  const canSubmit = isStudent && (!studentSubmission || studentSubmission.status === "REVISION");
  const displaySubmission = lastSubmission ?? studentSubmission;

  if (
    homeworkState.loading ||
    submissionsState.loading ||
    homeworksNavState.loading
  ) {
    return <Loader />;
  }
  if (homeworkState.error) return <ErrorState error={homeworkState.error} />;
  if (!homeworkState.data) return <EmptyState label="Домашка не найдена" />;

  const homeworksList = homeworksNavState.data ?? [];
  const currentOrder = Number(homeworkOrder);
  const currentIndex = homeworksList.findIndex((hw) => hw.order === currentOrder);
  const prevHomework = currentIndex > 0 ? homeworksList[currentIndex - 1] : null;
  const nextHomework =
    currentIndex >= 0 && currentIndex < homeworksList.length - 1 ? homeworksList[currentIndex + 1] : null;

  const handleSubmit = async (payload: unknown) => {
    if (!assignmentType) return;
    if (!canSubmit) {
      setStatus("Ответ уже отправлен и ожидает проверки.");
      return;
    }
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
    } catch (error) {
      setStatus("Не удалось отправить ответ");
      console.error(error);
    }
  };

  const handleReviewScoreChange = (submissionId: number, value: string) => {
    setReviewScores((prev) => ({ ...prev, [submissionId]: value }));
  };

  const handleReviewCommentChange = (submissionId: number, value: string) => {
    setReviewComments((prev) => ({ ...prev, [submissionId]: value }));
  };

  const handleGrade = async (submission: SubmissionResponse) => {
    if (!homeworkState.data) return;
    const raw = reviewScores[submission.id] ?? "";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > homeworkState.data.max_score) {
      setReviewErrors((prev) => ({
        ...prev,
        [submission.id]: `Оценка должна быть от 0 до ${homeworkState.data.max_score}.`,
      }));
      return;
    }
    setReviewErrors((prev) => ({ ...prev, [submission.id]: "" }));
    setReviewLoadingId(submission.id);
    try {
      await reviewSubmission(courseId, lessonOrder, homeworkOrder, submission.id, {
        score: parsed,
        comment: reviewComments[submission.id] ?? "",
      });
      setSubmissionsKey((prev) => prev + 1);
      setReviewEditOpen((prev) => ({ ...prev, [submission.id]: false }));
    } catch (error) {
      setReviewErrors((prev) => ({
        ...prev,
        [submission.id]: "Не удалось выставить оценку.",
      }));
      console.error(error);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleRevision = async (submission: SubmissionResponse) => {
    setReviewErrors((prev) => ({ ...prev, [submission.id]: "" }));
    setReviewLoadingId(submission.id);
    try {
      await reviewSubmission(courseId, lessonOrder, homeworkOrder, submission.id, {
        return_for_revision: true,
        comment: reviewComments[submission.id] ?? "",
      });
      setSubmissionsKey((prev) => prev + 1);
      setReviewEditOpen((prev) => ({ ...prev, [submission.id]: false }));
    } catch (error) {
      setReviewErrors((prev) => ({
        ...prev,
        [submission.id]: "Не удалось вернуть восвояси.",
      }));
      console.error(error);
    } finally {
      setReviewLoadingId(null);
    }
  };

  return (
    <div className="courses-page">
      <div className="courses-hero page-nav">
        <div className="nav-actions">
          {prevHomework ? (
            <Link
              className="nav-button"
              to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${prevHomework.order}`}
              title="Предыдущее ДЗ"
            >
              <span className="nav-chev">‹</span>
              <span className="nav-text">Предыдущее ДЗ</span>
            </Link>
          ) : (
            <span className="nav-button disabled" title="Предыдущего ДЗ нет">
              <span className="nav-chev">‹</span>
              <span className="nav-text">Предыдущее ДЗ</span>
            </span>
          )}
          {nextHomework ? (
            <Link
              className="nav-button"
              to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${nextHomework.order}`}
              title="Следующее ДЗ"
            >
              <span className="nav-text">Следующее ДЗ</span>
              <span className="nav-chev">›</span>
            </Link>
          ) : (
            <span className="nav-button disabled" title="Следующего ДЗ нет">
              <span className="nav-text">Следующее ДЗ</span>
              <span className="nav-chev">›</span>
            </span>
          )}
        </div>
      </div>
      <div className="page-header">
        <div>
          <h1>{homeworkState.data.order}. {homeworkState.data.title}</h1>
          <p>{homeworkState.data.description || "Описание отсутствует"}</p>
        </div>
        <div className="meta-row">
          <span className="meta-pill">{getAssignmentTypeLabel(homeworkState.data.type)}</span>
          <span className="meta-pill">Максимальный балл: {homeworkState.data.max_score}</span>
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

      {!isReviewer && (
        <div className="courses-hero">
          <h3>Мой ответ</h3>
          {isStudent ? (
          <>
            {canSubmit ? (
              renderForm(homeworkState.data, handleSubmit)
            ) : (
              <div className="muted">
                Ответ уже отправлен. Статус проверки:{" "}
                {studentSubmission ? REVIEW_STATUS_LABELS[studentSubmission.status] ?? studentSubmission.status : "—"}
              </div>
            )}
            {status && <div className="muted">{status}</div>}
          </>
          ) : (
            <p>Решение домашнего задания доступно только студентам.</p>
          )}
        </div>
      )}

      {isStudent && (
        <div className="courses-hero">
          <h3>Последняя отправка</h3>
          {displaySubmission ? (
            <div className="meta-row">
              <span className={statusPillClass(displaySubmission.status)}>
                Статус: {REVIEW_STATUS_LABELS[displaySubmission.status] ?? displaySubmission.status}
              </span>
              <span className={timelinessPillClass(displaySubmission.timeliness_status)}>
                Сдано: {TIMELINESS_LABELS[displaySubmission.timeliness_status] ?? displaySubmission.timeliness_status}
              </span>
              <span className="meta-pill">
                Оценка: {displaySubmission.review ? displaySubmission.review.score : "—"}
              </span>
            </div>
          ) : (
            <div className="muted">Пока нет отправок</div>
          )}
        </div>
      )}

      <div className="courses-hero">
        <h3>{isReviewer ? "Ответы учеников" : "История отправок"}</h3>
        {submissionsState.error && <ErrorState error={submissionsState.error} />}
        {!submissionsState.data || submissionsState.data.length === 0 ? (
          <div className="muted">Отправок нет</div>
        ) : (
          submissionsState.data.map((submission) => {
            const scoreValue =
              reviewScores[submission.id] ??
              (submission.review ? String(submission.review.score) : "");
            const commentValue =
              reviewComments[submission.id] ??
              (submission.review ? submission.review.comment : "");
            const isLocked =
              (submission.status === "GRADED" || submission.status === "REVISION") &&
              !reviewEditOpen[submission.id];
            return (
              <div key={submission.id} className="course-card">
                <div className="submission-header">
                  <div className="submission-summary">
                    <strong>{submission.student_name || `Ответ #${submission.id}`}</strong>
                    <div className="meta-row">
                      <span className={statusPillClass(submission.status)}>
                        Статус: {REVIEW_STATUS_LABELS[submission.status] ?? submission.status}
                      </span>
                      <span className={timelinessPillClass(submission.timeliness_status)}>
                        Сдано: {TIMELINESS_LABELS[submission.timeliness_status] ?? submission.timeliness_status}
                      </span>
                      <span className="meta-pill">
                        Оценка: {submission.review ? submission.review.score : "—"}
                      </span>
                    </div>
                  </div>
                  {isReviewer && isLocked && (
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setReviewEditOpen((prev) => ({ ...prev, [submission.id]: true }))}
                    >
                      Редактировать оценку
                    </button>
                  )}
                </div>
                {isReviewer && (
                  <>
                    {isLocked ? (
                      <div className="form-actions end" />
                    ) : (
                      <div className="stack">
                        <div className="row">
                          <NumberInput
                            min={0}
                            max={homeworkState.data?.max_score ?? 100}
                            placeholder="Оценка"
                            value={scoreValue}
                            onChange={(value) => handleReviewScoreChange(submission.id, value)}
                          />
                          <button
                            className="auth-button"
                            type="button"
                            disabled={reviewLoadingId === submission.id}
                            onClick={() => handleGrade(submission)}
                          >
                            {submission.status === "GRADED" ? "Сохранить" : "Оценить"}
                          </button>
                          <button
                            className="secondary"
                            type="button"
                            disabled={reviewLoadingId === submission.id}
                            onClick={() => handleRevision(submission)}
                          >
                            Вернуть восвояси
                          </button>
                        </div>
                        <textarea
                          className="auth-input"
                          rows={2}
                          placeholder="Комментарий (опционально)"
                          value={commentValue}
                          onChange={(event) => handleReviewCommentChange(submission.id, event.target.value)}
                        />
                        {reviewErrors[submission.id] && (
                          <div className="auth-error">{reviewErrors[submission.id]}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {!isLocked && renderSubmissionWithTask(homeworkState.data, submission)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
