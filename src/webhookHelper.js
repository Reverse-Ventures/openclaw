/**
 * Supabase Webhook Helper
 *
 * Provides a secure way to perform Supabase operations through a trusted
 * backend webhook endpoint, keeping the service role key out of this service.
 *
 * Required environment variables:
 *   SUPABASE_WEBHOOK_URL    — URL of the secure backend webhook endpoint
 *   SUPABASE_WEBHOOK_SECRET — Shared secret sent in the Authorization header
 */

const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

/**
 * Call the Supabase webhook with a given action and payload.
 *
 * @param {string} action   - Logical action name (e.g. 'read_agent_state', 'write_heartbeat')
 * @param {object} payload  - Action-specific data to send to the webhook
 * @returns {Promise<object>} Parsed JSON response from the webhook
 * @throws {Error} If the webhook is not configured, the request fails, or the
 *                 server returns a non-2xx status code
 */
async function callSupabaseWebhook(action, payload = {}) {
  if (!WEBHOOK_URL) {
    throw new Error(
      "SUPABASE_WEBHOOK_URL is not configured. " +
      "Set this environment variable to enable Supabase operations."
    );
  }

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "SUPABASE_WEBHOOK_SECRET is not configured. " +
      "Set this environment variable to authenticate webhook requests."
    );
  }

  const body = JSON.stringify({ action, ...payload });

  let response;
  try {
    response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WEBHOOK_SECRET}`,
      },
      body,
    });
  } catch (networkErr) {
    throw new Error(`Webhook request to ${WEBHOOK_URL} failed: ${networkErr.message}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const text = await response.text();
      detail = text ? ` — ${text}` : "";
    } catch (_) {
      // ignore body-read errors
    }
    throw new Error(
      `Webhook responded with HTTP ${response.status}${detail}`
    );
  }

  return response.json();
}

module.exports = { callSupabaseWebhook };
