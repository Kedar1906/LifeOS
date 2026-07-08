import { useState, useMemo, useEffect, useCallback, useRef } from "react";

export const TABS = ["Home", "Planner", "Goals", "Habits", "Finance"];
export const PLAN_CATEGORIES = ["Work", "Health", "Learning", "Mind", "Personal", "Finance", "Roadmap Task"];
export const VIEWS = ["Week", "Month"];
export const CAT_COLOR = { Work: "#6366f1", Health: "#10b981", Learning: "#f59e0b", Mind: "#06b6d4", Personal: "#ec4899", Finance: "#14b8a6", "Roadmap Task": "#8b5cf6" };
export const EXP_CATS = ["EMI", "Rent", "Groceries", "Utilities", "Entertainment", "Health", "Transport", "Other"];
export const INV_TYPES = ["Mutual Fund", "Stocks", "PPF", "NPS", "FD", "Gold", "Real Estate", "Crypto", "Other"];
export const INS_TYPES = ["Life", "Health", "Term", "Vehicle", "Other"];
export const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#8b5cf6", "#f97316"];
export const ICONS = { Home: "🏠", Planner: "📅", Goals: "🎯", Habits: "🔥", Finance: "💰" };

export function pColor(p) {
  return p >= 80 ? "#10b981" : p >= 50 ? "#f59e0b" : p > 0 ? "#ef4444" : "#64748b";
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fmt(d) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export function dfn(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date(today())) / 86400000);
}

export function dateDiffDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const diff = Math.round((e - s) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

export function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function clsx(...args) {
  return args.filter(Boolean).join(" ");
}
