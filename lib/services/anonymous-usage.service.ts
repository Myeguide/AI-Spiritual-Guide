import { prisma } from "@/lib/prisma";

export type AnonymousUsageStatus = {
  identifier: string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
};

export class AnonymousUsageService {
  static async getOrCreate(identifier: string) {
    return prisma.anonymousUsage.upsert({
      where: { identifier },
      create: { identifier },
      update: { lastUsedAt: new Date() },
    });
  }

  static async getStatus(
    identifier: string,
    limit: number = Number(process.env.ANON_FREE_QUESTION_LIMIT)
  ): Promise<AnonymousUsageStatus> {
    const row = await this.getOrCreate(identifier);
    const used = row.questionsUsed ?? 0;
    const remaining = Math.max(0, limit - used);
    return {
      identifier,
      limit,
      used,
      remaining,
      allowed: remaining > 0,
    };
  }

  static async increment(identifier: string) {
    return prisma.anonymousUsage.update({
      where: { identifier },
      data: {
        questionsUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }
}


