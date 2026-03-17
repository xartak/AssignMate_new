import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  createLesson,
  deleteCourse,
  fetchCourse,
  fetchInviteCode,
  fetchLessons,
  updateCourse,
} from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ApiError } from "@/shared/api/base";
import { useAuth } from "@/shared/hooks/useAuth";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { Course } from "@/shared/api/types";

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
  const [lessonMaterials, setLessonMaterials] = useState<File | null>(null);
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
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
    setLessonSaving(true);
    setLessonError(null);
    try {
      await createLesson(courseId, {
        title: lessonTitle,
        description: lessonDescription,
        materials: lessonMaterials || undefined,
        duration: lessonDuration ? Number(lessonDuration) : null,
      });
      setLessonTitle("");
      setLessonDescription("");
      setLessonMaterials(null);
      setLessonDuration("");
      setReloadKey((prev) => prev + 1);
    } catch {
      setLessonError("Не удалось создать урок");
    } finally {
      setLessonSaving(false);
    }
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
                onChange={(event) => setLessonMaterials(event.target.files?.[0] ?? null)}
              />
              {lessonMaterials && <div className="muted">Файл: {lessonMaterials.name}</div>}
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
