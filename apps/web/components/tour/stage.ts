export interface Point {
  x: number;
  y: number;
}

export class TourAbort extends Error {
  constructor() {
    super("Tour step was interrupted");
    this.name = "TourAbort";
  }
}

const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";

export function centerOf(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * The scripting surface for one tour step's animation: a pointer, throwaway
 * "ghost" elements drawn above the app, and timing helpers. Everything is
 * tied to an AbortSignal so leaving a step stops its script mid-flight.
 * With reduced motion every duration collapses to zero and the script just
 * shows its end state.
 */
export class Stage {
  private ghosts = new Set<Element>();

  constructor(
    private readonly layer: HTMLElement,
    private readonly cursor: HTMLElement,
    private readonly signal: AbortSignal,
    readonly reduced: boolean,
    /** Where the pointer currently is; kept across steps for continuity. */
    public position: Point,
  ) {
    this.placeCursor(position);
  }

  private check() {
    if (this.signal.aborted) throw new TourAbort();
  }

  private placeCursor(p: Point) {
    this.cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }

  /** Finds the element marked with `data-tour="<id>"`. */
  target(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  }

  rect(id: string): DOMRect | null {
    return this.target(id)?.getBoundingClientRect() ?? null;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) return reject(new TourAbort());
      const onAbort = () => {
        clearTimeout(timer);
        reject(new TourAbort());
      };
      const timer = setTimeout(
        () => {
          this.signal.removeEventListener("abort", onAbort);
          resolve();
        },
        this.reduced ? 0 : ms,
      );
      this.signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  /** Runs a Web Animation and keeps its end state as inline style. */
  async animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
    this.check();
    const animation = el.animate(keyframes, {
      easing: EASE,
      fill: "forwards",
      ...options,
      duration: this.reduced ? 0 : options.duration,
    });
    const onAbort = () => animation.cancel();
    this.signal.addEventListener("abort", onAbort, { once: true });
    try {
      await animation.finished;
    } catch {
      throw new TourAbort();
    } finally {
      this.signal.removeEventListener("abort", onAbort);
    }
    animation.commitStyles();
    animation.cancel();
  }

  /** Adds an element to the ghost layer at a fixed screen position. */
  ghost<K extends keyof HTMLElementTagNameMap = "div">(
    className: string,
    at: Point,
    tag: K = "div" as K,
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    el.className = `absolute ${className}`;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    this.layer.append(el);
    this.ghosts.add(el);
    return el;
  }

  /** Adds an SVG overlay covering the whole layer (for drawing edges). */
  svg(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "absolute inset-0 size-full overflow-visible");
    this.layer.append(svg);
    this.ghosts.add(svg);
    return svg;
  }

  appear(el: Element, duration = 280) {
    return this.animate(
      el,
      [
        { opacity: 0, transform: "scale(0.94)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration },
    );
  }

  clear() {
    for (const el of this.ghosts) el.remove();
    this.ghosts.clear();
  }

  // --- pointer -------------------------------------------------------------

  showCursor(visible: boolean) {
    this.cursor.style.opacity = visible ? "1" : "0";
  }

  async moveTo(p: Point, duration = 750) {
    const from = this.position;
    await this.animate(
      this.cursor,
      [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${p.x}px, ${p.y}px)` }],
      { duration },
    );
    this.position = p;
  }

  async press(down: boolean) {
    const icon = this.cursor.firstElementChild!;
    await this.animate(icon, [{ transform: `scale(${down ? 1 : 0.82})` }, { transform: `scale(${down ? 0.82 : 1})` }], {
      duration: 120,
    });
  }

  /** Press-and-release with a ripple at the pointer tip. */
  async click() {
    const ripple = this.ghost("pointer-events-none size-8 rounded-full bg-accent/50", this.position);
    void this.animate(
      ripple,
      [
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.9 },
        { transform: "translate(-50%, -50%) scale(1.6)", opacity: 0 },
      ],
      { duration: 450 },
    ).catch(() => {});
    await this.press(true);
    await this.press(false);
  }

  /** Types `text` into `el` one character at a time. */
  async type(el: HTMLElement, text: string, onChar?: (typed: string) => void) {
    for (let i = 1; i <= text.length; i++) {
      const typed = text.slice(0, i);
      el.textContent = typed;
      onChar?.(typed);
      await this.sleep(55 + Math.random() * 45);
    }
  }
}
