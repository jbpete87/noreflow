import ReactReconciler from 'react-reconciler';
import { hostConfig } from './hostConfig.js';
import type { TContainer } from './types.js';

const reconciler = ReactReconciler(hostConfig) as ReturnType<typeof ReactReconciler<TContainer>>;

// Expose updateContainerSync for synchronous initial render
export const TelReconciler = reconciler as typeof reconciler & {
  updateContainerSync: typeof reconciler.updateContainer;
};
