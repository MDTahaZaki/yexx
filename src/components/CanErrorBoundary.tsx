"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * A render-time throw is the one thing only a React error boundary (a class
 * component — there is no hook equivalent) can catch, and that's exactly
 * what a failed WebGL context acquisition is: three.js's WebGLRenderer
 * constructor throws synchronously when it can't get a context (no WebGL2
 * support, the device's live-context cap already hit, out of GPU memory —
 * all more common on iOS Safari than desktop Chrome). Neither R3F's
 * `<Canvas>` nor its `onCreated`/`onLost` callbacks (see EnergyDrinkCan,
 * which only run *after* a context already exists) catch that throw — it
 * propagates straight up through React. Without a boundary here, and with
 * no root `error.tsx` either, that throw took out the entire page (nav,
 * headline, CTAs, everything) instead of just the can.
 *
 * Renders nothing on failure rather than its own fallback: CanScene already
 * keeps an always-mounted StaticCanPoster sibling visible at full opacity
 * until `onReady` fires, and `onReady` never fires when this boundary
 * catches — so that sibling poster is already the correct, visible fallback
 * the moment this one goes empty.
 */
export default class CanErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[CanErrorBoundary] 3D can failed to mount, falling back to the static poster:", error);
  }

  render() {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}
