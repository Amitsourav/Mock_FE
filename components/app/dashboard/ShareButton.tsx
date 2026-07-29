"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/app/Modal";
import { ApiError, createShareLink, revokeShareLink } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ShareLinkOut, SharePayload } from "@/lib/types";

/**
 * "Share" for the dashboard or one attempt report. Creates the link on open,
 * then offers copy, the OS share sheet (when available) and revoke. The link is
 * a frozen snapshot served publicly — revoking makes it 404.
 */
export function ShareButton({
  scope,
  attemptId,
  onUnauthorized,
}: {
  scope: SharePayload["scope"];
  attemptId?: string;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<ShareLinkOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  async function openAndCreate() {
    setOpen(true);
    setCreating(true);
    setError(null);
    setCopied(false);
    setRevoked(false);
    try {
      setLink(await createShareLink({ scope, ...(attemptId ? { attempt_id: attemptId } : {}) }));
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't create the link. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the URL is selectable in the field as a fallback.
    }
  }

  async function nativeShare() {
    if (!link) return;
    try {
      await navigator.share?.({
        title:
          scope === "dashboard"
            ? "My dMAT performance report"
            : scope === "leaderboard"
              ? "My dMAT leaderboard rank"
              : "My dMAT mock result",
        url: link.url,
      });
    } catch {
      // User dismissed the sheet — nothing to do.
    }
  }

  async function revoke() {
    if (!link) return;
    try {
      await revokeShareLink(link.token);
      setRevoked(true);
    } catch (err) {
      if (err instanceof ApiError && err.unauthorized) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't revoke the link.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openAndCreate()}
        className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-hairline bg-surface-card px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface print:hidden"
      >
        <Share2 className="size-3.5" strokeWidth={2} aria-hidden="true" />
        Share
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Share this report" size="sm">
        <div className="px-6 pb-6 pt-3">
          {creating ? (
            <p role="status" className="py-4 text-[14px] text-ink-secondary">
              Creating your link…
            </p>
          ) : error ? (
            <p role="alert" className="py-2 text-[14px] text-error">
              {error}
            </p>
          ) : revoked ? (
            <p className="py-2 text-[14px] leading-relaxed text-ink-secondary">
              Link revoked — anyone opening it now sees &ldquo;unavailable&rdquo;.
            </p>
          ) : link ? (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-ink-secondary">
                Anyone with this link can view a snapshot of{" "}
                {scope === "dashboard"
                  ? "your report"
                  : scope === "leaderboard"
                    ? "your leaderboard standing"
                    : "this result"}{" "}
                — no login needed. It won&apos;t update as you take more mocks.
              </p>

              <div className="flex items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-fill/[0.1] text-brand">
                  <Link2 className="size-4" strokeWidth={2} aria-hidden="true" />
                </span>
                <input
                  readOnly
                  value={link.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 w-full min-w-0 rounded-[10px] border border-hairline bg-surface-field px-3 text-[13px] text-ink"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Button type="button" onClick={() => void copy()} className="h-11 text-[15px]">
                    <span className="flex items-center justify-center gap-1.5">
                      {copied ? (
                        <>
                          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" strokeWidth={2} aria-hidden="true" />
                          Copy link
                        </>
                      )}
                    </span>
                  </Button>
                </div>
                {typeof navigator !== "undefined" && "share" in navigator ? (
                  <button
                    type="button"
                    onClick={() => void nativeShare()}
                    className="h-11 flex-1 rounded-[12px] border border-hairline bg-surface-field text-[15px] font-medium text-ink transition-colors hover:bg-surface"
                  >
                    Share…
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-3 text-[12px] text-ink-secondary">
                <span>
                  {link.expires_at ? `Expires ${formatDate(link.expires_at)}` : "No expiry"}
                </span>
                <button
                  type="button"
                  onClick={() => void revoke()}
                  className="font-medium text-error transition-opacity hover:opacity-70"
                >
                  Revoke link
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
