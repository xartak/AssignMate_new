import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "@/features/auth/api";
import { useAuth } from "@/shared/hooks/useAuth";
import { formatAuthError } from "@/features/auth/utils";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login({ email, password });
      setAuth({
        token: data.access,
        role: data.user.role,
        userId: data.user.id,
      });
      navigate("/cabinet");
    } catch (err) {
      setError(formatAuthError(err, "Неверный логин или пароль"));
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
          <h1>Добро пожаловать!</h1>
          <p>Следите за курсами, проверяйте ответы и держите процесс обучения под контролем.</p>
          <div className="auth-features">
            <div className="auth-feature">Быстрый доступ к курсам и урокам.</div>
            <div className="auth-feature">Отличная система контроля ответов и домашних заданий.</div>
            <div className="auth-feature">Лучшие преподаватели.</div>
          </div>
        </section>
        <section className="auth-panel">
          <div>
            <h2>Вход</h2>
            <p>Используйте email и пароль, чтобы продолжить.</p>
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
                placeholder="student@mail.com"
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
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
          <div className="auth-footer">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
