const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Basic placeholder REST endpoint – extend as needed
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simple in-memory user store (demo only)
const demoUser = {
  id: 'u-demo',
  username: 'demo',
  email: 'demo@sentientedge.ai',
  role: 'admin',
  firstName: 'Demo',
  lastName: 'User',
  createdAt: new Date().toISOString(),
};

// POST /auth/login – accepts any creds and returns token
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body || {};
  // Generate fake token
  const token = 'demo-token-' + Date.now();
  res.json({ user: { ...demoUser, email }, token });
});

// POST /auth/register – echoes back
app.post('/api/auth/register', (req, res) => {
  const { email, username, firstName, lastName } = req.body || {};
  const token = 'demo-token-' + Date.now();
  res.json({ user: { ...demoUser, id: 'u-' + Date.now(), email, username, firstName, lastName }, token });
});

// GET /auth/me – validate token (just returns demo user)
app.get('/api/auth/me', (_req, res) => {
  res.json(demoUser);
});

// Create HTTP server & attach WebSocket server to the same port
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  console.log('WS client connected', req.socket.remoteAddress);

  // Keep-alive: send ping every 25 s
  const pingInterval = setInterval(() => {
    if (socket.readyState === 1) {
      socket.ping();
    }
  }, 25000);

  // Send a welcome message
  socket.send(JSON.stringify({ type: 'welcome', payload: 'connected' }));

  // Echo incoming messages (customise to your app's protocol)
  socket.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (e) {
      console.error('Invalid JSON:', e);
      return;
    }
    console.log('Received:', parsed);

    // Example: broadcast back to every client
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'broadcast', payload: parsed }));
      }
    });
  });

  socket.on('close', (code, reason) => {
    console.log(`WS client disconnected (code=${code})`, reason?.toString());
    clearInterval(pingInterval);
  });

  socket.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// In-memory demo data – replace with real DB later
const drones = [
  {
    id: 'd1',
    name: 'Hawk-1',
    type: 'surveillance',
    status: 'idle',
    battery: 100,
    signal: 100,
    missionCount: 12,
    nextMaintenance: new Date(Date.now() + 86400000).toISOString(),
    model: 'HX-900',
    serialNumber: 'HX900-001',
  },
  {
    id: 'd2',
    name: 'Hawk-2',
    type: 'attack',
    status: 'active',
    battery: 85,
    signal: 92,
    missionCount: 4,
    nextMaintenance: new Date(Date.now() + 172800000).toISOString(),
    model: 'HX-900',
    serialNumber: 'HX900-002',
  },
];

const missions = [
  {
    id: 'm1',
    name: 'Operation Silent Watch',
    description: 'Border surveillance mission',
    status: 'active',
    location: 'Sector 7',
    date: new Date().toISOString(),
    duration: '3h',
    progress: 42,
    threatLevel: 1,
    droneCount: 1,
    teamSize: 4,
    createdBy: demoUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to find drone by id
function findDrone(id) {
  return drones.find((d) => d.id === id);
}

// Helper to find mission by id
function findMission(id) {
  return missions.find((m) => m.id === id);
}

// Drone routes
app.get('/api/drones', (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(drones.filter((d) => d.status === status));
  }
  res.json(drones);
});

app.get('/api/drones/:id', (req, res) => {
  const drone = findDrone(req.params.id);
  if (!drone) return res.status(404).json({ message: 'Drone not found' });
  res.json(drone);
});

app.patch('/api/drones/:id/status', (req, res) => {
  const drone = findDrone(req.params.id);
  if (!drone) return res.status(404).json({ message: 'Drone not found' });
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required' });
  drone.status = status;
  res.json(drone);
});

app.post('/api/drones/:id/assign', (req, res) => {
  const drone = findDrone(req.params.id);
  if (!drone) return res.status(404).json({ message: 'Drone not found' });
  const { missionId } = req.body;
  if (!missionId) return res.status(400).json({ message: 'missionId is required' });
  drone.lastMission = missionId;
  res.json({ success: true });
});

// Mission routes
app.get('/api/missions', (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(missions.filter((m) => m.status === status));
  }
  res.json(missions);
});

app.get('/api/missions/:id', (req, res) => {
  const mission = findMission(req.params.id);
  if (!mission) return res.status(404).json({ message: 'Mission not found' });
  res.json(mission);
});

app.post('/api/missions', (req, res) => {
  const id = 'm' + (missions.length + 1);
  const newMission = {
    id,
    ...req.body,
    status: req.body.status || 'scheduled',
    createdBy: demoUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  missions.push(newMission);
  res.status(201).json(newMission);
});

app.patch('/api/missions/:id', (req, res) => {
  const mission = findMission(req.params.id);
  if (!mission) return res.status(404).json({ message: 'Mission not found' });
  Object.assign(mission, req.body, { updatedAt: new Date().toISOString() });
  res.json(mission);
});

app.delete('/api/missions/:id', (req, res) => {
  const idx = missions.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Mission not found' });
  missions.splice(idx, 1);
  res.status(204).send();
});

server.listen(PORT, () => {
  console.log(`API & WS server listening on http://localhost:${PORT}`);
}); 