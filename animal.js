import {deepCopy, evaluate, HERBIVORE, mutate} from "./lisp.js"

export class Animal {
    constructor(world, x, y, sprite = null, program = null) {
        this.world = world
        this.x = x
        this.y = y
        this.dx = 1
        this.dy = 0
        this.energy = 200
        this.wait = 0
        this.color = (Math.random() * 256) | 0
        this.sprite = sprite || this.generateSprite()
        this.program = program || HERBIVORE
    }

    generateSprite() {
        for (let attempt = 0; attempt < 100; attempt++) {
            const sprite = this.tryGenerateSprite()
            if (sprite) return sprite
        }
        return [
            [false, false, true, false, false],
            [false, true, true, true, false],
            [false, false, true, false, false],
            [false, true, false, true, false],
            [false, false, false, false, false],
        ]
    }

    tryGenerateSprite() {
        const sprite = Array.from({length: 5}, () => Array(5).fill(false))

        sprite[2][2] = true
        sprite[0][2] = true

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 3; x++) {
                if (Math.random() < 0.4) {
                    sprite[y][x] = true
                    sprite[y][4 - x] = true
                }
            }
        }

        sprite[0][0] = false
        sprite[0][4] = false
        sprite[4][0] = false
        sprite[4][4] = false

        if (!this.isConnected(sprite)) return null

        const count = sprite.flat().filter(Boolean).length
        if (count > 13) return null

        return sprite
    }

    isConnected(sprite) {
        let startX = -1, startY = -1
        outer: for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (sprite[y][x]) {
                    startX = x
                    startY = y
                    break outer
                }
            }
        }
        if (startX === -1) return false

        const visited = Array.from({length: 5}, () => Array(5).fill(false))
        const stack = [[startX, startY]]
        let count = 0

        while (stack.length > 0) {
            const [x, y] = stack.pop()
            if (x < 0 || x >= 5 || y < 0 || y >= 5) continue
            if (visited[y][x] || !sprite[y][x]) continue
            visited[y][x] = true
            count++
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
        }

        return count === sprite.flat().filter(Boolean).length
    }

    rotatedSprite() {
        let rotations = 0
        if (this.dx === 1) rotations = 1
        else if (this.dy === 1) rotations = 2
        else if (this.dx === -1) rotations = 3

        let s = this.sprite
        for (let r = 0; r < rotations; r++) {
            const rotated = Array.from({length: 5}, () => Array(5).fill(false))
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    rotated[x][4 - y] = s[y][x]
                }
            }
            s = rotated
        }
        return s
    }

    mutateSprite() {
        for (let attempt = 0; attempt < 30; attempt++) {
            const sprite = this.sprite.map(row => [...row])

            const y = (Math.random() * 5) | 0
            const x = (Math.random() * 3) | 0

            if ((y === 0 || y === 4) && x === 0) continue
            if (y === 2 && x === 2) continue
            if (y === 0 && x === 2) continue

            sprite[y][x] = !sprite[y][x]
            sprite[y][4 - x] = sprite[y][x]

            sprite[0][0] = false
            sprite[0][4] = false
            sprite[4][0] = false
            sprite[4][4] = false

            const count = sprite.flat().filter(Boolean).length
            if (count >= 4 && count <= 13 && this.isConnected(sprite)) {
                return sprite
            }
        }
        return this.sprite.map(row => [...row])
    }

    aheadX() {
        return (this.x + this.dx + this.world.width) % this.world.width
    }

    aheadY() {
        return (this.y + this.dy + this.world.height) % this.world.height
    }

    turnLeft() {
        const tmp = this.dx
        this.dx = this.dy
        this.dy = -tmp
        this.wait = 3
    }

    turnRight() {
        const tmp = this.dx
        this.dx = -this.dy
        this.dy = tmp
        this.wait = 3
    }

    turnRandom() {
        if (Math.random() < 0.5) {
            this.turnLeft()
        } else {
            this.turnRight()
        }
    }

    move() {
        const nx = this.aheadX()
        const ny = this.aheadY()
        const cell = this.world.food(nx, ny)
        if (cell < 0 || this.world.animalAt(nx, ny)) return
        this.x = nx
        this.y = ny
        this.wait = 5
    }

    moveBack() {
        const nx = (this.x - this.dx + this.world.width) % this.world.width
        const ny = (this.y - this.dy + this.world.height) % this.world.height
        const cell = this.world.food(nx, ny)
        if (cell < 0 || this.world.animalAt(nx, ny)) return
        this.x = nx
        this.y = ny
        this.wait = 5
    }

    eat() {
        const food = Math.min(this.world.food(this.x, this.y), 100)
        this.energy += food
        this.world.setFood(this.x, this.y, this.world.food(this.x, this.y) - food)
        this.wait = 5
    }

    hit() {
        const nx = this.aheadX()
        const ny = this.aheadY()
        const target = this.world.animalAt(nx, ny)
        if (target) {
            this.world.setFood(nx, ny, this.world.food(nx, ny) + target.energy)
            target.energy = -1000
            this.wait = 3
        }
    }

    fork(percentage) {
        percentage = Math.max(3, Math.min(97, percentage))

        const childSprite = Math.random() < 0.35 ? this.mutateSprite() : this.sprite.map(row => [...row])
        const childProgram = Math.random() < 0.35 ? mutate(this.program) : deepCopy(this.program)

        const child = new Animal(this.world, this.x, this.y, childSprite, childProgram)
        child.dx = -this.dx
        child.dy = -this.dy
        child.color = (this.color + ((Math.random() * 20 - 10) | 0) + 256) % 256

        this.energy = (this.energy * 0.90) | 0
        child.energy = (this.energy * percentage / 100) | 0
        this.energy = (this.energy * (100 - percentage) / 100) | 0

        child.move()
        this.world.animals.push(child)
        this.wait = 10
        child.wait = 10
    }

    step() {
        if (this.wait > 0) {
            this.wait--
            return
        }

        if (!this.execution) {
            this.execution = evaluate(this.program, this)
        }

        const result = this.execution.next()
        if (result.done) {
            this.execution = null
        }
    }
}