import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPointerSession } from '../src/session.js';
import type { SceneNode, NoPointerEvent } from '../src/types.js';

function scene(
  x: number, y: number, w: number, h: number,
  opts?: Partial<Omit<SceneNode, 'layout'>>,
): SceneNode {
  return {
    layout: { x, y, width: w, height: h, children: [] },
    ...opts,
  };
}

function eventTypes(events: NoPointerEvent[]): string[] {
  return events.map(e => e.type);
}

describe('PointerSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts in idle state', () => {
    const session = createPointerSession();
    expect(session.state).toBe('idle');
  });

  // --- Tap ---

  it('emits tap on quick down+up', () => {
    const session = createPointerSession();
    const root = scene(0, 0, 100, 100);

    const downEvents = session.down(50, 50, root, 0);
    expect(session.state).toBe('pressed');
    expect(eventTypes(downEvents)).toContain('pointerdown');

    const upEvents = session.up(50, 50, root, 100);
    expect(eventTypes(upEvents)).toContain('pointerup');
    expect(eventTypes(upEvents)).toContain('tap');
    expect(session.state).toBe('idle');
  });

  it('does not emit tap if duration exceeds threshold', () => {
    const session = createPointerSession({ tapMaxDuration: 200 });
    const root = scene(0, 0, 100, 100);

    session.down(50, 50, root, 0);
    const upEvents = session.up(50, 50, root, 300);
    expect(eventTypes(upEvents)).not.toContain('tap');
  });

  it('does not emit tap if pointer moved too far', () => {
    const session = createPointerSession({ tapMaxDistance: 5 });
    const root = scene(0, 0, 100, 100);

    session.down(50, 50, root, 0);
    const upEvents = session.up(60, 60, root, 100);
    expect(eventTypes(upEvents)).not.toContain('tap');
  });

  // --- Double-tap ---

  it('emits doubletap on two quick taps', () => {
    const session = createPointerSession({ doubleTapMaxGap: 300 });
    const root = scene(0, 0, 100, 100);

    session.down(50, 50, root, 0);
    const up1 = session.up(50, 50, root, 50);
    expect(eventTypes(up1)).toContain('tap');

    session.down(50, 50, root, 100);
    const up2 = session.up(50, 50, root, 150);
    expect(eventTypes(up2)).toContain('doubletap');
    expect(eventTypes(up2)).not.toContain('tap');
  });

  it('does not emit doubletap if gap is too large', () => {
    const session = createPointerSession({ doubleTapMaxGap: 100 });
    const root = scene(0, 0, 100, 100);

    session.down(50, 50, root, 0);
    session.up(50, 50, root, 50);

    session.down(50, 50, root, 200);
    const up2 = session.up(50, 50, root, 250);
    expect(eventTypes(up2)).toContain('tap');
    expect(eventTypes(up2)).not.toContain('doubletap');
  });

  // --- Drag ---

  it('emits dragstart + drag when moving past threshold', () => {
    const session = createPointerSession({ dragThreshold: 3 });
    const root = scene(0, 0, 200, 200);

    session.down(50, 50, root, 0);
    const moveEvents = session.move(60, 60, root, 50);
    expect(session.state).toBe('dragging');
    expect(eventTypes(moveEvents)).toContain('dragstart');
    expect(eventTypes(moveEvents)).toContain('drag');
  });

  it('emits dragend on up after dragging', () => {
    const session = createPointerSession({ dragThreshold: 3 });
    const root = scene(0, 0, 200, 200);

    session.down(50, 50, root, 0);
    session.move(60, 60, root, 50);
    const upEvents = session.up(70, 70, root, 100);
    expect(eventTypes(upEvents)).toContain('dragend');
    expect(eventTypes(upEvents)).not.toContain('tap');
    expect(session.state).toBe('idle');
  });

  it('does not emit drag if under threshold', () => {
    const session = createPointerSession({ dragThreshold: 20 });
    const root = scene(0, 0, 200, 200);

    session.down(50, 50, root, 0);
    const moveEvents = session.move(52, 52, root, 50);
    expect(session.state).toBe('pressed');
    expect(eventTypes(moveEvents)).not.toContain('dragstart');
  });

  // --- Scroll ---

  it('emits scroll events when dragging on a scrollable node', () => {
    const scrollable = scene(0, 0, 200, 200, { scrollable: 'y' });
    const root = scene(0, 0, 200, 200, { children: [scrollable] });

    const session = createPointerSession({ dragThreshold: 3 });
    session.down(50, 50, root, 0);
    const moveEvents = session.move(50, 60, root, 50);

    expect(session.state).toBe('scrolling');
    expect(eventTypes(moveEvents)).toContain('scrollstart');
    expect(eventTypes(moveEvents)).toContain('scroll');
  });

  it('emits scrollend on up after scrolling', () => {
    const scrollable = scene(0, 0, 200, 200, { scrollable: 'y' });
    const root = scene(0, 0, 200, 200, { children: [scrollable] });

    const session = createPointerSession({ dragThreshold: 3 });
    session.down(50, 50, root, 0);
    session.move(50, 60, root, 50);
    const upEvents = session.up(50, 70, root, 100);

    expect(eventTypes(upEvents)).toContain('scrollend');
    expect(session.state).toBe('idle');
  });

  // --- Wheel ---

  it('emits wheel event', () => {
    const root = scene(0, 0, 200, 200);
    const session = createPointerSession();

    const events = session.wheel(50, 50, 0, -120, root, 0);
    expect(eventTypes(events)).toContain('wheel');
    expect(events[0]!.deltaY).toBe(-120);
  });

  // --- Long-press ---

  it('fires longpress after delay', () => {
    const session = createPointerSession({ longPressDelay: 500 });
    const root = scene(0, 0, 100, 100);

    const downEvents = session.down(50, 50, root, 0);
    expect(eventTypes(downEvents)).not.toContain('longpress');

    vi.advanceTimersByTime(600);

    // longpress is emitted asynchronously via setTimeout —
    // it pushes onto the events array returned by down()
    expect(downEvents.some(e => e.type === 'longpress')).toBe(true);
  });

  it('does not fire longpress if pointer moves to drag', () => {
    const session = createPointerSession({ longPressDelay: 500, dragThreshold: 3 });
    const root = scene(0, 0, 200, 200);

    const downEvents = session.down(50, 50, root, 0);
    session.move(60, 60, root, 100);

    vi.advanceTimersByTime(600);
    expect(downEvents.some(e => e.type === 'longpress')).toBe(false);
  });

  it('does not emit tap after longpress', () => {
    const session = createPointerSession({ longPressDelay: 200 });
    const root = scene(0, 0, 100, 100);

    session.down(50, 50, root, 0);
    vi.advanceTimersByTime(300);

    const upEvents = session.up(50, 50, root, 400);
    expect(eventTypes(upEvents)).not.toContain('tap');
  });

  // --- Hover (enter/leave) ---

  it('emits pointerenter when moving over a new node', () => {
    const a = scene(0, 0, 50, 100, { data: 'a' });
    const b = scene(50, 0, 50, 100, { data: 'b' });
    const root = scene(0, 0, 100, 100, { children: [a, b] });

    const session = createPointerSession();
    const move1 = session.move(25, 50, root, 0);
    expect(move1.some(e => e.type === 'pointerenter' && e.target === a)).toBe(true);

    const move2 = session.move(75, 50, root, 50);
    expect(move2.some(e => e.type === 'pointerleave' && e.target === a)).toBe(true);
    expect(move2.some(e => e.type === 'pointerenter' && e.target === b)).toBe(true);
  });

  // --- Cancel ---

  it('cancel resets to idle and emits dragend if dragging', () => {
    const root = scene(0, 0, 200, 200);
    const session = createPointerSession({ dragThreshold: 3 });

    session.down(50, 50, root, 0);
    session.move(60, 60, root, 50);
    expect(session.state).toBe('dragging');

    const cancelEvents = session.cancel();
    expect(eventTypes(cancelEvents)).toContain('dragend');
    expect(session.state).toBe('idle');
  });
});
