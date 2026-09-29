#!/usr/bin/env node
/**
 * 한자 음(音) 표 생성기 — Unicode Unihan 데이터(kHangul)로 src/server/name-generation/hanja-readings.ts를 만든다.
 *
 *   node scripts/generate-hanja-readings.mjs path/to/kHangul.txt
 *
 * kHangul.txt: https://github.com/unicode-org/unicodetools/tree/main/unicodetools/data/ucd/dev/Unihan
 * 각 줄 "4E01\t정:0N" — 코드포인트, 한글 음:출처. 출처의 E는 한문 교육용 기초 한자, N은 인명용 한자다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error(
    "usage: node scripts/generate-hanja-readings.mjs <kHangul.txt>",
  );
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "src/server/name-generation/hanja-readings.ts");

/** @type {Map<string, { readings: Set<string>, forNames: boolean }>} */
const table = new Map();

for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [codePoint, values] = line.split("\t");
  // 호환 한자(U+F900대)는 NFC로 통합 한자에 합친다 — 앱도 입력을 NFC로 정규화한다
  const hanja = String.fromCodePoint(parseInt(codePoint, 16)).normalize("NFC");
  const entry = table.get(hanja) ?? { readings: new Set(), forNames: false };
  for (const value of values.trim().split(/\s+/)) {
    const [reading, sources = ""] = value.split(":");
    entry.readings.add(reading);
    if (/[EN]/.test(sources)) entry.forNames = true;
  }
  table.set(hanja, entry);
}

const entries = [...table]
  .sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0))
  .map(
    ([hanja, { readings, forNames }]) =>
      `${forNames ? "+" : ""}${hanja}${[...readings].join("")}`,
  );

const header = `/*
 * 자동 생성 파일 — 직접 고치지 말고 scripts/generate-hanja-readings.mjs로 다시 만든다.
 * 원본: Unicode Unihan 데이터베이스 kHangul (${entries.length}자)
 *
 * 형식: "|"로 나눈 항목마다 [+]한자읽기… — 예) "+李리이"
 * - 읽기는 두음법칙에 따른 음(리/이, 림/임)까지 모두 담는다.
 * - "+"는 인명에 쓸 수 있는 글자(한문 교육용 기초 한자 E 또는 인명용 한자 N)다.
 *
 * UNICODE LICENSE V3 — Copyright © 1991-2025 Unicode, Inc.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of data files and any
 * associated documentation (the "Data Files") or software and any associated documentation (the
 * "Software") to deal in the Data Files or Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, and/or sell copies of the Data Files or
 * Software, and to permit persons to whom the Data Files or Software are furnished to do so, provided
 * that either (a) this copyright and permission notice appear with all copies of the Data Files or
 * Software, or (b) this copyright and permission notice appear in associated Documentation.
 * THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT OF THIRD PARTY RIGHTS. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN
 * THIS NOTICE BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES, OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
 * OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
 * FILES OR SOFTWARE. Except as contained in this notice, the name of a copyright holder shall not be
 * used in advertising or otherwise to promote the sale, use or other dealings in these Data Files or
 * Software without prior written authorization of the copyright holder.
 */
`;

writeFileSync(
  output,
  `${header}\nexport const HANJA_READINGS_DATA =\n  "${entries.join("|")}";\n`,
);
console.log(`wrote ${entries.length} entries → ${output}`);
