import { bench, describe } from 'vitest';
import { computeLayout } from '../src/layout.js';
import type { FlexNode } from '../src/types.js';

function makeFlat(count: number): FlexNode {
  return {
    style: { width: 1000, height: 800 },
    children: Array.from({ length: count }, () => ({
      style: { flexGrow: 1, height: 40 },
    })),
  };
}

function makeWrapped(count: number): FlexNode {
  return {
    style: { width: 600, height: 2000, flexWrap: 'wrap' as const, alignContent: 'flex-start' as const },
    children: Array.from({ length: count }, () => ({
      style: { width: 100, height: 40 },
    })),
  };
}

function makeDeep(depth: number, breadth: number): FlexNode {
  if (depth === 0) {
    return { style: { width: 20, height: 20 } };
  }
  return {
    style: { flexDirection: depth % 2 === 0 ? 'row' as const : 'column' as const },
    children: Array.from({ length: breadth }, () => makeDeep(depth - 1, breadth)),
  };
}

describe('flat layouts', () => {
  bench('10 items', () => {
    computeLayout(makeFlat(10));
  });

  bench('100 items', () => {
    computeLayout(makeFlat(100));
  });

  bench('1,000 items', () => {
    computeLayout(makeFlat(1000));
  });

  bench('10,000 items', () => {
    computeLayout(makeFlat(10000));
  });
});

describe('wrapped layouts', () => {
  bench('100 items wrapped', () => {
    computeLayout(makeWrapped(100));
  });

  bench('1,000 items wrapped', () => {
    computeLayout(makeWrapped(1000));
  });
});

describe('nested layouts', () => {
  bench('depth=3, breadth=4 (84 nodes)', () => {
    computeLayout(makeDeep(3, 4), 800, 600);
  });

  bench('depth=5, breadth=3 (363 nodes)', () => {
    computeLayout(makeDeep(5, 3), 800, 600);
  });

  bench('depth=4, breadth=5 (780 nodes)', () => {
    computeLayout(makeDeep(4, 5), 800, 600);
  });
});
