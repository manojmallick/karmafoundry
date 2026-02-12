import { redis } from "@devvit/redis";

/**
 * KV wrapper over Devvit Redis that handles JSON serialization.
 * All kv/ops.ts functions expect kv.get() to return parsed objects
 * and kv.set() to accept objects. Redis stores strings.
 */
export const kv = {
  async get(key: string): Promise<any> {
    try {
      const raw = await redis.get(key);
      if (raw === undefined || raw === null) return undefined;
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  },

  async set(key: string, value: any): Promise<void> {
    await redis.set(key, JSON.stringify(value));
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch {
      // Key may not exist — safe to ignore
    }
  },
};
