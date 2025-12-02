/*
Simple Express backend that forwards sensor data to OpenAI ChatCompletion and returns structured recommendations.
Usage:
  1. cd server
  2. npm install
  3. set OPENAI_API_KEY=your_key  (Windows PowerShell: $env:OPENAI_API_KEY = '...' )
  4. node index.js

Endpoint:
  POST /evaluate
  body: { name, plantType, temp, hum, lux }

Response:
  { recommendations: [ { message, actionKey, actionLabel } ] }

Important:
  - Keep your OpenAI API key on the server side only. Do NOT embed keys in the client app.
  - This is a minimal example. Add authentication and rate-limiting for production.
*/

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Configuration, OpenAIApi } = require("openai");
const path = require('path');
const fs = require('fs');
const multer = require('multer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ensure public/videos exists
const publicVideosDir = path.join(__dirname, 'public', 'videos');
try {
  fs.mkdirSync(publicVideosDir, { recursive: true });
} catch (e) {
  console.warn('Could not create public videos dir', e.message || e);
}

// serve static files from server/public via /static
app.use('/static', express.static(path.join(__dirname, 'public')));

// multer setup for file uploads (videos)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, publicVideosDir);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY not set. Set it in environment before starting the server.");
}

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

app.post("/evaluate", async (req, res) => {
  const { name, plantType, temp, hum, lux } = req.body || {};

  const system = `You are Garden AI, an assistant that inspects terrarium sensor values and returns concise JSON recommendations for environment control actions. Return only JSON in the response with an array field 'recommendations', each item containing 'message', 'actionKey' and 'actionLabel'. actionKey must be a short machine-friendly identifier (e.g., 'water_pump', 'grow_light'). actionLabel is a user-facing button label. Keep messages in Korean.`;

  const user = `Evaluate the following terrarium:
name: ${name || "unknown"}
plantType: ${plantType || "unknown"}
temperature: ${temp}
humidity: ${hum}
light (lux): ${lux}

Return JSON with recommendations. Use Korean messages. If the environment is fine, return a single recommendation with actionKey 'none'.`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = completion.data.choices[0].message.content;

    // Try to parse JSON from model output. If parsing fails, fall back to a simple heuristic message
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // attempt to extract JSON substring
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch (e2) {
          // ignore
        }
      }
    }

    if (!parsed || !Array.isArray(parsed.recommendations)) {
      // fallback heuristic: build a simple response server-side
      const recs = [];
      if (temp < 20) recs.push({ message: `온도가 낮습니다 (${temp}°C). 온도를 올려주세요.`, actionKey: "heater", actionLabel: "히터 가동" });
      if (hum < 40) recs.push({ message: `습도가 낮습니다 (${hum}%). 워터펌프를 작동시켜 습도를 올려보세요.`, actionKey: "water_pump", actionLabel: "워터펌프 ON" });
      if (lux < 50) recs.push({ message: `조도가 낮습니다 (${lux} lx). 조명을 높여주세요.`, actionKey: "grow_light", actionLabel: "조명 ON" });
      if (recs.length === 0) recs.push({ message: `현재 환경은 양호합니다.`, actionKey: "none", actionLabel: "문제 없음" });
      return res.json({ recommendations: recs, debug: { raw } });
    }

    return res.json({ recommendations: parsed.recommendations });
  } catch (err) {
    console.error("Error calling OpenAI:", err?.response?.data || err.message || err);
    // Fallback heuristic
    const recs = [];
    if (temp < 20) recs.push({ message: `온도가 낮습니다 (${temp}°C). 온도를 올려주세요.`, actionKey: "heater", actionLabel: "히터 가동" });
    if (hum < 40) recs.push({ message: `습도가 낮습니다 (${hum}%). 워터펌프를 작동시켜 습도를 올려보세요.`, actionKey: "water_pump", actionLabel: "워터펌프 ON" });
    if (lux < 50) recs.push({ message: `조도가 낮습니다 (${lux} lx). 조명을 높여주세요.`, actionKey: "grow_light", actionLabel: "조명 ON" });
    if (recs.length === 0) recs.push({ message: `현재 환경은 양호합니다.`, actionKey: "none", actionLabel: "문제 없음" });
    return res.status(200).json({ recommendations: recs, error: "openai_error" });
  }
});

// In-memory store for latest sensor values per terrarium id
const sensors = {};

// In-memory store for LCD commands per terrarium (for Raspberry Pi clients to poll)
const lcdCommands = {};

// POST a command for the LCD player attached to a terrarium Pi
// body: { action: 'play'|'pause'|'stop'|'set_url'|'set_volume', url?, volume? }
app.post('/lcd/:id/command', (req, res) => {
  const id = req.params.id;
  const { action, url, volume } = req.body || {};
  if (!action) return res.status(400).json({ error: 'missing action' });

  lcdCommands[id] = { action, url, volume, timestamp: Date.now() };
  console.log(`LCD command saved for id=${id}:`, lcdCommands[id]);
  return res.json({ ok: true });
});

// GET the last command for a Pi to consume. Returns the latest command (does NOT auto-clear)
app.get('/lcd/:id/last', (req, res) => {
  const id = req.params.id;
  if (!lcdCommands[id]) return res.status(404).json({ ok: false, error: 'no_command' });
  return res.json({ ok: true, command: lcdCommands[id] });
});

// Optionally allow a Pi to acknowledge/clear the last command
app.post('/lcd/:id/ack', (req, res) => {
  const id = req.params.id;
  if (lcdCommands[id]) {
    delete lcdCommands[id];
  }
  return res.json({ ok: true });
});

// Endpoint for devices (control actions)
app.post('/devices/control', (req, res) => {
  const { actionKey, id } = req.body || {};
  console.log('device control received', actionKey, id);

  // simulate changing stored sensor values based on action
  const s = sensors[id] || { temp: 22, hum: 50, lux: 100 };
  if (actionKey === 'water_pump') {
    s.hum = Math.min(100, (s.hum || 50) + 10);
  } else if (actionKey === 'water_pump_off') {
    // no-op
  } else if (actionKey === 'grow_light') {
    s.lux = Math.min(2000, (s.lux || 100) + 200);
  } else if (actionKey === 'grow_light_off') {
    s.lux = Math.max(0, (s.lux || 100) - 200);
  } else if (actionKey === 'heater') {
    s.temp = (s.temp || 22) + 2;
  } else if (actionKey === 'vent') {
    s.temp = (s.temp || 22) - 2;
  }

  s.timestamp = Date.now();
  sensors[id] = s;

  return res.json({ ok: true, updated: s });
});

// Video upload endpoint: accepts multipart/form-data with field 'video'
// Responds with { ok: true, url: '/static/videos/<filename>' }
app.post('/upload/video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });
  const filename = req.file.filename;
  const url = `/static/videos/${filename}`;
  console.log('Uploaded video saved:', req.file.path);
  return res.json({ ok: true, url });
});

// Sensor update endpoint (IoT devices post here)
app.post('/sensors/update', (req, res) => {
  const { id, name, plantType, temp, hum, lux, timestamp } = req.body || {};
  if (typeof id === 'undefined') return res.status(400).json({ error: 'missing id' });
  sensors[id] = { id, name, plantType, temp, hum, lux, timestamp: timestamp || Date.now() };
  console.log('sensor update', id, sensors[id]);
  return res.json({ ok: true });
});

app.get('/sensors/:id/latest', (req, res) => {
  const id = req.params.id;
  if (!sensors[id]) return res.status(404).json({ error: 'not found' });
  return res.json({ ok: true, data: sensors[id] });
});

const PORT = process.env.PORT || 3000;
// Try to initialize MongoDB (if MONGO_URI provided)
try {
  const db = require('./db');
  db.connect().then(() => {
    if (db.isConnected()) {
      const { Event, Terrarium, DeviceState, Upload } = db.models;

      // Events API
      app.get('/api/events', async (req, res) => {
        try {
          const terrariumId = req.query.terrariumId;
          const q = terrariumId ? { terrariumId } : {};
          const items = await Event.find(q).sort({ date: 1, time: 1 }).lean();
          return res.json(items);
        } catch (e) {
          console.error('GET /api/events error', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      app.post('/api/events', async (req, res) => {
        try {
          const body = req.body || {};
          const ev = new Event(body);
          await ev.save();
          return res.status(201).json(ev);
        } catch (e) {
          console.error('POST /api/events error', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      app.delete('/api/events/:id', async (req, res) => {
        try {
          const id = req.params.id;
          await Event.deleteOne({ _id: id });
          return res.status(204).end();
        } catch (e) {
          console.error('DELETE /api/events/:id', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      // Terrariums API
      app.get('/api/terrariums', async (req, res) => {
        try {
          const items = await Terrarium.find({}).lean();
          return res.json(items);
        } catch (e) {
          console.error('GET /api/terrariums', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      app.get('/api/terrariums/:id', async (req, res) => {
        try {
          const t = await Terrarium.findById(req.params.id).lean();
          if (!t) return res.status(404).json({ error: 'not_found' });
          return res.json(t);
        } catch (e) {
          console.error('GET /api/terrariums/:id', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      app.put('/api/terrariums/:id', async (req, res) => {
        try {
          const u = await Terrarium.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
          return res.json(u);
        } catch (e) {
          console.error('PUT /api/terrariums/:id', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      // Device state endpoints
      app.get('/api/devices/:id/state', async (req, res) => {
        try {
          const s = await DeviceState.findOne({ terrariumId: req.params.id }).lean();
          if (!s) return res.json({});
          return res.json(s);
        } catch (e) {
          console.error('GET /api/devices/:id/state', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      app.put('/api/devices/:id/state', async (req, res) => {
        try {
          const body = req.body || {};
          const up = await DeviceState.findOneAndUpdate({ terrariumId: req.params.id }, { ...body, updatedAt: Date.now() }, { upsert: true, new: true }).lean();
          return res.json(up);
        } catch (e) {
          console.error('PUT /api/devices/:id/state', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });

      // Upload metadata
      app.post('/api/uploads', async (req, res) => {
        try {
          const body = req.body || {};
          const u = new Upload(body);
          await u.save();
          return res.status(201).json(u);
        } catch (e) {
          console.error('POST /api/uploads', e);
          return res.status(500).json({ error: 'db_error' });
        }
      });
    }
  }).catch((e) => console.warn('DB connect promise rejected', e && e.message));
} catch (e) {
  console.warn('DB module not available', e && e.message);
}

app.listen(PORT, () => console.log(`Garden AI server listening on http://localhost:${PORT}`));
