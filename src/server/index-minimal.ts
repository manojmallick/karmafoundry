// Minimal test handler
type DevvitRequestContext = any;

export default {
  async fetch(req: Request, ctx: DevvitRequestContext): Promise<Response> {
    console.log("=== MINIMAL HANDLER CALLED ===");
    console.log("URL:", req.url);
    console.log("Method:", req.method);
    
    const url = new URL(req.url);
    
    if (req.method === "POST" && url.pathname === "/internal/menu/post-create") {
      console.log("Menu handler hit!");
      
      try {
        const subredditName = ctx.subredditName ?? ctx?.reddit?.subredditName ?? ctx?.subreddit?.name;
        
        if (!subredditName) {
          return new Response("Missing subredditName", { status: 400 });
        }
        
        const post = await ctx.reddit.submitCustomPost({
          subredditName,
          title: "KarmaFoundry — Daily Forge",
          entry: "default"
        });
        
        console.log("Created post:", post);
        return Response.redirect(`https://www.reddit.com/${post.id}`, 302);
      } catch (e: any) {
        console.error("Error:", e);
        return new Response(`Error: ${e.message}`, { status: 500 });
      }
    }
    
    return new Response("Hello from minimal handler", { status: 200 });
  }
};
