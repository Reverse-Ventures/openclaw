/**
 * boardy Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[boardy] invoke: ${action}`);
    return { agent: "boardy", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[boardy] heartbeat");
  },
};
