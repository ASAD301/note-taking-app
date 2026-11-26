"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Renders a timestamp in the viewer's locale and time zone (falls back to UTC on the server). */
export function LocalTime({ ts, prefix }: { ts: number; prefix?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    () => new Date(ts).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC",
  );
  return (
    <time dateTime={new Date(ts).toISOString()}>
      {prefix}
      {text}
    </time>
  );
}
