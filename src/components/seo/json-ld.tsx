import { serializeJsonLd } from "@/lib/seo/structured-data";

/** 구조화 데이터(JSON-LD) 스크립트 — 서버에서 그려 HTML에 바로 들어간다 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
