const https = require("https");
const http = require("http");

/**
 * Calls the Supabase webhook helper with a given operation and payload.
 *
 * @param {string} operation  - The operation name (e.g. "read_agent_state", "write_heartbeat")
 * @param {object} payload    - The data payload to send with the operation
 * @returns {Promise<object>} - Parsed JSON response from the webhook
 */
async function callSupabaseWebhook(operation, payload = {}) {
  const webhookUrl = process.env.SUPABASE_WEBHOOK_URL;
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (!webhookUrl) {
    throw new Error("SUPABASE_WEBHOOK_URL is not configured");
  }

  const body = JSON.stringify({ operation, ...payload });

  const url = new URL(webhookUrl);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(
              `Webhook responded with ${res.statusCode}: ${parsed.error || data}`
            );
            reject(err);
          }
        } catch (e) {
          reject(new Error(`Failed to parse webhook response: ${data}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Webhook request failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { callSupabaseWebhook };
