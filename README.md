# Vendian

An artificial life simulator where creatures run Lisp programs, compete for food, reproduce, and evolve through mutation.

**[Live Demo →](https://douwe.com/projects/vendian)**

![Vendian Screenshot](screenshot.png)

## About

Vendian is a rewrite of a Delphi project from 2002. The original idea: if genetics is our programming code, why not use programming code for the genetics of artificial life?

Creatures are simple programs competing in a toroidal world filled with food. They eat to gain energy, and when they have enough, they reproduce. During reproduction, their code is copied to offspring — but with mutations. Parameters change, expressions get duplicated or deleted, random code appears. Most mutations are harmful. Occasionally, one is better.

## How It Works

### The World
- Toroidal grid (wraps around)
- Green pixels are food (brighter = more)
- Gray pixels are obstacles
- Food grows in circular blobs over time

### Creatures
- Each creature has a position, direction, energy, and a program
- Energy depletes over time and through actions
- Eating food restores energy
- When energy is high enough, creatures can fork (reproduce)
- Color indicates genetic lineage — similar colors share ancestry

### The Language

Creatures run Lisp programs. Execution yields after each action (move, eat, turn, fork), giving other creatures a turn. Programs loop automatically.
```lisp
(if (> (food-here) 0)
  (if (> (my-energy) 700)
    (fork 30)
    (eat))
  (if (> (food-ahead) 0)
    (move)
    (turn-random)))
```

**Sensors:** `food-here`, `food-ahead`, `my-energy`

**Actions:** `move`, `move-back`, `turn-left`, `turn-right`, `turn-random`, `eat`, `fork`, `hit`

**Control:** `if`, `begin`, `for`

### Mutation

When creatures reproduce, their program may mutate:
- **Tweak**: change a number (700 → 680)
- **Swap**: replace an action with another
- **Simplify**: remove control structure, keep one branch
- **Duplicate**: copy an expression
- **Complexify**: wrap something in `if` or `for`

### Sprites

Creatures have 5×5 pixel sprites that are:
- Vertically symmetric
- Connected (no floating pixels)
- Rotated based on facing direction

Sprites mutate during reproduction too — flip a pixel, keep symmetry.

## Controls

- **Drag** to pan
- **Scroll** to zoom
- **Click** creature to inspect its program
- **Space** to pause
- **F** for fullscreen
- **Escape** to deselect

## Files
```
vendian/
├── index.html   # Entry point
├── world.js     # Grid, food, simulation loop
├── animal.js    # Creature state, actions, sprites
├── lisp.js      # Interpreter, mutation, pretty-printing
└── view.js      # Canvas rendering, controls, UI
```

## History

The original Vendian was written in Delphi in the 2000s. It used a BASIC-like assembly language with instructions like `MoveForward`, `TestFood`, `BrancheNonEqual`. This version replaces that with Lisp — more expressive, more readable, and better suited for tree-based mutation.

The execution model changed too. The original used a persistent program counter. This version uses JavaScript generators — programs yield on actions and resume where they left off, giving the expressiveness of coroutines with simple code.

## License

MIT
