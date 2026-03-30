import { useRef, useEffect, useState, useCallback } from 'react';
import { computeLayout } from 'noreflow';
import type { FlexNode } from 'noreflow';
import { renderLayout } from '../canvas/renderLayout';

/* ── Demo 1: Grid dashboard that Yoga cannot express ───────────────── */

const gridDashboard: FlexNode = {
  style: {
    display: 'grid',
    width: 420,
    height: 300,
    gridTemplateColumns: [120, '1fr'],
    gridTemplateRows: [48, '1fr', '1fr'],
    gap: 6,
  },
  children: [
    { style: { gridColumnStart: 1, gridColumnEnd: 3 } },            // header spans full width
    { style: { gridRowStart: 2, gridRowEnd: 4 } },                  // sidebar spans both rows
    { style: {} },                                                    // content
    { style: {} },                                                    // footer widget
  ],
};

const yogaGridCode = `// Yoga — no grid API exists
// These properties are unsupported:
//   gridTemplateColumns
//   gridTemplateRows
//   gridColumnStart / gridColumnEnd
//   gridRowStart / gridRowEnd
//
// GitHub: "CSS Grid support" issue
// opened 2018, still open today.
//
// You'd need to manually calculate
// every position and size.`;

/* ── Demo 2: DX comparison ─────────────────────────────────────────── */

const noreflowCode = `import { computeLayout } from 'noreflow';

const layout = computeLayout({
  style: { width: 400, height: 300 },
  children: [
    { style: { flexGrow: 1 } },
    { style: { flexGrow: 2 } },
  ],
});

// Done. layout.children[0].width → 133`;

const yogaDxCode = `import Yoga from 'yoga-wasm-web';

// Step 1: Load and init WASM (async)
const yoga = await Yoga.init();

// Step 2: Create nodes imperatively
const root = yoga.Node.create();
root.setWidth(400);
root.setHeight(300);
root.setFlexDirection(yoga.FLEX_DIRECTION_ROW);

const child0 = yoga.Node.create();
child0.setFlexGrow(1);
root.insertChild(child0, 0);

const child1 = yoga.Node.create();
child1.setFlexGrow(2);
root.insertChild(child1, 1);

// Step 3: Calculate
root.calculateLayout(400, 300);

// Step 4: Read values back
const w = child0.getComputedWidth(); // 133

// Step 5: Free memory (!)
root.freeRecursive();`;

/* ── Demo 3: Live speed ────────────────────────────────────────────── */

function buildLargeTree(count: number): FlexNode {
  const children: FlexNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push({ style: { flexGrow: 1, height: 20, padding: 2 } });
  }
  return { style: { width: 1000, flexWrap: 'wrap', gap: 2, padding: 4 }, children };
}

/* ── Shared canvas mini-renderer ───────────────────────────────────── */

function MiniCanvas({ node, className, showDimensions = false }: { node: FlexNode; className?: string; showDimensions?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const result = computeLayout(node);
    renderLayout(ctx, result, rect.width, rect.height, {
      showLabels: true,
      showDimensions,
      padding: 16,
    });
  }, [node, showDimensions]);

  return <canvas ref={ref} className={className ?? 'w-full h-48'} />;
}

/* ── Code block component ──────────────────────────────────────────── */

function CodeBlock({ code, label, accent }: { code: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
      <div className={`px-4 py-2 border-b border-white/5 flex items-center gap-2 ${accent ? 'bg-brand-600/10' : ''}`}>
        <span className={`text-xs font-mono ${accent ? 'text-brand-400' : 'text-gray-500'}`}>{label}</span>
      </div>
      <pre className="p-4 text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export function Comparison() {
  const [speedResult, setSpeedResult] = useState<{ timeUs: number; nodes: number } | null>(null);
  const [speedRunning, setSpeedRunning] = useState(false);

  const runSpeedDemo = useCallback(() => {
    setSpeedRunning(true);
    setTimeout(() => {
      const tree = buildLargeTree(1000);
      computeLayout(tree); // warmup
      const iters = 50;
      const t0 = performance.now();
      for (let i = 0; i < iters; i++) computeLayout(tree);
      const elapsed = performance.now() - t0;
      setSpeedResult({ timeUs: Math.round((elapsed / iters) * 1000), nodes: 1001 });
      setSpeedRunning(false);
    }, 50);
  }, []);

  return (
    <section id="comparison" className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Noreflow vs The Old Way
          </h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Concrete examples where Noreflow does what Yoga can't — or does it better.
          </p>
        </div>

        <div className="space-y-20">
          {/* Demo 1: CSS Grid */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 text-sm font-bold">1</span>
              <h3 className="text-xl font-semibold text-white">CSS Grid — Yoga Can't Do This</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-2xl">
              Noreflow supports CSS Grid with explicit/implicit tracks, spanning, and auto-placement.
              Yoga has had an open feature request for Grid since 2018 — it's never shipped.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-brand-600/10">
                  <span className="text-xs font-mono text-brand-400">Noreflow — Live Grid Layout</span>
                </div>
                <MiniCanvas node={gridDashboard} className="w-full h-64" showDimensions />
              </div>
              <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">Yoga</span>
                  <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">NOT SUPPORTED</span>
                </div>
                <pre className="p-4 text-xs text-gray-500 font-mono leading-relaxed whitespace-pre h-64 overflow-auto">
                  {yogaGridCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Demo 2: DX */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 text-sm font-bold">2</span>
              <h3 className="text-xl font-semibold text-white">10 Lines vs 25 Lines</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-2xl">
              Noreflow's declarative API uses plain objects. Yoga requires imperative node creation,
              async WASM initialization, manual memory management, and reading values back one-by-one.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <CodeBlock code={noreflowCode} label="Noreflow" accent />
              <CodeBlock code={yogaDxCode} label="Yoga" />
            </div>
            <div className="mt-4 flex gap-6 text-center">
              <div className="flex-1 rounded-xl border border-brand-600/20 bg-brand-600/5 p-3">
                <div className="text-2xl font-bold text-brand-400">10</div>
                <div className="text-xs text-gray-400">lines of code</div>
              </div>
              <div className="flex-1 rounded-xl border border-white/5 bg-gray-900/50 p-3">
                <div className="text-2xl font-bold text-gray-400">25</div>
                <div className="text-xs text-gray-500">lines of code</div>
              </div>
            </div>
          </div>

          {/* Demo 3: Speed */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 text-sm font-bold">3</span>
              <h3 className="text-xl font-semibold text-white">Same Layout, Timed Live</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-2xl">
              Click to compute a 1,001-node layout right here in your browser.
              No WASM to load, no async initialization, no warm-up binary download.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <button
                onClick={runSpeedDemo}
                disabled={speedRunning}
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0"
              >
                {speedRunning && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {speedRunning ? 'Computing...' : speedResult ? 'Run Again' : 'Compute 1,001 Nodes'}
              </button>
              {speedResult && (
                <div className="rounded-xl border border-white/10 bg-gray-900/80 p-4 animate-fade-in flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-brand-400 font-mono">
                      {speedResult.timeUs < 1000
                        ? `${speedResult.timeUs}µs`
                        : `${(speedResult.timeUs / 1000).toFixed(2)}ms`}
                    </span>
                    <span className="text-sm text-gray-400">
                      for {speedResult.nodes.toLocaleString()} nodes
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Yoga requires loading a ~45 KB WASM binary before it can compute anything.
                    Noreflow is ready the moment you import it — zero startup cost.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Demo 4: Debuggability */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 text-sm font-bold">4</span>
              <h3 className="text-xl font-semibold text-white">Debug It Yourself</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-2xl">
              When your layout breaks, you need to step through the engine and understand what happened.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-brand-600/10">
                  <span className="text-xs font-mono text-brand-400">Noreflow — DevTools</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-lg bg-black/40 border border-white/5 p-3 font-mono text-xs text-gray-300 leading-relaxed">
                    <div className="text-gray-500">{'// layout.ts — you can step through every line'}</div>
                    <div><span className="text-purple-400">function</span> <span className="text-yellow-300">layoutNode</span>(node, availW, availH) {'{'}</div>
                    <div className="text-brand-400 bg-brand-400/10 -mx-3 px-3 py-0.5">  <span className="text-gray-500">→</span> const style = resolveStyle(node.style);</div>
                    <div>    const mainSize = resolveMainAxis(style);</div>
                    <div>    <span className="text-gray-500">// ... readable TypeScript</span></div>
                    <div>{'}'}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Set breakpoints on any line
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Inspect every variable in scope
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Full source maps, readable stack traces
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5">
                  <span className="text-xs font-mono text-gray-500">Yoga — DevTools</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-lg bg-black/40 border border-white/5 p-3 font-mono text-[10px] text-gray-600 leading-relaxed overflow-x-auto">
                    <div>0061 6d73 0100 0000 0187 8080 0060 017f</div>
                    <div>0060 027f 7f00 6002 7f7f 017f 6003 7f7f</div>
                    <div>7f00 6003 7f7f 7f01 7f60 017f 017f 6004</div>
                    <div>7f7f 7f7f 0060 047f 7f7f 7f01 7f60 0001</div>
                    <div>7f60 057f 7f7f 7f7f 0060 0000 6006 7f7f</div>
                    <div>7f7f 7f7f 0002 b582 8080 0022 0377 6267</div>
                    <div className="mt-2 text-gray-500">// ... 44KB more of this</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    No breakpoints in compiled WASM
                  </div>
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Opaque binary — can't read values
                  </div>
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stack traces point to wasm offsets
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Demo 5: vs Textura */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 text-sm font-bold">5</span>
              <h3 className="text-xl font-semibold text-white">Noreflow vs Textura</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 max-w-2xl">
              <a href="https://github.com/razroo/textura" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Textura</a> validates the same insight: Pretext + layout engine = DOM-free rendering.
              But it wraps Yoga in WASM. Noreflow is the layout engine — built from scratch in pure TypeScript.
            </p>
            <div className="rounded-xl border border-white/10 bg-gray-900/80 overflow-hidden">
              <div className="grid grid-cols-3 text-xs font-mono">
                <div className="px-4 py-3 border-b border-white/5 text-gray-500" />
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-brand-400 font-semibold">Noreflow</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">Textura</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">Architecture</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">Purpose-built engine</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">Wraps Yoga</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">Runtime</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">Pure TypeScript</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">WASM binary</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">Initialization</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">Synchronous</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">await init()</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">CSS Grid</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">Supported</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-red-400">Not supported</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">Dependencies</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">Zero</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">yoga-layout + pretext</div>

                <div className="px-4 py-3 border-b border-white/5 text-gray-400">Bundle</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-emerald-400">~8kb gzipped</div>
                <div className="px-4 py-3 border-b border-white/5 border-l border-white/5 text-gray-500">~45kb+ (WASM)</div>

                <div className="px-4 py-3 text-gray-400">Debugging</div>
                <div className="px-4 py-3 border-l border-white/5 text-emerald-400">JS debugger</div>
                <div className="px-4 py-3 border-l border-white/5 text-gray-500">WASM boundary</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
