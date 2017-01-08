{Vector, Box, Direction} = require './geometry.coffee'
{Sprite} = require './render.coffee'
{PLAYER_HEIGHT, TILE_SIZE} = constants = require './constants.coffee'
assets = require './assets.coffee'
Interpreter = require 'js-interpreter'

exports.CharacterTexturePack = class CharacterTexturePack
  constructor: (@passiveLeft, @passiveRight, @activeLeft, @activeRight) ->

exports.PlayerCharacter = class PlayerCharacter extends Sprite
  constructor: (
    @pos,
    @textures,
    @allegiance
  ) ->
    # Textures is a CharacterTexturePack
    @texture = @textures.passiveRight

    texture = assets.getAsset @texture

    # All PlayerCharacters are 50px tall.
    @size = new Vector(
      texture.width / texture.height * PLAYER_HEIGHT,
      PLAYER_HEIGHT
    )

    # Is this character being controlled by the user?
    @currentlyControlled = false

    # Type of character this is
    @type = 'BLANK'

    # Character stats
    @health = @maxHealth = 100
    @speed = 4

    # Are we in active or passive mode?
    @active = false

    # Attack and motion directions
    @attackDirection = new Direction 0
    @motionDirection = new Direction 0
    @moving = false

    # BEGIN INTERPRETER SETUP
    # =======================
    @specialSetupCode = ''

    @persistentState = {}
    @lastKnownGameState = {}

    @installCode '', false

  installCode: (code, persistState) ->
    if persistState
      interpreter.appendCode('_savePersistentState(JSON.stringify(state));')
      interpreter.run()
    else
      @persistenState = {}

    # Initialize the interpreter
    @interpreter = new Interpreter INITIALIZATION_CODE + """
    #{@specialSetupCode}

    function tick() {
      #{code}
    }
    """, (interpreter, scope) =>

      interpreter.setProperty scope, '_getPersistentState', interpreter.createNativeFunction =>
        return JSON.stringify @persistentState
      interpreter.setProperty scope, '_savePersistentState', interpreter.createNativeFunction (string) =>
         @persistentState =JSON.parse string

      interpreter.setProperty scope, '_update', interpreter.createNativeFunction =>
        return interpreter.createPrimitive JSON.stringify {
          players: @lastKnownGameState.players.map (x) -> x.serialize()
          bullets: @lastKnownGameState.bullets.map (x) -> x.serialize()
          self: @serialize()
          time: @lastKnownGameState.time
        }

      interpreter.setProperty scope, '_setMotionDirection', interpreter.createNativeFunction (angle) =>
        @motionDirection = new Direction angle.toNumber()
        return

      interpreter.setProperty scope, '_setAttackDirection', interpreter.createNativeFunction (angle) =>
        @attackDirection = new Direction angle.toNumber()
        return

      interpreter.setProperty scope, 'setMoving', interpreter.createNativeFunction (value) =>
        @moving = value.toBoolean()
        return

      @specialSetupHook interpreter, scope

  specialSetupHook: ->

  render: (renderContext) ->
    {canvas, ctx, camera} = renderContext

    ctx.strokeStyle = '#F00'

    ctx.strokeRect(
      @pos.x - TILE_SIZE / 2 - camera.x + renderContext.halfPoint.x,
      @pos.y - TILE_SIZE / 2 - camera.y + renderContext.halfPoint.y,
      TILE_SIZE,
      TILE_SIZE
    )

    super

  renderbox: ->
    # "Pos" is the position of the center of the feet.
    new Box(
      @pos.minus(new Vector(@size.x / 2, @size.y)),
      @size
    )

  hitbox: ->
    # All characters are 25px wide
    new Box(
      @pos.minus(new Vector(PLAYER_HEIGHT / 4, PLAYER_HEIGHT))
      new Vector(PLAYER_HEIGHT / 2, PLAYER_HEIGHT)
    )

  serialize: ->
    {
      @type,
      pos: @pos.serialize(),
      @health,
      attackDirection: @attackDirection.angle,
      motionDirection: @motionDirection.angle,
    }

  damage: (x) ->
    @health -= x

  tick: (state) ->
    @lastKnownGameState = state

    # If we are currently controlled, respond to keypresses and mouse
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

      # Move in the desired direction
      @motionDirection = vector.direction()
      @moving = vector.magnitude() isnt 0

      # Face the mouse
      @attackDirection = state.mousepos.minus(@pos).direction()

    # Otherwise, run our script code (We run script code exactly 5 times per second, for performance reasons)
    else if state.time % 12 is 0
      @interpreter.appendCode 'update(); tick();'

      # Run up to 10,000 steps of JavaScript code.
      ###
      for [1...10000]
        unless @interpreter.step()
          break
      ###

      # For now we'll just run all code
      @interpreter.run()

    # Move in the desired direction
    if @moving
      @velocity = @motionDirection.vector().times @speed
    else
      @velocity = new Vector 0, 0

    # Adjust texture according to state
    if Math.abs(@attackDirection.angle) < Math.PI / 2
      if @active
        @texture = @textures.activeRight
      else
        @texture = @textures.passiveRight
    else
      if @active
        @texture = @textures.activeLeft
      else
        @texture = @textures.passiveLeft

    if @health <= 0
      @downflag = true

    super

exports.Bullet = class Bullet extends Sprite
  constructor: (@texture, @pos, @size, @velocity, @deathday, @damage, @allegiance) ->

  serialize: ->
    {
      pos: @pos.serialize(),
      velocity: @velocity.serialize(),
      @allegiance
    }

  # Bullets have rotated direction.
  render: (renderContext) ->
    {canvas, ctx, camera} = renderContext

    ctx.save()

    ctx.translate -camera.x + canvas.width / 2, -camera.y + canvas.height / 2
    ctx.translate @pos.x, @pos.y
    ctx.rotate @velocity.direction().angle
    ctx.translate -@size.x / 2, -@size.y / 2
    ctx.drawImage assets.getAsset(@texture), 0, 0, @size.x, @size.y

    ctx.restore()

  tick: (state) ->
    @pos = @pos.plus @velocity

    if state.time >= @deathday
      @downflag = true

    state.players.forEach (player) =>
      if player.allegiance isnt @allegiance and player.hitbox().contains @pos
        player.damage @damage
        @downflag = true

# INITIALIZATION CODE FOR INTERPRETER SANDBOX
# Defines simple geometry classes for use by players.
INITIALIZATION_CODE = '''
var Box, Direction, Vector,
  modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

Vector = (function() {
  function Vector(x, y) {
    Object.defineProperty(this, 'x', {
      writable: false,
      value: x
    });
    Object.defineProperty(this, 'y', {
      writable: false,
      value: y
    });
  }

  Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  };

  Vector.prototype.minus = function(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  };

  Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  Vector.prototype.times = function(s) {
    return new Vector(this.x * s, this.y * s);
  };

  Vector.prototype.normalize = function() {
    return this.times(1 / this.magnitude());
  };

  Vector.prototype.direction = function() {
    if (this.x === 0 && this.y === 0) {
      return new Direction(0);
    } else {
      return new Direction(Math.atan2(this.y, this.x));
    }
  };

  return Vector;

})();

Direction = (function() {
  function Direction(angle) {
    angle = modulo(angle, 2 * Math.PI);
    if (angle > Math.PI) {
      angle -= 2 * Math.PI;
    }
    Object.defineProperty(this, 'angle', {
      writable: false,
      value: angle
    });
  }

  Direction.prototype.vector = function() {
    return new Vector(Math.cos(this.angle), Math.sin(this.angle));
  };

  Direction.prototype.plus = function(other) {
    return new Direction(this.angle + other.angle);
  };

  Direction.prototype.minus = function(other) {
    return new Direction(this.angle - other.angle);
  };

  Direction.prototype.times = function(s) {
    return new Direction(this.angle * s);
  };

  return Direction;

})();

Box = (function() {
  function Box(corner, size) {
    Object.defineProperty(this, 'corner', {
      writable: false,
      value: corner
    });
    Object.defineProperty(this, 'size', {
      writable: false,
      value: size
    });
  }

  Box.prototype.center = function() {
    return this.corner.plus(this.size.times(0.5));
  };

  Box.prototype.contains = function(point) {
    var ref, ref1;
    return (this.corner.x < (ref = point.x) && ref < this.corner.x + this.size.x) && (this.corner.y < (ref1 = point.y) && ref1 < this.corner.y + this.size.y);
  };

  Box.prototype.intersects = function(box) {
    return !(box.corner.x + box.corner.size.x < this.corner.x || this.corner.x + this.corner.size.x < box.corner.x || boy.corner.y + boy.corner.size.y < this.corner.y || this.corner.y + this.corner.size.y < boy.corner.y);
  };

  return Box;

}());

var players = [], bullets = [], self = {}, time = 0;

function update() {
  var data = JSON.parse(_update());

  players = data.players.map(function(player) {
    player.pos = new Vector(player.pos.x, player.pos.y);
    player.motionDirection = new Direction(player.motionDirection);
    player.attackDirection = new Direction(player.attackDirection);
    return player;
  });

  bullets = data.bullets.map(function(bullet) {
    bullet.pos = new Vector(bullet.pos.x, bullet.pos.y);
    bullet.velocity = new Vector(bullet.velocity.x, bullet.velocity.y);
    return bullet;
  });

  self = data.self;
  self.pos = new Vector(self.pos.x, self.pos.y);
  self.attackDirection = new Vector(self.pos.x, self.pos.y);
}

var state = JSON.parse(_getPersistentState());

function getPersistentState() {
  return JSON.stringify(state);
}

function setMotionDirection(dir) {
  _setMotionDirection(dir.angle);
}

function setAttackDirection(dir) {
  _setAttackDirection(dir.angle);
}
'''
