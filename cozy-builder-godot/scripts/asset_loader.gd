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
	if path.ends_with(".svg"):
		var png_path := path.trim_suffix(".svg") + ".png"
		if ResourceLoader.exists(png_path):
			path = png_path
	if _texture_cache.has(path):
		return _texture_cache[path]
	var texture := load(path) as Texture2D
	if texture:
		_texture_cache[path] = texture
	return texture


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
	var resolved := {
		"id": str(variant.get("id", "default")),
		"path": path,
		"world_size": variant.get("world_size", definition.get("world_size", [1.0, 1.0])),
		"pixel_height": variant.get("pixel_height", definition.get("pixel_height", 512)),
		"category": str(definition.get("category", group)),
		"scale": float(definition.get("scale", 1.0)),
		"supports_variations": bool(definition.get("supports_variations", false)),
		"prompt_template": str(definition.get("prompt_template", "")),
	}
	return resolved
