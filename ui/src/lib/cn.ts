import { twMerge } from "tailwind-merge";

type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const flat = (v: ClassValue): string => {
    if (!v && v !== 0) return "";
    if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(" ");
    return String(v);
  };
  return twMerge(inputs.map(flat).filter(Boolean).join(" "));
}

