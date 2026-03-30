// Minimal timer declarations for environments without DOM lib.
// setTimeout/clearTimeout exist in all JS runtimes (browser, Node, Deno, Bun).
declare function setTimeout(callback: () => void, ms: number): number;
declare function clearTimeout(id: number): void;
