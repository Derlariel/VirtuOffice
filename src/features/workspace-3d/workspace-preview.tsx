"use client";

import dynamic from "next/dynamic";
import { Component, memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { clampPosition, type Point, type WorkspaceView } from "./layout";

function LoadingPreview() {
  const t = useTranslations("Workspace3D");
  return <p role="status" className="p-6 text-center">{t("loading")}</p>;
}

const Scene = dynamic(() => import("./scene"), { ssr: false, loading: LoadingPreview });

function SceneUnavailable({ onFailure, children }: { onFailure: () => void; children: ReactNode }) {
  useEffect(onFailure, [onFailure]);
  return children;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export const WorkspacePreview = memo(function WorkspacePreview({ view, roomName, simpleMode, onFailure: onFallback }: {
  view: WorkspaceView;
  roomName: string;
  simpleMode: boolean;
  onFailure: () => void;
}) {
  const t = useTranslations("Workspace3D");
  const [failed, setFailed] = useState(false);
  const [movement, setMovement] = useState<{ roomId: string; point: Point } | null>(null);
  const target: Point = movement?.roomId === view.roomId ? movement.point : [0, 4];
  const onMove = (point: Point) => setMovement({ roomId: view.roomId, point });
  const container = useRef<HTMLDivElement>(null);
  const onFailure = useCallback(() => { setFailed(true); onFallback(); }, [onFallback]);
  const fallback = (
    <div role="status" className="grid h-full place-content-center bg-zinc-100 p-6 text-center text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
      <p className="text-sm font-semibold uppercase tracking-[0.16em]">{t("simpleMode")}</p>
      <p className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-white">{roomName}</p>
      <p className="mx-auto mt-3 max-w-lg leading-7">{failed ? t("fallback") : t("simpleDescription")}</p>
    </div>
  );
  return (
    <div className="fixed inset-0 z-0 h-dvh w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <p id="workspace-instructions" className="sr-only">{t("instructions")}</p>
      {simpleMode ? fallback : (
        <div id="workspace-preview" ref={container} tabIndex={0} role="region" aria-label={t("title", { room: roomName })} aria-describedby="workspace-instructions" onPointerDown={() => container.current?.focus({ preventScroll: true })} onKeyDown={(event) => {
          const steps: Record<string, Point> = { ArrowUp: [0, -0.5], ArrowDown: [0, 0.5], ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0] };
          const step = steps[event.key];
          if (!step || event.altKey || event.ctrlKey || event.metaKey) return;
          event.preventDefault();
          onMove(clampPosition([target[0] + step[0], target[1] + step[1]]));
        }} className="absolute inset-0 h-full w-full bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-700 dark:bg-zinc-950">
          <SceneBoundary fallback={fallback} onFailure={onFailure}>
            <Scene view={view} target={target} onMove={onMove} fallback={<SceneUnavailable onFailure={onFailure}>{fallback}</SceneUnavailable>} onFailure={onFailure} />
          </SceneBoundary>
        </div>
      )}
    </div>
  );
});
