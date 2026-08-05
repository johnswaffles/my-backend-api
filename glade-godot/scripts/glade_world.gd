extends Node3D

const SAVE_PATH := "user://glade_creation.json"
const GLade_RADIUS := 14.5
const DRAW_LIMIT := 12.8
const SNAP_STEP := 0.25
const TOOL_INFO := {
	"wall": {"label": "WALL", "key": "W", "hint": "Drag a stone wall. Paths crossing it become arched gateways."},
	"cottage": {"label": "COTTAGE", "key": "C", "hint": "Drag a footprint. The cottage grows a roof, windows, door, chimney and garden."},
	"tower": {"label": "TOWER", "key": "T", "hint": "Click to raise a storybook stone tower."},
	"path": {"label": "PATH", "key": "P", "hint": "Drag a wandering path. It reacts to walls and ponds."},
	"pond": {"label": "POND", "key": "O", "hint": "Click to tuck a reflective pond into the meadow."},
	"nature": {"label": "NATURE", "key": "N", "hint": "Click for a tree, flower garden or leafy thicket."},
	"erase": {"label": "ERASE", "key": "E", "hint": "Click the nearest creation to gently remove it."},
}
const MOODS := [
	{"name": "Honey morning", "sky": Color("b8d9d3"), "ambient": Color("aec8af"), "sun": Color("ffe5b5"), "energy": 0.84, "angle": -54.0},
	{"name": "Summer afternoon", "sky": Color("8dc8df"), "ambient": Color("a8c8bd"), "sun": Color("fff0cc"), "energy": 1.0, "angle": -68.0},
	{"name": "Rose dusk", "sky": Color("77739a"), "ambient": Color("b4868d"), "sun": Color("ffbd91"), "energy": 0.62, "angle": -22.0},
	{"name": "Firefly night", "sky": Color("17293c"), "ambient": Color("60728d"), "sun": Color("a9c8ff"), "energy": 0.18, "angle": -12.0},
]

var camera: Camera3D
var sun: DirectionalLight3D
var world_environment: WorldEnvironment
var meadow_root: Node3D
var meadow_detail_root: Node3D
var creation_root: Node3D
var preview_root: Node3D
var life_root: Node3D
var commands: Array[Dictionary] = []
var redo_stack: Array[Dictionary] = []
var tool_buttons: Dictionary = {}
var current_tool := "wall"
var draw_active := false
var draw_origin := Vector3.ZERO
var draw_current := Vector3.ZERO
var orbit_active := false
var pan_active := false
var orbit_yaw := -42.0
var orbit_pitch := -36.0
var camera_distance := 24.0
var camera_target := Vector3(0.0, 0.85, 0.0)
var current_mood := 0
var mood_label: Label
var hint_label: Label
var tool_title: Label
var toast_label: Label
var toast_panel: PanelContainer
var toast_timer := 0.0
var clear_armed := false
var clear_timer := 0.0
var action_index := 400
var sheep: Array[Node3D] = []
var butterflies: Array[Node3D] = []
var fireflies: Array[Node3D] = []
var wind_trees: Array[Node3D] = []
var drifting_clouds: Array[Node3D] = []
var stone_materials: Array[StandardMaterial3D] = []
var stone_preview_materials: Array[StandardMaterial3D] = []


func _ready() -> void:
	seed(70241)
	_build_material_library()
	_build_environment()
	_build_meadow()
	_build_camera()
	_build_interface()
	_build_ambient_life()
	_load_or_seed_creation()
	_set_tool("wall")
	_apply_mood(false)
	_show_toast("Welcome to Glade — drag anywhere in the meadow to begin.", 5.0)


func _process(delta: float) -> void:
	_update_camera()
	_animate_life(delta)
	_animate_environment(delta)
	if toast_timer > 0.0:
		toast_timer -= delta
		if toast_timer <= 0.0 and toast_panel:
			var fade := create_tween()
			fade.tween_property(toast_panel, "modulate:a", 0.0, 0.28)
	if clear_armed:
		clear_timer -= delta
		if clear_timer <= 0.0:
			clear_armed = false


func _physics_process(delta: float) -> void:
	_update_sheep_physics(delta)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.is_action_pressed("tool_wall"):
			_set_tool("wall")
		elif event.is_action_pressed("tool_cottage"):
			_set_tool("cottage")
		elif event.is_action_pressed("tool_tower"):
			_set_tool("tower")
		elif event.is_action_pressed("tool_path"):
			_set_tool("path")
		elif event.is_action_pressed("tool_pond"):
			_set_tool("pond")
		elif event.is_action_pressed("tool_nature"):
			_set_tool("nature")
		elif event.is_action_pressed("tool_erase"):
			_set_tool("erase")
		elif event.is_action_pressed("undo"):
			_undo()
		elif event.keycode == KEY_ESCAPE:
			draw_active = false
			_clear_children(preview_root)
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			camera_distance = clampf(camera_distance - 1.2, 10.0, 32.0)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera_distance = clampf(camera_distance + 1.2, 10.0, 32.0)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			orbit_active = event.pressed
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			pan_active = event.pressed
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_begin_action(event.position)
			else:
				_finish_action(event.position)
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion:
		if orbit_active:
			orbit_yaw -= event.relative.x * 0.3
			orbit_pitch = clampf(orbit_pitch - event.relative.y * 0.24, -72.0, -22.0)
			get_viewport().set_input_as_handled()
		elif pan_active:
			var right := camera.global_transform.basis.x
			var forward := -camera.global_transform.basis.z
			right.y = 0.0
			forward.y = 0.0
			camera_target += (-right.normalized() * event.relative.x + forward.normalized() * event.relative.y) * camera_distance * 0.0018
			camera_target.x = clampf(camera_target.x, -7.0, 7.0)
			camera_target.z = clampf(camera_target.z, -7.0, 7.0)
			get_viewport().set_input_as_handled()
		elif draw_active:
			var point := _ground_point(event.position)
			if point != Vector3.INF:
				draw_current = _snap_and_clamp(point)
				_update_preview()


func _begin_action(screen_position: Vector2) -> void:
	var point := _ground_point(screen_position)
	if point == Vector3.INF:
		return
	draw_origin = _snap_and_clamp(point)
	draw_current = draw_origin
	if current_tool in ["wall", "path", "cottage"]:
		draw_active = true
		_update_preview()
	elif current_tool == "erase":
		_erase_nearest(draw_origin)
	else:
		_commit_point_tool(draw_origin)


func _finish_action(screen_position: Vector2) -> void:
	if not draw_active:
		return
	var point := _ground_point(screen_position)
	if point != Vector3.INF:
		draw_current = _snap_and_clamp(point)
	draw_active = false
	_clear_children(preview_root)
	var command := _drag_command(current_tool, draw_origin, draw_current, action_index)
	if not command.is_empty():
		action_index += 1
		_push_command(command)


func _drag_command(tool: String, start: Vector3, finish: Vector3, command_seed: int) -> Dictionary:
	var distance := Vector2(start.x, start.z).distance_to(Vector2(finish.x, finish.z))
	if tool == "wall" or tool == "path":
		if distance < 0.75:
			finish = start + Vector3(1.5, 0.0, 0.0)
		return {"type": tool, "a": [start.x, start.z], "b": [finish.x, finish.z], "seed": command_seed}
	if tool == "cottage":
		var min_x: float = minf(start.x, finish.x)
		var max_x: float = maxf(start.x, finish.x)
		var min_z: float = minf(start.z, finish.z)
		var max_z: float = maxf(start.z, finish.z)
		var width := clampf(max_x - min_x, 3.0, 7.0)
		var depth := clampf(max_z - min_z, 2.6, 5.2)
		var center := Vector3((start.x + finish.x) * 0.5, 0.0, (start.z + finish.z) * 0.5)
		if distance < 1.0:
			width = 4.4
			depth = 3.4
		return {"type": "cottage", "pos": [center.x, center.z], "size": [width, depth], "seed": command_seed}
	return {}


func _commit_point_tool(point: Vector3) -> void:
	var command: Dictionary
	if current_tool == "tower":
		command = {"type": "tower", "pos": [point.x, point.z], "seed": action_index}
	elif current_tool == "pond":
		command = {"type": "pond", "pos": [point.x, point.z], "seed": action_index}
	elif current_tool == "nature":
		command = {"type": "nature", "pos": [point.x, point.z], "seed": action_index}
	else:
		return
	action_index += 1
	_push_command(command)


func _update_preview() -> void:
	_clear_children(preview_root)
	var command := _drag_command(current_tool, draw_origin, draw_current, action_index)
	if command.is_empty():
		return
	_build_command(command, preview_root, true)


func _push_command(command: Dictionary) -> void:
	commands.append(command)
	redo_stack.clear()
	_rebuild_creations()
	_save_creation()
	var type_name := str(command.get("type", "creation")).capitalize()
	_show_toast(type_name + " added. Everything is editable — there are no wrong answers.", 2.4)


func _undo() -> void:
	if commands.is_empty():
		_show_toast("The meadow is already at its beginning.", 2.0)
		return
	redo_stack.append(commands.pop_back())
	_rebuild_creations()
	_save_creation()
	_show_toast("Undone — the glade remembers your next idea.", 2.0)


func _redo() -> void:
	if redo_stack.is_empty():
		_show_toast("Nothing to redo yet.", 1.8)
		return
	commands.append(redo_stack.pop_back())
	_rebuild_creations()
	_save_creation()
	_show_toast("Restored.", 1.6)


func _erase_nearest(point: Vector3) -> void:
	if commands.is_empty():
		return
	var best_index := -1
	var best_distance := 2.2
	for index in commands.size():
		var distance := _command_distance(commands[index], point)
		if distance < best_distance:
			best_distance = distance
			best_index = index
	if best_index < 0:
		_show_toast("Move a little closer to the piece you want to erase.", 2.2)
		return
	redo_stack.append(commands[best_index])
	commands.remove_at(best_index)
	_rebuild_creations()
	_save_creation()
	_show_toast("Gently erased. Undo can bring it back.", 2.0)


func _command_distance(command: Dictionary, point: Vector3) -> float:
	var type := str(command.get("type", ""))
	if type == "wall" or type == "path":
		var a := _vec_from_pair(command.get("a", [0.0, 0.0]))
		var b := _vec_from_pair(command.get("b", [0.0, 0.0]))
		return _distance_to_segment_2d(Vector2(point.x, point.z), Vector2(a.x, a.z), Vector2(b.x, b.z))
	var pos := _vec_from_pair(command.get("pos", [0.0, 0.0]))
	return Vector2(point.x, point.z).distance_to(Vector2(pos.x, pos.z))


func _ground_point(screen_position: Vector2) -> Vector3:
	var origin := camera.project_ray_origin(screen_position)
	var direction := camera.project_ray_normal(screen_position)
	if absf(direction.y) < 0.0001:
		return Vector3.INF
	var distance := -origin.y / direction.y
	if distance < 0.0:
		return Vector3.INF
	return origin + direction * distance


func _snap_and_clamp(point: Vector3) -> Vector3:
	var result := Vector3(snappedf(point.x, SNAP_STEP), 0.0, snappedf(point.z, SNAP_STEP))
	var flat := Vector2(result.x, result.z)
	if flat.length() > DRAW_LIMIT:
		flat = flat.normalized() * DRAW_LIMIT
		result.x = snappedf(flat.x, SNAP_STEP)
		result.z = snappedf(flat.y, SNAP_STEP)
	return result


func _set_tool(tool: String) -> void:
	if not TOOL_INFO.has(tool):
		return
	current_tool = tool
	for key in tool_buttons:
		var button := tool_buttons[key] as Button
		button.button_pressed = key == tool
	var info: Dictionary = TOOL_INFO[tool]
	if tool_title:
		tool_title.text = str(info.label) + " TOOL"
	if hint_label:
		hint_label.text = str(info.hint)
	_show_toast(str(info.hint), 2.8)


func _update_camera() -> void:
	if not camera:
		return
	var yaw := deg_to_rad(orbit_yaw)
	var pitch := deg_to_rad(orbit_pitch)
	var offset := Vector3(
		cos(pitch) * sin(yaw),
		-sin(pitch),
		cos(pitch) * cos(yaw)
	) * camera_distance
	camera.global_position = camera_target + offset
	camera.look_at(camera_target, Vector3.UP)


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.name = "StorybookCamera"
	camera.fov = 35.0
	camera.near = 0.15
	camera.far = 100.0
	add_child(camera)
	_update_camera()


func _build_environment() -> void:
	world_environment = WorldEnvironment.new()
	world_environment.name = "PainterlyEnvironment"
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("bfe3e1")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("b9d4c0")
	environment.ambient_light_energy = 0.58
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_BG
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure = 0.9
	environment.fog_enabled = true
	environment.fog_light_color = Color("c5d8cf")
	environment.fog_light_energy = 0.52
	environment.fog_density = 0.006
	environment.fog_sky_affect = 0.28
	world_environment.environment = environment
	add_child(world_environment)
	sun = DirectionalLight3D.new()
	sun.name = "DappledSun"
	sun.rotation_degrees = Vector3(-54.0, -38.0, 0.0)
	sun.light_color = Color("fff0c7")
	sun.light_energy = 0.84
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 44.0
	sun.directional_shadow_blend_splits = true
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.name = "SkyFill"
	fill.rotation_degrees = Vector3(-34.0, 138.0, 0.0)
	fill.light_color = Color("a8c7dd")
	fill.light_energy = 0.16
	fill.shadow_enabled = false
	add_child(fill)


func _build_material_library() -> void:
	for color in [Color("81796c"), Color("948879"), Color("746e65"), Color("aaa08d"), Color("6d7568")]:
		stone_materials.append(_material(color, 0.92))
		stone_preview_materials.append(_material(color.lightened(0.18), 0.82, 0.0, 0.56))


func _build_meadow() -> void:
	meadow_root = Node3D.new()
	meadow_root.name = "AncientMeadow"
	add_child(meadow_root)
	creation_root = Node3D.new()
	creation_root.name = "PlayerCreations"
	add_child(creation_root)
	preview_root = Node3D.new()
	preview_root.name = "GesturePreview"
	add_child(preview_root)
	life_root = Node3D.new()
	life_root.name = "LittleLives"
	add_child(life_root)

	var earth := _cylinder(Vector3(0.0, -0.42, 0.0), GLade_RADIUS + 0.7, GLade_RADIUS + 0.35, 0.82, _material(Color("6d5c45"), 1.0), meadow_root, 96)
	earth.name = "Meadow earth"
	var grass := _cylinder(Vector3(0.0, -0.035, 0.0), GLade_RADIUS, GLade_RADIUS, 0.18, _painterly_grass_material(), meadow_root, 96)
	grass.name = "Soft meadow"
	meadow_detail_root = Node3D.new()
	meadow_detail_root.name = "Placement-aware meadow details"
	meadow_root.add_child(meadow_detail_root)
	_add_distant_landscape()
	_add_meadow_border()
	_add_clouds()


func _rebuild_meadow_details() -> void:
	if not meadow_detail_root:
		return
	_clear_children(meadow_detail_root)
	_add_meadow_patches()
	_add_wind_grass()
	_add_open_meadow_details()


func _add_meadow_patches() -> void:
	# Low, quiet color variation adds depth without reading as more vegetation.
	var light_ground := _material(Color("688954"), 1.0)
	var deep_ground := _material(Color("4f7048"), 1.0)
	for index in 26:
		var angle := float(index) * 2.3999
		var radius := 2.4 + fmod(float(index * 37), 105.0) / 105.0 * 10.5
		var position := Vector3(cos(angle) * radius, 0.066, sin(angle) * radius)
		if not _is_meadow_detail_allowed(position, 0.38):
			continue
		var patch := _cylinder(position, 0.24 + fmod(float(index * 13), 22.0) * 0.014, 0.3, 0.018, light_ground if index % 3 else deep_ground, meadow_detail_root, 12)
		patch.name = "Subtle meadow color wash"
		patch.scale.z = 0.58 + float(index % 4) * 0.1
		patch.rotation.y = angle * 1.7


func _add_open_meadow_details() -> void:
	# Stones and small flower notes carry visual interest that previously came
	# almost entirely from tall grass.
	for index in 10:
		var angle := float(index) * 2.71 + 0.44
		var radius := 3.2 + fmod(float(index * 41), 87.0) / 87.0 * 9.0
		var position := Vector3(cos(angle) * radius, 0.09, sin(angle) * radius)
		if not _is_meadow_detail_allowed(position, 0.34):
			continue
		var stone := _sphere(position, Vector3(0.14 + float(index % 3) * 0.035, 0.07, 0.11), stone_materials[(index + 1) % stone_materials.size()], meadow_detail_root, 8, 5)
		stone.name = "Meadow fieldstone"
	for index in 7:
		var angle := float(index) * 2.33 + 1.05
		var radius := 4.0 + fmod(float(index * 31), 71.0) / 71.0 * 7.7
		var position := Vector3(cos(angle) * radius, 0.015, sin(angle) * radius)
		if _is_meadow_detail_allowed(position, 0.48):
			_add_flower_cluster(position, meadow_detail_root, 730 + index)


func _is_meadow_detail_allowed(point: Vector3, clearance: float = 0.3) -> bool:
	if Vector2(point.x, point.z).length() > DRAW_LIMIT - 0.2:
		return false
	for command in commands:
		var type := str(command.get("type", ""))
		var position := _vec_from_pair(command.get("pos", [0.0, 0.0]))
		if type == "path":
			var path_a := _vec_from_pair(command.get("a", [0.0, 0.0]))
			var path_b := _vec_from_pair(command.get("b", [0.0, 0.0]))
			if _distance_to_segment_2d(Vector2(point.x, point.z), Vector2(path_a.x, path_a.z), Vector2(path_b.x, path_b.z)) < 0.78 + clearance:
				return false
		elif type == "pond":
			var pond_delta := Vector2((point.x - position.x) / (2.7 + clearance), (point.z - position.z) / (2.08 + clearance))
			if pond_delta.length() < 1.0:
				return false
		elif type == "cottage":
			var size_data: Array = command.get("size", [4.4, 3.4])
			if absf(point.x - position.x) < float(size_data[0]) * 0.5 + 0.48 + clearance and absf(point.z - position.z) < float(size_data[1]) * 0.5 + 0.48 + clearance:
				return false
		elif type == "tower":
			if Vector2(point.x, point.z).distance_to(Vector2(position.x, position.z)) < 2.02 + clearance:
				return false
		elif type == "nature":
			if Vector2(point.x, point.z).distance_to(Vector2(position.x, position.z)) < 0.9 + clearance:
				return false
		elif type == "wall":
			var wall_a := _vec_from_pair(command.get("a", [0.0, 0.0]))
			var wall_b := _vec_from_pair(command.get("b", [0.0, 0.0]))
			if _distance_to_segment_2d(Vector2(point.x, point.z), Vector2(wall_a.x, wall_a.z), Vector2(wall_b.x, wall_b.z)) < 0.4 + clearance:
				return false
	return true


func _add_meadow_border() -> void:
	for index in 34:
		var angle := TAU * float(index) / 34.0 + sin(float(index) * 1.9) * 0.08
		var radius := 15.2 + sin(float(index) * 2.2) * 0.65
		var position := Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)
		if index % 4 == 0:
			_build_border_tree(position, 1.0 + float(index % 3) * 0.12, meadow_root, index)
		else:
			_build_shrub(position, 0.65 + float(index % 4) * 0.08, meadow_root, index)
	for index in 17:
		var angle := TAU * float(index) / 17.0 + 0.14
		var radius := 15.0
		var rock_position := Vector3(cos(angle) * radius, 0.05, sin(angle) * radius)
		_sphere(rock_position, Vector3(0.42, 0.24, 0.34) * (0.8 + float(index % 3) * 0.18), stone_materials[index % stone_materials.size()], meadow_root, 8, 5)


func _painterly_grass_material() -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode diffuse_burley;
varying vec3 world_position;
void vertex() {
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
	float broad = sin(world_position.x * 0.47 + sin(world_position.z * 0.31) * 1.8);
	float fine = sin(world_position.x * 2.1 + world_position.z * 1.7) * 0.5 + 0.5;
	float wash = clamp(broad * 0.18 + fine * 0.16 + 0.46, 0.0, 1.0);
	// Shader literals are linear color values. These restrained values resolve
	// to mossy storybook greens instead of the electric lime of sRGB literals.
	vec3 shadow_grass = vec3(0.065, 0.165, 0.04);
	vec3 sun_grass = vec3(0.19, 0.34, 0.07);
	ALBEDO = mix(shadow_grass, sun_grass, wash);
	ROUGHNESS = 0.96;
}
"""
	var material := ShaderMaterial.new()
	material.shader = shader
	return material


func _wind_grass_material(color: Color, phase_offset: float) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode cull_disabled, diffuse_burley;
uniform vec4 blade_color : source_color;
uniform float phase_offset = 0.0;
void vertex() {
	vec3 world = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float height_mask = clamp(VERTEX.y / 0.48, 0.0, 1.0);
	float gust = sin(TIME * 1.45 + world.x * 0.55 + world.z * 0.38 + phase_offset);
	VERTEX.x += gust * height_mask * 0.075;
	VERTEX.z += cos(TIME * 1.05 + world.z * 0.42) * height_mask * 0.035;
}
void fragment() {
	ALBEDO = blade_color.rgb;
	ROUGHNESS = 0.95;
}
"""
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("blade_color", color)
	material.set_shader_parameter("phase_offset", phase_offset)
	return material


func _add_wind_grass() -> void:
	var colors := [Color("426438"), Color("537742"), Color("66884a")]
	for layer in 3:
		var material := _wind_grass_material(colors[layer], float(layer) * 2.17)
		var mesh := _grass_clump_mesh(material, 0.38 + float(layer) * 0.035)
		var transforms: Array[Transform3D] = []
		var accepted_positions: Array[Vector3] = []
		for candidate_index in 74:
			var sequence := candidate_index + layer * 97
			var angle := float(sequence) * 2.399963
			var radius := 2.2 + fmod(float(sequence * 47), 100.0) / 100.0 * 10.8
			var position := Vector3(cos(angle) * radius, 0.075, sin(angle) * radius)
			if not _is_meadow_detail_allowed(position, 0.28):
				continue
			var height_scale := 0.78 + fmod(float(sequence * 23), 31.0) / 31.0 * 0.4
			var rotation := angle * 3.1 + float(sequence % 7) * 0.2
			transforms.append(Transform3D(Basis(Vector3.UP, rotation).scaled(Vector3(0.88 + float(sequence % 3) * 0.1, height_scale, 0.88 + float((sequence + 1) % 3) * 0.08)), position))
			accepted_positions.append(position)
		var multimesh := MultiMesh.new()
		multimesh.transform_format = MultiMesh.TRANSFORM_3D
		multimesh.mesh = mesh
		multimesh.instance_count = transforms.size()
		for index in transforms.size():
			multimesh.set_instance_transform(index, transforms[index])
		var field := MultiMeshInstance3D.new()
		field.name = "Sparse filtered grass layer " + str(layer + 1)
		field.multimesh = multimesh
		field.set_meta("accepted_positions", accepted_positions)
		field.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		meadow_detail_root.add_child(field)


func _grass_clump_mesh(material: Material, blade_height: float) -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for blade_index in 3:
		var angle := TAU * float(blade_index) / 3.0
		var right := Vector3(cos(angle), 0.0, sin(angle)) * (0.024 + float(blade_index) * 0.004)
		var forward := Vector3(-sin(angle), 0.0, cos(angle))
		var base := forward * (float(blade_index) - 1.0) * 0.022
		var tip := base + forward * (0.035 + float(blade_index) * 0.012) + Vector3(0.0, blade_height * (0.86 + float(blade_index) * 0.07), 0.0)
		surface.add_vertex(base - right)
		surface.add_vertex(base + right)
		surface.add_vertex(tip)
	surface.generate_normals()
	var mesh := surface.commit() as ArrayMesh
	mesh.surface_set_material(0, material)
	return mesh


func _add_distant_landscape() -> void:
	var horizon_root := Node3D.new()
	horizon_root.name = "Painterly horizon"
	meadow_root.add_child(horizon_root)
	var hill_colors := [Color("4b714d"), Color("5c8056"), Color("456848"), Color("6d8b5d")]
	for index in 16:
		var angle := TAU * float(index) / 16.0 + sin(float(index) * 1.7) * 0.12
		var radius := 19.0 + float(index % 4) * 1.1
		var hill_position := Vector3(cos(angle) * radius, -1.7 + float(index % 3) * 0.12, sin(angle) * radius)
		var hill_scale := Vector3(4.2 + float(index % 3) * 0.8, 2.0 + float(index % 4) * 0.28, 4.8 + float((index + 1) % 4) * 0.65)
		_sphere(hill_position, hill_scale, _material(hill_colors[index % hill_colors.size()], 1.0), horizon_root, 12, 7)
	var mountain_colors := [Color("73828a"), Color("687982"), Color("87928e"), Color("5e7077")]
	for index in 9:
		var angle := TAU * float(index) / 9.0 + 0.34
		var radius := 31.0 + float(index % 3) * 3.4
		var height := 7.8 + float(index % 4) * 1.35
		var mountain := _cylinder(Vector3(cos(angle) * radius, height * 0.5 - 1.4, sin(angle) * radius), 0.18, 4.6 + float(index % 3) * 0.75, height, _material(mountain_colors[index % mountain_colors.size()], 1.0), horizon_root, 9)
		mountain.rotation.y = angle
		var shoulder := _sphere(Vector3(cos(angle) * (radius - 3.4), 0.1, sin(angle) * (radius - 3.4)), Vector3(3.4, 1.8, 3.1), _material(hill_colors[(index + 1) % hill_colors.size()], 1.0), horizon_root, 10, 6)
		shoulder.rotation.y = angle
	# Rocky shelves break the perfect island silhouette and give the glade a sense of geology.
	for index in 13:
		var angle := TAU * float(index) / 13.0 + 0.18
		var radius := 16.1 + sin(float(index) * 2.7) * 0.45
		var shelf_position := Vector3(cos(angle) * radius, -0.35 + float(index % 2) * 0.18, sin(angle) * radius)
		var shelf := _sphere(shelf_position, Vector3(1.1 + float(index % 3) * 0.22, 0.62, 0.9 + float((index + 2) % 3) * 0.18), stone_materials[(index + 2) % stone_materials.size()], horizon_root, 9, 5)
		shelf.rotation.y = angle


func _add_clouds() -> void:
	var cloud_material := _material(Color("eef2e9"), 1.0, 0.0, 0.42)
	for index in 5:
		var cloud := Node3D.new()
		cloud.name = "Drifting cloud"
		cloud.position = Vector3(-20.0 + float(index) * 9.0, 9.0 + float(index % 2) * 1.1, -15.0 + float(index % 3) * 7.0)
		cloud.set_meta("speed", 0.22 + float(index % 3) * 0.07)
		cloud.set_meta("origin_z", cloud.position.z)
		meadow_root.add_child(cloud)
		for puff in 4:
			_sphere(Vector3((float(puff) - 1.5) * 1.0, sin(float(puff) * 1.8) * 0.28, cos(float(puff) * 1.4) * 0.32), Vector3(1.25 + float(puff % 2) * 0.35, 0.52, 0.82), cloud_material, cloud, 10, 6)
		drifting_clouds.append(cloud)


func _build_interface() -> void:
	var canvas := CanvasLayer.new()
	canvas.name = "GladeInterface"
	add_child(canvas)

	var vignette := ColorRect.new()
	vignette.name = "WarmVignette"
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vignette.color = Color(0.07, 0.04, 0.02, 0.08)
	canvas.add_child(vignette)

	var top_panel := PanelContainer.new()
	top_panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top_panel.offset_left = 18.0
	top_panel.offset_top = 16.0
	top_panel.offset_right = -18.0
	top_panel.offset_bottom = 84.0
	top_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.075, 0.105, 0.082, 0.9), Color(0.85, 0.92, 0.78, 0.28), 18))
	canvas.add_child(top_panel)
	var top_margin := MarginContainer.new()
	top_margin.add_theme_constant_override("margin_left", 20)
	top_margin.add_theme_constant_override("margin_right", 16)
	top_margin.add_theme_constant_override("margin_top", 10)
	top_margin.add_theme_constant_override("margin_bottom", 10)
	top_panel.add_child(top_margin)
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 10)
	top_margin.add_child(top_row)
	var brand_box := VBoxContainer.new()
	brand_box.custom_minimum_size.x = 250.0
	brand_box.add_theme_constant_override("separation", -2)
	top_row.add_child(brand_box)
	var brand := Label.new()
	brand.text = "GLADE"
	brand.add_theme_font_size_override("font_size", 25)
	brand.add_theme_color_override("font_color", Color("f4f0d6"))
	brand_box.add_child(brand)
	var subtitle := Label.new()
	subtitle.text = "A little storybook world, drawn by you"
	subtitle.add_theme_font_size_override("font_size", 12)
	subtitle.add_theme_color_override("font_color", Color("b8c7ad"))
	brand_box.add_child(subtitle)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_row.add_child(spacer)
	mood_label = Label.new()
	mood_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mood_label.add_theme_color_override("font_color", Color("d9dfc6"))
	mood_label.add_theme_font_size_override("font_size", 13)
	top_row.add_child(mood_label)
	_add_top_button("Change light", top_row, _cycle_mood)
	_add_top_button("Undo", top_row, _undo)
	_add_top_button("Redo", top_row, _redo)
	_add_top_button("New glade", top_row, _new_glade_pressed)

	var tool_card := PanelContainer.new()
	tool_card.anchor_left = 0.02
	tool_card.anchor_top = 0.145
	tool_card.anchor_right = 0.285
	tool_card.anchor_bottom = 0.265
	tool_card.add_theme_stylebox_override("panel", _panel_style(Color(0.96, 0.94, 0.82, 0.9), Color(0.2, 0.28, 0.18, 0.18), 16))
	canvas.add_child(tool_card)
	var tool_margin := MarginContainer.new()
	tool_margin.add_theme_constant_override("margin_left", 16)
	tool_margin.add_theme_constant_override("margin_right", 16)
	tool_margin.add_theme_constant_override("margin_top", 10)
	tool_margin.add_theme_constant_override("margin_bottom", 10)
	tool_card.add_child(tool_margin)
	var tool_copy := VBoxContainer.new()
	tool_copy.add_theme_constant_override("separation", 2)
	tool_margin.add_child(tool_copy)
	tool_title = Label.new()
	tool_title.add_theme_font_size_override("font_size", 14)
	tool_title.add_theme_color_override("font_color", Color("24402d"))
	tool_copy.add_child(tool_title)
	hint_label = Label.new()
	hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint_label.add_theme_font_size_override("font_size", 12)
	hint_label.add_theme_color_override("font_color", Color("506151"))
	tool_copy.add_child(hint_label)

	toast_panel = PanelContainer.new()
	toast_panel.anchor_left = 0.32
	toast_panel.anchor_top = 0.13
	toast_panel.anchor_right = 0.68
	toast_panel.anchor_bottom = 0.19
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	toast_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.08, 0.11, 0.085, 0.88), Color(0.78, 0.87, 0.69, 0.2), 16))
	canvas.add_child(toast_panel)
	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_font_size_override("font_size", 12)
	toast_label.add_theme_color_override("font_color", Color("edf1da"))
	toast_panel.add_child(toast_label)

	var bottom_panel := PanelContainer.new()
	bottom_panel.anchor_left = 0.5
	bottom_panel.anchor_top = 1.0
	bottom_panel.anchor_right = 0.5
	bottom_panel.anchor_bottom = 1.0
	bottom_panel.offset_left = -414.0
	bottom_panel.offset_top = -94.0
	bottom_panel.offset_right = 414.0
	bottom_panel.offset_bottom = -18.0
	bottom_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.065, 0.092, 0.072, 0.94), Color(0.82, 0.9, 0.72, 0.28), 22))
	canvas.add_child(bottom_panel)
	var bottom_margin := MarginContainer.new()
	bottom_margin.add_theme_constant_override("margin_left", 10)
	bottom_margin.add_theme_constant_override("margin_right", 10)
	bottom_margin.add_theme_constant_override("margin_top", 9)
	bottom_margin.add_theme_constant_override("margin_bottom", 9)
	bottom_panel.add_child(bottom_margin)
	var toolbar := HBoxContainer.new()
	toolbar.alignment = BoxContainer.ALIGNMENT_CENTER
	toolbar.add_theme_constant_override("separation", 7)
	bottom_margin.add_child(toolbar)
	for tool in ["wall", "cottage", "tower", "path", "pond", "nature", "erase"]:
		var info: Dictionary = TOOL_INFO[tool]
		var button := Button.new()
		button.text = str(info.label) + "\n" + str(info.key)
		button.tooltip_text = str(info.hint)
		button.toggle_mode = true
		button.custom_minimum_size = Vector2(106.0 if tool == "cottage" else 92.0, 58.0)
		button.add_theme_font_size_override("font_size", 12)
		button.add_theme_color_override("font_color", Color("dbe4cf"))
		button.add_theme_color_override("font_pressed_color", Color("203326"))
		button.add_theme_stylebox_override("normal", _panel_style(Color(0.12, 0.16, 0.125, 0.82), Color(0.7, 0.8, 0.62, 0.12), 14))
		button.add_theme_stylebox_override("hover", _panel_style(Color(0.19, 0.26, 0.19, 0.94), Color(0.85, 0.91, 0.73, 0.34), 14))
		button.add_theme_stylebox_override("pressed", _panel_style(Color("dce7bd"), Color("eef4d9"), 14))
		button.pressed.connect(_set_tool.bind(tool))
		toolbar.add_child(button)
		tool_buttons[tool] = button

	var help := Label.new()
	help.anchor_left = 1.0
	help.anchor_top = 1.0
	help.anchor_right = 1.0
	help.anchor_bottom = 1.0
	help.offset_left = -380.0
	help.offset_top = -132.0
	help.offset_right = -24.0
	help.offset_bottom = -108.0
	help.text = "Right-drag orbit  •  Wheel zoom  •  Middle-drag pan"
	help.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	help.add_theme_font_size_override("font_size", 12)
	help.add_theme_color_override("font_color", Color(0.94, 0.96, 0.86, 0.82))
	help.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(help)


func _add_top_button(text_value: String, parent: Control, callback: Callable) -> void:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = Vector2(88.0, 38.0)
	button.add_theme_font_size_override("font_size", 12)
	button.add_theme_color_override("font_color", Color("e9eddc"))
	button.add_theme_stylebox_override("normal", _panel_style(Color(0.15, 0.2, 0.155, 0.88), Color(0.75, 0.84, 0.68, 0.18), 12))
	button.add_theme_stylebox_override("hover", _panel_style(Color(0.24, 0.32, 0.23, 0.94), Color(0.84, 0.9, 0.73, 0.4), 12))
	button.pressed.connect(callback)
	parent.add_child(button)


func _panel_style(color: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 8.0
	style.content_margin_right = 8.0
	style.content_margin_top = 5.0
	style.content_margin_bottom = 5.0
	return style


func _show_toast(message: String, duration: float = 2.4) -> void:
	if not toast_label:
		return
	toast_label.text = message
	toast_panel.modulate.a = 1.0
	toast_timer = duration


func _cycle_mood() -> void:
	current_mood = (current_mood + 1) % MOODS.size()
	_apply_mood(true)


func _apply_mood(animated: bool) -> void:
	var mood: Dictionary = MOODS[current_mood]
	mood_label.text = str(mood.name)
	var environment := world_environment.environment
	if not animated:
		environment.background_color = mood.sky
		environment.ambient_light_color = mood.ambient
		sun.light_color = mood.sun
		sun.light_energy = float(mood.energy)
		sun.rotation_degrees.x = float(mood.angle)
	else:
		var tween := create_tween().set_parallel(true)
		tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		tween.tween_property(environment, "background_color", mood.sky, 1.2)
		tween.tween_property(environment, "ambient_light_color", mood.ambient, 1.2)
		tween.tween_property(sun, "light_color", mood.sun, 1.2)
		tween.tween_property(sun, "light_energy", float(mood.energy), 1.2)
		tween.tween_property(sun, "rotation_degrees:x", float(mood.angle), 1.2)
	for light in fireflies:
		light.visible = current_mood == 3
	_show_toast(str(mood.name) + " settles over the meadow.", 2.0)


func _new_glade_pressed() -> void:
	if not clear_armed:
		clear_armed = true
		clear_timer = 4.0
		_show_toast("Press New glade again within four seconds to clear your drawing.", 4.0)
		return
	clear_armed = false
	commands.clear()
	redo_stack.clear()
	_rebuild_creations()
	_save_creation()
	_show_toast("A fresh meadow. What belongs here?", 3.0)


func _load_or_seed_creation() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if file:
			var parsed = JSON.parse_string(file.get_as_text())
			if parsed is Array:
				for item in parsed:
					if item is Dictionary:
						commands.append(item)
	if commands.is_empty():
		commands = _starter_creation()
	_rebuild_creations()


func _starter_creation() -> Array[Dictionary]:
	return [
		{"type": "wall", "a": [-7.25, 3.75], "b": [2.25, 3.75], "seed": 81},
		{"type": "path", "a": [-2.0, -9.0], "b": [-2.0, 7.0], "seed": 92},
		{"type": "cottage", "pos": [-3.35, -0.4], "size": [4.9, 3.7], "seed": 103},
		{"type": "tower", "pos": [4.6, 1.4], "seed": 116},
		{"type": "pond", "pos": [5.8, -4.7], "seed": 127},
		{"type": "path", "a": [0.0, -5.2], "b": [8.2, -4.45], "seed": 134},
		{"type": "nature", "pos": [-7.8, -4.4], "seed": 141},
		{"type": "nature", "pos": [1.1, 7.2], "seed": 142},
		{"type": "nature", "pos": [8.7, 4.7], "seed": 143},
	]


func _save_creation() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(commands))


func _rebuild_creations() -> void:
	_clear_children(creation_root)
	for command in commands:
		_build_command(command, creation_root, false)
	_rebuild_meadow_details()
	_relocate_sheep_if_blocked()


func _build_command(command: Dictionary, parent: Node3D, preview: bool) -> void:
	match str(command.get("type", "")):
		"wall":
			_build_wall(command, parent, preview)
		"cottage":
			_build_cottage(command, parent, preview)
		"tower":
			_build_tower(command, parent, preview)
		"path":
			_build_path(command, parent, preview)
		"pond":
			_build_pond(command, parent, preview)
		"nature":
			_build_nature(command, parent, preview)


func _build_wall(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost wall" if preview else "Procedural stone wall"
	parent.add_child(root)
	var a := _vec_from_pair(command.get("a", [0.0, 0.0]))
	var b := _vec_from_pair(command.get("b", [1.0, 0.0]))
	var delta := b - a
	delta.y = 0.0
	var length := delta.length()
	if length < 0.2:
		return
	var direction := delta / length
	var angle := -atan2(direction.z, direction.x)
	var seed_value := int(command.get("seed", 1))
	var gate_positions := _wall_gate_positions(a, b)
	var wall_height := 2.02
	var stone_height := 0.43
	for row in 5:
		var count := maxi(1, int(ceil(length / (0.64 + float((seed_value + row) % 3) * 0.035))))
		var stride := length / float(count)
		var offset := stride * 0.5 if row % 2 else 0.0
		for index in range(-1, count + 1):
			var along := (float(index) + 0.5) * stride + offset
			if along < 0.03 or along > length - 0.03:
				continue
			var hidden_by_gate := false
			for gate_distance in gate_positions:
				var half_width := 0.82
				var local_x: float = absf(along - float(gate_distance))
				var row_y := (float(row) + 0.5) * stone_height
				if local_x < half_width and row_y < 1.48:
					hidden_by_gate = true
					break
			if hidden_by_gate:
				continue
			var wobble := sin(float(seed_value * 7 + row * 17 + index * 31)) * 0.025
			var center := a + direction * along + Vector3(0.0, (float(row) + 0.5) * stone_height, 0.0)
			center += Vector3(-direction.z, 0.0, direction.x) * wobble
			var material := stone_preview_materials[(row + index + seed_value) % stone_preview_materials.size()] if preview else stone_materials[(row + index + seed_value) % stone_materials.size()]
			var stone := _box(center, Vector3(stride * 0.94, stone_height * 0.86, 0.48 + absf(wobble) * 1.6), material, root)
			stone.rotation.y = angle
	# The cap and end piers make even a short gesture feel authored.
	var cap_material := stone_preview_materials[3] if preview else stone_materials[3]
	var cap := _box((a + b) * 0.5 + Vector3(0.0, wall_height + 0.08, 0.0), Vector3(length + 0.18, 0.18, 0.62), cap_material, root)
	cap.rotation.y = angle
	_build_wall_pier(a, angle, root, preview, seed_value)
	_build_wall_pier(b, angle, root, preview, seed_value + 5)
	for gate_distance in gate_positions:
		_build_gateway(a + direction * float(gate_distance), angle, root, preview, seed_value)
	if not preview:
		_add_wall_collision_runs(a, b, gate_positions, angle, root)
		_add_wall_life(a, b, angle, root, seed_value, gate_positions)


func _build_wall_pier(position: Vector3, angle: float, parent: Node3D, preview: bool, seed_value: int) -> void:
	var material := stone_preview_materials[seed_value % stone_preview_materials.size()] if preview else stone_materials[seed_value % stone_materials.size()]
	var pier := _box(position + Vector3(0.0, 1.03, 0.0), Vector3(0.68, 2.06, 0.68), material, parent)
	pier.rotation.y = angle
	var crown := _box(position + Vector3(0.0, 2.15, 0.0), Vector3(0.82, 0.2, 0.82), stone_preview_materials[3] if preview else stone_materials[3], parent)
	crown.rotation.y = angle


func _build_gateway(position: Vector3, angle: float, parent: Node3D, preview: bool, seed_value: int) -> void:
	var gateway := Node3D.new()
	gateway.name = "Path-made archway"
	gateway.position = position
	gateway.rotation.y = angle
	parent.add_child(gateway)
	var material := stone_preview_materials[1] if preview else stone_materials[1]
	for side in [-1.0, 1.0]:
		_box(Vector3(side * 0.86, 0.66, 0.0), Vector3(0.34, 1.32, 0.62), material, gateway)
	var radius := 0.86
	for index in 9:
		var arch_angle := PI * float(index) / 8.0
		var local := Vector3(cos(arch_angle) * radius, 1.35 + sin(arch_angle) * radius, 0.0)
		var voussoir := _box(local, Vector3(0.34, 0.3, 0.66), stone_preview_materials[(index + seed_value) % stone_preview_materials.size()] if preview else stone_materials[(index + seed_value) % stone_materials.size()], gateway)
		voussoir.rotation.z = arch_angle - PI * 0.5
	if not preview:
		var lantern_frame := _material(Color("39433e"), 0.62, 0.25)
		var lantern_glass := _material(Color("ffd27c"), 0.35, 0.0, 0.92, Color("ffbd56"), 1.7)
		_box(Vector3(1.1, 1.38, 0.34), Vector3(0.06, 0.44, 0.06), lantern_frame, gateway)
		_box(Vector3(1.1, 1.2, 0.34), Vector3(0.22, 0.26, 0.18), lantern_glass, gateway)


func _wall_gate_positions(a: Vector3, b: Vector3) -> Array[float]:
	var result: Array[float] = []
	var wall_start := Vector2(a.x, a.z)
	var wall_end := Vector2(b.x, b.z)
	var wall_length := wall_start.distance_to(wall_end)
	for path_command in commands:
		if str(path_command.get("type", "")) != "path":
			continue
		var path_a3 := _vec_from_pair(path_command.get("a", [0.0, 0.0]))
		var path_b3 := _vec_from_pair(path_command.get("b", [0.0, 0.0]))
		var hit := _segment_intersection(wall_start, wall_end, Vector2(path_a3.x, path_a3.z), Vector2(path_b3.x, path_b3.z))
		if bool(hit.get("hit", false)):
			var distance := float(hit.get("t", 0.5)) * wall_length
			if distance > 1.0 and distance < wall_length - 1.0:
				result.append(distance)
	return result


func _add_wall_life(a: Vector3, b: Vector3, angle: float, parent: Node3D, seed_value: int, gate_positions: Array[float]) -> void:
	var length := a.distance_to(b)
	var direction := (b - a).normalized()
	var ivy_material := _material(Color("497649"), 0.94)
	var ivy_light := _material(Color("6b9656"), 0.96)
	for index in maxi(2, int(length / 2.2)):
		var along := (float(index) + 0.4) / float(maxi(2, int(length / 2.2))) * length
		var near_gate := false
		for gate_distance in gate_positions:
			if absf(along - float(gate_distance)) < 1.15:
				near_gate = true
		if near_gate or (index + seed_value) % 3 == 0:
			continue
		var base := a + direction * along + Vector3(-direction.z, 0.0, direction.x) * 0.29
		for leaf_index in 5:
			var leaf_pos := base + Vector3(sin(float(leaf_index) * 2.3) * 0.18, 0.26 + float(leaf_index) * 0.29, cos(float(leaf_index) * 1.8) * 0.05)
			_sphere(leaf_pos, Vector3(0.18, 0.12, 0.08), ivy_light if leaf_index % 2 else ivy_material, parent, 8, 5)
	# Small ground flowers sell scale against the masonry.
	for index in maxi(2, int(length / 1.5)):
		var along := (float(index) + 0.5) / float(maxi(2, int(length / 1.5))) * length
		if (index + seed_value) % 2 == 0:
			_add_flower_cluster(a + direction * along + Vector3(-direction.z, 0.02, direction.x) * 0.5, parent, seed_value + index)


func _build_cottage(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost cottage" if preview else "Procedural cottage"
	root.position = _vec_from_pair(command.get("pos", [0.0, 0.0]))
	parent.add_child(root)
	var size_data: Array = command.get("size", [4.4, 3.4])
	var width := clampf(float(size_data[0]), 3.0, 7.0)
	var depth := clampf(float(size_data[1]), 2.6, 5.2)
	var seed_value := int(command.get("seed", 1))
	var two_story := width > 5.5 or seed_value % 4 == 0
	var wall_height := 3.15 if two_story else 2.42
	var palettes := [
		{"wall": Color("d9c9a5"), "trim": Color("73533d"), "roof": Color("8d5945"), "door": Color("55745a")},
		{"wall": Color("c8d2bd"), "trim": Color("5f594d"), "roof": Color("596878"), "door": Color("744f45")},
		{"wall": Color("d8b59c"), "trim": Color("6d4939"), "roof": Color("6c4f5e"), "door": Color("516d78")},
	]
	var palette: Dictionary = palettes[seed_value % palettes.size()]
	var alpha := 0.55 if preview else 1.0
	var wall_material := _material(palette.wall.lightened(0.1) if preview else palette.wall, 0.92, 0.0, alpha)
	var trim_material := _material(palette.trim.lightened(0.1) if preview else palette.trim, 0.82, 0.0, alpha)
	var roof_material := _material(palette.roof.lightened(0.12) if preview else palette.roof, 0.86, 0.0, alpha)
	var door_material := _material(palette.door, 0.78, 0.0, alpha)
	var glass_material := _material(Color("8ab5b2"), 0.28, 0.0, minf(alpha, 0.76), Color("7ec4bd") if not preview else Color.BLACK, 0.2)

	# A visible stone foundation keeps the cottage settled into the meadow.
	_box(Vector3(0.0, 0.16, 0.0), Vector3(width + 0.28, 0.32, depth + 0.28), stone_preview_materials[2] if preview else stone_materials[2], root)
	_box(Vector3(0.0, 0.34 + wall_height * 0.5, 0.0), Vector3(width, wall_height, depth), wall_material, root)
	# Vertical and horizontal timbering turns a simple volume into a legible cottage.
	for x in [-width * 0.5 + 0.1, 0.0, width * 0.5 - 0.1]:
		_box(Vector3(x, 0.34 + wall_height * 0.5, depth * 0.5 + 0.035), Vector3(0.13, wall_height + 0.05, 0.11), trim_material, root)
		_box(Vector3(x, 0.34 + wall_height * 0.5, -depth * 0.5 - 0.035), Vector3(0.13, wall_height + 0.05, 0.11), trim_material, root)
	for y in [0.58, 0.34 + wall_height - 0.2]:
		_box(Vector3(0.0, y, depth * 0.5 + 0.04), Vector3(width, 0.12, 0.12), trim_material, root)
		_box(Vector3(0.0, y, -depth * 0.5 - 0.04), Vector3(width, 0.12, 0.12), trim_material, root)
	for z in [-depth * 0.5 + 0.1, depth * 0.5 - 0.1]:
		_box(Vector3(width * 0.5 + 0.035, 0.34 + wall_height * 0.5, z), Vector3(0.11, wall_height + 0.05, 0.13), trim_material, root)
		_box(Vector3(-width * 0.5 - 0.035, 0.34 + wall_height * 0.5, z), Vector3(0.11, wall_height + 0.05, 0.13), trim_material, root)
	if two_story:
		_box(Vector3(0.0, 1.9, depth * 0.5 + 0.045), Vector3(width, 0.13, 0.13), trim_material, root)
		_box(Vector3(0.0, 1.9, -depth * 0.5 - 0.045), Vector3(width, 0.13, 0.13), trim_material, root)

	var roof_rise := minf(1.65, width * 0.31)
	var roof_angle := atan2(roof_rise, width * 0.5)
	var slope_length := sqrt(pow(width * 0.5 + 0.34, 2.0) + pow(roof_rise, 2.0))
	for side in [-1.0, 1.0]:
		var panel := _box(Vector3(side * width * 0.25, 0.36 + wall_height + roof_rise * 0.5, 0.0), Vector3(slope_length, 0.18, depth + 0.62), roof_material, root)
		panel.rotation.z = -roof_angle * side
	_triangle_gable(Vector3(0.0, 0.34 + wall_height, depth * 0.5 + 0.055), width, roof_rise, 0.12, wall_material, root, false)
	_triangle_gable(Vector3(0.0, 0.34 + wall_height, -depth * 0.5 - 0.055), width, roof_rise, 0.12, wall_material, root, true)
	# Front door with a tiny awning and warm lantern.
	var door_x := -width * 0.2
	_box(Vector3(door_x, 1.12, depth * 0.5 + 0.075), Vector3(0.82, 1.58, 0.12), door_material, root)
	var awning := _box(Vector3(door_x, 2.02, depth * 0.5 + 0.34), Vector3(1.16, 0.11, 0.62), roof_material, root)
	awning.rotation.x = -0.16
	var knob := _sphere(Vector3(door_x + 0.25, 1.08, depth * 0.5 + 0.15), Vector3.ONE * 0.07, _material(Color("d5b25f"), 0.35, 0.6), root, 8, 5)
	knob.name = "Brass door latch"
	var window_x := width * 0.2
	_add_cottage_window(Vector3(window_x, 1.34, depth * 0.5 + 0.085), Vector2(0.92, 0.94), trim_material, glass_material, root)
	if width > 4.2:
		_add_cottage_window(Vector3(width * 0.5 + 0.08, 1.34, -depth * 0.17), Vector2(0.84, 0.9), trim_material, glass_material, root, PI * 0.5)
	if two_story:
		_add_cottage_window(Vector3(0.06, 2.54, depth * 0.5 + 0.085), Vector2(0.82, 0.68), trim_material, glass_material, root)
	# Crooked chimney and smoke puffs.
	var chimney_x := width * 0.28
	_box(Vector3(chimney_x, wall_height + roof_rise * 0.86, -depth * 0.12), Vector3(0.48, 1.7, 0.48), stone_preview_materials[1] if preview else stone_materials[1], root)
	_box(Vector3(chimney_x, wall_height + roof_rise * 1.7, -depth * 0.12), Vector3(0.62, 0.16, 0.62), stone_preview_materials[3] if preview else stone_materials[3], root)
	if not preview:
		_add_box_obstacle(
			Vector3(0.0, (wall_height + roof_rise + 0.7) * 0.5, 0.0),
			Vector3(width + 0.38, wall_height + roof_rise + 0.7, depth + 0.38),
			0.0,
			root,
			"Cottage collision"
		)
		for smoke_index in 3:
			var smoke := _sphere(Vector3(chimney_x + float(smoke_index) * 0.13, wall_height + roof_rise * 1.9 + float(smoke_index) * 0.42, -depth * 0.12), Vector3.ONE * (0.16 + float(smoke_index) * 0.07), _material(Color(0.78, 0.8, 0.76, 0.38), 1.0, 0.0, 0.38), root, 8, 5)
			smoke.name = "Lazy chimney smoke"
		_add_cottage_garden(width, depth, root, seed_value)


func _add_cottage_window(position: Vector3, size_2d: Vector2, frame_material: Material, glass_material: Material, parent: Node3D, yaw: float = 0.0) -> void:
	var frame := Node3D.new()
	frame.position = position
	frame.rotation.y = yaw
	parent.add_child(frame)
	_box(Vector3.ZERO, Vector3(size_2d.x, size_2d.y, 0.07), frame_material, frame)
	_box(Vector3(0.0, 0.0, 0.045), Vector3(size_2d.x - 0.14, size_2d.y - 0.14, 0.04), glass_material, frame)
	_box(Vector3(0.0, 0.0, 0.075), Vector3(0.055, size_2d.y - 0.1, 0.045), frame_material, frame)
	_box(Vector3(0.0, 0.0, 0.075), Vector3(size_2d.x - 0.1, 0.055, 0.045), frame_material, frame)
	_box(Vector3(0.0, -size_2d.y * 0.56, 0.08), Vector3(size_2d.x + 0.18, 0.12, 0.17), stone_materials[3], frame)


func _add_cottage_garden(width: float, depth: float, parent: Node3D, seed_value: int) -> void:
	var side := -1.0 if seed_value % 2 else 1.0
	var tree_pos := Vector3(side * (width * 0.5 + 1.2), 0.0, -depth * 0.2)
	_build_small_tree(tree_pos, 0.75, parent, seed_value)
	for index in 4:
		var x := -width * 0.32 + float(index) * width * 0.22
		_add_flower_cluster(Vector3(x, 0.02, depth * 0.5 + 0.55), parent, seed_value + index)
	# Bench and woodpile are tiny rewards discovered while orbiting.
	var wood := _material(Color("76533c"), 0.9)
	_box(Vector3(width * 0.5 + 0.58, 0.34, depth * 0.18), Vector3(0.65, 0.08, 0.28), wood, parent)
	_box(Vector3(width * 0.5 + 0.58, 0.62, depth * 0.05), Vector3(0.65, 0.42, 0.08), wood, parent)
	for index in 4:
		_cylinder(Vector3(-width * 0.5 - 0.42, 0.14 + float(index % 2) * 0.2, -depth * 0.05 + float(index / 2) * 0.24), 0.09, 0.09, 0.5, wood, parent, 8, Vector3(0.0, 0.0, PI * 0.5))


func _build_tower(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost tower" if preview else "Round watchtower"
	root.position = _vec_from_pair(command.get("pos", [0.0, 0.0]))
	parent.add_child(root)
	var seed_value := int(command.get("seed", 1))
	var radius := 1.58 + float(seed_value % 3) * 0.12
	var height := 4.1 + float(seed_value % 4) * 0.22
	var alpha := 0.55 if preview else 1.0
	var wall_material := _material(Color("a79c86").lightened(0.12) if preview else Color("a79c86"), 0.94, 0.0, alpha)
	var roof_colors := [Color("6b5261"), Color("536979"), Color("8b5d46")]
	var roof_material := _material(roof_colors[seed_value % roof_colors.size()].lightened(0.1) if preview else roof_colors[seed_value % roof_colors.size()], 0.88, 0.0, alpha)
	_cylinder(Vector3(0.0, 0.2, 0.0), radius + 0.2, radius + 0.3, 0.4, stone_preview_materials[2] if preview else stone_materials[2], root, 32)
	_cylinder(Vector3(0.0, 0.42 + height * 0.5, 0.0), radius, radius * 1.03, height, wall_material, root, 32)
	for band_y in [0.78, height * 0.55, height + 0.26]:
		_cylinder(Vector3(0.0, band_y, 0.0), radius + 0.09, radius + 0.09, 0.14, stone_preview_materials[3] if preview else stone_materials[3], root, 32)
	var roof_height := 1.9
	_cylinder(Vector3(0.0, height + 1.18, 0.0), 0.04, radius + 0.44, roof_height, roof_material, root, 32)
	_sphere(Vector3(0.0, height + 2.18, 0.0), Vector3.ONE * 0.1, _material(Color("d5b15b"), 0.4, 0.6, alpha), root, 8, 5)
	# Four deep windows orient around the curved facade.
	var dark := _material(Color("24353b"), 0.35, 0.0, alpha)
	var frame := _material(Color("665441"), 0.82, 0.0, alpha)
	for level in 2:
		for side_index in 4:
			if (side_index + level + seed_value) % 2 == 1:
				continue
			var angle := float(side_index) * PI * 0.5
			var window_root := Node3D.new()
			window_root.position = Vector3(sin(angle) * (radius + 0.025), 1.55 + float(level) * 1.65, cos(angle) * (radius + 0.025))
			window_root.rotation.y = angle
			root.add_child(window_root)
			_box(Vector3.ZERO, Vector3(0.54, 0.84, 0.09), frame, window_root)
			_box(Vector3(0.0, 0.0, 0.055), Vector3(0.38, 0.66, 0.06), dark, window_root)
	# A front door and roof flag give the tower a readable front and silhouette.
	_box(Vector3(0.0, 0.96, radius + 0.055), Vector3(0.82, 1.42, 0.12), _material(Color("53664e"), 0.84, 0.0, alpha), root)
	_box(Vector3(0.0, height + 2.5, 0.0), Vector3(0.045, 0.74, 0.045), _material(Color("3c4542"), 0.55, 0.3, alpha), root)
	var flag := _box(Vector3(0.28, height + 2.72, 0.0), Vector3(0.52, 0.28, 0.035), _material(Color("b56c55"), 0.76, 0.0, alpha), root)
	flag.rotation.z = -0.08
	if not preview:
		_add_cylinder_obstacle(Vector3(0.0, (height + 0.8) * 0.5, 0.0), radius + 0.22, height + 0.8, root, "Tower collision")
		for index in 8:
			var angle := float(index) * 0.58 + float(seed_value) * 0.13
			var y := 0.48 + float(index) * 0.36
			var leaf_pos := Vector3(sin(angle) * (radius + 0.11), y, cos(angle) * (radius + 0.11))
			_sphere(leaf_pos, Vector3(0.2, 0.13, 0.09), _material(Color("54794d"), 0.95), root, 8, 5)
		_add_flower_cluster(Vector3(radius + 0.25, 0.02, 0.5), root, seed_value)


func _build_path(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost path" if preview else "Wandering path"
	parent.add_child(root)
	var a := _vec_from_pair(command.get("a", [0.0, 0.0]))
	var b := _vec_from_pair(command.get("b", [1.0, 0.0]))
	var delta := b - a
	var length := delta.length()
	if length < 0.15:
		return
	var direction := delta / length
	var normal := Vector3(-direction.z, 0.0, direction.x)
	var seed_value := int(command.get("seed", 1))
	var stone_path := _material(Color("b8aa8e").lightened(0.1) if preview else Color("b8aa8e"), 0.96, 0.0, 0.5 if preview else 1.0)
	var stone_alt := _material(Color("d0c3a3").lightened(0.1) if preview else Color("d0c3a3"), 0.95, 0.0, 0.5 if preview else 1.0)
	var path_soil := _material(Color("907a59").lightened(0.08) if preview else Color("907a59"), 1.0, 0.0, 0.42 if preview else 1.0)
	var wood := _material(Color("7d5c42").lightened(0.12) if preview else Color("7d5c42"), 0.88, 0.0, 0.5 if preview else 1.0)
	var step_count := maxi(2, int(ceil(length / 0.54)))
	for index in step_count + 1:
		var along := clampf(float(index) / float(step_count), 0.0, 1.0)
		var center := a.lerp(b, along)
		var jitter := sin(float(index * 19 + seed_value * 3)) * 0.09
		center += normal * jitter
		var over_pond := _point_over_pond(center)
		if over_pond:
			var plank := _box(center + Vector3(0.0, 0.22, 0.0), Vector3(1.12, 0.11, 0.42), wood, root)
			plank.rotation.y = -atan2(direction.z, direction.x) + PI * 0.5
		else:
			var soil_patch := _cylinder(center + Vector3(0.0, 0.064, 0.0), 0.58 + absf(jitter) * 0.18, 0.54, 0.026, path_soil, root, 10)
			soil_patch.name = "Packed earth path bed"
			soil_patch.scale.z = 0.72 + float((index + seed_value) % 3) * 0.05
			var pebble := _cylinder(center + Vector3(0.0, 0.08, 0.0), 0.48 + absf(jitter) * 0.25, 0.43, 0.11, stone_alt if (index + seed_value) % 3 == 0 else stone_path, root, 10)
			pebble.scale.z = 0.72 + float((index + seed_value) % 4) * 0.06
			pebble.rotation.y = float(index * 37 % 180) * PI / 180.0
	# Sparse flowers and fieldstones soften the edge without putting grass back
	# onto the walking surface.
	if not preview:
		for index in maxi(2, int(length / 1.25)):
			var along := (float(index) + 0.4) / float(maxi(2, int(length / 1.25)))
			var side := -1.0 if (index + seed_value) % 2 else 1.0
			var edge := a.lerp(b, along) + normal * side * (0.88 + float(index % 3) * 0.08)
			if index % 3 == 0:
				_add_flower_cluster(edge, root, seed_value + index)
			else:
				_sphere(edge + Vector3(0.0, 0.085, 0.0), Vector3(0.13 + float(index % 2) * 0.035, 0.07, 0.11), stone_materials[(seed_value + index) % stone_materials.size()], root, 8, 5)


func _point_over_pond(point: Vector3) -> bool:
	for command in commands:
		if str(command.get("type", "")) != "pond":
			continue
		var pond_pos := _vec_from_pair(command.get("pos", [0.0, 0.0]))
		if Vector2(point.x, point.z).distance_to(Vector2(pond_pos.x, pond_pos.z)) < 2.25:
			return true
	return false


func _point_near_any_path(point: Vector3, clearance: float) -> bool:
	var flat_point := Vector2(point.x, point.z)
	for command in commands:
		if str(command.get("type", "")) != "path":
			continue
		var path_a := _vec_from_pair(command.get("a", [0.0, 0.0]))
		var path_b := _vec_from_pair(command.get("b", [0.0, 0.0]))
		if _distance_to_segment_2d(flat_point, Vector2(path_a.x, path_a.z), Vector2(path_b.x, path_b.z)) < clearance:
			return true
	return false


func _pond_has_crossing_path(pond_center: Vector3) -> bool:
	return _point_near_any_path(pond_center, 2.0)


func _animated_pond_material() -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley;
uniform vec4 deep_color : source_color;
uniform vec4 light_color : source_color;
varying vec3 world_position;
void vertex() {
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
	float broad_ripple = sin(world_position.x * 3.1 + TIME * 0.72) * cos(world_position.z * 3.7 - TIME * 0.54);
	float fine_ripple = sin((world_position.x + world_position.z) * 7.2 + TIME * 1.1) * 0.5;
	float shimmer = clamp(0.5 + broad_ripple * 0.2 + fine_ripple * 0.08, 0.0, 1.0);
	ALBEDO = mix(deep_color.rgb, light_color.rgb, shimmer);
	ROUGHNESS = 0.2;
	SPECULAR = 0.62;
	ALPHA = 0.8;
}
"""
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("deep_color", Color("376f78"))
	material.set_shader_parameter("light_color", Color("72b5ae"))
	return material


func _build_pond(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost pond" if preview else "Mirror pond"
	root.position = _vec_from_pair(command.get("pos", [0.0, 0.0]))
	parent.add_child(root)
	var seed_value := int(command.get("seed", 1))
	var alpha := 0.48 if preview else 0.78
	var bank := _material(Color("6d7650").lightened(0.1) if preview else Color("6d7650"), 0.98, 0.0, 0.62 if preview else 1.0)
	var water: Material = _material(Color("5c9da0"), 0.12, 0.05, alpha) if preview else _animated_pond_material()
	var shadow_water := _material(Color("376e78"), 0.2, 0.0, alpha)
	var bank_mesh := _cylinder(Vector3(0.0, 0.035, 0.0), 2.65, 2.38, 0.09, bank, root, 48)
	bank_mesh.scale.z = 0.76
	var deep := _cylinder(Vector3(0.0, 0.075, 0.0), 2.32, 2.23, 0.07, shadow_water, root, 48)
	deep.scale.z = 0.73
	var surface := _cylinder(Vector3(0.0, 0.125, 0.0), 2.18, 2.12, 0.035, water, root, 48)
	surface.scale.z = 0.7
	if preview:
		return
	_add_cylinder_obstacle(Vector3(0.0, 0.45, 0.0), 2.18, 0.9, root, "Pond boundary")
	# Pebbles, reeds and lily pads create readable scale and an inviting shoreline.
	for index in 15:
		var angle := TAU * float(index) / 15.0 + sin(float(index) * 1.7) * 0.16
		var radius := 2.38 + sin(float(index) * 2.4) * 0.18
		var position := Vector3(cos(angle) * radius, 0.13, sin(angle) * radius * 0.74)
		if _point_near_any_path(root.position + position, 0.86):
			continue
		_sphere(position, Vector3(0.28 + float(index % 3) * 0.06, 0.15, 0.22), stone_materials[(index + seed_value) % stone_materials.size()], root, 8, 5)
	for index in 9:
		var angle := float(index) * 1.91 + float(seed_value) * 0.07
		var radius := 1.85 + float(index % 3) * 0.17
		var base := Vector3(cos(angle) * radius, 0.19, sin(angle) * radius * 0.7)
		if _point_near_any_path(root.position + base, 0.98):
			continue
		_add_reed(base, root, index)
	var lily_material := _material(Color("5f8a58"), 0.86)
	for index in 5:
		var lily_position := Vector3(-0.9 + float(index) * 0.43, 0.17, sin(float(index) * 2.0) * 0.55)
		if _point_near_any_path(root.position + lily_position, 0.8):
			continue
		var lily := _cylinder(lily_position, 0.21 + float(index % 2) * 0.05, 0.21, 0.025, lily_material, root, 12)
		lily.scale.z = 0.72
		if index % 2 == 0:
			_add_flower(Vector3(lily.position.x, 0.28, lily.position.z), Color("f3d3dc"), root, 0.5)
	# Keep the decorative footbridge only when the user has not already drawn a
	# real crossing. This prevents doubled planks and clutter in the pond.
	if not _pond_has_crossing_path(root.position):
		var bridge_angle := -0.18
		for index in 7:
			var plank := _box(Vector3(-1.25 + float(index) * 0.4, 0.28, -0.35 + sin(float(index) * 0.45) * 0.05), Vector3(0.34, 0.1, 0.92), _material(Color("826248"), 0.9), root)
			plank.rotation.y = bridge_angle


func _build_nature(command: Dictionary, parent: Node3D, preview: bool) -> void:
	var root := Node3D.new()
	root.name = "Ghost nature" if preview else "Living landscape"
	root.position = _vec_from_pair(command.get("pos", [0.0, 0.0]))
	parent.add_child(root)
	var seed_value := int(command.get("seed", 1))
	var style := seed_value % 3
	if style == 0:
		_build_small_tree(Vector3.ZERO, 1.15, root, seed_value, preview)
		if not preview:
			_add_flower_cluster(Vector3(0.75, 0.0, 0.25), root, seed_value)
			_add_grass_tuft(Vector3(-0.55, 0.0, 0.4), root, true)
	elif style == 1:
		for index in 7:
			var angle := float(index) * 2.39
			var radius := 0.3 + float(index % 3) * 0.34
			_build_shrub(Vector3(cos(angle) * radius, 0.0, sin(angle) * radius), 0.5 + float(index % 2) * 0.12, root, seed_value + index, preview)
		if not preview:
			for index in 4:
				_add_flower_cluster(Vector3(-0.8 + float(index) * 0.48, 0.02, -0.68 + sin(float(index)) * 0.2), root, seed_value + index)
	else:
		var soil := _material(Color("756045"), 1.0, 0.0, 0.55 if preview else 1.0)
		var bed := _box(Vector3.ZERO + Vector3(0.0, 0.1, 0.0), Vector3(2.3, 0.17, 1.45), soil, root)
		bed.rotation.y = 0.18
		for index in 12:
			var row := index / 4
			var column := index % 4
			var flower_position := Vector3(-0.78 + float(column) * 0.52, 0.18, -0.43 + float(row) * 0.43)
			if preview:
				_sphere(flower_position + Vector3(0.0, 0.2, 0.0), Vector3.ONE * 0.12, _material(Color("bad699"), 0.9, 0.0, 0.55), root, 8, 5)
			else:
				_add_flower(flower_position, [Color("f0d0d5"), Color("e9c66c"), Color("cab8dd"), Color("f2eee1")][(index + seed_value) % 4], root, 0.7 + float(index % 3) * 0.12)


func _build_ambient_life() -> void:
	# Sheep are real moving bodies. Their targets and behavior change over time,
	# while the collision layer keeps them out of every authored structure.
	for index in 2:
		var sheep_root := CharacterBody3D.new()
		sheep_root.name = "Grounded roaming sheep"
		sheep_root.motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
		sheep_root.collision_layer = 2
		sheep_root.collision_mask = 1
		sheep_root.safe_margin = 0.05
		sheep_root.set_meta("phase", float(index) * 2.6)
		sheep_root.set_meta("state", "walking")
		sheep_root.set_meta("state_timer", 7.0 + float(index) * 2.0)
		sheep_root.set_meta("walk_speed", 0.72 + float(index) * 0.08)
		sheep_root.set_meta("stuck_timer", 0.0)
		sheep_root.position = Vector3(-7.2, 0.0, -2.6) if index == 0 else Vector3(6.7, 0.0, 5.2)
		sheep_root.set_meta("target", Vector3(-8.4, 0.0, 4.8) if index == 0 else Vector3(7.8, 0.0, -2.8))
		life_root.add_child(sheep_root)
		var collision := CollisionShape3D.new()
		collision.name = "Sheep body collision"
		collision.position = Vector3(0.0, 0.48, 0.0)
		var capsule := CapsuleShape3D.new()
		capsule.radius = 0.34
		capsule.height = 0.9
		collision.shape = capsule
		sheep_root.add_child(collision)
		_build_sheep_model(sheep_root, index)
		sheep.append(sheep_root)
	# Butterflies are deliberately oversized enough to read at isometric scale.
	for index in 7:
		var butterfly := Node3D.new()
		butterfly.name = "Meadow butterfly"
		butterfly.set_meta("phase", float(index) * 1.73)
		life_root.add_child(butterfly)
		var wing_color: Color = [Color("e8b967"), Color("c88579"), Color("98b7ce")][index % 3]
		var wing_material := _material(wing_color, 0.55)
		var left_wing := _box(Vector3(-0.08, 0.0, 0.0), Vector3(0.14, 0.015, 0.18), wing_material, butterfly)
		left_wing.name = "Left wing"
		var right_wing := _box(Vector3(0.08, 0.0, 0.0), Vector3(0.14, 0.015, 0.18), wing_material, butterfly)
		right_wing.name = "Right wing"
		butterfly.set_meta("left", left_wing)
		butterfly.set_meta("right", right_wing)
		butterflies.append(butterfly)
	# Fireflies only reveal themselves in the night mood.
	for index in 18:
		var fly := Node3D.new()
		fly.name = "Firefly"
		fly.set_meta("phase", float(index) * 1.17)
		life_root.add_child(fly)
		var orb := _sphere(Vector3.ZERO, Vector3.ONE * 0.055, _material(Color("f5df78"), 0.25, 0.0, 1.0, Color("ffd85e"), 2.6), fly, 8, 5)
		orb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		fireflies.append(fly)


func _build_sheep_model(parent: Node3D, index: int) -> void:
	var visual := Node3D.new()
	visual.name = "Articulated sheep model"
	parent.add_child(visual)
	parent.set_meta("visual", visual)
	var wool_color := Color("eee9d7") if index == 0 else Color("d8d2bd")
	var wool_shadow := Color("d5cfbb") if index == 0 else Color("bbb6a5")
	var wool := _material(wool_color, 1.0)
	var wool_deep := _material(wool_shadow, 1.0)
	var face := _material(Color("41453f") if index == 0 else Color("5a5148"), 0.94)
	var hoof := _material(Color("252b29"), 0.86)
	# An elongated ribcage plus overlapping wool puffs gives the animal a real
	# front/back silhouette instead of reading as one floating cotton ball.
	_sphere(Vector3(0.0, 0.58, -0.04), Vector3(0.46, 0.34, 0.58), wool_deep, visual, 14, 8)
	var puff_positions := [
		Vector3(-0.28, 0.68, -0.29), Vector3(0.28, 0.68, -0.29),
		Vector3(-0.3, 0.67, 0.08), Vector3(0.3, 0.67, 0.08),
		Vector3(-0.22, 0.61, 0.34), Vector3(0.22, 0.61, 0.34),
		Vector3(0.0, 0.82, -0.08), Vector3(0.0, 0.74, -0.43),
	]
	for puff_index in puff_positions.size():
		var puff_scale := 0.24 + float(puff_index % 3) * 0.025
		_sphere(puff_positions[puff_index], Vector3(puff_scale, puff_scale * 0.88, puff_scale * 1.08), wool if puff_index % 3 else wool_deep, visual, 10, 6)
	var head := Node3D.new()
	head.name = "Grazing head rig"
	head.position = Vector3(0.0, 0.58, 0.42)
	visual.add_child(head)
	parent.set_meta("head", head)
	_sphere(Vector3(0.0, 0.03, 0.18), Vector3(0.22, 0.25, 0.29), face, head, 12, 7)
	_sphere(Vector3(0.0, -0.08, 0.4), Vector3(0.16, 0.13, 0.18), _material(Color("777066"), 0.92), head, 10, 6)
	# Ears, eyes and nostrils keep the face readable from a moving isometric camera.
	var ears: Array[Node3D] = []
	for side in [-1.0, 1.0]:
		var ear := _sphere(Vector3(side * 0.23, 0.16, 0.12), Vector3(0.14, 0.055, 0.08), face, head, 9, 5)
		ear.rotation.z = side * 0.24
		ears.append(ear)
		_sphere(Vector3(side * 0.105, 0.11, 0.405), Vector3.ONE * 0.035, _material(Color("111614"), 0.38), head, 8, 5)
	for side in [-1.0, 1.0]:
		_sphere(Vector3(side * 0.055, -0.055, 0.565), Vector3.ONE * 0.018, _material(Color("242320"), 0.45), head, 7, 4)
	parent.set_meta("ears", ears)
	var legs: Array[Node3D] = []
	var leg_positions := [Vector3(-0.25, 0.38, 0.29), Vector3(0.25, 0.38, 0.29), Vector3(-0.25, 0.38, -0.31), Vector3(0.25, 0.38, -0.31)]
	for leg_index in leg_positions.size():
		var leg := Node3D.new()
		leg.name = "Walking leg " + str(leg_index + 1)
		leg.position = leg_positions[leg_index]
		visual.add_child(leg)
		_cylinder(Vector3(0.0, -0.17, 0.0), 0.045, 0.055, 0.34, face, leg, 7)
		var lower := _cylinder(Vector3(0.0, -0.37, 0.015), 0.034, 0.042, 0.22, hoof, leg, 7)
		lower.rotation.x = -0.08
		_box(Vector3(0.0, -0.5, 0.055), Vector3(0.11, 0.09, 0.17), hoof, leg)
		legs.append(leg)
	parent.set_meta("legs", legs)
	var tail := Node3D.new()
	tail.name = "Wagging wool tail"
	tail.position = Vector3(0.0, 0.7, -0.59)
	visual.add_child(tail)
	_sphere(Vector3(0.0, 0.0, -0.08), Vector3(0.18, 0.16, 0.2), wool, tail, 9, 5)
	parent.set_meta("tail", tail)


func _update_sheep_physics(delta: float) -> void:
	for index in sheep.size():
		var animal := sheep[index] as CharacterBody3D
		if not animal or not is_instance_valid(animal):
			continue
		var state := str(animal.get_meta("state", "walking"))
		var timer := float(animal.get_meta("state_timer", 0.0)) - delta
		animal.set_meta("state_timer", timer)
		if not _is_sheep_point_clear(animal.position, 0.12):
			_relocate_sheep(animal, index)
			continue
		if state == "walking":
			var target: Vector3 = animal.get_meta("target", Vector3.ZERO)
			var to_target := target - animal.position
			to_target.y = 0.0
			if to_target.length() < 0.55 or timer <= 0.0:
				animal.set_meta("state", "grazing")
				animal.set_meta("state_timer", 3.4 + randf() * 3.8)
				animal.velocity = Vector3.ZERO
				continue
			var desired := to_target.normalized()
			# A small flock-separation force prevents visual overlap without making
			# the sheep collide and jitter against one another.
			for other_node in sheep:
				if other_node == animal:
					continue
				var separation := animal.position - other_node.position
				separation.y = 0.0
				if separation.length() < 1.25 and separation.length() > 0.01:
					desired = (desired + separation.normalized() * 0.8).normalized()
			var speed := float(animal.get_meta("walk_speed", 0.75))
			animal.velocity = animal.velocity.lerp(desired * speed, clampf(delta * 3.4, 0.0, 1.0))
			var before := animal.position
			animal.move_and_slide()
			animal.position.y = 0.0
			var desired_yaw := atan2(desired.x, desired.z)
			animal.rotation.y = lerp_angle(animal.rotation.y, desired_yaw, clampf(delta * 4.2, 0.0, 1.0))
			var moved := Vector2(before.x, before.z).distance_to(Vector2(animal.position.x, animal.position.z))
			var stuck_timer := float(animal.get_meta("stuck_timer", 0.0))
			if animal.get_slide_collision_count() > 0 or moved < speed * delta * 0.16:
				stuck_timer += delta
			else:
				stuck_timer = maxf(0.0, stuck_timer - delta * 2.0)
			animal.set_meta("stuck_timer", stuck_timer)
			if stuck_timer > 0.55:
				_choose_sheep_target(animal, index)
		else:
			animal.velocity = Vector3.ZERO
			if timer <= 0.0:
				_choose_sheep_target(animal, index)


func _choose_sheep_target(animal: CharacterBody3D, index: int) -> void:
	for attempt in 28:
		var angle := randf() * TAU
		var radius := 3.8 + randf() * 8.0
		var candidate := Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)
		if not _is_sheep_point_clear(candidate, 0.45):
			continue
		var too_close := false
		for other in sheep:
			if other != animal and other.position.distance_to(candidate) < 1.7:
				too_close = true
		if too_close:
			continue
		animal.set_meta("target", candidate)
		animal.set_meta("state", "walking")
		animal.set_meta("state_timer", 12.0 + randf() * 8.0)
		animal.set_meta("stuck_timer", 0.0)
		return
	# Deterministic fallback if a densely built glade has very little meadow left.
	var fallback_angle := float(index) * PI + 0.7
	var fallback := Vector3(cos(fallback_angle) * 10.5, 0.0, sin(fallback_angle) * 10.5)
	if _is_sheep_point_clear(fallback, 0.2):
		animal.set_meta("target", fallback)
		animal.set_meta("state", "walking")
		animal.set_meta("state_timer", 10.0)


func _is_sheep_point_clear(point: Vector3, clearance: float = 0.35) -> bool:
	if Vector2(point.x, point.z).length() > DRAW_LIMIT - 0.45:
		return false
	for command in commands:
		var type := str(command.get("type", ""))
		var position := _vec_from_pair(command.get("pos", [0.0, 0.0]))
		if type == "cottage":
			var size_data: Array = command.get("size", [4.4, 3.4])
			if absf(point.x - position.x) < float(size_data[0]) * 0.5 + clearance + 0.35 and absf(point.z - position.z) < float(size_data[1]) * 0.5 + clearance + 0.35:
				return false
		elif type == "tower":
			if Vector2(point.x, point.z).distance_to(Vector2(position.x, position.z)) < 2.05 + clearance:
				return false
		elif type == "pond":
			var pond_delta := Vector2((point.x - position.x) / (2.7 + clearance), (point.z - position.z) / (2.05 + clearance))
			if pond_delta.length() < 1.0:
				return false
		elif type == "nature":
			if Vector2(point.x, point.z).distance_to(Vector2(position.x, position.z)) < 0.8 + clearance:
				return false
		elif type == "wall":
			var a := _vec_from_pair(command.get("a", [0.0, 0.0]))
			var b := _vec_from_pair(command.get("b", [0.0, 0.0]))
			var flat_point := Vector2(point.x, point.z)
			var flat_a := Vector2(a.x, a.z)
			var flat_b := Vector2(b.x, b.z)
			if _distance_to_segment_2d(flat_point, flat_a, flat_b) < 0.44 + clearance:
				var wall_length := flat_a.distance_to(flat_b)
				var along := clampf((flat_point - flat_a).dot((flat_b - flat_a).normalized()), 0.0, wall_length)
				var in_gateway := false
				for gate_distance in _wall_gate_positions(a, b):
					if absf(along - float(gate_distance)) < 0.78 - clearance * 0.2:
						in_gateway = true
				if not in_gateway:
					return false
	return true


func _relocate_sheep(animal: CharacterBody3D, index: int) -> void:
	for attempt in 32:
		var angle := float(attempt) * 2.399 + float(index) * 1.1
		var radius := 5.0 + fmod(float(attempt * 17), 65.0) / 65.0 * 6.5
		var candidate := Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)
		if _is_sheep_point_clear(candidate, 0.55):
			animal.position = candidate
			animal.velocity = Vector3.ZERO
			_choose_sheep_target(animal, index)
			return


func _relocate_sheep_if_blocked() -> void:
	for index in sheep.size():
		var animal := sheep[index] as CharacterBody3D
		if animal and not _is_sheep_point_clear(animal.position, 0.12):
			_relocate_sheep(animal, index)


func _animate_sheep_model(animal: CharacterBody3D, elapsed: float, index: int) -> void:
	var visual := animal.get_meta("visual") as Node3D
	var head := animal.get_meta("head") as Node3D
	var tail := animal.get_meta("tail") as Node3D
	var legs: Array = animal.get_meta("legs", [])
	var ears: Array = animal.get_meta("ears", [])
	if not visual or not head:
		return
	var phase := float(animal.get_meta("phase", 0.0))
	var state := str(animal.get_meta("state", "walking"))
	if state == "walking":
		var gait := elapsed * 6.2 + phase
		visual.position.y = absf(sin(gait * 2.0)) * 0.018
		head.rotation.x = lerpf(head.rotation.x, -0.08, 0.12)
		for leg_index in legs.size():
			var leg := legs[leg_index] as Node3D
			var opposing_phase := 0.0 if leg_index in [0, 3] else PI
			leg.rotation.x = sin(gait + opposing_phase) * 0.48
		if tail:
			tail.rotation.x = sin(gait * 0.7) * 0.22
	else:
		visual.position.y = sin(elapsed * 1.6 + phase) * 0.008
		head.rotation.x = lerpf(head.rotation.x, 0.88, 0.055)
		for leg in legs:
			(leg as Node3D).rotation.x = lerpf((leg as Node3D).rotation.x, 0.0, 0.12)
		if tail:
			tail.rotation.x = sin(elapsed * 2.1 + phase) * 0.1
	for ear_index in ears.size():
		var ear := ears[ear_index] as Node3D
		var side := -1.0 if ear_index == 0 else 1.0
		ear.rotation.z = side * (0.24 + sin(elapsed * 2.8 + phase + float(ear_index)) * 0.055)


func _animate_life(delta: float) -> void:
	var elapsed := Time.get_ticks_msec() * 0.001
	for index in sheep.size():
		var animal := sheep[index] as CharacterBody3D
		if animal:
			_animate_sheep_model(animal, elapsed, index)
	for index in butterflies.size():
		var butterfly := butterflies[index]
		var phase := float(butterfly.get_meta("phase", 0.0))
		var angle := elapsed * (0.2 + float(index % 3) * 0.035) + phase
		var radius := 3.8 + float(index % 4) * 1.7
		butterfly.position = Vector3(cos(angle) * radius, 1.15 + sin(elapsed * 1.7 + phase) * 0.45, sin(angle * 1.12) * radius * 0.73)
		butterfly.rotation.y = -angle
		var flap := sin(elapsed * 9.0 + phase) * 0.72
		var left := butterfly.get_meta("left") as Node3D
		var right := butterfly.get_meta("right") as Node3D
		if left and right:
			left.rotation.z = flap
			right.rotation.z = -flap
	for index in fireflies.size():
		var fly := fireflies[index]
		var phase := float(fly.get_meta("phase", 0.0))
		var radius := 3.0 + float(index % 6) * 1.55
		var angle := elapsed * 0.12 + phase
		fly.position = Vector3(cos(angle) * radius, 0.65 + float(index % 4) * 0.43 + sin(elapsed * 1.4 + phase) * 0.28, sin(angle * 1.19) * radius * 0.76)
		fly.scale = Vector3.ONE * (0.75 + sin(elapsed * 2.6 + phase) * 0.22)


func _animate_environment(delta: float) -> void:
	var elapsed := Time.get_ticks_msec() * 0.001
	for index in wind_trees.size():
		var tree := wind_trees[index]
		if not is_instance_valid(tree):
			continue
		tree.rotation.z = sin(elapsed * 0.72 + float(index) * 1.71) * 0.016
		tree.rotation.x = cos(elapsed * 0.58 + float(index) * 1.13) * 0.009
	for index in drifting_clouds.size():
		var cloud := drifting_clouds[index]
		if not is_instance_valid(cloud):
			continue
		cloud.position.x += float(cloud.get_meta("speed", 0.25)) * delta
		if cloud.position.x > 27.0:
			cloud.position.x = -27.0
		cloud.position.z = float(cloud.get_meta("origin_z", 0.0)) + sin(elapsed * 0.08 + float(index)) * 1.2


func _build_border_tree(position: Vector3, tree_scale: float, parent: Node3D, seed_value: int) -> void:
	var root := Node3D.new()
	root.position = position
	root.rotation.y = float(seed_value) * 0.73
	parent.add_child(root)
	wind_trees.append(root)
	var trunk := _material(Color("64523b"), 0.96)
	_cylinder(Vector3(0.0, 1.15 * tree_scale, 0.0), 0.2 * tree_scale, 0.3 * tree_scale, 2.3 * tree_scale, trunk, root, 9)
	var greens := [Color("4f784d"), Color("5f8955"), Color("739760"), Color("466d49")]
	for index in 5:
		var angle := float(index) * 2.4
		var offset := Vector3(cos(angle) * 0.52, 2.45 + sin(float(index) * 1.7) * 0.28, sin(angle) * 0.42) * tree_scale
		var crown_scale := Vector3(0.82, 0.67, 0.78) * tree_scale * (0.9 + float(index % 3) * 0.12)
		_sphere(offset, crown_scale, _material(greens[(index + seed_value) % greens.size()], 0.96), root, 10, 6)


func _build_small_tree(position: Vector3, tree_scale: float, parent: Node3D, seed_value: int, preview: bool = false) -> void:
	var root := Node3D.new()
	root.position = position
	root.rotation.y = float(seed_value) * 0.41
	parent.add_child(root)
	var alpha := 0.5 if preview else 1.0
	var trunk_material := _material(Color("6f533a").lightened(0.1) if preview else Color("6f533a"), 0.94, 0.0, alpha)
	_cylinder(Vector3(0.0, 0.9 * tree_scale, 0.0), 0.16 * tree_scale, 0.24 * tree_scale, 1.8 * tree_scale, trunk_material, root, 9)
	for branch_index in 3:
		var branch := _cylinder(Vector3(0.0, (1.32 + float(branch_index) * 0.18) * tree_scale, 0.0), 0.055 * tree_scale, 0.08 * tree_scale, 0.9 * tree_scale, trunk_material, root, 7)
		branch.rotation.z = 0.72
		branch.rotation.y = float(branch_index) * 2.1
	var greens := [Color("668b57"), Color("7c9f61"), Color("577c52"), Color("8aa56b")]
	for index in 5:
		var angle := float(index) * 2.399
		var offset := Vector3(cos(angle) * 0.48, 1.95 + sin(float(index) * 1.8) * 0.2, sin(angle) * 0.42) * tree_scale
		var crown_scale := Vector3(0.72, 0.58, 0.68) * tree_scale * (0.9 + float(index % 3) * 0.1)
		var color: Color = greens[(index + seed_value) % greens.size()]
		_sphere(offset, crown_scale, _material(color.lightened(0.1) if preview else color, 0.98, 0.0, alpha), root, 10, 6)


func _build_shrub(position: Vector3, shrub_scale: float, parent: Node3D, seed_value: int, preview: bool = false) -> void:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	var colors := [Color("52744b"), Color("63865a"), Color("789663"), Color("476d4a")]
	var alpha := 0.5 if preview else 1.0
	for index in 4:
		var angle := float(index) * 2.36
		var color: Color = colors[(seed_value + index) % colors.size()]
		_sphere(Vector3(cos(angle) * 0.24, 0.25 + float(index % 2) * 0.11, sin(angle) * 0.22) * shrub_scale, Vector3(0.48, 0.36, 0.42) * shrub_scale, _material(color.lightened(0.1) if preview else color, 0.98, 0.0, alpha), root, 9, 5)


func _add_grass_tuft(position: Vector3, parent: Node3D, light: bool = false) -> void:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	var grass_material := _material(Color("8da86b") if light else Color("58794e"), 1.0)
	for index in 2:
		var blade := _box(Vector3((float(index) - 1.0) * 0.045, 0.18 + float(index % 2) * 0.05, 0.0), Vector3(0.035, 0.36 + float(index % 2) * 0.1, 0.025), grass_material, root)
		blade.rotation.z = -0.18 if index == 0 else 0.22
		blade.rotation.y = float(index) * 1.2


func _add_flower_cluster(position: Vector3, parent: Node3D, seed_value: int) -> void:
	var colors := [Color("f0d2d8"), Color("e6c267"), Color("c8b7dc"), Color("ecede4"), Color("9ebbd4")]
	for index in 2:
		var angle := float(index) * 2.2 + float(seed_value) * 0.17
		var offset := Vector3(cos(angle) * 0.18, 0.0, sin(angle) * 0.16)
		_add_flower(position + offset, colors[(seed_value + index) % colors.size()], parent, 0.55 + float(index) * 0.08)


func _add_flower(position: Vector3, color: Color, parent: Node3D, flower_scale: float) -> void:
	var stem := _material(Color("4f7748"), 0.95)
	_cylinder(position + Vector3(0.0, 0.16 * flower_scale, 0.0), 0.018 * flower_scale, 0.024 * flower_scale, 0.32 * flower_scale, stem, parent, 6)
	var petal_material := _material(color, 0.82)
	_sphere(position + Vector3(0.0, 0.34 * flower_scale, 0.0), Vector3(0.13, 0.055, 0.13) * flower_scale, petal_material, parent, 8, 4)
	_sphere(position + Vector3(0.0, 0.35 * flower_scale, 0.0), Vector3.ONE * 0.035 * flower_scale, _material(Color("e2b34e"), 0.7), parent, 7, 4)


func _add_reed(position: Vector3, parent: Node3D, seed_value: int) -> void:
	var stem := _material(Color("59764d"), 0.96)
	var head := _material(Color("735d42"), 0.94)
	for index in 3:
		var offset := Vector3((float(index) - 1.0) * 0.08, 0.0, sin(float(index + seed_value)) * 0.05)
		var height := 0.55 + float((index + seed_value) % 3) * 0.14
		_cylinder(position + offset + Vector3(0.0, height * 0.5, 0.0), 0.014, 0.018, height, stem, parent, 6)
		_cylinder(position + offset + Vector3(0.0, height + 0.07, 0.0), 0.035, 0.045, 0.18, head, parent, 7)


func _add_box_obstacle(position: Vector3, size: Vector3, yaw: float, parent: Node3D, label: String) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = label
	body.position = position
	body.rotation.y = yaw
	body.collision_layer = 1
	body.collision_mask = 2
	parent.add_child(body)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	return body


func _add_cylinder_obstacle(position: Vector3, radius: float, height: float, parent: Node3D, label: String) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = label
	body.position = position
	body.collision_layer = 1
	body.collision_mask = 2
	parent.add_child(body)
	var collision := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	collision.shape = shape
	body.add_child(collision)
	return body


func _add_wall_collision_runs(a: Vector3, b: Vector3, gate_positions: Array[float], yaw: float, parent: Node3D) -> void:
	var length := a.distance_to(b)
	var direction := (b - a).normalized()
	var sorted_gates: Array = gate_positions.duplicate()
	sorted_gates.sort()
	var run_start := 0.0
	for gate_value in sorted_gates:
		var gate_distance := clampf(float(gate_value), 0.0, length)
		var run_end := maxf(run_start, gate_distance - 0.84)
		if run_end - run_start > 0.12:
			_add_wall_collision_run(a, direction, run_start, run_end, yaw, parent)
		run_start = minf(length, gate_distance + 0.84)
	if length - run_start > 0.12:
		_add_wall_collision_run(a, direction, run_start, length, yaw, parent)


func _add_wall_collision_run(a: Vector3, direction: Vector3, run_start: float, run_end: float, yaw: float, parent: Node3D) -> void:
	var run_length := run_end - run_start
	var midpoint := a + direction * ((run_start + run_end) * 0.5) + Vector3(0.0, 1.08, 0.0)
	_add_box_obstacle(midpoint, Vector3(run_length, 2.16, 0.62), yaw, parent, "Wall collision")


func _box(position: Vector3, size: Vector3, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = material
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(mesh_instance)
	return mesh_instance


func _cylinder(position: Vector3, top_radius: float, bottom_radius: float, height: float, material: Material, parent: Node, segments: int = 16, rotation: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top_radius
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh.radial_segments = segments
	mesh.rings = 1
	mesh.material = material
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.rotation = rotation
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(mesh_instance)
	return mesh_instance


func _sphere(position: Vector3, scale_value: Vector3, material: Material, parent: Node, radial_segments: int = 12, rings: int = 7) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	mesh.radial_segments = radial_segments
	mesh.rings = rings
	mesh.material = material
	mesh_instance.mesh = mesh
	mesh_instance.position = position
	mesh_instance.scale = scale_value * 2.0
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(mesh_instance)
	return mesh_instance


func _triangle_gable(position: Vector3, width: float, height: float, depth: float, material: Material, parent: Node3D, reverse: bool) -> MeshInstance3D:
	var half_width := width * 0.5
	var half_depth := depth * 0.5
	var vertices := PackedVector3Array([
		Vector3(-half_width, 0.0, -half_depth), Vector3(half_width, 0.0, -half_depth), Vector3(0.0, height, -half_depth),
		Vector3(-half_width, 0.0, half_depth), Vector3(0.0, height, half_depth), Vector3(half_width, 0.0, half_depth),
		Vector3(-half_width, 0.0, -half_depth), Vector3(0.0, height, -half_depth), Vector3(0.0, height, half_depth),
		Vector3(-half_width, 0.0, -half_depth), Vector3(0.0, height, half_depth), Vector3(-half_width, 0.0, half_depth),
		Vector3(half_width, 0.0, -half_depth), Vector3(half_width, 0.0, half_depth), Vector3(0.0, height, half_depth),
		Vector3(half_width, 0.0, -half_depth), Vector3(0.0, height, half_depth), Vector3(0.0, height, -half_depth),
		Vector3(-half_width, 0.0, -half_depth), Vector3(-half_width, 0.0, half_depth), Vector3(half_width, 0.0, half_depth),
		Vector3(-half_width, 0.0, -half_depth), Vector3(half_width, 0.0, half_depth), Vector3(half_width, 0.0, -half_depth),
	])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, material)
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = position
	if reverse:
		instance.rotation.y = PI
	parent.add_child(instance)
	return instance


func _material(color: Color, roughness: float = 0.9, metallic: float = 0.0, alpha: float = 1.0, emission: Color = Color.BLACK, emission_energy: float = 0.0) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	var resolved := color
	resolved.a = alpha
	material.albedo_color = resolved
	material.roughness = roughness
	material.metallic = metallic
	if alpha < 0.999:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	if emission_energy > 0.0:
		material.emission_enabled = true
		material.emission = emission
		material.emission_energy_multiplier = emission_energy
	return material


func _vec_from_pair(value: Variant) -> Vector3:
	if value is Array and value.size() >= 2:
		return Vector3(float(value[0]), 0.0, float(value[1]))
	return Vector3.ZERO


func _segment_intersection(a: Vector2, b: Vector2, c: Vector2, d: Vector2) -> Dictionary:
	var r := b - a
	var s := d - c
	var denominator := r.cross(s)
	if absf(denominator) < 0.0001:
		return {"hit": false}
	var t := (c - a).cross(s) / denominator
	var u := (c - a).cross(r) / denominator
	return {"hit": t >= 0.0 and t <= 1.0 and u >= 0.0 and u <= 1.0, "t": t, "u": u, "point": a + r * t}


func _distance_to_segment_2d(point: Vector2, a: Vector2, b: Vector2) -> float:
	var segment := b - a
	var length_squared := segment.length_squared()
	if length_squared <= 0.0001:
		return point.distance_to(a)
	var t := clampf((point - a).dot(segment) / length_squared, 0.0, 1.0)
	return point.distance_to(a + segment * t)


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.free()
