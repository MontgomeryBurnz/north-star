"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { explorerRestrictionMessage, isExplorerMutationLabel } from "@/lib/explorer-policy";
import { usePathname } from "next/navigation";

const ExplorerContext = createContext(false);
export function useExplorerMode() { return useContext(ExplorerContext); }

// Compatibility boundary for the existing raw HTML forms across workspaces.
// This is UX only: every non-auth API route separately enforces server policy.
export function ExplorerMode({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const guardWorkspace = enabled && !pathname.startsWith("/auth/") && pathname !== "/login";
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!guardWorkspace || !element) return;
    function markUnavailable(control: HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement) {
      if (!control.disabled) control.disabled = true;
      control.title = explorerRestrictionMessage;
      control.dataset.explorerUnavailable = "true";
    }
    function updateControls() {
      element!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach(control => {
        const label = `${control.getAttribute("aria-label") ?? ""} ${control.getAttribute("placeholder") ?? ""}`;
        const search = control instanceof HTMLInputElement && (control.type === "search" || /\b(search|filter)\b/i.test(label));
        const selection = control instanceof HTMLInputElement && (control.type === "hidden" || control.hasAttribute("data-studio-output") || control.hasAttribute("data-explorer-filter"));
        if (!search && !selection) markUnavailable(control);
      });
      element!.querySelectorAll<HTMLButtonElement>("button").forEach(button => {
        // Story cards and view selectors are navigation, even if a fictional
        // story title contains words such as "Approve" or "Submit".
        if (button.hasAttribute("aria-pressed")) return;
        if (isExplorerMutationLabel(`${button.textContent ?? ""} ${button.getAttribute("aria-label") ?? ""}`)) markUnavailable(button);
      });
    }
    updateControls();
    const observer = new MutationObserver(updateControls);
    observer.observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled"] });
    return () => observer.disconnect();
  }, [guardWorkspace]);

  return <ExplorerContext.Provider value={enabled}><div ref={root} data-explorer-mode={enabled || undefined}
    onSubmitCapture={event => {
      if (!guardWorkspace) return;
      const form = event.target as HTMLFormElement;
      const action = new URL(form.action, window.location.href).pathname;
      if (action !== "/api/auth/user/logout") { event.preventDefault(); event.stopPropagation(); }
    }}>
    {children}
  </div></ExplorerContext.Provider>;
}
