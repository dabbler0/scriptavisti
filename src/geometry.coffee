{TILE_SIZE} = require './constants.coffee'

# Vector.
# Vectors are immutable.
exports.Vector = class Vector
  constructor: (x, y) ->
    Object.defineProperty @, 'x', {
      writable: false
      value: x
    }
    Object.defineProperty @, 'y', {
      writable: false
      value: y
    }

  plus: (other) ->
    new Vector @x + other.x, @y + other.y

  minus: (other) ->
    new Vector @x - other.x, @y - other.y

  magnitude: ->
    Math.sqrt @x * @x + @y * @y

  times: (s) ->
    new Vector @x * s, @y * s

  normalize: -> @times 1 / @magnitude()

  direction: ->
    if @x is 0 and @y is 0
      return new Direction 0
    else
      return new Direction Math.atan2 @y, @x

  serialize: -> {@x, @y}

  floor: -> new Vector Math.floor(@x), Math.floor(@y)
  ceil: -> new Vector Math.ceil(@x), Math.ceil(@y)

# Direction
# Directions are immutable.
exports.Direction = class Direction
  constructor: (angle) ->

    angle = angle %% (2 * Math.PI)
    if angle > Math.PI
      angle -= 2 * Math.PI

    Object.defineProperty @, 'angle', {
      writable: false
      value: angle
    }

  vector: ->
    new Vector Math.cos(@angle), Math.sin(@angle)

  plus: (other) ->
    new Direction @angle + other.angle

  minus: (other) ->
    new Direction @angle - other.angle

  times: (s) ->
    new Direction @angle * s

# Hitbox
exports.Box = class Box
  constructor: (corner, size) ->
    Object.defineProperty @, 'corner', {
      writable: false
      value: corner
    }
    Object.defineProperty @, 'size', {
      writable: false
      value: size
    }

  center: ->
    @corner.plus @size.times 0.5

  contains: (point) ->
    return @corner.x < point.x < @corner.x + @size.x and
           @corner.y < point.y < @corner.y + @size.y

  intersects: (box) ->
    return not (
      box.corner.x + box.size.x < @corner.x or
      @corner.x + @size.x < box.corner.x or
      box.corner.y + box.size.y < @corner.y or
      @corner.y + @size.y < box.corner.y
    )

  toTiles: ->
    new Box(
      @corner.times(1 / TILE_SIZE).floor(),
      @size.times(1 / 25).ceil()
    )
