import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";

type Crumb = {
  label: string;
  to?: string;
};

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/" || pathname === "/cabinet") {
    return [{ label: "Личный кабинет", to: "/cabinet" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let currentPath = "";
  const isDashboardPath = segments[0] === "dashboard";

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];

    if (isDashboardPath) {
      if (segment === "dashboard") {
        currentPath += "/dashboard";
        crumbs.push({ label: "Dashboard", to: currentPath });
        continue;
      }

      if (segment === "courses" && segments[i - 1] === "dashboard") {
        currentPath += "/courses";
        crumbs.push({ label: "Курсы", to: "/dashboard" });
        continue;
      }

      if (segments[i - 1] === "courses" && segments[i - 2] === "dashboard") {
        currentPath += `/${segment}`;
        crumbs.push({ label: `Курс ${segment}`, to: "/dashboard" });
        continue;
      }

      if (
        segment === "students" &&
        segments[i - 2] === "courses" &&
        segments[i - 3] === "dashboard"
      ) {
        currentPath += "/students";
        crumbs.push({ label: "Ученики", to: "/dashboard" });
        continue;
      }

      if (segments[i - 1] === "students") {
        currentPath += `/${segment}`;
        crumbs.push({ label: `Ученик ${segment}`, to: currentPath });
        continue;
      }

      if (segment === "homeworks" && segments[i - 2] === "students") {
        currentPath += "/homeworks";
        continue;
      }

      if (segments[i - 1] === "homeworks" && segments[i - 3] === "students") {
        currentPath += `/${segment}`;
        crumbs.push({ label: `Проверка ДЗ ${segment}`, to: currentPath });
        continue;
      }
    }

    if (segment === "courses") {
      currentPath += "/courses";
      crumbs.push({ label: "Мои курсы", to: currentPath });
      continue;
    }

    if (segments[i - 1] === "courses") {
      currentPath += `/${segment}`;
      crumbs.push({ label: `Курс ${segment}`, to: currentPath });
      continue;
    }

    if (segment === "lessons" || segment === "homeworks") {
      currentPath += `/${segment}`;
      continue;
    }

    if (segments[i - 1] === "lessons") {
      currentPath += `/${segment}`;
      crumbs.push({ label: `Урок ${segment}`, to: currentPath });
      continue;
    }

    if (segments[i - 1] === "homeworks") {
      currentPath += `/${segment}`;
      if (segment === "editor") {
        crumbs.push({ label: "Редактор ДЗ", to: currentPath });
      } else if (segment === "solve") {
        crumbs.push({ label: "Решение ДЗ", to: currentPath });
      } else {
        crumbs.push({ label: `ДЗ ${segment}`, to: currentPath });
      }
      continue;
    }

    if (segments[i - 2] === "homeworks" && (segments[i - 1] === "editor" || segments[i - 1] === "solve")) {
      currentPath += `/${segment}`;
      if (segment === "review") {
        crumbs.push({ label: "Итог", to: currentPath });
      } else {
        crumbs.push({ label: `ДЗ ${segment}`, to: currentPath });
      }
      continue;
    }

    if (segment === "dashboard") {
      currentPath += "/dashboard";
      crumbs.push({ label: "Dashboard", to: currentPath });
      continue;
    }

    if (segment === "cabinet") {
      currentPath += "/cabinet";
      crumbs.push({ label: "Личный кабинет", to: currentPath });
      continue;
    }

    if (segment === "student-dashboard") {
      currentPath += "/student-dashboard";
      crumbs.push({ label: "Dashboard", to: currentPath });
      continue;
    }

    if (segment === "my-stats" && segments[i - 2] === "courses") {
      currentPath += "/my-stats";
      crumbs.push({ label: "Моя статистика", to: currentPath });
      continue;
    }
  }

  return crumbs;
}

export function AppLayout() {
  const { role, logout } = useAuth();
  const canViewTeacherDashboard = role === "teacher" || role === "admin" || role === "assistant";
  const canViewStudentDashboard = role === "student" || role === "parent";
  const dashboardLink = canViewTeacherDashboard ? "/dashboard" : "/student-dashboard";
  const canViewDashboard = canViewTeacherDashboard || canViewStudentDashboard;
  const location = useLocation();
  const crumbs = buildCrumbs(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div>
      <nav>
        <div className="container nav-container">
          <div className="nav-brand">
            <Link to="/cabinet">AssignMate</Link>
          </div>
          <button
            type="button"
            className="nav-burger"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links${menuOpen ? " open" : ""}`}>
            <Link to="/courses" onClick={closeMenu}>Мои курсы</Link>
            <Link to="/cabinet" onClick={closeMenu}>Личный кабинет</Link>
            {canViewDashboard && <Link to={dashboardLink} onClick={closeMenu}>Dashboard</Link>}
            <button className="secondary" onClick={() => { closeMenu(); logout(); }}>
              Выйти
            </button>
          </div>
        </div>
      </nav>
      <main className="container">
        {crumbs.length > 0 && (
          <div className="breadcrumbs-container">
            <div className="breadcrumbs" role="navigation" aria-label="breadcrumbs">
              {crumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="breadcrumb-item">
                  {crumb.to && index < crumbs.length - 1 ? (
                    <Link to={crumb.to} className="crumb-label">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="crumb-label current">{crumb.label}</span>
                  )}
                  {index < crumbs.length - 1 && <span className="breadcrumb-sep">/</span>}
                </span>
              ))}
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
