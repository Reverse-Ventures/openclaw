/**
 * data-collector Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[data-collector] invoke: ${action}`);
    return { agent: "data-collector", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[data-collector] heartbeat");
  },
};
