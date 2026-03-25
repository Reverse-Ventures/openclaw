/**
 * community-referral Agent — Stub (ready for implementation)
 */
module.exports = {
  async invoke({ supabase, aiComplete, body }) {
    const action = body.action || "default";
    console.log(`[community-referral] invoke: ${action}`);
    return { agent: "community-referral", action, status: "stub", message: "Agent ready for implementation" };
  },

  async heartbeat({ supabase, aiComplete }) {
    console.log("[community-referral] heartbeat");
  },
};
