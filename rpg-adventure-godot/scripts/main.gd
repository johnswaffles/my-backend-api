extends Node3D

const HERO_SPEED := 6.2
const HERO_ACCEL := 11.0
const CREATURE_COUNT := 5
const DISCOVERIES_NEEDED := 6
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
const STAFF_TIP_OFFSET := 0.56
const VIEW_STAFF_TIP_OFFSET := 0.53
const SWORD_LIGHT_BASE_ENERGY := 0.0
const SWORD_LIGHT_SWING_ENERGY := 0.0
const FIRE_BOLT_RANGE := 7.5
const SHIELD_BLOCK_DURATION := 1.1
const SHIELD_BLOCK_COOLDOWN := 1.8
const DUNGEON_AMBIENT_BASE := 0.24
const DUNGEON_FILL_BASE := 0.42
const LANTERN_LIGHT_BASE_ENERGY := 3.2
const LANTERN_LIGHT_BURST_ENERGY := 9.5
const DUNGEON_BRIGHTNESS_LABELS := ["Mansion 100%", "Mansion 140%", "Mansion 180%", "Mansion 230%"]
const DUNGEON_BRIGHTNESS_SCALES := [1.0, 1.4, 1.8, 2.3]
const DUNGEON_LAYOUT := [
	"#############################",
	"#S....#.........#...........#",
	"#.....#.........#...........#",
	"#.....#....#....#.....#.....#",
	"#.....#....#..........#.....#",
	"###.####.###########.###.####",
	"#........#.........#........#",
	"#........#.........#........#",
	"#....#.............#....#...#",
	"#....#....#####....#....#...#",
	"#...........#...............#",
	"####.###....#....###.########",
	"#......#.........#..........#",
	"#......#.........#..........#",
	"#..#.......###.......#......#",
	"#..#.......#E#.......#......#",
	"#......#...###...#..........#",
	"#......#.........#..........#",
	"#############################",
]

var rng := RandomNumberGenerator.new()
var camera: Camera3D
var hero: Node3D
var hero_body: MeshInstance3D
var hero_sword: MeshInstance3D
var hero_shield: MeshInstance3D
var hero_ring: MeshInstance3D
var hero_left_arm_pivot: Node3D
var hero_right_arm_pivot: Node3D
var hero_left_sleeve: MeshInstance3D
var hero_right_sleeve: MeshInstance3D
var hero_right_hand: MeshInstance3D
var hero_light: OmniLight3D
var hero_lantern: Node3D
var hero_lantern_light: OmniLight3D
var hero_lantern_glow: MeshInstance3D
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
var lantern_burst_ring: MeshInstance3D
var lantern_burst_ring_outer: MeshInstance3D
var lantern_burst_ray_root: Node3D
var lantern_burst_light: OmniLight3D
var fairy: Node3D
var fairy_body: MeshInstance3D
var fairy_left_wing: MeshInstance3D
var fairy_right_wing: MeshInstance3D
var fairy_left_lower_wing: MeshInstance3D
var fairy_right_lower_wing: MeshInstance3D
var fairy_light: OmniLight3D
var fairy_request: HTTPRequest
var fairy_request_pending := false
var fairy_last_request_ms := -20000
var fairy_context_event := ""
var dungeon_environment: Environment
var dungeon_fill_light: DirectionalLight3D
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
var inspectables: Array[Dictionary] = []
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
var fairy_panel: PanelContainer
var fairy_label: Label
var hud_inventory: VBoxContainer
var equipment_slot_buttons: Dictionary = {}
var inventory_grid: GridContainer
var inventory_detail: Label
var sword_button: Button
var shield_button: Button
var brightness_dropdown: OptionButton
var click_to_move_checkbox: CheckBox
var health_bar: ProgressBar
var xp_bar: ProgressBar
var hud_minimized := false
var selected_inventory_item := "Orb Staff"
var inventory_signature := ""
var dungeon_brightness_scale := 1.0


func _ready() -> void:
	rng.randomize()
	_ensure_input_map()
	_build_world()
	_spawn_hero()
	_spawn_fairy()
	_spawn_creatures()
	_spawn_pickups()
	_spawn_inspectables()
	_build_hud()
	_fairy_comment("entered mansion", "A mansion this quiet is either abandoned or dramatically waiting for applause.", {"room": "foyer"})
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
	_update_fairy(delta)
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
	dungeon_environment = env
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.name = "Cold Dungeon Fill"
	sun.light_color = Color("8290b8")
	sun.light_energy = 0.42
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-58.0, -24.0, 0.0)
	dungeon_fill_light = sun
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

	var floor_material := _mat("4a3324", 0.88)
	var floor_alt_material := _mat("563b28", 0.88)
	var wall_material := _mat("2c1e22", 0.9)
	var wall_top_material := _mat("5f4736", 0.84)
	var trim_material := _mat("b18a5a", 0.72)
	var runner_material := _mat("4d1830", 0.84, "7e2748", 0.04)
	var rune_material := _mat("3d3752", 0.62, "8f72ff", 0.08)
	var exit_material := _mat("1d2533", 0.82, "8eb8ff", 0.14)

	for z in range(DUNGEON_LAYOUT.size()):
		var row := str(DUNGEON_LAYOUT[z])
		for x in range(row.length()):
			var cell := Vector2i(x, z)
			var marker := row.substr(x, 1)
			var world_pos := _dungeon_cell_to_world(cell)
			if marker == "#":
				var height := 1.52 + 0.08 * float((x + z) % 3)
				_add_box(world_pos + Vector3(0.0, height * 0.5, 0.0), Vector3(DUNGEON_TILE_SIZE, height, DUNGEON_TILE_SIZE), wall_material, self)
				_add_box(world_pos + Vector3(0.0, height + 0.035, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.96, 0.07, DUNGEON_TILE_SIZE * 0.96), wall_top_material, self)
				if (x + z) % 5 == 0:
					_add_box(world_pos + Vector3(0.0, 0.2, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.12, 0.16, DUNGEON_TILE_SIZE * 0.92), trim_material, self)
			else:
				walkable_cells.append(cell)
				walkable_lookup[_dungeon_cell_key(cell)] = true
				if marker == "S":
					start_cell = cell
				elif marker == "E":
					exit_cell = cell
				var tile_material := floor_material if (x + z) % 2 == 0 else floor_alt_material
				_add_box(world_pos + Vector3(0.0, -0.035, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.96, 0.07, DUNGEON_TILE_SIZE * 0.96), tile_material, self)
				if (z == 10 and x > 3 and x < 25) or (x == 14 and z > 5 and z < 17):
					_add_box(world_pos + Vector3(0.0, 0.012, 0.0), Vector3(DUNGEON_TILE_SIZE * 0.78, 0.03, DUNGEON_TILE_SIZE * 0.78), runner_material, self)
				if (x * 7 + z * 3) % 17 == 0:
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
		Vector2i(10, 1),
		Vector2i(23, 1),
		Vector2i(3, 6),
		Vector2i(14, 6),
		Vector2i(24, 7),
		Vector2i(6, 12),
		Vector2i(15, 13),
		Vector2i(25, 14),
		Vector2i(8, 17),
	]:
		_add_torch(_dungeon_cell_to_world(cell))


func _add_torch(pos: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Dungeon Torch"
	root.position = pos + Vector3(0.0, 0.0, 0.0)
	add_child(root)
	_add_box(Vector3(0.0, 0.72, 0.34), Vector3(0.42, 0.12, 0.12), _mat("493222", 0.88), root)
	_add_cylinder(Vector3(0.0, 0.72, 0.12), 0.06, 0.26, _mat("2b2020", 0.82), root).rotation_degrees.x = 90.0
	var flame := _add_sphere(Vector3(0.0, 0.86, 0.02), 0.075, 0.14, _mat("ff9d42", 0.22, "ffc15a", 0.9), root)
	decor_bobs.append(flame)
	var light := OmniLight3D.new()
	light.name = "Torch Glow"
	light.light_color = Color("ffad62")
	light.light_energy = 0.55
	light.omni_range = 3.4
	light.shadow_enabled = false
	light.position = Vector3(0.0, 0.9, 0.02)
	root.add_child(light)


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
	for i in range(30):
		var pos := _random_open_position()
		if pos.distance_to(_dungeon_cell_to_world(start_cell)) < 2.8:
			continue
		if i % 4 == 0:
			_add_box(pos + Vector3(0.0, 0.06, 0.0), Vector3(0.42, 0.055, 0.3), _mat("7d2d43", 0.76), self).rotation_degrees.y = rng.randf_range(0.0, 180.0)
		elif i % 4 == 1:
			var book := _add_box(pos + Vector3(0.0, 0.08, 0.0), Vector3(0.36, 0.08, 0.24), _mat(["4e2f6d", "1f5c63", "774626"][i % 3], 0.72), self)
			book.rotation_degrees.y = rng.randf_range(0.0, 180.0)
		elif i % 4 == 2:
			var chair := _add_box(pos + Vector3(0.0, 0.22, 0.0), Vector3(0.36, 0.14, 0.36), _mat("5b3c27", 0.78), self)
			chair.rotation_degrees.y = rng.randf_range(-70.0, 70.0)
			_add_box(pos + Vector3(0.0, 0.48, 0.17), Vector3(0.38, 0.48, 0.08), _mat("4a301f", 0.82), self).rotation_degrees.y = chair.rotation_degrees.y
		else:
			_add_cylinder(pos + Vector3(0.0, 0.22, 0.0), 0.08, 0.34, _mat("8a6a42", 0.72), self)
			_add_sphere(pos + Vector3(0.0, 0.43, 0.0), 0.07, 0.1, _mat("ffb45b", 0.32, "ffd29a", 0.28), self)


func _spawn_hero() -> void:
	hero = Node3D.new()
	hero.name = "Hero"
	hero.position = _dungeon_cell_to_world(start_cell)
	add_child(hero)

	hero_ring = _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(1.45, 1.45), 0.018, _mat("172941", 0.72, "5eb9ff", 0.1), hero, 0.0)
	hero_ring.transparency = 0.42
	hero_body = _add_cylinder(Vector3(0.0, 0.62, 0.0), 0.28, 0.78, _mat("344d75", 0.72), hero)
	_add_cylinder(Vector3(0.0, 0.68, 0.0), 0.34, 0.12, _mat("223d65", 0.72, "517ad2", 0.12), hero)
	_add_sphere(Vector3(0.0, 1.18, 0.0), 0.24, 0.25, _mat("f2c49b", 0.78), hero)
	_add_sphere(Vector3(-0.08, 1.2, -0.21), 0.026, 0.026, _mat("162236", 0.62), hero)
	_add_sphere(Vector3(0.08, 1.2, -0.21), 0.026, 0.026, _mat("162236", 0.62), hero)
	_add_box(Vector3(0.0, 1.11, -0.24), Vector3(0.18, 0.06, 0.07), _mat("d69b71", 0.76), hero)
	_add_sphere(Vector3(0.0, 1.02, -0.2), 0.16, 0.12, _mat("d8d6cf", 0.68, "f4f0df", 0.05), hero)
	_add_box(Vector3(0.0, 0.78, -0.23), Vector3(0.08, 0.58, 0.07), _mat("16151f", 0.88), hero)
	_add_box(Vector3(0.0, 0.78, 0.22), Vector3(0.5, 0.68, 0.08), _mat("49306f", 0.76, "8057ff", 0.14), hero)
	_add_box(Vector3(0.0, 0.72, -0.3), Vector3(0.52, 0.07, 0.08), _mat("c69d4d", 0.66, "ffd16b", 0.12), hero)
	hero_left_arm_pivot = Node3D.new()
	hero_left_arm_pivot.name = "Left Shoulder Pivot"
	hero_left_arm_pivot.position = Vector3(-0.27, 1.0, -0.07)
	hero_left_arm_pivot.rotation_degrees = Vector3(0.0, 0.0, -18.0)
	hero.add_child(hero_left_arm_pivot)
	hero_left_sleeve = _add_cylinder(Vector3(0.0, -0.23, 0.0), 0.055, 0.46, _mat("2c4974", 0.72, "5b8de3", 0.1), hero_left_arm_pivot)
	hero_right_arm_pivot = Node3D.new()
	hero_right_arm_pivot.name = "Right Shoulder Pivot"
	hero_right_arm_pivot.position = Vector3(0.27, 1.0, -0.08)
	hero_right_arm_pivot.rotation_degrees = Vector3(0.0, 0.0, 20.0)
	hero.add_child(hero_right_arm_pivot)
	hero_right_sleeve = _add_cylinder(Vector3(0.0, -0.25, 0.0), 0.055, 0.5, _mat("2c4974", 0.72, "5b8de3", 0.1), hero_right_arm_pivot)
	hero_right_hand = _add_sphere(Vector3(0.0, -0.52, 0.0), 0.075, 0.075, _mat("f2c49b", 0.78), hero_right_arm_pivot)
	_add_cylinder(Vector3(0.0, 1.42, 0.0), 0.34, 0.08, _mat("21172f", 0.78, "7c5cff", 0.14), hero)
	_add_cylinder(Vector3(0.0, 1.48, 0.0), 0.23, 0.08, _mat("33214d", 0.76, "8d6cff", 0.14), hero)
	var wizard_hat := _add_cone(Vector3(0.0, 1.75, 0.0), 0.24, 0.62, _mat("241836", 0.78, "8b68ff", 0.12), hero)
	wizard_hat.rotation_degrees = Vector3(0.0, 0.0, -4.0)
	_add_box(Vector3(0.0, 1.48, -0.01), Vector3(0.34, 0.035, 0.08), _mat("c69d4d", 0.66, "ffd16b", 0.12), hero)
	hero_sword = _add_cylinder(Vector3(0.42, 0.83, -0.12), 0.045, 1.04, _mat("6a3f22", 0.72, "ff8f3b", 0.18), hero)
	hero_sword.rotation_degrees.z = -8.0
	_add_box(Vector3(0.42, 0.38, -0.12), Vector3(0.22, 0.07, 0.08), _mat("d4a94d", 0.68, "ffc45d", 0.18), hero)
	staff_orb = _add_sphere(_staff_tip_position(), STAFF_ORB_RADIUS, STAFF_ORB_RADIUS, _mat("f6c66e", 0.36, "ffd27a", 0.35), hero)
	hero_shield = _add_box(Vector3(-0.34, 0.68, -0.28), Vector3(0.14, 0.58, 0.42), _mat("7f91ac", 0.56, "9ec5ff", 0.16), hero)
	hero_shield.visible = false
	_build_hero_lantern()

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
	_create_lantern_burst_visuals()


func _build_hero_lantern() -> void:
	hero_lantern = Node3D.new()
	hero_lantern.name = "Left Hand Lantern"
	hero_lantern.position = Vector3(-0.43, 0.78, -0.16)
	hero.add_child(hero_lantern)
	_add_cylinder(Vector3(0.0, 0.2, 0.0), 0.055, 0.26, _mat("dad6c8", 0.6), hero_lantern)
	_add_box(Vector3(0.0, 0.2, 0.0), Vector3(0.18, 0.28, 0.12), _mat("d9eaff", 0.42, "f6fbff", 0.35), hero_lantern)
	_add_box(Vector3(0.0, 0.39, 0.0), Vector3(0.22, 0.04, 0.16), _mat("5c4a38", 0.78), hero_lantern)
	_add_box(Vector3(0.0, 0.01, 0.0), Vector3(0.22, 0.04, 0.16), _mat("5c4a38", 0.78), hero_lantern)
	_add_cylinder(Vector3(0.0, 0.48, 0.0), 0.075, 0.025, _mat("c3b28b", 0.64), hero_lantern)
	_add_sphere(Vector3(0.0, 0.32, -0.1), 0.065, 0.065, _mat("f2c49b", 0.78), hero_lantern).name = "Lantern Hand"
	hero_lantern_glow = _add_box(Vector3(0.0, 0.2, 0.0), Vector3(0.1, 0.18, 0.06), _mat("f7fbff", 0.3, "f7fbff", 0.55), hero_lantern)
	hero_lantern_light = OmniLight3D.new()
	hero_lantern_light.name = "Lantern White Light"
	hero_lantern_light.light_color = Color("f4fbff")
	hero_lantern_light.light_energy = LANTERN_LIGHT_BASE_ENERGY
	hero_lantern_light.omni_range = 8.2
	hero_lantern_light.shadow_enabled = false
	hero_lantern_light.position = Vector3(0.0, 0.22, 0.0)
	hero_lantern.add_child(hero_lantern_light)


func _spawn_fairy() -> void:
	fairy = Node3D.new()
	fairy.name = "Pip the Fairy"
	fairy.position = hero.position + Vector3(-0.86, 1.42, 0.46)
	add_child(fairy)
	fairy_body = _add_sphere(Vector3(0.0, -0.03, 0.0), 0.075, 0.12, _mat("7ad9df", 0.38, "baf7ff", 0.35), fairy)
	fairy_body.name = "Pip Body"
	_add_sphere(Vector3(0.0, 0.16, -0.02), 0.07, 0.075, _mat("f3cfad", 0.72), fairy).name = "Pip Head"
	_add_box(Vector3(0.0, -0.12, -0.01), Vector3(0.16, 0.045, 0.12), _mat("4b7dc0", 0.58, "80d8ff", 0.12), fairy).name = "Pip Tunic Hem"
	_add_box(Vector3(-0.045, 0.215, -0.02), Vector3(0.055, 0.035, 0.05), _mat("f2d36e", 0.58, "fff0a6", 0.16), fairy).name = "Pip Hair Left"
	_add_box(Vector3(0.045, 0.215, -0.02), Vector3(0.055, 0.035, 0.05), _mat("f2d36e", 0.58, "fff0a6", 0.16), fairy).name = "Pip Hair Right"
	_add_sphere(Vector3(-0.025, 0.175, -0.086), 0.011, 0.011, _mat("18243a", 0.58), fairy).name = "Pip Eye Left"
	_add_sphere(Vector3(0.025, 0.175, -0.086), 0.011, 0.011, _mat("18243a", 0.58), fairy).name = "Pip Eye Right"
	_add_box(Vector3(-0.105, -0.025, -0.02), Vector3(0.12, 0.024, 0.028), _mat("f3cfad", 0.74), fairy).rotation_degrees.z = -22.0
	_add_box(Vector3(0.105, -0.025, -0.02), Vector3(0.12, 0.024, 0.028), _mat("f3cfad", 0.74), fairy).rotation_degrees.z = 22.0
	_add_box(Vector3(-0.035, -0.205, 0.0), Vector3(0.035, 0.12, 0.035), _mat("f3cfad", 0.74), fairy).rotation_degrees.z = 8.0
	_add_box(Vector3(0.035, -0.205, 0.0), Vector3(0.035, 0.12, 0.035), _mat("f3cfad", 0.74), fairy).rotation_degrees.z = -8.0
	var wing_material := _mat("c6f6ff", 0.2, "efffff", 0.36)
	fairy_left_wing = _add_fairy_wing_panel(
		Vector3(-0.07, 0.08, 0.08),
		PackedVector2Array([Vector2(0.0, 0.0), Vector2(-0.22, 0.24), Vector2(-0.36, 0.12), Vector2(-0.21, -0.04)]),
		wing_material,
		fairy
	)
	fairy_left_wing.name = "Pip Left Upper Wing"
	fairy_right_wing = _add_fairy_wing_panel(
		Vector3(0.07, 0.08, 0.08),
		PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.22, 0.24), Vector2(0.36, 0.12), Vector2(0.21, -0.04)]),
		wing_material,
		fairy
	)
	fairy_right_wing.name = "Pip Right Upper Wing"
	fairy_left_lower_wing = _add_fairy_wing_panel(
		Vector3(-0.06, 0.02, 0.08),
		PackedVector2Array([Vector2(0.0, 0.0), Vector2(-0.18, -0.03), Vector2(-0.28, -0.2), Vector2(-0.09, -0.16)]),
		wing_material,
		fairy,
		0.42
	)
	fairy_left_lower_wing.name = "Pip Left Lower Wing"
	fairy_right_lower_wing = _add_fairy_wing_panel(
		Vector3(0.06, 0.02, 0.08),
		PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.18, -0.03), Vector2(0.28, -0.2), Vector2(0.09, -0.16)]),
		wing_material,
		fairy,
		0.42
	)
	fairy_right_lower_wing.name = "Pip Right Lower Wing"
	var wand := _add_box(Vector3(0.17, 0.035, -0.08), Vector3(0.028, 0.24, 0.028), _mat("805c39", 0.7), fairy)
	wand.name = "Pip Tiny Wand"
	wand.rotation_degrees.z = -28.0
	_add_sphere(Vector3(0.23, 0.15, -0.1), 0.03, 0.03, _mat("fff7bc", 0.28, "fff7bc", 0.9), fairy).name = "Pip Wand Spark"
	fairy_light = OmniLight3D.new()
	fairy_light.name = "Fairy Glow"
	fairy_light.light_color = Color("d9fbff")
	fairy_light.light_energy = 0.32
	fairy_light.omni_range = 1.75
	fairy_light.shadow_enabled = false
	fairy.add_child(fairy_light)

	fairy_request = HTTPRequest.new()
	fairy_request.name = "Fairy LLM Request"
	fairy_request.timeout = 6.0
	fairy_request.request_completed.connect(_on_fairy_request_completed)
	add_child(fairy_request)


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


func _create_lantern_burst_visuals() -> void:
	lantern_burst_ring = _add_ellipse_disc_local(Vector3.ZERO, Vector2(1.0, 1.0), 0.02, _mat("dff7ff", 0.26, "e8fbff", 1.2), self, 0.0)
	lantern_burst_ring.name = "Lantern Burst Inner Ring"
	lantern_burst_ring.transparency = 0.58
	lantern_burst_ring.visible = false
	lantern_burst_ring_outer = _add_ellipse_disc_local(Vector3.ZERO, Vector2(1.0, 1.0), 0.018, _mat("9edcff", 0.28, "c5efff", 0.85), self, 0.0)
	lantern_burst_ring_outer.name = "Lantern Burst Outer Ring"
	lantern_burst_ring_outer.transparency = 0.66
	lantern_burst_ring_outer.visible = false
	lantern_burst_ray_root = Node3D.new()
	lantern_burst_ray_root.name = "Lantern Burst Rays"
	add_child(lantern_burst_ray_root)
	for i in range(10):
		var angle := TAU * float(i) / 10.0
		var direction := Vector3(sin(angle), 0.0, cos(angle))
		var ray := _add_box(direction * 0.75 + Vector3(0.0, 0.12, 0.0), Vector3(0.045, 0.04, 1.5), _mat("dff7ff", 0.24, "f4fdff", 1.4), lantern_burst_ray_root)
		ray.rotation_degrees.y = rad_to_deg(angle)
		ray.transparency = 0.42
	lantern_burst_ray_root.visible = false
	lantern_burst_light = OmniLight3D.new()
	lantern_burst_light.name = "Lantern Arcane Burst Light"
	lantern_burst_light.light_color = Color("e8fbff")
	lantern_burst_light.light_energy = 0.0
	lantern_burst_light.omni_range = 0.1
	lantern_burst_light.shadow_enabled = false
	add_child(lantern_burst_light)


func _spawn_creatures() -> void:
	for i in range(CREATURE_COUNT):
		var pos := _random_open_position()
		while pos.distance_to(hero.position) < 7.0:
			pos = _random_open_position()
		_spawn_creature(pos, i)


func _spawn_creature(pos: Vector3, index: int) -> void:
	var root := Node3D.new()
	root.name = "Mansion Echo"
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
	for i in range(10):
		_spawn_pickup("coin", _random_open_position())
	for i in range(4):
		_spawn_pickup("herb", _random_open_position())
	for cell in [Vector2i(12, 1), Vector2i(23, 3), Vector2i(3, 9), Vector2i(14, 13), Vector2i(24, 16), Vector2i(8, 17)]:
		_spawn_pickup("artifact", _dungeon_cell_to_world(cell))
	_spawn_pickup("boots", _dungeon_cell_to_world(Vector2i(5, 5)))
	_spawn_pickup("compass", _dungeon_cell_to_world(Vector2i(1, 13)))
	_spawn_pickup("heart", _dungeon_cell_to_world(Vector2i(22, 7)))
	_spawn_pickup("lantern", _dungeon_cell_to_world(Vector2i(10, 1)))
	_spawn_pickup("satchel", _dungeon_cell_to_world(Vector2i(5, 16)))


func _spawn_inspectables() -> void:
	inspectables.clear()
	var mansion_objects := [
		{"kind": "chest", "cell": Vector2i(3, 2), "title": "silver-banded chest", "reward": "Moonlit Locket", "xp": 16},
		{"kind": "bookcase", "cell": Vector2i(12, 2), "title": "whispering bookcase", "reward": "Guest Wing Notes", "xp": 14},
		{"kind": "painting", "cell": Vector2i(23, 3), "title": "portrait with watchful eyes", "reward": "Portrait Clue", "xp": 14},
		{"kind": "desk", "cell": Vector2i(3, 8), "title": "dusty writing desk", "reward": "Sealed Letter", "xp": 16},
		{"kind": "mirror", "cell": Vector2i(13, 7), "title": "moon-glass mirror", "reward": "Reflected Sigil", "xp": 18},
		{"kind": "wardrobe", "cell": Vector2i(23, 8), "title": "tall cedar wardrobe", "reward": "Velvet Pouch", "xp": 15},
		{"kind": "cabinet", "cell": Vector2i(5, 13), "title": "locked curiosity cabinet", "reward": "Tiny Brass Key", "xp": 17},
		{"kind": "music_box", "cell": Vector2i(14, 13), "title": "silent music box", "reward": "Clockwork Melody", "xp": 18},
		{"kind": "fireplace", "cell": Vector2i(24, 13), "title": "cold marble fireplace", "reward": "Ashen Crest", "xp": 16},
		{"kind": "globe", "cell": Vector2i(6, 17), "title": "star-map globe", "reward": "Astral Route", "xp": 20},
	]
	for item in mansion_objects:
		_spawn_inspectable(String(item.kind), item.cell, String(item.title), String(item.reward), int(item.xp))


func _spawn_inspectable(kind: String, cell: Vector2i, title: String, reward: String, xp_reward: int) -> void:
	var root := Node3D.new()
	root.name = title.capitalize()
	root.position = _dungeon_cell_to_world(cell)
	add_child(root)
	match kind:
		"chest":
			_add_box(Vector3(0.0, 0.28, 0.0), Vector3(0.82, 0.42, 0.48), _mat("5c3824", 0.76), root)
			_add_box(Vector3(0.0, 0.54, -0.04), Vector3(0.9, 0.12, 0.54), _mat("7c4d2e", 0.72), root)
			_add_box(Vector3(0.0, 0.58, -0.32), Vector3(0.18, 0.16, 0.08), _mat("d4a94d", 0.62, "ffd06a", 0.08), root)
		"bookcase":
			_add_box(Vector3(0.0, 0.72, 0.0), Vector3(0.88, 1.25, 0.28), _mat("473020", 0.74), root)
			for shelf_y in [0.32, 0.62, 0.92]:
				_add_box(Vector3(0.0, shelf_y, -0.16), Vector3(0.76, 0.045, 0.08), _mat("b08355", 0.68), root)
				for i in range(4):
					_add_box(Vector3(-0.28 + i * 0.18, shelf_y + 0.1, -0.2), Vector3(0.08, 0.18, 0.06), _mat(["74405d", "2f5e76", "7c5b2f", "3c6b49"][i], 0.7), root)
		"painting":
			_add_box(Vector3(0.0, 0.86, -0.34), Vector3(0.82, 0.62, 0.06), _mat("c39a59", 0.7), root)
			_add_box(Vector3(0.0, 0.86, -0.38), Vector3(0.62, 0.42, 0.035), _mat("27354d", 0.76, "516a99", 0.05), root)
		"desk":
			_add_box(Vector3(0.0, 0.46, 0.0), Vector3(0.95, 0.14, 0.52), _mat("68442a", 0.76), root)
			_add_box(Vector3(-0.34, 0.23, -0.18), Vector3(0.1, 0.45, 0.1), _mat("4a301f", 0.82), root)
			_add_box(Vector3(0.34, 0.23, -0.18), Vector3(0.1, 0.45, 0.1), _mat("4a301f", 0.82), root)
			_add_box(Vector3(0.08, 0.57, -0.02), Vector3(0.38, 0.025, 0.28), _mat("e4d3aa", 0.64), root)
		"mirror":
			_add_box(Vector3(0.0, 0.85, -0.32), Vector3(0.58, 0.9, 0.08), _mat("a98352", 0.66), root)
			_add_box(Vector3(0.0, 0.85, -0.37), Vector3(0.42, 0.68, 0.035), _mat("86b9d4", 0.28, "bfefff", 0.18), root)
		"wardrobe":
			_add_box(Vector3(0.0, 0.76, 0.0), Vector3(0.82, 1.34, 0.48), _mat("583622", 0.76), root)
			_add_box(Vector3(-0.22, 0.76, -0.27), Vector3(0.035, 1.12, 0.08), _mat("d4a94d", 0.7), root)
			_add_box(Vector3(0.22, 0.76, -0.27), Vector3(0.035, 1.12, 0.08), _mat("d4a94d", 0.7), root)
		"cabinet":
			_add_box(Vector3(0.0, 0.5, 0.0), Vector3(0.72, 0.84, 0.42), _mat("51392a", 0.78), root)
			_add_box(Vector3(0.0, 0.76, -0.24), Vector3(0.56, 0.08, 0.08), _mat("bb8957", 0.7), root)
			_add_box(Vector3(0.0, 0.36, -0.24), Vector3(0.56, 0.08, 0.08), _mat("bb8957", 0.7), root)
		"music_box":
			_add_box(Vector3(0.0, 0.32, 0.0), Vector3(0.68, 0.28, 0.46), _mat("693b3f", 0.7, "c977a8", 0.04), root)
			_add_cylinder(Vector3(0.0, 0.52, -0.02), 0.18, 0.08, _mat("d7ad61", 0.5, "ffd57a", 0.12), root).rotation_degrees.x = 90.0
		"fireplace":
			_add_box(Vector3(0.0, 0.54, 0.0), Vector3(0.98, 0.92, 0.32), _mat("4d4a49", 0.86), root)
			_add_box(Vector3(0.0, 0.38, -0.22), Vector3(0.52, 0.38, 0.1), _mat("201818", 0.92), root)
			_add_sphere(Vector3(0.0, 0.38, -0.28), 0.12, 0.2, _mat("ff8c3a", 0.34, "ffb25b", 0.45), root)
		"globe":
			_add_cylinder(Vector3(0.0, 0.24, 0.0), 0.08, 0.48, _mat("8b663e", 0.74), root)
			_add_sphere(Vector3(0.0, 0.68, 0.0), 0.32, 0.32, _mat("436f8d", 0.68, "83caff", 0.08), root)
			_add_box(Vector3(0.0, 0.68, -0.02), Vector3(0.56, 0.035, 0.035), _mat("d8af66", 0.6), root).rotation_degrees.z = 22.0
	inspectables.append({
		"node": root,
		"kind": kind,
		"title": title,
		"reward": reward,
		"xp": xp_reward,
		"opened": false,
	})


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
	shield_button.text = "2  Lantern"
	shield_button.custom_minimum_size = Vector2(126, 32)
	shield_button.pressed.connect(_use_shield_block)
	action_row.add_child(shield_button)

	brightness_dropdown = OptionButton.new()
	brightness_dropdown.custom_minimum_size = Vector2(140, 32)
	for label in DUNGEON_BRIGHTNESS_LABELS:
		brightness_dropdown.add_item(label)
	brightness_dropdown.selected = 0
	brightness_dropdown.item_selected.connect(_on_brightness_selected)
	action_row.add_child(brightness_dropdown)

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

	fairy_panel = PanelContainer.new()
	var fairy_style := StyleBoxFlat.new()
	fairy_style.bg_color = Color(0.08, 0.11, 0.16, 0.58)
	fairy_style.border_color = Color(0.72, 0.95, 1.0, 0.32)
	fairy_style.border_width_left = 1
	fairy_style.border_width_top = 1
	fairy_style.border_width_right = 1
	fairy_style.border_width_bottom = 1
	fairy_style.corner_radius_top_left = 10
	fairy_style.corner_radius_top_right = 10
	fairy_style.corner_radius_bottom_left = 10
	fairy_style.corner_radius_bottom_right = 10
	fairy_panel.add_theme_stylebox_override("panel", fairy_style)
	hud_details.add_child(fairy_panel)
	fairy_label = Label.new()
	fairy_label.text = "Pip: I have opinions and wings. Both are dangerous indoors."
	fairy_label.add_theme_color_override("font_color", Color("dffbff"))
	fairy_label.add_theme_font_size_override("font_size", 13)
	fairy_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	fairy_panel.add_child(fairy_label)

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
			return "Arcane Burst"
		"Boots":
			return "Silent Boots" if _has_inventory_item("Silent Boots") else "Empty Boots"
		"Charm":
			return "Bloodstone Charm" if _has_inventory_item("Bloodstone Charm") else "Empty Charm"
		"Light":
			return "Mansion Lantern" if _has_inventory_item("Mansion Lantern") else "Held Lantern"
		"Pack":
			return "Loot Satchel" if _has_inventory_item("Loot Satchel") else "Small Pouch"
	return slot_name


func _inventory_state_signature() -> String:
	return "%s|%d|%d|%d|%s" % [_inventory_summary(), potion_count, hero_gold, discovery_count, selected_inventory_item]


func _inventory_entries() -> Array[String]:
	var entries: Array[String] = ["Orb Staff", "Held Lantern", "Arcane Burst"]
	if potion_count > 0:
		entries.append("Mansion Herb x%d" % potion_count)
	if hero_gold > 0:
		entries.append("Old Gold x%d" % hero_gold)
	if discovery_count > 0:
		entries.append("House Sigil x%d" % discovery_count)
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
		hud_hint.text = "Click-to-move enabled. Left-click a clear mansion floor tile, or steer with WASD, mouse wheel, and right-drag." if enabled else "Click-to-move disabled. Use WASD, right-drag camera, wheel zoom, or both mouse buttons to move."


func _on_brightness_selected(index: int) -> void:
	if index < 0 or index >= DUNGEON_BRIGHTNESS_SCALES.size():
		return
	dungeon_brightness_scale = float(DUNGEON_BRIGHTNESS_SCALES[index])
	_apply_dungeon_brightness()
	if hud_hint:
		hud_hint.text = "Mansion brightness set to %s." % String(DUNGEON_BRIGHTNESS_LABELS[index])


func _apply_dungeon_brightness() -> void:
	if dungeon_environment:
		dungeon_environment.ambient_light_energy = DUNGEON_AMBIENT_BASE * dungeon_brightness_scale
		dungeon_environment.adjustment_brightness = 0.68 + (dungeon_brightness_scale - 1.0) * 0.08
	if dungeon_fill_light:
		dungeon_fill_light.light_energy = DUNGEON_FILL_BASE * (0.85 + dungeon_brightness_scale * 0.3)


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
		hud_hint.text = "That floor is blocked. Pick a clear mansion path."
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
		_grant_xp(12, "Firebolt burned through a mansion echo.")
		_fairy_comment("cast firebolt", "A clean hit. The echo has bravely returned to being interior design.", {"spell": "firebolt"})
	else:
		hud_hint.text = "Firebolt launched. Aim the staff at a mansion echo and press 1."


func _use_shield_block() -> void:
	if shield_block_cooldown > 0.0 or game_over:
		return
	shield_block_timer = SHIELD_BLOCK_DURATION
	shield_block_cooldown = SHIELD_BLOCK_COOLDOWN
	var cleared := 0
	for creature in creatures.duplicate():
		var node: Node3D = creature.node
		if not is_instance_valid(node):
			creatures.erase(creature)
			continue
		if node.position.distance_to(hero.position) <= 3.8:
			cleared += 1
			creatures.erase(creature)
			node.queue_free()
	if cleared > 0:
		_grant_xp(10 * cleared, "Lantern burst scattered %d mansion echo%s." % [cleared, "" if cleared == 1 else "es"])
		_fairy_comment("lantern burst", "That was subtle in the way thunder is subtle. I approve.", {"spell": "lantern burst", "cleared": cleared})
	else:
		hud_hint.text = "The wizard lifts the lantern. Arcane light bursts outward."


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
		staff_orb.position = _staff_tip_position()
		staff_orb.scale = Vector3.ONE * (STAFF_ORB_RADIUS * orb_pulse)
	_update_staff_arm_visuals(delta, swing_t, swing_active)
	_update_view_sword_visuals(delta, swing_t, swing_active)
	_update_fire_bolt_visuals(swing_t, swing_active)
	if hero_shield:
		hero_shield.visible = false
	_update_lantern_visuals(delta)
	if hero_light:
		hero_light.light_energy = 0.92
		hero_light.omni_range = 5.25
	if sword_light:
		sword_light.visible = false
		sword_light.light_energy = SWORD_LIGHT_SWING_ENERGY if swing_active else SWORD_LIGHT_BASE_ENERGY
		sword_light.omni_range = 0.1
		sword_light.position = staff_orb.position if staff_orb else Vector3(0.42, 1.42, -0.12)


func _update_staff_arm_visuals(delta: float, swing_t: float, swing_active: bool) -> void:
	var cast_arc := sin(swing_t * PI) if swing_active else 0.0
	var blend_speed := 16.0 if swing_active else 10.0
	var blend := clampf(delta * blend_speed, 0.0, 1.0)
	if hero_right_arm_pivot:
		var idle_rot := Vector3(0.0, 0.0, 20.0)
		var cast_rot := Vector3(-34.0, -8.0, 48.0)
		hero_right_arm_pivot.rotation_degrees = hero_right_arm_pivot.rotation_degrees.lerp(idle_rot.lerp(cast_rot, cast_arc), blend)
	if hero_right_hand:
		hero_right_hand.scale = hero_right_hand.scale.lerp(Vector3.ONE * (0.075 + cast_arc * 0.006), blend)


func _update_lantern_arm_visuals(delta: float, burst_active: bool, burst_arc: float) -> void:
	if hero_left_arm_pivot == null:
		return
	var lift := 1.0 if burst_active else 0.0
	var blend_speed := 15.0 if burst_active else 9.0
	var blend := clampf(delta * blend_speed, 0.0, 1.0)
	var idle_rot := Vector3(0.0, 0.0, -18.0)
	var lift_rot := Vector3(-28.0 - burst_arc * 8.0, 5.0, -154.0)
	hero_left_arm_pivot.rotation_degrees = hero_left_arm_pivot.rotation_degrees.lerp(idle_rot.lerp(lift_rot, lift), blend)


func _update_lantern_visuals(delta: float) -> void:
	var burst_active := shield_block_timer > 0.0
	var burst_t := 0.0
	var burst_arc := 0.0
	if burst_active:
		burst_t = 1.0 - (shield_block_timer / SHIELD_BLOCK_DURATION)
		burst_arc = sin(burst_t * PI)
	_update_lantern_arm_visuals(delta, burst_active, burst_arc)
	if hero_lantern:
		var target_pos := Vector3(-0.36, 1.28, -0.18) if burst_active else Vector3(-0.43, 0.78, -0.16)
		var target_rot := Vector3(-18.0, 0.0, -12.0) if burst_active else Vector3.ZERO
		hero_lantern.position = hero_lantern.position.lerp(target_pos, clampf(delta * 12.0, 0.0, 1.0))
		hero_lantern.rotation_degrees = hero_lantern.rotation_degrees.lerp(target_rot, clampf(delta * 12.0, 0.0, 1.0))
	if hero_lantern_glow:
		hero_lantern_glow.scale = Vector3.ONE * (1.0 + burst_arc * 0.35)
	if hero_lantern_light:
		hero_lantern_light.light_energy = LANTERN_LIGHT_BASE_ENERGY + burst_arc * LANTERN_LIGHT_BURST_ENERGY
		hero_lantern_light.omni_range = 8.2 + burst_arc * 3.8
	_update_lantern_burst_visuals(burst_t, burst_arc, burst_active)


func _update_lantern_burst_visuals(burst_t: float, burst_arc: float, burst_active: bool) -> void:
	var burst_center := hero.position + Vector3(0.0, 0.08, 0.0)
	if lantern_burst_ring:
		lantern_burst_ring.visible = burst_active
		lantern_burst_ring.position = burst_center
		var inner_radius := lerpf(0.55, 4.4, burst_t)
		lantern_burst_ring.scale = Vector3(inner_radius, 1.0, inner_radius)
		lantern_burst_ring.transparency = lerpf(0.34, 0.82, burst_t)
	if lantern_burst_ring_outer:
		lantern_burst_ring_outer.visible = burst_active
		lantern_burst_ring_outer.position = burst_center + Vector3(0.0, 0.025, 0.0)
		var outer_radius := lerpf(1.1, 6.6, burst_t)
		lantern_burst_ring_outer.scale = Vector3(outer_radius, 1.0, outer_radius)
		lantern_burst_ring_outer.transparency = lerpf(0.48, 0.88, burst_t)
	if lantern_burst_ray_root:
		lantern_burst_ray_root.visible = burst_active
		lantern_burst_ray_root.position = burst_center
		lantern_burst_ray_root.rotation_degrees.y += 3.0
		var ray_radius := lerpf(0.45, 2.85, burst_t)
		lantern_burst_ray_root.scale = Vector3(ray_radius, 1.0, ray_radius)
	if lantern_burst_light:
		lantern_burst_light.visible = burst_active
		lantern_burst_light.position = hero.position + Vector3(0.0, 1.1, 0.0)
		lantern_burst_light.light_energy = LANTERN_LIGHT_BURST_ENERGY * 1.2 * burst_arc
		lantern_burst_light.omni_range = 5.0 + burst_arc * 7.0


func _staff_tip_position() -> Vector3:
	if hero_sword == null:
		return Vector3(0.42, 1.42, -0.12)
	return hero_sword.position + hero_sword.transform.basis * Vector3(0.0, STAFF_TIP_OFFSET, 0.0)


func _view_staff_tip_position() -> Vector3:
	if view_sword == null:
		return Vector3(0.42, -0.06, -1.2)
	return view_sword.position + view_sword.transform.basis * Vector3(0.0, VIEW_STAFF_TIP_OFFSET, 0.0)


func _update_view_sword_visuals(delta: float, swing_t: float, swing_active: bool) -> void:
	if view_sword == null or view_sword_guard == null or view_sword_slash == null or view_staff_orb == null:
		return
	var close_alpha := clampf((camera_zoom - 0.86) / 0.14, 0.0, 1.0)
	var show_close_sword := close_alpha > 0.02 and swing_active
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
		view_staff_orb.position = _view_staff_tip_position()
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
		view_staff_orb.position = _view_staff_tip_position()
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

	var closest_inspectable: Dictionary = {}
	var closest_object_distance := 999.0
	for inspectable in inspectables:
		var object_node: Node3D = inspectable.node
		if not is_instance_valid(object_node):
			continue
		var object_distance := object_node.position.distance_to(hero.position)
		if object_distance < closest_object_distance:
			closest_object_distance = object_distance
			closest_inspectable = inspectable
	if not closest_inspectable.is_empty() and closest_object_distance <= 2.35:
		_inspect_mansion_object(closest_inspectable)
		return

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
		_fairy_comment("noticed %s" % _pickup_label(closest_kind), "Glowing loot on the floor. Either treasure or a very committed moth trap.", {"object": _pickup_label(closest_kind)})
	else:
		hud_hint.text = "Search mansion rooms, open suspicious furniture, and inspect anything that looks too dramatic to be innocent."
		_fairy_comment("searched empty air", "I admire the confidence. Very few wizards interrogate empty carpet with such authority.", {"object": "empty room"})


func _inspect_mansion_object(inspectable: Dictionary) -> void:
	var title := String(inspectable.get("title", "odd mansion object"))
	var reward := String(inspectable.get("reward", "Mansion Curio"))
	if bool(inspectable.get("opened", false)):
		hud_hint.text = "You already inspected the %s. It is now only pretending to be mysterious." % title
		_fairy_comment("rechecked %s" % title, "We have already solved that one. The furniture is trying to look busy.", {"object": title, "result": "already opened"})
		return

	inspectable["opened"] = true
	discovery_count += 1
	_add_inventory_item(reward)
	_mark_inspectable_opened(inspectable)
	_grant_xp(int(inspectable.get("xp", 14)), "Inspected the %s and found %s." % [title, reward])
	_fairy_comment("opened %s" % title, "Excellent. Nothing says heroic destiny like rummaging through expensive furniture.", {"object": title, "reward": reward})
	if discovery_count >= DISCOVERIES_NEEDED and not victory:
		victory = true
		hud_hint.text = "The mansion's central seal clicks open. The grand hall is ready."


func _mark_inspectable_opened(inspectable: Dictionary) -> void:
	var object_node: Node3D = inspectable.node
	if not is_instance_valid(object_node):
		return
	var kind := String(inspectable.get("kind", ""))
	match kind:
		"chest", "music_box":
			_add_box(Vector3(0.0, 0.74, -0.24), Vector3(0.78, 0.07, 0.5), _mat("9d6540", 0.68), object_node).rotation_degrees.x = -28.0
		"wardrobe", "cabinet":
			var door := _add_box(Vector3(0.42, 0.62, -0.25), Vector3(0.08, 0.84, 0.38), _mat("6d472e", 0.72), object_node)
			door.rotation_degrees.y = -42.0
		"bookcase":
			_add_box(Vector3(0.28, 1.08, -0.28), Vector3(0.26, 0.04, 0.34), _mat("e4d3aa", 0.62, "ffe5ac", 0.08), object_node).rotation_degrees.z = -12.0
		"painting", "mirror":
			_add_box(Vector3(0.34, 0.86, -0.44), Vector3(0.08, 0.5, 0.04), _mat("9d7cff", 0.34, "c6b2ff", 0.25), object_node)
		"fireplace":
			var ember := OmniLight3D.new()
			ember.light_color = Color("ff9d42")
			ember.light_energy = 0.55
			ember.omni_range = 3.2
			ember.shadow_enabled = false
			ember.position = Vector3(0.0, 0.5, -0.28)
			object_node.add_child(ember)
		"globe":
			object_node.rotation_degrees.y += 35.0
	var sparkle := _add_sphere(Vector3(0.0, 1.18, 0.0), 0.08, 0.08, _mat("dffbff", 0.26, "ffffff", 0.5), object_node)
	decor_bobs.append(sparkle)


func _drink_potion() -> void:
	if potion_count <= 0 or hero_health >= hero_max_health:
		return
	potion_count -= 1
	hero_health = minf(hero_max_health, hero_health + 42.0)
	hud_hint.text = "Used a mansion herb."


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


func _update_fairy(delta: float) -> void:
	if fairy == null or not is_instance_valid(hero):
		return
	var bob := sin(Time.get_ticks_msec() * 0.006) * 0.16
	var side := _camera_right() * -0.86
	var back := _camera_forward() * -0.32
	var target := hero.position + side + back + Vector3(0.0, 1.48 + bob, 0.0)
	fairy.position = fairy.position.lerp(target, clampf(delta * 5.8, 0.0, 1.0))
	fairy.rotation.y = lerp_angle(fairy.rotation.y, hero.rotation.y, clampf(delta * 6.0, 0.0, 1.0))
	var wing_flap := sin(Time.get_ticks_msec() * 0.028) * 18.0
	if fairy_left_wing:
		fairy_left_wing.rotation_degrees = Vector3(0.0, -38.0 + wing_flap * 0.35, 12.0 + wing_flap)
	if fairy_right_wing:
		fairy_right_wing.rotation_degrees = Vector3(0.0, 38.0 - wing_flap * 0.35, -12.0 - wing_flap)
	if fairy_left_lower_wing:
		fairy_left_lower_wing.rotation_degrees = Vector3(0.0, -30.0 + wing_flap * 0.22, -8.0 + wing_flap * 0.55)
	if fairy_right_lower_wing:
		fairy_right_lower_wing.rotation_degrees = Vector3(0.0, 30.0 - wing_flap * 0.22, 8.0 - wing_flap * 0.55)
	if fairy_body:
		var body_pulse := 1.0 + sin(Time.get_ticks_msec() * 0.01) * 0.04
		fairy_body.scale = Vector3(0.075, 0.12, 0.075) * body_pulse
	if fairy_light:
		fairy_light.light_energy = 0.32 + sin(Time.get_ticks_msec() * 0.008) * 0.05


func _fairy_comment(event_name: String, fallback: String, extra: Dictionary = {}) -> void:
	var clean_fallback := String(fallback).strip_edges()
	if clean_fallback == "":
		clean_fallback = "I am forming an opinion. It will be magnificent."
	if fairy_label:
		fairy_label.text = "Pip: %s" % clean_fallback
	fairy_context_event = event_name
	if fairy_request == null or fairy_request_pending or not OS.has_feature("web"):
		return
	var now := Time.get_ticks_msec()
	if now - fairy_last_request_ms < 9000:
		return
	fairy_last_request_ms = now
	fairy_request_pending = true
	var payload := {
		"event": event_name,
		"fallback": clean_fallback,
		"extra": extra,
		"hero": {
			"level": hero_level,
			"health": int(hero_health),
			"maxHealth": int(hero_max_health),
			"xp": hero_xp,
			"discoveries": discovery_count,
			"needed": DISCOVERIES_NEEDED,
			"gold": hero_gold,
		},
		"inventory": _inventory_entries().slice(0, 12),
	}
	var request_error := fairy_request.request(
		_fairy_endpoint_url(),
		["Content-Type: application/json"],
		HTTPClient.METHOD_POST,
		JSON.stringify(payload)
	)
	if request_error != OK:
		fairy_request_pending = false


func _fairy_endpoint_url() -> String:
	return "https://johnny-chat.onrender.com/api/tiny-hero/fairy"


func _on_fairy_request_completed(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	fairy_request_pending = false
	if response_code < 200 or response_code >= 300:
		return
	var parsed := JSON.new()
	if parsed.parse(body.get_string_from_utf8()) != OK or typeof(parsed.data) != TYPE_DICTIONARY:
		return
	var reply := String(parsed.data.get("reply", "")).strip_edges()
	if reply == "":
		return
	reply = reply.replace("\n", " ").strip_edges()
	if reply.length() > 160:
		reply = "%s..." % reply.substr(0, 157)
	if fairy_label:
		fairy_label.text = "Pip: %s" % reply


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
				_grant_xp(4, "Found old mansion gold.")
				_fairy_comment("collected gold", "Money left on the floor: the traditional language of haunted architecture.", {"item": "gold"})
			"herb":
				potion_count += 1
				_add_inventory_item("Mansion Herb")
				_grant_xp(6, "Gathered a healing herb from a dusty conservatory planter.")
			"artifact":
				discovery_count += 1
				_add_inventory_item("House Sigil")
				_grant_xp(18, "House sigil claimed. The grand hall seal weakens.")
				_fairy_comment("claimed house sigil", "A glowing sigil. Subtle, if your definition of subtle includes humming at the wallpaper.", {"item": "house sigil"})
				if discovery_count >= DISCOVERIES_NEEDED and not victory:
					victory = true
					hud_hint.text = "The grand hall seal is broken. The mansion yields."
			"boots":
				hero_speed_bonus += 1.05
				_add_inventory_item("Silent Boots")
				_grant_xp(25, "Silent Boots found. Movement speed improved.")
			"compass":
				_add_inventory_item("Bone Compass")
				_grant_xp(24, "The compass points toward the mansion's sealed rooms.")
			"heart":
				hero_max_health += 28.0
				hero_health = hero_max_health
				_add_inventory_item("Bloodstone Charm")
				_grant_xp(20, "Bloodstone Charm found. Maximum health increased.")
			"lantern":
				_add_inventory_item("Mansion Lantern")
				_grant_xp(22, "Mansion Lantern found. The shadows become slightly less smug.")
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
		message = "Level up! Your lantern hand steadies and your step quickens."
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
			return "mansion herb"
		"artifact":
			return "house sigil"
		"boots":
			return "silent boots"
		"compass":
			return "bone compass"
		"heart":
			return "bloodstone charm"
		"lantern":
			return "mansion lantern"
		"satchel":
			return "loot satchel"
	return "curiosity"


func _end_game(won: bool) -> void:
	game_over = true
	victory = won
	hud_hint.text = "Mansion Level 1 cleared. Press R to enter again." if won else "The mansion claimed you. Press R to try again."


func _update_hud() -> void:
	health_bar.max_value = hero_max_health
	health_bar.value = hero_health
	xp_bar.max_value = _xp_to_next()
	xp_bar.value = hero_xp
	hud_stats.text = "Tiny Hero Quest  |  Mansion 1  |  Lvl %d  HP %d/%d  XP %d/%d  Secrets %d/%d  Gold %d" % [
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
		hud_quest.text = "Mansion Level 1 cleared!" if victory else "You fell in the mansion. Press R to try again."
	elif victory:
		hud_quest.text = "Grand hall seal opened: %d/%d secrets. Keep looting or restart for another run." % [discovery_count, DISCOVERIES_NEEDED]
	else:
		hud_quest.text = "Level 1: explore rooms, open furniture, and uncover %d mansion secrets. Found: %d/%d" % [DISCOVERIES_NEEDED, discovery_count, DISCOVERIES_NEEDED]
	_refresh_inventory_panel()
	if sword_button:
		sword_button.disabled = sword_swing_cooldown > 0.0
		sword_button.text = "1  Firebolt" if sword_swing_cooldown <= 0.0 else "1  %.1fs" % sword_swing_cooldown
	if shield_button:
		shield_button.disabled = shield_block_cooldown > 0.0
		shield_button.text = "2  Lantern" if shield_block_cooldown <= 0.0 else ("2  Burst" if shield_block_timer > 0.0 else "2  %.1fs" % shield_block_cooldown)
	if brightness_dropdown:
		var brightness_index := DUNGEON_BRIGHTNESS_SCALES.find(dungeon_brightness_scale)
		if brightness_index >= 0:
			brightness_dropdown.selected = brightness_index
	if click_to_move_checkbox:
		click_to_move_checkbox.set_pressed_no_signal(click_to_move_enabled)
	if hud_hint.text == "":
		hud_hint.text = "WASD moves. Right-drag looks around, mouse wheel zooms close. 1 casts Firebolt, 2 raises the lantern."


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
	if item_name.begins_with("Mansion Herb") or item_name.begins_with("Dungeon Herb"):
		return "[HERB]"
	if item_name.begins_with("Old Gold"):
		return "[GOLD]"
	if item_name.begins_with("House Sigil") or item_name == "House Sigil":
		return "[SIGIL]"
	match item_name:
		"Orb Staff":
			return "[STAFF]"
		"Arcane Burst":
			return "[BURST]"
		"Silent Boots":
			return "[BOOTS]"
		"Bone Compass":
			return "[COMP]"
		"Bloodstone Charm":
			return "[CHARM]"
		"Crypt Lantern", "Mansion Lantern", "Held Lantern":
			return "[LAMP]"
		"Loot Satchel", "Small Pouch":
			return "[BAG]"
		"Empty Boots", "Empty Charm", "Empty Light":
			return "[EMPTY]"
	return "[ITEM]"


func _short_item_name(item_name: String) -> String:
	return item_name.replace("Dungeon ", "").replace("Mansion ", "").replace("Bloodstone ", "").replace("Crypt ", "").replace("Loot ", "").replace("House ", "")


func _display_item_name(item_name: String) -> String:
	if item_name.begins_with("Mansion Herb") or item_name.begins_with("Dungeon Herb"):
		return "Mansion Herb"
	if item_name.begins_with("Old Gold"):
		return "Old Gold"
	if item_name.begins_with("House Sigil"):
		return "House Sigil"
	return item_name


func _item_detail(item_name: String) -> String:
	if item_name.begins_with("Mansion Herb") or item_name.begins_with("Dungeon Herb"):
		return "Quick healing supplies carried in the pack. Press Q when wounded."
	if item_name.begins_with("Old Gold"):
		return "Old mansion coinage. Useful later for shops, upgrades, and spellcraft."
	if item_name.begins_with("House Sigil"):
		return "Mansion sigils weaken the grand hall seal. They hum like they know more than you."
	match item_name:
		"Orb Staff":
			return "Equipped weapon. A blazing orb staff channels Firebolt from hot amber light."
		"Arcane Burst":
			return "Equipped spell. Press 2 to lift the lantern and release light in every direction."
		"Silent Boots":
			return "Equipped feet. These boots increase movement speed and make exploration smoother."
		"Bone Compass":
			return "Pack relic. The compass points toward sealed rooms and hints at future mansion floors."
		"Bloodstone Charm":
			return "Equipped charm. It increased maximum health when collected."
		"Held Lantern":
			return "Equipped light. The wizard carries this in the left hand for steady white illumination."
		"Crypt Lantern", "Mansion Lantern":
			return "Equipped light. A stronger mansion lantern that helps the wizard read the dark."
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


func _add_fairy_wing_panel(pos: Vector3, points: PackedVector2Array, material: Material, parent: Node, transparency := 0.36) -> MeshInstance3D:
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	for point in points:
		vertices.append(Vector3(point.x, point.y, 0.0))
		normals.append(Vector3(0.0, 0.0, -1.0))

	var indices := PackedInt32Array()
	for i in range(1, points.size() - 1):
		indices.append(0)
		indices.append(i)
		indices.append(i + 1)
		indices.append(0)
		indices.append(i + 1)
		indices.append(i)

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = material
	instance.position = pos
	instance.transparency = transparency
	parent.add_child(instance)
	return instance


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


func _add_cone(pos: Vector3, bottom_radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.0
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh.radial_segments = 10
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
