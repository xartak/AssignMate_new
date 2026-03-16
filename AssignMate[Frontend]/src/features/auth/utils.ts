import type { ApiError } from "@/shared/api/base";

function normalizeErrorValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(normalizeErrorValue).filter(Boolean).join(" ");
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(normalizeErrorValue).filter(Boolean).join(" ");
  }
  return "";
}

const TRANSLATIONS: Record<string, string> = {
  "No active account found with the given credentials": "Неверный логин или пароль.",
  "Passwords do not match": "Пароли не совпадают.",
  "This password is too short. It must contain at least 8 characters.": "Пароль слишком короткий. Минимум 8 символов.",
  "This password is too common.": "Пароль слишком простой.",
  "This password is entirely numeric.": "Пароль не должен состоять только из цифр.",
  "This password is too similar to the username.": "Пароль слишком похож на имя пользователя.",
  "This password is too similar to the email address.": "Пароль слишком похож на email.",
  "Email is already registered.": "Этот email уже зарегистрирован.",
};

function translateMessage(message: string): string {
  return TRANSLATIONS[message] ?? message;
}

export function formatAuthError(error: unknown, fallback: string): string {
  const apiError = error as ApiError | null;
  const details = apiError?.details;
  if (!details) {
    return fallback;
  }
  if (typeof details === "string") {
    return translateMessage(details);
  }
  if (Array.isArray(details)) {
    return details.map(normalizeErrorValue).map(translateMessage).filter(Boolean).join("\n");
  }
  if (typeof details === "object") {
    const entries = Object.entries(details as Record<string, unknown>);
    if (entries.length === 1 && entries[0][0] === "detail") {
      const value = normalizeErrorValue(entries[0][1]);
      return value ? translateMessage(value) : fallback;
    }
    return entries
      .map(([field, value]) => {
        const text = normalizeErrorValue(value);
        return text ? `${field}: ${translateMessage(text)}` : field;
      })
      .filter(Boolean)
      .join("\n");
  }
  return fallback;
}
