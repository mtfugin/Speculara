import React, { useEffect, useId, useState } from "react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/design-system/Logo";
import { MARK_BARS } from "@/design-system/Logo";

/* Responsive Hero Banner, evolved from the supplied template.
   Kept: nav pill, menu, headline, two actions, shadcn-style props.
   Changed on request: no photo (the background is drawn: a dot grid and the logo's bars with their reflection),
   no badge, no partner row, a new display face, and the first screen fits one viewport with the upload card beside the text. */

interface NavLink {
    label: string;
    href: string;
    isActive?: boolean;
}

interface ResponsiveHeroBannerProps {
    navLinks?: NavLink[];
    ctaButtonText?: string;
    ctaButtonHref?: string;
    onCtaClick?: () => void;
    title?: string;
    emphasis?: string;
    description?: string;
    primaryButtonText?: string;
    primaryButtonHref?: string;
    onPrimaryClick?: () => void;
    secondaryButtonText?: string;
    secondaryButtonHref?: string;
    onSecondaryClick?: () => void;
    /** Content beside the headline, usually the upload card. */
    aside?: React.ReactNode;
}

/** A link, or a button when a click handler is given. */
const Action = ({
    href,
    onClick,
    className,
    children,
}: {
    href: string;
    onClick?: () => void;
    className: string;
    children: React.ReactNode;
}) =>
    onClick ? (
        <button type="button" onClick={onClick} className={className}>
            {children}
        </button>
    ) : (
        <a href={href} className={className}>
            {children}
        </a>
    );

/** The logo's bars and reflection, drawn large behind the hero. They rise once, then stay still. */
function MirrorBackdrop() {
    const top = 24 - 3;
    const bottom = 24 + 3;
    return (
        <svg
            className="pointer-events-none absolute -bottom-24 -right-24 -z-10 hidden h-[860px] w-[860px] lg:block"
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
        >
            {MARK_BARS.map((b, i) => (
                <g key={b.x}>
                    <rect
                        className="bar-grow"
                        style={{ ["--i" as string]: i, transformBox: "fill-box", transformOrigin: "50% 100%" }}
                        x={b.x} y={top - b.h} width="8" height={b.h} rx="3" fill="none" stroke="#f5f5f7" strokeOpacity="0.14" strokeWidth="0.12"
                    />
                    <rect
                        className="bar-grow"
                        style={{ ["--i" as string]: i + 3, transformBox: "fill-box", transformOrigin: "50% 0%" }}
                        x={b.x} y={bottom} width="8" height={b.h} rx="3" fill="none" stroke="#ff9f0a" strokeOpacity="0.28" strokeWidth="0.12"
                    />
                </g>
            ))}
        </svg>
    );
}

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
    navLinks = [
        { label: "Home", href: "#top", isActive: true },
        { label: "Data", href: "#data" },
        { label: "Questions", href: "#questions" },
        { label: "About", href: "#docs" }
    ],
    ctaButtonText = "Try the demo",
    ctaButtonHref = "#data",
    onCtaClick,
    title = "Turn views, saves, and sales into the",
    emphasis = "next decision.",
    description = "Upload your CSV or Excel export. Get measured findings, clear limits, and a next action grounded in views, saves and sales.",
    primaryButtonText = "Try the demo",
    primaryButtonHref = "#data",
    onPrimaryClick,
    secondaryButtonText = "Upload a file",
    secondaryButtonHref = "#data",
    onSecondaryClick,
    aside
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuId = useId();

    useEffect(() => {
        if (!mobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileMenuOpen]);

    return (
        <section id="top" className="on-dark relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-canvas">
            {/* Background: one soft orange light and the logo bars as an outline. */}
            <div
                className="pointer-events-none absolute inset-0 -z-10"
                aria-hidden="true"
                style={{
                    backgroundImage:
                        "radial-gradient(60% 55% at 12% 105%, rgba(255,159,10,0.13), transparent 70%)",
                                        
                }}
            />
            <MirrorBackdrop />

            <header className="relative z-10">
                <div className="mx-auto max-w-[var(--layout-app)] px-[var(--layout-gutter)]">
                    <div className="flex h-20 items-center justify-between">
                        <a href="#top" aria-label="Speculara home" className="inline-flex min-h-11 items-center rounded">
                            <Logo size={32} tone="reversed" />
                        </a>

                        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
                            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10 backdrop-blur">
                                {navLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.href}
                                        aria-current={link.isActive ? "page" : undefined}
                                        className={`rounded-full px-3 py-2 text-sm font-medium transition-colors hover:text-white ${link.isActive ? "text-white" : "text-white/70"}`}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                                <Action
                                    href={ctaButtonHref}
                                    onClick={onCtaClick}
                                    className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
                                >
                                    {ctaButtonText}
                                    <ArrowUpRight className="h-4 w-4" />
                                </Action>
                            </div>
                        </nav>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/15 backdrop-blur md:hidden"
                            aria-expanded={mobileMenuOpen}
                            aria-controls={menuId}
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5 text-white/90" /> : <Menu className="h-5 w-5 text-white/90" />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div id={menuId} className="mb-3 rounded-3xl bg-zinc-900/80 p-2 ring-1 ring-white/10 backdrop-blur-xl md:hidden">
                            <ul>
                                {navLinks.map((link, index) => (
                                    <li key={index}>
                                        <a
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            aria-current={link.isActive ? "page" : undefined}
                                            className="flex min-h-11 items-center rounded-2xl px-3 text-base font-medium text-white/90 hover:bg-white/10"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <Action
                                href={ctaButtonHref}
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    onCtaClick?.();
                                }}
                                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-semibold text-neutral-900"
                            >
                                {ctaButtonText}
                                <ArrowUpRight className="h-4 w-4" />
                            </Action>
                        </div>
                    )}
                </div>
            </header>

            <div className="relative z-10 flex flex-1 items-center">
                <div className="mx-auto grid w-full max-w-[var(--layout-app)] items-center gap-12 px-[var(--layout-gutter)] pb-10 pt-2 lg:grid-cols-[1fr_1.08fr] lg:gap-14">
                    <div className="min-w-0">
                        <h1 className="stagger-in font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.4rem]" style={{ ["--i" as string]: 0 }}>
                            {title}{" "}
                            <span
                                className="inline-block whitespace-nowrap text-white"
                                style={{ WebkitBoxReflect: "below -0.14em linear-gradient(transparent 52%, rgba(255,255,255,0.2))" } as React.CSSProperties}
                            >
                                {emphasis}
                            </span>
                        </h1>

                        <p className="stagger-in mt-10 max-w-md text-base leading-relaxed text-white/70 sm:text-lg" style={{ ["--i" as string]: 1 }}>
                            {description}
                        </p>

                        <div className="stagger-in mt-9 flex flex-wrap items-center gap-3 sm:gap-4" style={{ ["--i" as string]: 2 }}>
                            <Action
                                href={primaryButtonHref}
                                onClick={onPrimaryClick}
                                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-neutral-900 transition-transform hover:bg-white/90 active:scale-[0.97]"
                            >
                                {primaryButtonText}
                                <ArrowRight className="h-4 w-4" />
                            </Action>
                            <Action
                                href={secondaryButtonHref}
                                onClick={onSecondaryClick}
                                className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white/85 ring-1 ring-white/15 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                {secondaryButtonText}
                            </Action>
                        </div>
                    </div>

                    {aside && (
                        <div className="stagger-in min-w-0" style={{ ["--i" as string]: 3 }}>
                            {aside}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ResponsiveHeroBanner;
