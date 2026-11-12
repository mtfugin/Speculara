/* Responsive Hero Banner (shadcn-style component, adapted to the Speculara brand).
   Same structure as the original template: nav pill, badge, headline, two actions, audience row.
   Differences, on purpose:
   - Colors are the existing tokens only (primary, white, ink, sky). The template's zinc palette is not used.
   - Type is Sora for the headline and Manrope for text (the template used Instrument Serif and Inter).
   - No photo by default: the brand's ring pattern is the backdrop. `backgroundImageUrl` still works if you want one.
   - The mobile menu actually opens (the template toggled state but never rendered a menu).
   - Actions can be links or buttons, so the page can start the demo or focus the upload box.
   - Entrance animation uses the shared stagger motion and respects reduced motion. */
import { useEffect, useId, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/design-system/Icon";
import { Logo } from "@/design-system/Logo";
import { RingsPattern } from "@/design-system/patterns";
import { cn } from "@/lib/utils";

export interface NavLink {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface Partner {
  label: string;
  href?: string;
  logoUrl?: string;
}

export interface ResponsiveHeroBannerProps {
  logo?: ReactNode;
  backgroundImageUrl?: string;
  navLinks?: NavLink[];
  ctaButtonText?: string;
  ctaButtonHref?: string;
  onCtaClick?: () => void;
  badgeLabel?: string;
  badgeText?: string;
  title?: string;
  titleLine2?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  onPrimaryClick?: () => void;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  onSecondaryClick?: () => void;
  partnersTitle?: string;
  partners?: Partner[];
  className?: string;
}

/** A link when it has an href and no handler, otherwise a real button. */
function Action({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className: string;
  children: ReactNode;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return (
    <a href={href ?? "#"} className={className}>
      {children}
    </a>
  );
}

const stagger = (i: number) => ({ ["--i" as string]: i });

export default function ResponsiveHeroBanner({
  logo = <Logo size={32} tone="reversed" />,
  backgroundImageUrl,
  navLinks = [
    { label: "Home", href: "#top", isActive: true },
    { label: "Start", href: "#start" },
    { label: "Questions", href: "#questions" },
    { label: "About", href: "#docs" },
  ],
  ctaButtonText = "Try the demo",
  ctaButtonHref = "#start",
  onCtaClick,
  badgeLabel = "Plain English",
  badgeText = "Findings, limits and one next step",
  title = "Turn views, saves, and sales",
  titleLine2 = "into the next decision.",
  description = "Upload your CSV or Excel export. Get measured findings, clear limits, and a next action grounded in views, saves and sales.",
  primaryButtonText = "Try the demo",
  primaryButtonHref = "#start",
  onPrimaryClick,
  secondaryButtonText = "Upload a file",
  secondaryButtonHref = "#start",
  onSecondaryClick,
  partnersTitle = "Built for",
  partners = [
    { label: "Marketing Teams" },
    { label: "Advertisement Agencies" },
    { label: "Public Relations (PR) Agencies" },
    { label: "Brand Strategists" },
    { label: "Market Research Analysts" },
  ],
  className,
}: ResponsiveHeroBannerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const pill = "ring-1 ring-white/15 backdrop-blur";
  const linkBase = "rounded-full px-3 py-2 text-sm font-medium transition-colors hover:text-white";

  return (
    <section id="top" className={cn("on-dark relative isolate overflow-hidden bg-primary text-white", className)}>
      {backgroundImageUrl ? (
        <img src={backgroundImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
      ) : (
        <div className="pointer-events-none absolute -right-40 -top-40 -z-10 hidden w-[720px] text-white sm:block" aria-hidden="true">
          <RingsPattern opacity={0.14} />
        </div>
      )}

      <div className="mx-auto max-w-[var(--layout-app)] px-[var(--layout-gutter)]">
        <div className="flex h-20 items-center justify-between">
          <a href="#top" aria-label="Speculara home" className="inline-flex min-h-11 items-center rounded-lg">
            {logo}
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <div className={cn("flex items-center gap-1 rounded-full bg-white/5 p-1", pill)}>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-current={link.isActive ? "page" : undefined}
                  className={cn(linkBase, link.isActive ? "text-white" : "text-white/80")}
                >
                  {link.label}
                </a>
              ))}
              <Action
                href={ctaButtonHref}
                onClick={onCtaClick}
                className="ml-1 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-mist"
              >
                {ctaButtonText}
                <Icon name="up" size="sm" />
              </Action>
            </div>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={cn("inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 md:hidden", pill)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size="md" />
          </button>
        </div>

        {menuOpen && (
          <div id={menuId} className={cn("focus-in mb-4 rounded-2xl bg-white/5 p-2 md:hidden", pill)}>
            <ul>
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={link.isActive ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-white/90 hover:bg-white/10"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Action
              href={ctaButtonHref}
              onClick={() => {
                setMenuOpen(false);
                onCtaClick?.();
              }}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-semibold text-ink"
            >
              {ctaButtonText}
              <Icon name="up" size="sm" />
            </Action>
          </div>
        )}

        <div className="mx-auto max-w-3xl pb-14 pt-10 text-center md:pt-16">
          <div className={cn("stagger-in mb-6 inline-flex max-w-full items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4", pill)} style={stagger(0)}>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink">{badgeLabel}</span>
            <span className="min-w-0 text-left text-sm font-medium text-white/90">{badgeText}</span>
          </div>

          <h1 className="stagger-in font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl" style={stagger(1)}>
            {title}
            <br className="hidden sm:block" /> {titleLine2}
          </h1>

          <p className="stagger-in mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg" style={stagger(2)}>
            {description}
          </p>

          <div className="stagger-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4" style={stagger(3)}>
            <Action
              href={primaryButtonHref}
              onClick={onPrimaryClick}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-mist"
            >
              {primaryButtonText}
              <Icon name="arrow" size="sm" />
            </Action>
            <Action
              href={secondaryButtonHref}
              onClick={onSecondaryClick}
              className={cn("inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10", pill)}
            >
              {secondaryButtonText}
              <Icon name={"upload" as IconName} size="sm" />
            </Action>
          </div>
        </div>

        <div className="stagger-in mx-auto max-w-5xl pb-16" style={stagger(4)}>
          <p className="text-center text-sm text-white/70">{partnersTitle}</p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {partners.map((p) => (
              <li key={p.label}>
                {p.href ? (
                  <a href={p.href} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-white/90 ring-1 ring-white/20 hover:bg-white/10">
                    {p.label}
                  </a>
                ) : (
                  <span className="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-white/90 ring-1 ring-white/20">{p.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
