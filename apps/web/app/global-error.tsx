"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b14",
          color: "#e2e8f0",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(244,63,94,0.12)",
              color: "#fb7185",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              fontSize: 24,
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ marginTop: 24, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
            VeriFrame hit an unexpected error
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "#94a3b8" }}>
            The application shell failed to load. Retry the request. If this continues, check the
            web container logs and the API health endpoint.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 12, fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#64748b" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              border: 0,
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
