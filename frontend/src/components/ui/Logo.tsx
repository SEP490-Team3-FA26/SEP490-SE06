import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  iconClassName?: string; /* unused but kept for compatibility */
  textClassName?: string;
  to?: string;
}

export function Logo({ className = "", textClassName = "", to }: LogoProps) {
  const role = localStorage.getItem("userRole") || "";
  let targetPath = "/";

  if (to) {
    targetPath = to;
  } else if (role === "admin" || role === "head_branch") {
    targetPath = "/admin";
  } else if (role === "warehouse") {
    targetPath = "/warehouse";
  } else if (role === "branch") {
    targetPath = "/branch";
  } else if (role === "pharmacist") {
    targetPath = "/pharmacist";
  }

  return (
    <Link to={targetPath} className={`flex flex-col ${className}`}>
      <span className={`font-black text-[24px] text-[#0057cd] tracking-tight ${textClassName}`}>ABC Pharmacy</span>
      <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Hệ thống quản lý chuỗi</span>
    </Link>
  );
}
