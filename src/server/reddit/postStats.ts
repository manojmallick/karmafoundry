export async function getPostStats(ctx: any, postId: string): Promise<{ commentCount: number; score: number }> {
  // Devvit 0.12 Reddit API pattern
  try {
    const post = await ctx.reddit?.getPost?.(postId);
    return {
      commentCount: post?.num_comments ?? post?.numberOfComments ?? 0,
      score: post?.score ?? 0,
    };
  } catch (error) {
    console.error("Error fetching post stats:", error);
    return { commentCount: 0, score: 0 };
  }
}
