"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/**
 * Renders question content authored in Markdown + LaTeX, with inline images.
 *
 * - `$…$` / `$$…$$` → KaTeX (remark-math + rehype-katex).
 * - GitHub tables (Latin Squares) → remark-gfm.
 * - Inline `![](data:image/png;base64,…)` figures render with no network.
 *
 * `urlTransform` is overridden to preserve `data:` URIs: react-markdown's default
 * sanitiser drops them, which would blank every Figure-Sequence image. Content
 * comes from our trusted backend and raw HTML is not enabled, so this is safe.
 */
export function QuestionContent({ md, className }: { md: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-[16px] leading-relaxed text-ink",
        // Tables (Latin Squares) — scroll inside their own box, never the page.
        "[&_table]:my-2 [&_table]:block [&_table]:w-fit [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
        "[&_th]:border [&_th]:border-hairline [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-center [&_th]:font-medium",
        "[&_td]:border [&_td]:border-hairline [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-center",
        "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_img]:my-2 [&_img]:inline-block [&_img]:max-w-full [&_code]:rounded [&_code]:bg-surface-field [&_code]:px-1 [&_code]:py-0.5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={(url) => url}
        components={{
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} className="max-w-full" alt={props.alt ?? ""} />
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
