/**
 * affiliate-recruitment Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[affiliate-recruitment] invoke: ${action}`);
    return { agent: "affiliate-recruitment", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[affiliate-recruitment] heartbeat");
  },
};
