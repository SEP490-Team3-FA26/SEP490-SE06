import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  let role = localStorage.getItem("userRole");

  if (!token) {
    return <Navigate to="/auth/login" replace />;
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

  const isAllowed = allowedRoles.includes(role) ||
    (role === "head_branch" && allowedRoles.includes("director")) ||
    (role === "director" && allowedRoles.includes("head_branch"));

  if (role && !isAllowed) {
    // Redirect other roles to their respective dashboards
    switch (role) {
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
        return <Navigate to="/auth/login" replace />;
    }
  }

  return <Outlet />;
}
