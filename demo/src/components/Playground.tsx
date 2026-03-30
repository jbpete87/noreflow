import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { computeLayout } from 'noreflow';
import type { FlexNode, LayoutResult } from 'noreflow';
import { renderLayout, hitTest } from '../canvas/renderLayout';
import type { RenderState } from '../canvas/renderLayout';
import { presets } from '../presets';

/* ── Builder API formatter ─────────────────────────────────────────────
   Generates concise code using h(), row(), col(), grid() helpers. */

function stylePart(k: string, v: unknown): string {
  if (typeof v === 'string') return `${k}: '${v}'`;
  if (Array.isArray(v)) {
    const items = v.map(i => typeof i === 'string' ? `'${i}'` : String(i));
    return `${k}: [${items.join(', ')}]`;
  }
  return `${k}: ${v}`;
}

function styleToInline(style: Record<string, unknown>, indent: number): string {
  const entries = Object.entries(style).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '{}';

  const parts = entries.map(([k, v]) => stylePart(k, v));
  const oneLine = `{ ${parts.join(', ')} }`;
  if (oneLine.length <= 80) return oneLine;

  const inner = '  '.repeat(indent + 1);
  const closing = '  '.repeat(indent);
  return `{\n${inner}${parts.join(',\n' + inner)},\n${closing}}`;
}

function nodesAreIdentical(a: FlexNode, b: FlexNode): boolean {
  if (a.children?.length || b.children?.length) return false;
  return JSON.stringify(a.style ?? {}) === JSON.stringify(b.style ?? {});
}

function nodeToBuilder(node: FlexNode, indent = 0): string {
  const pad = '  '.repeat(indent);
  const style = { ...(node.style ?? {}) } as Record<string, unknown>;
  const hasChildren = node.children && node.children.length > 0;

  let fn = 'h';
  if (style.display === 'grid') {
    fn = 'grid';
    delete style.display;
  } else if (style.flexDirection === 'column') {
    fn = 'col';
    delete style.flexDirection;
  } else if (style.flexDirection === 'row') {
    fn = 'row';
    delete style.flexDirection;
  }

  const styleStr = styleToInline(style, indent);

  if (!hasChildren) {
    const leaf = `${pad}${fn}(${styleStr})`;
    if (!styleStr.includes('\n') && leaf.length <= 90) return leaf;
    return `${pad}${fn}(${styleStr})`;
  }

  const children = node.children!;
  const childParts: string[] = [];
  let i = 0;
  while (i < children.length) {
    let runLen = 1;
    while (
      i + runLen < children.length &&
      nodesAreIdentical(children[i]!, children[i + runLen]!)
    ) {
      runLen++;
    }

    if (runLen >= 3) {
      const singleChild = nodeToBuilder(children[i]!, 0).trim();
      childParts.push(`${pad}  ...Array(${runLen}).fill(${singleChild})`);
      i += runLen;
    } else {
      for (let j = 0; j < runLen; j++) {
        childParts.push(nodeToBuilder(children[i + j]!, indent + 1));
      }
      i += runLen;
    }
  }

  const childStr = childParts.join(',\n');
  return `${pad}${fn}(${styleStr},\n${childStr},\n${pad})`;
}

function nodeToBuilderCode(node: FlexNode): string {
  const imports: string[] = [];
  const code = nodeToBuilder(node, 1);
  if (code.includes('col(')) imports.push('col');
  if (code.includes('row(')) imports.push('row');
  if (code.includes('grid(')) imports.push('grid');
  if (code.includes('h(')) imports.push('h');
  const importLine = `import { computeLayout, ${imports.join(', ')} } from 'noreflow';`;
  return `${importLine}\n\nconst layout = computeLayout(\n${code}\n);`;
}

function countLines(s: string): number {
  return s.split('\n').length;
}

/* ── JSON helpers ─────────────────────────────────────────────────── */

function nodeToJson(node: FlexNode): string {
  return JSON.stringify(node, null, 2);
}

function tryParseNode(json: string): FlexNode | null {
  try {
    const obj = JSON.parse(json);
    if (typeof obj === 'object' && obj !== null) return obj as FlexNode;
    return null;
  } catch {
    return null;
  }
}

function formatTime(us: number): string {
  if (us < 1000) return `${us.toFixed(0)}µs`;
  return `${(us / 1000).toFixed(2)}ms`;
}

function countNodes(node: FlexNode): number {
  let c = 1;
  if (node.children) for (const child of node.children) c += countNodes(child);
  return c;
}

/* ── Result tree ──────────────────────────────────────────────────── */

function ResultTree({ result, depth = 0 }: { result: LayoutResult; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = result.children.length > 0;
  const indent = depth * 16;

  return (
    <div style={{ paddingLeft: indent }} className="text-xs font-mono leading-relaxed">
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="text-text-muted hover:text-text-primary w-4 text-center shrink-0"
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-text-muted">
          {depth === 0 ? 'root' : `[${depth - 1}]`}
        </span>
        <span className="text-emerald-600">
          x:{Math.round(result.x)} y:{Math.round(result.y)}
        </span>
        <span className="text-text-primary">
          {Math.round(result.width)}x{Math.round(result.height)}
        </span>
      </div>
      {open && hasChildren && result.children.map((child, i) => (
        <ResultTree key={i} result={child} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

type LeftTab = 'js' | 'json';
type RightTab = 'canvas' | 'json' | 'css' | 'usage';

export function Playground() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [code, setCode] = useState(() => nodeToJson(presets[0]!.node));
  const [error, setError] = useState<string | null>(null);
  const [computeTimeUs, setComputeTimeUs] = useState(0);
  const [leftTab, setLeftTab] = useState<LeftTab>('js');
  const [rightTab, setRightTab] = useState<RightTab>('canvas');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<LayoutResult>(computeLayout(presets[0]!.node));
  const renderStateRef = useRef<RenderState | null>(null);

  const currentPreset = presets[presetIndex]!;
  const parsedNode = useMemo(() => tryParseNode(code), [code]);
  const nodeCount = useMemo(() => parsedNode ? countNodes(parsedNode) : 0, [parsedNode]);
  const builderCode = useMemo(() => parsedNode ? nodeToBuilderCode(parsedNode) : '// Invalid JSON', [parsedNode]);
  const builderLineCount = useMemo(() => countLines(builderCode), [builderCode]);
  const cssLineCount = useMemo(() => currentPreset.cssEquivalent ? countLines(currentPreset.cssEquivalent) : 0, [currentPreset]);

  const usageCode = useMemo(() => {
    const lr = layoutRef.current;
    return `import { computeLayout } from 'noreflow';

const layout = computeLayout(tree);

// Canvas
ctx.fillRect(
  layout.children[0].x,      // ${Math.round(lr.children[0]?.x ?? 0)}
  layout.children[0].y,      // ${Math.round(lr.children[0]?.y ?? 0)}
  layout.children[0].width,  // ${Math.round(lr.children[0]?.width ?? 0)}
  layout.children[0].height  // ${Math.round(lr.children[0]?.height ?? 0)}
);

// React Native
<View style={{
  left: layout.x,       // ${Math.round(lr.x)}
  top: layout.y,        // ${Math.round(lr.y)}
  width: layout.width,  // ${Math.round(lr.width)}
  height: layout.height // ${Math.round(lr.height)}
}} />

// PDF, game engines, terminal UIs...
// Same coordinates. Any platform. No CSS.`;
  }, [code, layoutRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback((hoverIdx: number | null = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    renderStateRef.current = renderLayout(ctx, layoutRef.current, rect.width, rect.height, {
      showLabels: true,
      showDimensions: true,
      padding: 24,
      highlightIndex: hoverIdx,
    });
  }, []);

  useEffect(() => {
    const node = tryParseNode(code);
    if (node) {
      try {
        const t0 = performance.now();
        layoutRef.current = computeLayout(node);
        const t1 = performance.now();
        setComputeTimeUs(Math.round((t1 - t0) * 1000));
        setError(null);
      } catch (e) {
        setError(String(e));
      }
    } else {
      setError('Invalid JSON');
    }
    draw(hoveredIndex);
  }, [code, draw]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rightTab === 'canvas') {
      requestAnimationFrame(() => draw(hoveredIndex));
    }
  }, [rightTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => draw(hoveredIndex);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw, hoveredIndex]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !renderStateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = hitTest(renderStateRef.current, x, y);
    setHoveredIndex(idx);
    draw(idx);
    canvas.style.cursor = idx !== null ? 'pointer' : 'default';
  }, [draw]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    draw(null);
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, [draw]);

  const handlePresetChange = (index: number) => {
    setPresetIndex(index);
    setCode(nodeToJson(presets[index]!.node));
    setError(null);
    setHoveredIndex(null);
    setRightTab('canvas');
    setLeftTab('js');
  };

  const rightTabs: { id: RightTab; label: string }[] = [
    { id: 'canvas', label: 'Visual' },
    { id: 'json', label: 'Result' },
    { id: 'css', label: 'CSS + HTML' },
    { id: 'usage', label: 'Use It' },
  ];

  return (
    <section id="playground" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-600 mb-4">
            One file. One language. Any platform.
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Interactive Playground
          </h2>
          <p className="mt-3 text-text-body max-w-2xl mx-auto">
            Define layout as a plain JS object — no stylesheets, no class names, no HTML structure to duplicate.
            Get pixel-perfect coordinates you can use on Canvas, React Native, PDF, or anywhere else.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-sm text-text-muted shrink-0">Presets:</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => handlePresetChange(i)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === presetIndex
                    ? 'bg-text-primary text-surface ring-1 ring-text-primary'
                    : 'bg-surface text-text-body hover:bg-surface-alt border border-border-subtle'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Left panel ─────────────────────────────────────────── */}
          <div className="relative rounded-xl border border-gray-700 bg-gray-900 overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLeftTab('js')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                      leftTab === 'js'
                        ? 'bg-white text-gray-900'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Builder API
                  </button>
                  <button
                    onClick={() => setLeftTab('json')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                      leftTab === 'json'
                        ? 'bg-white text-gray-900'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {builderLineCount} lines
                </span>
              </div>
              {error && (
                <span className="text-xs text-red-500 truncate max-w-[200px]">{error}</span>
              )}
            </div>

            {leftTab === 'js' ? (
              <pre className="w-full flex-1 min-h-[500px] text-sm text-gray-300 font-mono p-4 overflow-auto leading-relaxed whitespace-pre">
                {builderCode}
              </pre>
            ) : (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 min-h-[500px] text-sm text-gray-300 font-mono p-4 resize-none focus:outline-none leading-relaxed bg-transparent"
              />
            )}
          </div>

          {/* ── Right panel ────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {formatTime(computeTimeUs)}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {Math.round(layoutRef.current.width)}x{Math.round(layoutRef.current.height)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {rightTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                      rightTab === tab.id
                        ? 'bg-white text-gray-900'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {rightTab === 'canvas' && (
              <canvas
                ref={canvasRef}
                className="w-full flex-1 min-h-[500px] bg-gray-950"
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              />
            )}

            {rightTab === 'json' && (
              <div className="flex-1 overflow-auto p-4 min-h-[500px]">
                <ResultTree result={layoutRef.current} />
              </div>
            )}

            {rightTab === 'css' && (
              <div className="flex-1 overflow-auto min-h-[500px] flex flex-col">
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-200">What Noreflow replaces</span>
                    {cssLineCount > 0 && (
                      <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full font-mono">
                        {cssLineCount} lines
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Without Noreflow you need <strong className="text-gray-300">HTML structure</strong> + <strong className="text-gray-300">CSS classes</strong> + <strong className="text-gray-300">a browser</strong>.
                    The Noreflow version is {builderLineCount} lines of TS that runs anywhere.
                  </p>
                </div>
                {currentPreset.cssEquivalent ? (
                  <pre className="flex-1 px-4 pb-4 pt-2 text-xs text-gray-400 font-mono leading-relaxed overflow-auto whitespace-pre">
                    {currentPreset.cssEquivalent}
                  </pre>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-600">
                    No CSS equivalent for this preset
                  </div>
                )}
              </div>
            )}

            {rightTab === 'usage' && (
              <div className="flex-1 overflow-auto min-h-[500px] flex flex-col">
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-200">How to use the result</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-mono">any platform</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <code className="text-emerald-400">computeLayout()</code> returns {'{'}x, y, width, height{'}'} for every node.
                    Use them on Canvas, React Native, PDF, game engines — no browser needed.
                  </p>
                </div>
                <pre className="flex-1 px-4 pb-4 pt-2 text-xs text-gray-300 font-mono leading-relaxed overflow-auto whitespace-pre">
                  {usageCode}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-text-muted">
            {currentPreset.description}
            {rightTab === 'canvas' && (
              <span className="text-text-muted"> · Hover over boxes to inspect</span>
            )}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ValueProp
            label="No CSS Files"
            detail="Layout lives in your JS/TS"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            }
          />
          <ValueProp
            label="No HTML to Duplicate"
            detail="Structure is the layout"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            }
          />
          <ValueProp
            label="Any Platform"
            detail="Canvas, RN, PDF, terminal"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            }
          />
          <ValueProp
            label="Zero Deps"
            detail="No WASM, no binary, no async"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
            }
          />
        </div>
      </div>
    </section>
  );
}

function ValueProp({ label, detail, icon }: { label: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 text-center">
      <svg className="w-5 h-5 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        {icon}
      </svg>
      <div className="text-sm font-semibold text-text-primary">{label}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{detail}</div>
    </div>
  );
}
