import { RateLimiterPrisma } from "rate-limiter-flexible";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_POINTS = 10000;
const DURATION = 30 * 24 * 60 * 60;
const GENERATION_COST = 1;

export async function getUsageTracker() {
  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: ADMIN_POINTS,
    duration: DURATION,
  });

  return usageTracker;
}

export async function consumeCredits() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(session.userId, GENERATION_COST);
  return result;
}

export async function getUsageStatus() {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(session.userId);
  return result;
}
