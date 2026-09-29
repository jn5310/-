import "server-only";

import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * 아주 작은 키-값 저장소 — 이름 풀이·결제 권한을 저장한다.
 *
 * - Upstash Redis(REST): UPSTASH_REDIS_REST_URL·UPSTASH_REDIS_REST_TOKEN(또는 Vercel KV의
 *   KV_REST_API_URL·KV_REST_API_TOKEN)이 있으면 쓴다. 서버리스 운영 환경은 이것이 필요하다.
 * - 파일(.data/kv): 그 밖의 경우. 로컬 개발(npm run dev)과 단일 서버(npm start)용이다.
 *
 * 값은 문자열, 만료(TTL)는 필수다 — 개인 정보가 담긴 풀이를 영원히 쌓아 두지 않는다.
 */

export interface SetOptions {
  ttlSeconds: number;
  /** true면 키가 없을 때만 쓴다 (Redis SET NX) — 결제 권한처럼 처음 한 번만 기록할 값에 쓴다 */
  ifAbsent?: boolean;
}

export interface KeyValueStore {
  readonly kind: "file" | "upstash";
  get(key: string): Promise<string | null>;
  /** @returns 저장했으면 true, ifAbsent인데 이미 값이 있으면 false */
  set(key: string, value: string, options: SetOptions): Promise<boolean>;
}

export class StorageError extends Error {
  constructor(
    /** configuration: 설정이 빠짐(500) · unavailable: 저장소 일시 오류 */
    readonly kind: "configuration" | "unavailable",
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "StorageError";
  }
}

/** 우리가 만드는 키만 허용한다: "reading:abc…" 처럼 접두어 + 영숫자·_·- */
const KEY_PATTERN = /^[a-z]+:[A-Za-z0-9_-]{8,200}$/;

function assertKey(key: string) {
  if (!KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${key}`);
}

// ─── 파일 저장소 ─────────────────────────────────────────────

interface FileEntry {
  value: string;
  /** 만료 시각 (epoch ms) */
  expiresAt: number;
}

export class FileKeyValueStore implements KeyValueStore {
  readonly kind = "file" as const;

  constructor(private readonly directory: string) {}

  /**
   * 파일 이름은 키를 16진수로 바꿔 만든다 — 경로 조작(../)을 막고, 대소문자를 구분하지 않는
   * 파일 시스템(Windows·macOS)에서도 서로 다른 키가 같은 파일이 되지 않는다.
   */
  private fileFor(key: string): string {
    assertKey(key);
    return path.join(
      this.directory,
      `${Buffer.from(key).toString("hex")}.json`,
    );
  }

  async get(key: string): Promise<string | null> {
    const file = this.fileFor(key);
    const entry = await this.read(file);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      await unlink(file).catch(() => {});
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options: SetOptions): Promise<boolean> {
    const file = this.fileFor(key);
    const data = JSON.stringify({
      value,
      expiresAt: Date.now() + options.ttlSeconds * 1000,
    } satisfies FileEntry);

    try {
      await mkdir(this.directory, { recursive: true });
      if (options.ifAbsent) return await this.create(file, data);

      // 임시 파일에 쓴 뒤 이름을 바꿔, 읽는 쪽이 반쯤 쓴 파일을 보지 않게 한다
      const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, data, "utf8");
      await rename(temporary, file);
      return true;
    } catch (error) {
      throw new StorageError("unavailable", `File store write failed: ${key}`, {
        cause: error,
      });
    }
  }

  /** 없을 때만 만든다 — "wx" 플래그는 파일이 있으면 실패하는 원자적 생성이다 */
  private async create(file: string, data: string): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await writeFile(file, data, { encoding: "utf8", flag: "wx" });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const existing = await this.read(file);
        // 만료된 값이면 지우고 한 번 더 시도한다
        if (existing && existing.expiresAt > Date.now()) return false;
        await unlink(file).catch(() => {});
      }
    }
    return false;
  }

  private async read(file: string): Promise<FileEntry | null> {
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new StorageError("unavailable", "File store read failed", {
        cause: error,
      });
    }
    try {
      const entry = JSON.parse(text) as Partial<FileEntry>;
      return typeof entry.value === "string" &&
        typeof entry.expiresAt === "number"
        ? (entry as FileEntry)
        : null;
    } catch {
      return null; // 손상된 파일은 없는 것으로 본다
    }
  }
}

// ─── Upstash Redis (REST) ────────────────────────────────────

const UPSTASH_TIMEOUT_MS = 5_000;

export class UpstashKeyValueStore implements KeyValueStore {
  readonly kind = "upstash" as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  /** Upstash REST: 명령을 JSON 배열로 POST한다 — 예) ["SET","k","v","EX",60,"NX"] */
  private async command(args: (string | number)[]): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      });
    } catch (error) {
      throw new StorageError("unavailable", "Upstash request failed", {
        cause: error,
      });
    }

    const body = (await response.json().catch(() => null)) as {
      result?: unknown;
      error?: string;
    } | null;
    if (!response.ok || !body || body.error) {
      const detail = body?.error ?? `HTTP ${response.status}`;
      // 401·403은 토큰 문제 — 다시 해도 낫지 않는다
      throw new StorageError(
        response.status === 401 || response.status === 403
          ? "configuration"
          : "unavailable",
        `Upstash error: ${detail}`,
      );
    }
    return body.result;
  }

  async get(key: string): Promise<string | null> {
    assertKey(key);
    const result = await this.command(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  async set(key: string, value: string, options: SetOptions): Promise<boolean> {
    assertKey(key);
    const result = await this.command([
      "SET",
      key,
      value,
      "EX",
      Math.max(1, Math.round(options.ttlSeconds)),
      ...(options.ifAbsent ? ["NX"] : []),
    ]);
    return result === "OK";
  }
}

// ─── 선택 ────────────────────────────────────────────────────

let cached: { signature: string; store: KeyValueStore } | null = null;

/**
 * 환경 변수에 맞는 저장소를 고른다.
 * Vercel 같은 서버리스 환경에서 Upstash 설정이 없으면 파일 저장소로 조용히 넘어가지 않고 오류를 낸다 —
 * 인스턴스마다 파일이 따로 있어 결제한 풀이가 열리지 않는 사고를 막기 위해서다.
 */
export function getKeyValueStore(
  env: Record<string, string | undefined> = process.env,
): KeyValueStore {
  const url = (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  const directory = path.resolve(
    env.READING_STORE_DIR?.trim() || path.join(process.cwd(), ".data", "kv"),
  );

  const signature =
    url && token ? `upstash|${url}|${token}` : `file|${directory}`;
  if (cached?.signature === signature) return cached.store;

  let store: KeyValueStore;
  if (url && token) {
    store = new UpstashKeyValueStore(url.replace(/\/+$/, ""), token);
  } else if (url || token) {
    throw new StorageError(
      "configuration",
      "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  } else if (env.VERCEL) {
    throw new StorageError(
      "configuration",
      "Serverless deployments need a shared store: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  } else {
    store = new FileKeyValueStore(directory);
  }

  cached = { signature, store };
  return store;
}
