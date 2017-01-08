{Archer, Mage, Rogue, Knight} = require './classes.coffee'
{Vector, Direction, Box} = require './geometry.coffee'
{RenderContext} = require './render.coffee'
{PLAYER_HEIGHT, TILE_SIZE} = constants = require './constants.coffee'
assets = require './assets.coffee'
{Map} = require './map.coffee'

class Spectator
  constructor: (@pos) ->
    @currentlyControlled = true

  tick: (state) ->
    if @currentlyControlled
      vector = {x: 0, y: 0}

      # WASD
      if state.keys[65]
        vector.x -= 1
      if state.keys[68]
        vector.x += 1
      if state.keys[87]
        vector.y -= 1
      if state.keys[83]
        vector.y += 1

      vector = new Vector vector.x, vector.y

      if vector.magnitude() > 0
        @pos = @pos.plus vector.normalize().times 4

class Game
  constructor: (canvas, initialPlayers) ->
    ctx = canvas.getContext '2d'
    camera = new Vector 0, 0

    @renderContext = new RenderContext canvas, ctx, camera

    @leader = @spectator = new Spectator(new Vector TILE_SIZE, TILE_SIZE)

    @map = new Map(new Vector(50, 50))

    @gameState = {
      players: initialPlayers
      bullets: []
      time: 0
      mousepos: new Vector 0, 0
      leftmouse: false
      keys: {}
      createPlayer: (player) =>
        @gameState.players.push player
      createBullet: (bullet) =>
        @gameState.bullets.push bullet
    }

    @actionBuffer = {
      keys: {}
      leftmouse: false
    }

    @trueState = {
      leftmouse: false
      mousepos: new Vector 0, 0
      keys: {}
    }

    @renderHooks = []

    canvas.addEventListener 'keydown', (event) =>
      @trueState.keys[event.which] = true
      @actionBuffer.keys[event.which] = true

    canvas.addEventListener 'keyup', (event) =>
      @trueState.keys[event.which] = false

    canvas.addEventListener 'mousedown', (event) =>
      if event.which is 1
        @trueState.leftmouse = true
        @actionBuffer.leftmouse = true

    canvas.addEventListener 'mouseup', (event) =>
      if event.which is 1
        @trueState.leftmouse = false

    canvas.addEventListener 'mousemove', (event) =>
      @trueState.mousepos = (new Vector(event.offsetX, event.offsetY))

  addRenderHook: (hook) ->
    @renderHooks.push hook

  setLeader: (newLeader) ->
    @leader.currentlyControlled = false
    @leader = newLeader
    @leader.currentlyControlled = true

  tick: ->
    # Filter everything in the buffers through.
    # We register the mouse as down if the mouse was ever down just before this click.
    # Same for keys (this is the purpose of actionBuffer).
    for key, val of @trueState.keys
      @gameState.keys[key] = val

    for key, val of @actionBuffer.keys
      @gameState.keys[key] or= val
      @actionBuffer.keys[key] = false

    @gameState.leftmouse = @trueState.leftmouse or @actionBuffer.leftmouse
    @actionBuffer.leftmouse = false

    @gameState.mousepos = @trueState.mousepos.plus(@renderContext.camera).minus(@renderContext.halfPoint)

    # Process everyone's ticks
    @gameState.players.forEach (player) =>
      player.tick @gameState

    @gameState.bullets.forEach (bullet) =>
      bullet.tick @gameState

    @spectator.tick @gameState

    # Remove dead characters and bullets
    @gameState.players = @gameState.players.filter (player) -> not player.downflag
    @gameState.bullets = @gameState.bullets.filter (bullet) -> not bullet.downflag

    @gameState.players.forEach (player) =>
      pos = player.pos.minus(new Vector(TILE_SIZE / 2, TILE_SIZE / 2)).times 1 / TILE_SIZE
      v = player.velocity.times 1 / TILE_SIZE

      if v.x > 0 and (
          @map.wallAt(Math.ceil(pos.x + v.x), Math.floor(pos.y)) or
          @map.wallAt(Math.ceil(pos.x + v.x), Math.ceil(pos.y))
        )
        newx = Math.ceil pos.x
      else if v.x < 0 and (
          @map.wallAt(Math.floor(pos.x + v.x), Math.floor(pos.y)) or
          @map.wallAt(Math.floor(pos.x + v.x), Math.ceil(pos.y))
        )
        newx = Math.floor pos.x
      else
        newx = pos.x + v.x

      if v.y > 0 and (
          @map.wallAt(Math.floor(pos.x), Math.ceil(pos.y + v.y)) or
          @map.wallAt(Math.ceil(pos.x), Math.ceil(pos.y + v.y))
        )
        newy = Math.ceil pos.y
      else if v.y < 0 and (
          @map.wallAt(Math.floor(pos.x), Math.floor(pos.y + v.y)) or
          @map.wallAt(Math.ceil(pos.x), Math.floor(pos.y + v.y))
        )
        newy = Math.floor pos.y
      else
        newy = pos.y + v.y

      player.pos = new Vector newx * TILE_SIZE + TILE_SIZE / 2, newy * TILE_SIZE + TILE_SIZE / 2

    @gameState.time += 1

    @renderContext.ctx.clearRect 0, 0, @renderContext.canvas.width, @renderContext.canvas.height

    # Compile everything and render
    renderList = @gameState.players.concat @gameState.bullets.concat @map.wallSprites
    renderList.sort (a, b) -> a.pos.y - b.pos.y
    @renderContext.camera = @leader.pos

    @map.renderGround @renderContext
    renderList.forEach (sprite) =>
      sprite.render @renderContext

    @renderHooks.forEach (fn) => fn @

loadCode = (name) ->
  return localStorage["#{name}-code"] ? "//#{name}"

saveCode = (name, code) ->
  return localStorage["#{name}-code"] = code

playGame = ->
  controllables = {
    'rogue': new Rogue('USER', new Vector(TILE_SIZE / 2, TILE_SIZE / 2))
    'archer': new Archer('USER', new Vector(TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))
    'mage': new Mage('USER', new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2))
    'knight': new Knight('USER', new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))
  }

  for key, player of controllables
    player.installCode localStorage["#{key}-code"]

  mapCorner = new Vector 51 * TILE_SIZE, 51 * TILE_SIZE

  enemies = {
    'rogue': new Rogue('ENEMY', mapCorner.minus new Vector(TILE_SIZE / 2, TILE_SIZE / 2))
    'archer': new Archer('ENEMY', mapCorner.minus new Vector(TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))
    'mage': new Mage('ENEMY', mapCorner.minus new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2))
    'knight': new Knight('ENEMY', mapCorner.minus new Vector(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2))
  }

  for key, player of enemies
    player.installCode localStorage["#{key}-code"]

  canvas = document.getElementById('viewport')

  game = new Game(canvas, [
    controllables.rogue,
    controllables.knight,
    controllables.archer,
    controllables.mage,
    enemies.rogue,
    enemies.knight,
    enemies.archer,
    enemies.mage
  ])

  healthbars = {}

  minimapCanvas = document.getElementById 'minimap'
  minimap = minimapCanvas.getContext '2d'

  for key of controllables when key isnt 'spectator'
    healthbars[key] = document.getElementById "#{key}-health"

  game.addRenderHook ->
    for key, player of controllables when key isnt 'spectator'
      healthbars[key].style.right = 50 * (1 - player.health / player.maxHealth)

    # Draw the minimap
    minimap.clearRect 0, 0, minimapCanvas.width, minimapCanvas.height

    minimap.fillStyle = '#000'
    for x in [0...game.map.size.x]
      for y in [0...game.map.size.y]
        if game.map.walls[x][y]
          minimap.fillRect(
            x * minimapCanvas.width / game.map.size.x,
            y * minimapCanvas.height / game.map.size.y,
            minimapCanvas.width / game.map.size.x,
            minimapCanvas.height / game.map.size.y
          )

    for player in game.gameState.players
      if player.allegiance is 'USER'
        minimap.fillStyle = '#0F0'
      else
        minimap.fillStyle = '#F00'

      {x, y} = player.pos.times(1 / TILE_SIZE)
      minimap.fillRect(
        x * minimapCanvas.width / game.map.size.x,
        y * minimapCanvas.height / game.map.size.y,
        minimapCanvas.width / game.map.size.x,
        minimapCanvas.height / game.map.size.y
      )

    minimap.fillStyle = '#00F'
    {x, y} = controllables.spectator.pos.times(1 / TILE_SIZE)
    minimap.fillRect(
      x * minimapCanvas.width / game.map.size.x,
      y * minimapCanvas.height / game.map.size.y,
      minimapCanvas.width / game.map.size.x,
      minimapCanvas.height / game.map.size.y
    )

  controllables.spectator = game.spectator

  # DEBUGGING
  window.game = game

  lastLeaderElement = document.getElementById 'spectator-face'

  for key, player of controllables then do (key, player) ->
    element = document.getElementById("#{key}-face")

    element.onclick = ->
      lastLeaderElement.className = 'hero-face'
      element.className = 'hero-face hero-face-selected'
      lastLeaderElement = element

      game.setLeader player
      canvas.focus()

  tick = ->
    if game.gameState.players.filter((x) -> x.allegiance is 'USER').length is 0
      do lose
    else if game.gameState.players.filter((x) -> x.allegiance is 'ENEMY').length is 0
      do win
    else
      setTimeout tick, 1000 / 60

    game.tick()

  do tick

  canvas.focus()

menus = document.getElementById 'menu-elements'
game = document.getElementById 'game-elements'
edit = document.getElementById 'edit-elements'

lose = ->
  menus.style.display = 'block'
  game.style.display = 'none'

win = ->
  menus.style.display = 'block'
  game.style.display = 'none'

main = ->
  aceEditor = ace.edit document.getElementById 'editor'
  aceEditor.session.setMode 'ace/mode/javascript'
  aceEditor.setTheme 'ace/theme/chrome'

  document.getElementById('play').addEventListener 'click', ->
    menus.style.display = 'none'
    game.style.display = 'block'
    do playGame

  document.getElementById('edit').addEventListener 'click', ->
    menus.style.display = 'none'
    edit.style.display = 'block'

  document.getElementById('exit').addEventListener 'click', ->
    edit.style.display = 'none'
    menus.style.display = 'block'

    for key, session of editables
      saveCode key, session.getValue()

  editables = {
    'knight': ace.createEditSession loadCode('knight'), 'ace/mode/javascript'
    'rogue': ace.createEditSession loadCode('rogue'), 'ace/mode/javascript'
    'archer': ace.createEditSession loadCode('archer'), 'ace/mode/javascript'
    'mage': ace.createEditSession loadCode('mage'), 'ace/mode/javascript'
  }

  lastEditTabElement = document.getElementById 'knight-edit'

  setTab = (name) ->
    element = document.getElementById("#{name}-edit")

    lastEditTabElement.className = 'hero-face'
    element.className = 'hero-face hero-face-selected'
    lastEditTabElement = element

    aceEditor.setSession editables[name]

  for key, session of editables then do (key) ->
    element = document.getElementById("#{key}-edit")

    element.addEventListener 'click', ->
      setTab key

  setTab 'knight'

# Load assets and invoke
assets.loadAssets main
