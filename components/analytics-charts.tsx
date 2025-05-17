"use client"

import { useEffect, useRef } from "react"

export function LineChart() {
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
      const data = [65, 72, 86, 81, 75, 94, 92, 87, 95, 98, 90, 85]
      const dataSecondary = [45, 52, 60, 65, 62, 70, 75, 68, 75, 80, 85, 79]
      const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

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
        ctx.fillText(`${100 - i * (100 / ySteps)}%`, padding - 10, y + 4)
      }

      // X-axis labels
      const step = chartWidth / (labels.length - 1)
      for (let i = 0; i < labels.length; i++) {
        const x = padding + i * step

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(labels[i], x, canvas.height - padding + 20)
      }

      // Plot primary line
      ctx.beginPath()
      ctx.moveTo(padding, padding + chartHeight - (data[0] / 100) * chartHeight)

      for (let i = 1; i < data.length; i++) {
        const x = padding + i * step
        const y = padding + chartHeight - (data[i] / 100) * chartHeight
        ctx.lineTo(x, y)
      }

      ctx.strokeStyle = "rgba(64, 196, 255, 1)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Add gradient fill
      const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding)
      gradient.addColorStop(0, "rgba(64, 196, 255, 0.5)")
      gradient.addColorStop(1, "rgba(64, 196, 255, 0)")

      ctx.fillStyle = gradient
      ctx.lineTo(padding + (data.length - 1) * step, canvas.height - padding)
      ctx.lineTo(padding, canvas.height - padding)
      ctx.fill()

      // Plot secondary line
      ctx.beginPath()
      ctx.moveTo(padding, padding + chartHeight - (dataSecondary[0] / 100) * chartHeight)

      for (let i = 1; i < dataSecondary.length; i++) {
        const x = padding + i * step
        const y = padding + chartHeight - (dataSecondary[i] / 100) * chartHeight
        ctx.lineTo(x, y)
      }

      ctx.strokeStyle = "rgba(133, 92, 248, 1)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Data points for primary line
      for (let i = 0; i < data.length; i++) {
        const x = padding + i * step
        const y = padding + chartHeight - (data[i] / 100) * chartHeight

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(64, 196, 255, 1)"
        ctx.fill()
        ctx.strokeStyle = "rgba(30, 41, 59, 1)"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Data points for secondary line
      for (let i = 0; i < dataSecondary.length; i++) {
        const x = padding + i * step
        const y = padding + chartHeight - (dataSecondary[i] / 100) * chartHeight

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(133, 92, 248, 1)"
        ctx.fill()
        ctx.strokeStyle = "rgba(30, 41, 59, 1)"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    drawChart()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

export function BarChart() {
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
      const data = [65, 59, 80, 81, 56, 55, 40]
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
        ctx.fillText(`${100 - i * (100 / ySteps)}%`, padding - 10, y + 4)
      }

      // Draw bars
      const barWidth = (chartWidth / data.length) * 0.6
      const spacing = ((chartWidth / data.length) * 0.4) / data.length
      const barStart = (chartWidth / data.length - barWidth) / 2

      for (let i = 0; i < data.length; i++) {
        const x = padding + i * (chartWidth / data.length) + barStart
        const barHeight = (data[i] / 100) * chartHeight
        const y = canvas.height - padding - barHeight

        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding)
        gradient.addColorStop(0, "rgba(99, 102, 241, 1)")
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.6)")

        // Draw bar
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0])
        ctx.fill()

        // X-axis labels
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(labels[i], x + barWidth / 2, canvas.height - padding + 20)
      }
    }

    drawChart()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

export function PieChart() {
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
      const data = [35, 25, 20, 15, 5]
      const labels = ["Reconnaissance", "Defense", "Supply", "Survey", "Other"]
      const colors = [
        "rgba(99, 102, 241, 1)",
        "rgba(14, 165, 233, 1)",
        "rgba(232, 121, 249, 1)",
        "rgba(251, 146, 60, 1)",
        "rgba(156, 163, 175, 1)",
      ]

      // Calculate total
      const total = data.reduce((sum, value) => sum + value, 0)

      // Draw pie chart
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(centerX, centerY) - 40

      let startAngle = -Math.PI / 2 // Start from top

      // Draw slices
      for (let i = 0; i < data.length; i++) {
        const sliceAngle = (data[i] / total) * (Math.PI * 2)
        const endAngle = startAngle + sliceAngle

        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, endAngle)
        ctx.closePath()

        ctx.fillStyle = colors[i]
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
      ctx.fillText(`${total}%`, centerX, centerY)

      // Draw legend
      const legendX = canvas.width - 160
      const legendY = 20
      const itemHeight = 25

      for (let i = 0; i < data.length; i++) {
        const y = legendY + i * itemHeight

        // Color box
        ctx.fillStyle = colors[i]
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
        ctx.fillText(`${labels[i]} ${data[i]}%`, legendX + 25, y + 7)
      }
    }

    drawChart()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

