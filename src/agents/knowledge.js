/**
 * knowledge Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[knowledge] invoke: ${action}`);
    return { agent: "knowledge", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[knowledge] heartbeat");
  },
};
