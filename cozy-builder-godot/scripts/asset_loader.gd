extends RefCounted

const MANIFEST_PATH := "res://assets/asset_manifest.json"

var _manifest: Dictionary = {}
var _texture_cache: Dictionary = {}


func _init() -> void:
	_load_manifest()


func _load_manifest() -> void:
	if not FileAccess.file_exists(MANIFEST_PATH):
		_manifest = {}
		return
	var file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if file == null:
		_manifest = {}
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	_manifest = parsed if parsed is Dictionary else {}


func get_definition(group: String, asset_id: String) -> Dictionary:
	if not _manifest.has(group):
		return {}
	var group_dict: Dictionary = _manifest[group]
	return group_dict.get(asset_id, {})


func get_texture(path: String) -> Texture2D:
	if path == "":
		return null
	var candidate_paths: Array[String] = []
	if path.ends_with(".svg"):
		var png_path := path.trim_suffix(".svg") + ".png"
		candidate_paths.append(png_path)
	candidate_paths.append(path)
	for candidate in candidate_paths:
		if _texture_cache.has(candidate):
			return _texture_cache[candidate]
		var image := Image.new()
		var load_error := image.load(ProjectSettings.globalize_path(candidate))
		if load_error == OK:
			var texture := ImageTexture.create_from_image(image)
			_texture_cache[candidate] = texture
			return texture
	return null


func resolve_variant(group: String, asset_id: String, variation_index: int = 0, direction: String = "south", tier: int = 1) -> Dictionary:
	var definition := get_definition(group, asset_id)
	if definition.is_empty():
		return {}
	var variations: Array = definition.get("variations", [])
	if variations.is_empty():
		return {}
	var safe_index := posmod(variation_index, variations.size())
	var variant: Dictionary = variations[safe_index]
	var path := ""
	var directions: Dictionary = variant.get("directions", {})
	if not directions.is_empty():
		path = str(directions.get(direction, directions.get("south", "")))
	if path == "":
		var tiers: Dictionary = variant.get("tiers", {})
		if not tiers.is_empty():
			path = str(tiers.get(str(tier), tiers.get("1", "")))
	if path == "":
		path = str(variant.get("path", ""))
	var layers: Array = []
	var raw_layers: Array = variant.get("layers", [])
	for layer_value in raw_layers:
		if layer_value is not Dictionary:
			continue
		var layer: Dictionary = layer_value
		var layer_path := str(layer.get("path", ""))
		var layer_directions: Dictionary = layer.get("directions", {})
		if not layer_directions.is_empty():
			layer_path = str(layer_directions.get(direction, layer_directions.get("south", layer_path)))
		var layer_tiers: Dictionary = layer.get("tiers", {})
		if not layer_tiers.is_empty():
			layer_path = str(layer_tiers.get(str(tier), layer_tiers.get("1", layer_path)))
		layers.append({
			"id": str(layer.get("id", "layer")),
			"path": layer_path,
			"world_size": layer.get("world_size", variant.get("world_size", definition.get("world_size", [1.0, 1.0]))),
			"pixel_height": layer.get("pixel_height", variant.get("pixel_height", definition.get("pixel_height", 512))),
			"mode": str(layer.get("mode", "upright")),
			"position": layer.get("position", [0.0, 0.0, 0.0]),
			"rotation": layer.get("rotation", [0.0, 0.0, 0.0]),
			"casts_shadow": bool(layer.get("casts_shadow", true)),
			"alpha": float(layer.get("alpha", 1.0)),
		})
	var resolved := {
		"id": str(variant.get("id", "default")),
		"path": path,
		"layers": layers,
		"world_size": variant.get("world_size", definition.get("world_size", [1.0, 1.0])),
		"pixel_height": variant.get("pixel_height", definition.get("pixel_height", 512)),
		"category": str(definition.get("category", group)),
		"scale": float(definition.get("scale", 1.0)),
		"supports_variations": bool(definition.get("supports_variations", false)),
		"prompt_template": str(definition.get("prompt_template", "")),
	}
	return resolved
