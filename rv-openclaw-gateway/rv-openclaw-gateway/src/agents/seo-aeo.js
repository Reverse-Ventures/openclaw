/**
 * seo-aeo Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[seo-aeo] invoke: ${action}`);
    return { agent: "seo-aeo", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[seo-aeo] heartbeat");
  },
};
