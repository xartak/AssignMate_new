import { useEffect, useState, type ChangeEvent } from "react";
import { fetchMe, updateMe, fetchChildren, addChild, removeChild, type MeResponse, type ChildLink } from "@/features/auth/api";
import { generateTelegramLink, type TelegramLinkResponse } from "@/features/telegram/api";
import { generateVKCode, type VKCodeResponse } from "@/features/vk/api";
import { resolveFileUrl } from "@/shared/api/base";
import { useAsync } from "@/shared/hooks/useAsync";
import { Loader } from "@/shared/ui/Loader";
import { ErrorState } from "@/shared/ui/ErrorState";
import defaultAvatar from "@/assets/academic-robe.svg";

export function CabinetPage() {
  const meState = useAsync(fetchMe, []);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [telegramLink, setTelegramLink] = useState<TelegramLinkResponse | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [vkCode, setVkCode] = useState<VKCodeResponse | null>(null);
  const [vkLoading, setVkLoading] = useState(false);
  const [vkError, setVkError] = useState<string | null>(null);
  const [vkCopied, setVkCopied] = useState(false);
  const [formValues, setFormValues] = useState({
    first_name: "",
    last_name: "",
    patronymic: "",
    age: "",
    bio: "",
    contact_method: "",
  });
  const [children, setChildren] = useState<ChildLink[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childEmail, setChildEmail] = useState("");
  const [childLoading, setChildLoading] = useState(false);
  const [childError, setChildError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("theme-purple");
    return () => {
      document.body.classList.remove("theme-purple");
    };
  }, []);

  useEffect(() => {
    if (!meState.data) return;
    setProfile(meState.data);
    setFormValues({
      first_name: meState.data.first_name ?? "",
      last_name: meState.data.last_name ?? "",
      patronymic: meState.data.patronymic ?? "",
      age: meState.data.age ? String(meState.data.age) : "",
      bio: meState.data.bio ?? "",
      contact_method: meState.data.contact_method ?? "",
    });
    if (meState.data.role === "PARENT" || meState.data.role === "parent") {
      fetchChildren().then(setChildren).finally(() => setChildrenLoaded(true));
    }
  }, [meState.data]);

  if (meState.loading) return <Loader />;
  if (meState.error) return <ErrorState error={meState.error} />;
  if (!profile) return null;

  const roleLabel = (value?: string | null) => {
    const key = (value ?? "").toLowerCase();
    if (key === "admin") return "Администратор";
    if (key === "teacher") return "Преподаватель";
    if (key === "assistant") return "Ассистент";
    if (key === "student") return "Ученик";
    if (key === "parent") return "Родитель";
    return value ?? "—";
  };

  const avatarSrc = profile.avatar ? resolveFileUrl(profile.avatar) : defaultAvatar;
  const bio = profile.bio?.trim();
  const telegramExpiresAt = telegramLink?.expires_at
    ? new Date(telegramLink.expires_at)
    : null;
  const telegramExpiresLabel =
    telegramExpiresAt && !Number.isNaN(telegramExpiresAt.getTime())
      ? telegramExpiresAt.toLocaleString()
      : telegramLink?.expires_at ?? "";
  const telegramButtonLabel = telegramLink ? "Перейти в Telegram" : "Привязать Telegram";
  const telegramButtonClass = telegramLink
    ? "auth-button telegram-button active"
    : "auth-button telegram-button";
  const isTelegramConnected = Boolean(profile.telegram_connected);

  const detailRows = [
    { label: "Почта", value: profile.email },
    { label: "Имя", value: profile.first_name || "—" },
    { label: "Фамилия", value: profile.last_name || "—" },
    { label: "Отчество", value: profile.patronymic || "—" },
    { label: "Возраст", value: profile.age ?? "—" },
    { label: "Роль", value: roleLabel(profile.role) },
    { label: "Способ связи", value: profile.contact_method || "—" },
  ];

  const handleInputChange =
    (field: keyof typeof formValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const startEdit = () => {
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setFormValues({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      patronymic: profile.patronymic ?? "",
      age: profile.age ? String(profile.age) : "",
      bio: profile.bio ?? "",
      contact_method: profile.contact_method ?? "",
    });
    setAvatarFile(null);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const form = new FormData();
      form.append("first_name", formValues.first_name.trim());
      form.append("last_name", formValues.last_name.trim());
      form.append("patronymic", formValues.patronymic.trim());
      form.append("bio", formValues.bio.trim());
      form.append("contact_method", formValues.contact_method.trim());
      if (formValues.age.trim()) {
        form.append("age", formValues.age.trim());
      }
      if (avatarFile) {
        form.append("avatar", avatarFile);
      }
      const updated = await updateMe(form);
      setProfile(updated);
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Не удалось сохранить изменения.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTelegramLink = async () => {
    setTelegramLoading(true);
    setTelegramError(null);
    try {
      const link = await generateTelegramLink();
      setTelegramLink(link);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Не удалось получить ссылку для Telegram.";
      setTelegramError(message);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramAction = async () => {
    if (telegramLink?.link) {
      window.open(telegramLink.link, "_blank", "noopener,noreferrer");
      return;
    }
    await handleGenerateTelegramLink();
  };

  const handleGenerateVKCode = async () => {
    setVkLoading(true);
    setVkError(null);
    setVkCopied(false);
    try {
      const data = await generateVKCode();
      setVkCode(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Не удалось получить код для ВКонтакте.";
      setVkError(message);
    } finally {
      setVkLoading(false);
    }
  };

  const handleCopyVKCode = async () => {
    if (!vkCode?.code) return;
    try {
      await navigator.clipboard.writeText(vkCode.code);
      setVkCopied(true);
      window.setTimeout(() => setVkCopied(false), 1500);
    } catch {
      setVkCopied(false);
    }
  };

  const isParent = (profile.role ?? "").toLowerCase() === "parent";

  const handleAddChild = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!childEmail.trim()) return;
    setChildLoading(true);
    setChildError(null);
    try {
      const added = await addChild(childEmail.trim());
      setChildren((prev) => prev.some((c) => c.id === added.id) ? prev : [...prev, added]);
      setChildEmail("");
    } catch (error) {
      const apiError = error as { details?: unknown; message?: string } | null;
      const detail = apiError?.details ?? apiError?.message;
      setChildError(typeof detail === "string" ? detail : "Не удалось добавить ученика");
    } finally {
      setChildLoading(false);
    }
  };

  const handleRemoveChild = async (linkId: number) => {
    const confirmed = window.confirm("Удалить ученика из списка?");
    if (!confirmed) return;
    try {
      await removeChild(linkId);
      setChildren((prev) => prev.filter((c) => c.id !== linkId));
    } catch {
      setChildError("Не удалось удалить ученика");
    }
  };

  const isVKConnected = Boolean(profile.vk_connected);
  const vkExpiresAt = vkCode?.expires_at ? new Date(vkCode.expires_at) : null;
  const vkExpiresLabel =
    vkExpiresAt && !Number.isNaN(vkExpiresAt.getTime())
      ? vkExpiresAt.toLocaleString()
      : vkCode?.expires_at ?? "";

  return (
    <div className="cabinet-page">
      <div className="page-header">
        <div>
          <h1>Личный кабинет</h1>
          <p>Ваши личные данные</p>
        </div>
          <div className="cabinet-socials">
            <div className="cabinet-telegram">
              <div className="cabinet-telegram-title">Telegram</div>
              {!isTelegramConnected && telegramError && (
                <div className="auth-error">{telegramError}</div>
              )}
              {!isTelegramConnected && (
                <div className="form-actions end">
                  <button
                    className={telegramButtonClass}
                    type="button"
                    onClick={handleTelegramAction}
                    disabled={telegramLoading}
                  >
                    {telegramLoading ? "Создание..." : telegramButtonLabel}
                  </button>
                </div>
              )}
              {isTelegramConnected ? (
                <p className="telegram-status">Telegram привязан</p>
              ) : (
                <p className="muted">
                  Привяжите Telegram, чтобы получать уведомления и просматривать курсы.
                </p>
              )}
            </div>

            <div className="cabinet-telegram cabinet-vk">
              <div className="cabinet-telegram-title">ВКонтакте</div>
              {!isVKConnected && vkError && (
                <div className="auth-error">{vkError}</div>
              )}
              {isVKConnected ? (
                <p className="telegram-status">ВКонтакте привязан</p>
              ) : vkCode ? (
                <div className="vk-code-block">
                  <div className="vk-code-row">
                    <code className="vk-code">{vkCode.code}</code>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleCopyVKCode}
                    >
                      {vkCopied ? "Скопировано" : "Копировать"}
                    </button>
                  </div>
                  <p className="muted">
                    Отправьте этот код в сообщения сообщества ВКонтакте.
                    {vkExpiresLabel && ` Действует до ${vkExpiresLabel}.`}
                  </p>
                  {vkCode.group_link && (
                    <a
                      className="auth-button telegram-button active"
                      href={vkCode.group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Открыть сообщество
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-actions end">
                    <button
                      className="auth-button telegram-button"
                      type="button"
                      onClick={handleGenerateVKCode}
                      disabled={vkLoading}
                    >
                      {vkLoading ? "Создание..." : "Привязать ВКонтакте"}
                    </button>
                  </div>
                  <p className="muted">
                    Получите код и отправьте его боту сообщества, чтобы привязать
                    аккаунт.
                  </p>
                </>
              )}
            </div>
          </div>
      </div>

      <div className="cabinet-grid">
        <section className="cabinet-card">
          <div className="cabinet-card-top">
            <div className="cabinet-card-header">
              <h2>Личные данные</h2>
            </div>
            {!isEditing && (
              <button className="secondary" type="button" onClick={startEdit}>
                Редактировать
              </button>
            )}
          </div>
          <div className="cabinet-details">
            {isEditing ? (
              <div className="cabinet-form">
                <label>
                  Почта
                  <input className="auth-input" value={profile.email} disabled />
                </label>
                <label>
                  Имя
                  <input
                    className="auth-input"
                    value={formValues.first_name}
                    onChange={handleInputChange("first_name")}
                  />
                </label>
                <label>
                  Фамилия
                  <input
                    className="auth-input"
                    value={formValues.last_name}
                    onChange={handleInputChange("last_name")}
                  />
                </label>
                <label>
                  Отчество
                  <input
                    className="auth-input"
                    value={formValues.patronymic}
                    onChange={handleInputChange("patronymic")}
                  />
                </label>
                <label>
                  Возраст
                  <input
                    className="auth-input"
                    type="number"
                    min={1}
                    value={formValues.age}
                    onChange={handleInputChange("age")}
                  />
                </label>
                <label>
                  Роль
                  <input className="auth-input" value={roleLabel(profile.role)} disabled />
                </label>
                <label>
                  Способ связи
                  <input
                    className="auth-input"
                    value={formValues.contact_method}
                    onChange={handleInputChange("contact_method")}
                  />
                </label>
              </div>
            ) : (
              detailRows.map((row) => (
                <div className="cabinet-row" key={row.label}>
                  <span className="cabinet-label">{row.label}</span>
                  <span className="cabinet-value">{row.value}</span>
                </div>
              ))
            )}
          </div>
          {isEditing && (
            <div className="cabinet-actions">
              {saveError && <div className="auth-error">{saveError}</div>}
              <div className="form-actions end">
                <button className="secondary" type="button" onClick={cancelEdit} disabled={saving}>
                  Отмена
                </button>
                <button className="auth-button" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="cabinet-card">
          <div className="cabinet-avatar">
            <img src={avatarSrc} alt="Аватар пользователя" />
          </div>
          {isEditing ? (
            <div className="cabinet-bio cabinet-bio-edit">
              <label>
                Описание себя
                <textarea
                  className="auth-input"
                  rows={5}
                  value={formValues.bio}
                  onChange={handleInputChange("bio")}
                />
              </label>
              <label>
                Фото себя
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="cabinet-bio cabinet-bio-display">
              {bio ? <p>{bio}</p> : <span className="muted">Описание себя</span>}
            </div>
          )}
        </section>
      </div>

      {isParent && childrenLoaded && (
        <section className="courses-hero cabinet-children">
          <h3>Мои ученики</h3>
          <p className="muted">Добавьте ученика по email, чтобы следить за его успеваемостью.</p>
          <form className="add-assistant-form" onSubmit={handleAddChild}>
            <input
              className="auth-input"
              type="email"
              placeholder="Email ученика"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              required
            />
            <button className="auth-button" type="submit" disabled={childLoading}>
              {childLoading ? "Добавляем..." : "Добавить"}
            </button>
          </form>
          {childError && <div className="auth-error">{childError}</div>}
          {children.length === 0 ? (
            <div className="muted">Учеников пока нет.</div>
          ) : (
            <div className="assistants-permissions">
              {children.map((child) => {
                const name = `${child.first_name || ""} ${child.last_name || ""}`.trim() || child.email;
                return (
                  <div key={child.id} className="assistant-permissions-row">
                    <div className="assistant-name">
                      <strong>{name}</strong>
                      <span className="muted">{child.email}</span>
                    </div>
                    <button
                      type="button"
                      className="danger small"
                      onClick={() => handleRemoveChild(child.id)}
                    >
                      Удалить
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
