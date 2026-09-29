/*
 * 의존성 없는 최소 PDF 작성기 — JPEG 한 장을 한 쪽 가득 채운 PDF 1.4 파일을 만든다.
 *
 * 증명서는 캔버스에 그린 그림이라 한글·한자 폰트를 PDF에 넣을 필요가 없다(글자는 이미지로 들어간다).
 * JPEG은 PDF가 그대로 담을 수 있는 형식(DCTDecode)이라 다시 압축하지 않는다.
 */

export interface JpegPdfOptions {
  /** 기준선 JPEG 바이트 (canvas.toBlob(..., "image/jpeg")) */
  jpeg: Uint8Array;
  /** JPEG 픽셀 크기 */
  widthPx: number;
  heightPx: number;
  /** 쪽 크기 (pt = 1/72인치). A4 가로 = 841.89 × 595.28 */
  pageWidthPt: number;
  pageHeightPt: number;
  title?: string;
  author?: string;
  subject?: string;
  creationDate?: Date;
}

export const A4_LANDSCAPE_PT = { width: 841.89, height: 595.28 } as const;

// 반환 타입은 추론에 맡긴다 — TS 5.7+에서 Uint8Array<ArrayBuffer>로 잡혀 Blob에 바로 넣을 수 있다
export function createJpegPdf(options: JpegPdfOptions) {
  const { jpeg, widthPx, heightPx } = options;
  const pageWidth = formatNumber(options.pageWidthPt);
  const pageHeight = formatNumber(options.pageHeightPt);
  const encoder = new TextEncoder();

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObject = (id: number) => {
    offsets[id] = length;
    write(`${id} 0 obj\n`);
  };

  // 머리글 + 이진 파일임을 알리는 주석(0x80 이상 바이트 4개)
  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  beginObject(1);
  write("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  write("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObject(3);
  write(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}]` +
      " /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >>" +
      " /Contents 5 0 R >>\nendobj\n",
  );

  beginObject(4);
  write(
    `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx}` +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode" +
      ` /Length ${jpeg.length} >>\nstream\n`,
  );
  write(jpeg);
  write("\nendstream\nendobj\n");

  // 이미지를 쪽 전체 크기로 늘려 그린다
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
  beginObject(5);
  write(
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`,
  );

  const info = [
    options.title ? `/Title ${pdfText(options.title)}` : "",
    options.author ? `/Author ${pdfText(options.author)}` : "",
    options.subject ? `/Subject ${pdfText(options.subject)}` : "",
    `/Creator ${pdfText("K-Name Studio")}`,
    `/Producer ${pdfText("K-Name Studio")}`,
    `/CreationDate (${pdfDate(options.creationDate ?? new Date())})`,
  ]
    .filter(Boolean)
    .join(" ");
  beginObject(6);
  write(`<< ${info} >>\nendobj\n`);

  // 교차 참조 표: 항목마다 정확히 20바이트 ("오프셋10자리 세대5자리 n" + 공백·줄바꿈)
  const xrefOffset = length;
  const objectCount = 7;
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectCount; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  write(xref);
  write(
    `trailer\n<< /Size ${objectCount} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const pdf = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, offset);
    offset += chunk.length;
  }
  return pdf;
}

/** 소수점 둘째 자리까지, 불필요한 0 없이 */
function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** 어떤 문자든 담을 수 있는 PDF 문자열 — UTF-16BE(BOM 포함) 16진수 표기 */
function pdfText(value: string): string {
  let hex = "FEFF";
  for (let index = 0; index < value.length; index++) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

/** D:YYYYMMDDHHmmSSZ (UTC) */
function pdfDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}
