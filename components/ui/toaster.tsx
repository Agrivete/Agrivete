"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      visibleToasts={1}
      expand={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "group flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2 w-full sm:w-auto max-w-sm",
          description: "flex-1 text-sm font-medium break-words",
          actionButton: "btn btn-sm",
          cancelButton: "btn btn-sm btn-ghost",
        },
      }}
    />
  );
}
