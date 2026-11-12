import "./chat-bot-icon.css";
import { useId } from "react";

/* The chat launcher mascot: an orange blob with two slanted eyes and a floating dot.
   Built as layered SVG so it reads as a 3D object (lit from the upper left). The parent
   button sets --tx / --ty (-1..1) on pointer move; CSS in index.css does the tilt, the
   eye look, the blink and the bobbing dot. */
export function ChatBotIcon({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const body = "M44 18 A38 38 0 0 0 6 56 A38 38 0 0 0 44 94 L74 94 Q82 94 82 86 L82 56 A38 38 0 0 0 44 18 Z";
  return (
    <svg viewBox="0 0 100 104" className={`bot3d ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}b`} cx="32%" cy="26%" r="95%">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.38" stopColor="#ff9f0a" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffc356" />
          <stop offset="1" stopColor="#ea580c" />
        </radialGradient>
        <radialGradient id={`${id}rim`} cx="78%" cy="82%" r="60%">
          <stop offset="0" stopColor="#fff1d0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff1d0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a2f" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={body} />
        </clipPath>
      </defs>

      {/* contact shadow */}
      <ellipse className="bot3d-shadow" cx="46" cy="100" rx="30" ry="3.6" fill="#000" opacity="0.35" />

      <g className="bot3d-dot">
        <circle cx="84" cy="14" r="9" fill={`url(#${id}d)`} />
        <ellipse cx="81" cy="10.5" rx="3.2" ry="1.9" fill="#fff" opacity="0.5" transform="rotate(-30 81 10.5)" />
      </g>

      <g className="bot3d-body">
        <path d={body} fill={`url(#${id}b)`} />
        <g clipPath={`url(#${id}c)`}>
          <rect x="0" y="0" width="100" height="104" fill={`url(#${id}rim)`} />
          <path d="M6 56 A38 38 0 0 0 44 94 L74 94 Q82 94 82 86 L82 80 Q60 104 20 80 Z" fill="#000" opacity="0.22" />
        </g>
        <ellipse cx="30" cy="32" rx="15" ry="8" fill={`url(#${id}s)`} transform="rotate(-35 30 32)" opacity="0.55" />

        <g className="bot3d-eyes">
          <g className="bot3d-eye" transform="rotate(-24 27 52)">
            <ellipse cx="27" cy="52" rx="6.6" ry="10.5" fill={`url(#${id}e)`} />
            <ellipse cx="25.6" cy="47.5" rx="2" ry="3.2" fill="#f5f5f7" opacity="0.95" />
          </g>
          <g className="bot3d-eye" transform="rotate(-24 56 56)">
            <ellipse cx="56" cy="56" rx="6.6" ry="10.5" fill={`url(#${id}e)`} />
            <ellipse cx="54.6" cy="51.5" rx="2" ry="3.2" fill="#f5f5f7" opacity="0.95" />
          </g>
        </g>
      </g>
    </svg>
  );
}
