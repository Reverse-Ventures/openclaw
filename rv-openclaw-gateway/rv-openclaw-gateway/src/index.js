const express = require("express");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// ── Supabase client ─────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── AI provider factory ─────────────────────────────────────
async function aiComplete(systemPrompt, userPrompt, opts = {}) {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (provider === "google") {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: opts.model || "gemini-2.5-flash" });
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
    return result.response.text();
  }

  // Default: OpenAI
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: opts.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: opts.maxTokens || 2000,
    temperature: opts.temperature ?? 0.7,
  });
  return completion.choices[0].message.content;
}

// ── Agent loader ────────────────────────────────────────────
const agents = {};
const agentFiles = [
  "cmo", "social", "content-factory", "seo-aeo", "influencer-outreach",
  "community-referral", "corporate-outreach", "affiliate-recruitment",
  "knowledge", "trends", "pr-media", "evolution-scout", "engagement-scout",
  "data-collector", "data-verifier", "funnel-analyst", "email", "boardy",
];

for (const name of agentFiles) {
  try {
    const agentModule = require(`./agents/${name}.js`);
    agents[name] = agentModule;
    console.log(`✅ Loaded agent: ${name}`);
  } catch (e) {
    console.warn(`⚠️  Agent ${name} not yet implemented, skipping`);
  }
}

// ── Health endpoint ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    gateway: "rv-openclaw-gateway",
    agents: Object.keys(agents),
    uptime: process.uptime(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ── Agent invoke endpoint ───────────────────────────────────
app.post("/agents/:agentName/invoke", async (req, res) => {
  const { agentName } = req.params;
  const agent = agents[agentName];
  if (!agent) {
    return res.status(404).json({ error: `Agent '${agentName}' not found` });
  }
  try {
    const result = await agent.invoke({ supabase, aiComplete, body: req.body });
    await logAgent(agentName, req.body.action || "invoke", "success", result);
    res.json({ success: true, result });
  } catch (err) {
    await logAgent(agentName, req.body.action || "invoke", "error", null, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Agent logging ───────────────────────────────────────────
async function logAgent(agentKey, action, status, metadata, message) {
  await supabase.from("agent_logs").insert({
    agent_key: `openclaw-${agentKey}-agent`,
    action,
    status,
    message: message || null,
    metadata: metadata ? { result: metadata } : null,
  }).then(() => {});
}

// ── Cron: Heartbeat every hour ──────────────────────────────
cron.schedule("0 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] 🫀 Hourly heartbeat starting...`);
  for (const [name, agent] of Object.entries(agents)) {
    if (agent.heartbeat) {
      try {
        await agent.heartbeat({ supabase, aiComplete });
        console.log(`  ✅ ${name} heartbeat OK`);
      } catch (e) {
        console.error(`  ❌ ${name} heartbeat failed:`, e.message);
      }
    }
  }
});

// ── Start server ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Gateway running on port ${PORT}`);
  console.log(`   Agents loaded: ${Object.keys(agents).length}/${agentFiles.length}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || "openai"}`);
});
