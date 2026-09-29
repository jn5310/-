import { pdf } from "@react-pdf/renderer";

import {
  collectCertificateCharacters,
  type CertificateContent,
  type CertificateInput,
} from "@/lib/certificate/content";
import { createKoreanSealBlob } from "@/lib/seal";

import { CertificateDocument } from "./certificate-document";
import { loadCertificateFonts } from "./certificate-fonts";

/** 폰트를 받지 못하는 등으로 멈춰 버리면 캔버스 방식으로 넘어가도록 상한을 둔다 */
const RENDER_TIMEOUT_MS = 30_000;
/** 도장 PNG 해상도 — 증명서에서 약 66pt(2.3cm)로 찍히므로 인쇄해도 선명하다 */
const SEAL_SIZE = 720;

/** react-pdf로 벡터 PDF를 만든다 (글자가 선택·검색되고 확대해도 선명하다) */
export async function renderVectorCertificate(
  content: CertificateContent,
  seal: CertificateInput["seal"],
): Promise<Blob> {
  const [fonts, sealPng] = await Promise.all([
    loadCertificateFonts(collectCertificateCharacters(content)),
    createKoreanSealBlob(content.hangul, {
      font: seal.font,
      shape: seal.shape,
      size: SEAL_SIZE,
    })
      .then(({ blob }) => blob)
      // 도장을 못 그려도 증명서는 내려준다
      .catch(() => null),
  ]);

  const document = (
    <CertificateDocument content={content} fonts={fonts} seal={sealPng} />
  );
  return withTimeout(pdf(document).toBlob(), RENDER_TIMEOUT_MS);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Certificate PDF timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
