import { describe, it, expect } from 'vitest';
import { createScrollState } from '../src/scroll.js';

describe('ScrollState', () => {
  it('starts at offset 0 with zero velocity', () => {
    const s = createScrollState();
    expect(s.offset).toBe(0);
    expect(s.velocity).toBe(0);
    expect(s.isAnimating).toBe(false);
  });

  it('scrollBy moves offset', () => {
    const s = createScrollState();
    s.scrollBy(50);
    expect(s.offset).toBe(50);
  });

  it('scrollTo jumps to target and kills velocity', () => {
    const s = createScrollState();
    s.impulse(10);
    s.scrollTo(200);
    expect(s.offset).toBe(200);
    expect(s.velocity).toBe(0);
  });

  it('impulse adds velocity and tick applies it', () => {
    const s = createScrollState();
    s.impulse(1); // 1 px/ms
    const newOffset = s.tick(16);
    expect(newOffset).toBeGreaterThan(0);
    expect(s.isAnimating).toBe(true);
  });

  it('velocity decays to zero over time', () => {
    const s = createScrollState();
    s.impulse(0.5);

    for (let i = 0; i < 1000; i++) {
      s.tick(16);
    }
    expect(s.velocity).toBe(0);
    expect(s.isAnimating).toBe(false);
  });

  it('respects bounds — clamps offset', () => {
    const s = createScrollState();
    s.setBounds(0, 100);
    s.scrollBy(200);
    expect(s.offset).toBe(100);
    s.scrollBy(-300);
    expect(s.offset).toBe(0);
  });

  it('clamps and kills velocity at bounds', () => {
    const s = createScrollState();
    s.setBounds(0, 100);
    s.scrollTo(90);
    s.impulse(1);
    // After enough ticks, offset should be clamped at 100
    for (let i = 0; i < 100; i++) {
      s.tick(16);
    }
    expect(s.offset).toBe(100);
    expect(s.velocity).toBe(0);
  });

  it('setBounds clamps existing offset', () => {
    const s = createScrollState();
    s.scrollTo(500);
    s.setBounds(0, 200);
    expect(s.offset).toBe(200);
  });
});
