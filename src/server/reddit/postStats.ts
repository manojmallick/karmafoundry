import { reddit } from "@devvit/reddit";

export async function getPostStats(postId: string): Promise<{ commentCount: number; score: number; ok: boolean }> {
  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    const commentCount = post.numberOfComments ?? 0;
    const score = post.score ?? 0;
    console.log(`[KF] getPostStats(${postId}): comments=${commentCount}, score=${score}`);
    return { commentCount, score, ok: true };
  } catch (error) {
    console.error("[KF] Error fetching post stats:", error);
    return { commentCount: 0, score: 0, ok: false };
  }
}
