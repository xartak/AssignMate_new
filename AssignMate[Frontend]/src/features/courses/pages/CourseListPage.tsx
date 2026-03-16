import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { createCourse, fetchMyCourses, joinCourse } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useAuth } from "@/shared/hooks/useAuth";

export function CourseListPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading, error } = useAsync(fetchMyCourses, [reloadKey]);
  const [joinCode, setJoinCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);
  const pageDescription =
    role === "teacher"
      ? "Ваши созданные курсы."
      : role === "admin"
      ? "Все доступные курсы."
      : "Курсы, к которым у вас есть доступ.";
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const courses = useMemo(() => data ?? [], [data]);

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    setJoinError(null);
    setJoinStatus(null);
    try {
      await joinCourse("", joinCode);
      setJoinStatus("Вы успешно записались на курс");
      setJoinCode("");
      setReloadKey((prev) => prev + 1);
    } catch {
      setJoinError("Неверный код приглашения");
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await createCourse({ title, description });
      setTitle("");
      setDescription("");
      navigate(`/courses/${created.id}`);
    } catch {
      setFormError("Не удалось создать курс");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Мои курсы</h1>
          <p>{pageDescription}</p>
        </div>
        {isTeacher && (
          <button className="auth-button" onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Скрыть форму" : "Добавить курс"}
          </button>
        )}
      </div>
      {isTeacher && showCreate && (
        <div className="courses-hero">
          <h3>Создать курс</h3>
          <form className="auth-form" onSubmit={handleCreate}>
            <div>
              <label htmlFor="courseTitle">Название</label>
              <input
                id="courseTitle"
                className="auth-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="courseDesc">Описание</label>
              <textarea
                id="courseDesc"
                className="auth-input"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
            {formError && <div className="auth-error">{formError}</div>}
            <button className="auth-button" type="submit" disabled={saving}>
              {saving ? "Создаем..." : "Создать курс"}
            </button>
          </form>
        </div>
      )}
      {isStudent && (
        <div className="courses-hero">
          <h3>Присоединиться к курсу</h3>
          <form className="auth-form" onSubmit={handleJoin}>
            <div>
              <label htmlFor="joinCode">Код приглашения</label>
              <input
                id="joinCode"
                className="auth-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                required
              />
            </div>
            {joinError && <div className="auth-error">{joinError}</div>}
            {joinStatus && <div className="muted">{joinStatus}</div>}
            <button className="auth-button" type="submit">
              Вступить
            </button>
          </form>
        </div>
      )}
      {!courses || courses.length === 0 ? (
        <EmptyState label="Нет доступных курсов" />
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="course-card">
              <div className="course-title">{course.title}</div>
              <div className="course-desc">{course.description || "Описание отсутствует"}</div>
              <div className="course-meta">
                <span className="course-tag">курс</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
