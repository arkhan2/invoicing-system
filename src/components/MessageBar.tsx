"use client";

import { useState, useEffect, useCallback } from "react";

export type MessageType = "success" | "error" | "info";

const EVENT_NAME = "app-message";

type MessagePayload = {
  text: string;
  type?: MessageType;
};

export function showMessage(text: string, type: MessageType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { text, type } as MessagePayload })
  );
}

const typeStyles: Record<MessageType, string> = {
  success:
    "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]",
  error:
    "bg-[var(--color-error)] text-white",
  info:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
};

export function MessageBar() {
  const [message, setMessage] = useState<MessagePayload | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  const handleEvent = useCallback((e: CustomEvent<MessagePayload>) => {
    const { text, type = "info" } = e.detail ?? {};
    if (!text) return;
    setMessage({ text, type });
    setFadeOut(false);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => handleEvent(e as CustomEvent<MessagePayload>);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [handleEvent]);

  useEffect(() => {
    if (!message) return;
    const showMs = 3000;
    const fadeMs = 300;
    const t1 = setTimeout(() => setFadeOut(true), showMs);
    const t2 = setTimeout(() => setMessage(null), showMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [message]);

  if (!message) return null;

  const type = message.type ?? "info";
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-4 z-50 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isSuccess ? "outline-none ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)]" : ""} ${typeStyles[type]} ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        top: "calc(var(--header-height, 56px) + 12px)",
        ...(isSuccess && {
          boxShadow: "0 0 0 1px var(--color-primary), 0 0 20px var(--color-primary)",
        }),
      }}
    >
      {message.text}
    </div>
  );
}
