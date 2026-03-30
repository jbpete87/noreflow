const FEATURE_GROUPS = [
  {
    title: 'Flexbox',
    items: [
      'flex-direction (all 4)',
      'flex-wrap / wrap-reverse',
      'flex-grow / flex-shrink / flex-basis',
      'justify-content (all 6 modes)',
      'align-items / align-self / align-content',
      'Nested flex containers',
    ],
  },
  {
    title: 'CSS Grid',
    items: [
      'grid-template-columns / rows',
      'fr units / px / % / auto tracks',
      'grid-column / grid-row placement',
      'Multi-track spanning',
      'grid-auto-rows / columns',
      'grid-auto-flow (row / column)',
    ],
  },
  {
    title: 'Positioning',
    items: [
      'position: relative',
      'position: absolute',
      'top / right / bottom / left',
      'Percentage insets',
      'Auto-size from opposing insets',
      'z-index ordering',
    ],
  },
  {
    title: 'Box Model',
    items: [
      'padding (all sides)',
      'margin (including auto)',
      'border widths',
      'content-box / border-box',
      'min/max width/height',
      'aspect-ratio',
    ],
  },
  {
    title: 'Extras',
    items: [
      'gap / row-gap / column-gap',
      'Percentage sizing',
      'display: none',
      'measure() for text/images',
      'Recursive nesting',
      'DOM order preservation',
    ],
  },
  {
    title: 'Developer Experience',
    items: [
      'Pure TypeScript (no WASM)',
      'Zero dependencies',
      'Tree-shakeable ESM + CJS',
      'Full type definitions',
      'Browser-validated (Playwright)',
      'Sub-microsecond per node',
    ],
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Feature Coverage
          </h2>
          <p className="mt-3 text-text-body max-w-2xl mx-auto">
            Every property is spec-compliant and validated against real browser output.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-border-subtle bg-surface p-6"
            >
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-body">
                    <svg
                      className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    <span className="font-mono text-xs">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
