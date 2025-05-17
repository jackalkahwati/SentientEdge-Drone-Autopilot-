"use client"

import { useEffect, useRef } from "react"

export function FleetStatusOverview() {
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

      // Chart dimensions
      const padding = 40
      const chartWidth = canvas.width - padding * 2
      const chartHeight = canvas.height - padding * 2

      // Sample data - replace with real data in production
      const data = [
        { label: "Active", value: 876, color: "rgba(64, 196, 255, 1)" },
        { label: "Standby", value: 285, color: "rgba(148, 163, 184, 1)" },
        { label: "Maintenance", value: 42, color: "rgba(250, 204, 21, 1)" },
        { label: "Offline", value: 45, color: "rgba(239, 68, 68, 1)" },
      ]

      const total = data.reduce((sum, item) => sum + item.value, 0)

      // Draw axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1

      // X-axis
      ctx.beginPath()
      ctx.moveTo(padding, canvas.height - padding)
      ctx.lineTo(canvas.width - padding, canvas.height - padding)
      ctx.stroke()

      // Y-axis
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, canvas.height - padding)
      ctx.stroke()

      // Draw grid lines
      const ySteps = 5
      for (let i = 0; i <= ySteps; i++) {
        const y = padding + (chartHeight / ySteps) * i
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(canvas.width - padding, y)
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])

        // Y-axis labels
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "right"
        ctx.fillText(`${Math.round(1000 - i * (1000 / ySteps))}`, padding - 10, y + 4)
      }

      // Draw bars
      const barWidth = (chartWidth / data.length) * 0.6
      const spacing = ((chartWidth / data.length) * 0.4) / data.length
      const barStart = (chartWidth / data.length - barWidth) / 2

      for (let i = 0; i < data.length; i++) {
        const x = padding + i * (chartWidth / data.length) + barStart
        const barHeight = (data[i].value / 1000) * chartHeight
        const y = canvas.height - padding - barHeight

        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding)
        gradient.addColorStop(0, data[i].color)
        gradient.addColorStop(1, data[i].color.replace("1)", "0.6)"))

        // Draw bar
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0])
        ctx.fill()

        // Draw value on top of bar
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.font = "bold 14px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${data[i].value}`, x + barWidth / 2, y - 10)

        // X-axis labels
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(data[i].label, x + barWidth / 2, canvas.height - padding + 20)

        // Percentage
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${Math.round((data[i].value / total) * 100)}%`, x + barWidth / 2, canvas.height - padding + 36)
      }
    }

    drawChart()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

