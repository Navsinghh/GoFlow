"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TourStep } from "./editor-tour";
import { placeCard } from "./placement";
import { Stage, TourAbort, type Point } from "./stage";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(reducedMotionQuery);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

function Pointer() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgb(0_0_0/0.5)]">
      <path
        d="M4 2.5 L4 19.5 L8.6 15.2 L11.6 21.8 L14.4 20.6 L11.5 14.1 L17.8 14.1 Z"
        fill="white"
        stroke="#011627"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SPOTLIGHT_PADDING = 6;

interface Props {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

/**
 * Step-by-step walkthrough: spotlights a real part of the UI while a scripted
 * pointer demonstrates it on look-alike elements drawn above the app.
 */
export function Tour({ steps, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<Point | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cursorPos = useRef<Point | null>(null);
  const reduced = usePrefersReducedMotion();

  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const go = useCallback((delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), steps.length - 1)), [steps.length]);

  // Measure the spotlight target and position the card beside it.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const find = (id?: string) => (id ? document.querySelector(`[data-tour="${id}"]`)?.getBoundingClientRect() : null);
      const rect = find(step.target) ?? null;
      setTarget(rect);
      const card = cardRef.current;
      if (!card) return;
      const anchor = find(step.cardTarget ?? step.target);
      setCardPos(
        placeCard(
          anchor ? { x: anchor.left, y: anchor.top, width: anchor.width, height: anchor.height } : null,
          { width: card.offsetWidth, height: card.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight },
          step.placement,
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, step]);

  // Play the step's demonstration on a loop until the step changes.
  useEffect(() => {
    const layer = layerRef.current;
    const cursor = cursorRef.current;
    if (!open || !layer || !cursor) return;

    const controller = new AbortController();
    const start = cursorPos.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const stage = new Stage(layer, cursor, controller.signal, reduced, start);
    stage.showCursor(Boolean(step.play));

    const run = async () => {
      if (!step.play) return;
      try {
        await stage.sleep(350); // let the spotlight settle first
        do {
          await step.play(stage);
          if (reduced) break; // leave the end state on screen
          await stage.sleep(900);
          await stage.animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
          stage.clear();
          layer.style.opacity = "1";
        } while (!controller.signal.aborted);
      } catch (error) {
        if (!(error instanceof TourAbort)) console.error(error);
      }
    };
    void run();

    return () => {
      controller.abort();
      cursorPos.current = stage.position;
      stage.clear();
      layer.style.opacity = "1";
    };
  }, [open, step, reduced]);

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") isLast ? onClose() : go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, isLast, go, onClose]);

  if (!open) return null;

  const spotlight = target
    ? {
        left: target.left - SPOTLIGHT_PADDING,
        top: target.top - SPOTLIGHT_PADDING,
        width: target.width + SPOTLIGHT_PADDING * 2,
        height: target.height + SPOTLIGHT_PADDING * 2,
      }
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div
        className={cn(
          "pointer-events-none fixed rounded-xl shadow-[0_0_0_9999px_rgb(1_22_39/0.8)] transition-all duration-300 ease-out",
          target && "ring-2 ring-accent/70",
        )}
        style={spotlight}
      />
      <div ref={layerRef} className="pointer-events-none fixed inset-0" aria-hidden />
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-10 opacity-0 transition-opacity duration-200"
        aria-hidden
      >
        <div className="origin-top-left">
          <Pointer />
        </div>
      </div>

      <div
        ref={cardRef}
        className="fixed z-20 w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-line bg-panel p-5 shadow-2xl shadow-black/50 transition-[left,top] duration-300 ease-out"
        style={cardPos ? { left: cardPos.x, top: cardPos.y } : { visibility: "hidden" }}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium text-accent" aria-live="polite">
            Step {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            className="-mt-1 -mr-1 rounded-md p-1 text-muted transition hover:bg-raised hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-title" className="mt-2 text-lg font-semibold tracking-tight">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-muted">
          {step.body}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-line hover:bg-muted",
                )}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted transition hover:bg-raised hover:text-fg"
              >
                Back
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (isLast ? onClose() : go(1))}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-bg transition hover:brightness-110"
            >
              {index === 0 ? "Show me" : isLast ? "Start building" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
