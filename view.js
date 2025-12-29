import { toPretty } from "./lisp.js"

export class View {
  constructor(canvas, world) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.world = world
    
    this.centerX = world.width / 2
    this.centerY = world.height / 2
    this.scale = null
    this.minScale = null
    
    this.running = false
    this.paused = false
    
    this.drag = { active: false, x: 0, y: 0, moved: false }
    this.selected = null
    
    this.fps = 0
    this.frameCount = 0
    this.fpsTime = 0
    
    this.createUI()
    this.installControls()
  }
  
  createUI() {
    const parent = this.canvas.parentElement
    const wrap = document.createElement("div")
    wrap.style.position = "relative"
    wrap.style.display = "inline-block"
    parent.insertBefore(wrap, this.canvas)
    wrap.appendChild(this.canvas)
    this.wrap = wrap
    
    const fsBtn = document.createElement("button")
    fsBtn.textContent = "fullscreen"
    fsBtn.style.cssText = "position:absolute;top:8px;right:8px;z-index:10"
    fsBtn.addEventListener("click", () => this.toggleFullscreen())
    wrap.appendChild(fsBtn)
    
    const panel = document.createElement("div")
    panel.style.cssText = `
      position:absolute;top:8px;left:8px;z-index:10;display:none;
      padding:10px;background:rgba(0,0,0,0.75);color:#fff;
      font:11px monospace;border-radius:4px;min-width:280px;max-width:400px;
      max-height:80%;overflow-y:auto
    `
    wrap.appendChild(panel)
    
    const header = document.createElement("div")
    header.style.cssText = "display:flex;justify-content:space-between;margin-bottom:8px"
    panel.appendChild(header)
    
    const title = document.createElement("span")
    title.textContent = "creature"
    header.appendChild(title)
    
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "×"
    closeBtn.style.cssText = "border:none;background:none;color:#fff;cursor:pointer;font-size:16px"
    closeBtn.addEventListener("click", () => this.selected = null)
    header.appendChild(closeBtn)
    
    const stats = document.createElement("div")
    stats.style.whiteSpace = "pre"
    panel.appendChild(stats)
    
    this.panel = panel
    this.panelTitle = title
    this.panelStats = stats
  }
  
  resize() {
    const parent = this.wrap.parentElement
    const width = parent.clientWidth
    const height = width * (this.world.height / this.world.width)
    
    const dpr = window.devicePixelRatio || 1
    this.canvas.style.width = width + "px"
    this.canvas.style.height = height + "px"
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    
    this.minScale = Math.min(this.width / this.world.width, this.height / this.world.height)
    
    if (this.scale === null) {
      this.scale = this.minScale * 0.95
    }
  }
  
  get width() {
    return this.canvas.width / (window.devicePixelRatio || 1)
  }
  
  get height() {
    return this.canvas.height / (window.devicePixelRatio || 1)
  }
  
  wrapX(x) {
    return ((x % this.world.width) + this.world.width) % this.world.width
  }
  
  wrapY(y) {
    return ((y % this.world.height) + this.world.height) % this.world.height
  }
  
  toScreenX(wx) {
    return this.width / 2 + (wx - this.centerX) * this.scale
  }
  
  toScreenY(wy) {
    return this.height / 2 + (wy - this.centerY) * this.scale
  }
  
  toWorldX(sx) {
    return (sx - this.width / 2) / this.scale + this.centerX
  }
  
  toWorldY(sy) {
    return (sy - this.height / 2) / this.scale + this.centerY
  }
  
  eventToCanvas(e) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.wrap.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  
  animalAt(sx, sy) {
    const wx = this.wrapX(this.toWorldX(sx))
    const wy = this.wrapY(this.toWorldY(sy))
    let best = null
    let bestDist = Infinity
    for (const a of this.world.animals) {
      const dx = wx - a.x
      const dy = wy - a.y
      const d = dx * dx + dy * dy
      if (d < 4 && d < bestDist) {
        bestDist = d
        best = a
      }
    }
    return best
  }
  
  installControls() {
    this.canvas.addEventListener("mousedown", e => {
      const p = this.eventToCanvas(e)
      this.drag = { active: true, x: p.x, y: p.y, moved: false }
    })
    
    window.addEventListener("mousemove", e => {
      if (!this.drag.active) return
      const p = this.eventToCanvas(e)
      const dx = p.x - this.drag.x
      const dy = p.y - this.drag.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.drag.moved = true
      this.centerX -= dx / this.scale
      this.centerY -= dy / this.scale
      this.centerX = this.wrapX(this.centerX)
      this.centerY = this.wrapY(this.centerY)
      this.drag.x = p.x
      this.drag.y = p.y
    })
    
    window.addEventListener("mouseup", () => {
      this.drag.active = false
    })
    
    this.canvas.addEventListener("click", e => {
      if (this.drag.moved) return
      const p = this.eventToCanvas(e)
      this.selected = this.animalAt(p.x, p.y)
    })
    
    this.canvas.addEventListener("wheel", e => {
      const p = this.eventToCanvas(e)
      const wx = this.toWorldX(p.x)
      const wy = this.toWorldY(p.y)
      const factor = Math.exp(-e.deltaY * 0.001)
      this.scale = Math.max(this.minScale, Math.min(20, this.scale * factor))
      this.centerX = wx - (p.x - this.width / 2) / this.scale
      this.centerY = wy - (p.y - this.height / 2) / this.scale
      this.centerX = this.wrapX(this.centerX)
      this.centerY = this.wrapY(this.centerY)
      e.preventDefault()
    }, { passive: false })
    
    window.addEventListener("keydown", e => {
      if (e.key === " ") {
        this.paused = !this.paused
        e.preventDefault()
      }
      if (e.key === "f") this.toggleFullscreen()
      if (e.key === "Escape") this.selected = null
    })
    
    document.addEventListener("fullscreenchange", () => {
      setTimeout(() => this.resize(), 100)
    })
  }
  
  updatePanel() {
    if (!this.selected || !this.world.animals.includes(this.selected)) {
      this.selected = null
      this.panel.style.display = "none"
      return
    }
    
    this.panel.style.display = "block"
    const a = this.selected
    this.panelStats.textContent = [
      `energy: ${a.energy}`,
      `pos: ${a.x}, ${a.y}`,
      `dir: ${a.dx}, ${a.dy}`,
      `wait: ${a.wait}`,
      ``,
      toPretty(a.program)
    ].join("\n")
  }
  
  draw() {
    const ctx = this.ctx
    const w = this.width
    const h = this.height
    const s = this.scale
    const world = this.world
    
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, w, h)
    
    const viewLeft = this.toWorldX(0)
    const viewRight = this.toWorldX(w)
    const viewTop = this.toWorldY(0)
    const viewBottom = this.toWorldY(h)
    
    const viewWidth = viewRight - viewLeft
    const viewHeight = viewBottom - viewTop
    
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const offsetX = ox * world.width
        const offsetY = oy * world.height
        
        const x0 = Math.max(0, Math.floor(viewLeft - offsetX))
        const x1 = Math.min(world.width, Math.ceil(viewRight - offsetX))
        const y0 = Math.max(0, Math.floor(viewTop - offsetY))
        const y1 = Math.min(world.height, Math.ceil(viewBottom - offsetY))
        
        if (x0 >= x1 || y0 >= y1) continue
        
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const food = world.food(x, y)
            if (food === -1) {
              ctx.fillStyle = "#666"
            } else if (food > 0) {
              const g = 64 + ((191 * food / world.maxFood) | 0)
              const r = 64 - ((64 * food / world.maxFood) | 0)
              ctx.fillStyle = `rgb(${r},${g},0)`
            } else {
              continue
            }
            ctx.fillRect(this.toScreenX(x + offsetX), this.toScreenY(y + offsetY), s, s)
          }
        }
      }
    }
    
    for (const a of world.animals) {
      const intensity = Math.min(1, a.energy / 200)
      const r = (a.color * intensity) | 0
      const b = ((255 - a.color) * intensity) | 0
      ctx.fillStyle = `rgb(${r},0,${b})`
      
      const sprite = a.rotatedSprite()
      const ps = s / 3
      
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const ax = a.x + ox * world.width
          const ay = a.y + oy * world.height
          
          if (ax + 3 < viewLeft || ax - 3 > viewRight) continue
          if (ay + 3 < viewTop || ay - 3 > viewBottom) continue
          
          const cx = this.toScreenX(ax) + s / 2
          const cy = this.toScreenY(ay) + s / 2
          
          for (let py = 0; py < 5; py++) {
            for (let px = 0; px < 5; px++) {
              if (sprite[py][px]) {
                const sx = cx + (px - 2) * ps - ps / 2
                const sy = cy + (py - 2) * ps - ps / 2
                ctx.fillRect(sx, sy, ps, ps)
              }
            }
          }
          
          if (a === this.selected) {
            ctx.strokeStyle = "#fff"
            ctx.lineWidth = 1
            ctx.strokeRect(cx - s, cy - s, s * 2, s * 2)
          }
        }
      }
    }
    
    let plantMass = 0
    for (let i = 0; i < world.grid.length; i++) {
      if (world.grid[i] > 0) plantMass += world.grid[i]
    }
    
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.font = "14px monospace"
    const hud = `creatures: ${world.animals.length}  plants: ${(plantMass / 1000) | 0}k  fps: ${this.fps}`
    ctx.fillText(hud, 8, h - 10)
    
    if (this.paused) {
      ctx.fillText("PAUSED", 8, h - 26)
    }
  }
  
  frame = (t) => {
    if (!this.running) return
    
    this.frameCount++
    if (t - this.fpsTime > 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsTime = t
    }
    
    if (!this.paused) {
      this.world.step()
    }
    
    this.updatePanel()
    this.draw()
    requestAnimationFrame(this.frame)
  }
  
  start() {
    if (this.running) return
    this.running = true
    requestAnimationFrame(this.frame)
  }
}
