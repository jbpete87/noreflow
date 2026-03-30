import { useState, useCallback } from 'react';
import { computeLayout } from 'noreflow';
import type { FlexNode } from 'noreflow';

function buildTree(count: number): FlexNode {
  const children: FlexNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push({
      style: {
        flexGrow: 1,
        height: 20,
        padding: 2,
      },
    });
  }
  return {
    style: {
      width: 1000,
      flexWrap: 'wrap',
      gap: 2,
      padding: 4,
    },
    children,
  };
}

function buildNestedTree(depth: number, breadth: number): FlexNode {
  if (depth === 0) {
    return { style: { flexGrow: 1, height: 10 } };
  }
  const children: FlexNode[] = [];
  for (let i = 0; i < breadth; i++) {
    children.push(buildNestedTree(depth - 1, breadth));
  }
  return {
    style: {
      flexGrow: 1,
      flexDirection: depth % 2 === 0 ? 'row' : 'column',
      gap: 1,
      padding: 1,
    },
    children,
  };
}

interface BenchResult {
  name: string;
  nodes: number;
  timeMs: number;
  opsPerSec: string;
  usPerNode: string;
}

const YOGA_COMPARISON = [
  { label: 'Language', noreflow: 'Pure TypeScript', yoga: 'C++ (WASM in browser)', noreflowWins: true },
  { label: 'CSS Grid', noreflow: 'Yes', yoga: 'No', noreflowWins: true },
  { label: 'Aspect Ratio', noreflow: 'Yes', yoga: 'Yes', noreflowWins: false },
  { label: 'Bundle Size', noreflow: '~8 KB gzipped', yoga: '~45 KB gzipped (WASM)', noreflowWins: true },
  { label: 'Dependencies', noreflow: '0', yoga: 'WASM runtime', noreflowWins: true },
  { label: 'Tree-shakeable', noreflow: 'Yes', yoga: 'No (monolith WASM)', noreflowWins: true },
  { label: 'Debuggable', noreflow: 'Step through TS source', yoga: 'Opaque WASM binary', noreflowWins: true },
  { label: 'Setup', noreflow: 'npm install, import, done', yoga: 'Load WASM, init async, then use', noreflowWins: true },
  { label: 'Raw Speed (1k nodes)', noreflow: '~0.3 ms', yoga: '~0.1 ms', noreflowWins: false },
  { label: 'Browser Validated', noreflow: '60 fixtures vs Chrome', yoga: 'Internal test suite', noreflowWins: true },
];

export function Performance() {
  const [results, setResults] = useState<BenchResult[]>([]);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const runBenchmarks = useCallback(() => {
    setRunning(true);
    setResults([]);

    setTimeout(() => {
      const benchmarks: BenchResult[] = [];

      const configs = [
        { name: '100 flat items', tree: buildTree(100), nodes: 101 },
        { name: '1,000 flat items', tree: buildTree(1000), nodes: 1001 },
        { name: '10,000 flat items', tree: buildTree(10000), nodes: 10001 },
        { name: 'Nested 5x4 (1,365 nodes)', tree: buildNestedTree(5, 4), nodes: 1365 },
      ];

      for (const config of configs) {
        computeLayout(config.tree);

        const probe = globalThis.performance.now();
        computeLayout(config.tree);
        const probeMs = globalThis.performance.now() - probe;
        const iterations = Math.max(3, Math.min(500, Math.floor(200 / Math.max(probeMs, 0.01))));

        const start = globalThis.performance.now();
        for (let i = 0; i < iterations; i++) {
          computeLayout(config.tree);
        }
        const elapsed = globalThis.performance.now() - start;
        const avgMs = elapsed / iterations;

        benchmarks.push({
          name: config.name,
          nodes: config.nodes,
          timeMs: avgMs,
          opsPerSec: Math.round(1000 / avgMs).toLocaleString(),
          usPerNode: (avgMs * 1000 / config.nodes).toFixed(2),
        });
      }

      setResults(benchmarks);
      setRunning(false);
      setRunCount((c) => c + 1);
    }, 80);
  }, []);

  return (
    <section id="performance" className="py-24 px-6 bg-surface-alt">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Performance
          </h2>
          <p className="mt-3 text-text-body max-w-2xl mx-auto">
            Pure TypeScript, no WASM overhead. Run the benchmark live in your browser.
          </p>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={runBenchmarks}
            disabled={running}
            className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {running && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {running ? 'Running benchmarks...' : runCount > 0 ? 'Run Again' : 'Run Benchmark'}
          </button>
        </div>

        {results.length > 0 && (
          <div key={runCount} className="rounded-2xl border border-gray-700 bg-gray-900 overflow-hidden animate-fade-in shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500">
                  <th className="text-left px-6 py-3 font-medium">Scenario</th>
                  <th className="text-right px-6 py-3 font-medium">Nodes</th>
                  <th className="text-right px-6 py-3 font-medium">Time</th>
                  <th className="text-right px-6 py-3 font-medium">Per Node</th>
                  <th className="text-right px-6 py-3 font-medium">Ops/sec</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-gray-700 last:border-0"
                  >
                    <td className="px-6 py-3 text-gray-200 font-mono">{r.name}</td>
                    <td className="px-6 py-3 text-right text-gray-400">
                      {r.nodes.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-200 font-mono">
                      {r.timeMs < 1
                        ? `${(r.timeMs * 1000).toFixed(0)}us`
                        : `${r.timeMs.toFixed(1)}ms`}
                    </td>
                    <td className="px-6 py-3 text-right text-emerald-400 font-mono">
                      {r.usPerNode}us
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400 font-mono">
                      {r.opsPerSec}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 mb-12">
          <h3 className="text-xl font-semibold text-text-primary mb-2 text-center">
            Noreflow vs Yoga
          </h3>
          <p className="text-sm text-text-muted text-center mb-6 max-w-xl mx-auto">
            Yoga (by Meta) is the industry standard for cross-platform flexbox layout.
            Here's how the two compare.
          </p>

          <div className="rounded-2xl border border-gray-700 bg-gray-900 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500">
                  <th className="text-left px-6 py-3 font-medium" />
                  <th className="text-center px-6 py-3 font-medium">
                    <span className="text-emerald-400">Noreflow</span>
                  </th>
                  <th className="text-center px-6 py-3 font-medium">
                    <span className="text-gray-500">Yoga</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {YOGA_COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-gray-700 last:border-0">
                    <td className="px-6 py-3 text-gray-300">{row.label}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={row.noreflowWins ? 'text-emerald-400 font-medium' : 'text-gray-300'}>
                        {row.noreflow}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={row.noreflowWins ? 'text-gray-500' : 'text-gray-300'}>
                        {row.yoga}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
            <div className="text-3xl font-bold text-white">0</div>
            <div className="text-sm text-gray-400 mt-1">dependencies</div>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
            <div className="text-3xl font-bold text-white">~8kb</div>
            <div className="text-sm text-gray-400 mt-1">gzipped</div>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
            <div className="text-3xl font-bold text-white">ESM + CJS</div>
            <div className="text-sm text-gray-400 mt-1">dual output</div>
          </div>
        </div>
      </div>
    </section>
  );
}
