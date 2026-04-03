declare module 'react-reconciler' {
  import type { ReactNode } from 'react';

  interface OpaqueRoot {}

  interface Reconciler<Container> {
    createContainer(
      containerInfo: Container,
      tag: number,
      hydrationCallbacks: null,
      isStrictMode: boolean,
      concurrentUpdatesByDefaultOverride: null,
      identifierPrefix: string,
      onUncaughtError: (error: unknown) => void,
      onCaughtError: (error: unknown) => void,
      onRecoverableError: (error: unknown) => void,
      transitionCallbacks: null,
    ): OpaqueRoot;

    updateContainer(
      element: ReactNode,
      container: OpaqueRoot,
      parentComponent: null,
      callback: (() => void) | null,
    ): void;

    flushSync<T>(fn: () => T): T;
  }

  function ReactReconciler<Container>(config: Record<string, unknown>): Reconciler<Container>;
  export default ReactReconciler;
}
