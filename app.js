import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * OAuth callback
 */
app.get("/callback", (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  res.redirect(
    "/?code=" + encodeURIComponent(code) +
    "&state=" + encodeURIComponent(state || "")
  );
});

/**
 * Exchange code → token (PKCE ENABLED)
 */
app.post("/exchange", async (req, res) => {
  try {
    const { code, code_verifier } = req.body;

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", "0b5c8965-b8b6-4259-a7b9-fc439b86dca2");
    params.append("code", code);
    params.append("redirect_uri", "https://base-t56v.onrender.com/callback");
    params.append("code_verifier", code_verifier);

    const tokenRes = await fetch("https://mcp.base.org/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params.toString()
    });

    const token = await tokenRes.json();

    if (!token.access_token) {
      return res.status(400).json(token);
    }

    res.json({
      access_token: token.access_token,
      result: token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * MCP request (UNCHANGED)
 */
app.post("/mcp-request", async (req, res) => {
  try {
    const { access_token } = req.body;

    const mcpRes = await fetch("https://mcp.base.org/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_portfolio",
          arguments: {}
        }
      })
    });

    const mcpData = await mcpRes.json();
    res.json(mcpData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));
