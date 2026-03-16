import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "@/features/auth/api";
import { useAuth } from "@/shared/hooks/useAuth";
import { formatAuthError } from "@/features/auth/utils";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        password_confirm: passwordConfirm,
      });
      setAuth({
        token: data.access,
        role: data.user.role,
        userId: data.user.id,
      });
      navigate("/cabinet");
    } catch (err) {
      setError(formatAuthError(err, "Не удалось зарегистрироваться. Проверьте данные."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb mint" />
      <div className="auth-orb peach" />
      <div className="auth-card">
        <section className="auth-hero">
          <span className="auth-pill">AssignMate</span>
          <h1>Создайте рабочее пространство</h1>
          <p>Зарегистрируйтесь и получите доступ, когда администратор назначит роль.</p>
          <div className="auth-features">
            <div className="auth-feature">Отличная система контроля ответов и домашних заданий.</div>
            <div className="auth-feature">Лучшие преподаватели.</div>
            <div className="auth-feature">Быстрый доступ к курсам и урокам.</div>
          </div>
        </section>
        <section className="auth-panel">
          <div>
            <h2>Регистрация</h2>
            <p>Заполните данные, чтобы создать аккаунт.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Эл. почта</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="firstName">Имя</label>
              <input
                id="firstName"
                className="auth-input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName">Фамилия</label>
              <input
                id="lastName"
                className="auth-input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="passwordConfirm">Подтверждение пароля</label>
              <input
                id="passwordConfirm"
                className="auth-input"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Создаем..." : "Создать аккаунт"}
            </button>
          </form>
          <div className="auth-footer">
            Роль назначается администратором после регистрации.
          </div>
          <div className="auth-footer">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
