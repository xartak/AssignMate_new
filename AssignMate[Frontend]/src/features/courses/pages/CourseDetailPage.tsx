import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { createLesson, fetchCourse, fetchInviteCode, fetchLessons } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ApiError } from "@/shared/api/base";
import { useAuth } from "@/shared/hooks/useAuth";
import { NumberInput } from "@/shared/ui/NumberInput";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const { role } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const courseState = useAsync(() => fetchCourse(courseId), [courseId]);
  const lessonsState = useAsync(() => fetchLessons(courseId), [courseId, reloadKey]);
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
  if (!courseState.data) return <EmptyState label="Курс не найден" />;

  const isTeacher = role === "teacher";

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


  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>{courseState.data.title}</h1>
          <p>{courseState.data.description || "Описание отсутствует"}</p>
        </div>
        {isTeacher && (
          <button className="auth-button" onClick={() => setShowCreateLesson((prev) => !prev)}>
            {showCreateLesson ? "Скрыть форму" : "Добавить урок"}
          </button>
        )}
      </div>
      {isTeacher && showCreateLesson && (
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
      {isTeacher && (
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
        <h3>Уроки</h3>
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
