export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center">
      <div className="mx-auto max-w-5xl px-6 py-24 lg:px-8 w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-600 mb-8">
          The performance wall every serious web app hits
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-text-primary">
          Text Reflow Is{' '}
          <span className="text-emerald-600">Killing</span>{' '}
          Your App
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-text-body max-w-3xl mx-auto leading-relaxed">
          Every time an AI chat streams a token, the browser recalculates the entire page layout.
          That&apos;s why ChatGPT stutters, Slack&apos;s scroll jumps, and Google Docs lags on long documents.
          <span className="text-text-primary font-medium"> The DOM was never designed for text that changes 20 times per second.</span>
        </p>

        <p className="mt-6 text-lg sm:text-xl text-text-body max-w-3xl mx-auto leading-relaxed">
          <span className="text-emerald-600 font-semibold">Pretext + Noreflow</span>
          {' '}measure text and compute layout as pure math — no DOM, no reflow, no jank.
        </p>

        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          <a
            href="#live-demos"
            className="rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            See the Live Demo
          </a>
          <a
            href="#playground"
            className="rounded-xl border border-border-subtle px-8 py-3.5 text-sm font-semibold text-text-body hover:bg-surface-alt transition-colors"
          >
            Try the Playground
          </a>
          <a
            href="https://github.com/jbpete87/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border-subtle px-8 py-3.5 text-sm font-semibold text-text-body hover:bg-surface-alt transition-colors"
          >
            GitHub
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl mx-auto">
          <Stat label="Layout time" value="<1ms" sublabel="for 1,000+ nodes" />
          <Stat label="DOM reflows" value="0" sublabel="pure arithmetic" />
          <Stat label="Dependencies" value="0" sublabel="pure TypeScript" />
          <Stat label="Bundle" value="~8kb" sublabel="gzipped" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-text-primary">{value}</div>
      <div className="text-xs font-medium text-text-body mt-1">{label}</div>
      <div className="text-xs text-text-muted mt-0.5">{sublabel}</div>
    </div>
  );
}
