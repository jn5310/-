"use client";

import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

import { LinkIcon, ShareIcon } from "./share-icons";
import { useShareActions, type ShareContentType } from "./use-share-actions";

/** 자동 복사가 막혔을 때 보여 주는 링크 입력칸 — 누르면 전체가 선택된다 */
export function ShareLinkField({ url }: { url: string }) {
  return (
    <label className="flex w-full max-w-md flex-col gap-1.5 text-left text-sm font-medium text-ink-soft">
      Share link
      <input
        type="url"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className={cn(inputClass, "py-2.5 text-sm")}
      />
    </label>
  );
}

interface ShareLinkActionsProps {
  title: string;
  /** 링크 앞에 붙는 글 */
  text: string;
  url: string;
  contentType: ShareContentType;
  className?: string;
}

/** 공유하기 + 링크 복사 (이미지 없이 글과 링크만) */
export function ShareLinkActions({
  title,
  text,
  url,
  contentType,
  className,
}: ShareLinkActionsProps) {
  const { toast, linkVisible, share, copyLink } = useShareActions(contentType);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void share({ title, text, url })}
          className={primaryButtonClass}
        >
          <ShareIcon />
          Share
          <span
            aria-hidden="true"
            lang="ko"
            className="font-serif font-normal text-hanji/60"
          >
            공유하기
          </span>
        </button>
        <button
          type="button"
          onClick={() => void copyLink(url)}
          className={secondaryButtonClass}
        >
          <LinkIcon />
          Copy link
          <span
            aria-hidden="true"
            lang="ko"
            className="font-serif font-normal text-ink-muted"
          >
            링크 복사
          </span>
        </button>
      </div>
      {linkVisible ? <ShareLinkField url={url} /> : null}
      <Toast toast={toast} />
    </div>
  );
}
