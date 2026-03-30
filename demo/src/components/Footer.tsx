export function Footer() {
  return (
    <footer className="border-t border-border-strong/20 py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-text-primary">
            Noreflow
          </span>
          <span className="text-sm text-text-muted">
            Pure TypeScript Layout Engine
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-text-muted">
          <a
            href="https://github.com/jbpete87/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            npm
          </a>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}
