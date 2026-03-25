/**
 * funnel-analyst Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[funnel-analyst] invoke: ${action}`);
    return { agent: "funnel-analyst", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[funnel-analyst] heartbeat");
  },
};
