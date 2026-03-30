export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-gray-950 to-gray-950" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 lg:px-8 w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          The performance wall every serious web app hits
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
          <span className="text-white">Text Reflow</span>
          <br />
          <span className="text-white">Is </span>
          <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Killing
          </span>
          <span className="text-white"> Your App</span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
          Every time an AI chat streams a token, the browser recalculates the entire page layout.
          That&apos;s why ChatGPT stutters, Slack&apos;s scroll jumps, and Google Docs lags on long documents.
          <span className="text-white font-medium"> The DOM was never designed for text that changes 20 times per second.</span>
        </p>

        <div className="mt-6 text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
          <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent font-bold">Pretext + Noreflow</span>
          {' '}measure text and compute layout as pure math — no DOM, no reflow, no jank.
          <span className="text-emerald-400 font-semibold"> Watch it work. ↓</span>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          <a
            href="#live-demos"
            className="rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 transition-colors"
          >
            See the Live Demo
          </a>
          <a
            href="#playground"
            className="rounded-xl bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors"
          >
            Try the Playground
          </a>
          <a
            href="https://github.com/jbpete87/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors"
          >
            GitHub
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
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
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs font-medium text-gray-400 mt-1">{label}</div>
      <div className="text-xs text-gray-600 mt-0.5">{sublabel}</div>
    </div>
  );
}
