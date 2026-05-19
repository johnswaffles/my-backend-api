extends Node3D

const Kit = preload("res://scripts/cozy_visual_kit.gd")

const PROPERTY_ROWS := [
	{"label": "HOUSE", "variants": ["suburban cottage", "modern boxy", "farmhouse", "townhome"], "colors": ["f4e3cf", "e7eef0", "f2e8d8", "ece2d2"], "roofs": ["c87349", "55728e", "8d5b40", "7c9359"], "parking": "driveway"},
	{"label": "FIRE DEPT", "variants": ["classic brick", "modern civic", "volunteer", "industrial"], "colors": ["c94f45", "d85c4e", "bd443f", "b93f3a"], "roofs": ["34383d", "3e4248", "4b4542", "30353a"], "parking": "apron"},
	{"label": "BANK", "variants": ["traditional", "modern glass", "brick branch", "premium"], "colors": ["dfe8ef", "d8e3ea", "b96b58", "e9edf0"], "roofs": ["557da1", "3f6078", "53616e", "6c7f90"], "parking": "small_lot"},
	{"label": "GROCERY", "variants": ["local market", "green super", "warehouse", "organic"], "colors": ["f2e8d8", "e8ecd8", "e3ddca", "f6ecd5"], "roofs": ["6faf5f", "5c9c52", "668f53", "74a66a"], "parking": "medium_lot"},
	{"label": "TASTY BITES", "variants": ["diner", "bistro", "family", "upscale patio"], "colors": ["f7d9bf", "ffe4d2", "f3ddc8", "ead8c9"], "roofs": ["c96b5f", "d77758", "b85b4f", "d96f4f"], "parking": "small_lot"},
	{"label": "QUICK MART", "variants": ["quick mart", "canopy mart", "urban shop", "mini-mart"], "colors": ["f2e8d8", "e8edf0", "fdebd7", "e7dfc4"], "roofs": ["557da1", "4f76a0", "66839a", "416d96"], "parking": "compact_lot"},
]

@onready var camera: Camera3D = $Camera3D
@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func _ready() -> void:
	_setup_camera()
	_setup_lighting()
	_build_showcase_grid()


func _setup_camera() -> void:
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 18.5
	camera.position = Vector3(14.0, 8.2, 15.5)
	camera.look_at(Vector3(0.0, 1.35, -4.0), Vector3.UP)


func _setup_lighting() -> void:
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color("a8d5ff")
	sky_material.sky_horizon_color = Color("f7e4ba")
	sky_material.ground_bottom_color = Color("7dae69")
	sky_material.ground_horizon_color = Color("d4e4a5")
	var sky := Sky.new()
	sky.sky_material = sky_material
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = 3
	env.ambient_light_color = Color(0.86, 0.86, 0.76)
	env.ambient_light_energy = 0.9
	env.fog_enabled = false
	env.glow_enabled = true
	env.glow_bloom = 0.018
	env.glow_intensity = 0.085
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.02
	env.adjustment_contrast = 1.1
	env.adjustment_saturation = 1.08
	world_environment.environment = env
	sun.rotation_degrees = Vector3(-50.0, 32.0, 0.0)
	sun.light_color = Color(1.0, 0.84, 0.58)
	sun.light_energy = 1.58
	sun.shadow_enabled = true
	sun.shadow_blur = 2.7
	fill_light.rotation_degrees = Vector3(-22.0, 150.0, 0.0)
	fill_light.light_color = Color(0.66, 0.76, 1.0)
	fill_light.light_energy = 0.17
	fill_light.shadow_enabled = false


func _build_showcase_grid() -> void:
	var width := 24.0
	var depth := 23.0
	Kit.box(self, Vector3(0.0, -0.04, -5.0), Vector3(width, 0.05, depth), Kit.material(Kit.GRASS, 0.94))
	_add_showcase_road(width)
	for row_index in range(PROPERTY_ROWS.size()):
		var row := PROPERTY_ROWS[row_index] as Dictionary
		var row_z := 5.3 - float(row_index) * 3.25
		_add_row_label(str(row["label"]), Vector3(-11.25, 0.08, row_z + 0.98))
		for variant_index in range(4):
			var variant_label := str((row["variants"] as Array)[variant_index])
			_add_variant_label(variant_label, Vector3(-8.5 + float(variant_index) * 5.3, 0.08, row_z + 1.0))
			for tier in range(1, 5):
				var x := -9.55 + float(variant_index) * 5.3 + float(tier - 1) * 1.04
				_build_property_sample(row, variant_index, tier, Vector3(x, 0.0, row_z))


func _add_showcase_road(width: float) -> void:
	Kit.box(self, Vector3(0.0, 0.02, 7.4), Vector3(width, 0.04, 1.45), Kit.material("2f3438", 0.95))
	Kit.box(self, Vector3(0.0, 0.06, 6.25), Vector3(width, 0.06, 0.68), Kit.material("cec6b8", 0.9))
	Kit.box(self, Vector3(0.0, 0.09, 6.68), Vector3(width, 0.04, 0.08), Kit.material(Kit.CURB, 0.9))
	for x in [-10.0, -8.2, -6.4, -4.6, -2.8, -1.0, 0.8, 2.6, 4.4, 6.2, 8.0, 9.8]:
		Kit.box(self, Vector3(x, 0.115, 7.4), Vector3(0.46, 0.014, 0.055), Kit.material(Kit.YELLOW, 0.7))
	for x in [-9.0, -6.0, -3.0, 0.0, 3.0, 6.0, 9.0]:
		Kit.add_streetlight(self, Vector3(x, 0.08, 6.0))


func _build_property_sample(row: Dictionary, variant_index: int, tier: int, position_3d: Vector3) -> void:
	var root := Node3D.new()
	root.position = position_3d
	add_child(root)
	var color := str((row["colors"] as Array)[variant_index])
	var roof := str((row["roofs"] as Array)[variant_index])
	var label := str(row["label"])
	var parking := str(row["parking"])
	var width := 0.66 + float(tier) * 0.1
	var depth := 0.54 + float(tier) * 0.07
	var height := 0.46 + float(tier) * 0.1
	Kit.box(root, Vector3(0.0, 0.025, 0.0), Vector3(0.96, 0.05, 1.16), Kit.material("eee8dc", 0.92))
	Kit.box(root, Vector3(0.0, 0.065, 0.42), Vector3(0.82, 0.035, 0.42), Kit.material("555b60", 0.96))
	_add_mini_parking(root, parking, tier)
	Kit.soft_box(root, Vector3(0.0, height * 0.5 + 0.1, -0.28), Vector3(width, height, depth), Kit.material(color, 0.88), 0.08)
	_add_variant_roof(root, variant_index, tier, Vector3(0.0, height + 0.18, -0.28), Vector3(width + 0.16, 0.14, depth + 0.14), roof)
	_add_mini_facade(root, label, variant_index, tier, width, height)
	if tier >= 3:
		Kit.soft_box(root, Vector3(0.28, 0.42, -0.58), Vector3(width * 0.36, height * 0.72, depth * 0.56), Kit.material(color, 0.9), 0.06)
	if tier >= 4:
		Kit.soft_box(root, Vector3(0.0, height + 0.44, -0.34), Vector3(width * 0.72, 0.48, depth * 0.64), Kit.material(color, 0.9), 0.06)
		_add_window(root, Vector3(0.0, height + 0.42, 0.02), Vector3(0.22, 0.2, 0.035))
		Kit.box(root, Vector3(0.0, height + 0.76, -0.34), Vector3(width * 0.82, 0.1, depth * 0.72), Kit.material(roof, 0.78))
	Kit.add_bush(root, Vector3(-0.42, 0.08, 0.28), 0.28)
	Kit.add_bush(root, Vector3(0.42, 0.08, 0.28), 0.28)


func _add_mini_parking(root: Node3D, parking: String, tier: int) -> void:
	if parking == "driveway":
		Kit.box(root, Vector3(-0.28, 0.092, 0.46), Vector3(0.28, 0.028, 0.64), Kit.material("b8a58b", 0.9))
		return
	var spaces := clampi(tier, 1, 4)
	for index in range(spaces):
		var x := -0.3 + float(index) * 0.2
		Kit.box(root, Vector3(x, 0.105, 0.42), Vector3(0.022, 0.01, 0.32), Kit.material(Kit.WHITE, 0.9))
	if parking == "apron":
		Kit.box(root, Vector3(0.0, 0.115, 0.44), Vector3(0.62, 0.022, 0.08), Kit.material("f1d072", 0.72))


func _add_variant_roof(root: Node3D, variant_index: int, tier: int, center: Vector3, size: Vector3, color: String) -> void:
	if variant_index == 0 or variant_index == 2:
		Kit.box(root, center, Vector3(size.x, size.y, size.z), Kit.material(color, 0.78))
		var ridge := Kit.box(root, center + Vector3(0.0, 0.09, 0.0), Vector3(size.x * 0.66, 0.06, size.z * 0.18), Kit.material(color, 0.76))
		ridge.rotation_degrees.x = 0.0
	else:
		Kit.box(root, center, Vector3(size.x, size.y, size.z), Kit.material(color, 0.78))
		Kit.box(root, center + Vector3(0.0, 0.08, size.z * 0.46), Vector3(size.x, 0.06, 0.06), Kit.material("34383d", 0.84))
	if tier >= 3:
		Kit.box(root, center + Vector3(-size.x * 0.22, 0.14, -size.z * 0.18), Vector3(0.14, 0.08, 0.12), Kit.material("d9dde0", 0.78))


func _add_mini_facade(root: Node3D, label: String, variant_index: int, tier: int, width: float, height: float) -> void:
	if label == "FIRE DEPT":
		for x in [-width * 0.18, width * 0.18]:
			Kit.box(root, Vector3(x, 0.33, 0.02), Vector3(0.22, 0.4, 0.04), Kit.material("383d42", 0.88))
	elif label == "BANK" and variant_index == 0:
		for x in [-width * 0.32, 0.0, width * 0.32]:
			Kit.cylinder(root, Vector3(x, 0.4, 0.04), 0.026, 0.56, Kit.material(Kit.TRIM, 0.86))
	elif label == "BANK" and variant_index == 1:
		Kit.box(root, Vector3(0.0, 0.48, 0.045), Vector3(width * 0.68, 0.5, 0.035), Kit.transparent_material(Kit.GLASS, 0.24, 0.25))
	else:
		for x in [-width * 0.24, width * 0.24]:
			_add_window(root, Vector3(x, 0.46, 0.03), Vector3(0.18, 0.22, 0.035))
	Kit.box(root, Vector3(0.0, height + 0.06, 0.05), Vector3(width * 0.58, 0.08, 0.04), Kit.material("fff4df", 0.84))
	if label != "HOUSE":
		Kit.box(root, Vector3(0.0, height + 0.14, 0.075), Vector3(width * 0.46, 0.1, 0.035), Kit.material("ffd067", 0.76))


func _add_window(root: Node3D, position_3d: Vector3, size: Vector3) -> void:
	Kit.box(root, position_3d + Vector3(0.0, 0.0, -0.006), size + Vector3(0.06, 0.05, 0.01), Kit.material(Kit.TRIM, 0.86))
	Kit.box(root, position_3d, size, Kit.material(Kit.GLASS, 0.35, "ffe7a8", 0.08))


func _add_row_label(text: String, position_3d: Vector3) -> void:
	_add_label(text, position_3d, 22, Color("2f3335"))


func _add_variant_label(text: String, position_3d: Vector3) -> void:
	_add_label(text, position_3d, 13, Color("4d5962"))


func _add_label(text: String, position_3d: Vector3, font_size: int, color: Color) -> void:
	var label := Label3D.new()
	label.text = text
	label.font_size = font_size
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.position = position_3d
	add_child(label)
