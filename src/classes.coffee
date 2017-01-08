{PlayerCharacter, CharacterTexturePack, Bullet} = require './player.coffee'
{Vector, Box, Direction} = require './geometry.coffee'

# ARCHER
class Arrow extends Bullet
  constructor: (time, @pos, direction, strength, allegiance) ->
    super(
      'arrow',
      @pos,
      Arrow.SIZE,
      direction.vector().times(Arrow.MAX_SPEED * (1 - 1 / strength)),
      time + Arrow.MAX_LIFETIME * (1 - 1 / strength),
      Arrow.MAX_DAMAGE * (1 - 1 / strength),
      allegiance
    )

Arrow.MAX_SPEED = 60
Arrow.MAX_DAMAGE = 110
Arrow.MAX_LIFETIME = 60
Arrow.SIZE = new Vector 25, 10

exports.Archer = class Archer extends PlayerCharacter
  constructor: (allegiance, pos) ->
    super pos, new CharacterTexturePack(
      'archer-side-passive-left'
      'archer-side-passive-right'
      'archer-side-active-left'
      'archer-side-active-right'
    ), allegiance

    @type = 'ARCHER'
    @nockStart = 0
    @nocked = false

  serialize: ->
    {
      @type,
      pos: @pos.serialize(),
      @health,
      attackDirection: @attackDirection.angle,
      motionDirection: @motionDirection.angle,
      @nocked
    }

  specialSetupHook: (interpreter, scope) ->
    interpreter.setProperty scope, 'nock', interpreter.createNativeFunction =>
      @nock @lastKnownGameState

    interpreter.setProperty scope, 'release', interpreter.createNativeFunction =>
      @release @lastKnownGameState

  nock: (state) ->
    unless @nocked
      @nocked = @active = true
      @nockStart = state.time

  release: (state) ->
    if @nocked
      @nocked = @active = false

      # Fire an arrow
      state.createBullet new Arrow(
        state.time,
        @pos.minus(new Vector(0, 25)),
        @attackDirection,
        state.time - @nockStart,
        @allegiance
      )

  tick: (state) ->
    super

    # Archers cannot move while drawing their bow
    if @nocked
      @velocity = new Vector 0, 0

    # Left mouse button turns on/off nocked
    if @currentlyControlled
      if not @nocked and state.leftmouse
        @nock state
      else if @nocked and not state.leftmouse
        @release state

# MAGE
class Firelob extends Bullet
  constructor: (time, position, target, @allegiance) ->
    @launchday = time
    @landday = time + Firelob.AIRTIME
    @deathday = time + Firelob.AIRTIME + Firelob.EXPLODE_TIME

    @texture = 'fireball'

    @length = target.x - position.x
    @beginning = position.x

    # We pretend to have a velocity to the right
    # since we're a strange bullet
    @velocity = new Vector(1, 0)

    @target = target
    @pos = position
    @size = Firelob.SIZE

    # Create a parabola from the position to the target

    # First, determine a linear function.
    slope = (target.y - position.y) / (target.x - position.x)

    @flying = true

    # We now have the line y = slope * (x - position.x) + position.y.
    # We want to make a little parabolic arc above this line, so we add a parabola
    # that is 0 at target x and position x.
    @parabola = (x) ->
      slope * (x - position.x) + position.y -
        (x - position.x) * (target.x - x) * (Firelob.HEIGHT * 4 / ((target.x - position.x) ** 2))

    @particles = []

  render: (renderContext) ->
    if @flying
      super

    else
      {ctx, camera, canvas} = renderContext

      ctx.save()

      ctx.translate -camera.x + canvas.width / 2, -camera.y + canvas.height / 2

      if not @flying
        for particle in @particles
          ctx.fillStyle = particle.color
          ctx.fillRect particle.pos.x, particle.pos.y, particle.size, particle.size

      ctx.restore()

  tick: (state) ->
    # Parabolic arc
    if state.time <= @landday
      x = (state.time - @launchday) / Firelob.AIRTIME * @length + @beginning
      @pos = new Vector x, @parabola x

    else if @flying
      @flying = false

      for [0...Firelob.PARTICLES + Math.ceil Math.random() * (Firelob.PARTICLES)]
        @particles.push new FireParticle(
          @target,
          Math.random() * Firelob.MAX_PARTICLE_SIZE,
          (new Direction(Math.random() * 2 * Math.PI)).vector().times(Firelob.MAX_SPEED * Math.random()),
          "rgb(255, #{Math.floor(Math.random() * 255)}, 0)"
        )

      state.players.filter((x) => x.allegiance isnt @allegiance and x.pos.minus(@target).magnitude() < Firelob.SPLASH).forEach (player) =>
        player.damage Firelob.DAMAGE

    else
      @particles.forEach (particle) ->
        particle.pos = particle.pos.plus particle.velocity
        particle.velocity = particle.velocity.times 0.8

    if state.time >= @deathday
      @downflag = true

Firelob.AIRTIME = 60
Firelob.EXPLODE_TIME = 20
Firelob.HEIGHT = 100
Firelob.SPRAY = 3
Firelob.SIZE = new Vector 25, 25
Firelob.MAX_SPEED = 30
Firelob.PARTICLES = 15
Firelob.MAX_PARTICLE_SIZE = 25
Firelob.SPLASH = 125
Firelob.DAMAGE = 50

class FireParticle
  constructor: (@pos, @size, @velocity, @color) ->

exports.Mage = class Mage extends PlayerCharacter
  constructor: (allegiance, pos) ->
    super pos, new CharacterTexturePack(
      'mage-side-passive-left'
      'mage-side-passive-right'
      'mage-side-active-left'
      'mage-side-active-right'
    ), allegiance

    @type = 'MAGE'
    @casting = false
    @lastCast = 0

    @specialSetupCode = '''
    function cast(target) {
      _cast(target.x, target.y);
    }
    '''

  serialize: ->
    {
      @type,
      pos: @pos.serialize(),
      @health,
      attackDirection: @attackDirection.angle,
      motionDirection: @motionDirection.angle,
      @casting
    }

  cast: (state, target) ->
    if not @casting and state.time - @lastCast >= Mage.COOLDOWN
      state.createBullet new Firelob(
        state.time,
        @pos.minus(new Vector(0, 25)),
        target,
        @allegiance
      )

      @lastCast = state.time
      @casting = @active = true

  specialSetupHook: (interpreter, scope) ->
    interpreter.setProperty scope, '_cast', interpreter.createNativeFunction (x, y) =>
      @cast @lastKnownGameState, new Vector x.toNumber(), y.toNumber()

  # Mages cannot move while casting fireball
  tick: (state) ->
    super

    if @casting
      @velocity = new Vector 0, 0

      # We are finished casting after DURATION ticks.
      if state.time - @lastCast >= Mage.DURATION
        @casting = false
        @active = false

    if @currentlyControlled
      # Clicking casts
      if not @casting and state.time - @lastCast >= Mage.COOLDOWN and state.leftmouse
        @cast state, state.mousepos

Mage.DURATION = 90
Mage.COOLDOWN = 120

# KNIGHT
exports.Knight = class Knight extends PlayerCharacter
  constructor: (allegiance, pos) ->
    super pos, new CharacterTexturePack(
      'knight-side-passive-left'
      'knight-side-passive-right'
      'knight-side-active-left'
      'knight-side-active-right'
    ), allegiance

    @type = 'KNIGHT'
    @striking = false
    @lastStrike = 0

    # Knights have extra health
    @health = @maxHealth = 200

  serialize: ->
    {
      @type,
      pos: @pos.serialize(),
      @health,
      attackDirection: @attackDirection.angle,
      motionDirection: @motionDirection.angle,
      @striking
    }

  strike: (state) ->
    if not @striking and state.time - @lastStrike >= Knight.COOLDOWN
      @lastStrike = state.time
      @striking = @active = true

      state.players.forEach (player) =>
        # No friendly fire (we hit only enemies.
        if player.allegiance isnt @allegiance
          vector = player.pos.minus(@pos)

          # Determine if this player is in range; if so, damage
          # them
          if vector.magnitude() < Knight.RANGE and Math.abs(
                vector.direction().minus(@attackDirection).angle
              ) < Knight.SWEEP
            player.damage Knight.DAMAGE

  specialSetupHook: (interpreter, scope) ->
    interpreter.setProperty scope, 'strike', interpreter.createNativeFunction (x, y) =>
      @strike @lastKnownGameState

  # Mages cannot move while casting fireball
  tick: (state) ->
    if @striking and state.time - @lastStrike > Knight.DURATION
      @striking = @active = false

    super

    if @currentlyControlled
      # Clicking strikes
      if not @striking and state.time - @lastStrike >= Knight.COOLDOWN and state.leftmouse
        @strike state

Knight.COOLDOWN = 40
Knight.DURATION = 20
Knight.RANGE = 50
Knight.SWEEP = Math.PI / 2
Knight.DAMAGE = 40

# ROGUE
exports.Rogue = class Rogue extends PlayerCharacter
  constructor: (allegiance, pos) ->
    super pos, new CharacterTexturePack(
      'rogue-side-passive-left'
      'rogue-side-passive-right'
      'rogue-side-active-left'
      'rogue-side-active-right'
    ), allegiance

    @type = 'ROGUE'
    @striking = false
    @lastStrike = 0

    # Rogues have extra speed
    @speed = 8

  serialize: ->
    {
      @type,
      pos: @pos.serialize(),
      @health,
      attackDirection: @attackDirection.angle,
      motionDirection: @motionDirection.angle,
    }

  strike: (state) ->
    if not @striking and state.time - @lastStrike >= Rogue.COOLDOWN
      @lastStrike = state.time
      @striking = @active = true

      state.players.forEach (player) =>
        # No friendly fire (we hit only enemies.
        if player.allegiance isnt @allegiance
          vector = player.pos.minus(@pos)

          # Determine if this player is in range; if so, damage
          # them
          if vector.magnitude() < Rogue.RANGE and Math.abs(
                vector.direction().minus(@attackDirection).angle
              ) < Rogue.SWEEP
            player.damage Rogue.DAMAGE

  specialSetupHook: (interpreter, scope) ->
    interpreter.setProperty scope, 'strike', interpreter.createNativeFunction (x, y) =>
      @strike @lastKnownGameState

  # Mages cannot move while casting fireball
  tick: (state) ->
    if @striking and state.time - @lastStrike > Rogue.DURATION
      @striking = @active = false

    super

    if @currentlyControlled
      # Clicking strikes
      if not @striking and state.time - @lastStrike >= Rogue.COOLDOWN and state.leftmouse
        @strike state

Rogue.COOLDOWN = 30
Rogue.DURATION = 20
Rogue.RANGE = 40
Rogue.SWEEP = Math.PI / 4
Rogue.DAMAGE = 30
