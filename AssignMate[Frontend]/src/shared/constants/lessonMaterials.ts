export const LESSON_MATERIAL_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "mp4",
  "mp3",
  "wav",
  "zip",
] as const;

export const LESSON_MATERIAL_ACCEPT = LESSON_MATERIAL_EXTENSIONS.map(
  (ext) => `.${ext}`
).join(",");

export function validateLessonMaterials(files: File[]) {
  const invalid = files.filter((file) => {
    const parts = file.name.split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    return !LESSON_MATERIAL_EXTENSIONS.includes(ext as (typeof LESSON_MATERIAL_EXTENSIONS)[number]);
  });

  if (invalid.length === 0) return null;

  return `Недопустимый формат файла: ${invalid.map((file) => file.name).join(", ")}. ` +
    `Разрешены: ${LESSON_MATERIAL_EXTENSIONS.join(", ")}`;
}
