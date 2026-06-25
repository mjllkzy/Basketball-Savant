"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import type { PostHog } from "posthog-js";

let posthogClient: PostHog | null = null;
let posthogPromise: Promise<PostHog | null> | null = null;

async function getPostHogClient() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  if (posthogClient) return posthogClient;
  if (posthogPromise) return posthogPromise;

  posthogPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      cookieless_mode: "always",
      disable_session_recording: true,
      person_profiles: "identified_only",
      persistence: "memory",
    });
    posthogClient = posthog;
    return posthog;
  }).catch(() => null);

  return posthogPromise;
}

export function Telemetry() {
  const pathname = usePathname();

  useEffect(() => {
    void getPostHogClient().then((posthog) => {
      if (!posthog) return;
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        pathname,
      });
    });
  }, [pathname]);

  useReportWebVitals((metric) => {
    void getPostHogClient().then((posthog) => {
      posthog?.capture("web_vital", {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigation_type: metric.navigationType,
      });
    });
  });

  return null;
}
