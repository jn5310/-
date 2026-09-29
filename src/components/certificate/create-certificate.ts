import {
  buildCertificateContent,
  getCertificateFileName,
  type CertificateInput,
} from "@/lib/certificate/content";

export interface CertificateFile {
  blob: Blob;
  fileName: string;
  /** vector: react-pdf(글자 선택 가능) · raster: 캔버스 그림을 담은 대체 PDF */
  renderer: "vector" | "raster";
}

/**
 * 공식 한국어 이름 증명서 PDF를 브라우저에서 바로 만든다.
 *
 * 1. react-pdf로 벡터 PDF를 만든다 — 한글 폰트 서브셋은 /api/fonts/subset에서 받는다.
 * 2. 폰트 서버가 응답하지 않는 등으로 실패하면, 페이지에 이미 올라온 웹 폰트로 캔버스에 그려
 *    이미지 PDF로 대신 만든다. 어느 쪽이든 결제한 사용자는 증명서를 받는다.
 *
 * 두 렌더러 모두 필요할 때만 불러온다 (react-pdf는 수백 KB라 결과 화면을 무겁게 하지 않도록).
 */
export async function createCertificate(
  input: CertificateInput,
): Promise<CertificateFile> {
  const content = buildCertificateContent(input);
  const fileName = getCertificateFileName(content.romanization);

  try {
    const { renderVectorCertificate } = await import("./render-vector");
    const blob = await renderVectorCertificate(content, input.seal);
    return { blob, fileName, renderer: "vector" };
  } catch (error) {
    console.warn(
      "[certificate] vector PDF failed — using the canvas fallback",
      error,
    );
    const { createRasterCertificatePdf } =
      await import("@/lib/certificate/raster");
    const blob = await createRasterCertificatePdf(content, input.seal);
    return { blob, fileName, renderer: "raster" };
  }
}
