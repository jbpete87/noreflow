export interface ScrollState {
  /** Current scroll offset in pixels. */
  offset: number;
  /** Current velocity in px/ms. */
  velocity: number;
  /** True while velocity is non-negligible and offset is changing. */
  readonly isAnimating: boolean;

  /**
   * Advance the scroll by one frame. Call once per rAF tick.
   * @param dt - Elapsed time in ms since last tick.
   * @returns The new offset after applying velocity and friction.
   */
  tick(dt: number): number;

  /** Apply an instantaneous velocity impulse (e.g. from a fling gesture). */
  impulse(v: number): void;

  /** Jump to a specific offset (kills any in-flight velocity). */
  scrollTo(target: number): void;

  /** Add a delta to the current offset (e.g. from a wheel event). */
  scrollBy(delta: number): void;

  /** Set the min/max bounds. Offset is clamped after every tick. */
  setBounds(min: number, max: number): void;
}

export interface ScrollConfig {
  /** Friction multiplier per ms (0–1). Closer to 1 = less friction. Default: 0.998. */
  friction?: number;
  /** Velocity below this is treated as zero. Default: 0.01 px/ms. */
  minVelocity?: number;
}

const DEFAULT_FRICTION = 0.998;
const DEFAULT_MIN_VELOCITY = 0.01;

export function createScrollState(config?: ScrollConfig): ScrollState {
  const friction = config?.friction ?? DEFAULT_FRICTION;
  const minVelocity = config?.minVelocity ?? DEFAULT_MIN_VELOCITY;

  let offset = 0;
  let velocity = 0;
  let boundsMin = -Infinity;
  let boundsMax = Infinity;

  function clampOffset(): void {
    if (offset < boundsMin) {
      offset = boundsMin;
      velocity = 0;
    }
    if (offset > boundsMax) {
      offset = boundsMax;
      velocity = 0;
    }
  }

  return {
    get offset() {
      return offset;
    },
    set offset(v: number) {
      offset = v;
      clampOffset();
    },

    get velocity() {
      return velocity;
    },
    set velocity(v: number) {
      velocity = v;
    },

    get isAnimating() {
      return Math.abs(velocity) > minVelocity;
    },

    tick(dt: number): number {
      if (Math.abs(velocity) <= minVelocity) {
        velocity = 0;
        return offset;
      }

      // Apply velocity scaled by dt, then decay by friction^dt
      offset += velocity * dt;
      velocity *= Math.pow(friction, dt);

      if (Math.abs(velocity) <= minVelocity) {
        velocity = 0;
      }

      clampOffset();
      return offset;
    },

    impulse(v: number): void {
      velocity += v;
    },

    scrollTo(target: number): void {
      offset = target;
      velocity = 0;
      clampOffset();
    },

    scrollBy(delta: number): void {
      offset += delta;
      clampOffset();
    },

    setBounds(min: number, max: number): void {
      boundsMin = min;
      boundsMax = max;
      clampOffset();
    },
  };
}
