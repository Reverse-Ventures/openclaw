/**
 * CMO Agent — Chief Marketing Officer
 * Orchestrates all other agents, reviews goals, self-heals
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "review";

    if (action === "review") {
      // Fetch all agent goals
      const { data: goals } = await supabase
        .from("cmo_agent_goals")
        .select("*")
        .eq("agent_key", "openclaw-cmo-agent");

      // Get recent agent logs
      const cutoff = new Date(Date.now() - 6 * 3600000).toISOString();
      const { data: logs } = await supabase
        .from("agent_logs")
        .select("agent_key, action, status, message, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(50);

      const analysis = await aiComplete(
        `You are the CMO of Reverse Ventures, an AI-powered patent and innovation platform.
         Review the agent performance data and provide actionable insights.`,
        `Goals: ${JSON.stringify(goals)}\n\nRecent logs: ${JSON.stringify(logs)}`,
        { maxTokens: 1500 }
      );

      // Log the review
      await supabase.from("cmo_hourly_reviews").insert({
        agent_key: "openclaw-cmo-agent",
        overall_status: "reviewed",
        goals_snapshot: goals || [],
        cmo_analysis: analysis,
        review_hour: new Date().toISOString(),
      });

      return { action: "review", analysis };
    }

    return { action, status: "unknown_action" };
  },

  async heartbeat({ supabase, aiComplete }) {
    await module.exports.invoke({ supabase, aiComplete, body: { action: "review" } });
  },
};
