"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/app/Modal";

/**
 * The one gate for "start a test". Tests are not live yet, so every Start / Take /
 * Attempt / Resume CTA — in any section, for any mock, regardless of is_playable —
 * opens this instead of a test player. There is deliberately no navigation here.
 */
export function ComingSoonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <div
          aria-hidden="true"
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
        >
          <Rocket className="size-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
          Mock tests are on the way
        </h2>
        <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-ink-secondary">
          We&apos;re putting the finishing touches on the test experience. You&apos;ll be notified
          the moment it goes live.
        </p>
        <div className="mt-6 w-full">
          <Button type="button" onClick={onClose} autoFocus>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}
