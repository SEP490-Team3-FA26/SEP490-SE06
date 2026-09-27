import { Navigate, Outlet, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  let role = localStorage.getItem("userRole");

  // Deep linking: Lưu lại đường dẫn người dùng đang muốn truy cập
  const currentPath = location.pathname + location.search;
  const returnUrl = encodeURIComponent(currentPath);

  if (!token) {
    return <Navigate to={`/auth/login?redirect=${returnUrl}`} replace />;
  }

  // Fallback: If role is not directly in localStorage, inspect user object or decode JWT
  if (!role) {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.role) {
          role = u.role;
          localStorage.setItem("userRole", role as string);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!role && token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.role) {
          role = payload.role;
          localStorage.setItem("userRole", role as string);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const normalizedRole = role ? role.toLowerCase() : "";
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  const isAllowed = normalizedAllowedRoles.includes(normalizedRole) ||
    (normalizedRole === "head_branch" && normalizedAllowedRoles.includes("director")) ||
    (normalizedRole === "director" && normalizedAllowedRoles.includes("head_branch"));

  if (role && !isAllowed) {
    // Redirect other roles to their respective dashboards
    switch (normalizedRole) {
      case "admin":
        return <Navigate to="/admin" replace />;
      case "director":
      case "head_branch":
        return <Navigate to="/director" replace />;
      case "warehouse":
        return <Navigate to="/warehouse" replace />;
      case "branch":
        return <Navigate to="/branch" replace />;
      case "pharmacist":
        return <Navigate to="/pharmacist" replace />;
      case "user":
        return <Navigate to="/customer" replace />;
      default:
        return <Navigate to={`/auth/login?redirect=${returnUrl}`} replace />;
    }
  }

  return <Outlet />;
}
