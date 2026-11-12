/* One icon family: rounded outline, 24px grid, 1.75px stroke, round caps and joins.
   Lucide supplies the glyphs (ISC license); brand glyphs below follow the same rules.
   Decorative icons are hidden from assistive technology; pass `label` when an icon stands alone. */
import {
  ArrowDownRight, ArrowUpRight, Check, ChevronRight, CircleAlert, CircleCheck, Copy, Download, FileSpreadsheet,
  Info, Lightbulb, Link2, Lock, LogIn, MessageCircle, MessageSquareText, Minus, RefreshCw, Send, ShoppingBag,
  TrendingUp, TriangleAlert, Upload, X, ChartColumn,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Glyph = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean } & SVGProps<SVGSVGElement>>;

/* Brand glyph: two overlapping circles with the shared lens left open. Same drawing rules as the set. */
const Lens: Glyph = ({ size = 24, strokeWidth = 1.75, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <circle cx="9.5" cy="9.5" r="6.5" />
    <circle cx="14.5" cy="14.5" r="6.5" />
  </svg>
);

export const ICONS = {
  predict: TrendingUp,
  recommend: Lightbulb,
  charts: ChartColumn,
  correlation: Link2,
  sentiment: MessageSquareText,
  demand: ShoppingBag,
  upload: Upload,
  file: FileSpreadsheet,
  download: Download,
  copy: Copy,
  check: Check,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  info: Info,
  close: X,
  send: Send,
  chat: MessageCircle,
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
  signin: LogIn,
  lock: Lock,
  refresh: RefreshCw,
  next: ChevronRight,
  lens: Lens,
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;
const SIZES = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

export function Icon({
  name,
  size = "md",
  label,
  className,
}: {
  name: IconName;
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const Glyph = ICONS[name] as Glyph;
  return (
    <Glyph
      size={SIZES[size]}
      strokeWidth={1.75}
      className={className}
      aria-hidden={label ? undefined : true}
      {...(label ? { role: "img", "aria-label": label } : {})}
    />
  );
}
