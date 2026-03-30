import { useState, useEffect } from 'react';

const LINKS = [
  { href: '#live-demos', label: 'Live Demo' },
  { href: '#why', label: 'Why Noreflow' },
  { href: '#playground', label: 'Playground' },
  { href: '#comparison', label: 'vs Yoga' },
  { href: '#features', label: 'Features' },
  { href: '#performance', label: 'Performance' },
  { href: '#get-started', label: 'Get Started' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-page/95 backdrop-blur-sm border-b border-border-strong/30 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="text-xl font-bold text-text-primary">
            Noreflow
          </a>

          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-primary hover:text-emerald-600 hover:bg-surface-alt transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/jbpete87/noreflow"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:text-emerald-600 hover:bg-surface-alt transition-colors"
            >
              GitHub
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-text-muted hover:text-text-primary"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border-strong/30 bg-page">
          <div className="px-6 py-4 space-y-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary hover:text-emerald-600 hover:bg-surface-alt transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
