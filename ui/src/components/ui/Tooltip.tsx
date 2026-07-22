



import React, { useState } from "react";

/** Lightweight accessible tooltip for icon buttons. */
export function Tooltip({
  label,
  children,
  side = "top"




}: {label: string;children: React.ReactElement;side?: "top" | "bottom" | "left";}) {
  const [show, setShow] = useState(false);
  const pos =
  side === "bottom" ?
  "top-full mt-1.5 left-1/2 -translate-x-1/2" :
  side === "left" ?
  "right-full mr-1.5 top-1/2 -translate-y-1/2" :
  "bottom-full mb-1.5 left-1/2 -translate-x-1/2";
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}>
      
      {children}
      {show &&
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink text-canvas text-2xs font-medium px-2 py-1 shadow-pop ${pos}`}>
        
          {label}
        </span>
      }
    </span>);

}

