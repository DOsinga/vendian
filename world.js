import { Animal } from "./animal.js"

export class World {
  constructor() {
    this.width = 240
    this.height = 160
    this.maxFood = 800

    this.grid = new Int16Array(this.width * this.height)
    this.animals = []
    this.generation = 0

    this.placeObstacles()
    for (let i = 0; i < this.width; i++) {
      this.foodBlob()
    }

    for (let i = 0; i < 80; i++) {
      this.spawnAnimal()
    }
  }

  idx(x, y) {
    return y * this.width + x
  }

  food(x, y) {
    return this.grid[this.idx(x, y)]
  }

  setFood(x, y, v) {
    this.grid[this.idx(x, y)] = v
  }

  animalAt(x, y) {
    return this.animals.find(a => a.x === x && a.y === y)
  }

  spawnAnimal() {
    let x, y
    do {
      x = (Math.random() * this.width) | 0
      y = (Math.random() * this.height) | 0
    } while (this.food(x, y) < 0 || this.animalAt(x, y))
    this.animals.push(new Animal(this, x, y))
  }

  placeObstacles() {
    const count = (this.width * this.height / 300) | 0
    const extra = count * 2

    for (let i = 0; i < count; i++) {
      const x = (Math.random() * this.width) | 0
      const y = (Math.random() * this.height) | 0
      this.setFood(x, y, -1)
    }

    for (let i = 0; i < extra; i++) {
      let x, y
      do {
        x = (Math.random() * this.width) | 0
        y = (Math.random() * this.height) | 0
      } while (this.food(x, y) !== -1)

      if (Math.random() < 0.5) {
        x = (x + this.width + (Math.random() < 0.5 ? -1 : 1)) % this.width
      } else {
        y = (y + this.height + (Math.random() < 0.5 ? -1 : 1)) % this.height
      }
      this.setFood(x, y, -1)
    }
  }

  foodBlob() {
    const cx = (Math.random() * this.width) | 0
    const cy = (Math.random() * this.height) | 0
    const radius = 8

    for (let dx = -radius; dx <= radius; dx++) {
      const x = (cx + dx + this.width) % this.width
      const sqY = Math.sqrt(radius * radius - dx * dx) | 0
      for (let dy = -sqY; dy <= sqY; dy++) {
        const y = (cy + dy + this.height) % this.height
        const dist = Math.abs(dx) + Math.abs(dy)
        const amount = ((this.maxFood * (1 - dist / radius)) | 0) || 1
        const i = this.idx(x, y)
        if (this.grid[i] >= 0) {
          this.grid[i] = Math.min(this.maxFood, this.grid[i] + amount)
        }
      }
    }
  }

  step() {
    if (Math.random() * 20 < 1) {
      this.foodBlob()
    }

    for (const animal of this.animals) {
      animal.step()
      animal.energy--
    }

    this.animals = this.animals.filter(a => {
      if (a.energy < 1 || Math.random() < 0.0005) {
        this.setFood(a.x, a.y, this.food(a.x, a.y) + a.energy)
        return false
      }
      return true
    })

    while (this.animals.length < 30) {
      this.spawnAnimal()
    }
  }
}