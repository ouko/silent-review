import Redis from "ioredis";
import { env } from "./config/index.js";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(env.REDIS_URL);
    return redis;
  } catch {
    return null;
  }
}
