extends Node3D

const GRID_SIZE := 20
const TILE_SIZE := 1.0
const PAN_SPEED := 0.018
const BUILD_TOOL_ROAD := "road"
const BUILD_TOOL_HOUSE := "house"
const BUILD_TOOL_POLICE := "police"
const BUILD_TOOL_FIRE := "fire"
const BUILD_TOOL_BANK := "bank"
const BUILD_TOOL_GROCERY := "grocery"
const BUILD_TOOL_RESTAURANT := "restaurant"
const BUILD_TOOL_CORNER_STORE := "corner_store"
const BUILD_TOOL_SEQUENCE := [
	BUILD_TOOL_ROAD,
	BUILD_TOOL_HOUSE,
	BUILD_TOOL_POLICE,
	BUILD_TOOL_FIRE,
	BUILD_TOOL_BANK,
	BUILD_TOOL_GROCERY,
	BUILD_TOOL_RESTAURANT,
	BUILD_TOOL_CORNER_STORE,
]
const BUILD_TOOL_LABELS := {
	BUILD_TOOL_ROAD: "Road",
	BUILD_TOOL_HOUSE: "House",
	BUILD_TOOL_POLICE: "Police",
	BUILD_TOOL_FIRE: "Fire",
	BUILD_TOOL_BANK: "Bank",
	BUILD_TOOL_GROCERY: "Grocery",
	BUILD_TOOL_RESTAURANT: "Restaurant",
	BUILD_TOOL_CORNER_STORE: "Corner Store",
}

@onready var grid_root: Node3D = $GridRoot
@onready var building_root: Node3D = $BuildingRoot
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D

var _focus := Vector3(0.0, 0.0, 0.0)
var _target_focus := Vector3(0.0, 0.0, 0.0)
var _zoom := 16.0
var _target_zoom := 16.0
var _dragging := false
var _build_tool := BUILD_TOOL_ROAD
var _hovered_cell := Vector2i(-1, -1)
var _hover_active := false
var _hover_can_build := false
var _occupied_cells: Dictionary = {}
var _reserved_cells: Dictionary = {}
var _placed_nodes: Dictionary = {}

var _ground_material_a: StandardMaterial3D
var _ground_material_b: StandardMaterial3D
var _ground_material_c: StandardMaterial3D
var _soil_material: StandardMaterial3D
var _stone_material: StandardMaterial3D
var _water_material: StandardMaterial3D
var _road_material: StandardMaterial3D
var _road_mark_material: StandardMaterial3D
var _sidewalk_material: StandardMaterial3D
var _window_material: StandardMaterial3D
var _leaf_material: StandardMaterial3D
var _trunk_material: StandardMaterial3D
var _flower_material_pink: StandardMaterial3D
var _flower_material_blue: StandardMaterial3D
var _meadow_material: StandardMaterial3D
var _grass_blade_material: StandardMaterial3D
var _hover_material_valid: StandardMaterial3D
var _hover_material_invalid: StandardMaterial3D
var _ghost_base_material: StandardMaterial3D
var _ghost_accent_material: StandardMaterial3D

var _clouds: Array[Node3D] = []
var _window_bands: Array[MeshInstance3D] = []
var _grass_clumps: Array[Node3D] = []
var _hover_indicator: MeshInstance3D
var _ghost_root: Node3D
var _ghost_nodes: Dictionary = {}
var _hud_layer: CanvasLayer
var _hud_panel: Control
var _tool_status_label: Label
var _hint_label: Label
var _tool_buttons: Dictionary = {}
var _fullscreen_button: Button
var _place_button: Button
var _zoom_in_button: Button
var _zoom_out_button: Button


func _ready() -> void:
	_build_materials()
	_build_world()
	_register_reserved_cells()
	_create_runtime_helpers()
	_build_hud()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	_update_camera(true)


func _process(delta: float) -> void:
	_focus = _focus.lerp(_target_focus, min(1.0, delta * 7.0))
	_zoom = lerp(_zoom, _target_zoom, min(1.0, delta * 6.5))
	_animate_clouds(delta)
	_animate_windows()
	_animate_grass()
	_update_keyboard_camera(delta)
	_update_hover_from_mouse()
	_update_camera()


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				_set_build_tool(BUILD_TOOL_ROAD)
			KEY_2:
				_set_build_tool(BUILD_TOOL_HOUSE)
			KEY_3:
				_set_build_tool(BUILD_TOOL_POLICE)
			KEY_4:
				_set_build_tool(BUILD_TOOL_FIRE)
			KEY_5:
				_set_build_tool(BUILD_TOOL_BANK)
			KEY_6:
				_set_build_tool(BUILD_TOOL_GROCERY)
			KEY_7:
				_set_build_tool(BUILD_TOOL_RESTAURANT)
			KEY_8:
				_set_build_tool(BUILD_TOOL_CORNER_STORE)
			KEY_SPACE, KEY_ENTER:
				_try_place_hovered_tile()
			KEY_F:
				_toggle_fullscreen()
			KEY_ESCAPE:
				_exit_fullscreen()
				_clear_hover()
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_MIDDLE or event.button_index == MOUSE_BUTTON_RIGHT:
			_dragging = event.pressed
		elif event.button_index == MOUSE_BUTTON_LEFT and event.pressed and not _is_pointer_over_hud():
			_try_place_hovered_tile()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_target_zoom = max(8.5, _target_zoom - 1.15)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_target_zoom = min(24.0, _target_zoom + 1.15)
	elif event is InputEventMouseMotion and _dragging:
		_target_focus.x -= event.relative.x * PAN_SPEED
		_target_focus.z -= event.relative.y * PAN_SPEED
		_target_focus.x = clamp(_target_focus.x, -8.5, 8.5)
		_target_focus.z = clamp(_target_focus.z, -8.5, 8.5)


func _build_materials() -> void:
	_ground_material_a = _make_material("9eaa71", 0.98)
	_ground_material_b = _make_material("8f9d64", 0.98)
	_ground_material_c = _make_material("c0b97a", 0.98)
	_soil_material = _make_material("65492f", 0.99)
	_stone_material = _make_material("ccbda6", 0.92)
	_water_material = _make_material("4a8c96", 0.24, 0.0, true, "8fc6cb", 0.03)
	_road_material = _make_material("5c5a61", 0.96)
	_road_mark_material = _make_material("f0ece2", 0.58)
	_sidewalk_material = _make_material("d8ccb8", 0.9)
	_window_material = _make_material("f7d9a3", 0.28, 0.0, true, "ffcd7a", 0.16)
	_leaf_material = _make_material("739256", 0.97)
	_trunk_material = _make_material("6b4933", 0.92)
	_flower_material_pink = _make_material("d791ad", 0.78)
	_flower_material_blue = _make_material("8aaede", 0.78)
	_meadow_material = _make_material("b8b66d", 0.98)
	_grass_blade_material = _make_material("8aa456", 0.94)
	_hover_material_valid = _make_transparent_material(Color("76e5c7"), 0.24, 0.34)
	_hover_material_invalid = _make_transparent_material(Color("f29a8d"), 0.24, 0.34)
	_ghost_base_material = _make_transparent_material(Color("f7f0d8"), 0.44, 0.52)
	_ghost_accent_material = _make_transparent_material(Color("78d7c8"), 0.32, 0.5)


func _build_world() -> void:
	_build_water_ring()
	_build_island_base()
	_build_ground_tiles()
	_build_meadow()
	_build_town_center()
	_build_clouds()


func _register_reserved_cells() -> void:
	for z in range(3, 17):
		for x in range(3, 17):
			_reserved_cells[_cell_key(Vector2i(x, z))] = true


func _create_runtime_helpers() -> void:
	_hover_indicator = MeshInstance3D.new()
	var hover_mesh := BoxMesh.new()
	hover_mesh.size = Vector3(0.92, 0.06, 0.92)
	_hover_indicator.mesh = hover_mesh
	_hover_indicator.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_hover_indicator.visible = false
	grid_root.add_child(_hover_indicator)

	_ghost_root = Node3D.new()
	_ghost_root.visible = false
	add_child(_ghost_root)

	for tool in BUILD_TOOL_SEQUENCE:
		var ghost := _spawn_tool_preview(tool)
		_ghost_nodes[tool] = ghost
		_ghost_root.add_child(ghost)


func _build_hud() -> void:
	_hud_layer = CanvasLayer.new()
	add_child(_hud_layer)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_TOP_LEFT)
	margin.offset_left = 18
	margin.offset_top = 18
	margin.offset_right = 560
	margin.offset_bottom = 320
	_hud_layer.add_child(margin)

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.05, 0.09, 0.12, 0.9), Color(0.31, 0.45, 0.49, 0.45)))
	margin.add_child(panel)
	_hud_panel = panel

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 8)
	panel.add_child(stack)

	var title := Label.new()
	title.text = "Cozy Builder Prototype"
	title.add_theme_color_override("font_color", Color("f7f2e6"))
	title.add_theme_font_size_override("font_size", 18)
	stack.add_child(title)

	_tool_status_label = Label.new()
	_tool_status_label.add_theme_color_override("font_color", Color("d3ebe4"))
	_tool_status_label.add_theme_font_size_override("font_size", 13)
	stack.add_child(_tool_status_label)

	var civic_row := HBoxContainer.new()
	civic_row.add_theme_constant_override("separation", 8)
	stack.add_child(civic_row)

	_add_tool_button(civic_row, BUILD_TOOL_ROAD, "1 Road", 94)
	_add_tool_button(civic_row, BUILD_TOOL_HOUSE, "2 House", 94)
	_add_tool_button(civic_row, BUILD_TOOL_BANK, "5 Bank", 94)
	_add_tool_button(civic_row, BUILD_TOOL_GROCERY, "6 Grocery", 104)

	_fullscreen_button = Button.new()
	_fullscreen_button.text = "Exit Fullscreen"
	_fullscreen_button.custom_minimum_size = Vector2(140, 0)
	_fullscreen_button.pressed.connect(_exit_fullscreen)
	civic_row.add_child(_fullscreen_button)

	var service_row := HBoxContainer.new()
	service_row.add_theme_constant_override("separation", 8)
	stack.add_child(service_row)

	_add_tool_button(service_row, BUILD_TOOL_RESTAURANT, "7 Restaurant", 116)
	_add_tool_button(service_row, BUILD_TOOL_CORNER_STORE, "8 Corner", 96)
	_add_tool_button(service_row, BUILD_TOOL_POLICE, "3 Police", 96)
	_add_tool_button(service_row, BUILD_TOOL_FIRE, "4 Fire", 92)

	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", 8)
	stack.add_child(action_row)

	_place_button = Button.new()
	_place_button.text = "Place Here"
	_place_button.custom_minimum_size = Vector2(128, 0)
	_place_button.pressed.connect(_try_place_hovered_tile)
	action_row.add_child(_place_button)

	_zoom_in_button = Button.new()
	_zoom_in_button.text = "Zoom +"
	_zoom_in_button.custom_minimum_size = Vector2(96, 0)
	_zoom_in_button.pressed.connect(_adjust_zoom.bind(-1.6))
	action_row.add_child(_zoom_in_button)

	_zoom_out_button = Button.new()
	_zoom_out_button.text = "Zoom -"
	_zoom_out_button.custom_minimum_size = Vector2(96, 0)
	_zoom_out_button.pressed.connect(_adjust_zoom.bind(1.6))
	action_row.add_child(_zoom_out_button)

	_hint_label = Label.new()
	_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint_label.custom_minimum_size = Vector2(460, 0)
	_hint_label.add_theme_color_override("font_color", Color("a9bec5"))
	_hint_label.add_theme_font_size_override("font_size", 12)
	_hint_label.text = "Use the build buttons or keys 1-8, then click or press Space to place. Right drag pans. WASD or arrows move the camera."
	stack.add_child(_hint_label)


func _refresh_tool_ui() -> void:
	if _tool_status_label:
		var tool_name := _tool_name(_build_tool)
		_tool_status_label.text = "Tool: %s  |  Build on the open pasture around town." % [tool_name]
	for tool in _tool_buttons.keys():
		_style_tool_button(_tool_buttons[tool], _build_tool == tool)
	if _fullscreen_button:
		_style_tool_button(_fullscreen_button, false)
	if _place_button:
		_style_tool_button(_place_button, true)
	if _zoom_in_button:
		_style_tool_button(_zoom_in_button, false)
	if _zoom_out_button:
		_style_tool_button(_zoom_out_button, false)
	if _ghost_root:
		for tool in _ghost_nodes.keys():
			_ghost_nodes[tool].visible = _build_tool == tool


func _style_tool_button(button: Button, selected: bool) -> void:
	button.add_theme_color_override("font_color", Color("f7f2e6"))
	button.add_theme_color_override("font_hover_color", Color("ffffff"))
	button.add_theme_color_override("font_pressed_color", Color("ffffff"))
	var base_color := Color("16303b") if not selected else Color("2b7f74")
	var border_color := Color("355a63") if not selected else Color("79dfcb")
	button.add_theme_stylebox_override("normal", _make_panel_style(base_color, border_color))
	button.add_theme_stylebox_override("hover", _make_panel_style(base_color.lightened(0.08), border_color.lightened(0.08)))
	button.add_theme_stylebox_override("pressed", _make_panel_style(base_color.darkened(0.08), border_color))
	button.add_theme_stylebox_override("focus", _make_panel_style(base_color, border_color.lightened(0.12)))


func _set_build_tool(tool: String) -> void:
	_build_tool = tool
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _update_hover_from_mouse() -> void:
	if not is_instance_valid(camera):
		return
	var pick := _pick_grid_cell(get_viewport().get_mouse_position())
	if pick.is_empty():
		_clear_hover()
		return

	var cell: Vector2i = pick["cell"]
	var world := _cell_to_world(cell)
	var cell_key := _cell_key(cell)
	var is_reserved := _reserved_cells.has(cell_key)
	var is_occupied := _occupied_cells.has(cell_key)
	var valid := not is_reserved and not is_occupied

	_hovered_cell = cell
	_hover_active = true
	_hover_can_build = valid
	_hover_indicator.visible = true
	_hover_indicator.position = world + Vector3(0.0, 0.06, 0.0)
	_hover_indicator.material_override = _hover_material_valid if valid else _hover_material_invalid
	_ghost_root.visible = true
	_ghost_root.position = world
	for tool in _ghost_nodes.keys():
		_ghost_nodes[tool].visible = _build_tool == tool

	if _hint_label:
		if valid:
			_hint_label.text = "Cell %d, %d is open. Left click to place a %s." % [cell.x + 1, cell.y + 1, _tool_name(_build_tool).to_lower()]
		elif is_reserved:
			_hint_label.text = "This center area is part of the starter town. Build out into the surrounding pasture."
		else:
			_hint_label.text = "That tile is already occupied. Pick an open spot nearby."


func _clear_hover() -> void:
	_hover_active = false
	_hover_can_build = false
	_hover_indicator.visible = false
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Use the build buttons or keys 1-8, then click or press Space to place. Right drag pans. WASD or arrows move the camera."


func _pick_grid_cell(mouse_position: Vector2) -> Dictionary:
	var ground_plane := Plane(Vector3.UP, 0.0)
	var ray_origin := camera.project_ray_origin(mouse_position)
	var ray_direction := camera.project_ray_normal(mouse_position)
	var hit: Variant = ground_plane.intersects_ray(ray_origin, ray_direction)
	if hit == null:
		return {}

	var world_hit := hit as Vector3
	var grid_half := float(GRID_SIZE) * 0.5
	var cell_x := int(floor(world_hit.x + grid_half))
	var cell_z := int(floor(world_hit.z + grid_half))
	if cell_x < 0 or cell_x >= GRID_SIZE or cell_z < 0 or cell_z >= GRID_SIZE:
		return {}

	return {
		"cell": Vector2i(cell_x, cell_z),
		"world": world_hit,
	}


func _cell_to_world(cell: Vector2i) -> Vector3:
	var grid_half := float(GRID_SIZE) * 0.5
	return Vector3(float(cell.x) - grid_half + 0.5, 0.0, float(cell.y) - grid_half + 0.5)


func _cell_key(cell: Vector2i) -> String:
	return "%d:%d" % [cell.x, cell.y]


func _try_place_hovered_tile() -> void:
	if not _hover_active or not _hover_can_build:
		return

	var world := _cell_to_world(_hovered_cell)
	var key := _cell_key(_hovered_cell)
	var placed: Node3D
	if _build_tool == BUILD_TOOL_ROAD:
		placed = _spawn_road_tile(world, false)
		grid_root.add_child(placed)
	else:
		placed = _spawn_building_for_tool(_build_tool, world)

	_occupied_cells[key] = _build_tool
	_placed_nodes[key] = placed
	_update_hover_from_mouse()


func _tool_name(tool: String) -> String:
	return BUILD_TOOL_LABELS.get(tool, "Building")


func _add_tool_button(container: HBoxContainer, tool: String, label: String, width: float) -> void:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(width, 0)
	button.pressed.connect(_set_build_tool.bind(tool))
	container.add_child(button)
	_tool_buttons[tool] = button


func _spawn_tool_preview(tool: String) -> Node3D:
	if tool == BUILD_TOOL_ROAD:
		return _spawn_road_tile(Vector3.ZERO, true)
	if tool == BUILD_TOOL_HOUSE:
		return _spawn_house_tile(Vector3.ZERO, true)

	return _spawn_generic_building_preview(tool)


func _spawn_generic_building_preview(tool: String) -> Node3D:
	var root := Node3D.new()
	var pad_material := _ghost_base_material
	var wall_material := _ghost_base_material
	var accent_material := _ghost_accent_material
	var body_size := Vector3(0.82, 0.8, 0.74)
	var roof_size := Vector3(0.9, 0.18, 0.84)

	match tool:
		BUILD_TOOL_POLICE:
			body_size = Vector3(0.88, 0.88, 0.78)
			roof_size = Vector3(0.94, 0.18, 0.86)
		BUILD_TOOL_FIRE:
			body_size = Vector3(0.92, 0.9, 0.82)
			roof_size = Vector3(0.98, 0.18, 0.9)
		BUILD_TOOL_BANK:
			body_size = Vector3(0.84, 0.8, 0.72)
			roof_size = Vector3(0.92, 0.18, 0.82)
		BUILD_TOOL_GROCERY:
			body_size = Vector3(0.96, 0.74, 0.82)
			roof_size = Vector3(1.0, 0.14, 0.88)
		BUILD_TOOL_RESTAURANT:
			body_size = Vector3(0.9, 0.76, 0.78)
			roof_size = Vector3(0.98, 0.18, 0.9)
		BUILD_TOOL_CORNER_STORE:
			body_size = Vector3(0.82, 0.74, 0.7)
			roof_size = Vector3(0.9, 0.16, 0.8)

	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(0.98, 0.04, 0.98), pad_material, root)
	_add_soft_block(Vector3(0.0, body_size.y * 0.5 + 0.05, 0.0), body_size, wall_material, root, 0.14)
	_add_gabled_roof(Vector3(0.0, body_size.y + 0.16, 0.0), roof_size, accent_material, root, 9.0)
	_add_round_canopy(Vector3(0.0, 0.34, body_size.z * 0.56), Vector3(body_size.x * 0.74, 0.12, 0.18), accent_material, root)
	return root


func _spawn_building_for_tool(tool: String, world_position: Vector3) -> Node3D:
	var variant := randi() % 10
	match tool:
		BUILD_TOOL_HOUSE:
			return _add_village_house_variant(world_position, variant)
		BUILD_TOOL_POLICE:
			return _add_police_station_variant(world_position, variant)
		BUILD_TOOL_FIRE:
			return _add_fire_station_variant(world_position, variant)
		BUILD_TOOL_BANK:
			return _add_bank_variant(world_position, variant)
		BUILD_TOOL_GROCERY:
			return _add_grocery_variant(world_position, variant)
		BUILD_TOOL_RESTAURANT:
			return _add_restaurant_variant(world_position, variant)
		BUILD_TOOL_CORNER_STORE:
			return _add_corner_store_variant(world_position, variant)
		_:
			return _spawn_house_tile(world_position, false)


func _adjust_zoom(delta_amount: float) -> void:
	_target_zoom = clamp(_target_zoom + delta_amount, 8.5, 24.0)


func _update_keyboard_camera(delta: float) -> void:
	var move := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		move.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		move.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		move.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		move.y += 1.0
	if move != Vector2.ZERO:
		move = move.normalized()
		_target_focus.x = clamp(_target_focus.x + move.x * delta * 8.0, -8.5, 8.5)
		_target_focus.z = clamp(_target_focus.z + move.y * delta * 8.0, -8.5, 8.5)

	if Input.is_key_pressed(KEY_EQUAL) or Input.is_key_pressed(KEY_KP_ADD):
		_target_zoom = max(8.5, _target_zoom - delta * 10.0)
	elif Input.is_key_pressed(KEY_MINUS) or Input.is_key_pressed(KEY_KP_SUBTRACT):
		_target_zoom = min(24.0, _target_zoom + delta * 10.0)


func _is_pointer_over_hud() -> bool:
	var hovered := get_viewport().gui_get_hovered_control()
	if hovered == null or _hud_panel == null:
		return false
	return _hud_panel == hovered or _hud_panel.is_ancestor_of(hovered)


func _toggle_fullscreen() -> void:
	var current_mode := DisplayServer.window_get_mode()
	if current_mode == DisplayServer.WINDOW_MODE_FULLSCREEN or current_mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
		_exit_fullscreen()
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)


func _exit_fullscreen() -> void:
	if OS.has_feature("web"):
		if Engine.has_singleton("JavaScriptBridge"):
			JavaScriptBridge.eval("if (document.fullscreenElement) { document.exitFullscreen(); }", true)
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)


func _spawn_road_tile(world_position: Vector3, preview: bool) -> Node3D:
	var root := Node3D.new()
	root.position = world_position
	var curb_material: Material = _ghost_base_material if preview else _sidewalk_material
	var road_material: Material = _ghost_accent_material if preview else _road_material
	var lane_material: Material = _ghost_base_material if preview else _road_mark_material

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(1.02, 0.03, 1.02), curb_material, root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.9, 0.05, 0.9), road_material, root)
	_add_box(Vector3(0.0, 0.075, 0.0), Vector3(0.08, 0.02, 0.38), lane_material, root)
	return root


func _spawn_house_tile(world_position: Vector3, preview: bool) -> Node3D:
	var root := Node3D.new()
	root.position = world_position
	var wall_material: Material = _ghost_base_material if preview else _make_material("f1e6d4", 0.86)
	var roof_material: Material = _ghost_accent_material if preview else _make_material("b97554", 0.74)
	var pad_material: Material = _ghost_base_material if preview else _make_material("d7d8cf", 0.88)

	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(0.98, 0.04, 0.98), pad_material, root)
	_add_box(Vector3(0.0, 0.42, 0.02), Vector3(0.68, 0.74, 0.64), wall_material, root)
	var roof_a := _add_box(Vector3(0.0, 0.86, 0.12), Vector3(0.76, 0.14, 0.42), roof_material, root)
	var roof_b := _add_box(Vector3(0.0, 0.86, -0.08), Vector3(0.76, 0.14, 0.42), roof_material, root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -7.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 7.0)
	_add_box(Vector3(0.0, 0.18, 0.39), Vector3(0.24, 0.26, 0.06), _ghost_accent_material if preview else _window_material, root)
	_add_box(Vector3(0.0, 0.07, 0.42), Vector3(0.34, 0.08, 0.18), pad_material, root)
	return root


func _make_panel_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_right = 14
	style.corner_radius_bottom_left = 14
	style.content_margin_left = 14
	style.content_margin_top = 12
	style.content_margin_right = 14
	style.content_margin_bottom = 12
	return style


func _build_water_ring() -> void:
	var water := MeshInstance3D.new()
	var water_mesh := CylinderMesh.new()
	water_mesh.top_radius = 16.5
	water_mesh.bottom_radius = 18.0
	water_mesh.height = 0.16
	water.mesh = water_mesh
	water.material_override = _water_material
	water.position = Vector3(0.0, -0.62, 0.0)
	grid_root.add_child(water)


func _build_island_base() -> void:
	var base := MeshInstance3D.new()
	var base_mesh := BoxMesh.new()
	base_mesh.size = Vector3(GRID_SIZE + 4.6, 1.1, GRID_SIZE + 4.6)
	base.mesh = base_mesh
	base.material_override = _soil_material
	base.position = Vector3(0.0, -0.66, 0.0)
	grid_root.add_child(base)

	var lip := MeshInstance3D.new()
	var lip_mesh := BoxMesh.new()
	lip_mesh.size = Vector3(GRID_SIZE + 1.4, 0.28, GRID_SIZE + 1.4)
	lip.mesh = lip_mesh
	lip.material_override = _stone_material
	lip.position = Vector3(0.0, -0.11, 0.0)
	grid_root.add_child(lip)


func _build_ground_tiles() -> void:
	var half := (GRID_SIZE - 1) * TILE_SIZE * 0.5

	for z in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			var tile := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			var height_variation := 0.11 + sin(float(x) * 0.35) * 0.018 + cos(float(z) * 0.27) * 0.016
			mesh.size = Vector3(0.94, height_variation, 0.94)
			tile.mesh = mesh
			var material := _ground_material_a
			if (x + z) % 3 == 0:
				material = _ground_material_b
			elif (x * 3 + z * 5) % 4 == 0:
				material = _ground_material_c
			tile.material_override = material
			tile.position = Vector3(x - half, -0.05, z - half)
			grid_root.add_child(tile)

	for edge in range(GRID_SIZE):
		_add_edge_post(Vector3(-half - 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(half + 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(edge - half, 0.12, -half - 0.9))
		_add_edge_post(Vector3(edge - half, 0.12, half + 0.9))


func _build_meadow() -> void:
	for patch in [
		{"center": Vector3(-6.2, 0.02, -5.2), "size": Vector2(3.4, 2.2), "clumps": 9},
		{"center": Vector3(5.9, 0.02, -5.4), "size": Vector2(3.0, 2.0), "clumps": 8},
		{"center": Vector3(-6.1, 0.02, 5.3), "size": Vector2(3.2, 2.4), "clumps": 10},
		{"center": Vector3(5.8, 0.02, 5.1), "size": Vector2(2.8, 2.0), "clumps": 8},
		{"center": Vector3(-0.7, 0.02, 6.2), "size": Vector2(2.8, 1.7), "clumps": 6}
	]:
		_add_meadow_patch(patch.center, patch.size, patch.clumps)

	for tuft in [
		Vector3(-3.9, 0.06, 1.35),
		Vector3(-2.85, 0.06, 2.55),
		Vector3(-1.25, 0.06, 4.35),
		Vector3(2.35, 0.06, 4.65),
		Vector3(3.85, 0.06, 2.35),
		Vector3(4.55, 0.06, -0.45)
	]:
		_add_grass_clump(tuft, 1.0)


func _build_town_center() -> void:
	_place_road_strip(Vector3(0.0, 0.0, -2.0), 14, true)
	_place_road_strip(Vector3(0.0, 0.0, 2.0), 12, true)
	_place_road_strip(Vector3(-3.0, 0.0, 0.0), 10, false)
	_place_road_strip(Vector3(3.0, 0.0, 0.0), 10, false)
	_add_plaza(Vector3(0.0, 0.02, 0.1), Vector2(4.2, 4.0))

	_add_landmark(Vector3(0.3, 0.5, 4.2))
	_add_bank_variant(Vector3(-5.35, 0.0, -4.15), 2)
	_add_grocery_variant(Vector3(-1.9, 0.0, -4.0), 4)
	_add_restaurant_variant(Vector3(1.95, 0.0, -4.05), 7)
	_add_corner_store_variant(Vector3(5.35, 0.0, -4.0), 1)
	_add_police_station_variant(Vector3(-5.1, 0.0, 4.0), 6)
	_add_fire_station_variant(Vector3(5.15, 0.0, 4.05), 3)

	for home_data in [
		{"pos": Vector3(-6.4, 0.0, -0.95), "variant": 0},
		{"pos": Vector3(-4.85, 0.0, -0.55), "variant": 3},
		{"pos": Vector3(-6.25, 0.0, 1.55), "variant": 7},
		{"pos": Vector3(6.15, 0.0, -0.6), "variant": 1},
		{"pos": Vector3(4.75, 0.0, 0.1), "variant": 5},
		{"pos": Vector3(6.15, 0.0, 1.7), "variant": 8},
		{"pos": Vector3(-1.45, 0.0, 6.0), "variant": 4},
		{"pos": Vector3(2.15, 0.0, 6.0), "variant": 9}
	]:
		_add_village_house_variant(home_data.pos, home_data.variant)

	for path_data in [
		{"pos": Vector3(-5.2, 0.02, -2.98), "size": Vector2(1.5, 0.8)},
		{"pos": Vector3(-1.9, 0.02, -2.95), "size": Vector2(1.4, 0.8)},
		{"pos": Vector3(1.95, 0.02, -2.95), "size": Vector2(1.4, 0.8)},
		{"pos": Vector3(5.2, 0.02, -2.95), "size": Vector2(1.3, 0.8)},
		{"pos": Vector3(-5.0, 0.02, 2.95), "size": Vector2(1.6, 0.8)},
		{"pos": Vector3(5.1, 0.02, 2.95), "size": Vector2(1.8, 0.8)}
	]:
		_add_town_path(path_data.pos, path_data.size)

	_add_park_corner(Vector3(-0.8, 0.04, 5.0))
	_add_park_corner(Vector3(3.1, 0.04, 5.0))
	_add_flower_patch(Vector3(-2.25, 0.08, 3.55), 7, _flower_material_blue)
	_add_flower_patch(Vector3(2.55, 0.08, 3.45), 7, _flower_material_pink)

	for tree_pos in [
		Vector3(-6.7, 0.18, -5.5),
		Vector3(-6.4, 0.18, 5.8),
		Vector3(6.45, 0.18, -5.5),
		Vector3(6.55, 0.18, 5.8),
		Vector3(-2.8, 0.18, 5.7),
		Vector3(4.5, 0.18, 5.8),
		Vector3(-3.9, 0.18, -5.95),
		Vector3(3.9, 0.18, -5.95)
	]:
		_add_tree(tree_pos)

	for lamp_pos in [
		Vector3(-2.0, 0.08, -1.0),
		Vector3(2.0, 0.08, -1.0),
		Vector3(-2.0, 0.08, 1.0),
		Vector3(2.0, 0.08, 1.0),
		Vector3(-3.0, 0.08, 3.0),
		Vector3(3.0, 0.08, 3.0)
	]:
		_add_lamp(lamp_pos)


func _cozy_palette(kind: String, variant: int) -> Dictionary:
	var idx := posmod(variant, 10)
	var walls := ["efe2d1", "e7dbc4", "d9e2d0", "dce4eb"]
	var roofs := ["a86a48", "7f5a7c", "6f7d51", "546e87"]
	var trims := ["f8f0df", "ede5d2", "f4eee0", "fff7eb"]
	var accents := ["76d9c4", "ef9d6a", "8aaede", "d46e62"]

	match kind:
		"police":
			walls = ["d7e2ee", "e2ebf3", "cadbeb", "eff4f8"]
			roofs = ["5e6e8a", "7386a2", "4e607a", "6a7990"]
			accents = ["6cb6ff", "7fd3f4", "9db7ff", "4fa6de"]
		"fire":
			walls = ["f4ded0", "f1d1c4", "e7c8ba", "f7e6dc"]
			roofs = ["9b4e45", "b45f4c", "8c3f39", "7e5248"]
			accents = ["ef735f", "ff8f6e", "d75f58", "ffb09b"]
		"bank":
			walls = ["e8decc", "f0e5d5", "d8cfbf", "f7efe0"]
			roofs = ["6e7c8b", "51606a", "7d6a57", "516d88"]
			accents = ["e4c36d", "b5d0dc", "d6a95f", "88b8cc"]
		"grocery":
			walls = ["e5dcbf", "f1e7cb", "d9e3cf", "f7eddd"]
			roofs = ["5d8454", "76945a", "c36f4c", "6c8759"]
			accents = ["f05f4f", "7ec96d", "f2c96b", "84c3df"]
		"restaurant":
			walls = ["f2d6c0", "efdac9", "e3d6c8", "f7e3d5"]
			roofs = ["8f5149", "c06e4f", "7e5b54", "a45d3f"]
			accents = ["76d9c4", "f7c36e", "e8787e", "92b7f1"]
		"corner_store":
			walls = ["ead7b9", "f2e4c8", "d8dfd0", "f6e8d5"]
			roofs = ["6f7f8c", "8b6c55", "5d835a", "7e6888"]
			accents = ["f29a6a", "7ed1be", "f1d574", "8db0ec"]
		"house":
			walls = ["f3dfcf", "e8e0d2", "d8e4dc", "dce6ef"]
			roofs = ["b77858", "6f6da3", "78955d", "5f7da5"]
			accents = ["f0c98e", "a8d7d2", "e8a9ad", "f6dca1"]

	return {
		"wall": Color(walls[idx % walls.size()]),
		"roof": Color(roofs[idx % roofs.size()]),
		"trim": Color(trims[idx % trims.size()]),
		"accent": Color(accents[idx % accents.size()])
	}


func _add_village_house_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("house", variant)
	var width := 1.08 + float(variant % 3) * 0.12
	var depth := 0.98 + float(int(variant / 3) % 2) * 0.12
	var height := 0.88 + float(int(variant / 5)) * 0.12
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.58), Vector2(width * 0.42, 0.34), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.06, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), root, 0.16)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.16, 0.18, depth + 0.22), _make_material_from_color(palette.roof, 0.78), root, 12.0)
	_add_box(Vector3(0.0, 0.16, depth * 0.54), Vector3(width * 0.4, 0.18, 0.05), _window_material, root)
	_add_box(Vector3(-width * 0.28, 0.28, depth * 0.52), Vector3(0.13, 0.24, 0.05), _window_material, root)
	_add_box(Vector3(width * 0.28, 0.28, depth * 0.52), Vector3(0.13, 0.24, 0.05), _window_material, root)
	_add_box(Vector3(0.0, 0.08, depth * 0.64), Vector3(width * 0.42, 0.08, 0.2), _make_material_from_color(palette.trim, 0.86), root)
	_add_box(Vector3(0.0, 0.58, -depth * 0.08), Vector3(width * 0.12, 0.5, depth * 0.05), _make_material_from_color(palette.trim, 0.84), root)
	if variant % 2 == 0:
		_add_box(Vector3(width * 0.28, height + 0.44, -depth * 0.1), Vector3(0.14, 0.44, 0.14), _stone_material, root)
	_add_round_canopy(Vector3(0.0, 0.32, depth * 0.62), Vector3(width * 0.62, 0.18, 0.28), _make_material_from_color(palette.accent, 0.5), root)
	_add_shrub_cluster(Vector3(-width * 0.36, 0.0, depth * 0.78), palette.accent, root, 2)
	_add_shrub_cluster(Vector3(width * 0.36, 0.0, depth * 0.78), palette.trim, root, 2)
	return root


func _add_police_station_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("police", variant)
	var width := 2.25 + float(variant % 3) * 0.14
	var depth := 1.68 + float(variant % 2) * 0.16
	var height := 1.06 + float(int(variant / 4)) * 0.08
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.62), Vector2(width * 0.62, 0.45), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), root, 0.2)
	_add_soft_block(Vector3(width * 0.24, 1.02, -depth * 0.16), Vector3(0.68, 1.5, 0.68), _make_material_from_color(palette.trim, 0.86), root, 0.12)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.14, 0.18, depth + 0.18), _make_material_from_color(palette.roof, 0.78), root, 10.0)
	_add_box(Vector3(0.0, 0.56, depth * 0.55), Vector3(width * 0.7, 0.1, 0.06), _make_material_from_color(palette.accent, 0.46), root)
	_add_box(Vector3(0.0, 0.24, depth * 0.55), Vector3(width * 0.18, 0.42, 0.05), _window_material, root)
	_add_box(Vector3(-width * 0.26, 0.28, depth * 0.53), Vector3(0.2, 0.28, 0.05), _window_material, root)
	_add_box(Vector3(width * 0.26, 0.28, depth * 0.53), Vector3(0.2, 0.28, 0.05), _window_material, root)
	_add_round_canopy(Vector3(0.0, 0.36, depth * 0.62), Vector3(width * 0.48, 0.18, 0.22), _make_material_from_color(palette.trim, 0.52), root)
	_add_local_cylinder(Vector3(width * 0.24, 1.9, -depth * 0.16), 0.11, 0.11, 0.22, _make_material_from_color(palette.accent, 0.42), root)
	_add_shrub_cluster(Vector3(-width * 0.38, 0.0, depth * 0.82), palette.accent, root, 2)
	_add_shrub_cluster(Vector3(width * 0.38, 0.0, depth * 0.82), palette.trim, root, 2)
	return root


func _add_fire_station_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("fire", variant)
	var width := 2.55 + float(variant % 2) * 0.22
	var depth := 1.88 + float(int(variant / 3) % 2) * 0.14
	var height := 1.06 + float(int(variant / 5)) * 0.12
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.66), Vector2(width * 0.78, 0.48), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), root, 0.18)
	_add_soft_block(Vector3(width * 0.34, 1.05, -depth * 0.12), Vector3(0.58, 1.74, 0.58), _make_material_from_color(palette.trim, 0.84), root, 0.11)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.14, 0.18, depth + 0.2), _make_material_from_color(palette.roof, 0.78), root, 10.0)
	for i in [-1, 0, 1]:
		_add_box(Vector3(i * width * 0.24, 0.3, depth * 0.54), Vector3(width * 0.18, 0.56, 0.06), _make_material_from_color(palette.trim, 0.74), root)
		_add_box(Vector3(i * width * 0.24, 0.62, depth * 0.54), Vector3(width * 0.18, 0.08, 0.07), _make_material_from_color(palette.accent, 0.44), root)
	_add_box(Vector3(0.0, 0.84, depth * 0.56), Vector3(width * 0.54, 0.12, 0.06), _make_material_from_color(palette.accent, 0.4), root)
	_add_local_cylinder(Vector3(width * 0.34, 2.03, -depth * 0.12), 0.1, 0.1, 0.28, _make_material_from_color(palette.accent, 0.46), root)
	_add_shrub_cluster(Vector3(-width * 0.34, 0.0, depth * 0.84), palette.accent, root, 2)
	_add_shrub_cluster(Vector3(width * 0.34, 0.0, depth * 0.84), palette.trim, root, 2)
	return root


func _add_bank_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("bank", variant)
	var width := 2.18 + float(variant % 3) * 0.14
	var depth := 1.52 + float(variant % 2) * 0.1
	var height := 0.98 + float(int(variant / 4)) * 0.1
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.68), Vector2(width * 0.68, 0.44), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.18, 0.2, depth + 0.18), _make_material_from_color(palette.roof, 0.76), root, 9.0)
	for sx in [-1, 0, 1]:
		_add_local_cylinder(Vector3(sx * width * 0.18, 0.34, depth * 0.58), 0.08, 0.08, 0.58, _make_material_from_color(palette.trim, 0.84), root)
	_add_box(Vector3(0.0, 0.78, depth * 0.58), Vector3(width * 0.52, 0.1, 0.06), _make_material_from_color(palette.accent, 0.46), root)
	_add_box(Vector3(0.0, 0.28, depth * 0.56), Vector3(width * 0.16, 0.42, 0.05), _window_material, root)
	_add_round_canopy(Vector3(0.0, 0.28, depth * 0.68), Vector3(width * 0.44, 0.14, 0.18), _make_material_from_color(palette.trim, 0.48), root)
	_add_local_sphere(Vector3(0.0, 1.18, 0.0), 0.18, 0.22, _make_material_from_color(palette.accent, 0.36), root)
	_add_shrub_cluster(Vector3(-width * 0.32, 0.0, depth * 0.84), palette.accent, root, 2)
	_add_shrub_cluster(Vector3(width * 0.32, 0.0, depth * 0.84), palette.trim, root, 2)
	return root


func _add_grocery_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("grocery", variant)
	var width := 2.5 + float(variant % 3) * 0.12
	var depth := 1.72 + float(int(variant / 3) % 2) * 0.12
	var height := 0.96 + float(int(variant / 5)) * 0.1
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.7), Vector2(width * 0.78, 0.48), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.16, 0.0), Vector3(width + 0.14, 0.18, depth + 0.18), _make_material_from_color(palette.roof, 0.76), root, 8.0)
	_add_round_canopy(Vector3(0.0, 0.4, depth * 0.62), Vector3(width * 0.9, 0.18, 0.24), _make_material_from_color(palette.accent, 0.46), root)
	_add_box(Vector3(0.0, 0.26, depth * 0.56), Vector3(width * 0.5, 0.34, 0.05), _window_material, root)
	_add_box(Vector3(0.0, 0.78, depth * 0.58), Vector3(width * 0.56, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), root)
	for produce_data in [
		{"pos": Vector3(-width * 0.28, 0.12, depth * 0.82), "color": Color("cb644c")},
		{"pos": Vector3(-width * 0.1, 0.12, depth * 0.82), "color": Color("7da85b")},
		{"pos": Vector3(width * 0.08, 0.12, depth * 0.82), "color": Color("f0be63")},
		{"pos": Vector3(width * 0.26, 0.12, depth * 0.82), "color": Color("6ca8c4")}
	]:
		_add_box(produce_data.pos, Vector3(0.18, 0.14, 0.18), _make_material_from_color(produce_data.color, 0.82), root)
	_add_shrub_cluster(Vector3(-width * 0.36, 0.0, depth * 0.86), palette.trim, root, 2)
	_add_shrub_cluster(Vector3(width * 0.36, 0.0, depth * 0.86), palette.accent, root, 2)
	return root


func _add_restaurant_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("restaurant", variant)
	var width := 2.2 + float(variant % 3) * 0.14
	var depth := 1.6 + float(variant % 2) * 0.16
	var height := 0.96 + float(int(variant / 4)) * 0.08
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.72), Vector2(width * 0.9, 0.58), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.16, 0.2, depth + 0.2), _make_material_from_color(palette.roof, 0.74), root, 11.0)
	_add_round_canopy(Vector3(0.0, 0.42, depth * 0.64), Vector3(width * 0.76, 0.2, 0.24), _make_material_from_color(palette.accent, 0.48), root)
	_add_box(Vector3(0.0, 0.26, depth * 0.56), Vector3(width * 0.48, 0.36, 0.05), _window_material, root)
	_add_box(Vector3(0.0, 0.82, depth * 0.58), Vector3(width * 0.5, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), root)
	for patio_x in [-0.34, 0.0, 0.34]:
		_add_local_cylinder(Vector3(patio_x * width, 0.12, depth * 0.95), 0.04, 0.04, 0.18, _make_material_from_color(palette.trim, 0.7), root)
		var umbrella := _add_local_sphere(Vector3(patio_x * width, 0.28, depth * 0.95), 0.13, 0.16, _make_material_from_color(palette.accent, 0.46), root)
		umbrella.scale = Vector3(1.4, 0.3, 1.4)
	_add_box(Vector3(width * 0.28, height + 0.42, -depth * 0.08), Vector3(0.12, 0.4, 0.12), _stone_material, root)
	_add_shrub_cluster(Vector3(-width * 0.42, 0.0, depth * 0.88), palette.trim, root, 2)
	_add_shrub_cluster(Vector3(width * 0.42, 0.0, depth * 0.88), palette.accent, root, 2)
	return root


func _add_corner_store_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("corner_store", variant)
	var width := 1.88 + float(variant % 3) * 0.12
	var depth := 1.45 + float(int(variant / 3) % 2) * 0.12
	var height := 0.92 + float(int(variant / 5)) * 0.1
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, depth * 0.74), Vector2(width * 0.88, 0.52), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, 0.0), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.18, 0.0), Vector3(width + 0.14, 0.18, depth + 0.18), _make_material_from_color(palette.roof, 0.76), root, 10.0)
	_add_round_canopy(Vector3(0.0, 0.36, depth * 0.64), Vector3(width * 0.9, 0.18, 0.24), _make_material_from_color(palette.accent, 0.46), root)
	_add_box(Vector3(-width * 0.18, 0.24, depth * 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, root)
	_add_box(Vector3(width * 0.18, 0.24, depth * 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, root)
	_add_box(Vector3(0.0, 0.82, depth * 0.58), Vector3(width * 0.46, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), root)
	if variant % 2 == 1:
		_add_soft_block(Vector3(width * 0.34, 0.56, -depth * 0.1), Vector3(0.46, 0.68, 0.52), _make_material_from_color(palette.trim, 0.84), root, 0.1)
	_add_shrub_cluster(Vector3(-width * 0.3, 0.0, depth * 0.86), palette.accent, root, 2)
	_add_shrub_cluster(Vector3(width * 0.3, 0.0, depth * 0.86), palette.trim, root, 2)
	return root


func _add_town_path(center: Vector3, size: Vector2, parent: Node = null) -> void:
	var path_material := _make_material("d9cbb7", 0.9)
	var path_parent := parent if parent != null else grid_root
	_add_box(center, Vector3(size.x, 0.04, size.y), path_material, path_parent)


func _build_clouds() -> void:
	for i in range(4):
		var cloud := Node3D.new()
		cloud.position = Vector3(-9.5 + i * 5.5, 6.4 + float(i % 2) * 0.4, -7.5 + i * 1.3)
		cloud.set_meta("speed", 0.12 + float(i) * 0.03)
		cloud.set_meta("base_z", cloud.position.z)
		building_root.add_child(cloud)
		_clouds.append(cloud)

		for puff_index in range(3):
			var puff := MeshInstance3D.new()
			var puff_mesh := SphereMesh.new()
			puff_mesh.radius = 0.55 + puff_index * 0.08
			puff_mesh.height = 0.7 + puff_index * 0.06
			puff.mesh = puff_mesh
			var puff_material := _make_material("ffffff", 0.08)
			puff_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			puff_material.albedo_color.a = 0.86
			puff.material_override = puff_material
			puff.position = Vector3(puff_index * 0.55, 0.0 if puff_index != 1 else 0.18, randf_range(-0.15, 0.15))
			cloud.add_child(puff)


func _add_meadow_patch(center: Vector3, size: Vector2, clump_count: int) -> void:
	var patch := MeshInstance3D.new()
	var patch_mesh := CylinderMesh.new()
	patch_mesh.top_radius = max(size.x, size.y) * 0.52
	patch_mesh.bottom_radius = patch_mesh.top_radius * 1.04
	patch_mesh.height = 0.04
	patch.mesh = patch_mesh
	patch.material_override = _meadow_material
	patch.scale = Vector3(size.x / max(size.x, size.y), 1.0, size.y / max(size.x, size.y))
	patch.position = center
	grid_root.add_child(patch)

	for i in range(clump_count):
		var t: float = float(i) / maxf(1.0, float(clump_count))
		var local_x: float = (sin(t * TAU * 1.7) * 0.5 + randf_range(-0.22, 0.22)) * size.x * 0.38
		var local_z: float = (cos(t * TAU * 1.3) * 0.5 + randf_range(-0.22, 0.22)) * size.y * 0.38
		_add_grass_clump(center + Vector3(local_x, 0.05, local_z), randf_range(0.85, 1.25))


func _place_road_strip(origin: Vector3, count: int, horizontal: bool) -> void:
	for i in range(count):
		var offset := float(i) - float(count - 1) * 0.5

		var sidewalk := MeshInstance3D.new()
		var sidewalk_mesh := BoxMesh.new()
		sidewalk_mesh.size = Vector3(1.08, 0.03, 1.08)
		sidewalk.mesh = sidewalk_mesh
		sidewalk.material_override = _sidewalk_material
		sidewalk.position = origin + (Vector3(offset, 0.008, 0.0) if horizontal else Vector3(0.0, 0.008, offset))
		grid_root.add_child(sidewalk)

		var road := MeshInstance3D.new()
		var road_mesh := BoxMesh.new()
		road_mesh.size = Vector3(0.92, 0.05, 0.92)
		road.mesh = road_mesh
		road.material_override = _road_material
		road.position = origin + (Vector3(offset, 0.03, 0.0) if horizontal else Vector3(0.0, 0.03, offset))
		grid_root.add_child(road)

		if i < count - 1:
			var mark := MeshInstance3D.new()
			var mark_mesh := BoxMesh.new()
			mark_mesh.size = Vector3(0.08, 0.02, 0.38) if horizontal else Vector3(0.38, 0.02, 0.08)
			mark.mesh = mark_mesh
			mark.material_override = _road_mark_material
			mark.position = road.position + Vector3(0.0, 0.035, 0.0)
			grid_root.add_child(mark)


func _add_house(center: Vector3, size: Vector3, wall_color: Color, roof_color: Color) -> void:
	var shell_material := _make_material_from_color(wall_color, 0.88)
	var roof_material := _make_material_from_color(roof_color, 0.76)

	var shell := _add_box(center, size, shell_material, building_root)
	var shell_top := center.y + size.y * 0.5

	var roof_a := _add_box(center + Vector3(0.0, size.y * 0.55 + 0.08, 0.12), Vector3(size.x + 0.1, 0.16, size.z * 0.52), roof_material, building_root)
	var roof_b := _add_box(center + Vector3(0.0, size.y * 0.55 + 0.08, -0.12), Vector3(size.x + 0.1, 0.16, size.z * 0.52), roof_material, building_root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -6.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 6.0)

	var porch := _add_box(center + Vector3(0.0, -size.y * 0.32, size.z * 0.55), Vector3(size.x * 0.48, 0.12, 0.38), _sidewalk_material, building_root)
	porch.position.y = max(0.1, porch.position.y)
	_add_window_band(center + Vector3(0.0, 0.12, size.z * 0.52), Vector3(size.x * 0.58, 0.16, 0.05))
	_add_window_band(center + Vector3(size.x * 0.51, 0.16, 0.0), Vector3(0.05, 0.16, size.z * 0.32))
	_add_chimney(center + Vector3(size.x * 0.24, shell_top + 0.36, -size.z * 0.15))
	_add_planter(center + Vector3(size.x * 0.24, 0.1, size.z * 0.78))
	_add_planter(center + Vector3(-size.x * 0.24, 0.1, size.z * 0.78))

	shell.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON


func _add_shop(center: Vector3, size: Vector3, wall_color: Color, roof_color: Color, awning_color: Color) -> void:
	var shell_material := _make_material_from_color(wall_color, 0.84)
	var roof_material := _make_material_from_color(roof_color, 0.74)
	var awning_material := _make_material_from_color(awning_color, 0.48)

	_add_box(center, size, shell_material, building_root)
	_add_box(center + Vector3(0.0, size.y * 0.55 + 0.1, 0.0), Vector3(size.x + 0.08, 0.2, size.z + 0.08), roof_material, building_root)
	_add_box(center + Vector3(0.0, 0.18, size.z * 0.58), Vector3(size.x * 0.88, 0.08, 0.44), awning_material, building_root)
	_add_window_band(center + Vector3(0.0, 0.2, size.z * 0.54), Vector3(size.x * 0.7, 0.2, 0.05))
	_add_window_band(center + Vector3(-size.x * 0.34, 0.16, size.z * 0.54), Vector3(0.05, 0.26, 0.05))
	_add_window_band(center + Vector3(size.x * 0.34, 0.16, size.z * 0.54), Vector3(0.05, 0.26, 0.05))
	_add_sign(center + Vector3(0.0, 0.74, size.z * 0.58), Vector3(0.9, 0.18, 0.05))
	_add_planter(center + Vector3(-size.x * 0.32, 0.1, size.z * 0.82))
	_add_planter(center + Vector3(size.x * 0.32, 0.1, size.z * 0.82))


func _add_landmark(position_3d: Vector3) -> void:
	var base_material := _make_material("e5ebf1", 0.86)
	var roof_material := _make_material("5a7596", 0.76)

	_add_box(position_3d, Vector3(1.85, 1.24, 1.5), base_material, building_root)
	_add_box(position_3d + Vector3(0.0, 0.76, 0.0), Vector3(1.98, 0.22, 1.64), roof_material, building_root)
	_add_box(position_3d + Vector3(0.0, 1.28, 0.0), Vector3(0.5, 1.95, 0.5), base_material, building_root)

	var steeple := MeshInstance3D.new()
	var steeple_mesh := PrismMesh.new()
	steeple_mesh.left_to_right = 0.0
	steeple_mesh.size = Vector3(0.56, 0.85, 0.56)
	steeple.mesh = steeple_mesh
	steeple.material_override = roof_material
	steeple.position = position_3d + Vector3(0.0, 2.58, 0.0)
	steeple.rotation_degrees = Vector3(0.0, 45.0, 0.0)
	building_root.add_child(steeple)

	_add_window_band(position_3d + Vector3(0.0, 0.24, 0.78), Vector3(0.26, 0.5, 0.05))
	_add_window_band(position_3d + Vector3(-0.48, 0.16, 0.78), Vector3(0.18, 0.24, 0.05))
	_add_window_band(position_3d + Vector3(0.48, 0.16, 0.78), Vector3(0.18, 0.24, 0.05))
	_add_plaza(position_3d + Vector3(0.0, -0.44, 0.24), Vector2(2.5, 2.2))
	_add_planter(position_3d + Vector3(-0.82, 0.08, 0.86))
	_add_planter(position_3d + Vector3(0.82, 0.08, 0.86))


func _add_plaza(center: Vector3, size: Vector2) -> void:
	var plaza_material := _make_material("eef4f5", 0.84)
	_add_box(center, Vector3(size.x, 0.05, size.y), plaza_material, grid_root)


func _add_tree(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.34, 0.0), 0.11, 0.08, 0.68, _trunk_material)
	_add_sphere(position_3d + Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material)
	_add_sphere(position_3d + Vector3(-0.2, 0.84, 0.0), 0.34, 0.66, _leaf_material)
	_add_sphere(position_3d + Vector3(0.22, 0.84, -0.08), 0.3, 0.58, _leaf_material)


func _add_grass_clump(position_3d: Vector3, scale_factor: float) -> void:
	var clump := Node3D.new()
	clump.position = position_3d
	clump.rotation_degrees.y = randf_range(0.0, 180.0)
	clump.set_meta("phase", randf_range(0.0, TAU))
	clump.set_meta("sway", randf_range(0.8, 1.3))
	building_root.add_child(clump)
	_grass_clumps.append(clump)

	for blade_data in [
		{"pos": Vector3(-0.08, 0.17, 0.0), "rot": -10.0, "size": Vector3(0.06, 0.38, 0.02)},
		{"pos": Vector3(0.02, 0.2, 0.03), "rot": 7.0, "size": Vector3(0.06, 0.44, 0.02)},
		{"pos": Vector3(0.1, 0.15, -0.02), "rot": 14.0, "size": Vector3(0.05, 0.32, 0.02)},
		{"pos": Vector3(-0.02, 0.16, -0.08), "rot": -18.0, "size": Vector3(0.05, 0.3, 0.02)}
	]:
		var blade := _add_box(blade_data.pos * scale_factor, blade_data.size * scale_factor, _grass_blade_material, clump)
		blade.rotation_degrees.z = blade_data.rot


func _add_park_corner(position_3d: Vector3) -> void:
	_add_plaza(position_3d, Vector2(1.8, 1.8))
	_add_tree(position_3d + Vector3(-0.55, 0.0, -0.1))
	_add_tree(position_3d + Vector3(0.52, 0.0, 0.28))
	_add_bench(position_3d + Vector3(0.0, 0.06, -0.58), 0.0)
	_add_flower_patch(position_3d + Vector3(0.58, 0.08, -0.55), 4, _flower_material_pink)


func _add_planter(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.22, 0.14, 0.22), _stone_material, building_root)
	_add_sphere(position_3d + Vector3(0.0, 0.18, 0.0), 0.14, 0.2, _leaf_material)


func _add_flower_patch(center: Vector3, count: int, material: StandardMaterial3D) -> void:
	for i in range(count):
		var offset_x := (float(i % 3) - 1.0) * 0.14
		var offset_z := (float(i / 3) - 0.5) * 0.14
		_add_box(center + Vector3(offset_x, 0.05, offset_z), Vector3(0.08, 0.08, 0.08), material, building_root)


func _add_lamp(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material)
	_add_box(position_3d + Vector3(0.0, 1.12, 0.0), Vector3(0.18, 0.1, 0.18), _window_material, building_root)


func _add_bench(position_3d: Vector3, rotation_y: float) -> void:
	var seat_material := _make_material("a57649", 0.72)
	var bench := _add_box(position_3d + Vector3(0.0, 0.14, 0.0), Vector3(0.48, 0.08, 0.18), seat_material, building_root)
	bench.rotation_degrees.y = rotation_y
	var back := _add_box(position_3d + Vector3(0.0, 0.28, -0.07), Vector3(0.48, 0.18, 0.06), seat_material, building_root)
	back.rotation_degrees.y = rotation_y


func _add_chimney(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.16, 0.44, 0.16), _stone_material, building_root)


func _add_sign(position_3d: Vector3, size: Vector3) -> void:
	var sign_material := _make_material("163140", 0.44, 0.0, true, "77f2dc", 0.08)
	_add_box(position_3d, size, sign_material, building_root)


func _add_window_band(position_3d: Vector3, size: Vector3) -> void:
	var band := _add_box(position_3d, size, _window_material, building_root)
	_window_bands.append(band)


func _add_edge_post(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.16, 0.0), 0.03, 0.03, 0.34, _stone_material)


func _add_shrub_cluster(center: Vector3, color: Color, parent: Node, count: int) -> void:
	var shrub_material := _make_material_from_color(color, 0.92)
	for i in range(count):
		var offset := (float(i) - float(count - 1) * 0.5) * 0.18
		var shrub := _add_local_sphere(center + Vector3(offset, 0.12, randf_range(-0.04, 0.04)), 0.12, 0.16, shrub_material, parent)
		shrub.scale = Vector3(1.05, 0.85, 1.0)


func _add_round_canopy(center: Vector3, size: Vector3, material: Material, parent: Node) -> void:
	var canopy := _add_local_sphere(center, 0.22, 0.24, material, parent)
	canopy.scale = Vector3(size.x * 2.1, size.y * 1.8, size.z * 2.1)


func _add_gabled_roof(center: Vector3, size: Vector3, material: Material, parent: Node, tilt_degrees: float = 10.0) -> void:
	var left := _add_box(center + Vector3(0.0, 0.0, size.z * 0.16), Vector3(size.x, size.y, size.z * 0.58), material, parent)
	var right := _add_box(center + Vector3(0.0, 0.0, -size.z * 0.16), Vector3(size.x, size.y, size.z * 0.58), material, parent)
	left.rotation_degrees.x = -tilt_degrees
	right.rotation_degrees.x = tilt_degrees
	_add_box(center + Vector3(0.0, size.y * 0.24, 0.0), Vector3(size.x * 0.12, size.y * 0.8, 0.08), material, parent)


func _add_soft_block(center: Vector3, size: Vector3, material: Material, parent: Node, corner_radius: float = 0.14) -> Node3D:
	var root := Node3D.new()
	root.position = center
	parent.add_child(root)

	var radius: float = minf(corner_radius, minf(size.x * 0.22, size.z * 0.22))
	_add_box(Vector3.ZERO, Vector3(max(0.12, size.x - radius * 1.45), size.y, size.z), material, root)
	_add_box(Vector3.ZERO, Vector3(size.x, size.y, max(0.12, size.z - radius * 1.45)), material, root)

	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			_add_local_cylinder(
				Vector3(sx * (size.x * 0.5 - radius), 0.0, sz * (size.z * 0.5 - radius)),
				radius,
				radius,
				size.y,
				material,
				root
			)

	return root


func _add_box(position_3d: Vector3, size: Vector3, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_local_cylinder(position_3d: Vector3, top_radius: float, bottom_radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top_radius
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_local_sphere(position_3d: Vector3, radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_cylinder(position_3d: Vector3, top_radius: float, bottom_radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top_radius
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	building_root.add_child(mesh_instance)
	return mesh_instance


func _add_sphere(position_3d: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	building_root.add_child(mesh_instance)
	return mesh_instance


func _make_material(color_hex: String, roughness: float, metallic: float = 0.0, emission_enabled: bool = false, emission_color_hex: String = "ffffff", emission_energy: float = 0.0) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(color_hex)
	material.roughness = roughness
	material.metallic = metallic
	material.emission_enabled = emission_enabled
	if emission_enabled:
		material.emission = Color(emission_color_hex)
		material.emission_energy_multiplier = emission_energy
	return material


func _make_material_from_color(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	return material


func _make_transparent_material(color: Color, roughness: float, alpha: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.albedo_color.a = alpha
	material.roughness = roughness
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material


func _animate_clouds(delta: float) -> void:
	for cloud in _clouds:
		var speed: float = float(cloud.get_meta("speed", 0.15))
		var base_z: float = float(cloud.get_meta("base_z", cloud.position.z))
		cloud.position.x += delta * speed
		cloud.position.z = base_z + sin(Time.get_ticks_msec() * 0.0004 + cloud.position.x) * 0.18
		if cloud.position.x > 12.0:
			cloud.position.x = -12.0


func _animate_windows() -> void:
	var time := Time.get_ticks_msec() * 0.001
	for i in range(_window_bands.size()):
		var window_band := _window_bands[i]
		var material := window_band.material_override as StandardMaterial3D
		if material:
			material.emission_energy_multiplier = 0.26 + (sin(time * 1.2 + i * 0.7) * 0.5 + 0.5) * 0.2


func _animate_grass() -> void:
	var time := Time.get_ticks_msec() * 0.001
	for clump in _grass_clumps:
		var phase: float = float(clump.get_meta("phase", 0.0))
		var sway: float = float(clump.get_meta("sway", 1.0))
		clump.rotation_degrees.z = sin(time * 1.6 * sway + phase) * 4.5


func _update_camera(force := false) -> void:
	var orbit := Vector3(_zoom * 0.92, _zoom * 0.74, _zoom * 0.86)
	camera_rig.position = _focus
	camera.position = orbit
	camera.look_at(_focus + Vector3(0.0, 0.55, 0.0), Vector3.UP)
