/* One icon family: rounded outline, 24px grid, 1.75px stroke, round caps and joins.
   Lucide supplies the glyphs (ISC license); brand glyphs below follow the same rules.
   Decorative icons are hidden from assistive technology; pass `label` when an icon stands alone. */
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Menu, Play, Check, ChevronRight, CircleAlert, CircleCheck, Copy, Download, FileSpreadsheet,
  Info, Lightbulb, Link2, Lock, LogIn, MessageCircle, MessageSquareText, Minus, RefreshCw, Send, ShoppingBag,
  TrendingUp, TriangleAlert, Upload, X, ChartColumn, Eye, Bookmark, CircleHelp, Heart, Film, UserRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Glyph = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean } & SVGProps<SVGSVGElement>>;

/* Brand glyph: three bars and their reflection. Same drawing rules as the set. */
const Reflect: Glyph = ({ size = 24, strokeWidth = 1.75, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M5 10V8M12 10V5M19 10V3" />
    <path d="M5 14v2M12 14v5M19 14v7" opacity="0.55" />
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
  reflect: Reflect,
  arrow: ArrowRight,
  play: Play,
  menu: Menu,
  views: Eye,
  saves: Bookmark,
  questions: CircleHelp,
  sales: ShoppingBag,
  likes: Heart,
  comments: MessageCircle,
  posts: Film,
  user: UserRound,
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
