import type { AssignmentType } from "@/features/assignments/types";

export type HomeworkTemplate = {
  title: string;
  description: string;
  type: AssignmentType;
  max_score: number;
  deadline: null;
  details: Record<string, unknown>;
};

export function buildHomeworkTemplate(type: AssignmentType, title: string): HomeworkTemplate {
  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        shuffle_options: false,
        options: [
          { text: "Вариант 1", is_correct: true },
          { text: "Вариант 2", is_correct: false },
        ],
      },
    };
  }
  if (type === "FILL_BLANK") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        text_template: "Заполните пропуск в тексте.",
        blanks: [{ position: 1, correct_text: "Ответ" }],
      },
    };
  }
  if (type === "SHORT_ANSWER") {
    return {
      title,
      description: "",
      type,
      max_score: 5,
      deadline: null,
      details: {
        max_length: 200,
        case_sensitive: false,
      },
    };
  }
  return {
    title,
    description: "",
    type,
    max_score: 5,
    deadline: null,
    details: {
      max_files: 3,
    },
  };
}

export const HOMEWORK_TYPE_META: {
  type: AssignmentType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    type: "SINGLE_CHOICE",
    label: "Задание с выбором ответа",
    description: "Создание вопроса с одним или несколькими вариантами правильного ответа.",
    icon: "☑",
  },
  {
    type: "MULTIPLE_CHOICE",
    label: "Задание с несколькими ответами",
    description: "Вопрос с несколькими правильными вариантами, которые нужно выбрать.",
    icon: "✅",
  },
  {
    type: "FILL_BLANK",
    label: "Задание на заполнение пропусков",
    description: "Создание задания с пропусками в тексте, которые заполняет ученик.",
    icon: "▭",
  },
  {
    type: "SHORT_ANSWER",
    label: "Краткий ответ",
    description: "Вопрос, на который ученик отвечает текстом в одну-две строки.",
    icon: "✎",
  },
  {
    type: "LONG_ANSWER",
    label: "Задание с развёрнутым ответом",
    description: "Развёрнутый текстовый ответ с возможностью прикрепления файлов.",
    icon: "📝",
  },
];
