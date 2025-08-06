// Vercel Serverless Function for Auth API
import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';

  if (req.method === 'POST') {
    const { email, password } = req.body;

    // Demo authentication - accepts any login in demo mode
    if (process.env.DEMO_MODE === 'true') {
      const token = jwt.sign(
        { 
          id: '1',
          email: email || 'demo@sentientedge.com',
          name: 'Demo User',
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: '1',
          email: email || 'demo@sentientedge.com',
          name: 'Demo User',
          role: 'admin'
        }
      });
    }

    // Production auth would go here
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Demo mode is not enabled' 
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}