{Sprite} = require './render.coffee'
{Vector, Direction, Box} = require './geometry.coffee'
{TILE_SIZE} = constants = require './constants.coffee'
assets = require './assets.coffee'

DIRTS = [
  'dirt-1',
  'dirt-2',
  'dirt-3',
  'grass'
]

class Wall extends Sprite
  constructor: (@pos) ->
    super @pos, 'wall-front'

  renderbox: ->
    new Box(
      new Vector(@pos.x, @pos.y - TILE_SIZE * 2),
      new Vector(TILE_SIZE, 3 * TILE_SIZE)
    )

exports.Map = class Map
  constructor: (@size) ->
    @ground = ((DIRTS[Math.floor Math.random() * DIRTS.length] for [0...@size.y]) for [0...@size.x])

    # Probabilistic BFS cave-digging
    ###
    @walls = ((true for [0...@size.x]) for [0...@size.y])

    queue = [
      new Vector(Math.floor(@size.x / 2), Math.floor(@size.y / 2))
    ]

    dugProportion = 0

    until queue.length is 0
      examine = queue.shift()

      @walls[examine.x][examine.y] =
        @walls[@size.x - examine.x][@size.y - examine.y] =
        @walls[@size.x - examine.x][examine.y] =
        @walls[examine.x][@size.y - examine.y] = false

      possibilities = [
        examine.plus(new Vector 0, 1),
        examine.plus(new Vector 0, -1),
        examine.plus(new Vector 1, 0),
        examine.plus(new Vector -1, 0)
      ].filter (v) => 0 <= v.x <= @size.x / 2 and 0 < v.y <= @size.y / 2 and @walls[v.x][v.y]

      for possibility in possibilities
        if Math.random() < 0.8 ** dugProportion
          queue.push possibility
          dugProportion += 1 / (@size.x * @size.y)
    ###

    # Four-pillars probabilistic BFS wall-building
    @walls = ((false for [0...@size.x]) for [0...@size.y])
    queue = [
      new Vector(Math.floor(@size.x / 4), Math.floor(@size.y / 4))
    ]

    dugProportion = 0

    until queue.length is 0
      examine = queue.shift()

      @walls[examine.x][examine.y] =
        @walls[@size.x - examine.x - 1][@size.y - examine.y - 1] =
        @walls[@size.x - examine.x - 1][examine.y] =
        @walls[examine.x][@size.y - examine.y - 1] = true

      possibilities = [
        examine.plus(new Vector 0, 1),
        examine.plus(new Vector 0, -1),
        examine.plus(new Vector 1, 0),
        examine.plus(new Vector -1, 0)
      ].filter (v) => 0 <= v.x <= @size.x / 2 and 0 <= v.y <= @size.y / 2 and not @walls[v.x][v.y]

      for possibility in possibilities
        if Math.random() < 0.02 ** dugProportion
          queue.push possibility
          dugProportion += 1 / (@size.x * @size.y)

    ###
    # Random room placement cave-digging. Digs 4-7 rooms.
    @walls = ((true for [0...@size.x]) for [0...@size.y])
    for [0...Math.ceil(Math.random() * 3) + 4]
      size = new Vector Math.floor(Math.random() * 6 + 6), Math.floor(Math.random() * 6 + 6)
      corner = new Vector Math.floor(Math.random() * (@size.x - size.x)), Math.floor(Math.random() * (@size.y - size.y))

      for x in [corner.x...corner.x + size.x]
        for y in [corner.y...corner.y + size.y]
          @walls[x][y] = false

    # Then dig tunnels between the rooms
    ###

    @wallSprites = []

    for col, x in @walls
      for w, y in col when w
        @wallSprites.push new Wall new Vector x * TILE_SIZE, y * TILE_SIZE

  wallAt: (x, y) ->
    if 0 <= x < @size.x and 0 <= y < @size.y
      return @walls[x][y]
    else
      return true

  renderGround: (renderContext) ->
    tilesToRender = renderContext.viewport().toTiles()

    {canvas, ctx, camera} = renderContext

    ctx.save()

    ctx.translate(
      -camera.x + renderContext.halfPoint.x,
      -camera.y + renderContext.halfPoint.y
    )

    for x in [Math.max(0, tilesToRender.corner.x - 1)...Math.min(@size.x, tilesToRender.corner.x + tilesToRender.size.x + 1)]
      for y in [Math.max(0, tilesToRender.corner.y - 1)...Math.min(@size.y, tilesToRender.corner.y + tilesToRender.size.y + 1)]
        unless @walls[x][y]
          ctx.drawImage assets.getAsset(@ground[x][y]), x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE

    ctx.restore()
