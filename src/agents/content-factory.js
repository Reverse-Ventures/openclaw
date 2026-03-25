/**
 * content-factory Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[content-factory] invoke: ${action}`);
    return { agent: "content-factory", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[content-factory] heartbeat");
  },
};
