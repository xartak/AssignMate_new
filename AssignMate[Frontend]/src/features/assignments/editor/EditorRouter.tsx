import { useOutletContext } from "react-router-dom";
import type { EditorContext } from "@/features/assignments/editor/HomeworkEditorLayout";
import { TypePickerStep } from "@/features/assignments/editor/TypePickerStep";
import { ChoiceQuestionStep } from "@/features/assignments/editor/ChoiceQuestionStep";
import { FillBlankStep } from "@/features/assignments/editor/FillBlankStep";
import { ShortLongAnswerStep } from "@/features/assignments/editor/ShortLongAnswerStep";

/**
 * Диспетчер: по текущему order определяет тип ДЗ и рендерит нужный шаг.
 * Если order отсутствует — показывает TypePicker (добавление нового).
 */
export function EditorRouter() {
  const ctx = useOutletContext<EditorContext>();
  if (ctx.currentOrder == null) {
    return <TypePickerStep />;
  }
  const hw = ctx.homeworks.find((item) => item.order === ctx.currentOrder);
  if (!hw) {
    return <div className="muted">Задание не найдено.</div>;
  }
  switch (hw.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      return <ChoiceQuestionStep />;
    case "FILL_BLANK":
      return <FillBlankStep />;
    case "SHORT_ANSWER":
    case "LONG_ANSWER":
      return <ShortLongAnswerStep />;
    default:
      return <div className="muted">Неизвестный тип задания.</div>;
  }
}
