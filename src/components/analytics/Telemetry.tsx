"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import type { PostHog } from "posthog-js";

type AnalyticsEvent = {
  name: string;
  properties: Record<string, string | number | boolean | null>;
};

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

function pageAreaForElement(element: Element) {
  if (element.closest("nav")) return "navigation";
  if (element.closest("header")) return "header";
  if (element.closest("main")) return "main";
  if (element.closest("footer")) return "footer";
  return "page";
}

function sanitizedPathname(url: URL) {
  return url.pathname || "/";
}

export function analyticsEventForAnchor(anchor: HTMLAnchorElement, currentOrigin: string): AnalyticsEvent | null {
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
    return null;
  }

  let target: URL;
  try {
    target = new URL(anchor.href, currentOrigin);
  } catch {
    return null;
  }

  const isExternal = target.origin !== currentOrigin;
  const eventName = anchor.dataset.analyticsEvent || (isExternal ? "outbound_link_click" : "navigation_click");
  const properties: AnalyticsEvent["properties"] = {
    area: pageAreaForElement(anchor),
    current_path: window.location.pathname,
    target_path: sanitizedPathname(target),
    is_external: isExternal,
  };

  if (isExternal) {
    properties.target_domain = target.hostname;
  }
  if (anchor.download) {
    properties.download = true;
  }

  return { name: eventName, properties };
}

function captureAnalyticsEvent(event: AnalyticsEvent) {
  void getPostHogClient().then((posthog) => {
    posthog?.capture(event.name, event.properties);
  });
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

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const analyticsEvent = analyticsEventForAnchor(anchor, window.location.origin);
      if (analyticsEvent) captureAnalyticsEvent(analyticsEvent);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

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
