// Vercel Serverless Function for Drones API
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Demo drone data
  const drones = [
    {
      id: '1',
      name: 'Alpha Hawk',
      type: 'Surveillance',
      status: 'active',
      battery: 85,
      position: { lat: 34.0522, lng: -118.2437, alt: 150 },
      heading: 45,
      speed: 25,
      armed: true,
      mode: 'AUTO',
      lastUpdate: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Bravo Eagle',
      type: 'Combat',
      status: 'idle',
      battery: 92,
      position: { lat: 34.0622, lng: -118.2537, alt: 200 },
      heading: 90,
      speed: 0,
      armed: false,
      mode: 'GUIDED',
      lastUpdate: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Charlie Falcon',
      type: 'Reconnaissance',
      status: 'active',
      battery: 67,
      position: { lat: 34.0422, lng: -118.2337, alt: 180 },
      heading: 270,
      speed: 30,
      armed: true,
      mode: 'LOITER',
      lastUpdate: new Date().toISOString()
    }
  ];

  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id && id !== 'drones') {
      const drone = drones.find(d => d.id === id);
      return drone 
        ? res.status(200).json(drone)
        : res.status(404).json({ error: 'Drone not found' });
    }
    
    return res.status(200).json(drones);
  }

  if (req.method === 'POST') {
    const { command, droneId, params } = req.body;
    
    if (command) {
      return res.status(200).json({
        success: true,
        message: `Command ${command} sent to drone ${droneId}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Create new drone (demo)
    const newDrone = {
      id: String(drones.length + 1),
      ...req.body,
      lastUpdate: new Date().toISOString()
    };
    
    return res.status(201).json(newDrone);
  }

  if (req.method === 'PUT') {
    return res.status(200).json({
      success: true,
      message: 'Drone updated (demo mode)',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'DELETE') {
    return res.status(200).json({
      success: true,
      message: 'Drone removed (demo mode)',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}