// Touch, mouse and keyboard behaviour of the chart hit areas, driven through the handlers with a fake tooltip API. The browser verification (touch emulation) is
// what found the problem this guards against: a synthetic mouseleave right after a tap closed the tooltip the moment it opened.

import { createElement, type PointerEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartTooltipApi } from "@/components/analytics/tooltip";
import { useTooltipHandlers } from "./useTooltipHandlers";

function setup() {
  const calls: string[] = [];
  const tip: ChartTooltipApi<string> = {
    tip: null,
    width: 640,
    showAtPointer: (_e, data) => void calls.push(`pointer:${data}`),
    showAtElement: (_el, data) => void calls.push(`element:${data}`),
    hide: () => void calls.push("hide"),
  };
  let api!: ReturnType<typeof useTooltipHandlers<string>>;
  const Probe = () => {
    api = useTooltipHandlers(tip);
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  return { api, calls, h: api.hit("3M") };
}
const ptr = (pointerType: string, target: Partial<Element> = {}) => ({ pointerType, clientX: 10, clientY: 20, target }) as unknown as PointerEvent;
const mouse = () => ({ clientX: 10, clientY: 20 }) as never;

describe("touch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("a tap shows the tooltip for the tapped column (on pointerup)", () => {
    const { h, calls } = setup();
    h.onPointerDown(ptr("touch"));
    h.onPointerUp(ptr("touch"));
    expect(calls).toEqual(["pointer:3M"]);
  });

  it("a synthetic mouseleave / blur right after a tap does not close it", () => {
    const { h, calls } = setup();
    h.onPointerDown(ptr("touch"));
    h.onPointerUp(ptr("touch"));
    vi.advanceTimersByTime(50);
    h.onMouseLeave();
    h.onBlur();
    expect(calls).toEqual(["pointer:3M"]);
  });

  it("a synthetic mouseenter / mousemove right after a tap does not move it to another column", () => {
    const { h, calls } = setup();
    h.onPointerDown(ptr("touch"));
    h.onPointerUp(ptr("touch"));
    h.onMouseEnter(mouse());
    h.onMouseMove(mouse());
    expect(calls).toEqual(["pointer:3M"]);
  });

  it("the quiet period ends: a real mouse leave later hides it again", () => {
    const { h, calls } = setup();
    h.onPointerDown(ptr("touch"));
    vi.advanceTimersByTime(800);
    h.onMouseLeave();
    expect(calls).toEqual(["hide"]);
  });

  it("a tap on empty chart area hides; a tap on a hit area (role=img) does not", () => {
    const { api, calls } = setup();
    api.onBlankPointerDown(ptr("touch", { getAttribute: () => null } as unknown as Partial<Element>));
    expect(calls).toEqual(["hide"]);
    api.onBlankPointerDown(ptr("touch", { getAttribute: (n: string) => (n === "role" ? "img" : null) } as unknown as Partial<Element>));
    expect(calls).toEqual(["hide"]);
  });

  it("a mouse press on empty area does not hide (the mouse leaves normally)", () => {
    const { api, calls } = setup();
    api.onBlankPointerDown(ptr("mouse", { getAttribute: () => null } as unknown as Partial<Element>));
    expect(calls).toEqual([]);
  });
});

describe("mouse and keyboard are unchanged", () => {
  it("hover shows, leaving hides", () => {
    const { h, calls } = setup();
    h.onMouseEnter(mouse());
    h.onMouseMove(mouse());
    h.onMouseLeave();
    expect(calls).toEqual(["pointer:3M", "pointer:3M", "hide"]);
  });

  it("a mouse pointerup shows nothing by itself (only touch uses pointerup)", () => {
    const { h, calls } = setup();
    h.onPointerDown(ptr("mouse"));
    h.onPointerUp(ptr("mouse"));
    expect(calls).toEqual([]);
  });

  it("focus shows anchored to the element, blur hides", () => {
    const { h, calls } = setup();
    h.onFocus({ currentTarget: {} } as never);
    h.onBlur();
    expect(calls).toEqual(["element:3M", "hide"]);
  });
});
