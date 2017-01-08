exports.loadedAssets = loadedAssets = {}

# TODO don't know if this dummy asset actually works
DUMMY_ASSET = new Image()

exports.getAsset = (asset) ->
  if asset of loadedAssets
    return loadedAssets[asset]
  else
    return DUMMY_ASSET

ASSET_LIST = [
  'goblin-side-passive-right',
  'goblin-side-active-right',
  'goblin-side-passive-left',
  'goblin-side-active-left',
  'rogue-side-passive-right',
  'rogue-side-active-right',
  'rogue-side-passive-left',
  'rogue-side-active-left',
  'mage-side-passive-right',
  'mage-side-active-right',
  'mage-side-passive-left',
  'mage-side-active-left',
  'knight-side-passive-right',
  'knight-side-active-right',
  'knight-side-passive-left',
  'knight-side-active-left',
  'archer-side-passive-right',
  'archer-side-active-right',
  'archer-side-passive-left',
  'archer-side-active-left',
  'fireball'
  'dirt-1',
  'dirt-2',
  'dirt-3',
  'wall-front',
  'wall-top',
  'grass',
  'arrow'
]

ASSET_URLS = {}

ASSET_LIST.forEach (name) ->
  ASSET_URLS[name] = "./assets/#{name}.png"

# Load a single asset
loadAsset = (name, callback) ->
  loadedAssets[name] = new Image()
  loadedAssets[name].onload = callback
  loadedAssets[name].src = ASSET_URLS[name]

# Load all assets sequentially
exports.loadAssets = (callback) ->
  loadLoop = (index) ->
    if index < ASSET_LIST.length
      loadAsset ASSET_LIST[index], ->
        loadLoop index + 1
    else
      callback exports.loadedAssets

  loadLoop 0
