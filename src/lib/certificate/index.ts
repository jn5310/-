/*
 * 이름 증서 PDF — 브라우저에서 만든다 (서버에 한글 폰트가 필요 없다).
 * 프리미엄 데이터(한자·풀이)는 결제한 풀이에만 내려오므로, 증서를 만들 수 있는 것도 결제한 사용자뿐이다.
 */
import { A4_LANDSCAPE_PT, createJpegPdf } from "./pdf";
import {
  loadCertificateFonts,
  renderCertificate,
  resolveCertificateFonts,
  type CertificateData,
} from "./render";

export type { CertificateData } from "./render";

const JPEG_QUALITY = 0.92;

export async function createCertificatePdf(
  data: CertificateData,
): Promise<Blob> {
  const fonts = resolveCertificateFonts();
  await loadCertificateFonts(fonts, data);

  const canvas = document.createElement("canvas");
  renderCertificate(canvas, data, fonts);
  const jpeg = await canvasToJpeg(canvas);

  const pdf = createJpegPdf({
    jpeg,
    widthPx: canvas.width,
    heightPx: canvas.height,
    pageWidthPt: A4_LANDSCAPE_PT.width,
    pageHeightPt: A4_LANDSCAPE_PT.height,
    title: `Korean Name Certificate — ${data.name.romanization}`,
    author: "K-Name Studio",
    subject: `${data.name.hangul} (${data.name.hanja}) · ${data.englishName}`,
    creationDate: data.issuedAt,
  });
  return new Blob([pdf], { type: "application/pdf" });
}

/** korean-name-certificate-kim-seo-yun.pdf */
export function getCertificateFileName(romanization: string): string {
  const slug = romanization
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `korean-name-certificate${slug ? `-${slug}` : ""}.pdf`;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The certificate could not be encoded."));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
