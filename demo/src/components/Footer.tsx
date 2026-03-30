export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
            Noreflow
          </span>
          <span className="text-sm text-gray-500">
            Pure TypeScript Layout Engine
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a
            href="https://github.com/jbpete87/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            npm
          </a>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}
