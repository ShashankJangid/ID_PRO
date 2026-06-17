import { useState, useCallback } from 'react';

export function useDesignerHistory<T>(initialState: T, maxDepth = 30) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setPresent((prev) => {
      const resolvedState = typeof newState === 'function' ? (newState as Function)(prev) : newState;
      if (resolvedState === prev) return prev;

      setPast((p) => {
        const nextPast = [...p, prev];
        if (nextPast.length > maxDepth) {
          nextPast.shift();
        }
        return nextPast;
      });
      setFuture([]);
      return resolvedState;
    });
  }, [maxDepth]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setPast((p) => {
      const nextPast = [...p];
      const previous = nextPast.pop()!;
      setPresent((pres) => {
        setFuture((f) => [pres, ...f]);
        return previous;
      });
      return nextPast;
    });
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setFuture((f) => {
      const nextFuture = [...f];
      const next = nextFuture.shift()!;
      setPresent((pres) => {
        setPast((p) => [...p, pres]);
        return next;
      });
      return nextFuture;
    });
  }, [future]);

  const reset = useCallback((state: T) => {
    setPast([]);
    setPresent(state);
    setFuture([]);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
