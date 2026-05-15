import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { fetchLesson, fetchHomeworks } from "@/features/lessons/api";
import { deleteLesson, fetchCourse, fetchLessons, updateLesson } from "@/features/courses/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { deleteHomework } from "@/features/assignments/api";
import type { ApiError } from "@/shared/api/base";
import { resolveFileUrl } from "@/shared/api/base";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAssistantPermissions } from "@/shared/hooks/useAssistantPermissions";
import { NumberInput } from "@/shared/ui/NumberInput";
import type { Lesson } from "@/shared/api/types";
import {
  LESSON_MATERIAL_ACCEPT,
  validateLessonMaterials,
} from "@/shared/constants/lessonMaterials";

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
  const [editMaterials, setEditMaterials] = useState<File[]>([]);
  const [editMaterialsError, setEditMaterialsError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [hwModalOpen, setHwModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  useEffect(() => {
    if (!hwModalOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHwModalOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [hwModalOpen]);

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

  const isAdmin = role === "admin";
  const isAuthor = courseState.data?.author === userId;
  const { perms: assistantPerms } = useAssistantPermissions(courseId);

  if (lessonState.loading || homeworksState.loading || lessonsNavState.loading) {
    return <Loader />;
  }
  if (lessonState.error) return <ErrorState error={lessonState.error} />;
  if (!lessonData) return <EmptyState label="Урок не найден" />;
  const canManageLesson =
    isAdmin ||
    (role === "teacher" && isAuthor) ||
    (role === "assistant" && assistantPerms.can_add_materials);
  const lessonsList = lessonsNavState.data ?? [];
  const currentOrder = Number(lessonOrder);
  const currentIndex = lessonsList.findIndex((lesson) => lesson.order === currentOrder);
  const prevLesson = currentIndex > 0 ? lessonsList[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessonsList.length - 1 ? lessonsList[currentIndex + 1] : null;
  const materialsList = Array.isArray(lessonData.materials)
    ? lessonData.materials
    : lessonData.materials
      ? [lessonData.materials]
      : [];
  const homeworksList = [...(homeworksState.data ?? [])].sort((a, b) => a.order - b.order);
  const totalMaxScore = homeworksList.reduce((sum, item) => sum + (item.max_score ?? 0), 0);

  const handleDeleteAllHomeworks = async () => {
    if (homeworksList.length === 0) return;
    const confirmed = window.confirm("Удалить все домашние задания урока?");
    if (!confirmed) return;
    setDeleteAllLoading(true);
    setDeleteAllError(null);
    try {
      const ordersDesc = [...homeworksList].sort((a, b) => b.order - a.order).map((item) => item.order);
      for (const order of ordersDesc) {
        await deleteHomework(courseId, lessonOrder, order);
      }
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setDeleteAllError(details);
      } else {
        setDeleteAllError("Не удалось удалить все домашние задания");
      }
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleLessonUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editMaterialsError) {
      setEditError(editMaterialsError);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateLesson(courseId, Number(lessonOrder), {
        title: editTitle,
        description: editDescription,
        duration: editDuration ? Number(editDuration) : null,
        materials: editMaterials.length > 0 ? editMaterials : undefined,
      });
      setLessonData(updated);
      setIsEditingLesson(false);
      setEditMaterials([]);
      setEditMaterialsError(null);
    } catch (error) {
      const apiError = error as ApiError | null;
      if (apiError?.details) {
        const details =
          typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details, null, 2);
        setEditError(details);
      } else {
        setEditError("Не удалось обновить урок");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditMaterialsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setEditMaterials([]);
      setEditMaterialsError(null);
      return;
    }
    const error = validateLessonMaterials(files);
    if (error) {
      setEditMaterials([]);
      setEditMaterialsError(error);
      event.target.value = "";
      return;
    }
    setEditMaterialsError(null);
    setEditMaterials(files);
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
      {materialsList.length > 0 && (
        <div className="courses-hero">
          <h3>Материалы урока</h3>
          <div className="stack">
            {materialsList.map((material) => {
              const fileName = decodeURIComponent(material.split("/").pop() || "Материал");
              return (
                <a
                  key={material}
                  className="submission-file"
                  href={resolveFileUrl(material)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {fileName}
                </a>
              );
            })}
          </div>
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
                multiple
                accept={LESSON_MATERIAL_ACCEPT}
                onChange={handleEditMaterialsChange}
              />
              {editMaterials.length > 0 && (
                <div className="muted">
                  Файлы: {editMaterials.map((file) => file.name).join(", ")}
                </div>
              )}
              {editMaterialsError && <div className="auth-error">{editMaterialsError}</div>}
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
      <div className="courses-hero">
        <div className="homework-manage-header">
          <div>
            <h3>Домашние задания</h3>
            <p className="muted">Нажмите на группу, чтобы выбрать задание.</p>
          </div>
          <div className="row">
            <span className="meta-pill">Максимальный балл: {totalMaxScore}</span>
            {canManageLesson && homeworksList.length > 0 && (
              <button
                className="danger"
                type="button"
                onClick={handleDeleteAllHomeworks}
                disabled={deleteAllLoading}
              >
                {deleteAllLoading ? "Удаляем..." : "Удалить все ДЗ"}
              </button>
            )}
          </div>
        </div>
        {Boolean(homeworksState.error) && <ErrorState error={homeworksState.error} />}
        {deleteAllError && <div className="auth-error">{deleteAllError}</div>}
        {canManageLesson && (
          <Link
            className="homework-add-cta"
            to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/editor`}
          >
            {homeworksList.length === 0 ? "Добавить ДЗ" : "Редактировать ДЗ"}
          </Link>
        )}
        {homeworksList.length === 0 ? (
          <div className="muted">Домашние задания пока не добавлены.</div>
        ) : (
          <button
            type="button"
            className="hw-group-card"
            onClick={() => setHwModalOpen(true)}
          >
            <div className="hw-group-card-left">
              <span className="hw-group-card-icon">📋</span>
              <div>
                <div className="hw-group-card-title">Задания урока</div>
                <div className="hw-group-card-meta">{homeworksList.length} задани{homeworksList.length === 1 ? "е" : homeworksList.length < 5 ? "я" : "й"} · {totalMaxScore} б.</div>
              </div>
            </div>
            <span className="hw-group-card-arrow">→</span>
          </button>
        )}
      </div>

      {hwModalOpen && (
        <div className="hw-modal-overlay" onClick={() => setHwModalOpen(false)}>
          <div
            className="hw-modal"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hw-modal-header">
              <h3>Задания урока</h3>
              <button type="button" className="hw-modal-close" onClick={() => setHwModalOpen(false)}>✕</button>
            </div>
            <div className="hw-modal-list">
              {homeworksList.map((hw) => (
                <Link
                  key={hw.order}
                  className="homework-accordion-item"
                  to={`/courses/${courseId}/lessons/${lessonOrder}/homeworks/${hw.order}`}
                  onClick={() => setHwModalOpen(false)}
                >
                  <span className="homework-accordion-order">#{hw.order}</span>
                  <span className="homework-accordion-title">{hw.title}</span>
                  <span className="homework-accordion-score">{hw.max_score} б.</span>
                  <span className="homework-accordion-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
