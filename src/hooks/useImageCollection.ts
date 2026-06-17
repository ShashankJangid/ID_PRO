import { useState, useCallback } from 'react';

interface ImageItem {
  key: string;
  label: string;
  data: string;
}

export function useImageCollection<T extends ImageItem>(initialItems: T[], prefix: string) {
  const [items, setItems] = useState<T[]>(initialItems);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        key: `${prefix}${Date.now()}`,
        label: '',
        data: '',
      } as T,
    ]);
  }, [prefix]);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateItem = useCallback((idx: number, updates: Partial<T>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates } : item))
    );
  }, []);

  const resetItems = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    resetItems,
  };
}
