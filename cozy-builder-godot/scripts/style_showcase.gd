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
	camera.size = 8.7
	camera.position = Vector3(6.6, 4.45, 6.6)
	camera.look_at(Vector3(0.0, 0.9, 0.78), Vector3.UP)


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
	env.ambient_light_color = Color(0.72, 0.82, 0.72)
	env.ambient_light_energy = 0.66
	env.fog_enabled = false
	env.glow_enabled = false
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.03
	env.adjustment_contrast = 0.98
	env.adjustment_saturation = 1.06
	world_environment.environment = env
	sun.rotation_degrees = Vector3(-58.0, 34.0, 0.0)
	sun.light_energy = 1.18
	sun.shadow_enabled = true
	sun.shadow_blur = 2.4
	fill_light.rotation_degrees = Vector3(-20.0, 150.0, 0.0)
	fill_light.light_energy = 0.34
	fill_light.shadow_enabled = false


func _build_showcase() -> void:
	Kit.box(self, Vector3(0.0, -0.035, 0.0), Vector3(18.8, 0.05, 8.6), Kit.material(Kit.GRASS, 0.94))
	_add_ground_details()
	_build_road_strip()

	var specs := [
		{"x": -5.75, "z": -1.45, "kind": "house"},
		{"x": -3.55, "z": -1.26, "kind": "fire"},
		{"x": -1.28, "z": -1.38, "kind": "bank"},
		{"x": 1.05, "z": -1.24, "kind": "grocery"},
		{"x": 3.35, "z": -1.44, "kind": "restaurant"},
		{"x": 5.55, "z": -1.3, "kind": "corner"},
	]
	for spec in specs:
		var lot := _lot_root(float(spec["x"]), float(spec["z"]))
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

	_build_sidewalk_life()


func _build_road_strip() -> void:
	var length := 18.4
	var road_z := 2.05
	Kit.box(self, Vector3(0.0, 0.012, road_z), Vector3(length, 0.035, 4.36), Kit.material("91c778", 0.94))
	Kit.box(self, Vector3(0.0, 0.052, 0.68), Vector3(length, 0.064, 1.0), Kit.material(Kit.SIDEWALK, 0.86))
	Kit.box(self, Vector3(0.0, 0.052, 3.42), Vector3(length, 0.064, 1.0), Kit.material(Kit.SIDEWALK, 0.86))
	for x in range(-8, 9):
		if x % 2 == 0:
			Kit.box(self, Vector3(float(x), 0.09, 0.68), Vector3(0.028, 0.012, 0.82), Kit.material("c9bea9", 0.92))
			Kit.box(self, Vector3(float(x), 0.09, 3.42), Vector3(0.028, 0.012, 0.82), Kit.material("c9bea9", 0.92))
	Kit.box(self, Vector3(0.0, 0.09, road_z), Vector3(length, 0.07, 1.72), Kit.material(Kit.ROAD, 0.95))
	Kit.box(self, Vector3(0.0, 0.115, road_z), Vector3(length, 0.026, 1.52), Kit.material(Kit.ROAD_SOFT, 0.94))
	Kit.box(self, Vector3(0.0, 0.15, 1.14), Vector3(length, 0.035, 0.08), Kit.material(Kit.CURB, 0.9))
	Kit.box(self, Vector3(0.0, 0.15, 2.96), Vector3(length, 0.035, 0.08), Kit.material(Kit.CURB, 0.9))
	Kit.box(self, Vector3(0.0, 0.168, 1.26), Vector3(length - 0.5, 0.012, 0.03), Kit.material(Kit.WHITE, 0.88))
	Kit.box(self, Vector3(0.0, 0.168, 2.84), Vector3(length - 0.5, 0.012, 0.03), Kit.material(Kit.WHITE, 0.88))
	for x in [-7.6, -5.6, -3.6, -1.6, 0.4, 2.4, 4.4, 6.4, 8.0]:
		Kit.box(self, Vector3(x, 0.176, road_z), Vector3(0.48, 0.016, 0.055), Kit.material(Kit.YELLOW, 0.68))
	for end_x in [-8.75, 8.75]:
		_create_crosswalk(end_x, road_z)
	for cut in [
		{"x": -6.65, "w": 0.78},
		{"x": -4.05, "w": 1.22},
		{"x": -1.42, "w": 1.04},
		{"x": 1.3, "w": 1.34},
		{"x": 4.02, "w": 1.08},
		{"x": 6.62, "w": 0.94},
	]:
		_add_curb_cut(float(cut["x"]), float(cut["w"]))


func _create_crosswalk(x: float, road_z: float) -> void:
	for stripe in range(6):
		var z := road_z - 0.54 + float(stripe) * 0.22
		Kit.box(self, Vector3(x, 0.182, z), Vector3(0.13, 0.018, 0.13), Kit.material(Kit.WHITE, 0.82))


func _add_curb_cut(x: float, width: float) -> void:
	Kit.box(self, Vector3(x, 0.172, 1.14), Vector3(width, 0.034, 0.13), Kit.material("d9d9d9", 0.86))
	Kit.box(self, Vector3(x, 0.092, 0.68), Vector3(width * 0.72, 0.018, 0.68), Kit.material("eee8dc", 0.9))


func _lot_root(x: float, z: float) -> Node3D:
	var lot := Node3D.new()
	lot.position = Vector3(x, 0.0, z)
	add_child(lot)
	Kit.box(lot, Vector3(0.0, 0.012, 0.0), Vector3(2.96, 0.024, 2.92), Kit.transparent_material(Kit.SHADOW, 0.12, 1.0))
	Kit.box(lot, Vector3(0.0, 0.03, 0.0), Vector3(2.86, 0.06, 2.84), Kit.material("eee8dc", 0.92))
	Kit.box(lot, Vector3(0.0, 0.065, 0.0), Vector3(2.72, 0.05, 2.68), Kit.material("d9d5bf", 0.94))
	Kit.box(lot, Vector3(0.0, 0.096, 1.08), Vector3(0.9, 0.04, 1.2), Kit.material(Kit.SIDEWALK, 0.86))
	Kit.box(lot, Vector3(0.0, 0.12, 1.34), Vector3(2.34, 0.035, 0.1), Kit.material(Kit.CURB, 0.9))
	Kit.add_hedge(lot, Vector3(-1.27, 0.12, -0.18), Vector3(0.12, 0.24, 1.9))
	Kit.add_hedge(lot, Vector3(1.27, 0.12, -0.18), Vector3(0.12, 0.24, 1.9))
	Kit.add_bush(lot, Vector3(-1.05, 0.1, 1.1), 0.42)
	Kit.add_bush(lot, Vector3(1.05, 0.1, 1.1), 0.42)
	_flower_cluster(Vector3(x - 0.86, 0.03, z + 1.08), Color("ffd067"))
	_flower_cluster(Vector3(x + 0.86, 0.03, z + 1.1), Color("df675f"))
	return lot


func _build_house(lot: Node3D) -> void:
	Kit.box(lot, Vector3(0.0, 0.43, -0.48), Vector3(1.28, 0.86, 1.08), Kit.material(Kit.WALL, 0.9))
	Kit.box(lot, Vector3(0.0, 1.0, -0.48), Vector3(1.56, 0.24, 1.32), Kit.material("c87349", 0.74))
	Kit.box(lot, Vector3(0.0, 0.31, 0.13), Vector3(0.28, 0.58, 0.055), Kit.material("7d5437", 0.7))
	Kit.box(lot, Vector3(0.0, 0.09, 0.46), Vector3(1.2, 0.06, 0.34), Kit.material("a57649", 0.78))
	for x in [-0.42, 0.42]:
		_window(lot, Vector3(x, 0.56, 0.11), Vector3(0.24, 0.28, 0.055))
		Kit.add_bush(lot, Vector3(x, 0.08, 0.45), 0.36)
	Kit.box(lot, Vector3(-0.86, 0.055, 0.84), Vector3(0.54, 0.035, 1.0), Kit.material("b8a58b", 0.9))
	_mailbox(lot, Vector3(-0.95, 0.0, 1.12))
	Kit.add_hedge(lot, Vector3(0.0, 0.08, 1.22), Vector3(1.72, 0.14, 0.08))


func _build_fire(lot: Node3D) -> void:
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.02), Vector2(2.3, 0.92), 2, false)
	Kit.box(lot, Vector3(0.0, 0.55, -0.48), Vector3(1.72, 1.1, 1.2), Kit.material("c94f45", 0.84))
	Kit.box(lot, Vector3(0.0, 1.18, -0.48), Vector3(1.92, 0.2, 1.34), Kit.material("34383d", 0.82))
	for bay_x in [-0.34, 0.34]:
		Kit.box(lot, Vector3(bay_x, 0.38, 0.22), Vector3(0.58, 0.64, 0.065), Kit.material("383d42", 0.88))
		for rail_y in [0.25, 0.43, 0.61]:
			Kit.box(lot, Vector3(bay_x, rail_y, 0.26), Vector3(0.48, 0.035, 0.04), Kit.material("f1d072", 0.74))
	Kit.box(lot, Vector3(-0.86, 1.04, -0.55), Vector3(0.42, 1.88, 0.42), Kit.material("b93f3a", 0.86))
	Kit.box(lot, Vector3(-0.86, 2.02, -0.55), Vector3(0.54, 0.12, 0.54), Kit.material("34383d", 0.82))
	Kit.sphere(lot, Vector3(-0.86, 1.68, -0.29), 0.1, Kit.material("f1d072", 0.64), 0.3)
	for level_y in [0.82, 1.16, 1.5]:
		_window(lot, Vector3(-0.86, level_y, -0.28), Vector3(0.16, 0.18, 0.045))
	for rung_y in [0.68, 0.9, 1.12, 1.34]:
		Kit.box(lot, Vector3(0.9, rung_y, -0.08), Vector3(0.03, 0.03, 0.34), Kit.material("f1d072", 0.74))
	Kit.box(lot, Vector3(0.78, 1.02, -0.08), Vector3(0.025, 0.86, 0.025), Kit.material("f1d072", 0.74))
	Kit.box(lot, Vector3(1.02, 1.02, -0.08), Vector3(0.025, 0.86, 0.025), Kit.material("f1d072", 0.74))
	_sign(lot, "FIRE DEPT", Vector3(0.0, 0.9, 0.28), Vector2(1.08, 0.22), Color("f1d072"))
	for x in [-0.64, 0.64]:
		Kit.cylinder(lot, Vector3(x, 0.2, 0.78), 0.045, 0.4, Kit.material("f1d072", 0.72))
	_flag(lot, Vector3(-1.0, 0.0, 0.62))


func _build_bank(lot: Node3D) -> void:
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.08), Vector2(2.28, 0.86), 3, true)
	Kit.box(lot, Vector3(0.0, 0.52, -0.52), Vector3(1.66, 1.04, 1.1), Kit.material("dfe8ef", 0.9))
	Kit.box(lot, Vector3(0.0, 1.12, -0.52), Vector3(1.88, 0.2, 1.24), Kit.material("557da1", 0.78))
	Kit.box(lot, Vector3(0.0, 0.09, 0.72), Vector3(1.44, 0.06, 0.42), Kit.material("d8d2c8", 0.9))
	for step_index in range(3):
		Kit.box(lot, Vector3(0.0, 0.11 + float(step_index) * 0.04, 0.54 + float(step_index) * 0.1), Vector3(1.24 - float(step_index) * 0.14, 0.04, 0.14), Kit.material("d8d2c8", 0.9))
	Kit.box(lot, Vector3(0.0, 0.96, 0.26), Vector3(1.34, 0.12, 0.14), Kit.material(Kit.TRIM, 0.86))
	Kit.box(lot, Vector3(0.0, 1.1, 0.24), Vector3(1.06, 0.08, 0.1), Kit.material("557da1", 0.78))
	for x in [-0.58, -0.29, 0.0, 0.29, 0.58]:
		Kit.cylinder(lot, Vector3(x, 0.46, 0.22), 0.055, 0.86, Kit.material(Kit.TRIM, 0.86))
	Kit.box(lot, Vector3(0.0, 0.32, 0.28), Vector3(0.3, 0.5, 0.055), Kit.material("6b7c8d", 0.72))
	for x in [-0.52, 0.52]:
		_window(lot, Vector3(x, 0.62, 0.24), Vector3(0.24, 0.28, 0.05))
	_sign(lot, "BANK", Vector3(0.0, 0.9, 0.31), Vector2(0.86, 0.2), Color("557da1"))
	Kit.sphere(lot, Vector3(0.0, 1.27, 0.24), 0.12, Kit.material("d0a64c", 0.56), 0.3)
	_atm(lot, Vector3(-1.0, 0.0, 0.56))


func _build_grocery(lot: Node3D) -> void:
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.12), Vector2(2.48, 0.9), 5, true)
	Kit.box(lot, Vector3(0.0, 0.5, -0.5), Vector3(1.98, 1.0, 1.24), Kit.material("f2e8d8", 0.9))
	Kit.box(lot, Vector3(0.0, 1.12, -0.5), Vector3(2.18, 0.22, 1.4), Kit.material(Kit.ROOF_GREEN, 0.76))
	_window(lot, Vector3(-0.42, 0.55, 0.19), Vector3(0.42, 0.44, 0.055))
	_window(lot, Vector3(0.42, 0.55, 0.19), Vector3(0.42, 0.44, 0.055))
	Kit.box(lot, Vector3(0.0, 0.86, 0.28), Vector3(1.46, 0.22, 0.06), Kit.material("5fae54", 0.72))
	_sign(lot, "GROCERY", Vector3(0.0, 0.9, 0.33), Vector2(1.18, 0.2), Color("5fae54"))
	Kit.box(lot, Vector3(0.0, 1.36, 0.22), Vector3(1.9, 0.18, 0.12), Kit.material("4f8d49", 0.76))
	_sign(lot, "FRESH MARKET", Vector3(0.0, 1.48, 0.3), Vector2(1.34, 0.16), Color("5fae54"))
	Kit.box(lot, Vector3(0.0, 0.69, 0.36), Vector3(1.74, 0.055, 0.3), Kit.material("5fae54", 0.72))
	for stripe_x in [-0.54, -0.18, 0.18, 0.54]:
		Kit.box(lot, Vector3(stripe_x, 0.72, 0.38), Vector3(0.14, 0.04, 0.32), Kit.material(Kit.TRIM, 0.82))
	Kit.add_cart_rack(lot, Vector3(0.95, 0.08, 0.72), deg_to_rad(90.0))
	Kit.box(lot, Vector3(0.95, 0.48, 0.72), Vector3(0.56, 0.08, 0.34), Kit.material(Kit.ROOF_GREEN, 0.76))
	_crates(lot, Vector3(-1.0, 0.06, 0.76))
	_crates(lot, Vector3(-0.72, 0.06, 0.83))


func _build_restaurant(lot: Node3D) -> void:
	Kit.add_parking_lot(lot, Vector3(0.0, 0.04, 1.12), Vector2(2.08, 0.82), 3, false)
	Kit.box(lot, Vector3(0.0, 0.48, -0.48), Vector3(1.72, 0.96, 1.14), Kit.material("f7d9bf", 0.88))
	Kit.box(lot, Vector3(0.0, 1.08, -0.48), Vector3(1.92, 0.22, 1.32), Kit.material(Kit.ROOF_RED, 0.74))
	Kit.box(lot, Vector3(0.0, 0.58, 0.22), Vector3(1.34, 0.14, 0.28), Kit.material("ef8b5f", 0.62))
	for x in [-0.42, -0.14, 0.14, 0.42]:
		Kit.box(lot, Vector3(x, 0.62, 0.3), Vector3(0.12, 0.04, 0.31), Kit.material(Kit.TRIM, 0.82))
	Kit.box(lot, Vector3(0.0, 0.32, 0.32), Vector3(0.28, 0.52, 0.055), Kit.material("8d543c", 0.7))
	for x in [-0.52, 0.52]:
		_window(lot, Vector3(x, 0.58, 0.23), Vector3(0.28, 0.3, 0.05))
	_sign(lot, "TASTY BITES", Vector3(0.0, 0.92, 0.32), Vector2(1.22, 0.2), Color("c96b5f"))
	for x in [-0.72, 0.72]:
		_table(lot, Vector3(x, 0.05, 0.78))
	_menu_board(lot, Vector3(-1.06, 0.0, 0.72))
	Kit.box(lot, Vector3(0.0, 0.11, 1.0), Vector3(1.76, 0.05, 0.58), Kit.material("d8c7ab", 0.88))
	for post_x in [-0.78, -0.26, 0.26, 0.78]:
		Kit.box(lot, Vector3(post_x, 0.6, 1.04), Vector3(0.045, 0.96, 0.045), Kit.material("8d543c", 0.78))
	Kit.box(lot, Vector3(0.0, 1.1, 1.04), Vector3(1.82, 0.06, 0.56), Kit.material("8d543c", 0.78))
	for slat_x in [-0.56, -0.28, 0.0, 0.28, 0.56]:
		Kit.box(lot, Vector3(slat_x, 1.16, 1.04), Vector3(0.045, 0.055, 0.62), Kit.material("ef8b5f", 0.66))
	for x in [-0.42, 0.0, 0.42]:
		_table(lot, Vector3(x, 0.05, 1.05))


func _build_corner(lot: Node3D) -> void:
	Kit.add_parking_lot(lot, Vector3(0.15, 0.04, 1.12), Vector2(1.96, 0.82), 3, false)
	Kit.box(lot, Vector3(0.0, 0.48, -0.48), Vector3(1.62, 0.96, 1.1), Kit.material("f2e8d8", 0.9))
	Kit.box(lot, Vector3(0.0, 1.08, -0.48), Vector3(1.86, 0.22, 1.28), Kit.material(Kit.ROOF_BLUE, 0.74))
	_window(lot, Vector3(-0.36, 0.58, 0.2), Vector3(0.34, 0.36, 0.055))
	_window(lot, Vector3(0.36, 0.58, 0.2), Vector3(0.34, 0.36, 0.055))
	Kit.box(lot, Vector3(0.0, 0.87, 0.27), Vector3(1.28, 0.21, 0.06), Kit.material("4f76a0", 0.72))
	_sign(lot, "QUICK MART", Vector3(0.0, 0.91, 0.32), Vector2(1.1, 0.2), Color("4f76a0"))
	Kit.box(lot, Vector3(0.0, 0.72, 0.52), Vector3(1.74, 0.14, 0.28), Kit.material(Kit.ROOF_BLUE, 0.74))
	Kit.box(lot, Vector3(-0.82, 0.72, -0.08), Vector3(0.24, 0.14, 0.9), Kit.material(Kit.ROOF_BLUE, 0.74))
	var poster_colors: Array[Color] = [Color("ffd067"), Color("df675f"), Color("70d5bd")]
	for index in range(3):
		var poster_x := -0.38 + float(index) * 0.38
		var poster_color: Color = poster_colors[index]
		Kit.box(lot, Vector3(poster_x, 0.38, 0.36), Vector3(0.18, 0.22, 0.035), Kit.material(poster_color.to_html(false), 0.8))
	Kit.add_trash_can(lot, Vector3(-1.02, 0.04, 0.82), Color("4b6778"))
	_ice_box(lot, Vector3(0.96, 0.0, 0.72))
	Kit.box(lot, Vector3(-0.92, 0.2, 0.78), Vector3(0.24, 0.36, 0.2), Kit.material("df675f", 0.78))


func _build_sidewalk_life() -> void:
	for x in [-7.8, -5.2, -2.55, 0.15, 2.85, 5.55, 8.1]:
		Kit.add_tree(self, Vector3(x, 0.0, -3.54))
	for x in [-7.6, -4.9, -2.2, 0.55, 3.3, 6.0, 8.4]:
		Kit.add_streetlight(self, Vector3(x, 0.0, 3.18))
	for x in [-5.95, -0.45, 5.05]:
		Kit.add_bench(self, Vector3(x, 0.04, 3.52), deg_to_rad(0.0))
	_build_bus_stop(Vector3(1.95, 0.0, 3.52))
	for data in [
		{"x": -7.15, "color": "7db2ee"},
		{"x": -0.82, "color": "ef8b5f"},
		{"x": 6.95, "color": "70d5bd"},
	]:
		_pedestrian(Vector3(float(data["x"]), 0.0, 0.58), Color(str(data["color"])))
	_parked_car(Vector3(-2.7, 0.08, 2.42), Color("7db2ee"))
	_parked_car(Vector3(4.95, 0.08, 1.62), Color("ef8b5f"))
	Kit.add_trash_can(self, Vector3(-3.35, 0.04, 3.48), Color("4b6778"))
	_hydrant(Vector3(-4.95, 0.0, 3.5))


func _add_ground_details() -> void:
	for data in [
		{"pos": Vector3(-8.4, 0.0, -3.0), "color": "ffd067"},
		{"pos": Vector3(-2.2, 0.0, -3.42), "color": "f29b5f"},
		{"pos": Vector3(2.4, 0.0, -3.32), "color": "df675f"},
		{"pos": Vector3(8.2, 0.0, -2.95), "color": "fff4df"},
		{"pos": Vector3(-7.5, 0.0, 4.05), "color": "ffd067"},
		{"pos": Vector3(7.8, 0.0, 4.02), "color": "f29b5f"},
	]:
		_flower_cluster(data["pos"], Color(str(data["color"])))
	for rock_pos in [Vector3(-5.6, 0.0, -3.2), Vector3(0.6, 0.0, -3.64), Vector3(5.9, 0.0, 4.1)]:
		Kit.sphere(self, rock_pos + Vector3(0.0, 0.06, 0.0), 0.12, Kit.material("c9c1ad", 0.9), 0.46)


func _window(parent: Node, position: Vector3, size: Vector3) -> void:
	Kit.box(parent, position - Vector3(0.0, 0.0, 0.012), size + Vector3(0.08, 0.08, 0.02), Kit.material("f8f2df", 0.82))
	Kit.box(parent, position + Vector3(0.0, 0.0, 0.02), size, Kit.material("ffc15e", 0.08, "ffe09a", 0.24))
	Kit.box(parent, position + Vector3(0.0, 0.0, 0.045), Vector3(0.028, size.y * 0.82, 0.018), Kit.material("8c745b", 0.82))


func _sign(parent: Node, text: String, position: Vector3, size: Vector2, color: Color) -> void:
	Kit.box(parent, position, Vector3(size.x, size.y, 0.06), Kit.material(color.to_html(false), 0.72))
	Kit.box(parent, position + Vector3(0.0, 0.0, 0.04), Vector3(size.x * 0.88, size.y * 0.22, 0.02), Kit.material(Kit.TRIM, 0.84))
	var label := Label3D.new()
	label.text = text
	label.position = position + Vector3(0.0, 0.0, 0.082)
	label.pixel_size = 0.008
	label.font_size = 28
	label.modulate = Color("fff4df")
	label.outline_size = 4
	label.outline_modulate = Color("2e3033")
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.width = size.x / label.pixel_size
	parent.add_child(label)


func _mailbox(parent: Node, position: Vector3) -> void:
	Kit.box(parent, position + Vector3(0.0, 0.18, 0.0), Vector3(0.045, 0.34, 0.045), Kit.material("7b5a42", 0.86))
	Kit.box(parent, position + Vector3(0.0, 0.38, 0.0), Vector3(0.24, 0.14, 0.18), Kit.material("e1b672", 0.78))
	Kit.box(parent, position + Vector3(0.09, 0.47, 0.0), Vector3(0.035, 0.12, 0.035), Kit.material("d24d42", 0.74))


func _flag(parent: Node, position: Vector3) -> void:
	Kit.cylinder(parent, position + Vector3(0.0, 0.62, 0.0), 0.025, 1.24, Kit.material("f3ead8", 0.76))
	Kit.box(parent, position + Vector3(0.22, 1.08, 0.0), Vector3(0.42, 0.24, 0.035), Kit.material("f1d072", 0.7))


func _atm(parent: Node, position: Vector3) -> void:
	Kit.box(parent, position + Vector3(0.0, 0.28, 0.0), Vector3(0.28, 0.56, 0.18), Kit.material("47627a", 0.82))
	Kit.box(parent, position + Vector3(0.0, 0.4, 0.1), Vector3(0.2, 0.1, 0.035), Kit.material("bfe6ff", 0.3))


func _crates(parent: Node, position: Vector3) -> void:
	for offset in [Vector3.ZERO, Vector3(0.22, 0.0, 0.02), Vector3(0.1, 0.13, -0.04)]:
		Kit.box(parent, position + offset, Vector3(0.18, 0.12, 0.18), Kit.material("9f7b56", 0.8))
	Kit.sphere(parent, position + Vector3(0.02, 0.2, 0.0), 0.055, Kit.material("cb644c", 0.82), 0.72)
	Kit.sphere(parent, position + Vector3(0.2, 0.18, 0.06), 0.055, Kit.material("7da85b", 0.82), 0.72)


func _table(parent: Node, position: Vector3) -> void:
	Kit.cylinder(parent, position + Vector3(0.0, 0.18, 0.0), 0.15, 0.04, Kit.material("ffc064", 0.76))
	for angle in [0.0, 120.0, 240.0]:
		var dir := Vector3(cos(deg_to_rad(angle)), 0.0, sin(deg_to_rad(angle)))
		Kit.box(parent, position + dir * 0.25 + Vector3(0.0, 0.1, 0.0), Vector3(0.14, 0.07, 0.12), Kit.material("a57649", 0.76))


func _menu_board(parent: Node, position: Vector3) -> void:
	Kit.box(parent, position + Vector3(0.0, 0.34, 0.0), Vector3(0.28, 0.42, 0.04), Kit.material("7d5437", 0.82))
	Kit.box(parent, position + Vector3(0.0, 0.42, 0.025), Vector3(0.18, 0.035, 0.018), Kit.material(Kit.TRIM, 0.86))


func _ice_box(parent: Node, position: Vector3) -> void:
	Kit.box(parent, position + Vector3(0.0, 0.26, 0.0), Vector3(0.4, 0.52, 0.28), Kit.material("eef6fb", 0.7))
	Kit.box(parent, position + Vector3(0.0, 0.5, 0.16), Vector3(0.32, 0.1, 0.035), Kit.material(Kit.ROOF_BLUE, 0.76))


func _build_bus_stop(position: Vector3) -> void:
	Kit.box(self, position + Vector3(0.0, 0.05, 0.0), Vector3(0.9, 0.06, 0.32), Kit.material("3d4144", 0.88))
	Kit.box(self, position + Vector3(0.0, 0.62, -0.1), Vector3(0.9, 0.08, 0.38), Kit.transparent_material("bfe6ff", 0.24, 0.28))
	for x in [-0.38, 0.38]:
		Kit.box(self, position + Vector3(x, 0.34, -0.1), Vector3(0.045, 0.62, 0.045), Kit.material("3d4144", 0.88))
	Kit.add_bench(self, position + Vector3(0.0, 0.04, 0.08), deg_to_rad(0.0))


func _pedestrian(position: Vector3, color: Color) -> void:
	Kit.cylinder(self, position + Vector3(0.0, 0.2, 0.0), 0.07, 0.28, Kit.material(color.to_html(false), 0.8))
	Kit.sphere(self, position + Vector3(0.0, 0.4, 0.0), 0.09, Kit.material("f0c7a2", 0.76), 1.05)
	Kit.box(self, position + Vector3(-0.035, 0.06, 0.0), Vector3(0.035, 0.12, 0.035), Kit.material("2f3335", 0.88))
	Kit.box(self, position + Vector3(0.035, 0.06, 0.0), Vector3(0.035, 0.12, 0.035), Kit.material("2f3335", 0.88))


func _parked_car(position: Vector3, color: Color) -> void:
	Kit.box(self, position + Vector3(0.0, 0.11, 0.0), Vector3(0.52, 0.18, 0.88), Kit.material(color.to_html(false), 0.66))
	Kit.box(self, position + Vector3(0.0, 0.25, -0.08), Vector3(0.36, 0.13, 0.38), Kit.transparent_material(Kit.GLASS, 0.28, 0.24))
	for x in [-0.24, 0.24]:
		for z in [-0.3, 0.3]:
			Kit.cylinder(self, position + Vector3(x, 0.08, z), 0.06, 0.045, Kit.material("26252b", 0.98))


func _flower_cluster(position: Vector3, color: Color) -> void:
	for offset in [Vector3(-0.1, 0.0, -0.04), Vector3(0.05, 0.0, 0.08), Vector3(0.14, 0.0, -0.02)]:
		Kit.box(self, position + offset + Vector3(0.0, 0.08, 0.0), Vector3(0.02, 0.14, 0.02), Kit.material("5d944f", 0.9))
		Kit.box(self, position + offset + Vector3(0.0, 0.17, 0.0), Vector3(0.06, 0.04, 0.06), Kit.material(color.to_html(false), 0.8))


func _hydrant(position: Vector3) -> void:
	Kit.cylinder(self, position + Vector3(0.0, 0.14, 0.0), 0.055, 0.28, Kit.material("c45043", 0.68))
	Kit.box(self, position + Vector3(0.0, 0.28, 0.0), Vector3(0.16, 0.06, 0.08), Kit.material("c45043", 0.68))
