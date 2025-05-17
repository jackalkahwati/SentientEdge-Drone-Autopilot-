"use client"

import { useEffect, useRef } from "react"

export function DroneTypeDistribution() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Draw chart
    const drawChart = () => {
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Sample data - replace with real data in production
      const data = [
        { label: "Multirotor", value: 624, color: "rgba(99, 102, 241, 1)" },
        { label: "Fixed-Wing", value: 312, color: "rgba(14, 165, 233, 1)" },
        { label: "Ground", value: 187, color: "rgba(249, 115, 22, 1)" },
        { label: "Underwater", value: 125, color: "rgba(16, 185, 129, 1)" },
      ]

      // Calculate total
      const total = data.reduce((sum, item) => sum + item.value, 0)

      // Draw pie chart
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(centerX, centerY) - 40

      let startAngle = -Math.PI / 2 // Start from top

      // Draw slices
      for (let i = 0; i < data.length; i++) {
        const sliceAngle = (data[i].value / total) * (Math.PI * 2)
        const endAngle = startAngle + sliceAngle

        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, endAngle)
        ctx.closePath()

        ctx.fillStyle = data[i].color
        ctx.fill()

        // Add slice border
        ctx.strokeStyle = "rgba(30, 41, 59, 1)"
        ctx.lineWidth = 2
        ctx.stroke()

        // Prepare for next slice
        startAngle = endAngle
      }

      // Draw center circle (donut hole)
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(30, 41, 59, 1)"
      ctx.fill()

      // Add total in center
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
      ctx.font = "bold 20px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${total}`, centerX, centerY - 10)
      ctx.font = "14px sans-serif"
      ctx.fillText("Total Drones", centerX, centerY + 15)

      // Draw legend
      const legendX = canvas.width - 160
      const legendY = 20
      const itemHeight = 25

      for (let i = 0; i < data.length; i++) {
        const y = legendY + i * itemHeight

        // Color box
        ctx.fillStyle = data[i].color
        ctx.fillRect(legendX, y, 15, 15)

        // Border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
        ctx.lineWidth = 1
        ctx.strokeRect(legendX, y, 15, 15)

        // Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.font = "14px sans-serif"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillText(`${data[i].label} (${data[i].value})`, legendX + 25, y + 7)
      }
    }

    drawChart()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

