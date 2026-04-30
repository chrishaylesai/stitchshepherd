"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useEditorPatternStore } from "@/stores/editorStore";
import type { PatternContent, PatternMetadata } from "@stitchharbor/types";

import { EditorCanvas } from "./EditorCanvas";
import { EditorPanels } from "./EditorPanels";
import { EditorToolbar } from "./EditorToolbar";
import { useAutoSave } from "./useAutoSave";

export type InitialEditorPattern = {
  metadata: PatternMetadata;
  content: PatternContent;
};

export function EditorShell({
  currentUserId,
  initialPattern
}: {
  currentUserId: string;
  initialPattern?: InitialEditorPattern | null;
}) {
  const loadedPatternId = useRef<string | null>(null);
  const title = useEditorPatternStore((state) => state.metadata.title);
  const autoSave = useAutoSave();

  useEffect(() => {
    if (!initialPattern || loadedPatternId.current === initialPattern.metadata.id) return;

    useEditorPatternStore.getState().loadPattern(initialPattern.content, initialPattern.metadata);
    loadedPatternId.current = initialPattern.metadata.id;
  }, [initialPattern]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,hsl(var(--background)),hsl(36_33%_88%))] p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card/90 px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {initialPattern ? `${initialPattern.metadata.gridWidth} x ${initialPattern.metadata.gridHeight}` : "Local draft"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{formatAutoSaveState(autoSave)}</span>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard">
              Dashboard
            </Link>
          </div>
        </header>
        <div className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <EditorToolbar />
          <EditorCanvas />
          <EditorPanels currentUserId={currentUserId} />
        </div>
      </div>
    </main>
  );
}

function formatAutoSaveState(autoSave: ReturnType<typeof useAutoSave>) {
  switch (autoSave.status) {
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving...";
    case "saved":
      return `Saved at ${autoSave.savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    case "error":
      return "Failed - retrying";
    case "idle":
      return "";
  }
}
