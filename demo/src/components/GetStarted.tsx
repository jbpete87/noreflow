export function GetStarted() {
  return (
    <section className="py-24 px-6 bg-gray-900/30">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Get Started
          </h2>
          <p className="mt-3 text-gray-400">
            Install Noreflow and compute your first layout in under a minute.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-2">1. Install</div>
            <CodeBlock code="npm install noreflow" />
          </div>

          <div>
            <div className="text-xs text-gray-500 font-mono mb-2">2. Define a layout tree</div>
            <CodeBlock
              code={`import { computeLayout } from 'noreflow';

const layout = computeLayout({
  style: {
    width: 400,
    height: 300,
    gap: 10,
    padding: 20,
  },
  children: [
    { style: { flexGrow: 1 } },
    { style: { flexGrow: 2 } },
    { style: { flexGrow: 1 } },
  ],
});`}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 font-mono mb-2">3. Use the coordinates</div>
            <CodeBlock
              code={`// Each child has { x, y, width, height }
for (const child of layout.children) {
  ctx.fillRect(child.x, child.y, child.width, child.height);
}`}
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://github.com/jbpete87/noreflow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-8 py-3.5 text-sm font-semibold text-gray-200 hover:bg-white/10 transition-colors"
          >
            <GitHubIcon />
            View Full Documentation on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gray-950/80 overflow-hidden">
      <pre className="p-4 text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
