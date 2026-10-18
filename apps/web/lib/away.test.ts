import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchAway } from "./away";

const HIDDEN = 5 * 60_000;
const IDLE = 30 * 60_000;

function setup() {
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
  const window = new EventTarget();
  const events: string[] = [];
  const stop = watchAway(
    { hiddenMs: HIDDEN, idleMs: IDLE, onAway: () => events.push("away"), onBack: () => events.push("back") },
    { document, window },
  );
  const setVisibility = (state: DocumentVisibilityState) => {
    document.visibilityState = state;
    document.dispatchEvent(new Event("visibilitychange"));
  };
  const input = (type = "pointermove") => document.dispatchEvent(new Event(type));
  return { events, stop, setVisibility, input, window };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("watchAway", () => {
  it("goes away after a visible page has had no input for the idle time", () => {
    const { events } = setup();
    vi.advanceTimersByTime(IDLE - 1);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["away"]);
  });

  it("restarts the idle timer on input", () => {
    const { events, input } = setup();
    vi.advanceTimersByTime(IDLE - 1000);
    input("keydown");
    vi.advanceTimersByTime(IDLE - 1);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["away"]);
  });

  it("goes away sooner in a background tab and comes back when the tab is shown", () => {
    const { events, setVisibility } = setup();
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN);
    expect(events).toEqual(["away"]);
    setVisibility("visible");
    expect(events).toEqual(["away", "back"]);
  });

  it("comes back on the first input, then watches again", () => {
    const { events, input } = setup();
    vi.advanceTimersByTime(IDLE);
    input();
    input();
    expect(events).toEqual(["away", "back"]);
    vi.advanceTimersByTime(IDLE);
    expect(events).toEqual(["away", "back", "away"]);
  });

  it("treats focusing the window as input", () => {
    const { events, window } = setup();
    vi.advanceTimersByTime(IDLE);
    window.dispatchEvent(new Event("focus"));
    expect(events).toEqual(["away", "back"]);
  });

  it("reports away once, even if the tab is then hidden", () => {
    const { events, setVisibility } = setup();
    vi.advanceTimersByTime(IDLE);
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN);
    expect(events).toEqual(["away"]);
  });

  it("stops watching", () => {
    const { events, stop, input } = setup();
    stop();
    input();
    vi.advanceTimersByTime(IDLE * 2);
    expect(events).toEqual([]);
  });
});
