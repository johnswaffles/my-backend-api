extends Node3D

const ARENA_HALF := 18.0
const HERO_SPEED := 7.2
const HERO_ACCEL := 11.0
const ENEMY_COUNT := 9
const RELICS_NEEDED := 3

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
var hero_attack := 20.0
var hero_gold := 0
var potion_count := 0
var relic_count := 0
var attack_cooldown := 0.0
var hurt_timer := 0.0
var game_over := false
var victory := false

var enemies: Array[Dictionary] = []
var pickups: Array[Dictionary] = []
var decor_bobs: Array[Node3D] = []
var material_cache: Dictionary = {}

var hud_stats: Label
var hud_quest: Label
var hud_hint: Label
var health_bar: ProgressBar
var xp_bar: ProgressBar


func _ready() -> void:
	rng.randomize()
	_ensure_input_map()
	_build_world()
	_spawn_hero()
	_spawn_enemies()
	_spawn_pickups()
	_build_hud()
	_update_hud()


func _process(delta: float) -> void:
	if game_over:
		if Input.is_action_just_pressed("restart"):
			get_tree().reload_current_scene()
		return

	attack_cooldown = maxf(attack_cooldown - delta, 0.0)
	hurt_timer = maxf(hurt_timer - delta, 0.0)

	_update_hero(delta)
	_update_camera(delta)
	_update_enemies(delta)
	_update_pickups(delta)
	_update_decor(delta)
	_collect_pickups()
	_update_hud()


func _ensure_input_map() -> void:
	_add_key_action("move_left", [KEY_A, KEY_LEFT])
	_add_key_action("move_right", [KEY_D, KEY_RIGHT])
	_add_key_action("move_up", [KEY_W, KEY_UP])
	_add_key_action("move_down", [KEY_S, KEY_DOWN])
	_add_key_action("attack", [KEY_SPACE, KEY_J])
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
	env.background_color = Color("90b9c7")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("d8ecde")
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.03
	env.glow_enabled = true
	env.glow_intensity = 0.16
	env.glow_strength = 0.22
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.name = "Warm Afternoon Sun"
	sun.light_color = Color("ffe4ad")
	sun.light_energy = 2.2
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

	_add_box(Vector3(0.0, -0.08, 0.0), Vector3(42.0, 0.12, 42.0), _mat("7fb46d", 0.95), self)
	_add_box(Vector3(0.0, -0.02, 0.0), Vector3(35.0, 0.04, 35.0), _mat("95c77a", 0.94), self)
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

	hero_ring = _add_ellipse_disc_local(Vector3(0.0, 0.018, 0.0), Vector2(0.65, 0.65), 0.018, _mat("fff0a6", 0.5, "fff0a6", 0.1), hero, 0.0)
	hero_body = _add_cylinder(Vector3(0.0, 0.62, 0.0), 0.28, 0.78, _mat("2d7d83", 0.72), hero)
	_add_sphere(Vector3(0.0, 1.18, 0.0), 0.24, 0.25, _mat("f2c49b", 0.78), hero)
	_add_box(Vector3(0.0, 0.78, 0.22), Vector3(0.5, 0.68, 0.08), _mat("c74646", 0.8), hero)
	_add_box(Vector3(0.0, 1.42, 0.0), Vector3(0.52, 0.12, 0.42), _mat("5a3d2e", 0.82), hero)
	hero_sword = _add_box(Vector3(0.42, 0.66, -0.12), Vector3(0.09, 0.08, 0.8), _mat("eef6ff", 0.46, "c9f0ff", 0.06), hero)
	_add_box(Vector3(0.42, 0.5, 0.28), Vector3(0.2, 0.09, 0.09), _mat("d4a94d", 0.68), hero)


func _spawn_enemies() -> void:
	for i in range(ENEMY_COUNT):
		var pos := _random_open_position()
		while pos.distance_to(hero.position) < 7.0:
			pos = _random_open_position()
		_spawn_enemy(pos, i)


func _spawn_enemy(pos: Vector3, index: int) -> void:
	var root := Node3D.new()
	root.name = "Moss Slime"
	root.position = pos
	add_child(root)
	var body_color := "5ca85f" if index % 3 != 0 else "7d68b3"
	_add_sphere(Vector3(0.0, 0.34, 0.0), 0.42, 0.32, _mat(body_color, 0.72), root)
	_add_sphere(Vector3(-0.15, 0.47, -0.28), 0.055, 0.055, _mat("101713", 0.5), root)
	_add_sphere(Vector3(0.15, 0.47, -0.28), 0.055, 0.055, _mat("101713", 0.5), root)
	enemies.append({
		"node": root,
		"hp": 42.0 + float(index % 3) * 10.0,
		"max_hp": 42.0 + float(index % 3) * 10.0,
		"speed": 2.25 + rng.randf_range(-0.2, 0.35),
		"wander": Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized(),
		"wander_time": rng.randf_range(0.4, 1.8),
		"cooldown": 0.0
	})


func _spawn_pickups() -> void:
	for i in range(12):
		_spawn_pickup("coin", _random_open_position())
	for i in range(4):
		_spawn_pickup("potion", _random_open_position())
	for i in range(RELICS_NEEDED):
		_spawn_pickup("relic", Vector3(rng.randf_range(-14.0, 14.0), 0.0, rng.randf_range(-14.0, 14.0)))
	_spawn_pickup("sword", Vector3(5.0, 0.0, 7.0))


func _spawn_pickup(kind: String, pos: Vector3) -> void:
	var root := Node3D.new()
	root.name = kind.capitalize()
	root.position = pos
	add_child(root)
	match kind:
		"coin":
			_add_cylinder(Vector3(0.0, 0.32, 0.0), 0.18, 0.08, _mat("ffd15a", 0.45, "ffd15a", 0.12), root).rotation_degrees.x = 90.0
		"potion":
			_add_cylinder(Vector3(0.0, 0.32, 0.0), 0.13, 0.32, _mat("dc5f6d", 0.35, "ff8f9a", 0.12), root)
			_add_sphere(Vector3(0.0, 0.53, 0.0), 0.1, 0.08, _mat("f8d2d7", 0.5), root)
		"relic":
			_add_box(Vector3(0.0, 0.36, 0.0), Vector3(0.36, 0.36, 0.36), _mat("8df4ea", 0.22, "9dfff4", 0.5), root).rotation_degrees.y = 45.0
			var glow := OmniLight3D.new()
			glow.light_color = Color("8df4ea")
			glow.light_energy = 0.22
			glow.omni_range = 2.2
			glow.shadow_enabled = false
			glow.position = Vector3(0.0, 0.48, 0.0)
			root.add_child(glow)
		"sword":
			_add_box(Vector3(0.0, 0.42, 0.0), Vector3(0.12, 0.08, 0.92), _mat("f7fbff", 0.35, "d7f4ff", 0.22), root)
			_add_box(Vector3(0.0, 0.35, 0.42), Vector3(0.44, 0.1, 0.12), _mat("d4a94d", 0.62), root)
	pickups.append({"node": root, "kind": kind, "base_y": root.position.y, "phase": rng.randf_range(0.0, TAU)})


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var panel := PanelContainer.new()
	panel.position = Vector2(18, 18)
	panel.custom_minimum_size = Vector2(470, 150)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.06, 0.09, 0.08, 0.78)
	style.border_color = Color(1.0, 0.92, 0.72, 0.28)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 18
	style.corner_radius_top_right = 18
	style.corner_radius_bottom_left = 18
	style.corner_radius_bottom_right = 18
	panel.add_theme_stylebox_override("panel", style)
	layer.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)

	hud_stats = Label.new()
	hud_stats.add_theme_color_override("font_color", Color("fff7da"))
	hud_stats.add_theme_font_size_override("font_size", 18)
	box.add_child(hud_stats)

	health_bar = ProgressBar.new()
	health_bar.show_percentage = false
	health_bar.custom_minimum_size = Vector2(420, 18)
	box.add_child(health_bar)

	xp_bar = ProgressBar.new()
	xp_bar.show_percentage = false
	xp_bar.custom_minimum_size = Vector2(420, 14)
	box.add_child(xp_bar)

	hud_quest = Label.new()
	hud_quest.add_theme_color_override("font_color", Color("d5ffe7"))
	hud_quest.add_theme_font_size_override("font_size", 15)
	box.add_child(hud_quest)

	hud_hint = Label.new()
	hud_hint.add_theme_color_override("font_color", Color("c9d5cf"))
	hud_hint.add_theme_font_size_override("font_size", 13)
	box.add_child(hud_hint)


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
	hero_velocity = hero_velocity.lerp(desired * HERO_SPEED, clampf(delta * HERO_ACCEL, 0.0, 1.0))
	hero.position += hero_velocity * delta
	hero.position.x = clampf(hero.position.x, -ARENA_HALF, ARENA_HALF)
	hero.position.z = clampf(hero.position.z, -ARENA_HALF, ARENA_HALF)
	hero.position.y = sin(Time.get_ticks_msec() * 0.009) * 0.025 if hero_velocity.length() > 0.1 else 0.0

	if hero_velocity.length() > 0.25:
		hero.rotation.y = lerp_angle(hero.rotation.y, atan2(-hero_velocity.x, -hero_velocity.z), delta * 12.0)

	if Input.is_action_just_pressed("attack"):
		_attack()
	if Input.is_action_just_pressed("drink_potion"):
		_drink_potion()

	var pulse := 1.0 + sin(Time.get_ticks_msec() * 0.008) * 0.04
	hero_ring.scale = Vector3(pulse, 1.0, pulse)
	hero_body.scale = Vector3.ONE if hurt_timer <= 0.0 else Vector3(1.12, 0.92, 1.12)
	hero_sword.rotation_degrees.x = lerpf(hero_sword.rotation_degrees.x, 0.0, delta * 10.0)


func _attack() -> void:
	if attack_cooldown > 0.0:
		return
	attack_cooldown = 0.42
	hero_sword.rotation_degrees.x = -42.0
	var hit_any := false
	for enemy in enemies:
		var node: Node3D = enemy.node
		if not is_instance_valid(node):
			continue
		var distance := node.position.distance_to(hero.position)
		if distance <= 1.9:
			enemy.hp -= hero_attack
			node.scale = Vector3(1.22, 0.78, 1.22)
			hit_any = true
			if enemy.hp <= 0.0:
				_defeat_enemy(enemy)
	if not hit_any:
		hud_hint.text = "Swing! Move closer to a slime to land the hit."


func _defeat_enemy(enemy: Dictionary) -> void:
	var node: Node3D = enemy.node
	if is_instance_valid(node):
		if rng.randf() < 0.45:
			_spawn_pickup("coin", node.position)
		node.queue_free()
	enemies.erase(enemy)
	hero_xp += 18
	if hero_xp >= _xp_to_next():
		hero_xp -= _xp_to_next()
		hero_level += 1
		hero_max_health += 18.0
		hero_health = hero_max_health
		hero_attack += 5.0
		hud_hint.text = "Level up! More health and stronger sword swings."


func _drink_potion() -> void:
	if potion_count <= 0 or hero_health >= hero_max_health:
		return
	potion_count -= 1
	hero_health = minf(hero_max_health, hero_health + 42.0)


func _update_camera(delta: float) -> void:
	var target := hero.position + Vector3(0.0, 17.5, 15.0)
	camera.position = camera.position.lerp(target, clampf(delta * 4.0, 0.0, 1.0))
	camera.look_at(hero.position + Vector3(0.0, 0.25, 0.0), Vector3.UP)


func _update_enemies(delta: float) -> void:
	for enemy in enemies.duplicate():
		var node: Node3D = enemy.node
		if not is_instance_valid(node):
			enemies.erase(enemy)
			continue
		enemy.cooldown = maxf(float(enemy.cooldown) - delta, 0.0)
		enemy.wander_time = float(enemy.wander_time) - delta
		var to_hero := hero.position - node.position
		var direction := Vector3.ZERO
		if to_hero.length() < 8.5:
			direction = to_hero.normalized()
		else:
			if float(enemy.wander_time) <= 0.0:
				enemy.wander = Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)).normalized()
				enemy.wander_time = rng.randf_range(0.8, 2.1)
			direction = enemy.wander
		node.position += direction * float(enemy.speed) * delta
		node.position.x = clampf(node.position.x, -ARENA_HALF, ARENA_HALF)
		node.position.z = clampf(node.position.z, -ARENA_HALF, ARENA_HALF)
		node.position.y = 0.06 + sin(Time.get_ticks_msec() * 0.006 + node.position.x) * 0.035
		node.scale = node.scale.lerp(Vector3.ONE, delta * 8.0)
		if direction.length() > 0.1:
			node.rotation.y = lerp_angle(node.rotation.y, atan2(-direction.x, -direction.z), delta * 7.0)
		if node.position.distance_to(hero.position) < 0.82 and float(enemy.cooldown) <= 0.0:
			enemy.cooldown = 1.0
			_damage_hero(11.0)


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
				hero_xp += 3
			"potion":
				potion_count += 1
			"relic":
				relic_count += 1
				if relic_count >= RELICS_NEEDED:
					_end_game(true)
			"sword":
				hero_attack += 10.0
				hud_hint.text = "Found an old moonblade. Attack power up!"
		node.queue_free()
		pickups.erase(pickup)


func _end_game(won: bool) -> void:
	game_over = true
	victory = won
	hud_hint.text = "Victory! You restored the shrine. Press R to play again." if won else "You were knocked out. Press R to try again."


func _update_hud() -> void:
	health_bar.max_value = hero_max_health
	health_bar.value = hero_health
	xp_bar.max_value = _xp_to_next()
	xp_bar.value = hero_xp
	hud_stats.text = "Tiny Hero Quest  |  Lvl %d  HP %d/%d  XP %d/%d  Gold %d  Potions %d" % [
		hero_level,
		int(hero_health),
		int(hero_max_health),
		hero_xp,
		_xp_to_next(),
		hero_gold,
		potion_count
	]
	if game_over:
		hud_quest.text = "Shrine restored!" if victory else "The slimes won this round."
	else:
		hud_quest.text = "Quest: gather %d glowing relics and survive. Relics: %d/%d" % [RELICS_NEEDED, relic_count, RELICS_NEEDED]
	if hud_hint.text == "":
		hud_hint.text = "Move WASD / arrows. Space or J attacks. Q drinks a potion. Gather relics, coins, and the moonblade."


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
