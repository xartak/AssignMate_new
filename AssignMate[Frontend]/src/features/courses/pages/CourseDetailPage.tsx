import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  createLesson,
  deleteCourse,
  fetchCourse,
  fetchInviteCode,
  fetchLessons,
  updateCourse,
  fetchCourseAssistants,
  updateAssistantPermissions,
  addCourseAssistant,
  removeCourseAssistant,
  type AssistantPermissions,
} from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ApiError } from "@/shared/api/base";
import { useAuth } from "@/shared/hooks/useAuth";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { Course } from "@/shared/api/types";
import {
  LESSON_MATERIAL_ACCEPT,
  validateLessonMaterials,
} from "@/shared/constants/lessonMaterials";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const courseState = useAsync(() => fetchCourse(courseId), [courseId]);
  const lessonsState = useAsync(() => fetchLessons(courseId), [courseId, reloadKey]);
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonMaterials, setLessonMaterials] = useState<File[]>([]);
  const [lessonMaterialsError, setLessonMaterialsError] = useState<string | null>(null);
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<AssistantPermissions[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);
  const [addAssistantEmail, setAddAssistantEmail] = useState("");
  const [addAssistantLoading, setAddAssistantLoading] = useState(false);
  const [addAssistantError, setAddAssistantError] = useState<string | null>(null);
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  useEffect(() => {
    if (!courseState.data) return;
    setCourseData(courseState.data);
    setCourseTitle(courseState.data.title ?? "");
    setCourseDescription(courseState.data.description ?? "");
  }, [courseState.data]);

  if (courseState.loading || lessonsState.loading) return <Loader />;
  if (courseState.error) {
    const apiError = courseState.error as ApiError;
    if (apiError?.status === 403) {
      return (
        <div className="courses-page">
          <div className="courses-hero">
            <h2>Курс недоступен</h2>
            <p>Для доступа к курсу обратитесь к автору.</p>
          </div>
        </div>
      );
    }
    return <ErrorState error={courseState.error} />;
  }
  if (!courseData) return <EmptyState label="Курс не найден" />;

  const isAdmin = role === "admin";
  const isAuthor = courseData.author === userId;
  const canManageCourse = isAdmin || isAuthor;
  const canManageLessons = canManageCourse;
  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lessonMaterialsError) {
      setLessonError(lessonMaterialsError);
      return;
    }
    setLessonSaving(true);
    setLessonError(null);
    try {
      await createLesson(courseId, {
        title: lessonTitle,
        description: lessonDescription,
        materials: lessonMaterials.length > 0 ? lessonMaterials : undefined,
        duration: lessonDuration ? Number(lessonDuration) : null,
      });
      setLessonTitle("");
      setLessonDescription("");
      setLessonMaterials([]);
      setLessonMaterialsError(null);
      setLessonDuration("");
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setLessonError(details);
      } else {
        setLessonError("Не удалось создать урок");
      }
    } finally {
      setLessonSaving(false);
    }
  };

  const handleLessonMaterialsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setLessonMaterials([]);
      setLessonMaterialsError(null);
      return;
    }
    const error = validateLessonMaterials(files);
    if (error) {
      setLessonMaterials([]);
      setLessonMaterialsError(error);
      event.target.value = "";
      return;
    }
    setLessonMaterialsError(null);
    setLessonMaterials(files);
  };

  const handleFetchInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const data = await fetchInviteCode(courseId);
      setInviteCode(data.invite_code);
    } catch {
      setInviteError("Не удалось получить код");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCourseUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCourseSaving(true);
    setCourseError(null);
    try {
      const updated = await updateCourse(courseId, {
        title: courseTitle,
        description: courseDescription,
      });
      setCourseData(updated);
      setIsEditingCourse(false);
    } catch {
      setCourseError("Не удалось обновить курс");
    } finally {
      setCourseSaving(false);
    }
  };

  const handleCourseDelete = async () => {
    const confirmed = window.confirm("Удалить курс? Это действие нельзя отменить.");
    if (!confirmed) return;
    setCourseSaving(true);
    setCourseError(null);
    try {
      await deleteCourse(courseId);
      navigate("/courses");
    } catch {
      setCourseError("Не удалось удалить курс");
    } finally {
      setCourseSaving(false);
    }
  };

  const handleShowAssistants = async () => {
    if (showAssistants) {
      setShowAssistants(false);
      return;
    }
    setAssistantsLoading(true);
    try {
      const data = await fetchCourseAssistants(courseId);
      setAssistants(data);
      setShowAssistants(true);
    } catch {
      setCourseError("Не удалось загрузить ассистентов");
    } finally {
      setAssistantsLoading(false);
    }
  };

  const handleTogglePermission = async (
    userId: number,
    field: keyof Pick<AssistantPermissions, "can_edit_homework" | "can_review_homework" | "can_add_homework" | "can_add_materials">,
    value: boolean
  ) => {
    try {
      const updated = await updateAssistantPermissions(courseId, userId, { [field]: value });
      setAssistants((prev) => prev.map((a) => (a.user_id === userId ? { ...a, ...updated } : a)));
    } catch {
      setCourseError("Не удалось обновить права");
    }
  };

  const handleAddAssistant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addAssistantEmail.trim()) return;
    setAddAssistantLoading(true);
    setAddAssistantError(null);
    try {
      const added = await addCourseAssistant(courseId, addAssistantEmail.trim());
      setAssistants((prev) =>
        prev.some((a) => a.user_id === added.user_id) ? prev : [...prev, added]
      );
      setAddAssistantEmail("");
    } catch (error) {
      const apiError = error as { details?: unknown; message?: string } | null;
      const detail = apiError?.details ?? apiError?.message;
      setAddAssistantError(
        typeof detail === "string" ? detail : "Не удалось добавить ассистента"
      );
    } finally {
      setAddAssistantLoading(false);
    }
  };

  const handleRemoveAssistant = async (assistantUserId: number) => {
    const confirmed = window.confirm("Удалить ассистента из курса?");
    if (!confirmed) return;
    try {
      await removeCourseAssistant(courseId, assistantUserId);
      setAssistants((prev) => prev.filter((a) => a.user_id !== assistantUserId));
    } catch {
      setCourseError("Не удалось удалить ассистента");
    }
  };


  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>{courseData.title}</h1>
          <p>{courseData.description || "Описание отсутствует"}</p>
        </div>
        {canManageCourse && (
          <div className="row">
            <button className="secondary" onClick={() => setIsEditingCourse((prev) => !prev)}>
              {isEditingCourse ? "Скрыть форму" : "Редактировать"}
            </button>
            <button className="danger" onClick={handleCourseDelete} disabled={courseSaving}>
              Удалить курс
            </button>
          </div>
        )}
      </div>
      {courseError && <div className="auth-error">{courseError}</div>}

      {canManageCourse && isEditingCourse && (
        <div className="courses-hero">
          <h3>Редактировать курс</h3>
          <form className="auth-form" onSubmit={handleCourseUpdate}>
            <div>
              <label htmlFor="courseEditTitle">Название</label>
              <input
                id="courseEditTitle"
                className="auth-input"
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="courseEditDesc">Описание</label>
              <textarea
                id="courseEditDesc"
                className="auth-input"
                rows={3}
                value={courseDescription}
                onChange={(event) => setCourseDescription(event.target.value)}
                required
              />
            </div>
            {courseError && <div className="auth-error">{courseError}</div>}
            <div className="form-actions end">
              <button className="auth-button" type="submit" disabled={courseSaving}>
                {courseSaving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      )}

      {canManageLessons && showCreateLesson && (
        <div className="courses-hero">
          <h3>Создать урок</h3>
          <form className="auth-form" onSubmit={handleCreateLesson}>
            <div>
              <label htmlFor="lessonTitle">Название</label>
              <input
                id="lessonTitle"
                className="auth-input"
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lessonDescription">Описание</label>
              <textarea
                id="lessonDescription"
                className="auth-input"
                rows={3}
                value={lessonDescription}
                onChange={(event) => setLessonDescription(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lessonMaterials">Материалы</label>
              <input
                id="lessonMaterials"
                className="auth-input"
                type="file"
                multiple
                accept={LESSON_MATERIAL_ACCEPT}
                onChange={handleLessonMaterialsChange}
              />
              {lessonMaterials.length > 0 && (
                <div className="muted">
                  Файлы: {lessonMaterials.map((file) => file.name).join(", ")}
                </div>
              )}
              {lessonMaterialsError && <div className="auth-error">{lessonMaterialsError}</div>}
            </div>
            <div>
              <label htmlFor="lessonDuration">Длительность (минуты)</label>
              <NumberInput
                id="lessonDuration"
                min={0}
                value={lessonDuration}
                onChange={setLessonDuration}
              />
            </div>
            {lessonError && <div className="auth-error">{lessonError}</div>}
            <div className="form-actions end">
              <button className="auth-button" type="submit" disabled={lessonSaving}>
                {lessonSaving ? "Создаем..." : "Создать урок"}
              </button>
            </div>
          </form>
        </div>
      )}

      {canManageLessons && (
        <div className="page-header compact">
          <div>
            <h2>Уроки</h2>
            <p>Управление уроками курса.</p>
          </div>
          <button className="auth-button" onClick={() => setShowCreateLesson((prev) => !prev)}>
            {showCreateLesson ? "Скрыть форму" : "Добавить урок"}
          </button>
        </div>
      )}
      {canManageLessons && (
        <div className="courses-hero">
          <h3>Код приглашения</h3>
          <div className="row">
            <button className="auth-button" onClick={handleFetchInvite} disabled={inviteLoading}>
              {inviteLoading ? "Получаем..." : "Получить код"}
            </button>
            {inviteCode && <span className="course-tag">{inviteCode}</span>}
          </div>
          {inviteError && <div className="auth-error">{inviteError}</div>}
        </div>
      )}
      {canManageCourse && (
        <div className="courses-hero">
          <div className="row space-between">
            <h3>Ассистенты курса</h3>
            <button className="secondary" onClick={handleShowAssistants} disabled={assistantsLoading}>
              {assistantsLoading ? "Загружаем..." : showAssistants ? "Скрыть" : "Управлять"}
            </button>
          </div>
          {showAssistants && (
            <>
              <form className="add-assistant-form" onSubmit={handleAddAssistant}>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Email ассистента"
                  value={addAssistantEmail}
                  onChange={(e) => setAddAssistantEmail(e.target.value)}
                  required
                />
                <button className="auth-button" type="submit" disabled={addAssistantLoading}>
                  {addAssistantLoading ? "Добавляем..." : "Добавить"}
                </button>
              </form>
              {addAssistantError && <div className="auth-error">{addAssistantError}</div>}
              {assistants.length === 0 ? (
                <div className="muted">Ассистентов пока нет.</div>
              ) : (
                <div className="assistants-permissions">
                  {assistants.map((assistant) => {
                    const name = `${assistant.first_name || ""} ${assistant.last_name || ""}`.trim() || assistant.email;
                    return (
                      <div key={assistant.user_id} className="assistant-permissions-row">
                        <div className="assistant-name">
                          <strong>{name}</strong>
                          <span className="muted">{assistant.email}</span>
                        </div>
                        <div className="assistant-permissions-flags">
                          {(
                            [
                              ["can_edit_homework", "Редактировать ДЗ"],
                              ["can_review_homework", "Проверять ДЗ"],
                              ["can_add_homework", "Добавлять ДЗ"],
                              ["can_add_materials", "Добавлять материалы"],
                            ] as const
                          ).map(([field, label]) => (
                            <label key={field} className="permission-toggle">
                              <input
                                type="checkbox"
                                checked={assistant[field]}
                                onChange={(e) => handleTogglePermission(assistant.user_id, field, e.target.checked)}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                          <button
                            type="button"
                            className="danger small"
                            onClick={() => handleRemoveAssistant(assistant.user_id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <div className="stack">
        {!canManageLessons && <h3>Уроки</h3>}
        {lessonsState.error ? (
          (() => {
            const apiError = lessonsState.error as ApiError;
            if (apiError?.status === 403) {
              return (
                <div className="courses-hero">
                  <h3>Доступ ограничен</h3>
                  <p>Для доступа к курсу обратитесь к автору.</p>
                </div>
              );
            }
            return <ErrorState error={lessonsState.error} />;
          })()
        ) : !lessonsState.data || lessonsState.data.length === 0 ? (
          <EmptyState label="Уроки пока не добавлены" />
        ) : (
          <div className="courses-grid">
            {lessonsState.data.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/courses/${courseId}/lessons/${lesson.order}`}
                className="course-card"
              >
                <div className="course-title">{lesson.order}. {lesson.title}</div>
                <div className="course-desc">{lesson.description || "Описание отсутствует"}</div>
                <div className="course-meta">
                  <span className="course-tag">урок</span>
                  <span className="muted">{lesson.duration ?? 0} мин</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
