extends Node3D

const ARENA_HALF := 18.0
const HERO_SPEED := 7.2
const HERO_ACCEL := 11.0
const CREATURE_COUNT := 9
const DISCOVERIES_NEEDED := 8

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
	env.background_color = Color("7faec0")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("bfd8c5")
	env.ambient_light_energy = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.adjustment_enabled = true
	env.adjustment_brightness = 0.92
	env.glow_enabled = true
	env.glow_intensity = 0.1
	env.glow_strength = 0.16
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.name = "Warm Afternoon Sun"
	sun.light_color = Color("ffd29b")
	sun.light_energy = 1.65
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-48.0, -32.0, 0.0)
	add_child(sun)

	camera = Camera3D.new()
	camera.name = "AdventureCamera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 24.0
	camera.position = Vector3(0.0, 18.0, 16.0)
	add_child(camera)
	camera.look_at(Vector3.ZERO, Vector3.UP)

	_add_box(Vector3(0.0, -0.08, 0.0), Vector3(42.0, 0.12, 42.0), _mat("6fa45f", 0.95), self)
	_add_box(Vector3(0.0, -0.02, 0.0), Vector3(35.0, 0.04, 35.0), _mat("82b86b", 0.94), self)
	_add_path()
	_add_shrine()
	_add_pond()
	_add_forest_border()
	_add_rocks_and_flowers()


func _add_path() -> void:
	var stone := _mat("d9c59c", 0.9)
	for i in range(19):
		var t := float(i) / 18.0
		var pos := Vector3(lerpf(-10.5, 9.5, t), 0.035, lerpf(11.5, -10.2, t))
		pos.x += sin(t * TAU * 1.4) * 1.2
		var step := _add_box(pos, Vector3(1.0 + rng.randf_range(-0.15, 0.2), 0.035, 0.62), stone, self)
		step.rotation_degrees.y = rng.randf_range(-18.0, 18.0)


func _add_shrine() -> void:
	var root := Node3D.new()
	root.name = "Relic Shrine"
	root.position = Vector3(10.5, 0.0, -11.0)
	add_child(root)
	_add_box(Vector3.ZERO, Vector3(3.6, 0.22, 3.6), _mat("c6b28e", 0.88), root)
	_add_box(Vector3(0.0, 0.26, 0.0), Vector3(2.3, 0.32, 2.3), _mat("dfcfaa", 0.86), root)
	for x in [-0.92, 0.92]:
		for z in [-0.92, 0.92]:
			_add_cylinder(Vector3(x, 0.9, z), 0.13, 1.32, _mat("eee2bf", 0.82), root)
	_add_box(Vector3(0.0, 1.58, 0.0), Vector3(2.8, 0.28, 2.8), _mat("8d5a43", 0.76), root)
	_add_box(Vector3(0.0, 1.84, 0.0), Vector3(2.15, 0.22, 2.15), _mat("b66d4e", 0.78), root)
	var glow := OmniLight3D.new()
	glow.name = "Shrine Glow"
	glow.light_color = Color("90fff4")
	glow.light_energy = 0.55
	glow.omni_range = 4.4
	glow.shadow_enabled = false
	glow.position = Vector3(0.0, 1.0, 0.0)
	root.add_child(glow)
	var orb := _add_sphere(Vector3(0.0, 1.02, 0.0), 0.34, 0.34, _mat("9ffdf1", 0.12, "b9fff5", 0.55), root)
	decor_bobs.append(orb)


func _add_pond() -> void:
	var water := _mat("3d9db5", 0.25, "8fe8f4", 0.06)
	var shore := _mat("d4c497", 0.9)
	for radius in [Vector2(3.8, 2.2), Vector2(3.25, 1.85), Vector2(2.5, 1.45)]:
		_add_ellipse_disc_local(Vector3(-12.0, 0.01 + 0.012 * radius.x, -8.8), radius, 0.035, shore if radius.x > 3.3 else water, self, 0.0)
	for i in range(5):
		var ripple := _add_ellipse_disc_local(Vector3(-12.0 + rng.randf_range(-1.3, 1.4), 0.105, -8.8 + rng.randf_range(-0.65, 0.65)), Vector2(0.55, 0.08), 0.01, _mat("eafffa", 0.25, "eafffa", 0.12), self, rng.randf_range(-20.0, 20.0))
		decor_bobs.append(ripple)


func _add_forest_border() -> void:
	for i in range(54):
		var side := i % 4
		var x := rng.randf_range(-19.0, 19.0)
		var z := rng.randf_range(-19.0, 19.0)
		if side == 0:
			z = rng.randf_range(-20.0, -17.2)
		elif side == 1:
			z = rng.randf_range(17.2, 20.0)
		elif side == 2:
			x = rng.randf_range(-20.0, -17.2)
		else:
			x = rng.randf_range(17.2, 20.0)
		_add_tree(Vector3(x, 0.0, z), rng.randf_range(0.75, 1.25))


func _add_rocks_and_flowers() -> void:
	for i in range(36):
		var pos := _random_open_position()
		if pos.distance_to(Vector3.ZERO) < 4.0:
			continue
		if i % 3 == 0:
			_add_sphere(pos + Vector3(0.0, 0.1, 0.0), rng.randf_range(0.18, 0.32), rng.randf_range(0.12, 0.22), _mat("87908b", 0.9), self)
		else:
			var flower_colors: Array[String] = ["f8d8ff", "ffe49b", "b9ecff", "ffffff"]
			var color: String = flower_colors[i % flower_colors.size()]
			_add_cylinder(pos + Vector3(0.0, 0.13, 0.0), 0.035, 0.22, _mat("4e8f48", 0.86), self)
			_add_sphere(pos + Vector3(0.0, 0.28, 0.0), 0.08, 0.06, _mat(color, 0.72), self)


func _spawn_hero() -> void:
	hero = Node3D.new()
	hero.name = "Hero"
	hero.position = Vector3(-10.5, 0.0, 10.5)
	add_child(hero)

	hero_ring = _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(0.58, 0.58), 0.018, _mat("6fb7a2", 0.72, "8bd9bf", 0.03), hero, 0.0)
	hero_body = _add_cylinder(Vector3(0.0, 0.62, 0.0), 0.28, 0.78, _mat("2d7d83", 0.72), hero)
	_add_sphere(Vector3(0.0, 1.18, 0.0), 0.24, 0.25, _mat("f2c49b", 0.78), hero)
	_add_box(Vector3(0.0, 0.78, 0.22), Vector3(0.5, 0.68, 0.08), _mat("c74646", 0.8), hero)
	_add_box(Vector3(0.0, 1.42, 0.0), Vector3(0.52, 0.12, 0.42), _mat("5a3d2e", 0.82), hero)
	hero_sword = _add_box(Vector3(0.42, 0.66, -0.12), Vector3(0.09, 0.08, 0.8), _mat("eef6ff", 0.46, "c9f0ff", 0.06), hero)
	_add_box(Vector3(0.42, 0.5, 0.28), Vector3(0.2, 0.09, 0.09), _mat("d4a94d", 0.68), hero)


func _spawn_creatures() -> void:
	for i in range(CREATURE_COUNT):
		var pos := _random_open_position()
		while pos.distance_to(hero.position) < 7.0:
			pos = _random_open_position()
		_spawn_creature(pos, i)


func _spawn_creature(pos: Vector3, index: int) -> void:
	var root := Node3D.new()
	root.name = "Meadow Spirit"
	root.position = pos
	add_child(root)
	var body_color := "6eaa65" if index % 3 != 0 else "8c78bd"
	_add_sphere(Vector3(0.0, 0.34, 0.0), 0.42, 0.32, _mat(body_color, 0.72), root)
	_add_sphere(Vector3(-0.15, 0.47, -0.28), 0.055, 0.055, _mat("101713", 0.5), root)
	_add_sphere(Vector3(0.15, 0.47, -0.28), 0.055, 0.055, _mat("101713", 0.5), root)
	creatures.append({
		"node": root,
		"speed": 1.25 + rng.randf_range(-0.15, 0.22),
		"wander": Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized(),
		"wander_time": rng.randf_range(1.1, 2.8)
	})


func _spawn_pickups() -> void:
	for i in range(18):
		_spawn_pickup("coin", _random_open_position())
	for i in range(6):
		_spawn_pickup("herb", _random_open_position())
	for i in range(DISCOVERIES_NEEDED):
		_spawn_pickup("artifact", Vector3(rng.randf_range(-14.0, 14.0), 0.0, rng.randf_range(-14.0, 14.0)))
	_spawn_pickup("boots", Vector3(5.0, 0.0, 7.0))
	_spawn_pickup("compass", Vector3(-6.5, 0.0, -3.5))
	_spawn_pickup("heart", Vector3(12.0, 0.0, 5.5))
	_spawn_pickup("lantern", Vector3(-2.0, 0.0, -12.0))
	_spawn_pickup("satchel", Vector3(-13.0, 0.0, 2.8))


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
			glow.light_color = Color("8df4ea")
			glow.light_energy = 0.22
			glow.omni_range = 2.2
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
	hero.position += hero_velocity * delta
	hero.position.x = clampf(hero.position.x, -ARENA_HALF, ARENA_HALF)
	hero.position.z = clampf(hero.position.z, -ARENA_HALF, ARENA_HALF)
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
		hud_hint.text = "You spot %s nearby. Walk over it to collect and learn from it." % _pickup_label(closest_kind).to_lower()
	else:
		hud_hint.text = "Explore the meadow paths. Glowing objects, herbs, caches, and tools all improve your hero."


func _drink_potion() -> void:
	if potion_count <= 0 or hero_health >= hero_max_health:
		return
	potion_count -= 1
	hero_health = minf(hero_max_health, hero_health + 42.0)
	hud_hint.text = "Used a healing herb."


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
		if to_hero.length() < 2.2:
			direction = (-to_hero).normalized()
		node.position += direction * float(creature.speed) * delta
		node.position.x = clampf(node.position.x, -ARENA_HALF, ARENA_HALF)
		node.position.z = clampf(node.position.z, -ARENA_HALF, ARENA_HALF)
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
				_grant_xp(4, "Found gold tucked along the trail.")
			"herb":
				potion_count += 1
				_add_inventory_item("Healing Herb")
				_grant_xp(6, "Gathered a healing herb.")
			"artifact":
				discovery_count += 1
				_add_inventory_item("Ancient Token")
				_grant_xp(18, "Discovery logged. The meadow story gets clearer.")
				if discovery_count >= DISCOVERIES_NEEDED and not victory:
					victory = true
					hud_hint.text = "Explorer journal complete. You can keep collecting upgrades and treasure."
			"boots":
				hero_speed_bonus += 1.05
				_add_inventory_item("Trail Boots")
				_grant_xp(25, "Trail Boots found. Movement speed improved.")
			"compass":
				_add_inventory_item("Brass Compass")
				_grant_xp(24, "The compass hums toward hidden clearings.")
			"heart":
				hero_max_health += 28.0
				hero_health = hero_max_health
				_add_inventory_item("Heart Charm")
				_grant_xp(20, "Heart Charm found. Maximum health increased.")
			"lantern":
				_add_inventory_item("Warm Lantern")
				_grant_xp(22, "Lantern found. The path feels friendlier.")
			"satchel":
				_add_inventory_item("Explorer Satchel")
				hero_gold += 3
				_grant_xp(20, "Satchel found. Bonus gold added.")
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
		message = "Level up! You feel sturdier and quicker on the trail."
	if message != "":
		hud_hint.text = message


func _add_inventory_item(item_name: String) -> void:
	inventory.append(item_name)


func _pickup_label(kind: String) -> String:
	match kind:
		"coin":
			return "gold coin"
		"herb":
			return "healing herb"
		"artifact":
			return "ancient token"
		"boots":
			return "trail boots"
		"compass":
			return "brass compass"
		"heart":
			return "heart charm"
		"lantern":
			return "warm lantern"
		"satchel":
			return "explorer satchel"
	return "curiosity"


func _end_game(won: bool) -> void:
	game_over = true
	victory = won
	hud_hint.text = "Explorer journal complete. Press R to start a fresh map." if won else "You got lost. Press R to try again."


func _update_hud() -> void:
	health_bar.max_value = hero_max_health
	health_bar.value = hero_health
	xp_bar.max_value = _xp_to_next()
	xp_bar.value = hero_xp
	hud_stats.text = "Tiny Hero Quest  |  Lvl %d  HP %d/%d  XP %d/%d  Finds %d/%d  Gold %d" % [
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
		hud_quest.text = "Explorer journal complete!" if victory else "You got lost. Press R to try again."
	elif victory:
		hud_quest.text = "Journal complete: %d/%d discoveries. Keep exploring for upgrades, herbs, and treasure." % [discovery_count, DISCOVERIES_NEEDED]
	else:
		hud_quest.text = "Explore: find %d meadow discoveries. Logged: %d/%d" % [DISCOVERIES_NEEDED, discovery_count, DISCOVERIES_NEEDED]
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
	return Vector3(rng.randf_range(-15.5, 15.5), 0.0, rng.randf_range(-15.5, 15.5))


func _add_tree(pos: Vector3, scale_factor: float) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	_add_cylinder(Vector3(0.0, 0.42 * scale_factor, 0.0), 0.13 * scale_factor, 0.82 * scale_factor, _mat("775238", 0.9), root)
	_add_sphere(Vector3(0.0, 1.03 * scale_factor, 0.0), 0.58 * scale_factor, 0.48 * scale_factor, _mat("4d8a4d", 0.86), root)
	_add_sphere(Vector3(-0.27 * scale_factor, 0.82 * scale_factor, 0.04), 0.36 * scale_factor, 0.34 * scale_factor, _mat("6aa35b", 0.84), root)


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
