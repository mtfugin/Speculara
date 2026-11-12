"use client";

import React, { useEffect, useId, useState } from "react";
import { ArrowRight, ArrowUpRight, Building2, Megaphone, Menu, Newspaper, Palette, Play, Search, X } from "lucide-react";
import { Logo } from "@/design-system/Logo";

/* Responsive Hero Banner: the supplied template, used as given.
   Markup, classes and layout are the template's. Only these things differ:
   - Copy is Speculara's, not the space copy.
   - Image assets are filled: the background is an Unsplash photo (checked to exist); the logo is the live Speculara logo;
     the partner logos are lucide-react icons with labels instead of CDN images.
   - Inline svgs are lucide-react icons.
   - The template toggled the mobile menu state but never rendered a menu, so one is rendered here.
   - Actions can also be buttons (onCtaClick, onPrimaryClick, onSecondaryClick) so the page can start the demo. */

interface NavLink {
    label: string;
    href: string;
    isActive?: boolean;
}

interface Partner {
    logoUrl?: string;
    icon?: React.ReactNode;
    label?: string;
    href: string;
}

interface ResponsiveHeroBannerProps {
    logoUrl?: string;
    backgroundImageUrl?: string;
    navLinks?: NavLink[];
    ctaButtonText?: string;
    ctaButtonHref?: string;
    onCtaClick?: () => void;
    badgeText?: string;
    badgeLabel?: string;
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

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
    logoUrl,
    backgroundImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80",
    navLinks = [
        { label: "Home", href: "#top", isActive: true },
        { label: "Start", href: "#start" },
        { label: "Questions", href: "#questions" },
        { label: "About", href: "#docs" }
    ],
    ctaButtonText = "Try the demo",
    ctaButtonHref = "#start",
    onCtaClick,
    badgeLabel = "New",
    badgeText = "Plain-English answers from your own numbers",
    title = "Turn views, saves, and sales",
    titleLine2 = "into the next decision.",
    description = "Upload your CSV or Excel export. Get measured findings, clear limits, and a next action grounded in views, saves and sales.",
    primaryButtonText = "Try the demo",
    primaryButtonHref = "#start",
    onPrimaryClick,
    secondaryButtonText = "Upload a file",
    secondaryButtonHref = "#start",
    onSecondaryClick,
    partnersTitle = "Built for the teams who answer to the numbers",
    partners = [
        { icon: <Megaphone className="h-4 w-4" />, label: "Marketing Teams", href: "#start" },
        { icon: <Building2 className="h-4 w-4" />, label: "Advertisement Agencies", href: "#start" },
        { icon: <Newspaper className="h-4 w-4" />, label: "PR Agencies", href: "#start" },
        { icon: <Palette className="h-4 w-4" />, label: "Brand Strategists", href: "#start" },
        { icon: <Search className="h-4 w-4" />, label: "Market Research Analysts", href: "#start" }
    ] as Partner[]
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
        <section id="top" className="on-dark w-full isolate min-h-screen overflow-hidden relative">
            <img
                src={backgroundImageUrl}
                alt=""
                className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />
            {/* Photo legibility: the template relied on a dark photo; this keeps the text readable on any image. */}
            <div className="pointer-events-none absolute inset-0 bg-black/45" />

            <header className="z-10 xl:top-4 relative">
                <div className="mx-6">
                    <div className="flex items-center justify-between pt-4">
                        {logoUrl ? (
                            <a
                                href="#top"
                                aria-label="Speculara home"
                                className="inline-flex items-center justify-center bg-center w-[100px] h-[40px] bg-cover rounded"
                                style={{ backgroundImage: `url(${logoUrl})` }}
                            />
                        ) : (
                            <a href="#top" aria-label="Speculara home" className="inline-flex min-h-11 items-center rounded">
                                <Logo size={32} tone="reversed" />
                            </a>
                        )}

                        <nav aria-label="Primary" className="hidden md:flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur">
                                {navLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.href}
                                        aria-current={link.isActive ? "page" : undefined}
                                        className={`px-3 py-2 text-sm font-medium hover:text-white font-sans transition-colors ${link.isActive ? 'text-white/90' : 'text-white/80'
                                            }`}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                                <Action
                                    href={ctaButtonHref}
                                    onClick={onCtaClick}
                                    className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90 font-sans transition-colors"
                                >
                                    {ctaButtonText}
                                    <ArrowUpRight className="h-4 w-4" />
                                </Action>
                            </div>
                        </nav>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur"
                            aria-expanded={mobileMenuOpen}
                            aria-controls={menuId}
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5 text-white/90" /> : <Menu className="h-5 w-5 text-white/90" />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div id={menuId} className="md:hidden mt-3 rounded-2xl bg-black/50 p-2 ring-1 ring-white/10 backdrop-blur">
                            <ul>
                                {navLinks.map((link, index) => (
                                    <li key={index}>
                                        <a
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            aria-current={link.isActive ? "page" : undefined}
                                            className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium font-sans text-white/90 hover:bg-white/10"
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
                                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-medium text-neutral-900 font-sans"
                            >
                                {ctaButtonText}
                                <ArrowUpRight className="h-4 w-4" />
                            </Action>
                        </div>
                    )}
                </div>
            </header>

            <div className="z-10 relative">
                <div className="sm:pt-28 md:pt-32 lg:pt-40 max-w-7xl mx-auto pt-28 px-6 pb-16">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-6 inline-flex max-w-full items-center gap-3 rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur animate-fade-slide-in-1">
                            <span className="inline-flex shrink-0 items-center text-xs font-medium text-neutral-900 bg-white/90 rounded-full py-0.5 px-2 font-sans">
                                {badgeLabel}
                            </span>
                            <span className="min-w-0 text-left text-sm font-medium text-white/90 font-sans">
                                {badgeText}
                            </span>
                        </div>

                        <h1 className="sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-4xl text-white tracking-tight font-instrument-serif font-normal animate-fade-slide-in-2">
                            {title}
                            <br className="hidden sm:block" />
                            {" "}{titleLine2}
                        </h1>

                        <p className="sm:text-lg animate-fade-slide-in-3 text-base text-white/80 max-w-2xl mt-6 mx-auto">
                            {description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:gap-4 mt-10 gap-3 items-center justify-center animate-fade-slide-in-4">
                            <Action
                                href={primaryButtonHref}
                                onClick={onPrimaryClick}
                                className="inline-flex items-center gap-2 hover:bg-white/15 text-sm font-medium text-white bg-white/10 ring-white/15 ring-1 rounded-full py-3 px-5 font-sans transition-colors"
                            >
                                {primaryButtonText}
                                <ArrowRight className="h-4 w-4" />
                            </Action>
                            <Action
                                href={secondaryButtonHref}
                                onClick={onSecondaryClick}
                                className="inline-flex items-center gap-2 rounded-full bg-transparent px-5 py-3 text-sm font-medium text-white/90 hover:text-white font-sans transition-colors"
                            >
                                {secondaryButtonText}
                                <Play className="w-4 h-4" />
                            </Action>
                        </div>
                    </div>

                    <div className="mx-auto mt-20 max-w-5xl">
                        <p className="animate-fade-slide-in-1 text-sm text-white/70 text-center">
                            {partnersTitle}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 animate-fade-slide-in-2 text-white/70 mt-6 items-center justify-items-center gap-4">
                            {partners.map((partner, index) => (
                                <a
                                    key={index}
                                    href={partner.href}
                                    className={
                                        partner.logoUrl
                                            ? "inline-flex items-center justify-center bg-center w-[120px] h-[36px] bg-cover rounded-full opacity-80 hover:opacity-100 transition-opacity"
                                            : "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-sm font-medium text-white/80 opacity-80 hover:opacity-100 transition-opacity"
                                    }
                                    style={partner.logoUrl ? { backgroundImage: `url(${partner.logoUrl})` } : undefined}
                                >
                                    {partner.icon}
                                    {partner.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ResponsiveHeroBanner;
