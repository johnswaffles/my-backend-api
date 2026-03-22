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
const BUILD_TOOL_PARK := "park"
const BUILD_TOOL_INSPECT := "inspect"
const BUILD_TOOL_BULLDOZE := "bulldoze"
const BUILD_TOOL_SEQUENCE := [
	BUILD_TOOL_ROAD,
	BUILD_TOOL_HOUSE,
	BUILD_TOOL_POLICE,
	BUILD_TOOL_FIRE,
	BUILD_TOOL_BANK,
	BUILD_TOOL_GROCERY,
	BUILD_TOOL_RESTAURANT,
	BUILD_TOOL_CORNER_STORE,
	BUILD_TOOL_PARK,
	BUILD_TOOL_INSPECT,
	BUILD_TOOL_BULLDOZE,
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
	BUILD_TOOL_PARK: "Park",
	BUILD_TOOL_INSPECT: "Inspect",
	BUILD_TOOL_BULLDOZE: "Bulldoze",
}
const BUILD_TOOL_COSTS := {
	BUILD_TOOL_ROAD: 20,
	BUILD_TOOL_HOUSE: 180,
	BUILD_TOOL_POLICE: 520,
	BUILD_TOOL_FIRE: 560,
	BUILD_TOOL_BANK: 420,
	BUILD_TOOL_GROCERY: 300,
	BUILD_TOOL_RESTAURANT: 320,
	BUILD_TOOL_CORNER_STORE: 260,
	BUILD_TOOL_PARK: 140,
}
const SAVE_PATH := "user://cozy_builder_save.json"

@onready var grid_root: Node3D = $GridRoot
@onready var building_root: Node3D = $BuildingRoot
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D
@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight

var _focus := Vector3(0.0, 0.0, 0.0)
var _target_focus := Vector3(0.0, 0.0, 0.0)
var _zoom := 16.0
var _target_zoom := 16.0
var _camera_yaw := deg_to_rad(45.0)
var _target_camera_yaw := deg_to_rad(45.0)
var _dragging := false
var _painting_roads := false
var _build_tool := BUILD_TOOL_ROAD
var _hovered_cell := Vector2i(-1, -1)
var _hover_anchor := Vector2i(-1, -1)
var _hover_cells: Array[Vector2i] = []
var _hover_active := false
var _hover_can_build := false
var _selected_anchor_key := ""
var _selection_cells: Array[Vector2i] = []
var _money := 25000
var _day := 1
var _simulation_clock := 0.0
var _cashflow_per_day := 0
var _occupied_cells: Dictionary = {}
var _reserved_cells: Dictionary = {}
var _placed_nodes: Dictionary = {}
var _placements: Dictionary = {}
var _cell_anchor_lookup: Dictionary = {}
var _road_cells: Dictionary = {}
var _road_nodes: Dictionary = {}
var _action_history: Array[Dictionary] = []
var _loaded_save := false

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
var _hover_tiles: Array[MeshInstance3D] = []
var _meadow_patches: Array[MeshInstance3D] = []
var _hover_root: Node3D
var _ghost_root: Node3D
var _ghost_nodes: Dictionary = {}
var _hud_layer: CanvasLayer
var _hud_margin: MarginContainer
var _hud_panel: Control
var _title_label: Label
var _tool_status_label: Label
var _hint_label: Label
var _stats_label: Label
var _selection_label: Label
var _tool_buttons: Dictionary = {}
var _tool_dropdown: OptionButton
var _town_menu: MenuButton
var _fullscreen_button: Button
var _save_button: Button
var _load_button: Button
var _clear_button: Button
var _home_button: Button
var _rotate_left_button: Button
var _rotate_right_button: Button
var _place_button: Button
var _undo_button: Button
var _zoom_in_button: Button
var _zoom_out_button: Button
var _nature_root: Node3D


func _ready() -> void:
	_build_materials()
	_build_world()
	_create_runtime_helpers()
	_build_hud()
	_try_load_game()
	_recalculate_cashflow()
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
	_update_day_night_visuals()
	_update_camera()
	_update_simulation(delta)


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
			KEY_P:
				_set_build_tool(BUILD_TOOL_PARK)
			KEY_9:
				_set_build_tool(BUILD_TOOL_INSPECT)
			KEY_0:
				_set_build_tool(BUILD_TOOL_BULLDOZE)
			KEY_Q:
				_rotate_camera(-PI * 0.5)
			KEY_E:
				_rotate_camera(PI * 0.5)
			KEY_Z:
				if Input.is_key_pressed(KEY_META) or Input.is_key_pressed(KEY_CTRL):
					_undo_last_action()
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
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and not _is_pointer_over_hud():
				if _build_tool == BUILD_TOOL_ROAD:
					_painting_roads = true
				_try_place_hovered_tile()
			else:
				_painting_roads = false
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_target_zoom = max(8.5, _target_zoom - 1.15)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_target_zoom = min(24.0, _target_zoom + 1.15)
	elif event is InputEventMouseMotion and _dragging:
		var right := Vector3.RIGHT.rotated(Vector3.UP, _target_camera_yaw)
		var forward := Vector3.FORWARD.rotated(Vector3.UP, _target_camera_yaw)
		var pan_delta: Vector3 = (-right * event.relative.x + forward * event.relative.y) * PAN_SPEED
		_target_focus += Vector3(pan_delta.x, 0.0, pan_delta.z)
		_target_focus.x = clamp(_target_focus.x, -8.5, 8.5)
		_target_focus.z = clamp(_target_focus.z, -8.5, 8.5)
	elif event is InputEventMouseMotion and _painting_roads and _build_tool == BUILD_TOOL_ROAD and not _is_pointer_over_hud():
		_try_place_hovered_tile()


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
	_nature_root = Node3D.new()
	building_root.add_child(_nature_root)
	_build_water_ring()
	_build_island_base()
	_build_ground_tiles()
	_build_meadow()
	_build_nature()
	_build_clouds()


func _create_runtime_helpers() -> void:
	_hover_root = Node3D.new()
	grid_root.add_child(_hover_root)

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
	margin.set_anchors_preset(Control.PRESET_TOP_WIDE)
	margin.offset_left = 14
	margin.offset_top = 12
	margin.offset_right = -14
	margin.offset_bottom = 0
	_hud_layer.add_child(margin)
	_hud_margin = margin

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _make_glass_panel_style())
	margin.add_child(panel)
	_hud_panel = panel

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 4)
	panel.add_child(stack)

	var top_row := HFlowContainer.new()
	top_row.add_theme_constant_override("separation", 6)
	stack.add_child(top_row)

	var title := Label.new()
	title.text = "Cozy Builder"
	title.add_theme_color_override("font_color", Color("f8f7f3"))
	title.add_theme_font_size_override("font_size", 16)
	title.custom_minimum_size = Vector2(110, 0)
	top_row.add_child(title)
	_title_label = title

	_tool_dropdown = OptionButton.new()
	_tool_dropdown.custom_minimum_size = Vector2(160, 0)
	for tool in [
		BUILD_TOOL_ROAD,
		BUILD_TOOL_HOUSE,
		BUILD_TOOL_POLICE,
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
		BUILD_TOOL_PARK,
		BUILD_TOOL_INSPECT,
		BUILD_TOOL_BULLDOZE,
	]:
		var index := _tool_dropdown.item_count
		_tool_dropdown.add_item(_tool_dropdown_label(tool), index)
		_tool_dropdown.set_item_metadata(index, tool)
	_tool_dropdown.item_selected.connect(_on_tool_dropdown_selected)
	top_row.add_child(_tool_dropdown)

	_place_button = Button.new()
	_place_button.text = "Place"
	_place_button.custom_minimum_size = Vector2(74, 0)
	_place_button.pressed.connect(_try_place_hovered_tile)
	top_row.add_child(_place_button)

	_town_menu = MenuButton.new()
	_town_menu.text = "Town"
	_town_menu.custom_minimum_size = Vector2(72, 0)
	var town_popup := _town_menu.get_popup()
	town_popup.add_item("Home View", 0)
	town_popup.add_item("Save Town", 1)
	town_popup.add_item("Load Save", 2)
	town_popup.add_item("New Map", 3)
	town_popup.id_pressed.connect(_on_town_menu_action)
	top_row.add_child(_town_menu)

	_fullscreen_button = Button.new()
	_fullscreen_button.text = "Fullscreen"
	_fullscreen_button.custom_minimum_size = Vector2(92, 0)
	_fullscreen_button.pressed.connect(_toggle_fullscreen)
	top_row.add_child(_fullscreen_button)

	_home_button = Button.new()
	_home_button.text = "Home"
	_home_button.custom_minimum_size = Vector2(64, 0)
	_home_button.pressed.connect(_reset_camera_view)
	top_row.add_child(_home_button)

	_rotate_left_button = Button.new()
	_rotate_left_button.text = "L"
	_rotate_left_button.custom_minimum_size = Vector2(38, 0)
	_rotate_left_button.pressed.connect(_rotate_camera.bind(-PI * 0.5))
	top_row.add_child(_rotate_left_button)

	_rotate_right_button = Button.new()
	_rotate_right_button.text = "R"
	_rotate_right_button.custom_minimum_size = Vector2(38, 0)
	_rotate_right_button.pressed.connect(_rotate_camera.bind(PI * 0.5))
	top_row.add_child(_rotate_right_button)

	_zoom_out_button = Button.new()
	_zoom_out_button.text = "-"
	_zoom_out_button.custom_minimum_size = Vector2(38, 0)
	_zoom_out_button.pressed.connect(_adjust_zoom.bind(1.6))
	top_row.add_child(_zoom_out_button)

	_zoom_in_button = Button.new()
	_zoom_in_button.text = "+"
	_zoom_in_button.custom_minimum_size = Vector2(38, 0)
	_zoom_in_button.pressed.connect(_adjust_zoom.bind(-1.6))
	top_row.add_child(_zoom_in_button)

	_undo_button = Button.new()
	_undo_button.text = "Undo"
	_undo_button.custom_minimum_size = Vector2(64, 0)
	_undo_button.pressed.connect(_undo_last_action)
	top_row.add_child(_undo_button)

	_tool_status_label = Label.new()
	_tool_status_label.add_theme_color_override("font_color", Color("d3ebe4"))
	_tool_status_label.add_theme_font_size_override("font_size", 12)
	stack.add_child(_tool_status_label)

	_stats_label = Label.new()
	_stats_label.add_theme_color_override("font_color", Color("f7f2e6"))
	_stats_label.add_theme_font_size_override("font_size", 12)
	stack.add_child(_stats_label)

	_selection_label = Label.new()
	_selection_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_selection_label.custom_minimum_size = Vector2(320, 0)
	_selection_label.add_theme_color_override("font_color", Color("d7e7ef"))
	_selection_label.add_theme_font_size_override("font_size", 11)
	stack.add_child(_selection_label)

	_hint_label = Label.new()
	_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint_label.custom_minimum_size = Vector2(320, 0)
	_hint_label.add_theme_color_override("font_color", Color("a9bec5"))
	_hint_label.add_theme_font_size_override("font_size", 11)
	_hint_label.text = "Use the build menu or keys 1-0 and P. Q/E rotates. Cmd/Ctrl+Z undoes. Right drag pans."
	stack.add_child(_hint_label)


func _refresh_tool_ui() -> void:
	if _tool_status_label:
		var tool_name := _tool_name(_build_tool)
		var cost_text := ""
		if BUILD_TOOL_COSTS.has(_build_tool):
			cost_text = "  |  Cost: $%d" % int(BUILD_TOOL_COSTS[_build_tool])
		_tool_status_label.text = "Tool: %s%s" % [tool_name, cost_text]
	if _stats_label:
		_stats_label.text = _build_stats_text()
	if _tool_dropdown:
		for index in range(_tool_dropdown.item_count):
			if str(_tool_dropdown.get_item_metadata(index)) == _build_tool:
				_tool_dropdown.select(index)
				break
	for tool in _tool_buttons.keys():
		_style_tool_button(_tool_buttons[tool], _build_tool == tool)
	if _tool_dropdown:
		_style_tool_button(_tool_dropdown, false)
	if _town_menu:
		_style_tool_button(_town_menu, false)
	if _fullscreen_button:
		_style_tool_button(_fullscreen_button, false)
		_fullscreen_button.text = "Exit Fullscreen" if _is_fullscreen() else "Fullscreen"
	if _place_button:
		_style_tool_button(_place_button, true)
	if _zoom_in_button:
		_style_tool_button(_zoom_in_button, false)
	if _zoom_out_button:
		_style_tool_button(_zoom_out_button, false)
	if _rotate_left_button:
		_style_tool_button(_rotate_left_button, false)
	if _rotate_right_button:
		_style_tool_button(_rotate_right_button, false)
	if _undo_button:
		_style_tool_button(_undo_button, _action_history.size() > 0)
		_undo_button.disabled = _action_history.is_empty()
	if _home_button:
		_style_tool_button(_home_button, false)
	if _save_button:
		_style_tool_button(_save_button, false)
	if _load_button:
		_style_tool_button(_load_button, false)
	if _clear_button:
		_style_tool_button(_clear_button, false)
	if _selection_label:
		_selection_label.text = _selection_text()
	_apply_hud_layout()
	if _ghost_root:
		for tool in _ghost_nodes.keys():
			_ghost_nodes[tool].visible = _build_tool == tool and BUILD_TOOL_COSTS.has(tool)


func _style_tool_button(button: Button, selected: bool) -> void:
	button.add_theme_color_override("font_color", Color("f7f2e6"))
	button.add_theme_color_override("font_hover_color", Color("ffffff"))
	button.add_theme_color_override("font_pressed_color", Color("ffffff"))
	var base_color := Color(0.11, 0.16, 0.22, 0.42) if not selected else Color(0.2, 0.58, 0.54, 0.5)
	var border_color := Color(0.86, 0.93, 0.98, 0.18) if not selected else Color(0.56, 0.92, 0.86, 0.34)
	button.add_theme_stylebox_override("normal", _make_panel_style(base_color, border_color))
	button.add_theme_stylebox_override("hover", _make_panel_style(base_color.lightened(0.08), border_color.lightened(0.08)))
	button.add_theme_stylebox_override("pressed", _make_panel_style(base_color.darkened(0.04), border_color))
	button.add_theme_stylebox_override("focus", _make_panel_style(base_color, border_color.lightened(0.12)))


func _set_build_tool(tool: String) -> void:
	_build_tool = tool
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _tool_dropdown_label(tool: String) -> String:
	match tool:
		BUILD_TOOL_ROAD:
			return "Build: Road"
		BUILD_TOOL_HOUSE:
			return "Build: House"
		BUILD_TOOL_POLICE:
			return "Build: Police"
		BUILD_TOOL_FIRE:
			return "Build: Fire"
		BUILD_TOOL_BANK:
			return "Build: Bank"
		BUILD_TOOL_GROCERY:
			return "Build: Grocery"
		BUILD_TOOL_RESTAURANT:
			return "Build: Restaurant"
		BUILD_TOOL_CORNER_STORE:
			return "Build: Corner"
		BUILD_TOOL_PARK:
			return "Build: Park"
		BUILD_TOOL_INSPECT:
			return "Tool: Inspect"
		BUILD_TOOL_BULLDOZE:
			return "Tool: Bulldoze"
	return _tool_name(tool)


func _on_tool_dropdown_selected(index: int) -> void:
	if not _tool_dropdown:
		return
	var tool := str(_tool_dropdown.get_item_metadata(index))
	if tool != "":
		_set_build_tool(tool)


func _on_town_menu_action(id: int) -> void:
	match id:
		0:
			_reset_camera_view()
		1:
			_save_game()
		2:
			_load_game()
		3:
			_new_map()


func _apply_hud_layout() -> void:
	if not _hud_margin or not _hud_panel:
		return
	var viewport_size := get_viewport().get_visible_rect().size
	var compact := _is_fullscreen() or viewport_size.x < 980.0
	_hud_margin.offset_left = 10 if compact else 14
	_hud_margin.offset_top = 8 if compact else 12
	_hud_margin.offset_right = -10 if compact else -14
	if _title_label:
		_title_label.visible = not compact
	if _tool_status_label:
		_tool_status_label.add_theme_font_size_override("font_size", 11 if compact else 12)
	if _stats_label:
		_stats_label.add_theme_font_size_override("font_size", 10 if compact else 12)
	if _selection_label:
		_selection_label.visible = not compact
		_selection_label.add_theme_font_size_override("font_size", 10 if compact else 11)
	if _hint_label:
		_hint_label.add_theme_font_size_override("font_size", 10 if compact else 11)
	if _tool_dropdown:
		_tool_dropdown.custom_minimum_size = Vector2(136 if compact else 160, 0)
	if _place_button:
		_place_button.custom_minimum_size = Vector2(62 if compact else 74, 0)
	if _fullscreen_button:
		_fullscreen_button.custom_minimum_size = Vector2(84 if compact else 92, 0)
	if _town_menu:
		_town_menu.custom_minimum_size = Vector2(62 if compact else 72, 0)
	if _home_button:
		_home_button.visible = not compact


func _update_hover_from_mouse() -> void:
	if not is_instance_valid(camera):
		return
	var pick := _pick_grid_cell(get_viewport().get_mouse_position())
	if pick.is_empty():
		_clear_hover()
		return

	var cell: Vector2i = pick["cell"]
	var footprint := _tool_footprint(_build_tool)
	var anchor := _anchor_for_hover_cell(cell, footprint)
	var cells := _cells_for_anchor(anchor, footprint)
	var world := _anchor_to_world(anchor, footprint)
	var valid := false
	var inspect_mode := _build_tool == BUILD_TOOL_INSPECT or _build_tool == BUILD_TOOL_BULLDOZE
	if inspect_mode:
		var found_anchor := _find_anchor_for_cell(cell)
		if found_anchor != "":
			anchor = _anchor_key_to_cell(found_anchor)
			cells = _placement_cells(found_anchor)
			footprint = _footprint_from_cells(cells)
			world = _anchor_to_world(anchor, footprint)
			valid = true
			_set_selected_anchor(found_anchor)
		else:
			_clear_selected_anchor()
	else:
		valid = _cells_are_buildable(cells)
		if valid and _tool_requires_road(_build_tool) and not _cells_touch_road(cells):
			valid = false
		if BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
			valid = false

	_hovered_cell = cell
	_hover_anchor = anchor
	_hover_cells = cells
	_hover_active = true
	_hover_can_build = valid
	_update_hover_tiles(cells, valid)
	_ghost_root.visible = true
	_ghost_root.position = world
	_ghost_root.rotation_degrees.y = rad_to_deg(_tool_rotation_y(_build_tool, anchor, footprint))
	for tool in _ghost_nodes.keys():
		_ghost_nodes[tool].visible = _build_tool == tool and BUILD_TOOL_COSTS.has(tool)

	if _hint_label:
		if valid:
			if inspect_mode:
				_hint_label.text = "Selected %s. Click or press Space to %s it." % [_selection_name(), "inspect" if _build_tool == BUILD_TOOL_INSPECT else "remove"]
			else:
				var size_label := "%dx%d" % [footprint.x, footprint.y]
				_hint_label.text = "Footprint %s at %d, %d is open. Left click to place a %s." % [size_label, anchor.x + 1, anchor.y + 1, _tool_name(_build_tool).to_lower()]
		elif BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
			_hint_label.text = "Not enough money for %s. You need $%d." % [_tool_name(_build_tool).to_lower(), int(BUILD_TOOL_COSTS[_build_tool])]
		elif _tool_requires_road(_build_tool) and not _cells_touch_road(cells):
			_hint_label.text = "%s needs to touch a road so townspeople can reach it." % _tool_name(_build_tool)
		else:
			_hint_label.text = "That footprint collides with something already placed. Pick a clearer spot nearby."


func _clear_hover() -> void:
	_hover_active = false
	_hover_can_build = false
	_hover_anchor = Vector2i(-1, -1)
	_hover_cells.clear()
	_clear_hover_tiles()
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Use the build buttons or keys 1-0 and P, then click or press Space to place. Q/E rotates. Cmd/Ctrl+Z undoes. Right drag pans."


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

	if _build_tool == BUILD_TOOL_INSPECT:
		_refresh_tool_ui()
		return

	if _build_tool == BUILD_TOOL_BULLDOZE:
		_remove_selected_placement(true)
		return

	var footprint := _tool_footprint(_build_tool)
	var world := _anchor_to_world(_hover_anchor, footprint)
	var cost := int(BUILD_TOOL_COSTS.get(_build_tool, 0))
	if _money < cost:
		return
	var placed: Node3D
	if _build_tool == BUILD_TOOL_ROAD:
		_mark_road_cell(_hover_anchor)
		_rebuild_road_at(_hover_anchor)
		for neighbor in _neighbor_cells(_hover_anchor):
			if _road_cells.has(_cell_key(neighbor)):
				_rebuild_road_at(neighbor)
		placed = _road_nodes.get(_cell_key(_hover_anchor))
	else:
		placed = _spawn_building_for_tool(_build_tool, world, _tool_rotation_y(_build_tool, _hover_anchor, footprint))

	_clear_nature_for_cells(_hover_cells)
	_money -= cost
	_register_placement(_hover_anchor, _hover_cells, _build_tool, placed, cost)
	_recalculate_cashflow()
	_update_hover_from_mouse()
	_refresh_tool_ui()


func _tool_name(tool: String) -> String:
	return BUILD_TOOL_LABELS.get(tool, "Building")


func _tool_footprint(tool: String) -> Vector2i:
	if tool == BUILD_TOOL_ROAD or tool == BUILD_TOOL_INSPECT or tool == BUILD_TOOL_BULLDOZE:
		return Vector2i(1, 1)
	return Vector2i(2, 2)


func _anchor_for_hover_cell(cell: Vector2i, footprint: Vector2i) -> Vector2i:
	return Vector2i(
		clamp(cell.x, 0, GRID_SIZE - footprint.x),
		clamp(cell.y, 0, GRID_SIZE - footprint.y)
	)


func _cells_for_anchor(anchor: Vector2i, footprint: Vector2i) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	for dz in range(footprint.y):
		for dx in range(footprint.x):
			cells.append(Vector2i(anchor.x + dx, anchor.y + dz))
	return cells


func _cells_are_buildable(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		var key := _cell_key(cell)
		if _reserved_cells.has(key) or _occupied_cells.has(key):
			return false
	return true


func _cells_touch_reserved(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		if _reserved_cells.has(_cell_key(cell)):
			return true
	return false


func _cells_touch_road(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		for neighbor in _neighbor_cells(cell):
			if _road_cells.has(_cell_key(neighbor)):
				return true
	return false


func _tool_requires_road(tool: String) -> bool:
	return tool in [
		BUILD_TOOL_HOUSE,
		BUILD_TOOL_POLICE,
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
	]


func _anchor_to_world(anchor: Vector2i, footprint: Vector2i) -> Vector3:
	var min_world := _cell_to_world(anchor)
	return min_world + Vector3(float(footprint.x - 1) * 0.5, 0.0, float(footprint.y - 1) * 0.5)


func _update_hover_tiles(cells: Array[Vector2i], valid: bool) -> void:
	while _hover_tiles.size() < cells.size():
		var tile := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.92, 0.05, 0.92)
		tile.mesh = mesh
		tile.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_hover_root.add_child(tile)
		_hover_tiles.append(tile)
	for i in range(_hover_tiles.size()):
		var tile := _hover_tiles[i]
		if i < cells.size():
			tile.visible = true
			tile.position = _cell_to_world(cells[i]) + Vector3(0.0, 0.06, 0.0)
			tile.material_override = _hover_material_valid if valid else _hover_material_invalid
		else:
			tile.visible = false


func _clear_hover_tiles() -> void:
	for tile in _hover_tiles:
		tile.visible = false


func _mark_cells(cells: Array[Vector2i], tool: String, node: Node3D) -> void:
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells[key] = tool
		_placed_nodes[key] = node


func _register_placement(anchor: Vector2i, cells: Array[Vector2i], tool: String, node: Node3D, cost: int) -> void:
	var anchor_key := _cell_key(anchor)
	_placements[anchor_key] = {
		"anchor": anchor,
		"cells": cells.duplicate(),
		"tool": tool,
		"node": node,
		"cost": cost,
	}
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells[key] = tool
		_placed_nodes[key] = node
		_cell_anchor_lookup[key] = anchor_key
	_action_history.append({
		"type": "place",
		"anchor_key": anchor_key,
		"money": cost,
	})
	_set_selected_anchor(anchor_key)


func _find_anchor_for_cell(cell: Vector2i) -> String:
	return _cell_anchor_lookup.get(_cell_key(cell), "")


func _anchor_key_to_cell(anchor_key: String) -> Vector2i:
	var parts := anchor_key.split(":")
	return Vector2i(parts[0].to_int(), parts[1].to_int())


func _placement_cells(anchor_key: String) -> Array[Vector2i]:
	if not _placements.has(anchor_key):
		return []
	return _placements[anchor_key]["cells"]


func _footprint_from_cells(cells: Array[Vector2i]) -> Vector2i:
	if cells.is_empty():
		return Vector2i(1, 1)
	var min_x := cells[0].x
	var max_x := cells[0].x
	var min_y := cells[0].y
	var max_y := cells[0].y
	for cell in cells:
		min_x = mini(min_x, cell.x)
		max_x = maxi(max_x, cell.x)
		min_y = mini(min_y, cell.y)
		max_y = maxi(max_y, cell.y)
	return Vector2i(max_x - min_x + 1, max_y - min_y + 1)


func _set_selected_anchor(anchor_key: String) -> void:
	_selected_anchor_key = anchor_key
	_selection_cells = _placement_cells(anchor_key)


func _clear_selected_anchor() -> void:
	_selected_anchor_key = ""
	_selection_cells.clear()


func _selection_name() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		return "nothing"
	return _tool_name(_placements[_selected_anchor_key]["tool"]).to_lower()


func _selection_text() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		return "Selection: none  |  Start with roads, then place homes and town buildings off the road network."
	var placement = _placements[_selected_anchor_key]
	var cells: Array[Vector2i] = placement["cells"]
	var footprint := _footprint_from_cells(cells)
	var road_status := "Road Access: yes" if _cells_touch_road(cells) else "Road Access: no"
	return "Selection: %s  |  Footprint: %dx%d  |  Build Cost: $%d  |  %s" % [
		_tool_name(placement["tool"]),
		footprint.x,
		footprint.y,
		int(placement["cost"]),
		road_status
	]


func _build_stats_text() -> String:
	var homes := 0
	var shops := 0
	var civics := 0
	var parks := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		if tool == BUILD_TOOL_HOUSE:
			homes += 1
		elif tool in [BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE]:
			shops += 1
		elif tool in [BUILD_TOOL_POLICE, BUILD_TOOL_FIRE]:
			civics += 1
		elif tool == BUILD_TOOL_PARK:
			parks += 1
	var population := homes * 6
	var jobs := shops * 10 + civics * 6
	var appeal := parks * 14 + shops * 4 + homes * 2
	return "Day %d  |  Money: $%d  |  +$%d/day  |  Pop: %d  |  Jobs: %d  |  Homes: %d  |  Shops: %d  |  Civic: %d  |  Parks: %d  |  Appeal: %d  |  Roads: %d" % [_day, _money, _cashflow_per_day, population, jobs, homes, shops, civics, parks, appeal, _road_cells.size()]


func _recalculate_cashflow() -> void:
	var homes := 0
	var shops := 0
	var civics := 0
	var parks := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		if tool == BUILD_TOOL_HOUSE:
			homes += 1
		elif tool in [BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE]:
			shops += 1
		elif tool in [BUILD_TOOL_POLICE, BUILD_TOOL_FIRE]:
			civics += 1
		elif tool == BUILD_TOOL_PARK:
			parks += 1
	_cashflow_per_day = homes * 48 + shops * 112 - civics * 20 - parks * 8 - _road_cells.size() * 2


func _update_simulation(delta: float) -> void:
	_simulation_clock += delta
	if _simulation_clock >= 7.5:
		_simulation_clock = 0.0
		_day += 1
		_recalculate_cashflow()
		_money = max(0, _money + _cashflow_per_day)
		_refresh_tool_ui()


func _is_fullscreen() -> bool:
	var current_mode := DisplayServer.window_get_mode()
	return current_mode == DisplayServer.WINDOW_MODE_FULLSCREEN or current_mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN


func _remove_selected_placement(refund: bool, record_action: bool = true) -> void:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		return
	var anchor_key := _selected_anchor_key
	var placement = _placements[anchor_key]
	var tool: String = placement["tool"]
	var cells: Array[Vector2i] = placement["cells"]
	var node: Node3D = placement["node"]
	var refund_amount := int(round(float(placement["cost"]) * 0.7)) if refund else 0
	if refund:
		_money += refund_amount
	if tool == BUILD_TOOL_ROAD:
		for cell in cells:
			var road_key := _cell_key(cell)
			_road_cells.erase(road_key)
			if _road_nodes.has(road_key):
				var road_node: Node3D = _road_nodes[road_key]
				if is_instance_valid(road_node):
					road_node.queue_free()
				_road_nodes.erase(road_key)
	else:
		if is_instance_valid(node):
			node.queue_free()
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells.erase(key)
		_placed_nodes.erase(key)
		_cell_anchor_lookup.erase(key)
	_placements.erase(anchor_key)
	if record_action:
		_action_history.append({
			"type": "remove",
			"anchor_key": anchor_key,
			"tool": tool,
			"cells": cells.duplicate(),
			"cost": int(placement["cost"]),
			"refund": refund_amount,
		})
	if tool == BUILD_TOOL_ROAD:
		for cell in cells:
			for neighbor in _neighbor_cells(cell):
				if _road_cells.has(_cell_key(neighbor)):
					_rebuild_road_at(neighbor)
	_clear_selected_anchor()
	_recalculate_cashflow()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _undo_last_action() -> void:
	if _action_history.is_empty():
		return
	var action = _action_history.pop_back()
	if action["type"] == "place":
		var anchor_key: String = action["anchor_key"]
		if _placements.has(anchor_key):
			_selected_anchor_key = anchor_key
			_remove_selected_placement(false, false)
			_money += int(action["money"])
	elif action["type"] == "remove":
		_money -= int(action["refund"])
		var anchor: Vector2i = _anchor_key_to_cell(action["anchor_key"])
		var cells: Array[Vector2i] = action["cells"]
		if action["tool"] == BUILD_TOOL_ROAD:
			for cell in cells:
				_mark_road_cell(cell)
				_rebuild_road_at(cell)
				for neighbor in _neighbor_cells(cell):
					if _road_cells.has(_cell_key(neighbor)):
						_rebuild_road_at(neighbor)
			_register_placement(anchor, cells, action["tool"], _road_nodes.get(_cell_key(anchor)), int(action["cost"]))
		else:
			var node := _spawn_building_for_tool(action["tool"], _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(action["tool"], anchor, _footprint_from_cells(cells)))
			_register_placement(anchor, cells, action["tool"], node, int(action["cost"]))
		if not _action_history.is_empty():
			_action_history.pop_back()
	_recalculate_cashflow()
	_refresh_tool_ui()


func _mark_road_cell(cell: Vector2i) -> void:
	var key := _cell_key(cell)
	_road_cells[key] = true
	_occupied_cells[key] = BUILD_TOOL_ROAD
	_clear_nature_for_cells([cell])


func _neighbor_cells(cell: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(cell.x, cell.y - 1),
		Vector2i(cell.x + 1, cell.y),
		Vector2i(cell.x, cell.y + 1),
		Vector2i(cell.x - 1, cell.y),
	]


func _add_tool_button(container: HBoxContainer, tool: String, label: String, width: float) -> void:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(width, 0)
	button.pressed.connect(_set_build_tool.bind(tool))
	container.add_child(button)
	_tool_buttons[tool] = button


func _spawn_tool_preview(tool: String) -> Node3D:
	if tool == BUILD_TOOL_INSPECT or tool == BUILD_TOOL_BULLDOZE:
		return Node3D.new()
	if tool == BUILD_TOOL_ROAD:
		return _build_road_tile_mesh(Vector2i.ZERO, true, [Vector2i(0, 0)])
	if tool == BUILD_TOOL_HOUSE:
		return _spawn_house_tile(Vector3.ZERO, true)
	if tool == BUILD_TOOL_PARK:
		return _spawn_park_preview()

	return _spawn_generic_building_preview(tool)


func _spawn_park_preview() -> Node3D:
	var root := Node3D.new()
	var lawn_material := _ghost_base_material
	var path_material := _ghost_accent_material
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(1.82, 0.04, 1.82), lawn_material, root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(1.54, 0.03, 0.26), path_material, root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.26, 0.03, 1.54), path_material, root)
	_add_local_sphere(Vector3(-0.42, 0.22, -0.32), 0.18, 0.22, _ghost_accent_material, root)
	_add_local_sphere(Vector3(0.42, 0.22, 0.32), 0.18, 0.22, _ghost_accent_material, root)
	return root


func _spawn_generic_building_preview(tool: String) -> Node3D:
	var root := Node3D.new()
	var pad_material := _ghost_base_material
	var wall_material := _ghost_base_material
	var accent_material := _ghost_accent_material
	var body_size := Vector3(1.38, 0.88, 1.18)
	var roof_size := Vector3(1.52, 0.18, 1.3)

	match tool:
		BUILD_TOOL_POLICE:
			body_size = Vector3(1.52, 0.94, 1.26)
			roof_size = Vector3(1.64, 0.18, 1.38)
		BUILD_TOOL_FIRE:
			body_size = Vector3(1.58, 0.96, 1.34)
			roof_size = Vector3(1.72, 0.18, 1.44)
		BUILD_TOOL_BANK:
			body_size = Vector3(1.42, 0.86, 1.14)
			roof_size = Vector3(1.58, 0.18, 1.28)
		BUILD_TOOL_GROCERY:
			body_size = Vector3(1.66, 0.82, 1.36)
			roof_size = Vector3(1.78, 0.16, 1.46)
		BUILD_TOOL_RESTAURANT:
			body_size = Vector3(1.52, 0.84, 1.24)
			roof_size = Vector3(1.7, 0.18, 1.4)
		BUILD_TOOL_CORNER_STORE:
			body_size = Vector3(1.36, 0.8, 1.08)
			roof_size = Vector3(1.5, 0.16, 1.22)

	_add_box(Vector3(0.0, 0.02, 0.1), Vector3(1.8, 0.04, 1.6), pad_material, root)
	_add_soft_block(Vector3(0.0, body_size.y * 0.5 + 0.05, 0.0), body_size, wall_material, root, 0.14)
	_add_gabled_roof(Vector3(0.0, body_size.y + 0.16, 0.0), roof_size, accent_material, root, 9.0)
	_add_round_canopy(Vector3(0.0, 0.34, body_size.z * 0.56), Vector3(body_size.x * 0.74, 0.12, 0.18), accent_material, root)
	return root


func _spawn_building_for_tool(tool: String, world_position: Vector3, rotation_y: float) -> Node3D:
	var variant := randi() % 10
	var node: Node3D
	match tool:
		BUILD_TOOL_HOUSE:
			node = _add_village_house_variant(world_position, variant)
		BUILD_TOOL_POLICE:
			node = _add_police_station_variant(world_position, variant)
		BUILD_TOOL_FIRE:
			node = _add_fire_station_variant(world_position, variant)
		BUILD_TOOL_BANK:
			node = _add_bank_variant(world_position, variant)
		BUILD_TOOL_GROCERY:
			node = _add_grocery_variant(world_position, variant)
		BUILD_TOOL_RESTAURANT:
			node = _add_restaurant_variant(world_position, variant)
		BUILD_TOOL_CORNER_STORE:
			node = _add_corner_store_variant(world_position, variant)
		BUILD_TOOL_PARK:
			node = _add_park_variant(world_position, variant)
		_:
			node = _spawn_house_tile(world_position, false)
	node.rotation_degrees.y = rad_to_deg(rotation_y)
	return node


func _adjust_zoom(delta_amount: float) -> void:
	_target_zoom = clamp(_target_zoom + delta_amount, 8.5, 24.0)


func _rotate_camera(delta_yaw: float) -> void:
	_target_camera_yaw += delta_yaw


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
		var right := Vector3.RIGHT.rotated(Vector3.UP, _target_camera_yaw)
		var forward := Vector3.FORWARD.rotated(Vector3.UP, _target_camera_yaw)
		var motion := (right * move.x + forward * move.y) * delta * 8.0
		_target_focus.x = clamp(_target_focus.x + motion.x, -8.5, 8.5)
		_target_focus.z = clamp(_target_focus.z + motion.z, -8.5, 8.5)

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


func _reset_camera_view() -> void:
	_target_focus = Vector3.ZERO
	_focus = _target_focus
	_target_zoom = 16.0
	_zoom = _target_zoom
	_target_camera_yaw = deg_to_rad(45.0)
	_camera_yaw = _target_camera_yaw
	_update_camera(true)


func _save_game() -> void:
	var save_data := {
		"money": _money,
		"day": _day,
		"clock": _simulation_clock,
		"build_tool": _build_tool,
		"focus": [_target_focus.x, _target_focus.y, _target_focus.z],
		"zoom": _target_zoom,
		"yaw": _target_camera_yaw,
		"placements": []
	}
	var placement_list: Array = []
	for anchor_key in _placements.keys():
		var placement = _placements[anchor_key]
		var anchor: Vector2i = placement["anchor"]
		placement_list.append({
			"tool": placement["tool"],
			"anchor": [anchor.x, anchor.y],
			"cost": int(placement["cost"]),
		})
	save_data["placements"] = placement_list

	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		if _hint_label:
			_hint_label.text = "Could not save the town right now."
		return
	file.store_string(JSON.stringify(save_data))
	file.close()
	if _hint_label:
		_hint_label.text = "Town saved. You can reload it anytime from this device."


func _load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		if _hint_label:
			_hint_label.text = "No saved town yet. Build something first, then use Save Town."
		return
	_try_load_game(true)


func _try_load_game(force_feedback: bool = false) -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		if force_feedback and _hint_label:
			_hint_label.text = "No saved town found on this device."
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		if force_feedback and _hint_label:
			_hint_label.text = "Saved town could not be opened."
		return
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	var parse_result := json.parse(text)
	if parse_result != OK or typeof(json.data) != TYPE_DICTIONARY:
		if force_feedback and _hint_label:
			_hint_label.text = "Saved town is corrupted or unreadable."
		return
	var data: Dictionary = json.data
	_clear_map_data()
	_money = int(data.get("money", 25000))
	_day = int(data.get("day", 1))
	_simulation_clock = float(data.get("clock", 0.0))
	_build_tool = str(data.get("build_tool", BUILD_TOOL_ROAD))
	var focus_data: Array = data.get("focus", [0.0, 0.0, 0.0])
	if focus_data.size() == 3:
		_target_focus = Vector3(float(focus_data[0]), float(focus_data[1]), float(focus_data[2]))
		_focus = _target_focus
	_target_zoom = float(data.get("zoom", 16.0))
	_zoom = _target_zoom
	_target_camera_yaw = float(data.get("yaw", deg_to_rad(45.0)))
	_camera_yaw = _target_camera_yaw
	var placements: Array = data.get("placements", [])
	for entry_variant in placements:
		if typeof(entry_variant) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_variant
		var tool := str(entry.get("tool", ""))
		if tool == "" or not BUILD_TOOL_LABELS.has(tool):
			continue
		var anchor_data: Array = entry.get("anchor", [])
		if anchor_data.size() != 2:
			continue
		var anchor := Vector2i(int(anchor_data[0]), int(anchor_data[1]))
		if tool == BUILD_TOOL_ROAD:
			_mark_road_cell(anchor)
		else:
			var footprint := _tool_footprint(tool)
			var cells := _cells_for_anchor(anchor, footprint)
			var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, footprint), _tool_rotation_y(tool, anchor, footprint))
			_register_placement(anchor, cells, tool, node, int(entry.get("cost", BUILD_TOOL_COSTS.get(tool, 0))))
			if not _action_history.is_empty():
				_action_history.pop_back()
	for road_key in _road_cells.keys():
		var cell := _anchor_key_to_cell(road_key)
		_rebuild_road_at(cell)
		_register_placement(cell, [cell], BUILD_TOOL_ROAD, _road_nodes.get(road_key), int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]))
		if not _action_history.is_empty():
			_action_history.pop_back()
	_loaded_save = true
	_clear_selected_anchor()
	_recalculate_cashflow()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	_update_camera(true)
	if _hint_label:
		_hint_label.text = "Saved town loaded."


func _new_map() -> void:
	_clear_map_data()
	_money = 25000
	_day = 1
	_simulation_clock = 0.0
	_build_tool = BUILD_TOOL_ROAD
	_loaded_save = false
	_reset_camera_view()
	_recalculate_cashflow()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	if _hint_label:
		_hint_label.text = "Fresh map ready. Start with roads, then place homes and town buildings."


func _clear_map_data() -> void:
	for node_variant in _road_nodes.values():
		var node: Node3D = node_variant
		if is_instance_valid(node):
			node.queue_free()
	for placement_variant in _placements.values():
		var placement: Dictionary = placement_variant
		if placement["tool"] == BUILD_TOOL_ROAD:
			continue
		var building: Node3D = placement["node"]
		if is_instance_valid(building):
			building.queue_free()
	_occupied_cells.clear()
	_placed_nodes.clear()
	_placements.clear()
	_cell_anchor_lookup.clear()
	_road_cells.clear()
	_road_nodes.clear()
	_action_history.clear()
	_clear_selected_anchor()
	_reset_nature_layer()


func _reset_nature_layer() -> void:
	for patch in _meadow_patches:
		if is_instance_valid(patch):
			patch.queue_free()
	_meadow_patches.clear()
	for clump in _grass_clumps:
		if is_instance_valid(clump):
			clump.queue_free()
	_grass_clumps.clear()
	_build_meadow()


func _clear_nature_for_cells(cells: Array[Vector2i]) -> void:
	for cell in cells:
		var world_center := _cell_to_world(cell)
		for i in range(_grass_clumps.size() - 1, -1, -1):
			var clump := _grass_clumps[i]
			if not is_instance_valid(clump):
				_grass_clumps.remove_at(i)
				continue
			if Vector2(clump.position.x, clump.position.z).distance_to(Vector2(world_center.x, world_center.z)) < 0.72:
				clump.queue_free()
				_grass_clumps.remove_at(i)
		for j in range(_meadow_patches.size() - 1, -1, -1):
			var patch := _meadow_patches[j]
			if not is_instance_valid(patch):
				_meadow_patches.remove_at(j)
				continue
			var radius: float = float(patch.get_meta("radius", 1.0))
			if Vector2(patch.position.x, patch.position.z).distance_to(Vector2(world_center.x, world_center.z)) < radius:
				patch.queue_free()
				_meadow_patches.remove_at(j)


func _update_day_night_visuals() -> void:
	var cycle := fmod(float(_day - 1) + _simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var warm_strength: float = clampf(0.52 + sun_wave * 0.34, 0.18, 0.92)
	var sky_top: Color = Color(0.22, 0.36, 0.52).lerp(Color(0.93, 0.62, 0.35), warm_strength * 0.75)
	var sky_horizon: Color = Color(0.74, 0.82, 0.88).lerp(Color(0.98, 0.8, 0.55), warm_strength * 0.82)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_COLOR
		env.background_color = sky_horizon
		env.ambient_light_color = sky_top.lerp(Color(1.0, 0.92, 0.82), 0.38)
		env.ambient_light_energy = 0.6 + warm_strength * 0.36
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.45 + warm_strength * 0.32
		env.fog_density = 0.005
	if sun:
		sun.light_color = Color(1.0, 0.84, 0.66).lerp(Color(1.0, 0.66, 0.42), warm_strength * 0.7)
		sun.light_energy = 0.85 + warm_strength * 0.85
		sun.rotation_degrees = Vector3(-48.0 - warm_strength * 18.0, -32.0, 0.0)
	if fill_light:
		fill_light.light_color = Color(0.78, 0.88, 1.0).lerp(Color(1.0, 0.78, 0.58), warm_strength * 0.5)
		fill_light.light_energy = 0.35 + warm_strength * 0.4

	for band in _window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.1 + (1.0 - warm_strength) * 0.75


func _spawn_road_tile(world_position: Vector3, preview: bool) -> Node3D:
	var cell := _world_to_cell(world_position)
	var extra := [cell]
	for neighbor in _neighbor_cells(cell):
		if _road_cells.has(_cell_key(neighbor)):
			extra.append(neighbor)
	var root := _build_road_tile_mesh(cell, preview, extra)
	root.position = world_position
	return root


func _spawn_house_tile(world_position: Vector3, preview: bool) -> Node3D:
	var root := Node3D.new()
	root.position = world_position
	var wall_material: Material = _ghost_base_material if preview else _make_material("f1e6d4", 0.86)
	var roof_material: Material = _ghost_accent_material if preview else _make_material("b97554", 0.74)
	var pad_material: Material = _ghost_base_material if preview else _make_material("d7d8cf", 0.88)

	_add_box(Vector3(0.0, 0.02, 0.1), Vector3(1.78, 0.04, 1.58), pad_material, root)
	_add_box(Vector3(0.0, 0.5, -0.04), Vector3(1.34, 0.92, 1.18), wall_material, root)
	_add_box(Vector3(0.34, 0.42, 0.42), Vector3(0.52, 0.66, 0.58), wall_material, root)
	var roof_a := _add_box(Vector3(0.0, 1.0, 0.08), Vector3(1.52, 0.16, 0.74), roof_material, root)
	var roof_b := _add_box(Vector3(0.0, 1.0, -0.24), Vector3(1.52, 0.16, 0.74), roof_material, root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -7.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 7.0)
	_add_round_canopy(Vector3(0.0, 0.24, 0.84), Vector3(0.64, 0.12, 0.18), _ghost_accent_material if preview else _window_material, root)
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


func _make_glass_panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.11, 0.16, 0.34)
	style.border_color = Color(0.94, 0.98, 1.0, 0.16)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_right = 20
	style.corner_radius_bottom_left = 20
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.18)
	style.shadow_size = 18
	style.content_margin_left = 12
	style.content_margin_top = 10
	style.content_margin_right = 12
	style.content_margin_bottom = 10
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


func _build_nature() -> void:
	for tree_pos in [
		Vector3(-6.7, 0.18, -5.5),
		Vector3(-6.4, 0.18, 5.8),
		Vector3(6.45, 0.18, -5.5),
		Vector3(6.55, 0.18, 5.8),
		Vector3(-2.8, 0.18, 5.7),
		Vector3(4.5, 0.18, 5.8),
		Vector3(-3.9, 0.18, -5.95),
		Vector3(3.9, 0.18, -5.95),
		Vector3(-7.1, 0.18, -1.2),
		Vector3(7.0, 0.18, 1.3)
	]:
		_add_tree(tree_pos)

	for park_pos in [
		Vector3(-5.2, 0.04, -1.4),
		Vector3(5.0, 0.04, 1.8),
		Vector3(0.0, 0.04, 4.9)
	]:
		_add_park_corner(park_pos)

	for flower_pos in [
		Vector3(-2.25, 0.08, 3.55),
		Vector3(2.55, 0.08, 3.45),
		Vector3(-4.9, 0.08, -4.0),
		Vector3(4.6, 0.08, -4.4)
	]:
		_add_flower_patch(flower_pos, 7, _flower_material_pink if flower_pos.x < 0.0 else _flower_material_blue)


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
	var width := 1.34 + float(variant % 3) * 0.12
	var depth := 1.22 + float(int(variant / 3) % 2) * 0.14
	var height := 0.94 + float(int(variant / 5)) * 0.12
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_town_path(Vector3(0.0, 0.02, 0.78), Vector2(width * 0.34, 0.72), root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.06, -0.08), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), root, 0.18)
	_add_soft_block(Vector3(width * 0.26, 0.54, 0.34), Vector3(width * 0.42, height * 0.62, depth * 0.46), _make_material_from_color(palette.wall.darkened(0.03), 0.9), root, 0.14)
	_add_gabled_roof(Vector3(0.0, height + 0.2, -0.08), Vector3(width + 0.18, 0.2, depth + 0.24), _make_material_from_color(palette.roof, 0.78), root, 12.0)
	_add_gabled_roof(Vector3(width * 0.26, 0.92, 0.34), Vector3(width * 0.48, 0.16, depth * 0.54), _make_material_from_color(palette.roof.lightened(0.05), 0.78), root, 11.0)
	_add_round_canopy(Vector3(0.0, 0.2, 0.82), Vector3(width * 0.42, 0.12, 0.18), _make_material_from_color(palette.accent, 0.5), root)
	_add_box(Vector3(0.0, 0.2, 0.54), Vector3(width * 0.18, 0.34, 0.06), _window_material, root)
	_add_box(Vector3(-width * 0.28, 0.38, 0.48), Vector3(0.16, 0.28, 0.05), _window_material, root)
	_add_box(Vector3(width * 0.28, 0.38, 0.48), Vector3(0.16, 0.28, 0.05), _window_material, root)
	_add_box(Vector3(-width * 0.28, 0.42, -0.44), Vector3(0.16, 0.24, 0.05), _window_material, root)
	_add_box(Vector3(width * 0.1, 0.42, -0.44), Vector3(0.22, 0.24, 0.05), _window_material, root)
	_add_box(Vector3(0.0, 0.08, 0.68), Vector3(width * 0.32, 0.08, 0.34), _make_material_from_color(palette.trim, 0.86), root)
	_add_box(Vector3(-width * 0.26, 0.28, 0.8), Vector3(0.12, 0.2, 0.12), _make_material_from_color(palette.trim, 0.86), root)
	_add_box(Vector3(width * 0.26, 0.28, 0.8), Vector3(0.12, 0.2, 0.12), _make_material_from_color(palette.trim, 0.86), root)
	_add_box(Vector3(0.0, 0.6, -depth * 0.1), Vector3(width * 0.12, 0.54, depth * 0.05), _make_material_from_color(palette.trim, 0.84), root)
	if variant % 2 == 0:
		_add_box(Vector3(width * 0.3, height + 0.46, -depth * 0.14), Vector3(0.16, 0.46, 0.16), _stone_material, root)
	_add_shrub_cluster(Vector3(-width * 0.42, 0.0, 0.96), palette.accent, root, 3)
	_add_shrub_cluster(Vector3(width * 0.42, 0.0, 0.96), palette.trim, root, 3)
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


func _add_park_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("grocery", variant)
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(1.86, 0.05, 1.86), _make_material("86a65c", 0.96), root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(1.54, 0.03, 0.24), _make_material("d8c7ab", 0.9), root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.24, 0.03, 1.54), _make_material("d8c7ab", 0.9), root)
	_add_local_sphere(Vector3(0.0, 0.08, 0.0), 0.17, 0.08, _make_material_from_color(palette.accent, 0.44), root)
	_add_bench_local(Vector3(-0.42, 0.0, 0.0), PI * 0.5, root)
	_add_bench_local(Vector3(0.42, 0.0, 0.0), -PI * 0.5, root)
	_add_local_tree(Vector3(-0.54, 0.0, -0.52), root)
	_add_local_tree(Vector3(0.56, 0.0, 0.5), root)
	_add_local_flower_patch(Vector3(0.48, 0.05, -0.44), 4, _make_material_from_color(palette.trim, 0.8), root)
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
	patch.set_meta("radius", max(size.x, size.y) * 0.52)
	grid_root.add_child(patch)
	_meadow_patches.append(patch)

	for i in range(clump_count):
		var t: float = float(i) / maxf(1.0, float(clump_count))
		var local_x: float = (sin(t * TAU * 1.7) * 0.5 + randf_range(-0.22, 0.22)) * size.x * 0.38
		var local_z: float = (cos(t * TAU * 1.3) * 0.5 + randf_range(-0.22, 0.22)) * size.y * 0.38
		_add_grass_clump(center + Vector3(local_x, 0.05, local_z), randf_range(0.85, 1.25))


func _place_road_strip(origin: Vector3, count: int, horizontal: bool) -> void:
	for i in range(count):
		var offset := float(i) - float(count - 1) * 0.5
		var world := origin + (Vector3(offset, 0.0, 0.0) if horizontal else Vector3(0.0, 0.0, offset))
		_mark_road_cell(_world_to_cell(world))

	for i in range(count):
		var offset := float(i) - float(count - 1) * 0.5
		var world := origin + (Vector3(offset, 0.0, 0.0) if horizontal else Vector3(0.0, 0.0, offset))
		_rebuild_road_at(_world_to_cell(world))


func _world_to_cell(world_position: Vector3) -> Vector2i:
	var grid_half := float(GRID_SIZE) * 0.5
	return Vector2i(
		int(round(world_position.x + grid_half - 0.5)),
		int(round(world_position.z + grid_half - 0.5))
	)


func _rebuild_road_at(cell: Vector2i) -> void:
	var key := _cell_key(cell)
	if not _road_cells.has(key):
		return
	if _road_nodes.has(key):
		var existing: Node3D = _road_nodes[key]
		if is_instance_valid(existing):
			existing.queue_free()
	var road := _build_road_tile_mesh(cell, false)
	road.position = _cell_to_world(cell)
	grid_root.add_child(road)
	_road_nodes[key] = road
	_placed_nodes[key] = road


func _build_road_tile_mesh(cell: Vector2i, preview: bool, road_source: Array = []) -> Node3D:
	var root := Node3D.new()
	var curb_material: Material = _ghost_base_material if preview else _sidewalk_material
	var road_material: Material = _ghost_accent_material if preview else _road_material
	var lane_material: Material = _ghost_base_material if preview else _road_mark_material
	var source := road_source if road_source.size() > 0 else [cell]

	_add_box(Vector3(0.0, 0.012, 0.0), Vector3(0.98, 0.024, 0.98), curb_material, root)
	_add_box(Vector3(0.0, 0.03, 0.0), Vector3(0.42, 0.03, 0.42), road_material, root)

	var north := _road_in_source(Vector2i(cell.x, cell.y - 1), source)
	var east := _road_in_source(Vector2i(cell.x + 1, cell.y), source)
	var south := _road_in_source(Vector2i(cell.x, cell.y + 1), source)
	var west := _road_in_source(Vector2i(cell.x - 1, cell.y), source)

	if north:
		_add_box(Vector3(0.0, 0.03, -0.2), Vector3(0.42, 0.03, 0.58), road_material, root)
	if south:
		_add_box(Vector3(0.0, 0.03, 0.2), Vector3(0.42, 0.03, 0.58), road_material, root)
	if east:
		_add_box(Vector3(0.2, 0.03, 0.0), Vector3(0.58, 0.03, 0.42), road_material, root)
	if west:
		_add_box(Vector3(-0.2, 0.03, 0.0), Vector3(0.58, 0.03, 0.42), road_material, root)
	if not north and not south and not east and not west:
		_add_box(Vector3(0.0, 0.03, 0.0), Vector3(0.72, 0.03, 0.72), road_material, root)

	var vertical_straight := north and south and not east and not west
	var horizontal_straight := east and west and not north and not south
	if vertical_straight:
		_add_box(Vector3(0.0, 0.055, 0.0), Vector3(0.06, 0.01, 0.74), lane_material, root)
	elif horizontal_straight:
		_add_box(Vector3(0.0, 0.055, 0.0), Vector3(0.74, 0.01, 0.06), lane_material, root)

	return root


func _road_in_source(cell: Vector2i, road_source: Array) -> bool:
	for item in road_source:
		if item == cell:
			return true
	return _road_cells.has(_cell_key(cell))


func _tool_rotation_y(tool: String, anchor: Vector2i, footprint: Vector2i) -> float:
	if tool == BUILD_TOOL_ROAD:
		return 0.0

	var north_score := _transport_edge_score(anchor, footprint, "north")
	var east_score := _transport_edge_score(anchor, footprint, "east")
	var south_score := _transport_edge_score(anchor, footprint, "south")
	var west_score := _transport_edge_score(anchor, footprint, "west")

	var best: int = maxi(maxi(north_score, south_score), maxi(east_score, west_score))
	if best > 0:
		if south_score == best:
			return 0.0
		if north_score == best:
			return PI
		if east_score == best:
			return -PI * 0.5
		return PI * 0.5

	var facing: Variant = _rotation_toward_nearest_transport(anchor, footprint)
	if facing != null:
		return facing

	var center := _anchor_to_world(anchor, footprint)
	var to_center := Vector2(-center.x, -center.z)
	if abs(to_center.x) > abs(to_center.y):
		return -PI * 0.5 if to_center.x > 0.0 else PI * 0.5
	return 0.0 if to_center.y > 0.0 else PI


func _transport_edge_score(anchor: Vector2i, footprint: Vector2i, side: String) -> int:
	var score := 0
	match side:
		"north":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y - 1))):
					score += 3
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y - 2))):
					score += 1
		"south":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y + footprint.y))):
					score += 3
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y + footprint.y + 1))):
					score += 1
		"west":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x - 1, anchor.y + dz))):
					score += 3
				if _road_cells.has(_cell_key(Vector2i(anchor.x - 2, anchor.y + dz))):
					score += 1
		"east":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + footprint.x, anchor.y + dz))):
					score += 3
				if _road_cells.has(_cell_key(Vector2i(anchor.x + footprint.x + 1, anchor.y + dz))):
					score += 1
	return score


func _rotation_toward_nearest_transport(anchor: Vector2i, footprint: Vector2i) -> Variant:
	if _road_cells.is_empty():
		return null
	var center := _anchor_to_world(anchor, footprint)
	var nearest_distance := INF
	var nearest_direction := Vector2.ZERO
	for road_key in _road_cells.keys():
		var road_cell := _anchor_key_to_cell(road_key)
		var road_world := _cell_to_world(road_cell)
		var offset := Vector2(road_world.x - center.x, road_world.z - center.z)
		var distance := offset.length()
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_direction = offset
	if nearest_distance == INF:
		return null
	if abs(nearest_direction.x) > abs(nearest_direction.y):
		return -PI * 0.5 if nearest_direction.x > 0.0 else PI * 0.5
	return 0.0 if nearest_direction.y > 0.0 else PI


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
	_nature_root.add_child(clump)
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


func _add_bench_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var seat_material := _make_material("a57649", 0.72)
	var bench := _add_box(position_3d + Vector3(0.0, 0.14, 0.0), Vector3(0.48, 0.08, 0.18), seat_material, parent)
	bench.rotation_degrees.y = rotation_y
	var back := _add_box(position_3d + Vector3(0.0, 0.28, -0.07), Vector3(0.48, 0.18, 0.06), seat_material, parent)
	back.rotation_degrees.y = rotation_y


func _add_local_tree(position_3d: Vector3, parent: Node) -> void:
	_add_local_cylinder(position_3d + Vector3(0.0, 0.34, 0.0), 0.11, 0.08, 0.68, _trunk_material, parent)
	_add_local_sphere(position_3d + Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material, parent)
	_add_local_sphere(position_3d + Vector3(-0.2, 0.84, 0.0), 0.34, 0.66, _leaf_material, parent)
	_add_local_sphere(position_3d + Vector3(0.22, 0.84, -0.08), 0.3, 0.58, _leaf_material, parent)


func _add_local_flower_patch(center: Vector3, count: int, material: StandardMaterial3D, parent: Node) -> void:
	for i in range(count):
		var offset_x := (float(i % 3) - 1.0) * 0.14
		var offset_z := (float(i / 3) - 0.5) * 0.14
		_add_box(center + Vector3(offset_x, 0.05, offset_z), Vector3(0.08, 0.08, 0.08), material, parent)


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
	_camera_yaw = lerp_angle(_camera_yaw, _target_camera_yaw, 0.18 if not force else 1.0)
	var orbit := Vector3(_zoom * 0.92, _zoom * 0.74, _zoom * 0.86).rotated(Vector3.UP, _camera_yaw)
	camera_rig.position = _focus
	camera.position = orbit
	camera.look_at(_focus + Vector3(0.0, 0.55, 0.0), Vector3.UP)
