"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message.slice(0, 500),
        digest: error.digest?.slice(0, 200),
        pathname: window.location.pathname.slice(0, 500),
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-slate-50 p-6 text-ink">
        <main className="w-full max-w-lg rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-black">Basketball Savant hit an unexpected error</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The error has been recorded when monitoring is configured. Try the request again.
          </p>
          <button type="button" onClick={reset} className="mt-5 rounded bg-ink px-4 py-2 text-sm font-black text-white">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
