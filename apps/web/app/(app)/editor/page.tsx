import { redirect } from "next/navigation";

import { createCaller } from "@stitchharbor/api";
import type { PatternContent, PatternMetadata } from "@stitchharbor/types";

import { EditorShell } from "@/components/editor/EditorShell";
import { auth } from "@/lib/auth";

type EditorPageProps = {
  searchParams: Promise<{
    patternId?: string;
  }>;
};

type InitialEditorPattern = {
  metadata: PatternMetadata;
  content: PatternContent;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const currentUserId = session.user.id;

  if (!currentUserId) {
    redirect("/login");
  }

  const { patternId } = await searchParams;
  let initialPattern: InitialEditorPattern | null = null;

  if (patternId && isUuid(patternId)) {
    const caller = createCaller({ session });
    initialPattern = await caller.patterns.load({ id: patternId });
  }

  return <EditorShell currentUserId={currentUserId} initialPattern={initialPattern} />;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
