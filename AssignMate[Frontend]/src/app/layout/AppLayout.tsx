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
      crumbs.push({ label: `ДЗ ${segment}`, to: currentPath });
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
  }

  return crumbs;
}

export function AppLayout() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const crumbs = buildCrumbs(location.pathname);

  return (
    <div>
      <nav>
        <div className="container">
          <div>
            <Link to="/cabinet">AssignMate</Link>
          </div>
          <div>
            <Link to="/courses">Мои курсы</Link>
            <Link to="/cabinet">Личный кабинет</Link>
            {role === "teacher" && <Link to="/dashboard">Dashboard</Link>}
            <button className="secondary" onClick={logout}>
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
