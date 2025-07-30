import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface DraftStorageOptions {
  key: string;
  debounceMs?: number;
  version?: number;
}

interface DraftData<T> {
  data: T;
  savedAt: string;
  userId: string;
  version: number;
}

/**
 * Hook for persisting form drafts across sessions
 * Stores data in localStorage with user context
 */
export function useDraftStorage<T extends Record<string, any>>(
  initialData: T,
  options: DraftStorageOptions
) {
  const { userId } = useAuth();
  const { key, debounceMs = 1000, version = 1 } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `draft_${key}_${userId || 'anonymous'}`;

  // Load draft from storage
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const draft: DraftData<T> = JSON.parse(stored);
        
        // Check version compatibility
        if (draft.version === version && draft.userId === userId) {
          setData(draft.data);
          setLastSaved(new Date(draft.savedAt));
        } else {
          // Clear incompatible draft
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      localStorage.removeItem(storageKey);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, userId, version]);

  const saveDraft = useCallback(() => {
    if (!userId) return;

    try {
      const draft: DraftData<T> = {
        data,
        savedAt: new Date().toISOString(),
        userId,
        version,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [data, storageKey, userId, version]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isDirty || !userId) return;

    const timer = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, isDirty, userId, debounceMs, saveDraft]);

  const updateDraft = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setData(initialData);
    setIsDirty(false);
    setLastSaved(null);
  }, [initialData, storageKey]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  return {
    data,
    updateDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    isDirty,
    lastSaved,
    isLoading,
  };
}