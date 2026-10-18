/** Input that counts as the person being at the page. */
const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
/** Mouse moves arrive many times a second; restarting the idle timer once a second is plenty. */
const INPUT_THROTTLE_MS = 1000;

interface AwayOptions {
  /** How long the page may sit in a background tab. */
  hiddenMs: number;
  /** How long a visible page may go without any input. */
  idleMs: number;
  onAway: () => void;
  onBack: () => void;
}

interface Page {
  document: EventTarget & { readonly visibilityState: DocumentVisibilityState };
  window: EventTarget;
}

/**
 * Calls `onAway` once the page has been in a background tab for `hiddenMs`, or
 * visible without input for `idleMs`, then `onBack` at the next sign that the
 * person is back. Returns a function that stops watching.
 */
export function watchAway({ hiddenMs, idleMs, onAway, onBack }: AwayOptions, page: Page = { document, window }) {
  let away = false;
  let lastInput = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    clearTimeout(timer);
    const delay = page.document.visibilityState === "hidden" ? hiddenMs : idleMs;
    timer = setTimeout(() => {
      if (away) return;
      away = true;
      onAway();
    }, delay);
  };
  const back = () => {
    if (away) {
      away = false;
      onBack();
    }
    schedule();
  };
  const onInput = () => {
    const now = Date.now();
    if (!away && now - lastInput < INPUT_THROTTLE_MS) return;
    lastInput = now;
    back();
  };
  const onVisibility = () => (page.document.visibilityState === "hidden" ? schedule() : back());

  page.document.addEventListener("visibilitychange", onVisibility);
  page.window.addEventListener("focus", onInput);
  // Capture phase, so the canvas can't hide input by stopping propagation.
  for (const type of INPUT_EVENTS) page.document.addEventListener(type, onInput, { capture: true, passive: true });
  schedule();

  return () => {
    clearTimeout(timer);
    page.document.removeEventListener("visibilitychange", onVisibility);
    page.window.removeEventListener("focus", onInput);
    for (const type of INPUT_EVENTS) page.document.removeEventListener(type, onInput, { capture: true });
  };
}
