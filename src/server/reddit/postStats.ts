import { reddit } from "@devvit/reddit";

export async function getPostStats(postId: string): Promise<{ commentCount: number; score: number }> {
  // Devvit 0.12 Reddit API pattern
  try {
    const post = await reddit.getPostById(postId as any);
    return {
      commentCount: (post as any)?.num_comments ?? (post as any)?.numberOfComments ?? 0,
      score: (post as any)?.score ?? 0,
    };
  } catch (error) {
    console.error("[KF] Error fetching post stats:", error);
    return { commentCount: 0, score: 0 };
  }
}
