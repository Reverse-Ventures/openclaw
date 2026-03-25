/**
 * pr-media Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[pr-media] invoke: ${action}`);
    return { agent: "pr-media", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[pr-media] heartbeat");
  },
};
