extends Node3D

const HERO_SPEED := 6.2
const HERO_ACCEL := 11.0
const CREATURE_COUNT := 7
const DISCOVERIES_NEEDED := 5
const DUNGEON_TILE_SIZE := 1.55
const HERO_COLLISION_RADIUS := 0.34
const CAMERA_ROTATE_SPEED := 0.006
const CAMERA_PITCH_SPEED := 0.0045
const CAMERA_ZOOM_STEP := 0.1
const CAMERA_FAR_DISTANCE := 22.0
const CAMERA_NEAR_DISTANCE := 0.48
const CAMERA_FAR_FOV := 40.0
const CAMERA_NEAR_FOV := 74.0
const CAMERA_FAR_PITCH := -0.96
const CAMERA_NEAR_PITCH := -0.08
const CAMERA_MIN_PITCH := -1.18
const CAMERA_MAX_PITCH := -0.025
const SWORD_SWING_DURATION := 0.28
const SWORD_SWING_COOLDOWN := 0.55
const STAFF_ORB_RADIUS := 0.095
const VIEW_STAFF_ORB_RADIUS := 0.07
const SWORD_LIGHT_BASE_ENERGY := 0.0
const SWORD_LIGHT_SWING_ENERGY := 0.0
const FIRE_BOLT_RANGE := 7.5
const SHIELD_BLOCK_DURATION := 1.1
const SHIELD_BLOCK_COOLDOWN := 1.8
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
var hero_shield: MeshInstance3D
var hero_ring: MeshInstance3D
var hero_light: OmniLight3D
var sword_light: OmniLight3D
var view_sword: MeshInstance3D
var view_sword_guard: MeshInstance3D
var view_sword_slash: MeshInstance3D
var staff_orb: MeshInstance3D
var view_staff_orb: MeshInstance3D
var fire_bolt_beam: MeshInstance3D
var fire_bolt_tip: MeshInstance3D
var fire_bolt_light: OmniLight3D
var fire_bolt_start := Vector3.ZERO
var fire_bolt_end := Vector3.ZERO
var hero_velocity := Vector3.ZERO
var camera_yaw := 0.0
var camera_pitch_offset := 0.0
var camera_zoom := 0.0
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
var sword_swing_timer := 0.0
var sword_swing_cooldown := 0.0
var shield_block_timer := 0.0
var shield_block_cooldown := 0.0
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
var left_mouse_down := false
var right_mouse_down := false
var mouse_dragged := false
var left_mouse_press_position := Vector2.ZERO
var click_to_move_enabled := false
var click_move_active := false
var click_move_target := Vector3.ZERO
var click_move_marker: MeshInstance3D

var hud_panel: PanelContainer
var hud_details: VBoxContainer
var hud_toggle_button: Button
var hud_stats: Label
var hud_quest: Label
var hud_hint: Label
var hud_inventory: VBoxContainer
var equipment_slot_buttons: Dictionary = {}
var inventory_grid: GridContainer
var inventory_detail: Label
var sword_button: Button
var shield_button: Button
var click_to_move_checkbox: CheckBox
var health_bar: ProgressBar
var xp_bar: ProgressBar
var hud_minimized := false
var selected_inventory_item := "Orb Staff"
var inventory_signature := ""


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
	sword_swing_timer = maxf(sword_swing_timer - delta, 0.0)
	sword_swing_cooldown = maxf(sword_swing_cooldown - delta, 0.0)
	shield_block_timer = maxf(shield_block_timer - delta, 0.0)
	shield_block_cooldown = maxf(shield_block_cooldown - delta, 0.0)

	if Input.is_action_just_pressed("sword_swing"):
		_use_sword_swing()
	if Input.is_action_just_pressed("shield_block"):
		_use_shield_block()

	_update_hero(delta)
	_update_camera(delta)
	_update_creatures(delta)
	_update_pickups(delta)
	_update_decor(delta)
	_collect_pickups()
	_update_hud()


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed and not _is_pointer_over_hud():
			_adjust_camera_zoom(CAMERA_ZOOM_STEP)
			return
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed and not _is_pointer_over_hud():
			_adjust_camera_zoom(-CAMERA_ZOOM_STEP)
			return
		if event.button_index == MOUSE_BUTTON_LEFT:
			left_mouse_down = event.pressed
			if event.pressed:
				left_mouse_press_position = event.position
				mouse_dragged = false
			elif click_to_move_enabled and not mouse_dragged and not right_mouse_down and not _is_pointer_over_hud():
				_set_click_move_target_from_screen(event.position)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			right_mouse_down = event.pressed
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED if event.pressed else Input.MOUSE_MODE_VISIBLE)
			if event.pressed:
				mouse_dragged = false
	elif event is InputEventMouseMotion:
		if left_mouse_down and (event.relative.length() > 0.6 or event.position.distance_to(left_mouse_press_position) > 4.0):
			mouse_dragged = true
		if right_mouse_down:
			mouse_dragged = true
			camera_yaw = wrapf(camera_yaw + event.relative.x * CAMERA_ROTATE_SPEED, -PI, PI)
			camera_pitch_offset = clampf(camera_pitch_offset - event.relative.y * CAMERA_PITCH_SPEED, -0.48, 0.48)
		if right_mouse_down and is_instance_valid(hero):
			hero.rotation.y = lerp_angle(hero.rotation.y, _rotation_from_direction(_camera_forward()), 0.9)


func _ensure_input_map() -> void:
	_add_key_action("move_left", [KEY_A, KEY_LEFT])
	_add_key_action("move_right", [KEY_D, KEY_RIGHT])
	_add_key_action("move_up", [KEY_W, KEY_UP])
	_add_key_action("move_down", [KEY_S, KEY_DOWN])
	_add_key_action("inspect", [KEY_SPACE, KEY_E, KEY_J])
	_add_key_action("toggle_hud", [KEY_TAB, KEY_H])
	_add_key_action("drink_potion", [KEY_Q])
	_add_key_action("restart", [KEY_R])
	_add_key_action("sword_swing", [KEY_1])
	_add_key_action("shield_block", [KEY_2])


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
	camera.projection = Camera3D.PROJECTION_PERSPECTIVE
	camera.fov = CAMERA_FAR_FOV
	camera.near = 0.025
	camera.far = 90.0
	camera.current = true
	camera.position = Vector3(0.0, 18.5, 15.0)
	add_child(camera)
	camera.look_at(Vector3.ZERO, Vector3.UP)
	_build_camera_sword()

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


func _build_camera_sword() -> void:
	view_sword = _add_cylinder(Vector3(0.42, -0.35, -0.88), 0.032, 0.96, _mat("6a3f22", 0.72, "ff8f3b", 0.18), camera)
	view_sword.name = "Close Camera Staff"
	view_sword.visible = false
	view_sword_guard = _add_box(Vector3(0.42, -0.47, -0.54), Vector3(0.28, 0.05, 0.07), _mat("d59a42", 0.56, "ffc35a", 0.24), camera)
	view_sword_guard.name = "Close Camera Staff Binding"
	view_sword_guard.visible = false
	view_staff_orb = _add_sphere(Vector3(0.42, -0.06, -1.2), VIEW_STAFF_ORB_RADIUS, VIEW_STAFF_ORB_RADIUS, _mat("f6c66e", 0.36, "ffd27a", 0.35), camera)
	view_staff_orb.name = "Close Camera Staff Orb"
	view_staff_orb.visible = false
	view_sword_slash = _add_box(Vector3(0.08, -0.1, -1.2), Vector3(0.7, 0.07, 0.07), _mat("ff6a18", 0.18, "ffc15a", 3.4), camera)
	view_sword_slash.name = "Close Camera Fire Bolt"
	view_sword_slash.transparency = 0.28
	view_sword_slash.visible = false


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


func _camera_forward() -> Vector3:
	return Vector3(sin(camera_yaw), 0.0, -cos(camera_yaw)).normalized()


func _camera_right() -> Vector3:
	return Vector3(cos(camera_yaw), 0.0, sin(camera_yaw)).normalized()


func _camera_zoom_curve() -> float:
	return camera_zoom * camera_zoom * (3.0 - 2.0 * camera_zoom)


func _current_camera_pitch() -> float:
	return clampf(lerpf(CAMERA_FAR_PITCH, CAMERA_NEAR_PITCH, _camera_zoom_curve()) + camera_pitch_offset, CAMERA_MIN_PITCH, CAMERA_MAX_PITCH)


func _camera_view_forward() -> Vector3:
	var pitch := _current_camera_pitch()
	var pitch_cos := cos(pitch)
	return Vector3(sin(camera_yaw) * pitch_cos, sin(pitch), -cos(camera_yaw) * pitch_cos).normalized()


func _rotation_from_direction(direction: Vector3) -> float:
	if direction.length() <= 0.001:
		return hero.rotation.y if is_instance_valid(hero) else 0.0
	return atan2(-direction.x, -direction.z)


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

	hero_ring = _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(1.45, 1.45), 0.018, _mat("172941", 0.72, "5eb9ff", 0.1), hero, 0.0)
	hero_ring.transparency = 0.42
	hero_body = _add_cylinder(Vector3(0.0, 0.62, 0.0), 0.28, 0.78, _mat("344d75", 0.72), hero)
	_add_sphere(Vector3(0.0, 1.18, 0.0), 0.24, 0.25, _mat("f2c49b", 0.78), hero)
	_add_box(Vector3(0.0, 0.78, 0.22), Vector3(0.5, 0.68, 0.08), _mat("49306f", 0.76, "8057ff", 0.14), hero)
	_add_box(Vector3(0.0, 1.42, 0.0), Vector3(0.56, 0.12, 0.46), _mat("2d203b", 0.78, "7c5cff", 0.12), hero)
	_add_cylinder(Vector3(0.0, 1.48, 0.0), 0.26, 0.18, _mat("1f172b", 0.78, "7e5dff", 0.12), hero)
	hero_sword = _add_cylinder(Vector3(0.42, 0.83, -0.12), 0.045, 1.04, _mat("6a3f22", 0.72, "ff8f3b", 0.18), hero)
	hero_sword.rotation_degrees.z = -8.0
	_add_box(Vector3(0.42, 0.38, -0.12), Vector3(0.22, 0.07, 0.08), _mat("d4a94d", 0.68, "ffc45d", 0.18), hero)
	staff_orb = _add_sphere(Vector3(0.42, 1.42, -0.12), STAFF_ORB_RADIUS, STAFF_ORB_RADIUS, _mat("f6c66e", 0.36, "ffd27a", 0.35), hero)
	hero_shield = _add_box(Vector3(-0.34, 0.68, -0.28), Vector3(0.14, 0.58, 0.42), _mat("7f91ac", 0.56, "9ec5ff", 0.16), hero)
	hero_shield.visible = false

	hero_light = OmniLight3D.new()
	hero_light.name = "Hero Perimeter Light"
	hero_light.light_color = Color("79c8ff")
	hero_light.light_energy = 0.85
	hero_light.omni_range = 5.2
	hero_light.shadow_enabled = false
	hero_light.position = Vector3(0.0, 0.72, 0.0)
	hero.add_child(hero_light)

	sword_light = OmniLight3D.new()
	sword_light.name = "Sword Glow"
	sword_light.light_color = Color("ffb13d")
	sword_light.light_energy = SWORD_LIGHT_BASE_ENERGY
	sword_light.omni_range = 0.1
	sword_light.shadow_enabled = false
	sword_light.visible = false
	sword_light.position = Vector3(0.42, 1.42, -0.12)
	hero.add_child(sword_light)

	_create_fire_bolt_visuals()


func _create_fire_bolt_visuals() -> void:
	fire_bolt_beam = _add_box(Vector3.ZERO, Vector3(0.14, 0.14, 1.0), _mat("ff5a12", 0.18, "ffb34d", 4.5), self)
	fire_bolt_beam.name = "Fire Bolt Beam"
	fire_bolt_beam.visible = false
	fire_bolt_tip = _add_sphere(Vector3.ZERO, 0.22, 0.22, _mat("ff822e", 0.12, "ffd15a", 5.5), self)
	fire_bolt_tip.name = "Fire Bolt Tip"
	fire_bolt_tip.visible = false
	fire_bolt_light = OmniLight3D.new()
	fire_bolt_light.name = "Fire Bolt Light"
	fire_bolt_light.light_color = Color("ff9d42")
	fire_bolt_light.light_energy = 16.0
	fire_bolt_light.omni_range = 4.6
	fire_bolt_light.shadow_enabled = false
	fire_bolt_light.visible = false
	add_child(fire_bolt_light)


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

	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", 8)
	hud_details.add_child(action_row)

	sword_button = Button.new()
	sword_button.text = "1  Firebolt"
	sword_button.custom_minimum_size = Vector2(126, 32)
	sword_button.pressed.connect(_use_sword_swing)
	action_row.add_child(sword_button)

	shield_button = Button.new()
	shield_button.text = "2  Block"
	shield_button.custom_minimum_size = Vector2(116, 32)
	shield_button.pressed.connect(_use_shield_block)
	action_row.add_child(shield_button)

	click_to_move_checkbox = CheckBox.new()
	click_to_move_checkbox.text = "Click to move"
	click_to_move_checkbox.button_pressed = click_to_move_enabled
	click_to_move_checkbox.toggled.connect(_set_click_to_move_enabled)
	action_row.add_child(click_to_move_checkbox)

	hud_quest = Label.new()
	hud_quest.add_theme_color_override("font_color", Color("d5ffe7"))
	hud_quest.add_theme_font_size_override("font_size", 15)
	hud_quest.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_details.add_child(hud_quest)

	hud_inventory = VBoxContainer.new()
	hud_inventory.add_theme_constant_override("separation", 6)
	hud_details.add_child(hud_inventory)
	_build_inventory_panel()

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
		hud_panel.custom_minimum_size = Vector2(430, 54) if hud_minimized else Vector2(610, 300)
	if hud_toggle_button:
		hud_toggle_button.text = "More" if hud_minimized else "Min"


func _build_inventory_panel() -> void:
	var title := Label.new()
	title.text = "Wizard kit"
	title.add_theme_color_override("font_color", Color("ffdca8"))
	title.add_theme_font_size_override("font_size", 14)
	hud_inventory.add_child(title)

	var equipment_grid := GridContainer.new()
	equipment_grid.columns = 3
	equipment_grid.add_theme_constant_override("h_separation", 6)
	equipment_grid.add_theme_constant_override("v_separation", 6)
	hud_inventory.add_child(equipment_grid)
	for slot_name in ["Weapon", "Ward", "Boots", "Charm", "Light", "Pack"]:
		var button := Button.new()
		button.custom_minimum_size = Vector2(180, 42)
		button.pressed.connect(_select_equipment_slot.bind(slot_name))
		equipment_grid.add_child(button)
		equipment_slot_buttons[slot_name] = button

	var pack_label := Label.new()
	pack_label.text = "Collected items"
	pack_label.add_theme_color_override("font_color", Color("d9f6ff"))
	pack_label.add_theme_font_size_override("font_size", 13)
	hud_inventory.add_child(pack_label)

	inventory_grid = GridContainer.new()
	inventory_grid.columns = 4
	inventory_grid.add_theme_constant_override("h_separation", 6)
	inventory_grid.add_theme_constant_override("v_separation", 6)
	hud_inventory.add_child(inventory_grid)

	inventory_detail = Label.new()
	inventory_detail.add_theme_color_override("font_color", Color("f7e3c2"))
	inventory_detail.add_theme_font_size_override("font_size", 13)
	inventory_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_inventory.add_child(inventory_detail)


func _select_inventory_item(item_name: String) -> void:
	selected_inventory_item = item_name
	inventory_signature = ""
	_refresh_inventory_panel()


func _select_equipment_slot(slot_name: String) -> void:
	selected_inventory_item = _equipped_item_for_slot(slot_name)
	inventory_signature = ""
	_refresh_inventory_panel()


func _refresh_inventory_panel() -> void:
	if inventory_grid == null:
		return
	var signature := _inventory_state_signature()
	if signature == inventory_signature:
		return
	inventory_signature = signature
	_update_equipment_buttons()
	for child in inventory_grid.get_children():
		child.queue_free()
	for item_name in _inventory_entries():
		var button := Button.new()
		button.text = "%s\n%s" % [_item_icon(item_name), _short_item_name(item_name)]
		button.custom_minimum_size = Vector2(128, 44)
		button.tooltip_text = _item_detail(item_name)
		_style_inventory_button(button, item_name == selected_inventory_item)
		button.pressed.connect(_select_inventory_item.bind(item_name))
		inventory_grid.add_child(button)
	if inventory_detail:
		inventory_detail.text = "%s: %s" % [_display_item_name(selected_inventory_item), _item_detail(selected_inventory_item)]


func _update_equipment_buttons() -> void:
	for slot_name in ["Weapon", "Ward", "Boots", "Charm", "Light", "Pack"]:
		var button: Button = equipment_slot_buttons.get(slot_name)
		if button == null:
			continue
		var item_name := _equipped_item_for_slot(slot_name)
		button.text = "%s  %s\n%s" % [_item_icon(item_name), slot_name, _short_item_name(item_name)]
		button.tooltip_text = _item_detail(item_name)
		_style_inventory_button(button, item_name == selected_inventory_item)


func _equipped_item_for_slot(slot_name: String) -> String:
	match slot_name:
		"Weapon":
			return "Orb Staff"
		"Ward":
			return "Arcane Ward"
		"Boots":
			return "Silent Boots" if _has_inventory_item("Silent Boots") else "Empty Boots"
		"Charm":
			return "Bloodstone Charm" if _has_inventory_item("Bloodstone Charm") else "Empty Charm"
		"Light":
			return "Crypt Lantern" if _has_inventory_item("Crypt Lantern") else "Empty Light"
		"Pack":
			return "Loot Satchel" if _has_inventory_item("Loot Satchel") else "Small Pouch"
	return slot_name


func _inventory_state_signature() -> String:
	return "%s|%d|%d|%d|%s" % [_inventory_summary(), potion_count, hero_gold, discovery_count, selected_inventory_item]


func _inventory_entries() -> Array[String]:
	var entries: Array[String] = ["Orb Staff", "Arcane Ward"]
	if potion_count > 0:
		entries.append("Dungeon Herb x%d" % potion_count)
	if hero_gold > 0:
		entries.append("Old Gold x%d" % hero_gold)
	if discovery_count > 0:
		entries.append("Ancient Rune x%d" % discovery_count)
	var seen: Dictionary = {}
	for item_name in inventory:
		if not seen.has(item_name):
			entries.append(item_name)
			seen[item_name] = true
	return entries


func _style_inventory_button(button: Button, selected: bool) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.24, 0.12, 0.08, 0.76) if selected else Color(0.07, 0.09, 0.12, 0.58)
	style.border_color = Color("ffd15a") if selected else Color(0.75, 0.86, 1.0, 0.22)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("hover", style)
	button.add_theme_color_override("font_color", Color("fff3d0") if selected else Color("d7e8ff"))
	button.add_theme_font_size_override("font_size", 12)


func _set_click_to_move_enabled(enabled: bool) -> void:
	click_to_move_enabled = enabled
	if not enabled:
		_clear_click_move_target()
	if hud_hint:
		hud_hint.text = "Click-to-move enabled. Left-click a clear floor tile, or steer with WASD, mouse wheel, and right-drag." if enabled else "Click-to-move disabled. Use WASD, right-drag camera, wheel zoom, or both mouse buttons to move."


func _is_pointer_over_hud() -> bool:
	if hud_panel == null:
		return false
	var hovered := get_viewport().gui_get_hovered_control()
	return hovered == hud_panel or (hovered != null and hud_panel.is_ancestor_of(hovered))


func _set_click_move_target_from_screen(screen_position: Vector2) -> void:
	if camera == null:
		return
	var ray_origin := camera.project_ray_origin(screen_position)
	var ray_direction := camera.project_ray_normal(screen_position)
	var floor_plane := Plane(Vector3.UP, 0.0)
	var hit: Variant = floor_plane.intersects_ray(ray_origin, ray_direction)
	if hit == null:
		return
	var target: Vector3 = hit
	var target_cell := _dungeon_world_to_cell(target)
	if not _is_walkable_cell(target_cell):
		hud_hint.text = "That floor is blocked. Pick a clear dungeon path."
		return
	click_move_target = _dungeon_cell_to_world(target_cell)
	click_move_target.y = 0.0
	click_move_active = true
	_show_click_move_marker(click_move_target)


func _show_click_move_marker(pos: Vector3) -> void:
	if click_move_marker == null:
		click_move_marker = _add_ellipse_disc_local(Vector3.ZERO, Vector2(0.44, 0.44), 0.014, _mat("173047", 0.68, "79d2ff", 0.18), self, 0.0)
		click_move_marker.name = "Click Move Target"
		click_move_marker.transparency = 0.46
	click_move_marker.position = pos + Vector3(0.0, 0.03, 0.0)
	click_move_marker.visible = true


func _clear_click_move_target() -> void:
	click_move_active = false
	if click_move_marker:
		click_move_marker.visible = false


func _adjust_camera_zoom(amount: float) -> void:
	camera_zoom = clampf(camera_zoom + amount, 0.0, 1.0)
	if hud_hint:
		var zoom_label := "close" if camera_zoom > 0.72 else ("mid" if camera_zoom > 0.34 else "wide")
		hud_hint.text = "Camera zoom: %s. Hold right mouse and drag to look around." % zoom_label


func _update_hero(delta: float) -> void:
	var input := Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		input.x -= 1.0
	if Input.is_action_pressed("move_right"):
		input.x += 1.0
	if Input.is_action_pressed("move_up") or (left_mouse_down and right_mouse_down):
		input.y += 1.0
	if Input.is_action_pressed("move_down"):
		input.y -= 1.0

	var desired := _camera_right() * input.x + _camera_forward() * input.y
	if desired.length() > 1.0:
		desired = desired.normalized()
	if desired.length() > 0.05:
		_clear_click_move_target()
	elif click_move_active:
		var to_target := click_move_target - hero.position
		to_target.y = 0.0
		if to_target.length() < 0.18:
			_clear_click_move_target()
		else:
			desired = to_target.normalized()

	hero_velocity = hero_velocity.lerp(desired * (HERO_SPEED + hero_speed_bonus), clampf(delta * HERO_ACCEL, 0.0, 1.0))
	_move_hero_with_dungeon_collision(hero_velocity * delta)
	hero.position.y = sin(Time.get_ticks_msec() * 0.009) * 0.025 if hero_velocity.length() > 0.1 else 0.0

	if hero_velocity.length() > 0.25:
		var facing := _camera_forward() if right_mouse_down else hero_velocity.normalized()
		hero.rotation.y = lerp_angle(hero.rotation.y, _rotation_from_direction(facing), delta * 12.0)

	if Input.is_action_just_pressed("inspect"):
		_inspect_area()
	if Input.is_action_just_pressed("drink_potion"):
		_drink_potion()

	var pulse := 1.0 + sin(Time.get_ticks_msec() * 0.008) * 0.04
	hero_ring.scale = Vector3(pulse, 1.0, pulse)
	hero_body.scale = Vector3.ONE if hurt_timer <= 0.0 else Vector3(1.12, 0.92, 1.12)
	_update_hero_combat_visuals(delta)


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


func _hero_forward() -> Vector3:
	if not is_instance_valid(hero):
		return Vector3.FORWARD
	return Vector3(-sin(hero.rotation.y), 0.0, -cos(hero.rotation.y)).normalized()


func _use_sword_swing() -> void:
	if sword_swing_cooldown > 0.0 or game_over:
		return
	sword_swing_timer = SWORD_SWING_DURATION
	sword_swing_cooldown = SWORD_SWING_COOLDOWN
	var hero_forward := _hero_forward()
	fire_bolt_start = hero.position + Vector3(0.0, 1.1, 0.0) + hero_forward * 0.48
	fire_bolt_end = fire_bolt_start + hero_forward * FIRE_BOLT_RANGE
	var best_creature: Dictionary = {}
	var best_distance := FIRE_BOLT_RANGE + 1.0
	for creature in creatures.duplicate():
		var node: Node3D = creature.node
		if not is_instance_valid(node):
			creatures.erase(creature)
			continue
		var to_creature := (node.position + Vector3(0.0, 0.42, 0.0)) - fire_bolt_start
		var distance_forward := to_creature.dot(hero_forward)
		if distance_forward < 0.2 or distance_forward > FIRE_BOLT_RANGE:
			continue
		var miss_distance := (to_creature - hero_forward * distance_forward).length()
		if miss_distance > 0.7:
			continue
		if distance_forward < best_distance:
			best_distance = distance_forward
			best_creature = creature
	if not best_creature.is_empty():
		var node: Node3D = best_creature.node
		fire_bolt_end = node.position + Vector3(0.0, 0.42, 0.0)
		creatures.erase(best_creature)
		node.queue_free()
		_grant_xp(12, "Firebolt burned through a dungeon shade.")
	else:
		hud_hint.text = "Firebolt launched. Aim the staff at a shade and press 1."


func _use_shield_block() -> void:
	if shield_block_cooldown > 0.0 or game_over:
		return
	shield_block_timer = SHIELD_BLOCK_DURATION
	shield_block_cooldown = SHIELD_BLOCK_COOLDOWN
	hud_hint.text = "Shield raised. Incoming hits are heavily reduced."


func _update_hero_combat_visuals(delta: float) -> void:
	var swing_t := 0.0
	var swing_active := sword_swing_timer > 0.0
	if swing_active:
		swing_t = 1.0 - (sword_swing_timer / SWORD_SWING_DURATION)
	if hero_sword:
		if swing_active:
			var arc := sin(swing_t * PI)
			hero_sword.position = Vector3(0.42, 0.9 + arc * 0.08, lerpf(-0.18, -0.34, arc))
			hero_sword.rotation_degrees.x = lerpf(-8.0, -22.0, arc)
			hero_sword.rotation_degrees.y = lerpf(0.0, -10.0, arc)
			hero_sword.rotation_degrees.z = lerpf(-8.0, -28.0, arc)
			hero_sword.scale = Vector3.ONE * (1.0 + arc * 0.18)
		else:
			hero_sword.position = hero_sword.position.lerp(Vector3(0.42, 0.83, -0.12), delta * 12.0)
			hero_sword.rotation_degrees.x = lerpf(hero_sword.rotation_degrees.x, 0.0, delta * 11.0)
			hero_sword.rotation_degrees.y = lerpf(hero_sword.rotation_degrees.y, 0.0, delta * 11.0)
			hero_sword.rotation_degrees.z = lerpf(hero_sword.rotation_degrees.z, -8.0, delta * 11.0)
			hero_sword.scale = hero_sword.scale.lerp(Vector3.ONE, delta * 10.0)
	if staff_orb:
		var orb_pulse := 1.0 + sin(Time.get_ticks_msec() * 0.01) * 0.025
		if swing_active:
			orb_pulse += sin(swing_t * PI) * 0.08
		staff_orb.position = hero_sword.position + Vector3(0.0, 0.59, 0.0) if hero_sword else Vector3(0.42, 1.42, -0.12)
		staff_orb.scale = Vector3.ONE * (STAFF_ORB_RADIUS * orb_pulse)
	_update_view_sword_visuals(delta, swing_t, swing_active)
	_update_fire_bolt_visuals(swing_t, swing_active)
	if hero_shield:
		hero_shield.visible = shield_block_timer > 0.0
		if hero_shield.visible:
			var block_pulse := 1.0 + sin(Time.get_ticks_msec() * 0.02) * 0.08
			hero_shield.scale = Vector3(block_pulse, 1.0, block_pulse)
		else:
			hero_shield.scale = Vector3.ONE
	if hero_light:
		hero_light.light_energy = 1.18 if shield_block_timer > 0.0 else 0.92
		hero_light.omni_range = 5.7 if shield_block_timer > 0.0 else 5.25
	if sword_light:
		sword_light.visible = false
		sword_light.light_energy = SWORD_LIGHT_SWING_ENERGY if swing_active else SWORD_LIGHT_BASE_ENERGY
		sword_light.omni_range = 0.1
		sword_light.position = staff_orb.position if staff_orb else Vector3(0.42, 1.42, -0.12)


func _update_view_sword_visuals(delta: float, swing_t: float, swing_active: bool) -> void:
	if view_sword == null or view_sword_guard == null or view_sword_slash == null or view_staff_orb == null:
		return
	var close_alpha := clampf((camera_zoom - 0.48) / 0.34, 0.0, 1.0)
	var show_close_sword := close_alpha > 0.02
	view_sword.visible = show_close_sword
	view_sword_guard.visible = show_close_sword
	view_staff_orb.visible = show_close_sword
	view_sword_slash.visible = show_close_sword and swing_active
	if not show_close_sword:
		return
	if swing_active:
		var arc := sin(swing_t * PI)
		view_sword.position = Vector3(0.5, lerpf(-0.52, -0.42, arc), lerpf(-0.74, -0.98, arc))
		view_sword.rotation_degrees = Vector3(lerpf(-78.0, -62.0, arc), -18.0, lerpf(18.0, -14.0, arc))
		view_sword.scale = Vector3.ONE * ((0.9 + arc * 0.24) * close_alpha)
		view_sword_guard.position = view_sword.position + Vector3(0.0, -0.12, 0.28)
		view_sword_guard.rotation_degrees = view_sword.rotation_degrees + Vector3(0.0, 0.0, 90.0)
		view_sword_guard.scale = Vector3.ONE * close_alpha
		view_staff_orb.position = view_sword.position + Vector3(0.0, 0.38, -0.34)
		view_staff_orb.scale = Vector3.ONE * (VIEW_STAFF_ORB_RADIUS * (1.0 + arc * 0.25) * close_alpha)
		view_sword_slash.position = Vector3(0.08, lerpf(-0.12, -0.2, swing_t), lerpf(-1.05, -1.75, swing_t))
		view_sword_slash.rotation_degrees = Vector3(0.0, 0.0, lerpf(8.0, -8.0, swing_t))
		view_sword_slash.scale = Vector3(1.0 + swing_t * 1.35, close_alpha * (0.5 + arc), close_alpha * (0.5 + arc))
		view_sword_slash.transparency = lerpf(0.38, 0.08, arc)
	else:
		view_sword.position = view_sword.position.lerp(Vector3(0.46, -0.42, -0.82), delta * 9.0)
		view_sword.rotation_degrees = view_sword.rotation_degrees.lerp(Vector3(-72.0, -14.0, 16.0), delta * 9.0)
		view_sword.scale = view_sword.scale.lerp(Vector3.ONE * (0.74 * close_alpha), delta * 9.0)
		view_sword_guard.position = view_sword.position + Vector3(0.0, -0.12, 0.28)
		view_sword_guard.rotation_degrees = view_sword.rotation_degrees + Vector3(0.0, 0.0, 90.0)
		view_sword_guard.scale = Vector3.ONE * close_alpha
		view_staff_orb.position = view_sword.position + Vector3(0.0, 0.38, -0.34)
		view_staff_orb.scale = view_staff_orb.scale.lerp(Vector3.ONE * (VIEW_STAFF_ORB_RADIUS * close_alpha), delta * 9.0)


func _update_fire_bolt_visuals(swing_t: float, swing_active: bool) -> void:
	if fire_bolt_beam == null or fire_bolt_tip == null or fire_bolt_light == null:
		return
	fire_bolt_beam.visible = swing_active
	fire_bolt_tip.visible = swing_active
	fire_bolt_light.visible = swing_active
	if not swing_active:
		return
	var bolt_progress := clampf(swing_t * 1.25, 0.0, 1.0)
	var bolt_head := fire_bolt_start.lerp(fire_bolt_end, bolt_progress)
	var beam_mid := fire_bolt_start.lerp(bolt_head, 0.5)
	var beam_length := maxf(fire_bolt_start.distance_to(bolt_head), 0.12)
	fire_bolt_beam.position = beam_mid
	fire_bolt_beam.scale = Vector3(1.0 + sin(swing_t * PI) * 0.45, 1.0 + sin(swing_t * PI) * 0.45, beam_length)
	if beam_mid.distance_to(bolt_head) > 0.01:
		fire_bolt_beam.look_at(bolt_head, Vector3.UP)
	fire_bolt_tip.position = bolt_head
	fire_bolt_tip.scale = Vector3.ONE * (0.22 * (1.0 + sin(swing_t * PI) * 0.32))
	fire_bolt_light.position = bolt_head


func _inspect_area() -> void:
	if inspect_cooldown > 0.0:
		return
	inspect_cooldown = 0.3
	sword_swing_timer = maxf(sword_swing_timer, 0.12)
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
	var zoom_t := _camera_zoom_curve()
	var look_height := lerpf(0.34, 1.08, zoom_t)
	var look_ahead := lerpf(0.0, 4.2, zoom_t)
	var focus := hero.position + Vector3(0.0, look_height, 0.0) + _camera_forward() * look_ahead
	var distance := lerpf(CAMERA_FAR_DISTANCE, CAMERA_NEAR_DISTANCE, zoom_t)
	var target := focus - _camera_view_forward() * distance
	target.y = maxf(target.y, lerpf(1.0, 1.18, zoom_t))
	if zoom_t > 0.48:
		target = _resolve_close_camera_position(focus, target)
	camera.position = camera.position.lerp(target, clampf(delta * lerpf(4.0, 9.0, zoom_t), 0.0, 1.0))
	camera.fov = lerpf(camera.fov, lerpf(CAMERA_FAR_FOV, CAMERA_NEAR_FOV, zoom_t), clampf(delta * 6.0, 0.0, 1.0))
	camera.look_at(focus, Vector3.UP)


func _resolve_close_camera_position(focus: Vector3, desired: Vector3) -> Vector3:
	var desired_cell := _dungeon_world_to_cell(Vector3(desired.x, 0.0, desired.z))
	if _is_walkable_cell(desired_cell):
		return desired
	for i in range(8, 0, -1):
		var test := focus.lerp(desired, float(i) / 8.0)
		var test_cell := _dungeon_world_to_cell(Vector3(test.x, 0.0, test.z))
		if _is_walkable_cell(test_cell):
			test.y = desired.y
			return test
	return focus - _camera_view_forward() * 0.28


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
	if shield_block_timer > 0.0:
		amount *= 0.25
		hud_hint.text = "Blocked the shade's hit."
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
	inventory_signature = ""


func _has_inventory_item(item_name: String) -> bool:
	return inventory.has(item_name)


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
	_refresh_inventory_panel()
	if sword_button:
		sword_button.disabled = sword_swing_cooldown > 0.0
		sword_button.text = "1  Firebolt" if sword_swing_cooldown <= 0.0 else "1  %.1fs" % sword_swing_cooldown
	if shield_button:
		shield_button.disabled = shield_block_cooldown > 0.0
		shield_button.text = "2  Block" if shield_block_cooldown <= 0.0 else ("2  Holding" if shield_block_timer > 0.0 else "2  %.1fs" % shield_block_cooldown)
	if click_to_move_checkbox:
		click_to_move_checkbox.set_pressed_no_signal(click_to_move_enabled)
	if hud_hint.text == "":
		hud_hint.text = "WASD moves. Right-drag looks around, mouse wheel zooms close. 1 casts Firebolt, 2 blocks."


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


func _item_icon(item_name: String) -> String:
	if item_name.begins_with("Dungeon Herb"):
		return "[HERB]"
	if item_name.begins_with("Old Gold"):
		return "[GOLD]"
	if item_name.begins_with("Ancient Rune") or item_name == "Ancient Rune":
		return "[RUNE]"
	match item_name:
		"Orb Staff":
			return "[STAFF]"
		"Arcane Ward":
			return "[WARD]"
		"Silent Boots":
			return "[BOOTS]"
		"Bone Compass":
			return "[COMP]"
		"Bloodstone Charm":
			return "[CHARM]"
		"Crypt Lantern":
			return "[LAMP]"
		"Loot Satchel", "Small Pouch":
			return "[BAG]"
		"Empty Boots", "Empty Charm", "Empty Light":
			return "[EMPTY]"
	return "[ITEM]"


func _short_item_name(item_name: String) -> String:
	return item_name.replace("Dungeon ", "").replace("Bloodstone ", "").replace("Crypt ", "").replace("Loot ", "")


func _display_item_name(item_name: String) -> String:
	if item_name.begins_with("Dungeon Herb"):
		return "Dungeon Herb"
	if item_name.begins_with("Old Gold"):
		return "Old Gold"
	if item_name.begins_with("Ancient Rune"):
		return "Ancient Rune"
	return item_name


func _item_detail(item_name: String) -> String:
	if item_name.begins_with("Dungeon Herb"):
		return "Quick healing supplies carried in the pack. Press Q when wounded."
	if item_name.begins_with("Old Gold"):
		return "Dungeon coinage. Useful later for shops, upgrades, and spellcraft."
	if item_name.begins_with("Ancient Rune"):
		return "Rune fragments weaken the exit seal. They sit in the wizard's pack until the gate opens."
	match item_name:
		"Orb Staff":
			return "Equipped weapon. A blazing orb staff channels Firebolt from hot amber light."
		"Arcane Ward":
			return "Equipped defense. Press 2 to raise a ward and reduce incoming shade damage."
		"Silent Boots":
			return "Equipped feet. These boots increase movement speed and make exploration smoother."
		"Bone Compass":
			return "Pack relic. The compass points deeper into the dungeon and hints at future floors."
		"Bloodstone Charm":
			return "Equipped charm. It increased maximum health when collected."
		"Crypt Lantern":
			return "Equipped light. A small dungeon lantern that helps the wizard read the dark."
		"Loot Satchel":
			return "Equipped pack. More room for coins, herbs, relics, and future equipment."
		"Small Pouch":
			return "Starter pack slot. Find a satchel to upgrade this equipment slot."
		"Empty Boots":
			return "Empty equipment slot. Find boots to improve movement."
		"Empty Charm":
			return "Empty equipment slot. Find a charm to improve survivability."
		"Empty Light":
			return "Empty equipment slot. Find a lantern or magical light source."
	return "A discovered item waiting for a future use."


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
