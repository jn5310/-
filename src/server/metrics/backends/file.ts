import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  Counters,
  DailyMetrics,
  MetricsBackend,
  PaymentQuery,
  PaymentRecord,
} from "../types";

/*
 * 로컬 개발용 지표 저장소 — JSON 파일 하나 (.data/metrics.json).
 * 한 프로세스 안에서 쓰기를 차례로 줄 세워 겹쳐 쓰지 않는다. 서버리스 운영에는 쓰지 않는다.
 */

interface FileData {
  daily: Record<string, { counters: Counters; visitors: string[] }>;
  payments: PaymentRecord[];
}

/** 하루 방문자 해시를 너무 많이 쌓지 않는다 (개발용) */
const MAX_VISITORS_PER_DAY = 50_000;

export class FileMetricsBackend implements MetricsBackend {
  readonly kind = "file" as const;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  async record(
    day: string,
    counters: Counters,
    visitorHash?: string,
  ): Promise<void> {
    await this.mutate((data) => addCounters(data, day, counters, visitorHash));
  }

  async appendPayment(
    record: PaymentRecord,
    day: string,
    counters: Counters,
  ): Promise<"recorded" | "duplicate"> {
    let outcome: "recorded" | "duplicate" = "duplicate";
    await this.mutate((data) => {
      if (
        data.payments.some(
          (payment) => payment.checkoutSessionId === record.checkoutSessionId,
        )
      ) {
        return;
      }
      data.payments.push(record);
      addCounters(data, day, counters);
      outcome = "recorded";
    });
    return outcome;
  }

  async readDaily(days: string[]): Promise<DailyMetrics[]> {
    const data = await this.load();
    return days.map((day) => ({
      day,
      visitors: data.daily[day]?.visitors.length ?? 0,
      counters: { ...(data.daily[day]?.counters ?? {}) },
    }));
  }

  async readPayments({
    limit,
    from,
    to,
  }: PaymentQuery): Promise<PaymentRecord[]> {
    const data = await this.load();
    return data.payments
      .filter((payment) => {
        const day = payment.recordedAt.slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
      })
      .slice(-limit)
      .reverse();
  }

  private mutate(change: (data: FileData) => void): Promise<void> {
    const next = this.queue.then(async () => {
      const data = await this.load();
      change(data);
      await this.save(data);
    });
    this.queue = next.catch(() => {});
    return next;
  }

  private async load(): Promise<FileData> {
    let text: string;
    try {
      text = await readFile(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { daily: {}, payments: [] };
      }
      throw error;
    }
    // 손상된 파일을 빈 값으로 덮어써 기록을 잃지 않도록, 읽지 못하면 오류를 낸다
    const parsed = JSON.parse(text) as Partial<FileData>;
    return { daily: parsed.daily ?? {}, payments: parsed.payments ?? [] };
  }

  private async save(data: FileData): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, JSON.stringify(data), "utf8");
    await rename(temporary, this.file);
  }
}

function addCounters(
  data: FileData,
  day: string,
  counters: Counters,
  visitorHash?: string,
): void {
  const entry = (data.daily[day] ??= { counters: {}, visitors: [] });
  for (const [key, value] of Object.entries(counters)) {
    entry.counters[key] = (entry.counters[key] ?? 0) + value;
  }
  if (
    visitorHash &&
    entry.visitors.length < MAX_VISITORS_PER_DAY &&
    !entry.visitors.includes(visitorHash)
  ) {
    entry.visitors.push(visitorHash);
  }
}
