// Vercel Serverless Function for Missions API
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Demo mission data
  const missions = [
    {
      id: '1',
      name: 'Perimeter Patrol Alpha',
      type: 'surveillance',
      status: 'active',
      priority: 'high',
      assignedDrones: ['1', '3'],
      startTime: new Date(Date.now() - 3600000).toISOString(),
      estimatedDuration: 7200000,
      progress: 45,
      waypoints: [
        { lat: 34.0522, lng: -118.2437, alt: 150 },
        { lat: 34.0622, lng: -118.2437, alt: 150 },
        { lat: 34.0622, lng: -118.2337, alt: 150 },
        { lat: 34.0522, lng: -118.2337, alt: 150 }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Supply Delivery Bravo',
      type: 'delivery',
      status: 'planned',
      priority: 'medium',
      assignedDrones: ['2'],
      startTime: new Date(Date.now() + 3600000).toISOString(),
      estimatedDuration: 5400000,
      progress: 0,
      waypoints: [
        { lat: 34.0422, lng: -118.2537, alt: 200 },
        { lat: 34.0722, lng: -118.2237, alt: 200 }
      ],
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Emergency Response Charlie',
      type: 'emergency',
      status: 'completed',
      priority: 'critical',
      assignedDrones: ['1', '2', '3'],
      startTime: new Date(Date.now() - 10800000).toISOString(),
      estimatedDuration: 3600000,
      progress: 100,
      waypoints: [
        { lat: 34.0522, lng: -118.2437, alt: 100 }
      ],
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id && id !== 'missions') {
      const mission = missions.find(m => m.id === id);
      return mission 
        ? res.status(200).json(mission)
        : res.status(404).json({ error: 'Mission not found' });
    }
    
    return res.status(200).json(missions);
  }

  if (req.method === 'POST') {
    const newMission = {
      id: String(missions.length + 1),
      ...req.body,
      status: 'planned',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return res.status(201).json(newMission);
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    return res.status(200).json({
      id,
      ...req.body,
      updatedAt: new Date().toISOString(),
      message: 'Mission updated (demo mode)'
    });
  }

  if (req.method === 'DELETE') {
    return res.status(200).json({
      success: true,
      message: 'Mission deleted (demo mode)',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}