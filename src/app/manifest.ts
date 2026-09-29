import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_THEME_COLOR } from "@/lib/site";

/** /manifest.webmanifest — 홈 화면에 추가할 때의 이름·색·아이콘 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Korean names from your Saju`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: SITE_THEME_COLOR,
    theme_color: SITE_THEME_COLOR,
    lang: "en",
    categories: ["lifestyle", "education"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
