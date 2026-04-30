extends Node3D

const HERO_SPEED := 6.2
const HERO_ACCEL := 11.0
const CREATURE_COUNT := 7
const DISCOVERIES_NEEDED := 5
const DUNGEON_TILE_SIZE := 1.55
const HERO_COLLISION_RADIUS := 0.34
const DUNGEON_LAYOUT := [
	"#####################",
	"#S..#.......#.......#",
	"#.#.#.#####.#.#####.#",
	"#.#...#...#...#...#.#",
	"#.#####.#.#####.#.#.#",
	"#.....#.#.......#...#",
	"###.#.#.###########.#",
	"#...#...#.....#.....#",
	"#.#######.###.#.###.#",
	"#.........#...#...#.#",
	"#.#########.#####.#.#",
	"#...#.......#.....#.#",
	"###.#.#######.#####.#",
	"#...#.....#...#.....#",
	"#.#######.#.###.###.#",
	"#.....#...#.....#E..#",
	"#####################",
]

var rng := RandomNumberGenerator.new()
var camera: Camera3D
var hero: Node3D
var hero_body: MeshInstance3D
var hero_sword: MeshInstance3D
var hero_ring: MeshInstance3D
var hero_velocity := Vector3.ZERO
var hero_health := 110.0
var hero_max_health := 110.0
var hero_xp := 0
var hero_level := 1
var hero_speed_bonus := 0.0
var hero_gold := 0
var potion_count := 0
var discovery_count := 0
var inventory: Array[String] = []
var inspect_cooldown := 0.0
var hurt_timer := 0.0
var game_over := false
var victory := false

var creatures: Array[Dictionary] = []
var pickups: Array[Dictionary] = []
var decor_bobs: Array[Node3D] = []
var material_cache: Dictionary = {}
var walkable_cells: Array[Vector2i] = []
var walkable_lookup: Dictionary = {}
var start_cell := Vector2i(1, 1)
var exit_cell := Vector2i(19, 15)

var hud_panel: PanelContainer
var hud_details: VBoxContainer
var hud_toggle_button: Button
var hud_stats: Label
var hud_quest: Label
var hud_hint: Label
var hud_inventory: Label
var health_bar: ProgressBar
var xp_bar: ProgressBar
var hud_minimized := false


func _ready() -> void:
	rng.randomize()
	_ensure_input_map()
	_build_world()
	_spawn_hero()
	_spawn_creatures()
	_spawn_pickups()
	_build_hud()
	_update_hud()


func _process(delta: float) -> void:
	if Input.is_action_just_pressed("toggle_hud"):
		_toggle_hud()

	if game_over:
		if Input.is_action_just_pressed("restart"):
			get_tree().reload_current_scene()
		return

	inspect_cooldown = maxf(inspect_cooldown - delta, 0.0)
	hurt_timer = maxf(hurt_timer - delta, 0.0)

	_update_hero(delta)
	_update_camera(delta)
	_update_creatures(delta)
	_update_pickups(delta)
	_update_decor(delta)
	_collect_pickups()
	_update_hud()


func _ensure_input_map() -> void:
	_add_key_action("move_left", [KEY_A, KEY_LEFT])
	_add_key_action("move_right", [KEY_D, KEY_RIGHT])
	_add_key_action("move_up", [KEY_W, KEY_UP])
	_add_key_action("move_down", [KEY_S, KEY_DOWN])
	_add_key_action("inspect", [KEY_SPACE, KEY_E, KEY_J])
	_add_key_action("toggle_hud", [KEY_TAB, KEY_H])
	_add_key_action("drink_potion", [KEY_Q])
	_add_key_action("restart", [KEY_R])


func _add_key_action(action: String, keys: Array[int]) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for keycode in keys:
		var exists := false
		for event in InputMap.action_get_events(action):
			if event is InputEventKey and event.keycode == keycode:
				exists = true
				break
		if not exists:
			var key := InputEventKey.new()
			key.keycode = keycode
			InputMap.action_add_event(action, key)


func _build_world() -> void:
	var world := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("070912")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("1a2130")
	env.ambient_light_energy = 0.24
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.adjustment_enabled = true
	env.adjustment_brightness = 0.68
	env.adjustment_contrast = 1.18
	env.adjustment_saturation = 0.88
	env.glow_enabled = true
	env.glow_intensity = 0.2
	env.glow_strength = 0.28
	env.fog_enabled = false
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.name = "Cold Dungeon Fill"
	sun.light_color = Color("8290b8")
	sun.light_energy = 0.42
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-58.0, -24.0, 0.0)
	add_child(sun)

	camera = Camera3D.new()
	camera.name = "DungeonCamera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 22.0
	camera.position = Vector3(0.0, 18.5, 15.0)
	add_child(camera)
	camera.look_at(Vector3.ZERO, Vector3.UP)

	_build_dungeon_level_one()


func _build_dungeon_level_one() -> void:
	walkable_cells.clear()
	walkable_lookup.clear()

	var floor_material := _mat("2b2f3a", 0.96)
	var floor_alt_material := _mat("353848", 0.96)
	var wall_material := _mat("20242f", 0.94)
	var wall_top_material := _mat("3a4050", 0.92)
	var edge_material := _mat("151821", 0.98)
	var rune_material := _mat("3d3752", 0.62, "8f72ff", 0.08)
	var exit_material := _mat("2b1c34", 0.82, "b27cff", 0.18)

	for z in range(DUNGEON_LAYOUT.size()):
		var row := str(DUNGEON_LAYOUT[z])
		for x in range(row.length()):
			var cell := Vector2i(x, z)
			var marker := row.substr(x, 1)
			var world_pos := _dungeon_cell_to_world(cell)
			if marker == "#":
				var height := 1.28 + 0.18 * float((x + z) % 3)
				_add_box(world_pos + Vector3(0.0, height * 0.5, 0.0), Vector3(DUNGEON_TILE_SIZE, height, DUNGEON_TILE_SIZE), wall_material, self)
				_add_box(world_pos + Vector3(0.0, height + 0.035, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.96, 0.07, DUNGEON_TILE_SIZE * 0.96), wall_top_material, self)
				if (x + z) % 5 == 0:
					_add_box(world_pos + Vector3(0.0, 0.16, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.12, 0.26, DUNGEON_TILE_SIZE * 0.92), edge_material, self)
			else:
				walkable_cells.append(cell)
				walkable_lookup[_dungeon_cell_key(cell)] = true
				if marker == "S":
					start_cell = cell
				elif marker == "E":
					exit_cell = cell
				var tile_material := floor_material if (x + z) % 2 == 0 else floor_alt_material
				_add_box(world_pos + Vector3(0.0, -0.035, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.96, 0.07, DUNGEON_TILE_SIZE * 0.96), tile_material, self)
				if (x * 7 + z * 3) % 11 == 0:
					_add_floor_crack(world_pos)

	_add_dungeon_torches()
	_add_dungeon_pillars()
	_add_dungeon_exit(exit_material, rune_material)
	_add_dungeon_debris()


func _dungeon_map_size() -> Vector2i:
	return Vector2i(str(DUNGEON_LAYOUT[0]).length(), DUNGEON_LAYOUT.size())


func _dungeon_origin() -> Vector3:
	var size := _dungeon_map_size()
	return Vector3(
		-float(size.x - 1) * DUNGEON_TILE_SIZE * 0.5,
		0.0,
		-float(size.y - 1) * DUNGEON_TILE_SIZE * 0.5
	)


func _dungeon_cell_to_world(cell: Vector2i) -> Vector3:
	var origin := _dungeon_origin()
	return origin + Vector3(float(cell.x) * DUNGEON_TILE_SIZE, 0.0, float(cell.y) * DUNGEON_TILE_SIZE)


func _dungeon_world_to_cell(pos: Vector3) -> Vector2i:
	var origin := _dungeon_origin()
	return Vector2i(
		int(round((pos.x - origin.x) / DUNGEON_TILE_SIZE)),
		int(round((pos.z - origin.z) / DUNGEON_TILE_SIZE))
	)


func _dungeon_cell_key(cell: Vector2i) -> String:
	return "%d:%d" % [cell.x, cell.y]


func _is_walkable_cell(cell: Vector2i) -> bool:
	return walkable_lookup.has(_dungeon_cell_key(cell))


func _is_walkable_position(pos: Vector3, radius: float = HERO_COLLISION_RADIUS) -> bool:
	for sample in [
		Vector3(-radius, 0.0, -radius),
		Vector3(radius, 0.0, -radius),
		Vector3(-radius, 0.0, radius),
		Vector3(radius, 0.0, radius),
		Vector3.ZERO,
	]:
		if not _is_walkable_cell(_dungeon_world_to_cell(pos + sample)):
			return false
	return true


func _add_floor_crack(world_pos: Vector3) -> void:
	var crack_material := _mat("161820", 0.98)
	var crack := _add_box(world_pos + Vector3(rng.randf_range(-0.18, 0.0), 0.025, rng.randf_range(-0.18, 0.18)), Vector3(0.64, 0.025, 0.045), crack_material, self)
	crack.rotation_degrees.y = rng.randf_range(-42.0, 42.0)
	var branch := _add_box(world_pos + Vector3(rng.randf_range(0.0, 0.18), 0.028, rng.randf_range(-0.18, 0.18)), Vector3(0.34, 0.022, 0.035), crack_material, self)
	branch.rotation_degrees.y = crack.rotation_degrees.y + rng.randf_range(48.0, 96.0)


func _add_dungeon_torches() -> void:
	for cell in [
		Vector2i(1, 1),
		Vector2i(7, 1),
		Vector2i(17, 1),
		Vector2i(3, 7),
		Vector2i(11, 7),
		Vector2i(9, 11),
		Vector2i(17, 13),
		Vector2i(19, 15),
	]:
		_add_torch(_dungeon_cell_to_world(cell))


func _add_torch(pos: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Dungeon Torch"
	root.position = pos + Vector3(0.0, 0.0, 0.0)
	add_child(root)
	_add_cylinder(Vector3(0.0, 0.34, 0.0), 0.055, 0.68, _mat("493222", 0.88), root)
	_add_cylinder(Vector3(0.0, 0.72, 0.0), 0.11, 0.08, _mat("2b2020", 0.82), root)
	var flame := _add_sphere(Vector3(0.0, 0.92, 0.0), 0.16, 0.24, _mat("ff9d42", 0.22, "ffc15a", 0.9), root)
	decor_bobs.append(flame)
	var light := OmniLight3D.new()
	light.name = "Torch Glow"
	light.light_color = Color("ffad62")
	light.light_energy = 0.72
	light.omni_range = 4.2
	light.shadow_enabled = false
	light.position = Vector3(0.0, 0.96, 0.0)
	root.add_child(light)
	var pool := _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(1.45, 1.45), 0.018, _mat("4a2b18", 0.5, "ff9f4a", 0.06), root, 0.0)
	pool.transparency = 0.42


func _add_dungeon_pillars() -> void:
	for cell in [Vector2i(7, 3), Vector2i(13, 3), Vector2i(7, 13), Vector2i(13, 13), Vector2i(11, 9)]:
		var pos := _dungeon_cell_to_world(cell)
		_add_box(pos + Vector3(0.0, 0.1, 0.0), Vector3(0.82, 0.2, 0.82), _mat("171a23", 0.92), self)
		_add_cylinder(pos + Vector3(0.0, 0.68, 0.0), 0.28, 1.18, _mat("2c3140", 0.92), self)
		_add_box(pos + Vector3(0.0, 1.31, 0.0), Vector3(0.74, 0.16, 0.74), _mat("3c4252", 0.9), self)


func _add_dungeon_exit(exit_material: Material, rune_material: Material) -> void:
	var pos := _dungeon_cell_to_world(exit_cell)
	_add_box(pos + Vector3(0.0, 0.02, 0.0), Vector3(1.16, 0.04, 1.16), exit_material, self)
	_add_box(pos + Vector3(-0.48, 0.74, 0.52), Vector3(0.18, 1.38, 0.18), _mat("151722", 0.94), self)
	_add_box(pos + Vector3(0.48, 0.74, 0.52), Vector3(0.18, 1.38, 0.18), _mat("151722", 0.94), self)
	_add_box(pos + Vector3(0.0, 1.42, 0.52), Vector3(1.16, 0.2, 0.18), _mat("29223a", 0.88, "9272ff", 0.1), self)
	var rune := _add_box(pos + Vector3(0.0, 0.08, 0.0), Vector3(0.62, 0.035, 0.62), rune_material, self)
	rune.rotation_degrees.y = 45.0
	decor_bobs.append(rune)


func _add_dungeon_debris() -> void:
	for i in range(34):
		var pos := _random_open_position()
		if pos.distance_to(_dungeon_cell_to_world(start_cell)) < 2.8:
			continue
		if i % 4 == 0:
			_add_sphere(pos + Vector3(0.0, 0.1, 0.0), rng.randf_range(0.12, 0.24), rng.randf_range(0.08, 0.18), _mat("4a4d57", 0.94), self)
		elif i % 4 == 1:
			var bone := _add_box(pos + Vector3(0.0, 0.07, 0.0), Vector3(0.48, 0.05, 0.08), _mat("d8c7a6", 0.82), self)
			bone.rotation_degrees.y = rng.randf_range(0.0, 180.0)
		elif i % 4 == 2:
			var chain := _add_box(pos + Vector3(0.0, 0.04, 0.0), Vector3(0.58, 0.035, 0.055), _mat("1a1c22", 0.74), self)
			chain.rotation_degrees.y = rng.randf_range(-70.0, 70.0)
		else:
			_add_cylinder(pos + Vector3(0.0, 0.16, 0.0), 0.08, 0.28, _mat("3f3027", 0.9), self)


func _spawn_hero() -> void:
	hero = Node3D.new()
	hero.name = "Hero"
	hero.position = _dungeon_cell_to_world(start_cell)
	add_child(hero)

	hero_ring = _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(0.58, 0.58), 0.018, _mat("3d5f83", 0.72, "6fb7ff", 0.05), hero, 0.0)
	hero_body = _add_cylinder(Vector3(0.0, 0.62, 0.0), 0.28, 0.78, _mat("344d75", 0.72), hero)
	_add_sphere(Vector3(0.0, 1.18, 0.0), 0.24, 0.25, _mat("f2c49b", 0.78), hero)
	_add_box(Vector3(0.0, 0.78, 0.22), Vector3(0.5, 0.68, 0.08), _mat("7a3140", 0.8), hero)
	_add_box(Vector3(0.0, 1.42, 0.0), Vector3(0.52, 0.12, 0.42), _mat("5a3d2e", 0.82), hero)
	hero_sword = _add_box(Vector3(0.42, 0.66, -0.12), Vector3(0.09, 0.08, 0.8), _mat("d7e9ff", 0.46, "93caff", 0.08), hero)
	_add_box(Vector3(0.42, 0.5, 0.28), Vector3(0.2, 0.09, 0.09), _mat("d4a94d", 0.68), hero)


func _spawn_creatures() -> void:
	for i in range(CREATURE_COUNT):
		var pos := _random_open_position()
		while pos.distance_to(hero.position) < 7.0:
			pos = _random_open_position()
		_spawn_creature(pos, i)


func _spawn_creature(pos: Vector3, index: int) -> void:
	var root := Node3D.new()
	root.name = "Dungeon Shade"
	root.position = pos
	add_child(root)
	var body_color := "2c3b54" if index % 3 != 0 else "3a2e55"
	_add_sphere(Vector3(0.0, 0.38, 0.0), 0.4, 0.42, _mat(body_color, 0.54, "475b90", 0.05), root)
	_add_sphere(Vector3(-0.14, 0.52, -0.29), 0.055, 0.055, _mat("98e7ff", 0.32, "b6f3ff", 0.35), root)
	_add_sphere(Vector3(0.14, 0.52, -0.29), 0.055, 0.055, _mat("98e7ff", 0.32, "b6f3ff", 0.35), root)
	_add_box(Vector3(0.0, 0.18, 0.18), Vector3(0.42, 0.12, 0.16), _mat("151821", 0.92), root)
	creatures.append({
		"node": root,
		"speed": 1.0 + rng.randf_range(-0.12, 0.18),
		"wander": Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized(),
		"wander_time": rng.randf_range(1.1, 2.8)
	})


func _spawn_pickups() -> void:
	for i in range(12):
		_spawn_pickup("coin", _random_open_position())
	for i in range(5):
		_spawn_pickup("herb", _random_open_position())
	for cell in [Vector2i(9, 1), Vector2i(15, 3), Vector2i(3, 9), Vector2i(11, 13), Vector2i(18, 15)]:
		_spawn_pickup("artifact", _dungeon_cell_to_world(cell))
	_spawn_pickup("boots", _dungeon_cell_to_world(Vector2i(5, 5)))
	_spawn_pickup("compass", _dungeon_cell_to_world(Vector2i(1, 13)))
	_spawn_pickup("heart", _dungeon_cell_to_world(Vector2i(17, 7)))
	_spawn_pickup("lantern", _dungeon_cell_to_world(Vector2i(11, 1)))
	_spawn_pickup("satchel", _dungeon_cell_to_world(Vector2i(5, 15)))


func _spawn_pickup(kind: String, pos: Vector3) -> void:
	var root := Node3D.new()
	root.name = kind.capitalize()
	root.position = pos
	add_child(root)
	match kind:
		"coin":
			_add_cylinder(Vector3(0.0, 0.32, 0.0), 0.18, 0.08, _mat("ffd15a", 0.45, "ffd15a", 0.12), root).rotation_degrees.x = 90.0
		"herb":
			_add_cylinder(Vector3(0.0, 0.23, 0.0), 0.035, 0.34, _mat("4b8f4c", 0.86), root)
			_add_sphere(Vector3(-0.08, 0.43, 0.0), 0.14, 0.07, _mat("8fca68", 0.76), root)
			_add_sphere(Vector3(0.1, 0.36, 0.03), 0.13, 0.06, _mat("a8dc79", 0.76), root)
		"artifact":
			_add_box(Vector3(0.0, 0.36, 0.0), Vector3(0.36, 0.36, 0.36), _mat("8df4ea", 0.22, "9dfff4", 0.5), root).rotation_degrees.y = 45.0
			var glow := OmniLight3D.new()
			glow.light_color = Color("9d7cff")
			glow.light_energy = 0.3
			glow.omni_range = 2.5
			glow.shadow_enabled = false
			glow.position = Vector3(0.0, 0.48, 0.0)
			root.add_child(glow)
		"boots":
			_add_box(Vector3(-0.16, 0.22, 0.0), Vector3(0.22, 0.16, 0.42), _mat("8a5d38", 0.72), root)
			_add_box(Vector3(0.16, 0.22, 0.0), Vector3(0.22, 0.16, 0.42), _mat("8a5d38", 0.72), root)
			_add_box(Vector3(0.0, 0.42, 0.0), Vector3(0.56, 0.08, 0.48), _mat("f1c36c", 0.68, "ffd47c", 0.08), root)
		"compass":
			_add_cylinder(Vector3(0.0, 0.35, 0.0), 0.28, 0.08, _mat("d9a441", 0.42, "f0c76b", 0.08), root).rotation_degrees.x = 90.0
			_add_box(Vector3(0.0, 0.42, -0.03), Vector3(0.08, 0.035, 0.36), _mat("d14e4e", 0.58), root).rotation_degrees.y = 35.0
		"heart":
			_add_sphere(Vector3(-0.09, 0.36, 0.0), 0.16, 0.16, _mat("e66f75", 0.46, "ff969b", 0.18), root)
			_add_sphere(Vector3(0.09, 0.36, 0.0), 0.16, 0.16, _mat("e66f75", 0.46, "ff969b", 0.18), root)
			_add_box(Vector3(0.0, 0.23, 0.0), Vector3(0.24, 0.24, 0.24), _mat("d95263", 0.5, "ff8993", 0.12), root).rotation_degrees.z = 45.0
		"lantern":
			_add_cylinder(Vector3(0.0, 0.38, 0.0), 0.16, 0.34, _mat("f0ca65", 0.46, "ffd878", 0.18), root)
			_add_box(Vector3(0.0, 0.62, 0.0), Vector3(0.34, 0.08, 0.34), _mat("6d4c35", 0.74), root)
			var light := OmniLight3D.new()
			light.light_color = Color("ffd878")
			light.light_energy = 0.25
			light.omni_range = 2.0
			light.shadow_enabled = false
			light.position = Vector3(0.0, 0.48, 0.0)
			root.add_child(light)
		"satchel":
			_add_box(Vector3(0.0, 0.34, 0.0), Vector3(0.48, 0.34, 0.2), _mat("9b6844", 0.78), root)
			_add_box(Vector3(0.0, 0.53, -0.01), Vector3(0.38, 0.08, 0.22), _mat("c18a56", 0.72), root)
	pickups.append({"node": root, "kind": kind, "base_y": root.position.y, "phase": rng.randf_range(0.0, TAU)})


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	hud_panel = PanelContainer.new()
	hud_panel.position = Vector2(18, 18)
	hud_panel.custom_minimum_size = Vector2(560, 190)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.08, 0.07, 0.46)
	style.border_color = Color(1.0, 0.92, 0.72, 0.2)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 18
	style.corner_radius_top_right = 18
	style.corner_radius_bottom_left = 18
	style.corner_radius_bottom_right = 18
	hud_panel.add_theme_stylebox_override("panel", style)
	layer.add_child(hud_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	hud_panel.add_child(box)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 10)
	box.add_child(header)

	hud_stats = Label.new()
	hud_stats.add_theme_color_override("font_color", Color("fff7da"))
	hud_stats.add_theme_font_size_override("font_size", 18)
	hud_stats.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(hud_stats)

	hud_toggle_button = Button.new()
	hud_toggle_button.text = "Min"
	hud_toggle_button.custom_minimum_size = Vector2(72, 30)
	hud_toggle_button.pressed.connect(_toggle_hud)
	header.add_child(hud_toggle_button)

	hud_details = VBoxContainer.new()
	hud_details.add_theme_constant_override("separation", 8)
	box.add_child(hud_details)

	health_bar = ProgressBar.new()
	health_bar.show_percentage = false
	health_bar.custom_minimum_size = Vector2(500, 18)
	hud_details.add_child(health_bar)

	xp_bar = ProgressBar.new()
	xp_bar.show_percentage = false
	xp_bar.custom_minimum_size = Vector2(500, 14)
	hud_details.add_child(xp_bar)

	hud_quest = Label.new()
	hud_quest.add_theme_color_override("font_color", Color("d5ffe7"))
	hud_quest.add_theme_font_size_override("font_size", 15)
	hud_quest.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_details.add_child(hud_quest)

	hud_inventory = Label.new()
	hud_inventory.add_theme_color_override("font_color", Color("ffeab8"))
	hud_inventory.add_theme_font_size_override("font_size", 14)
	hud_inventory.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_details.add_child(hud_inventory)

	hud_hint = Label.new()
	hud_hint.add_theme_color_override("font_color", Color("c9d5cf"))
	hud_hint.add_theme_font_size_override("font_size", 13)
	hud_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_details.add_child(hud_hint)

	_apply_hud_mode()


func _toggle_hud() -> void:
	hud_minimized = not hud_minimized
	_apply_hud_mode()


func _apply_hud_mode() -> void:
	if hud_details:
		hud_details.visible = not hud_minimized
	if hud_panel:
		hud_panel.custom_minimum_size = Vector2(430, 54) if hud_minimized else Vector2(560, 190)
	if hud_toggle_button:
		hud_toggle_button.text = "More" if hud_minimized else "Min"


func _update_hero(delta: float) -> void:
	var input := Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		input.x -= 1.0
	if Input.is_action_pressed("move_right"):
		input.x += 1.0
	if Input.is_action_pressed("move_up"):
		input.y -= 1.0
	if Input.is_action_pressed("move_down"):
		input.y += 1.0

	var desired := Vector3(input.x, 0.0, input.y)
	if desired.length() > 1.0:
		desired = desired.normalized()
	hero_velocity = hero_velocity.lerp(desired * (HERO_SPEED + hero_speed_bonus), clampf(delta * HERO_ACCEL, 0.0, 1.0))
	_move_hero_with_dungeon_collision(hero_velocity * delta)
	hero.position.y = sin(Time.get_ticks_msec() * 0.009) * 0.025 if hero_velocity.length() > 0.1 else 0.0

	if hero_velocity.length() > 0.25:
		hero.rotation.y = lerp_angle(hero.rotation.y, atan2(-hero_velocity.x, -hero_velocity.z), delta * 12.0)

	if Input.is_action_just_pressed("inspect"):
		_inspect_area()
	if Input.is_action_just_pressed("drink_potion"):
		_drink_potion()

	var pulse := 1.0 + sin(Time.get_ticks_msec() * 0.008) * 0.04
	hero_ring.scale = Vector3(pulse, 1.0, pulse)
	hero_body.scale = Vector3.ONE if hurt_timer <= 0.0 else Vector3(1.12, 0.92, 1.12)
	hero_sword.rotation_degrees.x = lerpf(hero_sword.rotation_degrees.x, 0.0, delta * 10.0)


func _move_hero_with_dungeon_collision(motion: Vector3) -> void:
	if motion.length() <= 0.0001:
		return
	var target := hero.position + motion
	target.y = hero.position.y
	if _is_walkable_position(target):
		hero.position = target
		return
	var x_only := hero.position + Vector3(motion.x, 0.0, 0.0)
	if _is_walkable_position(x_only):
		hero.position = x_only
	var z_only := hero.position + Vector3(0.0, 0.0, motion.z)
	if _is_walkable_position(z_only):
		hero.position = z_only


func _inspect_area() -> void:
	if inspect_cooldown > 0.0:
		return
	inspect_cooldown = 0.3
	hero_sword.rotation_degrees.x = -18.0
	var closest_kind := ""
	var closest_distance := 999.0
	for pickup in pickups:
		var node: Node3D = pickup.node
		if not is_instance_valid(node):
			continue
		var distance := node.position.distance_to(hero.position)
		if distance < closest_distance:
			closest_distance = distance
			closest_kind = String(pickup.kind)
	if closest_distance <= 3.2:
		hud_hint.text = "You notice %s glowing in the dark. Move onto it to collect it." % _pickup_label(closest_kind).to_lower()
	else:
		hud_hint.text = "Listen for torchlight and search the side chambers. Runes, relics, and supplies improve your hero."


func _drink_potion() -> void:
	if potion_count <= 0 or hero_health >= hero_max_health:
		return
	potion_count -= 1
	hero_health = minf(hero_max_health, hero_health + 42.0)
	hud_hint.text = "Used a dungeon herb."


func _update_camera(delta: float) -> void:
	var target := hero.position + Vector3(0.0, 17.5, 15.0)
	camera.position = camera.position.lerp(target, clampf(delta * 4.0, 0.0, 1.0))
	camera.look_at(hero.position + Vector3(0.0, 0.25, 0.0), Vector3.UP)


func _update_creatures(delta: float) -> void:
	for creature in creatures.duplicate():
		var node: Node3D = creature.node
		if not is_instance_valid(node):
			creatures.erase(creature)
			continue
		creature.wander_time = float(creature.wander_time) - delta
		if float(creature.wander_time) <= 0.0:
			creature.wander = Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized()
			creature.wander_time = rng.randf_range(1.2, 3.0)
		var direction: Vector3 = creature.wander
		var to_hero := hero.position - node.position
		if to_hero.length() < 6.5:
			direction = to_hero.normalized()
		if to_hero.length() < 0.72:
			_damage_hero(7.0)
			direction = (-to_hero).normalized()
		var next_position := node.position + direction * float(creature.speed) * delta
		if _is_walkable_position(next_position, 0.28):
			node.position = next_position
		else:
			creature.wander = Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized()
			creature.wander_time = rng.randf_range(0.8, 1.6)
		node.position.y = 0.06 + sin(Time.get_ticks_msec() * 0.006 + node.position.x) * 0.035
		node.scale = node.scale.lerp(Vector3.ONE, delta * 8.0)
		if direction.length() > 0.1:
			node.rotation.y = lerp_angle(node.rotation.y, atan2(-direction.x, -direction.z), delta * 7.0)


func _damage_hero(amount: float) -> void:
	if hurt_timer > 0.0:
		return
	hero_health -= amount
	hurt_timer = 0.35
	if hero_health <= 0.0:
		hero_health = 0.0
		_end_game(false)


func _update_pickups(delta: float) -> void:
	for pickup in pickups:
		var node: Node3D = pickup.node
		if not is_instance_valid(node):
			continue
		pickup.phase = float(pickup.phase) + delta * 2.4
		node.position.y = float(pickup.base_y) + sin(float(pickup.phase)) * 0.09
		node.rotation_degrees.y += delta * 70.0


func _update_decor(delta: float) -> void:
	for node in decor_bobs:
		if not is_instance_valid(node):
			continue
		node.rotation_degrees.y += delta * 8.0
		node.scale = Vector3.ONE * (1.0 + sin(Time.get_ticks_msec() * 0.002 + node.position.x) * 0.025)


func _collect_pickups() -> void:
	for pickup in pickups.duplicate():
		var node: Node3D = pickup.node
		if not is_instance_valid(node):
			pickups.erase(pickup)
			continue
		if node.position.distance_to(hero.position) > 0.82:
			continue
		match String(pickup.kind):
			"coin":
				hero_gold += 1
				_grant_xp(4, "Found old dungeon gold.")
			"herb":
				potion_count += 1
				_add_inventory_item("Dungeon Herb")
				_grant_xp(6, "Gathered a healing herb from a cracked stone planter.")
			"artifact":
				discovery_count += 1
				_add_inventory_item("Ancient Rune")
				_grant_xp(18, "Ancient rune claimed. The exit seal weakens.")
				if discovery_count >= DISCOVERIES_NEEDED and not victory:
					victory = true
					hud_hint.text = "The exit seal is broken. You survived Dungeon Level 1."
			"boots":
				hero_speed_bonus += 1.05
				_add_inventory_item("Silent Boots")
				_grant_xp(25, "Silent Boots found. Movement speed improved.")
			"compass":
				_add_inventory_item("Bone Compass")
				_grant_xp(24, "The compass points deeper into the dungeon.")
			"heart":
				hero_max_health += 28.0
				hero_health = hero_max_health
				_add_inventory_item("Bloodstone Charm")
				_grant_xp(20, "Bloodstone Charm found. Maximum health increased.")
			"lantern":
				_add_inventory_item("Crypt Lantern")
				_grant_xp(22, "Crypt Lantern found. The dark feels less certain.")
			"satchel":
				_add_inventory_item("Loot Satchel")
				hero_gold += 3
				_grant_xp(20, "Loot Satchel found. Bonus gold added.")
		node.queue_free()
		pickups.erase(pickup)


func _grant_xp(amount: int, message: String = "") -> void:
	hero_xp += amount
	while hero_xp >= _xp_to_next():
		hero_xp -= _xp_to_next()
		hero_level += 1
		hero_max_health += 12.0
		hero_health = hero_max_health
		hero_speed_bonus += 0.12
		message = "Level up! Your torch hand steadies and your step quickens."
	if message != "":
		hud_hint.text = message


func _add_inventory_item(item_name: String) -> void:
	inventory.append(item_name)


func _pickup_label(kind: String) -> String:
	match kind:
		"coin":
			return "old gold"
		"herb":
			return "dungeon herb"
		"artifact":
			return "ancient rune"
		"boots":
			return "silent boots"
		"compass":
			return "bone compass"
		"heart":
			return "bloodstone charm"
		"lantern":
			return "crypt lantern"
		"satchel":
			return "loot satchel"
	return "curiosity"


func _end_game(won: bool) -> void:
	game_over = true
	victory = won
	hud_hint.text = "Dungeon Level 1 cleared. Press R to enter again." if won else "The dungeon claimed you. Press R to try again."


func _update_hud() -> void:
	health_bar.max_value = hero_max_health
	health_bar.value = hero_health
	xp_bar.max_value = _xp_to_next()
	xp_bar.value = hero_xp
	hud_stats.text = "Tiny Hero Quest  |  Dungeon 1  |  Lvl %d  HP %d/%d  XP %d/%d  Runes %d/%d  Gold %d" % [
		hero_level,
		int(hero_health),
		int(hero_max_health),
		hero_xp,
		_xp_to_next(),
		discovery_count,
		DISCOVERIES_NEEDED,
		hero_gold
	]
	if game_over:
		hud_quest.text = "Dungeon Level 1 cleared!" if victory else "You fell in the dungeon. Press R to try again."
	elif victory:
		hud_quest.text = "Exit seal broken: %d/%d runes. Keep looting or restart for another run." % [discovery_count, DISCOVERIES_NEEDED]
	else:
		hud_quest.text = "Level 1: collect %d ancient runes to break the exit seal. Claimed: %d/%d" % [DISCOVERIES_NEEDED, discovery_count, DISCOVERIES_NEEDED]
	hud_inventory.text = "Inventory: %s  |  Herbs: %d" % [_inventory_summary(), potion_count]
	if hud_hint.text == "":
		hud_hint.text = "Move WASD / arrows. Space/E inspects. Q uses an herb. Tab toggles the journal."


func _inventory_summary() -> String:
	if inventory.is_empty():
		return "empty"
	var start_index := maxi(inventory.size() - 5, 0)
	var summary := ""
	for i in range(start_index, inventory.size()):
		if summary != "":
			summary += ", "
		summary += inventory[i]
	return summary


func _xp_to_next() -> int:
	return 50 + (hero_level - 1) * 25


func _random_open_position() -> Vector3:
	if walkable_cells.is_empty():
		return Vector3.ZERO
	for attempt in range(80):
		var cell: Vector2i = walkable_cells[rng.randi_range(0, walkable_cells.size() - 1)]
		var pos := _dungeon_cell_to_world(cell)
		pos.x += rng.randf_range(-0.28, 0.28)
		pos.z += rng.randf_range(-0.28, 0.28)
		if pos.distance_to(_dungeon_cell_to_world(start_cell)) > 2.2 and pos.distance_to(_dungeon_cell_to_world(exit_cell)) > 1.2:
			return pos
	var fallback_cell: Vector2i = walkable_cells[0]
	return _dungeon_cell_to_world(fallback_cell)


func _mat(hex: String, roughness: float = 0.86, emission_hex: String = "", emission_energy: float = 0.0) -> StandardMaterial3D:
	var key := "%s:%s:%s:%s" % [hex, roughness, emission_hex, emission_energy]
	if material_cache.has(key):
		return material_cache[key]
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(hex)
	material.roughness = roughness
	if emission_hex != "" and emission_energy > 0.0:
		material.emission_enabled = true
		material.emission = Color(emission_hex)
		material.emission_energy_multiplier = emission_energy
	material_cache[key] = material
	return material


func _add_box(pos: Vector3, size: Vector3, material: Material, parent: Node) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = material
	instance.position = pos
	parent.add_child(instance)
	return instance


func _add_sphere(pos: Vector3, radius_xz: float, radius_y: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = 1.0
	mesh.height = 2.0
	mesh.radial_segments = 10
	mesh.rings = 5
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = material
	instance.position = pos
	instance.scale = Vector3(radius_xz, radius_y, radius_xz)
	parent.add_child(instance)
	return instance


func _add_cylinder(pos: Vector3, radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 8
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = material
	instance.position = pos
	parent.add_child(instance)
	return instance


func _add_ellipse_disc_local(pos: Vector3, radius: Vector2, height: float, material: Material, parent: Node, rotation_y: float) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = 1.0
	mesh.bottom_radius = 1.0
	mesh.height = height
	mesh.radial_segments = 28
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = material
	instance.position = pos
	instance.scale = Vector3(radius.x, 1.0, radius.y)
	instance.rotation_degrees.y = rotation_y
	parent.add_child(instance)
	return instance
