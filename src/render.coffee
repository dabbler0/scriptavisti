{Vector, Direction, Box} = require './geometry.coffee'
assets = require './assets.coffee'

exports.RenderContext = class RenderContext
  constructor: (@canvas, @ctx, @camera) ->
    @halfPoint = new Vector @canvas.width / 2, @canvas.height / 2

  viewport: ->
    return new Box(
      @camera.minus(@halfPoint),
      new Vector(@canvas.width, @canvas.height)
    )

exports.Sprite = class Sprite
  constructor: (
    @pos,
    @texture
  ) ->
    @velocity = new Vector 0, 0

    # Downflag is true when we should be deleted before
    # the next tick
    @downflag = false

  hitbox: ->

  renderbox: ->

  render: (renderContext) ->
    ctx = renderContext.ctx
    canvas = renderContext.canvas

    # Calculate the position of the sprite on the screen
    renderbox = @renderbox()

    # If we are on the screen, draw us
    if renderbox.intersects renderContext.viewport()
      trueRenderbox = new Box(
        renderbox.corner.minus(renderContext.camera).plus(renderContext.halfPoint),
        renderbox.size
      )

      ctx.drawImage(
        assets.getAsset(@texture),
        trueRenderbox.corner.x, trueRenderbox.corner.y,
        trueRenderbox.size.x, trueRenderbox.size.y
      )

  tick: ->
