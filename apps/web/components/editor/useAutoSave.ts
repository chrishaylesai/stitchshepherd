"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { trpcClient } from "@/lib/trpc-client";
import { useEditorPatternStore } from "@/stores/editorStore";

const AUTO_SAVE_DELAY_MS = 2000;
const RETRY_DELAY_MS = 5000;
const LOCAL_DRAFT_ID = "local-draft";

export type AutoSaveState =
  | { status: "idle"; savedAt: null }
  | { status: "dirty"; savedAt: Date | null }
  | { status: "saving"; savedAt: Date | null }
  | { status: "saved"; savedAt: Date }
  | { status: "error"; savedAt: Date | null };

export function useAutoSave() {
  const pattern = useEditorPatternStore((state) => state.pattern);
  const metadata = useEditorPatternStore((state) => state.metadata);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({ status: "idle", savedAt: null });
  const lastSavedSignature = useRef<string | null>(null);
  const hasUnsavedChanges = useRef(false);
  const patternId = metadata.id;
  const canAutoSave = patternId !== LOCAL_DRAFT_ID;

  const signature = useMemo(
    () =>
      JSON.stringify({
        pattern,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          isPublic: metadata.isPublic,
          gridWidth: metadata.gridWidth,
          gridHeight: metadata.gridHeight,
          fabricCount: metadata.fabricCount,
          frame: metadata.frame
        }
      }),
    [
      metadata.description,
      metadata.fabricCount,
      metadata.frame,
      metadata.gridHeight,
      metadata.gridWidth,
      metadata.isPublic,
      metadata.title,
      pattern
    ]
  );

  useEffect(() => {
    lastSavedSignature.current = null;
    hasUnsavedChanges.current = false;
    setAutoSaveState({ status: "idle", savedAt: null });
  }, [patternId]);

  useEffect(() => {
    if (!canAutoSave) return;

    if (lastSavedSignature.current === null) {
      lastSavedSignature.current = signature;
      return;
    }

    if (lastSavedSignature.current === signature) return;

    hasUnsavedChanges.current = true;
    setAutoSaveState((current) => ({ status: "dirty", savedAt: current.savedAt }));

    let cancelled = false;
    let retryTimer: number | null = null;

    const save = async () => {
      setAutoSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));

      try {
        await trpcClient.patterns.save.mutate({
          id: metadata.id,
          title: metadata.title,
          description: metadata.description ?? null,
          isPublic: metadata.isPublic,
          gridWidth: metadata.gridWidth,
          gridHeight: metadata.gridHeight,
          fabricCount: metadata.fabricCount,
          frame: metadata.frame,
          content: pattern
        });

        if (cancelled) return;

        const savedAt = new Date();
        lastSavedSignature.current = signature;
        hasUnsavedChanges.current = false;
        setAutoSaveState({ status: "saved", savedAt });
      } catch {
        if (cancelled) return;

        setAutoSaveState((current) => ({ status: "error", savedAt: current.savedAt }));
        retryTimer = window.setTimeout(() => {
          void save();
        }, RETRY_DELAY_MS);
      }
    };

    const debounceTimer = window.setTimeout(() => {
      void save();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [canAutoSave, metadata, pattern, signature]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges.current) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return autoSaveState;
}
