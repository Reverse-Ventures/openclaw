const express = require("express");
const cron = require("node-cron");

const { callSupabaseWebhook } = require("./webhookHelper");

const app = express();
app.use(express.json());

// ── Supabase client ─────────────────────────────────────────
// The service role key is intentionally NOT used here.
// All privileged Supabase operations are routed through the secure
// webhook endpoint (SUPABASE_WEBHOOK_URL) authenticated with
// SUPABASE_WEBHOOK_SECRET.  See src/webhookHelper.js for details.
//
// SUPABASE_URL is retained for reference / future read-only public queries.
const SUPABASE_URL = process.env.SUPABASE_URL;

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

// ── Execute endpoint ────────────────────────────────────────
app.post("/execute", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  const { tasks = [], source } = req.body;
  console.log(`[${new Date().toISOString()}] 📥 /execute called from source: ${source}, tasks: ${tasks.length}`);

  const results = [];
  for (const task of tasks) {
    const { agent_key, task_type, description, priority } = task;
    const ts = new Date().toISOString();
    console.log(`  [${ts}] task agent_key=${agent_key} type=${task_type} priority=${priority} — ${description}`);
    results.push({ agent_key, task_type, description, priority, logged_at: ts });
  }

  res.json({ completed: tasks.length, failed: 0, results });
});

// ── Heartbeat endpoint ──────────────────────────────────────
app.post("/heartbeat", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  const { trigger = "hourly" } = req.body;
  const ts = new Date().toISOString();
  console.log(`[${ts}] 🫀 /heartbeat called — trigger: ${trigger}`);

  try {
    // Read current agent state via the secure webhook (no service role key here)
    const cutoff = new Date(Date.now() - 6 * 3600000).toISOString();
    const stateResponse = await callSupabaseWebhook("read_agent_state", { cutoff });
    const { logs = [], tasks = [], goals = [] } = stateResponse;

    console.log(`  Webhook state — logs: ${logs.length}, tasks: ${tasks.length}, goals: ${goals.length}`);

    // Call Anthropic API for heartbeat analysis
    const Anthropic = require("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are NOVA, the AI orchestration layer for the OpenClaw marketing gateway.\nYour job is to analyse the current agent state and produce a concise heartbeat summary.\nIdentify any anomalies, stalled tasks, or opportunities, and recommend the next actions.`;

    const userPrompt = `Trigger: ${trigger}\nTimestamp: ${ts}\n\nRecent agent logs (last 6 h):\n${JSON.stringify(logs, null, 2)}\n\nPending / recent tasks:\n${JSON.stringify(tasks, null, 2)}\n\nActive CMO goals:\n${JSON.stringify(goals, null, 2)}`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
      ],
    });

    const summary = message.content[0].type === "text" ? message.content[0].text : "";
    console.log(`  NOVA summary (${summary.length} chars) generated`);

    // Write heartbeat result back via the secure webhook
    await callSupabaseWebhook("write_heartbeat", {
      agent_key: "openclaw-nova-heartbeat",
      action: trigger,
      status: "success",
      message: summary.slice(0, 500),
      metadata: { trigger, summary },
    });

    res.json({ success: true, summary });
  } catch (err) {
    console.error(`  ❌ /heartbeat error:`, err.message);
    // Best-effort error log via webhook — ignore secondary failures
    callSupabaseWebhook("write_heartbeat", {
      agent_key: "openclaw-nova-heartbeat",
      action: trigger,
      status: "error",
      message: err.message,
      metadata: null,
    }).catch((webhookErr) => {
      console.error(`  ⚠️  Failed to log heartbeat error via webhook:`, webhookErr.message);
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Skills endpoint ─────────────────────────────────────────
app.get("/skills", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  // Capability map — one entry per loaded agent
  const capabilityMap = {
    "cmo":                  ["orchestrate_agents", "review_goals", "cmo_analysis", "self_heal"],
    "social":               ["social_media_posting", "engagement_tracking", "platform_scheduling"],
    "content-factory":      ["content_generation", "blog_writing", "copywriting"],
    "seo-aeo":              ["seo_optimisation", "keyword_research", "aeo_strategy"],
    "influencer-outreach":  ["influencer_discovery", "outreach_campaigns", "partnership_tracking"],
    "community-referral":   ["referral_programme", "community_engagement", "reward_tracking"],
    "corporate-outreach":   ["b2b_outreach", "lead_generation", "corporate_partnerships"],
    "affiliate-recruitment":["affiliate_onboarding", "commission_tracking", "partner_recruitment"],
    "knowledge":            ["knowledge_base_management", "faq_generation", "document_indexing"],
    "trends":               ["trend_analysis", "market_research", "competitive_intelligence"],
    "pr-media":             ["press_release_writing", "media_outreach", "brand_monitoring"],
    "evolution-scout":      ["product_evolution_tracking", "feature_scouting", "roadmap_analysis"],
    "engagement-scout":     ["audience_engagement_analysis", "sentiment_tracking", "community_health"],
    "data-collector":       ["data_scraping", "data_aggregation", "source_monitoring"],
    "data-verifier":        ["data_validation", "quality_assurance", "deduplication"],
    "funnel-analyst":       ["funnel_analysis", "conversion_optimisation", "drop_off_detection"],
    "email":                ["email_campaigns", "drip_sequences", "deliverability_monitoring"],
    "boardy":               ["board_reporting", "executive_summaries", "kpi_dashboards"],
  };

  const skills = [];
  for (const [agentName] of Object.entries(agents)) {
    const capabilities = capabilityMap[agentName] || [];
    for (const capability of capabilities) {
      skills.push({ agent: agentName, capability });
    }
  }

  console.log(`[${new Date().toISOString()}] 🔍 /skills — returning ${skills.length} capabilities across ${Object.keys(agents).length} agents`);
  res.json(skills);
});

// ── Agent invoke endpoint ───────────────────────────────────
app.post("/agents/:agentName/invoke", async (req, res) => {
  const { agentName } = req.params;
  const agent = agents[agentName];
  if (!agent) {
    return res.status(404).json({ error: `Agent '${agentName}' not found` });
  }
  try {
    const result = await agent.invoke({ callSupabaseWebhook, aiComplete, body: req.body });
    await logAgent(agentName, req.body.action || "invoke", "success", result);
    res.json({ success: true, result });
  } catch (err) {
    await logAgent(agentName, req.body.action || "invoke", "error", null, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Agent logging ───────────────────────────────────────────
async function logAgent(agentKey, action, status, metadata, message) {
  await callSupabaseWebhook("write_agent_log", {
    agent_key: `openclaw-${agentKey}-agent`,
    action,
    status,
    message: message || null,
    metadata: metadata ? { result: metadata } : null,
  }).catch((err) => {
    console.error(`  ⚠️  logAgent webhook failed for ${agentKey}:`, err.message);
  });
}

// ── Cron: Heartbeat every hour ──────────────────────────────
cron.schedule("0 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] 🫀 Hourly heartbeat starting...`);
  for (const [name, agent] of Object.entries(agents)) {
    if (agent.heartbeat) {
      try {
        await agent.heartbeat({ callSupabaseWebhook, aiComplete });
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
  console.log(`   Supabase webhook: ${process.env.SUPABASE_WEBHOOK_URL ? "configured ✅" : "NOT configured ⚠️"}`);
});
