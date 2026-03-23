extends SceneTree

const MANIFEST_PATH := "res://assets/asset_manifest.json"


func _initialize() -> void:
	var manifest_text := FileAccess.get_file_as_string(MANIFEST_PATH)
	var parsed: Variant = JSON.parse_string(manifest_text)
	if parsed is Dictionary:
		_rasterize_manifest(parsed)
	quit()


func _rasterize_manifest(manifest: Dictionary) -> void:
	for group_value in manifest.values():
		if group_value is not Dictionary:
			continue
		var group_dict: Dictionary = group_value
		for definition_value in group_dict.values():
			if definition_value is not Dictionary:
				continue
			var definition: Dictionary = definition_value
			var variations: Array = definition.get("variations", [])
			for variation_value in variations:
				if variation_value is not Dictionary:
					continue
				var variation: Dictionary = variation_value
				var path := str(variation.get("path", ""))
				if path.ends_with(".svg"):
					_rasterize_svg(path)


func _rasterize_svg(svg_path: String) -> void:
	var source_text := FileAccess.get_file_as_string(svg_path)
	if source_text == "":
		return
	var image := Image.new()
	var error := image.load_svg_from_string(source_text)
	if error != OK:
		push_error("Failed to rasterize %s" % svg_path)
		return
	var png_path := svg_path.trim_suffix(".svg") + ".png"
	image.save_png(ProjectSettings.globalize_path(png_path))
