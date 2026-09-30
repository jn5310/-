"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SEAL_FONTS, type SealFontId } from "@/components/seal/seal-fonts";
import {
  DownloadIcon,
  LinkIcon,
  ShareIcon,
} from "@/components/share/share-icons";
import { ShareLinkField } from "@/components/share/share-link-actions";
import { useShareActions } from "@/components/share/use-share-actions";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import { Toast } from "@/components/ui/toast";
import { useClientValue } from "@/hooks/use-client-value";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/cn";
import {
  blobToDataUrl,
  loadNameCardFontCss,
  nameCardFileName,
  renderNameCardPng,
} from "@/lib/name-card/capture";
import {
  NAME_CARD_EXPORT_SCALE,
  NAME_CARD_HEIGHT,
  NAME_CARD_WIDTH,
} from "@/lib/name-card/constants";
import { createKoreanSealBlob, downloadBlob, type SealShape } from "@/lib/seal";
import {
  buildShareUrl,
  canUseWebShare,
  displayHost,
  isInAppBrowser,
  isIosDevice,
  nameShareText,
} from "@/lib/share";
import type { GeneratedName } from "@/types/api";
import type { FiveElement, SajuReading } from "@/types/saju";

import { NameCard } from "./name-card";

/*
 * 이름 카드 패널 — 카드 미리보기 + 이미지 저장 · 공유하기 · 링크 복사.
 *
 * - 패널이 화면 가까이 오면 도장을 그리고, 카드를 PNG로 미리 만들어 둔다. 사파리는 클릭 뒤 비동기 작업을
 *   거친 공유를 막아서, 공유 버튼은 준비된 이미지를 바로 건넨다 (Web Share가 있는 기기에서는 준비될 때까지 기다린다).
 * - 카카오톡 · 인스타그램 같은 앱 안 브라우저는 파일 내려받기를 막는 일이 많아, 이미지를 크게 띄워 길게 눌러 저장하게 한다.
 * - 공유 링크는 개인 풀이 주소가 아니라 사이트 첫 화면이다 (lib/share.ts).
 */

const SEAL_IMAGE_SIZE = 384;
/** 도장 모양·이름을 연달아 바꿀 때 매번 그리지 않도록 잠시 기다린다 */
const PRERENDER_DELAY_MS = 350;
/** 이보다 오래 걸리면 실패로 보고 공유는 링크만 보낸다 */
const RENDER_TIMEOUT_MS = 20_000;
const SHARE_CAMPAIGN = "name_card";
const EXPORT_SIZE = `${NAME_CARD_WIDTH * NAME_CARD_EXPORT_SCALE} × ${NAME_CARD_HEIGHT * NAME_CARD_EXPORT_SCALE}`;

const detectInAppBrowser = () => isInAppBrowser(navigator.userAgent);

interface SealImage {
  key: string;
  hangul: string;
  /** 도장 PNG data URL — 그리지 못했으면 null (도장 없이 카드를 만든다) */
  src: string | null;
}

interface CardImage {
  key: string;
  /** 만들지 못했으면 null */
  blob: Blob | null;
}

export interface NameCardPanelProps {
  name: GeneratedName;
  favorableElements: FiveElement[];
  saju: SajuReading;
  /** 위에서 고른 도장 모양 · 서체 — 카드의 도장도 같게 그린다 */
  sealShape: SealShape;
  sealFont: SealFontId;
  /** 공유 링크와 카드에 적는 사이트 주소 (서버의 getSiteUrl) */
  siteUrl: string;
}

export function NameCardPanel({
  name,
  favorableElements,
  saju,
  sealShape,
  sealFont,
  siteUrl,
}: NameCardPanelProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pending = useRef<{ key: string; promise: Promise<Blob> } | null>(null);

  const [armed, setArmed] = useState(false);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [seal, setSeal] = useState<SealImage | null>(null);
  const [image, setImage] = useState<CardImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const { toast, show, linkVisible, share, copyLink } =
    useShareActions("name_card");
  const webShare = useClientValue(canUseWebShare, false);
  const inApp = useClientValue(detectInAppBrowser, false);

  const siteHost = displayHost(siteUrl);
  const shareUrl = buildShareUrl(siteUrl, SHARE_CAMPAIGN);
  const fileName = nameCardFileName(name.romanization);
  const { hangul } = name;

  const sealKey = [hangul, sealShape, sealFont].join("|");
  // 도장을 새로 그리는 동안에는 같은 이름의 이전 도장을 그대로 보여 준다 (깜박임 방지)
  const sealSrc = seal !== null && seal.hangul === hangul ? seal.src : null;
  // 카드 그림을 바꾸는 값을 모두 담은 열쇠 — 도장이 준비된 뒤에만 이미지를 만든다
  const renderKey =
    seal?.key === sealKey
      ? [
          sealKey,
          name.hanja,
          name.romanization,
          name.summary,
          name.characters.map((character) => character.meaning).join("/"),
          favorableElements.join(","),
          siteHost,
        ].join("|")
      : null;
  const current = image !== null && image.key === renderKey ? image : null;
  const imageKey = image?.key ?? null;
  const scale =
    frameWidth === null ? 1 : Math.min(1, frameWidth / NAME_CARD_WIDTH);

  // 화면의 카드 → PNG. 같은 열쇠로 이미 만드는 중이면 그 결과를 기다린다
  const renderCard = useCallback((key: string): Promise<Blob> => {
    const running = pending.current;
    if (running?.key === key) return running.promise;
    const node = cardRef.current;
    if (!node) return Promise.reject(new Error("The name card is not ready."));

    const promise = withTimeout(
      loadNameCardFontCss(node.textContent ?? "")
        .catch((error: unknown) => {
          // 폰트를 받지 못하면 기기 글꼴로 그린다
          console.warn("[NameCardPanel] card fonts unavailable", error);
          return null;
        })
        .then((fontCss) => renderNameCardPng(node, { fontCss })),
      RENDER_TIMEOUT_MS,
    );
    pending.current = { key, promise };
    // 실패하면 다음에 다시 만들 수 있게 비운다
    promise.catch(() => {
      if (pending.current?.promise === promise) pending.current = null;
    });
    return promise;
  }, []);

  // 패널이 화면 가까이 오면 준비를 시작한다 (결과 화면을 열자마자 무거운 작업을 하지 않게)
  useEffect(() => {
    if (armed) return;
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setArmed(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setArmed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [armed]);

  // 좁은 화면에서는 카드를 통째로 줄여 보여 준다 (이미지는 늘 원래 크기로 만든다)
  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // 도장 — 위에서 고른 모양·서체로
  useEffect(() => {
    if (!armed) return;
    let cancelled = false;
    createKoreanSealBlob(hangul, {
      font: SEAL_FONTS[sealFont].font,
      shape: sealShape,
      size: SEAL_IMAGE_SIZE,
    })
      .then(({ blob }) => blobToDataUrl(blob))
      .then(
        (src) => {
          if (!cancelled) setSeal({ key: sealKey, hangul, src });
        },
        (error: unknown) => {
          console.error("[NameCardPanel] seal failed", error);
          if (!cancelled) setSeal({ key: sealKey, hangul, src: null });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [armed, sealKey, hangul, sealShape, sealFont]);

  // 카드 이미지를 미리 만든다
  useEffect(() => {
    if (!armed || renderKey === null || imageKey === renderKey) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      renderCard(renderKey).then(
        (blob) => {
          if (!cancelled) setImage({ key: renderKey, blob });
        },
        (error: unknown) => {
          console.error("[NameCardPanel] card image failed", error);
          if (!cancelled) setImage({ key: renderKey, blob: null });
        },
      );
    }, PRERENDER_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [armed, renderKey, imageKey, renderCard]);

  // 앱 안 브라우저: 저장 대신 이미지를 크게 띄운다
  useEffect(() => {
    const dialog = dialogRef.current;
    if (preview === null || !dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, [preview]);

  // 미리 만든 이미지가 없을 때 (아직 만드는 중이거나 실패했을 때) 지금 만든다
  const prepareImage = async (key: string): Promise<Blob | null> => {
    setSaving(true);
    try {
      const blob = await renderCard(key);
      setImage({ key, blob });
      return blob;
    } catch (error) {
      console.error("[NameCardPanel] save failed", error);
      show("The image couldn’t be created. Please try again.", "error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (renderKey === null || saving) return;
    const blob = current?.blob ?? (await prepareImage(renderKey));
    if (!blob) return;

    if (isInAppBrowser(navigator.userAgent)) {
      setPreview(await blobToDataUrl(blob));
      trackEvent(ANALYTICS_EVENTS.nameCardDownload, { method: "preview" });
      return;
    }
    downloadBlob(blob, fileName);
    trackEvent(ANALYTICS_EVENTS.nameCardDownload, { method: "download" });
    show(
      isIosDevice(navigator.userAgent, navigator.maxTouchPoints)
        ? "Saved to the Files app — tip: Share › Save Image adds it to Photos."
        : "Image saved — check your downloads.",
    );
  };

  // 준비된 이미지를 바로 건넨다 — 여기서 await를 거치면 사파리가 공유를 막는다
  const handleShare = () => {
    const blob = current?.blob ?? null;
    void share({
      title: `${hangul} (${name.romanization}) — my Korean name`,
      text: nameShareText(name),
      url: shareUrl,
      files: blob
        ? [new File([blob], fileName, { type: "image/png" })]
        : undefined,
    });
  };

  const shareWaiting = webShare && current === null;
  const imageState =
    current === null ? "pending" : current.blob ? "ready" : "failed";

  return (
    <section
      ref={sectionRef}
      id="name-card"
      aria-labelledby="name-card-title"
      data-name-card-image={imageState}
      className="grid items-center gap-8 rounded-[2rem] border border-ink/10 bg-white/60 p-6 shadow-xl shadow-ink/5 sm:p-8 lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:gap-12 lg:p-10"
    >
      <div ref={frameRef} className="mx-auto w-full max-w-[22.5rem]">
        <div
          className="overflow-hidden rounded-md shadow-2xl ring-1 shadow-ink/15 ring-ink/10"
          style={{ height: NAME_CARD_HEIGHT * scale }}
        >
          <div
            style={{
              width: NAME_CARD_WIDTH,
              height: NAME_CARD_HEIGHT,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          >
            <NameCard
              ref={cardRef}
              name={name}
              favorableElements={favorableElements}
              saju={saju}
              sealSrc={sealSrc}
              siteHost={siteHost}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow hangul="이름 카드">Name card</Eyebrow>
          <h2
            id="name-card-title"
            className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            Share your Korean name
          </h2>
          <p className="max-w-xl leading-relaxed text-ink-soft">
            Your name, its Hanja, your Saju elements and your seal on one card.
            Save it for Instagram or KakaoTalk, or share it — friends can
            discover their own Korean name from the link.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={renderKey === null || saving}
            aria-busy={saving || undefined}
            className={cn(primaryButtonClass, "disabled:cursor-wait")}
          >
            <DownloadIcon />
            {saving ? "Preparing image…" : "Save as Image"}
            <span
              aria-hidden="true"
              lang="ko"
              className="font-serif font-normal text-hanji/60"
            >
              이미지 저장
            </span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={shareWaiting}
            aria-busy={shareWaiting || undefined}
            className={cn(
              secondaryButtonClass,
              "disabled:cursor-wait disabled:opacity-60",
            )}
          >
            <ShareIcon />
            {shareWaiting ? "Preparing…" : "Share"}
            <span
              aria-hidden="true"
              lang="ko"
              className="font-serif font-normal text-ink-muted"
            >
              공유하기
            </span>
          </button>
          <button
            type="button"
            onClick={() => void copyLink(shareUrl)}
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

        {linkVisible ? <ShareLinkField url={shareUrl} /> : null}

        <p className="text-sm leading-relaxed text-ink-muted">
          {imageState === "failed"
            ? "The image couldn’t be prepared — you can still share the link."
            : `PNG · ${EXPORT_SIZE} px, sized for Instagram, KakaoTalk and X.`}
          {inApp
            ? " In an app’s browser, tap Save as Image, then press and hold the picture to keep it."
            : null}
        </p>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="name-card-preview-title"
        onClose={() => setPreview(null)}
        onClick={(event) => {
          // 바깥(배경)을 누르면 닫는다
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-ink/10 bg-hanji p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <h3
              id="name-card-preview-title"
              className="font-serif text-lg font-semibold"
            >
              Save your name card
            </h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-m-1 rounded-full px-3 py-1 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 focus-visible:ring-4 focus-visible:ring-ink/10 focus-visible:outline-hidden"
            >
              Close
            </button>
          </div>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- 길게 눌러 저장하는 data URL 이미지 (최적화 대상이 아니다)
            <img
              src={preview}
              alt={`Name card for ${hangul} (${name.romanization})`}
              width={NAME_CARD_WIDTH * NAME_CARD_EXPORT_SCALE}
              height={NAME_CARD_HEIGHT * NAME_CARD_EXPORT_SCALE}
              className="mx-auto h-auto max-h-[62dvh] w-auto max-w-full rounded-md shadow-lg"
            />
          ) : null}
          <p className="text-sm leading-relaxed text-ink-soft">
            Press and hold the image, then choose{" "}
            <strong className="text-ink">Save image</strong> or{" "}
            <strong className="text-ink">Add to Photos</strong>. This app’s
            browser can’t download files directly.
          </p>
        </div>
      </dialog>

      <Toast toast={toast} />
    </section>
  );
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("The name card took too long to render.")),
      milliseconds,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
