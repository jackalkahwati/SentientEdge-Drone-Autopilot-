"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

interface ThreatOverlayProps {
  threatLevel: number // 0-4 scale
}

export function ThreatOverlay({ threatLevel }: ThreatOverlayProps) {
  const [threats, setThreats] = useState<
    Array<{
      id: number
      x: number
      y: number
      radius: number
      severity: number
    }>
  >([])

  useEffect(() => {
    // Generate threats based on threat level
    const threatCount = threatLevel * 2 + Math.floor(Math.random() * 3)
    const newThreats = []

    for (let i = 0; i < threatCount; i++) {
      newThreats.push({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        radius: 5 + Math.random() * 15,
        severity: Math.min(Math.floor(Math.random() * (threatLevel + 2)), 4),
      })
    }

    setThreats(newThreats)
  }, [threatLevel])

  if (threatLevel === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {threats.map((threat) => (
        <div
          key={threat.id}
          className="absolute flex items-center justify-center"
          style={{
            left: `${threat.x}%`,
            top: `${threat.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`
              animate-pulse rounded-full
              ${
                threat.severity === 4
                  ? "bg-red-500/20"
                  : threat.severity === 3
                    ? "bg-orange-500/20"
                    : threat.severity === 2
                      ? "bg-yellow-500/20"
                      : "bg-blue-500/20"
              }
            `}
            style={{
              width: `${threat.radius * 2}rem`,
              height: `${threat.radius * 2}rem`,
            }}
          />
          <AlertTriangle
            className={`
              absolute h-5 w-5
              ${
                threat.severity === 4
                  ? "text-red-500"
                  : threat.severity === 3
                    ? "text-orange-500"
                    : threat.severity === 2
                      ? "text-yellow-500"
                      : "text-blue-500"
              }
            `}
          />
        </div>
      ))}
    </div>
  )
}

