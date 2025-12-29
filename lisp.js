const FOOD_HERE = "food-here"
const FOOD_AHEAD = "food-ahead"
const MY_ENERGY = "my-energy"

const IF = "if"
const BEGIN = "begin"
const FOR = "for"

const MOVE = "move"
const MOVE_BACK = "move-back"
const TURN_LEFT = "turn-left"
const TURN_RIGHT = "turn-right"
const TURN_RANDOM = "turn-random"
const EAT = "eat"
const FORK = "fork"
const HIT = "hit"

const ACTIONS = [MOVE, MOVE_BACK, TURN_LEFT, TURN_RIGHT, TURN_RANDOM, EAT, FORK, HIT]
const SENSORS = [FOOD_HERE, FOOD_AHEAD, MY_ENERGY]

export function* evaluate(expr, animal) {
  if (expr === null) return false
  if (typeof expr === "number") return expr
  if (typeof expr === "string") return expr

  const [op, ...args] = expr

  switch (op) {
    case FOOD_HERE: return animal.world.food(animal.x, animal.y)
    case FOOD_AHEAD: return animal.world.food(animal.aheadX(), animal.aheadY())
    case MY_ENERGY: return animal.energy

    case "+": return (yield* evaluate(args[0], animal)) + (yield* evaluate(args[1], animal))
    case "-": return (yield* evaluate(args[0], animal)) - (yield* evaluate(args[1], animal))
    case "*": return (yield* evaluate(args[0], animal)) * (yield* evaluate(args[1], animal))
    case "/": {
      const b = yield* evaluate(args[1], animal)
      return b === 0 ? 0 : ((yield* evaluate(args[0], animal)) / b) | 0
    }

    case ">": return (yield* evaluate(args[0], animal)) > (yield* evaluate(args[1], animal))
    case "<": return (yield* evaluate(args[0], animal)) < (yield* evaluate(args[1], animal))
    case "=": return (yield* evaluate(args[0], animal)) === (yield* evaluate(args[1], animal))

    case IF:
      return (yield* evaluate(args[0], animal))
        ? yield* evaluate(args[1], animal)
        : yield* evaluate(args[2], animal)

    case BEGIN: {
      let result
      for (const a of args) {
        result = yield* evaluate(a, animal)
      }
      return result
    }

    case FOR: {
      const count = yield* evaluate(args[0], animal)
      for (let i = 0; i < count; i++) {
        yield* evaluate(args[1], animal)
      }
      return
    }

    case MOVE: animal.move(); yield; return
    case MOVE_BACK: animal.moveBack(); yield; return
    case TURN_LEFT: animal.turnLeft(); yield; return
    case TURN_RIGHT: animal.turnRight(); yield; return
    case TURN_RANDOM: animal.turnRandom(); yield; return
    case EAT: animal.eat(); yield; return
    case FORK: animal.fork(yield* evaluate(args[0], animal)); yield; return
    case HIT: animal.hit(); yield; return

    default: return false
  }
}

export const HERBIVORE =
  [BEGIN,
    [IF, [">", [FOOD_HERE], 0],
      [BEGIN,
        [EAT],
        [IF, [">", [MY_ENERGY], 700], [FORK, 30], null]],
      [IF, [">", [FOOD_AHEAD], 0],
        [MOVE],
        [BEGIN,
          [FOR, 3,
            [BEGIN,
              [TURN_LEFT],
              [IF, [">", [FOOD_AHEAD], 0], [MOVE], null]]],
          [FOR, 4,
            [IF, [">", [FOOD_HERE], 0],
              [EAT],
              [MOVE]]]]]]]

export function toSexp(expr) {
  if (expr === null) return "nil"
  if (typeof expr === "number") return String(expr)
  if (typeof expr === "string") return expr

  const [op, ...args] = expr
  if (args.length === 0) return `(${op})`
  return `(${op} ${args.map(toSexp).join(" ")})`
}

export function toPretty(expr, indent = 0) {
  if (expr === null) return "nil"
  if (typeof expr === "number") return String(expr)
  if (typeof expr === "string") return expr

  const [op, ...args] = expr
  if (args.length === 0) return `(${op})`

  if (SENSORS.includes(op) || args.every(a => typeof a !== "object" || a === null)) {
    return `(${op} ${args.map(toSexp).join(" ")})`
  }

  const pad = "  ".repeat(indent + 1)
  const inner = args.map(a => pad + toPretty(a, indent + 1)).join("\n")
  return `(${op}\n${inner})`
}

// Mutation

export function deepCopy(expr) {
  if (expr === null) return null
  if (typeof expr !== "object") return expr
  return expr.map(deepCopy)
}

function collectPaths(expr, path = []) {
  const paths = [path]
  if (Array.isArray(expr)) {
    for (let i = 1; i < expr.length; i++) {
      paths.push(...collectPaths(expr[i], [...path, i]))
    }
  }
  return paths
}

function getAt(expr, path) {
  for (const i of path) expr = expr[i]
  return expr
}

function setAt(expr, path, value) {
  if (path.length === 0) return value
  const parent = getAt(expr, path.slice(0, -1))
  parent[path[path.length - 1]] = value
  return expr
}

function randomAction() {
  const action = ACTIONS[(Math.random() * ACTIONS.length) | 0]
  if (action === FORK) return [action, 20 + ((Math.random() * 60) | 0)]
  return [action]
}

function randomComparison() {
  const ops = [">", "<", "="]
  const sensor = [SENSORS[(Math.random() * SENSORS.length) | 0]]
  const value = (Math.random() * 100) | 0
  return [ops[(Math.random() * ops.length) | 0], sensor, value]
}

function mutateNode(node) {
  if (node === null) return randomAction()
  if (typeof node === "number") return Math.max(0, node + (((Math.random() * 40) | 0) - 20))
  if (typeof node === "string") return node

  const [op, ...args] = node

  if (SENSORS.includes(op)) {
    return [SENSORS[(Math.random() * SENSORS.length) | 0]]
  }
  if (ACTIONS.includes(op)) {
    return randomAction()
  }
  if ([">", "<", "="].includes(op)) {
    const ops = [">", "<", "="]
    return [ops[(Math.random() * ops.length) | 0], ...args]
  }
  if (op === IF) {
    return [IF, args[0], args[2], args[1]]
  }
  if (op === FOR) {
    const newCount = Math.max(1, (args[0] || 2) + (Math.random() < 0.5 ? 1 : -1))
    return [FOR, newCount, args[1]]
  }
  if (op === BEGIN) {
    const shuffled = [...args].sort(() => Math.random() - 0.5)
    return [BEGIN, ...shuffled]
  }

  return node
}

function simplifyNode(node) {
  if (node === null) return null
  if (typeof node === "number") return null
  if (typeof node === "string") return null

  const [op, ...args] = node

  if (SENSORS.includes(op) || ACTIONS.includes(op)) {
    return null
  }
  if ([">", "<", "="].includes(op)) {
    return null
  }
  if (op === IF) {
    return Math.random() < 0.5 ? args[1] : args[2]
  }
  if (op === FOR) {
    return args[1]
  }
  if (op === BEGIN) {
    return args[(Math.random() * args.length) | 0]
  }

  return null
}

export function mutate(program) {
  const expr = deepCopy(program)
  const paths = collectPaths(expr).filter(p => p.length > 0)
  if (paths.length === 0) return expr

  const path = paths[(Math.random() * paths.length) | 0]
  const node = getAt(expr, path)
  const parentPath = path.slice(0, -1)
  const parent = parentPath.length > 0 ? getAt(expr, parentPath) : null
  const index = path[path.length - 1]

  const roll = Math.random()

  if (roll < 0.25) {
    // Complexify - wrap in if or for
    if (Math.random() < 0.5) {
      setAt(expr, path, [IF, randomComparison(), deepCopy(node), deepCopy(node)])
    } else {
      setAt(expr, path, [FOR, 2, deepCopy(node)])
    }
  } else if (roll < 0.5) {
    // Mutate in place
    setAt(expr, path, mutateNode(node))
  } else if (roll < 0.75) {
    // Duplicate
    if (parent && parent[0] === BEGIN) {
      parent.splice(index, 0, deepCopy(node))
    } else {
      setAt(expr, path, [BEGIN, deepCopy(node), deepCopy(node)])
    }
  } else {
    // Simplify
    setAt(expr, path, simplifyNode(node))
  }

  return expr
}