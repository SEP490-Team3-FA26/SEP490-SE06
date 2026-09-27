import React from "react";
import { Link } from "react-router-dom";
import { DoveFigure } from "../mascot/DoveFigure";

export interface MascotLogoIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  figureSize?: number;
}

export function MascotLogoIcon({
  size = "md",
  className = "",
  figureSize,
}: MascotLogoIconProps) {
  const iconSizes = {
    xs: { box: "w-7 h-7 rounded-lg", figure: 22, inner: "rounded-[6px]" },
    sm: { box: "w-8 h-8 rounded-lg", figure: 26, inner: "rounded-[6px]" },
    md: { box: "w-10 h-10 rounded-xl", figure: 34, inner: "rounded-[10px]" },
    lg: { box: "w-11 h-11 rounded-2xl", figure: 38, inner: "rounded-[13px]" },
    xl: { box: "w-14 h-14 rounded-2xl", figure: 48, inner: "rounded-[14px]" },
  };

  const currentSize = iconSizes[size] || iconSizes.md;
  const renderFigureSize = figureSize || currentSize.figure;

  return (
    <div
      className={`relative ${currentSize.box} bg-gradient-to-tr from-[#0057cd] via-[#0284c7] to-teal-400 p-[2px] shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all flex items-center justify-center shrink-0 ${className}`}
    >
      <div
        className={`w-full h-full ${currentSize.inner} bg-white flex items-center justify-center overflow-hidden pt-0.5`}
      >
        <DoveFigure
          size={renderFigureSize}
          kaal={true}
          decoratief={true}
          speels={false}
          paasei={false}
          label="ABC Pharmacy Mascot Logo"
        />
      </div>
    </div>
  );
}

export interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  to?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  layout?: "horizontal" | "vertical";
  hideIcon?: boolean;
}

export function Logo({
  className = "",
  iconClassName = "",
  textClassName = "",
  to,
  showSubtitle = true,
  subtitle = "Hệ thống quản lý chuỗi",
  size = "md",
  layout = "horizontal",
  hideIcon = false,
}: LogoProps) {
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

  const isVertical = layout === "vertical";

  return (
    <Link
      to={targetPath}
      className={`group ${
        isVertical
          ? "flex flex-col items-center text-center gap-2.5"
          : "flex items-center gap-3"
      } ${className}`}
    >
      {!hideIcon && <MascotLogoIcon size={size} className={iconClassName} />}
      <div className={`flex flex-col ${isVertical ? "items-center" : ""}`}>
        <span
          className={`font-black text-[20px] text-[#0057cd] tracking-tight leading-none group-hover:text-blue-700 transition-colors ${textClassName}`}
        >
          ABC Pharmacy
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}
