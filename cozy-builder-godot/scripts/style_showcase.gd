extends Node3D

const Kit = preload("res://scripts/cozy_visual_kit.gd")

@onready var camera: Camera3D = $Camera3D
@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func _ready() -> void:
	_setup_camera()
	_setup_lighting()
	_build_showcase()


func _setup_camera() -> void:
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 13.5
	camera.position = Vector3(8.6, 9.2, 8.6)
	camera.look_at(Vector3(0.0, 0.6, 0.6), Vector3.UP)


func _setup_lighting() -> void:
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color("9ed1ff")
	sky_material.sky_horizon_color = Color("dbeed6")
	sky_material.ground_bottom_color = Color("7dae69")
	sky_material.ground_horizon_color = Color("cfe6b4")
	var sky := Sky.new()
	sky.sky_material = sky_material
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = 3
	env.ambient_light_color = Color(0.7, 0.8, 0.7)
	env.ambient_light_energy = 0.62
	env.fog_enabled = false
	env.glow_enabled = false
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.04
	env.adjustment_contrast = 0.96
	env.adjustment_saturation = 1.05
	world_environment.environment = env
	sun.rotation_degrees = Vector3(-60.0, 30.0, 0.0)
	sun.light_energy = 1.2
	sun.shadow_enabled = true
	sun.shadow_blur = 2.0
	fill_light.rotation_degrees = Vector3(-20.0, 150.0, 0.0)
	fill_light.light_energy = 0.32
	fill_light.shadow_enabled = false


func _build_showcase() -> void:
	Kit.box(self, Vector3(0.0, -0.03, 0.0), Vector3(21.5, 0.05, 8.2), Kit.material(Kit.GRASS, 0.94))
	_build_road_strip()
	var specs := [
		{"x": -7.8, "kind": "house"},
		{"x": -4.7, "kind": "fire"},
		{"x": -1.55, "kind": "bank"},
		{"x": 1.65, "kind": "grocery"},
		{"x": 4.85, "kind": "restaurant"},
		{"x": 7.95, "kind": "corner"},
	]
	for spec in specs:
		var lot := _lot_root(float(spec["x"]), -1.45)
		match str(spec["kind"]):
			"house":
				_build_house(lot)
			"fire":
				_build_fire(lot)
			"bank":
				_build_bank(lot)
			"grocery":
				_build_grocery(lot)
			"restaurant":
				_build_restaurant(lot)
			"corner":
				_build_corner(lot)
	for x in [-9.4, -6.2, -3.15, 0.1, 3.25, 6.4, 9.5]:
		Kit.add_tree(self, Vector3(x, 0.0, -3.42))
	for x in [-8.8, -5.6, -2.4, 0.8, 4.0, 7.2]:
		Kit.add_streetlight(self, Vector3(x, 0.0, 2.92))
	for x in [-2.6, 5.4]:
		Kit.add_bench(self, Vector3(x, 0.04, 3.22), deg_to_rad(0.0))
	Kit.add_tree(self, Vector3(-6.6, 0.0, 3.48))
	Kit.add_tree(self, Vector3(7.0, 0.0, 3.48))


func _build_road_strip() -> void:
	Kit.box(self, Vector3(0.0, 0.015, 1.85), Vector3(21.0, 0.04, 4.2), Kit.material(Kit.GRASS, 0.94))
	Kit.box(self, Vector3(0.0, 0.05, 0.44), Vector3(21.0, 0.05, 0.78), Kit.material(Kit.SIDEWALK, 0.86))
	Kit.box(self, Vector3(0.0, 0.05, 3.3), Vector3(21.0, 0.05, 0.78), Kit.material(Kit.SIDEWALK, 0.86))
	Kit.box(self, Vector3(0.0, 0.085, 1.85), Vector3(21.0, 0.08, 2.2), Kit.material(Kit.ROAD, 0.95))
	Kit.box(self, Vector3(0.0, 0.14, 0.7), Vector3(21.0, 0.035, 0.08), Kit.material(Kit.CURB, 0.9))
	Kit.box(self, Vector3(0.0, 0.14, 3.0), Vector3(21.0, 0.035, 0.08), Kit.material(Kit.CURB, 0.9))
	Kit.box(self, Vector3(0.0, 0.165, 1.24), Vector3(20.4, 0.015, 0.045), Kit.material(Kit.WHITE, 0.88))
	Kit.box(self, Vector3(0.0, 0.165, 2.46), Vector3(20.4, 0.015, 0.045), Kit.material(Kit.WHITE, 0.88))
	for x in range(-9, 10, 2):
		Kit.box(self, Vector3(float(x), 0.17, 1.85), Vector3(0.72, 0.02, 0.08), Kit.material(Kit.YELLOW, 0.68))
	for end_x in [-9.8, 9.8]:
		for stripe in range(5):
			var z := 1.2 + float(stripe) * 0.28
			Kit.box(self, Vector3(end_x, 0.18, z), Vector3(0.16, 0.02, 0.18), Kit.material(Kit.WHITE, 0.82))


func _lot_root(x: float, z: float) -> Node3D:
	var lot := Node3D.new()
	lot.position = Vector3(x, 0.0, z)
	add_child(lot)
	Kit.box(lot, Vector3(0.0, 0.02, 0.0), Vector3(2.75, 0.05, 2.7), Kit.material("d9d5bf", 0.94))
	Kit.box(lot, Vector3(0.0, 0.055, 1.08), Vector3(0.72, 0.04, 1.15), Kit.material(Kit.SIDEWALK, 0.86))
	Kit.add_hedge(lot, Vector3(-1.22, 0.08, -0.12), Vector3(0.12, 0.2, 1.8))
	Kit.add_hedge(lot, Vector3(1.22, 0.08, -0.12), Vector3(0.12, 0.2, 1.8))
	return lot


func _build_house(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.42, -0.42), Vector3(1.25, 0.84, 1.05), Kit.material(Kit.WALL, 0.9))
	Kit.box(lot, Vector3(0.0, 0.95, -0.42), Vector3(1.52, 0.22, 1.28), Kit.material("c87349", 0.74))
	Kit.box(lot, Vector3(0.0, 0.31, 0.15), Vector3(0.28, 0.58, 0.05), Kit.material("7d5437", 0.7))
	for x in [-0.42, 0.42]:
		Kit.box(lot, Vector3(x, 0.56, 0.13), Vector3(0.24, 0.28, 0.055), Kit.material("ffc15e", 0.08, "ffe09a", 0.28))
		Kit.add_bush(lot, Vector3(x, 0.08, 0.44), 0.36)
	Kit.add_hedge(lot, Vector3(0.0, 0.08, 1.06), Vector3(1.58, 0.14, 0.08))


func _build_fire(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.52, -0.44), Vector3(1.6, 1.04, 1.15), Kit.material("c94f45", 0.84))
	Kit.box(lot, Vector3(0.0, 1.12, -0.44), Vector3(1.8, 0.18, 1.28), Kit.material("34383d", 0.82))
	Kit.box(lot, Vector3(0.0, 0.38, 0.22), Vector3(0.72, 0.62, 0.06), Kit.material("383d42", 0.88))
	Kit.box(lot, Vector3(0.0, 0.8, 0.26), Vector3(1.08, 0.2, 0.06), Kit.material("f1d072", 0.78))
	for x in [-0.58, 0.58]:
		Kit.cylinder(lot, Vector3(x, 0.2, 0.78), 0.045, 0.4, Kit.material("f1d072", 0.72))


func _build_bank(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.48, -0.46), Vector3(1.55, 0.96, 1.08), Kit.material("dfe8ef", 0.9))
	Kit.box(lot, Vector3(0.0, 1.04, -0.46), Vector3(1.75, 0.18, 1.22), Kit.material("557da1", 0.78))
	for x in [-0.52, 0.0, 0.52]:
		Kit.cylinder(lot, Vector3(x, 0.42, 0.18), 0.055, 0.76, Kit.material(Kit.TRIM, 0.86))
	Kit.box(lot, Vector3(0.0, 0.32, 0.28), Vector3(0.28, 0.5, 0.05), Kit.material("6b7c8d", 0.72))
	for x in [-0.48, 0.48]:
		Kit.box(lot, Vector3(x, 0.6, 0.24), Vector3(0.24, 0.28, 0.05), Kit.material("ffc15e", 0.08, "ffe09a", 0.2))
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.1), Vector2(1.85, 0.72), 3, true)


func _build_grocery(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.48, -0.48), Vector3(1.85, 0.96, 1.2), Kit.material("f2e8d8", 0.9))
	Kit.box(lot, Vector3(0.0, 1.08, -0.48), Vector3(2.05, 0.2, 1.36), Kit.material(Kit.ROOF_GREEN, 0.76))
	Kit.box(lot, Vector3(0.0, 0.54, 0.2), Vector3(1.2, 0.46, 0.055), Kit.transparent_material(Kit.GLASS, 0.34, 0.28))
	Kit.box(lot, Vector3(0.0, 0.86, 0.27), Vector3(1.34, 0.2, 0.06), Kit.material("5fae54", 0.72))
	Kit.add_cart_rack(lot, Vector3(0.9, 0.08, 0.72), deg_to_rad(90.0))
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.12), Vector2(2.1, 0.78), 4, true)


func _build_restaurant(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.45, -0.45), Vector3(1.62, 0.9, 1.1), Kit.material("f7d9bf", 0.88))
	Kit.box(lot, Vector3(0.0, 1.02, -0.45), Vector3(1.82, 0.2, 1.28), Kit.material(Kit.ROOF_RED, 0.74))
	Kit.box(lot, Vector3(0.0, 0.55, 0.2), Vector3(1.25, 0.14, 0.26), Kit.material("ef8b5f", 0.62))
	Kit.box(lot, Vector3(0.0, 0.32, 0.3), Vector3(0.28, 0.52, 0.05), Kit.material("8d543c", 0.7))
	for x in [-0.52, 0.52]:
		Kit.box(lot, Vector3(x, 0.56, 0.22), Vector3(0.28, 0.3, 0.05), Kit.material("ffc15e", 0.08, "ffe09a", 0.24))
	Kit.add_bench(lot, Vector3(-0.82, 0.04, 0.86))
	Kit.add_bench(lot, Vector3(0.82, 0.04, 0.86))


func _build_corner(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.45, -0.45), Vector3(1.55, 0.9, 1.06), Kit.material("f2e8d8", 0.9))
	Kit.box(lot, Vector3(0.0, 1.02, -0.45), Vector3(1.78, 0.2, 1.24), Kit.material(Kit.ROOF_BLUE, 0.74))
	Kit.box(lot, Vector3(0.0, 0.56, 0.18), Vector3(1.08, 0.38, 0.055), Kit.transparent_material(Kit.GLASS, 0.34, 0.28))
	Kit.box(lot, Vector3(0.0, 0.86, 0.24), Vector3(1.22, 0.2, 0.06), Kit.material("4f76a0", 0.72))
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.12), Vector2(1.65, 0.72), 2, false)
	Kit.add_trash_can(lot, Vector3(-0.98, 0.04, 0.82), Color("4b6778"))
