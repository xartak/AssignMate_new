import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchLesson, fetchHomeworks } from "@/features/lessons/api";
import { deleteLesson, fetchCourse, fetchLessons, updateLesson } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { createHomework } from "@/features/assignments/api";
import type { AssignmentType } from "@/features/assignments/types";
import { getAssignmentTypeLabel } from "@/features/assignments/types";
import type { ApiError } from "@/shared/api/base";
import { resolveFileUrl } from "@/shared/api/base";
import { useAuth } from "@/shared/hooks/useAuth";
import { NumberInput } from "@/shared/ui/NumberInput";
import { formatDateTime } from "@/shared/utils/date";
import type { Lesson } from "@/shared/api/types";

type OptionDraft = {
  text: string;
  is_correct: boolean;
};

type BlankDraft = {
  correct_text: string;
};

export function LessonDetailPage() {
  const { courseId = "", lessonOrder = "" } = useParams();
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const lessonState = useAsync(() => fetchLesson(courseId, lessonOrder), [courseId, lessonOrder]);
  const homeworksState = useAsync(() => fetchHomeworks(courseId, lessonOrder), [courseId, lessonOrder, reloadKey]);
  const lessonsNavState = useAsync(() => fetchLessons(courseId), [courseId]);
  const courseState = useAsync(() => fetchCourse(courseId), [courseId]);
  const [lessonData, setLessonData] = useState<Lesson | null>(null);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editMaterials, setEditMaterials] = useState<File | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showCreateHomework, setShowCreateHomework] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssignmentType>("SINGLE_CHOICE");
  const [maxScore, setMaxScore] = useState("10");
  const [deadline, setDeadline] = useState("");
  const [noDeadline, setNoDeadline] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([
    { text: "", is_correct: true },
    { text: "", is_correct: false },
  ]);
  const [textTemplate, setTextTemplate] = useState("");
  const [blanks, setBlanks] = useState<BlankDraft[]>([{ correct_text: "" }]);
  const [shortMaxLength, setShortMaxLength] = useState("200");
  const [shortCaseSensitive, setShortCaseSensitive] = useState(false);
  const [longMaxFiles, setLongMaxFiles] = useState("3");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  useEffect(() => {
    if (!lessonState.data) return;
    setLessonData(lessonState.data);
    setEditTitle(lessonState.data.title ?? "");
    setEditDescription(lessonState.data.description ?? "");
    setEditDuration(
      lessonState.data.duration !== null && lessonState.data.duration !== undefined
        ? String(lessonState.data.duration)
        : ""
    );
  }, [lessonState.data]);

  if (lessonState.loading || homeworksState.loading || lessonsNavState.loading) {
    return <Loader />;
  }
  if (lessonState.error) return <ErrorState error={lessonState.error} />;
  if (!lessonData) return <EmptyState label="Урок не найден" />;

  const isAdmin = role === "admin";
  const isAuthor = courseState.data?.author === userId;
  const canManageLesson = isAdmin || (role === "teacher" && isAuthor);
  const lessonsList = lessonsNavState.data ?? [];
  const currentOrder = Number(lessonOrder);
  const currentIndex = lessonsList.findIndex((lesson) => lesson.order === currentOrder);
  const prevLesson = currentIndex > 0 ? lessonsList[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessonsList.length - 1 ? lessonsList[currentIndex + 1] : null;

  const handleOptionText = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? { ...opt, text: value } : opt)));
  };

  const handleSingleCorrect = (index: number) => {
    setOptions((prev) => prev.map((opt, idx) => ({ ...opt, is_correct: idx === index })));
  };

  const handleMultipleCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? { ...opt, is_correct: !opt.is_correct } : opt))
    );
  };

  const addOption = () => setOptions((prev) => [...prev, { text: "", is_correct: false }]);
  const removeOption = (index: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== index));

  const addBlank = () => setBlanks((prev) => [...prev, { correct_text: "" }]);
  const removeBlank = (index: number) =>
    setBlanks((prev) => prev.filter((_, idx) => idx !== index));

  const updateBlank = (index: number, value: string) => {
    setBlanks((prev) => prev.map((blank, idx) => (idx === index ? { ...blank, correct_text: value } : blank)));
  };

  const buildDetails = () => {
    if (type === "SINGLE_CHOICE") {
      if (options.length < 2) return { error: "Добавьте минимум два варианта ответа." };
      const cleanedOptions = options.map((opt) => ({ ...opt, text: opt.text.trim() }));
      if (cleanedOptions.some((opt) => !opt.text)) {
        return { error: "Заполните текст всех вариантов ответа." };
      }
      const correctCount = cleanedOptions.filter((opt) => opt.is_correct).length;
      if (correctCount === 0) return { error: "Выберите правильный ответ." };
      if (correctCount > 1) return { error: "Для выбора одного отметьте только один вариант." };
      return { value: { shuffle_options: shuffleOptions, options: cleanedOptions } };
    }
    if (type === "MULTIPLE_CHOICE") {
      if (options.length < 2) return { error: "Добавьте минимум два варианта ответа." };
      const cleanedOptions = options.map((opt) => ({ ...opt, text: opt.text.trim() }));
      if (cleanedOptions.some((opt) => !opt.text)) {
        return { error: "Заполните текст всех вариантов ответа." };
      }
      if (!cleanedOptions.some((opt) => opt.is_correct)) {
        return { error: "Отметьте хотя бы один правильный вариант." };
      }
      return { value: { shuffle_options: shuffleOptions, options: cleanedOptions } };
    }
    if (type === "FILL_BLANK") {
      if (!textTemplate.trim()) return { error: "Заполните текст задания." };
      if (blanks.length === 0) return { error: "Добавьте хотя бы один пропуск." };
      const cleanedBlanks = blanks.map((blank, index) => ({
        position: index + 1,
        correct_text: blank.correct_text.trim(),
      }));
      if (cleanedBlanks.some((blank) => !blank.correct_text)) {
        return { error: "Заполните правильные ответы для всех пропусков." };
      }
      return { value: { text_template: textTemplate.trim(), blanks: cleanedBlanks } };
    }
    if (type === "SHORT_ANSWER") {
      const parsed = Number(shortMaxLength);
      if (shortMaxLength.trim() && (!Number.isFinite(parsed) || parsed <= 0)) {
        return { error: "Максимальная длина должна быть положительным числом." };
      }
      const details: { max_length?: number; case_sensitive: boolean } = {
        case_sensitive: shortCaseSensitive,
      };
      if (shortMaxLength.trim()) {
        details.max_length = parsed;
      }
      return {
        value: details,
      };
    }
    if (type === "LONG_ANSWER") {
      const parsed = Number(longMaxFiles);
      if (longMaxFiles.trim() && (!Number.isFinite(parsed) || parsed < 0)) {
        return { error: "Максимум файлов должен быть неотрицательным числом." };
      }
      const details: { max_files?: number } = {};
      if (longMaxFiles.trim()) {
        details.max_files = parsed;
      }
      return {
        value: details,
      };
    }
    return { error: "Неизвестный тип задания." };
  };

  const handleCreateHomework = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const detailsResult = buildDetails();
    if (detailsResult.error) {
      setFormError(detailsResult.error);
      setSaving(false);
      return;
    }
    const score = Number(maxScore);
    if (!Number.isFinite(score) || score < 0) {
      setFormError("Максимальный балл должен быть неотрицательным числом.");
      setSaving(false);
      return;
    }
    try {
      const deadlineValue = noDeadline || !deadline ? null : new Date(deadline).toISOString();
      await createHomework(courseId, lessonOrder, {
        title,
        description,
        type,
        max_score: score,
        deadline: deadlineValue,
        details: detailsResult.value as Record<string, unknown>,
      });
      setTitle("");
      setDescription("");
      setMaxScore("10");
      setDeadline("");
      setNoDeadline(false);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setFormError(details);
      } else {
        setFormError("Не удалось создать домашнее задание");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLessonUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateLesson(courseId, Number(lessonOrder), {
        title: editTitle,
        description: editDescription,
        duration: editDuration ? Number(editDuration) : null,
        materials: editMaterials || undefined,
      });
      setLessonData(updated);
      setIsEditingLesson(false);
      setEditMaterials(null);
    } catch {
      setEditError("Не удалось обновить урок");
    } finally {
      setEditSaving(false);
    }
  };

  const handleLessonDelete = async () => {
    const confirmed = window.confirm("Удалить урок? Это действие нельзя отменить.");
    if (!confirmed) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await deleteLesson(courseId, Number(lessonOrder));
      navigate(`/courses/${courseId}`);
    } catch {
      setEditError("Не удалось удалить урок");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>{lessonData.order}. {lessonData.title}</h1>
          <p>{lessonData.description || "Описание отсутствует"}</p>
        </div>
        {canManageLesson && (
          <div className="row">
            <button className="secondary" onClick={() => setIsEditingLesson((prev) => !prev)}>
              {isEditingLesson ? "Скрыть форму" : "Редактировать"}
            </button>
            <button className="danger" onClick={handleLessonDelete} disabled={editSaving}>
              Удалить урок
            </button>
          </div>
        )}
      </div>
      {editError && <div className="auth-error">{editError}</div>}
      <div className="courses-hero page-nav">
        <div className="nav-actions">
          {prevLesson ? (
            <Link
              className="nav-button"
              to={`/courses/${courseId}/lessons/${prevLesson.order}`}
              title="Предыдущий урок"
            >
              <span className="nav-icon">←</span>
              <span className="nav-text">Предыдущий урок</span>
            </Link>
          ) : (
            <span className="nav-button disabled" title="Предыдущего урока нет">
              <span className="nav-icon">←</span>
              <span className="nav-text">Предыдущий урок</span>
            </span>
          )}
          {nextLesson ? (
            <Link
              className="nav-button"
              to={`/courses/${courseId}/lessons/${nextLesson.order}`}
              title="Следующий урок"
            >
              <span className="nav-text">Следующий урок</span>
              <span className="nav-icon">→</span>
            </Link>
          ) : (
            <span className="nav-button disabled" title="Следующего урока нет">
              <span className="nav-text">Следующий урок</span>
              <span className="nav-icon">→</span>
            </span>
          )}
        </div>
      </div>
      {lessonData.materials && (
        <div className="courses-hero">
          <h3>Материалы урока</h3>
          <a className="submission-file" href={resolveFileUrl(lessonData.materials)} target="_blank" rel="noreferrer">
            Скачать материалы
          </a>
        </div>
      )}
      {canManageLesson && isEditingLesson && (
        <div className="courses-hero">
          <h3>Редактировать урок</h3>
          <form className="auth-form" onSubmit={handleLessonUpdate}>
            <div>
              <label htmlFor="lessonEditTitle">Название</label>
              <input
                id="lessonEditTitle"
                className="auth-input"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lessonEditDescription">Описание</label>
              <textarea
                id="lessonEditDescription"
                className="auth-input"
                rows={3}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lessonEditMaterials">Материалы</label>
              <input
                id="lessonEditMaterials"
                className="auth-input"
                type="file"
                onChange={(event) => setEditMaterials(event.target.files?.[0] ?? null)}
              />
              {editMaterials && <div className="muted">Файл: {editMaterials.name}</div>}
            </div>
            <div>
              <label htmlFor="lessonEditDuration">Длительность (минуты)</label>
              <NumberInput
                id="lessonEditDuration"
                min={0}
                value={editDuration}
                onChange={setEditDuration}
              />
            </div>
            {editError && <div className="auth-error">{editError}</div>}
            <div className="form-actions end">
              <button className="auth-button" type="submit" disabled={editSaving}>
                {editSaving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      )}
      {canManageLesson && (
        <div className="page-header compact">
          <div>
            <h2>Домашние задания</h2>
            <p>Управление заданиями урока.</p>
          </div>
          <button className="auth-button" onClick={() => setShowCreateHomework((prev) => !prev)}>
            {showCreateHomework ? "Скрыть форму" : "Добавить ДЗ"}
          </button>
        </div>
      )}
      {canManageLesson && showCreateHomework && (
        <div className="courses-hero">
          <h3>Создать домашнее задание</h3>
          <form className="auth-form" onSubmit={handleCreateHomework}>
            <div>
              <label htmlFor="homeworkTitle">Название</label>
              <input
                id="homeworkTitle"
                className="auth-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="homeworkDescription">Описание</label>
              <textarea
                id="homeworkDescription"
                className="auth-input"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="homeworkDeadline">Дедлайн</label>
              <div className="form-row">
                <input
                  id="homeworkDeadline"
                  className="auth-input"
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  disabled={noDeadline}
                />
                <label className="form-inline align-right">
                  <input
                    type="checkbox"
                    checked={noDeadline}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setNoDeadline(checked);
                      if (checked) {
                        setDeadline("");
                      }
                    }}
                  />
                  Без дедлайна
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="homeworkType">Тип</label>
              <select
                id="homeworkType"
                className="auth-input"
                value={type}
                onChange={(event) => setType(event.target.value as AssignmentType)}
              >
                <option value="SINGLE_CHOICE">Выбор одного</option>
                <option value="MULTIPLE_CHOICE">Выбор нескольких</option>
                <option value="FILL_BLANK">Вставить пропущенное</option>
                <option value="SHORT_ANSWER">Краткий ответ</option>
                <option value="LONG_ANSWER">Развернутый ответ</option>
              </select>
            </div>
            {type === "SINGLE_CHOICE" && (
              <div className="stack">
                <label>Варианты ответа</label>
                {options.map((option, index) => (
                  <div key={index} className="form-row">
                    <input
                      type="radio"
                      name="single-choice"
                      checked={option.is_correct}
                      onChange={() => handleSingleCorrect(index)}
                    />
                    <input
                      className="auth-input"
                      value={option.text}
                      onChange={(event) => handleOptionText(index, event.target.value)}
                      placeholder={`Вариант ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="secondary align-right"
                        onClick={() => removeOption(index)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={addOption}>
                    Добавить вариант
                  </button>
                  <label className="form-inline align-right">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(event) => setShuffleOptions(event.target.checked)}
                    />
                    Перемешивать варианты
                  </label>
                </div>
              </div>
            )}

            {type === "MULTIPLE_CHOICE" && (
              <div className="stack">
                <label>Варианты ответа</label>
                {options.map((option, index) => (
                  <div key={index} className="form-row">
                    <input
                      type="checkbox"
                      checked={option.is_correct}
                      onChange={() => handleMultipleCorrect(index)}
                    />
                    <input
                      className="auth-input"
                      value={option.text}
                      onChange={(event) => handleOptionText(index, event.target.value)}
                      placeholder={`Вариант ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="secondary align-right"
                        onClick={() => removeOption(index)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={addOption}>
                    Добавить вариант
                  </button>
                  <label className="form-inline align-right">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(event) => setShuffleOptions(event.target.checked)}
                    />
                    Перемешивать варианты
                  </label>
                </div>
              </div>
            )}

            {type === "FILL_BLANK" && (
              <div className="stack">
                <div>
                  <label htmlFor="textTemplate">Текст задания</label>
                  <textarea
                    id="textTemplate"
                    className="auth-input"
                    rows={4}
                    value={textTemplate}
                    onChange={(event) => setTextTemplate(event.target.value)}
                    placeholder="Введите текст с пропусками"
                  />
                </div>
                <div className="stack">
                  <label>Пропуски</label>
                  {blanks.map((blank, index) => (
                    <div key={index} className="form-row">
                      <span className="meta-pill">Пропуск {index + 1}</span>
                      <input
                        className="auth-input"
                        value={blank.correct_text}
                        onChange={(event) => updateBlank(index, event.target.value)}
                        placeholder="Правильный ответ"
                      />
                      {blanks.length > 1 && (
                        <button
                          type="button"
                          className="secondary align-right"
                          onClick={() => removeBlank(index)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={addBlank}>
                      Добавить пропуск
                    </button>
                  </div>
                </div>
              </div>
            )}

            {type === "SHORT_ANSWER" && (
              <div className="stack">
                <div>
                  <label htmlFor="shortMaxLength">Макс. длина</label>
                  <NumberInput
                    id="shortMaxLength"
                    min={1}
                    value={shortMaxLength}
                    onChange={setShortMaxLength}
                  />
                </div>
                <label className="form-inline">
                  <input
                    type="checkbox"
                    checked={shortCaseSensitive}
                    onChange={(event) => setShortCaseSensitive(event.target.checked)}
                  />
                  Учитывать регистр
                </label>
              </div>
            )}

            {type === "LONG_ANSWER" && (
              <div className="stack">
                <label htmlFor="longMaxFiles">Макс. файлов</label>
                <NumberInput
                  id="longMaxFiles"
                  min={0}
                  value={longMaxFiles}
                  onChange={setLongMaxFiles}
                />
              </div>
            )}

            <div>
              <label htmlFor="homeworkScore">Макс. балл</label>
              <NumberInput
                id="homeworkScore"
                min={0}
                value={maxScore}
                onChange={setMaxScore}
              />
            </div>
            {formError && <div className="auth-error">{formError}</div>}
            <div className="form-actions end">
              <button className="auth-button" type="submit" disabled={saving}>
                {saving ? "Создаем..." : "Создать ДЗ"}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="stack">
        {!canManageLesson && <h3>Домашние задания</h3>}
        {homeworksState.error && <ErrorState error={homeworksState.error} />}
        {!homeworksState.data || homeworksState.data.length === 0 ? (
          <EmptyState label="Домашние задания пока не добавлены" />
        ) : (
          <div className="courses-grid">
            {homeworksState.data.map((homework) => (
              <Link
                key={homework.id}
                to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${homework.order}`}
                className="course-card"
              >
                <div className="course-title">{homework.order}. {homework.title}</div>
                <div className="course-desc">{homework.description || "Описание отсутствует"}</div>
                <div className="course-meta">
                  <span className="course-tag">{getAssignmentTypeLabel(homework.type)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-pill">Максимальный балл: {homework.max_score}</span>
                  {homework.deadline && (
                    <span className="meta-pill">Дедлайн: {formatDateTime(homework.deadline)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
