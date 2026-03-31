extends Node3D

const GRID_SIZE := 64
const TILE_SIZE := 1.0
const PAN_SPEED := 0.018
const STARTING_MONEY := 500000
const DEFAULT_ZOOM := 34.0
const MIN_ZOOM := 14.0
const MAX_ZOOM := 72.0
const BUILD_TOOL_ROAD := "road"
const BUILD_TOOL_HOUSE := "house"
const BUILD_TOOL_FIRE := "fire"
const BUILD_TOOL_BANK := "bank"
const BUILD_TOOL_GROCERY := "grocery"
const BUILD_TOOL_RESTAURANT := "restaurant"
const BUILD_TOOL_CORNER_STORE := "corner_store"
const BUILD_TOOL_PARK := "park"
const BUILD_TOOL_POND_SMALL := "pond_small"
const BUILD_TOOL_POND_MEDIUM := "pond_medium"
const BUILD_TOOL_POND_LARGE := "pond_large"
const BUILD_TOOL_FOREST_SMALL := "forest_small"
const BUILD_TOOL_FOREST_MEDIUM := "forest_medium"
const BUILD_TOOL_FOREST_LARGE := "forest_large"
const BUILD_TOOL_INSPECT := "inspect"
const BUILD_TOOL_BULLDOZE := "bulldoze"
const BUILD_TOOL_SEQUENCE := [
	BUILD_TOOL_ROAD,
	BUILD_TOOL_HOUSE,
	BUILD_TOOL_FIRE,
	BUILD_TOOL_BANK,
	BUILD_TOOL_GROCERY,
	BUILD_TOOL_RESTAURANT,
	BUILD_TOOL_CORNER_STORE,
	BUILD_TOOL_PARK,
	BUILD_TOOL_POND_SMALL,
	BUILD_TOOL_POND_MEDIUM,
	BUILD_TOOL_POND_LARGE,
	BUILD_TOOL_FOREST_SMALL,
	BUILD_TOOL_FOREST_MEDIUM,
	BUILD_TOOL_FOREST_LARGE,
	BUILD_TOOL_INSPECT,
	BUILD_TOOL_BULLDOZE,
]
const BUILD_TOOL_LABELS := {
	BUILD_TOOL_ROAD: "Road",
	BUILD_TOOL_HOUSE: "House",
	BUILD_TOOL_FIRE: "Fire",
	BUILD_TOOL_BANK: "Bank",
	BUILD_TOOL_GROCERY: "Grocery",
	BUILD_TOOL_RESTAURANT: "Restaurant",
	BUILD_TOOL_CORNER_STORE: "Corner Store",
	BUILD_TOOL_PARK: "Park",
	BUILD_TOOL_POND_SMALL: "Small Pond",
	BUILD_TOOL_POND_MEDIUM: "Medium Pond",
	BUILD_TOOL_POND_LARGE: "Large Lake",
	BUILD_TOOL_FOREST_SMALL: "Small Forest",
	BUILD_TOOL_FOREST_MEDIUM: "Medium Forest",
	BUILD_TOOL_FOREST_LARGE: "Large Forest",
	BUILD_TOOL_INSPECT: "Inspect",
	BUILD_TOOL_BULLDOZE: "Bulldoze",
}
const BUILD_TOOL_COSTS := {
	BUILD_TOOL_ROAD: 20,
	BUILD_TOOL_HOUSE: 700,
	BUILD_TOOL_FIRE: 2600,
	BUILD_TOOL_BANK: 1900,
	BUILD_TOOL_GROCERY: 1650,
	BUILD_TOOL_RESTAURANT: 1500,
	BUILD_TOOL_CORNER_STORE: 1200,
	BUILD_TOOL_PARK: 500,
	BUILD_TOOL_POND_SMALL: 260,
	BUILD_TOOL_POND_MEDIUM: 420,
	BUILD_TOOL_POND_LARGE: 640,
	BUILD_TOOL_FOREST_SMALL: 240,
	BUILD_TOOL_FOREST_MEDIUM: 380,
	BUILD_TOOL_FOREST_LARGE: 560,
}
const FRONTAGE_ROTATIONS := {
	"south": 0.0,
	"north": PI,
	"east": PI * 0.5,
	"west": -PI * 0.5,
}
const BUILDING_FRONT_ROTATION_OFFSETS := {
	BUILD_TOOL_HOUSE: 0.0,
	BUILD_TOOL_FIRE: 0.0,
	BUILD_TOOL_BANK: 0.0,
	BUILD_TOOL_GROCERY: 0.0,
	BUILD_TOOL_RESTAURANT: 0.0,
	BUILD_TOOL_CORNER_STORE: 0.0,
}
const BUILDING_MAX_TIERS := {
	BUILD_TOOL_HOUSE: 4,
	BUILD_TOOL_FIRE: 4,
	BUILD_TOOL_BANK: 4,
	BUILD_TOOL_GROCERY: 4,
	BUILD_TOOL_RESTAURANT: 4,
	BUILD_TOOL_CORNER_STORE: 4,
	BUILD_TOOL_PARK: 4,
}
const SCENIC_TOOL_SPECS := {
	BUILD_TOOL_POND_SMALL: {"label": "Small Pond", "footprint": Vector2i(3, 3), "kind": "pond", "water_size": Vector2(1.72, 1.64), "shore_size": Vector2(2.18, 2.04), "cost": 260, "appeal": 6},
	BUILD_TOOL_POND_MEDIUM: {"label": "Medium Pond", "footprint": Vector2i(4, 4), "kind": "pond", "water_size": Vector2(2.16, 1.96), "shore_size": Vector2(2.72, 2.46), "cost": 420, "appeal": 10},
	BUILD_TOOL_POND_LARGE: {"label": "Large Lake", "footprint": Vector2i(5, 5), "kind": "pond", "water_size": Vector2(2.62, 2.42), "shore_size": Vector2(3.26, 3.0), "cost": 640, "appeal": 16},
	BUILD_TOOL_FOREST_SMALL: {"label": "Small Forest", "footprint": Vector2i(4, 4), "kind": "forest", "tree_count": 6, "cost": 240, "appeal": 8},
	BUILD_TOOL_FOREST_MEDIUM: {"label": "Medium Forest", "footprint": Vector2i(5, 5), "kind": "forest", "tree_count": 10, "cost": 380, "appeal": 12},
	BUILD_TOOL_FOREST_LARGE: {"label": "Large Forest", "footprint": Vector2i(6, 6), "kind": "forest", "tree_count": 15, "cost": 560, "appeal": 18},
}
const SAVE_PATH := "user://cozy_builder_save.json"
const MUSIC_STREAM_PATH := "res://assets/audio/Sunrise Over Tiny Blocks (2).mp3"
const AMBIENT_LIGHT_PRESETS := [
	{"label": "Ambient Base", "scale": 1.0},
	{"label": "Ambient +60%", "scale": 1.6},
	{"label": "Ambient +120%", "scale": 2.2},
	{"label": "Ambient +180%", "scale": 2.8},
	{"label": "Ambient +240%", "scale": 3.4},
	{"label": "Ambient +300%", "scale": 4.0},
]
const PROPERTY_FRONT_SETBACK := 1.0
const PROPERTY_FRONT_SETBACK_BY_TOOL := {
	BUILD_TOOL_HOUSE: 0.95,
	BUILD_TOOL_FIRE: 1.18,
	BUILD_TOOL_BANK: 1.16,
	BUILD_TOOL_GROCERY: 1.12,
	BUILD_TOOL_RESTAURANT: 1.1,
	BUILD_TOOL_CORNER_STORE: 1.08,
}
const PROPERTY_LOT_SETBACK_BY_TOOL := {
	BUILD_TOOL_HOUSE: 0.58,
	BUILD_TOOL_FIRE: 0.56,
	BUILD_TOOL_BANK: 0.56,
	BUILD_TOOL_GROCERY: 0.58,
	BUILD_TOOL_RESTAURANT: 0.56,
	BUILD_TOOL_CORNER_STORE: 0.54,
}
const PROPERTY_BUFFER_BY_TOOL := {
	BUILD_TOOL_HOUSE: 1,
	BUILD_TOOL_FIRE: 0,
	BUILD_TOOL_BANK: 0,
	BUILD_TOOL_GROCERY: 0,
	BUILD_TOOL_RESTAURANT: 0,
	BUILD_TOOL_CORNER_STORE: 0,
	BUILD_TOOL_PARK: 1,
}
const SIDEWALK_ROUTE_OFFSET := 1.96
const HOUSE_FRONT_BUFFER_CELLS := 1
const PropertyUpgradeData = preload("res://scripts/property_upgrade_data.gd")
const DEBUG_UPGRADES := false

@onready var grid_root: Node3D = $GridRoot
@onready var building_root: Node3D = $BuildingRoot
@onready var camera_controller: Node3D = $CameraController
@onready var camera: Camera3D = $CameraController/Camera3D
@onready var lighting_controller: Node3D = $LightingController
@onready var world_environment: WorldEnvironment = $LightingController/WorldEnvironment
@onready var sun: DirectionalLight3D = $LightingController/Sun
@onready var fill_light: DirectionalLight3D = $LightingController/FillLight

var _focus := Vector3(0.0, 0.0, 0.0)
var _target_focus := Vector3(0.0, 0.0, 0.0)
var _zoom := DEFAULT_ZOOM
var _target_zoom := DEFAULT_ZOOM
var _camera_yaw := deg_to_rad(45.0)
var _target_camera_yaw := deg_to_rad(45.0)
var _dragging := false
var _right_mouse_down := false
var _right_drag_moved := false
var _right_drag_origin := Vector2.ZERO
var _painting_bulldoze := false
var _bulldoze_visited: Dictionary = {}
var _road_line_active := false
var _road_line_start := Vector2i(-1, -1)
var _build_tool := BUILD_TOOL_ROAD
var _hovered_cell := Vector2i(-1, -1)
var _hover_anchor := Vector2i(-1, -1)
var _hover_cells: Array[Vector2i] = []
var _hover_frontage_side := "south"
var _hover_active := false
var _hover_can_build := false
var _selected_anchor_key := ""
var _selected_tile := Vector2i(-1, -1)
var _selection_cells: Array[Vector2i] = []
var _money := STARTING_MONEY
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
var _road_light_nodes: Dictionary = {}
var _action_history: Array[Dictionary] = []
var _variant_cycle: Dictionary = {}
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
var _street_lamp_bulb_material: StandardMaterial3D
var _leaf_material: StandardMaterial3D
var _trunk_material: StandardMaterial3D
var _flower_material_pink: StandardMaterial3D
var _flower_material_blue: StandardMaterial3D
var _meadow_material: StandardMaterial3D
var _grass_blade_material: StandardMaterial3D
var _soft_shadow_material: StandardMaterial3D
var _hover_material_valid: StandardMaterial3D
var _hover_material_invalid: StandardMaterial3D
var _ghost_base_material: StandardMaterial3D
var _ghost_accent_material: StandardMaterial3D
var _lamp_glow_texture: Texture2D

var _clouds: Array[Node3D] = []
var _window_bands: Array[MeshInstance3D] = []
var _grass_clumps: Array[Node3D] = []
var _road_preview_nodes: Array[Node3D] = []
var _nature_features: Array[Node3D] = []
var _hover_tiles: Array[MeshInstance3D] = []
var _meadow_patches: Array[MeshInstance3D] = []
var _ambient_cars: Array[Node3D] = []
var _ambient_trolleys: Array[Node3D] = []
var _ambient_people: Array[Node3D] = []
var _hover_root: Node3D
var _ghost_root: Node3D
var _ghost_nodes: Dictionary = {}
var _road_lights_root: Node3D
var _life_root: Node3D
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
var _upgrade_button: Button
var _undo_button: Button
var _zoom_in_button: Button
var _zoom_out_button: Button
var _nature_root: Node3D
var _music_player: AudioStreamPlayer
var _music_button: Button
var _ambient_dropdown: OptionButton
var _ambient_light_scale := 1.0
var _music_enabled := true


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


func _pan_limit() -> float:
	return float(GRID_SIZE) * 0.46


func _process(delta: float) -> void:
	_focus = _focus.lerp(_target_focus, min(1.0, delta * 7.0))
	_zoom = lerp(_zoom, _target_zoom, min(1.0, delta * 6.5))
	_animate_clouds(delta)
	_animate_windows()
	_animate_grass()
	_animate_life(delta)
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
				_set_build_tool(BUILD_TOOL_FIRE)
			KEY_4:
				_set_build_tool(BUILD_TOOL_BANK)
			KEY_5:
				_set_build_tool(BUILD_TOOL_GROCERY)
			KEY_6:
				_set_build_tool(BUILD_TOOL_RESTAURANT)
			KEY_7:
				_set_build_tool(BUILD_TOOL_CORNER_STORE)
			KEY_8:
				_set_build_tool(BUILD_TOOL_PARK)
			KEY_P:
				_set_build_tool(BUILD_TOOL_POND_SMALL)
			KEY_9:
				_set_build_tool(BUILD_TOOL_INSPECT)
			KEY_0:
				_set_build_tool(BUILD_TOOL_BULLDOZE)
			KEY_U:
				_upgrade_selected_property()
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
				if _build_tool == BUILD_TOOL_ROAD and _road_line_active:
					_cancel_road_line()
					_refresh_tool_ui()
					_update_hover_from_mouse()
					return
				_exit_fullscreen()
				_clear_hover()
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_MIDDLE:
			_dragging = event.pressed
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				_right_mouse_down = true
				_right_drag_moved = false
				_right_drag_origin = event.position
				_dragging = true
			else:
				_dragging = false
				if _right_mouse_down and not _right_drag_moved and not _is_pointer_over_hud():
					_cancel_tool_and_select_at_mouse(event.position)
				_right_mouse_down = false
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and not _is_pointer_over_hud():
				if _build_tool == BUILD_TOOL_BULLDOZE:
					_painting_bulldoze = true
					_bulldoze_visited.clear()
				_try_place_hovered_tile()
			else:
				_painting_bulldoze = false
				_bulldoze_visited.clear()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_target_zoom = max(MIN_ZOOM, _target_zoom - 1.15)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_target_zoom = min(MAX_ZOOM, _target_zoom + 1.15)
	elif event is InputEventMouseMotion and _dragging:
		if _right_mouse_down and event.position.distance_to(_right_drag_origin) > 6.0:
			_right_drag_moved = true
		var right := Vector3.RIGHT.rotated(Vector3.UP, _target_camera_yaw)
		var forward := Vector3.FORWARD.rotated(Vector3.UP, _target_camera_yaw)
		var pan_delta: Vector3 = (-right * event.relative.x + forward * event.relative.y) * PAN_SPEED
		_target_focus += Vector3(pan_delta.x, 0.0, pan_delta.z)
		var pan_limit := _pan_limit()
		_target_focus.x = clamp(_target_focus.x, -pan_limit, pan_limit)
		_target_focus.z = clamp(_target_focus.z, -pan_limit, pan_limit)
	elif event is InputEventMouseMotion and _painting_bulldoze and _build_tool == BUILD_TOOL_BULLDOZE and not _is_pointer_over_hud():
		_try_place_hovered_tile()


func _build_materials() -> void:
	_ground_material_a = _make_material("7d8753", 0.98)
	_ground_material_b = _make_material("6f784a", 0.98)
	_ground_material_c = _make_material("95a16a", 0.98)
	_soil_material = _make_material("5c4631", 0.99)
	_stone_material = _make_material("d8c8b6", 0.94)
	_water_material = _make_material("587f92", 0.34, 0.0, true, "d5f0f6", 0.12)
	_road_material = _make_material("474b53", 0.98)
	_road_mark_material = _make_material("e0be57", 0.82)
	_sidewalk_material = _make_material("cdbca4", 0.94)
	_window_material = _make_material("ffb85b", 0.16, 0.0, true, "ffd18a", 0.14)
	_street_lamp_bulb_material = _make_material("fff4d8", 0.04, 0.0, true, "ffe7a8", 0.38)
	_leaf_material = _make_material("5f7f4a", 0.98)
	_trunk_material = _make_material("6d4d39", 0.94)
	_flower_material_pink = _make_material("d98fae", 0.82)
	_flower_material_blue = _make_material("89afd9", 0.82)
	_meadow_material = _make_material("9ca464", 0.99)
	_grass_blade_material = _make_material("6d8646", 0.98)
	_soft_shadow_material = _make_transparent_material(Color(0.08, 0.06, 0.04, 1.0), 1.0, 0.18)
	_hover_material_valid = _make_transparent_material(Color("76e5c7"), 0.24, 0.34)
	_hover_material_invalid = _make_transparent_material(Color("f29a8d"), 0.24, 0.34)
	_ghost_base_material = _make_transparent_material(Color("f7f0d8"), 0.44, 0.52)
	_ghost_accent_material = _make_transparent_material(Color("78d7c8"), 0.32, 0.5)


func _build_world() -> void:
	_nature_root = Node3D.new()
	building_root.add_child(_nature_root)
	_life_root = Node3D.new()
	building_root.add_child(_life_root)
	_build_water_ring()
	_build_island_base()
	_build_ground_tiles()
	_build_meadow()
	_build_nature()
	_build_clouds()


func _create_runtime_helpers() -> void:
	_hover_root = Node3D.new()
	grid_root.add_child(_hover_root)

	_road_lights_root = Node3D.new()
	grid_root.add_child(_road_lights_root)

	_ghost_root = Node3D.new()
	_ghost_root.visible = false
	add_child(_ghost_root)

	for tool in BUILD_TOOL_SEQUENCE:
		var ghost := _spawn_tool_preview(tool)
		_ghost_nodes[tool] = ghost
		_ghost_root.add_child(ghost)

	_music_player = AudioStreamPlayer.new()
	_music_player.volume_db = -12.0
	add_child(_music_player)
	_load_music_stream()
	if _music_player.stream != null:
		_music_player.play()


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
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
		BUILD_TOOL_PARK,
		BUILD_TOOL_POND_SMALL,
		BUILD_TOOL_POND_MEDIUM,
		BUILD_TOOL_POND_LARGE,
		BUILD_TOOL_FOREST_SMALL,
		BUILD_TOOL_FOREST_MEDIUM,
		BUILD_TOOL_FOREST_LARGE,
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

	_upgrade_button = Button.new()
	_upgrade_button.text = "Upgrade"
	_upgrade_button.custom_minimum_size = Vector2(86, 0)
	_upgrade_button.pressed.connect(_upgrade_selected_property)
	top_row.add_child(_upgrade_button)

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

	_ambient_dropdown = OptionButton.new()
	_ambient_dropdown.custom_minimum_size = Vector2(118, 0)
	for preset in AMBIENT_LIGHT_PRESETS:
		var ambient_index := _ambient_dropdown.item_count
		_ambient_dropdown.add_item(str(preset["label"]), ambient_index)
		_ambient_dropdown.set_item_metadata(ambient_index, float(preset["scale"]))
	_ambient_dropdown.item_selected.connect(_on_ambient_dropdown_selected)
	top_row.add_child(_ambient_dropdown)

	_fullscreen_button = Button.new()
	_fullscreen_button.text = "Fullscreen"
	_fullscreen_button.custom_minimum_size = Vector2(92, 0)
	_fullscreen_button.pressed.connect(_toggle_fullscreen)
	top_row.add_child(_fullscreen_button)

	_music_button = Button.new()
	_music_button.text = "Music On"
	_music_button.custom_minimum_size = Vector2(88, 0)
	_music_button.pressed.connect(_toggle_music)
	top_row.add_child(_music_button)

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
	_hint_label.text = "Use the build menu or hotkeys. Q/E rotates. Cmd/Ctrl+Z undoes. Right drag pans."
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
	if _music_button:
		_style_tool_button(_music_button, _music_enabled)
		_music_button.text = "Music On" if _music_enabled else "Music Off"
	if _ambient_dropdown:
		_refresh_ambient_dropdown()
	if _place_button:
		_style_tool_button(_place_button, true)
	if _upgrade_button:
		var can_upgrade := _can_upgrade_selected_property()
		_style_tool_button(_upgrade_button, can_upgrade)
		_upgrade_button.disabled = not can_upgrade
		if _selected_anchor_key != "" and _placements.has(_selected_anchor_key):
			var selected_tool := str(_placements[_selected_anchor_key]["tool"])
			var selected_tier := int(_placements[_selected_anchor_key].get("tier", 1))
			if PropertyUpgradeData.is_upgradeable(selected_tool) and selected_tier < PropertyUpgradeData.max_tier(selected_tool):
				var upgrade_cost := _selected_upgrade_cost()
				_upgrade_button.text = "Upgrade $%d" % upgrade_cost
			else:
				_upgrade_button.text = "Upgrade"
		else:
			_upgrade_button.text = "Upgrade"
		_upgrade_debug("ui refresh selected=%s can_upgrade=%s disabled=%s text=%s" % [
			_selected_anchor_key,
			str(can_upgrade),
			str(_upgrade_button.disabled),
			_upgrade_button.text
		])
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


func _ambient_index_for_scale(scale: float) -> int:
	var best_index := 0
	var best_distance := INF
	for index in range(AMBIENT_LIGHT_PRESETS.size()):
		var preset_scale := float(AMBIENT_LIGHT_PRESETS[index]["scale"])
		var distance := absf(preset_scale - scale)
		if distance < best_distance:
			best_distance = distance
			best_index = index
	return best_index


func _refresh_ambient_dropdown() -> void:
	if not _ambient_dropdown:
		return
	var index := _ambient_index_for_scale(_ambient_light_scale)
	if _ambient_dropdown.get_selected_id() != index:
		_ambient_dropdown.select(index)
	_style_tool_button(_ambient_dropdown, false)


func _set_ambient_light_scale(scale: float) -> void:
	_ambient_light_scale = clampf(scale, 1.0, 4.0)
	_update_day_night_visuals()
	_refresh_tool_ui()


func _on_ambient_dropdown_selected(index: int) -> void:
	if index < 0 or index >= AMBIENT_LIGHT_PRESETS.size():
		return
	_set_ambient_light_scale(float(AMBIENT_LIGHT_PRESETS[index]["scale"]))


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
	if tool != _build_tool:
		_cancel_road_line()
	_build_tool = tool
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _tool_dropdown_label(tool: String) -> String:
	match tool:
		BUILD_TOOL_ROAD:
			return "Build: Road"
		BUILD_TOOL_HOUSE:
			return "Build: House"
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
		BUILD_TOOL_POND_SMALL:
			return "Build: Small Pond"
		BUILD_TOOL_POND_MEDIUM:
			return "Build: Medium Pond"
		BUILD_TOOL_POND_LARGE:
			return "Build: Large Lake"
		BUILD_TOOL_FOREST_SMALL:
			return "Build: Small Forest"
		BUILD_TOOL_FOREST_MEDIUM:
			return "Build: Medium Forest"
		BUILD_TOOL_FOREST_LARGE:
			return "Build: Large Forest"
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


func _load_music_stream() -> void:
	if not is_instance_valid(_music_player):
		return
	if not ResourceLoader.exists(MUSIC_STREAM_PATH):
		_music_player.stream = null
		return
	var stream := load(MUSIC_STREAM_PATH)
	if stream is AudioStreamMP3:
		stream.loop = true
	_music_player.stream = stream


func _toggle_music() -> void:
	if not is_instance_valid(_music_player):
		return
	if _music_player.stream == null:
		_load_music_stream()
	if _music_player.stream == null:
		if _hint_label:
			_hint_label.text = "Music file not found. Expected at %s." % MUSIC_STREAM_PATH
		return
	_music_enabled = not _music_enabled
	if _music_enabled:
		_music_player.play()
	else:
		_music_player.stop()
	_refresh_tool_ui()


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
	if _upgrade_button:
		_upgrade_button.custom_minimum_size = Vector2(86 if compact else 100, 0)
	if _fullscreen_button:
		_fullscreen_button.custom_minimum_size = Vector2(84 if compact else 92, 0)
	if _music_button:
		_music_button.custom_minimum_size = Vector2(82 if compact else 88, 0)
	if _town_menu:
		_town_menu.custom_minimum_size = Vector2(62 if compact else 72, 0)
	if _home_button:
		_home_button.visible = not compact


func _update_hover_from_mouse() -> void:
	if not is_instance_valid(camera):
		return
	var pick := _pick_grid_cell(get_viewport().get_mouse_position())
	var inspect_mode := _build_tool == BUILD_TOOL_INSPECT or _build_tool == BUILD_TOOL_BULLDOZE
	if pick.is_empty():
		if inspect_mode and _selected_anchor_key != "" and _placements.has(_selected_anchor_key):
			_sync_hover_to_selected_placement()
			return
		_clear_hover()
		return

	var cell: Vector2i = pick["cell"]
	var hover_layout := _resolve_hover_layout(_build_tool, cell)
	var footprint: Vector2i = hover_layout.get("footprint", _tool_footprint(_build_tool))
	var anchor: Vector2i = hover_layout.get("anchor", _anchor_for_hover_cell(cell, footprint))
	var cells: Array[Vector2i] = hover_layout.get("cells", _cells_for_anchor(anchor, footprint))
	var world := _anchor_to_world(anchor, footprint)
	var valid := false
	var pointer_over_hud := _is_pointer_over_hud()
	if inspect_mode:
		var found_anchor := _find_anchor_for_cell(cell)
		if found_anchor != "":
			anchor = _anchor_key_to_cell(found_anchor)
			cells = _placement_cells(found_anchor)
			footprint = _footprint_from_cells(cells)
			world = _anchor_to_world(anchor, footprint)
			valid = true
			_set_selected_anchor(found_anchor)
		elif _selected_anchor_key != "":
			_sync_hover_to_selected_placement()
			valid = true
			if DEBUG_UPGRADES:
				_upgrade_debug("inspect hover kept selection cell=%s selected=%s hud=%s" % [str(cell), _selected_anchor_key, str(pointer_over_hud)])
			return
		elif not pointer_over_hud:
			_upgrade_debug("inspect hover cleared selection cell=%s hud=%s selected_before=%s" % [str(cell), str(pointer_over_hud), _selected_anchor_key])
			_clear_selected_anchor()
		elif DEBUG_UPGRADES:
			_upgrade_debug("inspect hover preserved selection over HUD cell=%s selected=%s" % [str(cell), _selected_anchor_key])
	elif _build_tool == BUILD_TOOL_ROAD and _road_line_active and _road_line_start.x >= 0:
		var road_cells := _road_line_cells(_road_line_start, cell)
		valid = _road_line_is_valid(road_cells)
		_hovered_cell = cell
		_hover_anchor = _road_line_start
		_hover_cells = road_cells
		_hover_frontage_side = "south"
		_hover_active = true
		_hover_can_build = valid
		_clear_hover_tiles()
		_update_road_line_preview(road_cells, valid)
		if _ghost_root:
			_ghost_root.visible = false
		if _hint_label:
			if valid:
				_hint_label.text = "Road start set. Click again to place the straight road."
			else:
				_hint_label.text = "That road line is blocked. Pick a clearer end point or right click / Esc to cancel."
		return
	else:
		if _build_tool == BUILD_TOOL_ROAD:
			valid = _road_start_can_be_selected(anchor)
		else:
			valid = _cells_are_buildable(cells, _build_tool)
			var hover_side := str(hover_layout.get("frontage_side", _preferred_frontage_side(_build_tool, anchor, footprint)))
			if valid and _tool_requires_road(_build_tool) and not _placement_has_required_frontage(_build_tool, anchor, footprint, hover_side):
				valid = false
			if BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
				valid = false
		if _build_tool == BUILD_TOOL_ROAD and BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
			valid = false

	_hovered_cell = cell
	_hover_anchor = anchor
	_hover_cells = cells
	_hover_frontage_side = str(hover_layout.get("frontage_side", _preferred_frontage_side(_build_tool, anchor, footprint)))
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
		elif _tool_requires_road(_build_tool):
			_hint_label.text = "%s needs a clear frontage strip and a road just beyond it." % _tool_name(_build_tool)
		else:
			_hint_label.text = "That footprint collides with something already placed. Pick a clearer spot nearby."


func _clear_hover() -> void:
	_hover_active = false
	_hover_can_build = false
	_hover_anchor = Vector2i(-1, -1)
	_hover_cells.clear()
	_clear_hover_tiles()
	_clear_road_line_preview()
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Use the build buttons or keys 1-0 and P, then click or press Space to place. Q/E rotates. Cmd/Ctrl+Z undoes. Right drag pans."


func _sync_hover_to_selected_placement() -> void:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		return
	var placement: Dictionary = _placements[_selected_anchor_key]
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	_hovered_cell = anchor
	_hover_anchor = anchor
	_hover_cells = cells
	_hover_frontage_side = str(placement.get("frontage_side", "south"))
	_hover_active = true
	_hover_can_build = true
	_update_hover_tiles(cells, true)
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Selected %s. Click or press Space to %s it." % [_selection_name(), "inspect" if _build_tool == BUILD_TOOL_INSPECT else "remove"]


func _cancel_road_line() -> void:
	_road_line_active = false
	_road_line_start = Vector2i(-1, -1)
	_clear_road_line_preview()


func _clear_road_line_preview() -> void:
	for node in _road_preview_nodes:
		if is_instance_valid(node):
			node.queue_free()
	_road_preview_nodes.clear()


func _road_line_cells(start_cell: Vector2i, end_cell: Vector2i) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	if start_cell.x < 0 or start_cell.y < 0 or end_cell.x < 0 or end_cell.y < 0:
		return cells
	var horizontal: bool = abs(end_cell.x - start_cell.x) >= abs(end_cell.y - start_cell.y)
	if horizontal:
		var from_x := mini(start_cell.x, end_cell.x)
		var to_x := maxi(start_cell.x, end_cell.x)
		for x in range(from_x, to_x + 1):
			cells.append(Vector2i(x, start_cell.y))
	else:
		var from_y := mini(start_cell.y, end_cell.y)
		var to_y := maxi(start_cell.y, end_cell.y)
		for y in range(from_y, to_y + 1):
			cells.append(Vector2i(start_cell.x, y))
	return cells


func _road_line_is_valid(cells: Array[Vector2i]) -> bool:
	if cells.is_empty():
		return false
	var has_new_tile := false
	for cell in cells:
		if cell.x < 0 or cell.x >= GRID_SIZE or cell.y < 0 or cell.y >= GRID_SIZE:
			return false
		var key := _cell_key(cell)
		if _reserved_cells.has(key):
			return false
		if _occupied_cells.has(key) and not _road_cells.has(key):
			return false
		if not _road_cells.has(key):
			has_new_tile = true
	return has_new_tile


func _road_start_can_be_selected(cell: Vector2i) -> bool:
	if cell.x < 0 or cell.x >= GRID_SIZE or cell.y < 0 or cell.y >= GRID_SIZE:
		return false
	var key := _cell_key(cell)
	if _reserved_cells.has(key):
		return false
	return not _occupied_cells.has(key) or _road_cells.has(key)


func _place_road_line(road_cells: Array[Vector2i]) -> void:
	var changed_cells: Array[Vector2i] = []
	for road_cell in road_cells:
		var road_key := _cell_key(road_cell)
		if not _road_cells.has(road_key):
			changed_cells.append(road_cell)
	if changed_cells.is_empty():
		_cancel_road_line()
		_refresh_tool_ui()
		_update_hover_from_mouse()
		return

	var road_cost := int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]) * changed_cells.size()
	if _money < road_cost:
		_cancel_road_line()
		_refresh_tool_ui()
		_update_hover_from_mouse()
		return

	for road_cell in changed_cells:
		_mark_road_cell(road_cell)

	var affected_cells: Array[Vector2i] = []
	for road_cell in changed_cells:
		affected_cells.append(road_cell)
		for neighbor in _neighbor_cells(road_cell):
			if _road_cells.has(_cell_key(neighbor)):
				affected_cells.append(neighbor)

	_money -= road_cost
	for road_cell in affected_cells:
		_rebuild_road_at(road_cell)

	var road_anchor := changed_cells[0]
	_register_placement(road_anchor, changed_cells, BUILD_TOOL_ROAD, _road_nodes.get(_cell_key(road_anchor)), road_cost, 1, -1)
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_cancel_road_line()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _update_road_line_preview(cells: Array[Vector2i], valid: bool) -> void:
	_clear_road_line_preview()
	for cell in cells:
		var tile := _build_road_tile_mesh(cell, true, cells)
		tile.position = _cell_to_world(cell)
		if not valid:
			_tint_preview_invalid(tile)
		_hover_root.add_child(tile)
		_road_preview_nodes.append(tile)


func _tint_preview_invalid(node: Node) -> void:
	if node is GeometryInstance3D:
		(node as GeometryInstance3D).material_override = _hover_material_invalid
	for child in node.get_children():
		_tint_preview_invalid(child)


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
	if not _hover_active:
		return

	if _build_tool != BUILD_TOOL_BULLDOZE and not _hover_can_build:
		return

	if _build_tool == BUILD_TOOL_INSPECT:
		_refresh_tool_ui()
		return

	if _build_tool == BUILD_TOOL_BULLDOZE:
		var hover_key := _cell_key(_hover_anchor)
		if _road_cells.has(hover_key):
			if _bulldoze_visited.has(hover_key):
				return
			_bulldoze_visited[hover_key] = true
			_remove_road_at_cell(_hover_anchor, true)
			return

		var anchor_key := _find_anchor_for_cell(_hover_anchor)
		if anchor_key == "":
			return
		if _bulldoze_visited.has(anchor_key):
			return
		_bulldoze_visited[anchor_key] = true
		_selected_anchor_key = anchor_key
		_remove_selected_placement(true)
		return

	if _build_tool == BUILD_TOOL_ROAD:
		if not _road_line_active:
			if _hover_anchor.x < 0 or _hover_anchor.y < 0 or not _hover_can_build:
				return
			_road_line_active = true
			_road_line_start = _hover_anchor
			_refresh_tool_ui()
			_update_hover_from_mouse()
			return

		var road_end := _hovered_cell
		if road_end.x < 0 or road_end.y < 0:
			return
		var road_cells := _road_line_cells(_road_line_start, road_end)
		if not _road_line_is_valid(road_cells):
			return
		_place_road_line(road_cells)
		return

	var footprint := _footprint_from_cells(_hover_cells)
	var world := _anchor_to_world(_hover_anchor, footprint)
	var cost := int(BUILD_TOOL_COSTS.get(_build_tool, 0))
	if _money < cost:
		return
	var placed: Node3D
	var tier := 1
	var variant := _next_variant_for_tool(_build_tool)
	var frontage_side := _hover_frontage_side
	placed = _spawn_building_for_tool(_build_tool, world, _tool_rotation_y(_build_tool, _hover_anchor, footprint, frontage_side), tier, variant)

	_clear_nature_for_cells(_hover_cells)
	_money -= cost
	_register_placement(_hover_anchor, _hover_cells, _build_tool, placed, cost, tier, variant, frontage_side)
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_update_hover_from_mouse()
	_refresh_tool_ui()


func _tool_name(tool: String) -> String:
	if BUILD_TOOL_LABELS.has(tool):
		return str(BUILD_TOOL_LABELS[tool])
	if SCENIC_TOOL_SPECS.has(tool):
		return str(SCENIC_TOOL_SPECS[tool].get("label", "Building"))
	return "Building"


func _next_variant_for_tool(tool: String) -> int:
	if tool == BUILD_TOOL_ROAD or not BUILDING_MAX_TIERS.has(tool):
		return -1
	var next_variant := int(_variant_cycle.get(tool, 0))
	_variant_cycle[tool] = posmod(next_variant + 1, 10)
	return next_variant


func _tool_footprint(tool: String) -> Vector2i:
	if SCENIC_TOOL_SPECS.has(tool):
		return SCENIC_TOOL_SPECS[tool]["footprint"]
	match tool:
		BUILD_TOOL_ROAD, BUILD_TOOL_INSPECT, BUILD_TOOL_BULLDOZE:
			return Vector2i(1, 1)
		BUILD_TOOL_HOUSE:
			return Vector2i(5, 5)
		BUILD_TOOL_FIRE, BUILD_TOOL_GROCERY:
			return Vector2i(5, 4)
		BUILD_TOOL_BANK, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE, BUILD_TOOL_PARK:
			return Vector2i(4, 3)
	return Vector2i(4, 3)


func _footprint_for_hover_cell(tool: String, cell: Vector2i) -> Vector2i:
	var base_footprint := _tool_footprint(tool)
	if base_footprint.x == base_footprint.y or not _tool_requires_road(tool):
		return base_footprint
	var provisional_anchor := _anchor_for_hover_cell(cell, base_footprint)
	return _tool_footprint_for_anchor(tool, provisional_anchor)


func _tool_footprint_for_anchor(tool: String, anchor: Vector2i) -> Vector2i:
	var base_footprint := _tool_footprint(tool)
	if base_footprint.x == base_footprint.y or not _tool_requires_road(tool):
		return base_footprint
	var preferred_side := _preferred_frontage_side(tool, anchor, base_footprint)
	if preferred_side == "east" or preferred_side == "west":
		return Vector2i(base_footprint.y, base_footprint.x)
	return base_footprint


func _resolve_hover_layout(tool: String, cell: Vector2i) -> Dictionary:
	var base_footprint := _tool_footprint(tool)
	if tool == BUILD_TOOL_ROAD or tool == BUILD_TOOL_INSPECT or tool == BUILD_TOOL_BULLDOZE:
		var simple_anchor := _anchor_for_hover_cell(cell, base_footprint)
		return {
			"anchor": simple_anchor,
			"footprint": base_footprint,
			"cells": _cells_for_anchor(simple_anchor, base_footprint),
			"frontage_side": "south",
		}

	if not _tool_requires_road(tool):
		var default_anchor := _anchor_for_hover_cell(cell, base_footprint)
		return {
			"anchor": default_anchor,
			"footprint": base_footprint,
			"cells": _cells_for_anchor(default_anchor, base_footprint),
			"frontage_side": "south",
		}

	var candidate_footprints: Array[Vector2i] = [base_footprint]
	var rotated_footprint := Vector2i(base_footprint.y, base_footprint.x)
	if rotated_footprint != base_footprint:
		candidate_footprints.append(rotated_footprint)

	var best_score := -INF
	var best_layout := {}
	var hover_world := _cell_to_world(cell)
	for footprint in candidate_footprints:
		for ay in range(cell.y - footprint.y + 1, cell.y + 1):
			for ax in range(cell.x - footprint.x + 1, cell.x + 1):
				if ax < 0 or ay < 0 or ax + footprint.x > GRID_SIZE or ay + footprint.y > GRID_SIZE:
					continue
				var anchor := Vector2i(ax, ay)
				var cells := _cells_for_anchor(anchor, footprint)
				if not _cells_are_buildable(cells, tool):
					continue
				var side := _preferred_frontage_side(tool, anchor, footprint)
				if not _placement_has_required_frontage(tool, anchor, footprint, side):
					continue
				var reserved_cells := _property_reserved_cells(anchor, footprint, side, tool)
				if not reserved_cells.is_empty() and not _cells_are_buildable(reserved_cells, tool):
					continue
				var touch := _adjacent_transport_count(tool, anchor, footprint, side)
				var score := _transport_side_score(tool, anchor, footprint, side)
				var frontage_center := _frontage_side_center(anchor, footprint, side)
				var hover_distance := Vector2(hover_world.x, hover_world.z).distance_to(frontage_center)
				var layout_score := float(touch) * 10000.0 + score * 100.0 - hover_distance
				if layout_score > best_score:
					best_score = layout_score
					best_layout = {
						"anchor": anchor,
						"footprint": footprint,
						"cells": cells,
						"frontage_side": side,
					}

	if not best_layout.is_empty():
		return best_layout

	var fallback_footprint := _footprint_for_hover_cell(tool, cell)
	var fallback_anchor := _anchor_for_hover_cell(cell, fallback_footprint)
	return {
		"anchor": fallback_anchor,
		"footprint": fallback_footprint,
		"cells": _cells_for_anchor(fallback_anchor, fallback_footprint),
		"frontage_side": _preferred_frontage_side(tool, fallback_anchor, fallback_footprint),
	}


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


func _cells_are_buildable(cells: Array[Vector2i], tool: String = "") -> bool:
	for cell in cells:
		var key := _cell_key(cell)
		if _reserved_cells.has(key):
			return false
		if _occupied_cells.has(key):
			if tool != "" and _is_forest_tool(tool):
				var occupied_tool := str(_occupied_cells[key])
				if _is_forest_tool(occupied_tool):
					continue
			return false
	return true


func _cells_touch_reserved(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		if _reserved_cells.has(_cell_key(cell)):
			return true
	return false


func _property_spacing_margin_for_tool(tool: String) -> int:
	return int(PROPERTY_BUFFER_BY_TOOL.get(tool, 0))


func _property_reserved_cells(anchor: Vector2i, footprint: Vector2i, frontage_side: String, tool: String) -> Array[Vector2i]:
	var margin := _property_spacing_margin_for_tool(tool)
	if margin <= 0:
		return []

	var min_x := maxi(0, anchor.x - margin)
	var max_x := mini(GRID_SIZE - 1, anchor.x + footprint.x + margin - 1)
	var min_y := maxi(0, anchor.y - margin)
	var max_y := mini(GRID_SIZE - 1, anchor.y + footprint.y + margin - 1)
	var reserved: Array[Vector2i] = []

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			if x >= anchor.x and x < anchor.x + footprint.x and y >= anchor.y and y < anchor.y + footprint.y:
				continue
			reserved.append(Vector2i(x, y))
	return reserved


func _cells_touch_road(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		for neighbor in _neighbor_cells(cell):
			if _road_cells.has(_cell_key(neighbor)):
				return true
	return false


func _frontage_transport_offset(tool: String) -> int:
	if tool == BUILD_TOOL_HOUSE:
		return HOUSE_FRONT_BUFFER_CELLS + 1
	if tool in [
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
	]:
		return 1
	return 2


func _frontage_buffer_cells(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	var buffer_depth := _frontage_transport_offset(tool) - 1
	if buffer_depth <= 0:
		return cells
	match side:
		"north":
			for offset in range(1, buffer_depth + 1):
				for dx in range(footprint.x):
					cells.append(Vector2i(anchor.x + dx, anchor.y - offset))
		"south":
			for offset in range(1, buffer_depth + 1):
				for dx in range(footprint.x):
					cells.append(Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + offset))
		"west":
			for offset in range(1, buffer_depth + 1):
				for dz in range(footprint.y):
					cells.append(Vector2i(anchor.x - offset, anchor.y + dz))
		"east":
			for offset in range(1, buffer_depth + 1):
				for dz in range(footprint.y):
					cells.append(Vector2i(anchor.x + footprint.x - 1 + offset, anchor.y + dz))
	return cells


func _placement_has_required_frontage(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> bool:
	if not _tool_requires_road(tool):
		return true
	for buffer_cell in _frontage_buffer_cells(tool, anchor, footprint, side):
		if buffer_cell.x < 0 or buffer_cell.y < 0 or buffer_cell.x >= GRID_SIZE or buffer_cell.y >= GRID_SIZE:
			return false
		var buffer_key := _cell_key(buffer_cell)
		if _occupied_cells.has(buffer_key) or _reserved_cells.has(buffer_key) or _road_cells.has(buffer_key):
			return false
	return _adjacent_transport_count(tool, anchor, footprint, side) > 0


func _tool_requires_road(tool: String) -> bool:
	return tool in [
		BUILD_TOOL_HOUSE,
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
	]


func _is_forest_tool(tool: String) -> bool:
	return tool in [
		BUILD_TOOL_FOREST_SMALL,
		BUILD_TOOL_FOREST_MEDIUM,
		BUILD_TOOL_FOREST_LARGE,
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


func _register_placement(anchor: Vector2i, cells: Array[Vector2i], tool: String, node: Node3D, cost: int, tier: int = 1, variant: int = -1, frontage_side: String = "") -> void:
	var anchor_key := _cell_key(anchor)
	_upgrade_debug("register placement anchor=%s tool=%s tier=%d variant=%d frontage=%s cost=%d cells=%s node=%s" % [
		anchor_key, tool, tier, variant, frontage_side, cost, str(cells), str(node)
	])
	_placements[anchor_key] = {
		"anchor": anchor,
		"cells": cells.duplicate(),
		"tool": tool,
		"node": node,
		"cost": cost,
		"tier": tier,
		"variant": variant,
		"frontage_side": frontage_side,
	}
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells[key] = tool
		_placed_nodes[key] = node
		_cell_anchor_lookup[key] = anchor_key
	for cell in _property_reserved_cells(anchor, _footprint_from_cells(cells), frontage_side, tool):
		var reserved_key := _cell_key(cell)
		if not _occupied_cells.has(reserved_key):
			_reserved_cells[reserved_key] = tool
	_action_history.append({
		"type": "place",
		"anchor_key": anchor_key,
		"money": cost,
		"frontage_side": frontage_side,
	})
	_set_selected_anchor(anchor_key)
	_upgrade_debug("register placement selected=%s selection_cells=%s" % [_selected_anchor_key, str(_selection_cells)])
	_refresh_road_lights()


func _find_anchor_for_cell(cell: Vector2i) -> String:
	return _cell_anchor_lookup.get(_cell_key(cell), "")


func _cancel_tool_and_select_at_mouse(mouse_position: Vector2) -> void:
	var pick := _pick_grid_cell(mouse_position)
	if pick.is_empty():
		_clear_selected_anchor()
		_set_build_tool(BUILD_TOOL_INSPECT)
		if _hint_label:
			_hint_label.text = "Build tool cancelled."
		return

	var cell: Vector2i = pick["cell"]
	var found_anchor := _find_anchor_for_cell(cell)
	_set_build_tool(BUILD_TOOL_INSPECT)
	if found_anchor != "":
		_set_selected_anchor(found_anchor)
		if _hint_label:
			_hint_label.text = "%s selected. Left click to inspect or switch tools to build again." % _tool_name(_placements[found_anchor]["tool"])
	else:
		_set_selected_tile(cell)
		if _hint_label:
			_hint_label.text = "Tile %d, %d selected. Build tool cancelled." % [cell.x + 1, cell.y + 1]
	_refresh_tool_ui()
	_update_hover_from_mouse()


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
	if _selected_anchor_key == anchor_key and _selected_tile == Vector2i(-1, -1):
		return
	_selected_anchor_key = anchor_key
	_selected_tile = Vector2i(-1, -1)
	_selection_cells = _placement_cells(anchor_key)
	_refresh_tool_ui()


func _set_selected_tile(cell: Vector2i) -> void:
	if _selected_anchor_key == "" and _selected_tile == cell:
		return
	_selected_anchor_key = ""
	_selected_tile = cell
	_selection_cells = [cell]
	_refresh_tool_ui()


func _clear_selected_anchor() -> void:
	if _selected_anchor_key == "" and _selected_tile == Vector2i(-1, -1) and _selection_cells.is_empty():
		return
	_selected_anchor_key = ""
	_selected_tile = Vector2i(-1, -1)
	_selection_cells.clear()
	_refresh_tool_ui()


func _upgrade_debug(message: String) -> void:
	if DEBUG_UPGRADES:
		print("[UPGRADE] ", message)


func _placement_debug_string(placement: Dictionary) -> String:
	if placement.is_empty():
		return "<empty>"
	var anchor: Vector2i = placement.get("anchor", Vector2i(-1, -1))
	var tool: String = str(placement.get("tool", ""))
	var tier: int = int(placement.get("tier", 1))
	var cost: int = int(placement.get("cost", 0))
	var variant: int = int(placement.get("variant", -1))
	var frontage_side: String = str(placement.get("frontage_side", ""))
	return "anchor=%s tool=%s tier=%d cost=%d variant=%d frontage=%s" % [
		str(anchor),
		tool,
		tier,
		cost,
		variant,
		frontage_side,
	]


func _can_upgrade_selected_property() -> bool:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("can_upgrade -> false (no selected placement) selected=%s" % _selected_anchor_key)
		return false
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	if not PropertyUpgradeData.is_upgradeable(tool):
		_upgrade_debug("can_upgrade -> false (tool not upgradeable) tool=%s placement=%s" % [tool, _placement_debug_string(placement)])
		return false
	var tier := int(placement.get("tier", 1))
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	if tier >= max_tier:
		_upgrade_debug("can_upgrade -> false (already max tier) tool=%s tier=%d max=%d placement=%s" % [tool, tier, max_tier, _placement_debug_string(placement)])
		return false
	var cost := _selected_upgrade_cost()
	var allowed := cost > 0 and _money >= cost
	_upgrade_debug("can_upgrade check tool=%s tier=%d max=%d cost=%d money=%d allowed=%s placement=%s" % [
		tool, tier, max_tier, cost, _money, str(allowed), _placement_debug_string(placement)
	])
	return allowed


func _selected_upgrade_cost() -> int:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("selected_upgrade_cost -> -1 (no selected placement) selected=%s" % _selected_anchor_key)
		return -1
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	var tier := int(placement.get("tier", 1))
	var cost := PropertyUpgradeData.upgrade_cost(int(placement["cost"]), tool, tier)
	_upgrade_debug("selected_upgrade_cost tool=%s current_tier=%d base_cost=%d cost=%d placement=%s" % [
		tool, tier, int(placement["cost"]), cost, _placement_debug_string(placement)
	])
	return cost


func _upgrade_selected_property() -> void:
	_upgrade_debug("upgrade_pressed signal received selected=%s" % _selected_anchor_key)
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("upgrade aborted (no selected placement)")
		return
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	_upgrade_debug("upgrade target tool=%s placement=%s" % [tool, _placement_debug_string(placement)])
	if not PropertyUpgradeData.is_upgradeable(tool):
		_upgrade_debug("upgrade aborted (tool not upgradeable) tool=%s" % tool)
		if _hint_label:
			_hint_label.text = "%s cannot be upgraded." % _tool_name(tool)
		return
	var current_tier := int(placement.get("tier", 1))
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	_upgrade_debug("upgrade tier state tool=%s current=%d max=%d" % [tool, current_tier, max_tier])
	if current_tier >= max_tier:
		_upgrade_debug("upgrade aborted (already max tier) tool=%s tier=%d max=%d" % [tool, current_tier, max_tier])
		if _hint_label:
			_hint_label.text = "%s is already at the top tier." % _tool_name(tool)
		return
	var upgrade_cost := _selected_upgrade_cost()
	_upgrade_debug("upgrade cost check tool=%s current_tier=%d upgrade_cost=%d money=%d" % [tool, current_tier, upgrade_cost, _money])
	if upgrade_cost <= 0 or _money < upgrade_cost:
		_upgrade_debug("upgrade aborted (cannot afford or invalid cost) tool=%s cost=%d money=%d" % [tool, upgrade_cost, _money])
		if _hint_label:
			_hint_label.text = "Not enough money to upgrade %s. You need $%d." % [_tool_name(tool).to_lower(), max(0, upgrade_cost)]
		return

	var anchor_key := _selected_anchor_key
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	var variant := int(placement.get("variant", -1))
	var frontage_side := str(placement.get("frontage_side", ""))
	var base_cost := int(placement["cost"])
	var next_tier := current_tier + 1
	var existing_node := placement.get("node") as Node3D

	_upgrade_debug("upgrade begin anchor=%s tool=%s current_tier=%d next_tier=%d variant=%d frontage=%s cells=%s" % [
		anchor_key, tool, current_tier, next_tier, variant, frontage_side, str(cells)
	])
	_money -= upgrade_cost
	_upgrade_debug("upgrade money deducted cost=%d remaining=%d" % [upgrade_cost, _money])
	if (tool == BUILD_TOOL_HOUSE or tool == BUILD_TOOL_FIRE or tool == BUILD_TOOL_BANK or tool == BUILD_TOOL_GROCERY or tool == BUILD_TOOL_RESTAURANT or tool == BUILD_TOOL_CORNER_STORE) and is_instance_valid(existing_node):
		var before_global := existing_node.global_position
		var before_rotation := existing_node.global_rotation_degrees
		if tool == BUILD_TOOL_HOUSE:
			_rebuild_house_visuals_in_place(existing_node, next_tier, variant)
		elif tool == BUILD_TOOL_FIRE:
			_rebuild_fire_visuals_in_place(existing_node, next_tier, variant)
		else:
			_rebuild_service_visuals_in_place(existing_node, tool, next_tier, variant)
		var after_global := existing_node.global_position
		var after_rotation := existing_node.global_rotation_degrees
		placement["node"] = existing_node
		placement["tier"] = next_tier
		placement["variant"] = variant
		placement["frontage_side"] = frontage_side
		_placements[anchor_key] = placement
		print("[%s UPGRADE VERIFY] anchor=%s before_pos=%s after_pos=%s before_rot=%s after_rot=%s identical_pos=%s identical_rot=%s" % [
			"FIRE" if tool == BUILD_TOOL_FIRE else "BANK" if tool == BUILD_TOOL_BANK else "GROCERY" if tool == BUILD_TOOL_GROCERY else "RESTAURANT" if tool == BUILD_TOOL_RESTAURANT else "CORNER",
			anchor_key,
			str(before_global),
			str(after_global),
			str(before_rotation),
			str(after_rotation),
			str(before_global.is_equal_approx(after_global)),
			str(before_rotation.is_equal_approx(after_rotation))
		])
		_upgrade_debug("upgrade rebuilt %s in place anchor=%s tier=%d" % [
			tool,
			anchor_key,
			next_tier
		])
	else:
		_remove_selected_placement(false, false)
		_upgrade_debug("upgrade after remove money=%d selected=%s placement_exists=%s" % [
			_money,
			_selected_anchor_key,
			str(_placements.has(anchor_key))
		])
		var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(tool, anchor, _footprint_from_cells(cells), frontage_side), next_tier, variant)
		_upgrade_debug("upgrade spawned node=%s next_tier=%d" % [str(node), next_tier])
		_register_placement(anchor, cells, tool, node, base_cost, next_tier, variant, frontage_side)
		_upgrade_debug("upgrade registered placement anchor=%s selected_now=%s placement=%s" % [
			anchor_key,
			_selected_anchor_key,
			_placement_debug_string(_placements.get(anchor_key, {}))
		])
		if _selected_anchor_key != anchor_key:
			_set_selected_anchor(anchor_key)
			_upgrade_debug("upgrade restored selection anchor=%s" % anchor_key)
	_action_history.append({
		"type": "upgrade",
		"anchor_key": anchor_key,
		"tool": tool,
		"from_tier": current_tier,
		"to_tier": next_tier,
		"cost": upgrade_cost,
		"base_cost": base_cost,
		"variant": variant,
		"frontage_side": frontage_side,
	})
	_upgrade_debug("upgrade action recorded from=%d to=%d cost=%d base_cost=%d" % [current_tier, next_tier, upgrade_cost, base_cost])
	_recalculate_cashflow()
	_upgrade_debug("upgrade cashflow recalculated cashflow=%d money=%d" % [_cashflow_per_day, _money])
	_rebuild_ambient_life()
	_upgrade_debug("upgrade ambient life rebuilt")
	_refresh_tool_ui()
	_upgrade_debug("upgrade complete selected=%s can_upgrade=%s button_disabled=%s" % [
		_selected_anchor_key,
		str(_can_upgrade_selected_property()),
		str(_upgrade_button.disabled if _upgrade_button else false)
	])
	if _hint_label:
		_hint_label.text = "%s upgraded to tier %d." % [_tool_name(tool), next_tier]


func _selection_name() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		if _selected_tile.x >= 0 and _selected_tile.y >= 0:
			return "tile"
		return "nothing"
	return _tool_name(_placements[_selected_anchor_key]["tool"]).to_lower()


func _selection_text() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		if _selected_tile.x >= 0 and _selected_tile.y >= 0:
			return "Selection: tile  |  Grid: %d,%d  |  Empty land ready for roads, homes, or civic buildings." % [_selected_tile.x + 1, _selected_tile.y + 1]
		return "Selection: none  |  Start with roads, then place homes and town buildings off the road network."
	var placement: Dictionary = _placements[_selected_anchor_key]
	var cells: Array[Vector2i] = placement["cells"]
	var footprint := _footprint_from_cells(cells)
	var road_status := "Road Access: yes" if _cells_touch_road(cells) else "Road Access: no"
	var tool := str(placement["tool"])
	var tier := int(placement.get("tier", 1))
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	var upgrade_text := "Upgrade: maxed"
	if tier < max_tier:
		upgrade_text = "Upgrade: $%d" % _selected_upgrade_cost()
	return "Selection: %s  |  Tier: %d/%d  |  Footprint: %dx%d  |  Build Cost: $%d  |  %s  |  %s" % [
		_tool_name(tool),
		tier,
		max_tier,
		footprint.x,
		footprint.y,
		int(placement["cost"]),
		road_status,
		upgrade_text
	]


func _build_stats_text() -> String:
	var homes := 0
	var shops := 0
	var civics := 0
	var parks := 0
	var population := 0
	var jobs := 0
	var appeal := 0
	var net_cashflow := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		var tier := int(_placements[anchor_key].get("tier", 1))
		var yield_data: Dictionary = PropertyUpgradeData.tier_yield(tool, tier)
		population += int(yield_data.get("population", 0))
		jobs += int(yield_data.get("jobs", 0))
		appeal += int(yield_data.get("appeal", 0))
		net_cashflow += int(yield_data.get("cashflow", 0))
		if tool == BUILD_TOOL_HOUSE:
			homes += 1
		elif tool in [BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE]:
			shops += 1
		elif tool == BUILD_TOOL_FIRE:
			civics += 1
		elif tool == BUILD_TOOL_PARK:
			parks += 1
	return "Day %d  |  Money: $%d  |  +$%d/day  |  Pop: %d  |  Jobs: %d  |  Homes: %d  |  Shops: %d  |  Civic: %d  |  Parks: %d  |  Appeal: %d  |  Roads: %d" % [_day, _money, net_cashflow, population, jobs, homes, shops, civics, parks, appeal, _road_cells.size()]


func _recalculate_cashflow() -> void:
	var net_cashflow := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		var tier := int(_placements[anchor_key].get("tier", 1))
		net_cashflow += int(PropertyUpgradeData.tier_yield(tool, tier).get("cashflow", 0))
	_cashflow_per_day = net_cashflow - _road_cells.size() * 1


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
		_upgrade_debug("remove selected placement skipped selected=%s has=%s" % [_selected_anchor_key, str(_placements.has(_selected_anchor_key))])
		return
	var anchor_key := _selected_anchor_key
	var placement = _placements[anchor_key]
	var tool: String = placement["tool"]
	var cells: Array[Vector2i] = placement["cells"]
	var node: Node3D = placement["node"]
	var road_neighbors: Array[Vector2i] = []
	var refund_amount := int(round(float(placement["cost"]) * 0.7)) if refund else 0
	_upgrade_debug("remove selected placement anchor=%s tool=%s refund=%s refund_amount=%d placement=%s" % [
		anchor_key, tool, str(refund), refund_amount, _placement_debug_string(placement)
	])
	if refund:
		_money += refund_amount
	if tool == BUILD_TOOL_ROAD:
		for cell in cells:
			for neighbor in _neighbor_cells(cell):
				if _road_cells.has(_cell_key(neighbor)):
					road_neighbors.append(neighbor)
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
	for cell in _property_reserved_cells(
		placement["anchor"],
		_footprint_from_cells(cells),
		str(placement.get("frontage_side", "")),
		tool
	):
		_reserved_cells.erase(_cell_key(cell))
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
			"tier": int(placement.get("tier", 1)),
			"variant": int(placement.get("variant", -1)),
			"frontage_side": str(placement.get("frontage_side", "")),
		})
	if tool == BUILD_TOOL_ROAD:
		for neighbor in road_neighbors:
			if _road_cells.has(_cell_key(neighbor)):
				_rebuild_road_at(neighbor)
	_clear_selected_anchor()
	_upgrade_debug("remove selected placement complete selected=%s money=%d" % [_selected_anchor_key, _money])
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _remove_road_at_cell(cell: Vector2i, refund: bool, record_action: bool = true) -> void:
	var road_key := _cell_key(cell)
	if not _road_cells.has(road_key):
		return

	var anchor_key := _find_anchor_for_cell(cell)
	if anchor_key != "" and _placements.has(anchor_key):
		_selected_anchor_key = anchor_key
		_remove_selected_placement(refund, record_action)
		return

	var road_neighbors: Array[Vector2i] = []
	for neighbor in _neighbor_cells(cell):
		if _road_cells.has(_cell_key(neighbor)):
			road_neighbors.append(neighbor)

	var refund_amount := int(round(float(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]) * 0.7)) if refund else 0
	if refund:
		_money += refund_amount

	_road_cells.erase(road_key)
	if _road_nodes.has(road_key):
		var road_node: Node3D = _road_nodes[road_key]
		if is_instance_valid(road_node):
			road_node.queue_free()
		_road_nodes.erase(road_key)

	_occupied_cells.erase(road_key)
	_placed_nodes.erase(road_key)
	_cell_anchor_lookup.erase(road_key)
	_placements.erase(road_key)

	if record_action:
		_action_history.append({
			"type": "remove",
			"anchor_key": road_key,
			"tool": BUILD_TOOL_ROAD,
			"cells": [cell],
			"cost": int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]),
			"refund": refund_amount,
			"tier": 1,
			"variant": -1,
		})

	for neighbor in road_neighbors:
		if _road_cells.has(_cell_key(neighbor)):
			_rebuild_road_at(neighbor)
	_clear_selected_anchor()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
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
			_register_placement(anchor, cells, action["tool"], _road_nodes.get(_cell_key(anchor)), int(action["cost"]), 1, -1)
		else:
			var tier := int(action.get("tier", 1))
			var variant := int(action.get("variant", -1))
			var frontage_side := str(action.get("frontage_side", ""))
			var node := _spawn_building_for_tool(action["tool"], _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(action["tool"], anchor, _footprint_from_cells(cells), frontage_side), tier, variant)
			_register_placement(anchor, cells, action["tool"], node, int(action["cost"]), tier, variant, frontage_side)
	elif action["type"] == "upgrade":
		_money += int(action["cost"])
		var anchor_key := str(action["anchor_key"])
		if _placements.has(anchor_key):
			_selected_anchor_key = anchor_key
			var placement: Dictionary = _placements[anchor_key]
			var tool := str(placement["tool"])
			var variant := int(placement.get("variant", -1))
			var frontage_side := str(placement.get("frontage_side", ""))
			var from_tier := int(action.get("from_tier", 1))
			if (tool == BUILD_TOOL_HOUSE or tool == BUILD_TOOL_FIRE or tool == BUILD_TOOL_BANK or tool == BUILD_TOOL_GROCERY or tool == BUILD_TOOL_RESTAURANT or tool == BUILD_TOOL_CORNER_STORE) and is_instance_valid(placement.get("node") as Node3D):
				var node := placement.get("node") as Node3D
				if tool == BUILD_TOOL_HOUSE:
					_rebuild_house_visuals_in_place(node, from_tier, variant)
				elif tool == BUILD_TOOL_FIRE:
					_rebuild_fire_visuals_in_place(node, from_tier, variant)
				else:
					_rebuild_service_visuals_in_place(node, tool, from_tier, variant)
				placement["tier"] = from_tier
				placement["variant"] = variant
				placement["frontage_side"] = frontage_side
				_placements[anchor_key] = placement
			else:
				var anchor: Vector2i = placement["anchor"]
				var cells: Array[Vector2i] = placement["cells"]
				_remove_selected_placement(false, false)
				var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(tool, anchor, _footprint_from_cells(cells), frontage_side), from_tier, variant)
				_register_placement(anchor, cells, tool, node, int(action.get("base_cost", placement.get("cost", 0))), from_tier, variant, frontage_side)
		if not _action_history.is_empty():
			_action_history.pop_back()
	_recalculate_cashflow()
	_rebuild_ambient_life()
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
	if SCENIC_TOOL_SPECS.has(tool):
		return _spawn_scenic_preview(tool)

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


func _spawn_scenic_preview(tool: String) -> Node3D:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var root := Node3D.new()
	var label := str(spec.get("kind", ""))
	if label == "pond":
		_add_box(Vector3(0.0, 0.02, 0.0), Vector3(2.0, 0.04, 2.0), _ghost_base_material, root)
		_add_box(Vector3(0.0, 0.04, 0.0), Vector3(1.6, 0.02, 1.6), _ghost_accent_material, root)
		_add_box(Vector3(0.0, 0.06, 0.0), Vector3(1.2, 0.02, 1.2), _ghost_accent_material, root)
		_add_box(Vector3(0.0, 0.08, 0.0), Vector3(1.5, 0.01, 0.28), _ghost_base_material, root)
		_add_box(Vector3(0.0, 0.08, 0.0), Vector3(0.28, 0.01, 1.5), _ghost_base_material, root)
		_add_local_sphere(Vector3(-0.54, 0.06, -0.42), 0.14, 0.12, _ghost_base_material, root)
		_add_local_sphere(Vector3(0.48, 0.06, 0.46), 0.12, 0.1, _ghost_base_material, root)
		return root
	if label == "forest":
		_add_box(Vector3(0.0, 0.02, 0.0), Vector3(2.1, 0.04, 2.1), _ghost_base_material, root)
		for tree_pos in [
			Vector3(-0.58, 0.0, -0.48),
			Vector3(0.12, 0.0, -0.7),
			Vector3(0.72, 0.0, -0.18),
			Vector3(-0.78, 0.0, 0.46),
			Vector3(0.3, 0.0, 0.54),
		]:
			_add_local_tree(tree_pos, root)
		_add_box(Vector3(-0.54, 0.06, 0.62), Vector3(0.12, 0.2, 0.12), _ghost_accent_material, root)
		_add_box(Vector3(0.52, 0.06, 0.32), Vector3(0.12, 0.2, 0.12), _ghost_accent_material, root)
		return root
	return root


func _spawn_generic_building_preview(tool: String) -> Node3D:
	var root := Node3D.new()
	var pad_material := _ghost_base_material
	var wall_material := _ghost_base_material
	var accent_material := _ghost_accent_material
	var body_size := Vector3(1.38, 0.88, 1.18)
	var roof_size := Vector3(1.52, 0.18, 1.3)

	match tool:
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


func _spawn_building_for_tool(tool: String, world_position: Vector3, rotation_y: float, tier: int = 1, variant: int = -1) -> Node3D:
	if variant < 0:
		variant = randi() % 10
	tier = clamp(tier, 1, PropertyUpgradeData.max_tier(tool))
	_upgrade_debug("spawn building tool=%s tier=%d variant=%d world=%s rot=%.2f" % [tool, tier, variant, str(world_position), rotation_y])
	var node: Node3D
	match tool:
		BUILD_TOOL_HOUSE:
			node = _add_village_house_variant(world_position, variant)
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
		BUILD_TOOL_POND_SMALL, BUILD_TOOL_POND_MEDIUM, BUILD_TOOL_POND_LARGE:
			node = _add_pond_variant(tool, world_position, variant)
		BUILD_TOOL_FOREST_SMALL, BUILD_TOOL_FOREST_MEDIUM, BUILD_TOOL_FOREST_LARGE:
			node = _add_forest_variant(tool, world_position, variant)
		_:
			node = _spawn_house_tile(world_position, false)
	node.rotation_degrees.y = rad_to_deg(rotation_y)
	if _tool_requires_road(tool):
		var lot_setback := 0.0
		var setback := 0.0
		if tool != BUILD_TOOL_HOUSE:
			var lot_root := _property_lot_root(node)
			lot_setback = float(PROPERTY_LOT_SETBACK_BY_TOOL.get(tool, 0.0))
			if lot_setback > 0.0:
				lot_root.translate_object_local(Vector3(0.0, 0.0, -lot_setback))
			setback = float(PROPERTY_FRONT_SETBACK_BY_TOOL.get(tool, PROPERTY_FRONT_SETBACK))
			var structure_root := _property_structure_root(node)
			structure_root.translate_object_local(Vector3(0.0, 0.0, -setback))
		_upgrade_debug("spawn building tool=%s applied lot_setback=%.2f structure_setback=%.2f" % [tool, lot_setback, setback])
	_apply_property_tier_visuals(node, tool, tier, variant)
	node.set_meta("tier", tier)
	node.set_meta("variant", variant)
	_upgrade_debug("spawn building complete node=%s tier_meta=%d variant_meta=%d" % [str(node), int(node.get_meta("tier", -1)), int(node.get_meta("variant", -1))])
	return node


func _create_property_roots(position_3d: Vector3) -> Dictionary:
	var root := Node3D.new()
	root.position = position_3d
	building_root.add_child(root)

	var lot_root := Node3D.new()
	lot_root.name = "LotRoot"
	root.add_child(lot_root)

	var structure_root := Node3D.new()
	structure_root.name = "StructureRoot"
	root.add_child(structure_root)

	return {
		"root": root,
		"lot": lot_root,
		"structure": structure_root,
	}


func _property_lot_root(root: Node3D) -> Node3D:
	var lot_root := root.get_node_or_null("LotRoot") as Node3D
	return lot_root if lot_root != null else root


func _property_structure_root(root: Node3D) -> Node3D:
	var structure_root := root.get_node_or_null("StructureRoot") as Node3D
	return structure_root if structure_root != null else root


func _clear_property_visuals(root: Node3D) -> void:
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	for child in root.get_children():
		if child == lot_root or child == structure_root:
			continue
		root.remove_child(child)
		child.free()
	for visual_root in [lot_root, structure_root]:
		for child in visual_root.get_children():
			visual_root.remove_child(child)
			child.free()


func _rebuild_house_visuals_in_place(root: Node3D, tier: int, variant: int) -> void:
	_clear_property_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_village_house_variant(root, lot_root, structure_root, variant)
	_apply_property_tier_visuals(root, BUILD_TOOL_HOUSE, tier, variant)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)


func _rebuild_fire_visuals_in_place(root: Node3D, tier: int, variant: int) -> void:
	_clear_property_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_fire_station_variant(root, lot_root, structure_root, variant)
	_apply_property_tier_visuals(root, BUILD_TOOL_FIRE, tier, variant)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)


func _populate_service_variant(tool: String, root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	match tool:
		BUILD_TOOL_BANK:
			_populate_bank_variant(root, lot_root, structure_root, variant)
		BUILD_TOOL_GROCERY:
			_populate_grocery_variant(root, lot_root, structure_root, variant)
		BUILD_TOOL_RESTAURANT:
			_populate_restaurant_variant(root, lot_root, structure_root, variant)
		BUILD_TOOL_CORNER_STORE:
			_populate_corner_store_variant(root, lot_root, structure_root, variant)
		_:
			pass


func _rebuild_service_visuals_in_place(root: Node3D, tool: String, tier: int, variant: int) -> void:
	var before_global := root.global_position
	var before_rotation := root.global_rotation_degrees
	_clear_property_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_service_variant(tool, root, lot_root, structure_root, variant)
	_apply_property_tier_visuals(root, tool, tier, variant)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)
	var after_global := root.global_position
	var after_rotation := root.global_rotation_degrees
	print("[%s UPGRADE VERIFY] before_pos=%s after_pos=%s before_rot=%s after_rot=%s identical_pos=%s identical_rot=%s" % [
		tool.to_upper(),
		str(before_global),
		str(after_global),
		str(before_rotation),
		str(after_rotation),
		str(before_global.is_equal_approx(after_global)),
		str(before_rotation.is_equal_approx(after_rotation))
	])


func _adjust_zoom(delta_amount: float) -> void:
	_target_zoom = clamp(_target_zoom + delta_amount, MIN_ZOOM, MAX_ZOOM)


func _rotate_camera(delta_yaw: float) -> void:
	_target_camera_yaw = wrapf(snappedf(_target_camera_yaw + delta_yaw, PI * 0.5), -PI, PI)


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
		var pan_limit := _pan_limit()
		_target_focus.x = clamp(_target_focus.x + motion.x, -pan_limit, pan_limit)
		_target_focus.z = clamp(_target_focus.z + motion.z, -pan_limit, pan_limit)

	if Input.is_key_pressed(KEY_EQUAL) or Input.is_key_pressed(KEY_KP_ADD):
		_target_zoom = max(MIN_ZOOM, _target_zoom - delta * 10.0)
	elif Input.is_key_pressed(KEY_MINUS) or Input.is_key_pressed(KEY_KP_SUBTRACT):
		_target_zoom = min(MAX_ZOOM, _target_zoom + delta * 10.0)


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
	_target_zoom = DEFAULT_ZOOM
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
		"ambient_light_scale": _ambient_light_scale,
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
			"tier": int(placement.get("tier", 1)),
			"variant": int(placement.get("variant", -1)),
			"frontage_side": str(placement.get("frontage_side", "")),
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
	_money = int(data.get("money", STARTING_MONEY))
	_day = int(data.get("day", 1))
	_simulation_clock = float(data.get("clock", 0.0))
	_build_tool = str(data.get("build_tool", BUILD_TOOL_ROAD))
	_set_ambient_light_scale(float(data.get("ambient_light_scale", 1.0)))
	var focus_data: Array = data.get("focus", [0.0, 0.0, 0.0])
	if focus_data.size() == 3:
		_target_focus = Vector3(float(focus_data[0]), float(focus_data[1]), float(focus_data[2]))
		_focus = _target_focus
	_target_zoom = float(data.get("zoom", DEFAULT_ZOOM))
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
			var footprint := _tool_footprint_for_anchor(tool, anchor)
			var cells := _cells_for_anchor(anchor, footprint)
			var tier := int(entry.get("tier", 1))
			var variant := int(entry.get("variant", randi() % 10))
			var frontage_side := str(entry.get("frontage_side", _preferred_frontage_side(tool, anchor, footprint)))
			var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, footprint), _tool_rotation_y(tool, anchor, footprint, frontage_side), tier, variant)
			_register_placement(anchor, cells, tool, node, int(entry.get("cost", BUILD_TOOL_COSTS.get(tool, 0))), tier, variant, frontage_side)
			if not _action_history.is_empty():
				_action_history.pop_back()
	for road_key in _road_cells.keys():
		var cell := _anchor_key_to_cell(road_key)
		_rebuild_road_at(cell)
		_register_placement(cell, [cell], BUILD_TOOL_ROAD, _road_nodes.get(road_key), int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]), 1, -1)
		if not _action_history.is_empty():
			_action_history.pop_back()
	_loaded_save = true
	_clear_selected_anchor()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	_update_camera(true)
	if _hint_label:
		_hint_label.text = "Saved town loaded."


func _new_map() -> void:
	_clear_map_data()
	_money = STARTING_MONEY
	_day = 1
	_simulation_clock = 0.0
	_build_tool = BUILD_TOOL_ROAD
	_set_ambient_light_scale(1.0)
	_variant_cycle.clear()
	_loaded_save = false
	_reset_camera_view()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
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
	_reserved_cells.clear()
	_placed_nodes.clear()
	_placements.clear()
	_cell_anchor_lookup.clear()
	_road_cells.clear()
	_road_nodes.clear()
	_clear_road_lights()
	_action_history.clear()
	_variant_cycle.clear()
	_clear_selected_anchor()
	_reset_nature_layer()
	_clear_ambient_life()


func _reset_nature_layer() -> void:
	for feature in _nature_features:
		if is_instance_valid(feature):
			feature.queue_free()
	_nature_features.clear()
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
	for i in range(_nature_features.size() - 1, -1, -1):
		var feature := _nature_features[i]
		if not is_instance_valid(feature):
			_nature_features.remove_at(i)
			continue
		var radius: float = float(feature.get_meta("clear_radius", 0.72))
		var feature_center := Vector2(feature.global_position.x, feature.global_position.z)
		for cell in cells:
			if _circle_overlaps_cell(feature_center, radius, cell):
				feature.queue_free()
				_nature_features.remove_at(i)
				break
	for cell in cells:
		for i in range(_grass_clumps.size() - 1, -1, -1):
			var clump := _grass_clumps[i]
			if not is_instance_valid(clump):
				_grass_clumps.remove_at(i)
				continue
			if _circle_overlaps_cell(Vector2(clump.position.x, clump.position.z), 0.72, cell):
				clump.queue_free()
				_grass_clumps.remove_at(i)
		for j in range(_meadow_patches.size() - 1, -1, -1):
			var patch := _meadow_patches[j]
			if not is_instance_valid(patch):
				_meadow_patches.remove_at(j)
				continue
			var radius: float = float(patch.get_meta("radius", 1.0))
			if _circle_overlaps_cell(Vector2(patch.position.x, patch.position.z), radius, cell):
				patch.queue_free()
				_meadow_patches.remove_at(j)


func _register_nature_feature(node: Node3D, clear_radius: float) -> void:
	node.set_meta("clear_radius", clear_radius)
	_nature_features.append(node)


func _circle_overlaps_cell(center: Vector2, radius: float, cell: Vector2i) -> bool:
	var world_center := _cell_to_world(cell)
	var half: float = 0.5
	var min_x: float = world_center.x - half
	var max_x: float = world_center.x + half
	var min_y: float = world_center.z - half
	var max_y: float = world_center.z + half
	var nearest_x: float = clampf(center.x, min_x, max_x)
	var nearest_y: float = clampf(center.y, min_y, max_y)
	return center.distance_to(Vector2(nearest_x, nearest_y)) <= radius


func _clear_ambient_life() -> void:
	for car in _ambient_cars:
		if is_instance_valid(car):
			car.queue_free()
	_ambient_cars.clear()
	for trolley in _ambient_trolleys:
		if is_instance_valid(trolley):
			trolley.queue_free()
	_ambient_trolleys.clear()
	for person in _ambient_people:
		if is_instance_valid(person):
			person.queue_free()
	_ambient_people.clear()


func _rebuild_ambient_life() -> void:
	_clear_ambient_life()
	if _road_cells.is_empty():
		return
	var road_keys: Array = _road_cells.keys()
	var car_count := clampi(int(floor(float(road_keys.size()) / 18.0)), 0, 4)
	if road_keys.size() >= 18:
		car_count = maxi(car_count, 1)
	for index in range(car_count):
		var road_key: String = str(road_keys[(index * max(1, int(floor(float(road_keys.size()) / max(1, car_count))))) % road_keys.size()])
		var road_cell := _anchor_key_to_cell(road_key)
		var car := _spawn_ambient_car(road_cell, index)
		_life_root.add_child(car)
		_ambient_cars.append(car)
	if road_keys.size() >= 10:
		var trolley_start := _anchor_key_to_cell(str(road_keys[0]))
		var trolley := _spawn_ambient_trolley(trolley_start)
		_life_root.add_child(trolley)
		_ambient_trolleys.append(trolley)

	var anchors: Array = _placements.keys()
	var person_count := mini(8, anchors.size())
	var spawned_people := 0
	for anchor_key_variant in anchors:
		if spawned_people >= person_count:
			break
		var anchor_key := str(anchor_key_variant)
		if not _placements.has(anchor_key):
			continue
		var placement: Dictionary = _placements[anchor_key]
		var tool := str(placement["tool"])
		if tool == BUILD_TOOL_ROAD or SCENIC_TOOL_SPECS.has(tool):
			continue
		var person := _spawn_ambient_person(anchor_key, spawned_people)
		_life_root.add_child(person)
		_ambient_people.append(person)
		spawned_people += 1


func _spawn_ambient_car(road_cell: Vector2i, index: int) -> Node3D:
	var root := Node3D.new()
	var route_points := _build_car_route(road_cell, index)
	if route_points.size() < 2:
		var road_center := _cell_to_world(road_cell)
		route_points = [road_center + Vector3(-0.4, 0.05, 0.0), road_center + Vector3(0.4, 0.05, 0.0)]
	var route_length := _route_length(route_points)
	var start := route_points[0]
	var initial_heading := atan2(route_points[1].x - route_points[0].x, route_points[1].z - route_points[0].z)
	root.position = start
	root.rotation.y = initial_heading
	root.set_meta("mode", "car")
	root.set_meta("route_points", route_points)
	root.set_meta("route_length", route_length)
	root.set_meta("route_progress", randf_range(0.0, maxf(route_length * 2.0, 0.01)))
	root.set_meta("speed", randf_range(1.4, 2.2))
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.48, 0.72), 0.16, root)

	var palette := [
		Color("d16758"),
		Color("5f8cb8"),
		Color("86a05d"),
		Color("e3be67"),
		Color("7e6ba1"),
	]
	var body_material := _make_material_from_color(palette[index % palette.size()], 0.68)
	var trim_material := _make_material("f6f1e4", 0.82)
	var tire_material := _make_material("26252b", 0.98)
	var window_glass := _make_transparent_material(Color("bfe6ff"), 0.24, 0.16)
	_add_soft_block(Vector3(0.0, 0.16, 0.0), Vector3(0.34, 0.16, 0.58), body_material, root, 0.08)
	_add_soft_block(Vector3(0.0, 0.27, -0.02), Vector3(0.24, 0.12, 0.28), trim_material, root, 0.06)
	_add_box(Vector3(0.0, 0.29, -0.02), Vector3(0.18, 0.08, 0.18), window_glass, root)
	_add_box(Vector3(0.0, 0.13, 0.29), Vector3(0.18, 0.03, 0.03), trim_material, root)
	_add_box(Vector3(0.0, 0.13, -0.29), Vector3(0.18, 0.03, 0.03), trim_material, root)
	for wheel_data in [
		Vector3(-0.14, 0.07, -0.2),
		Vector3(0.14, 0.07, -0.2),
		Vector3(-0.14, 0.07, 0.2),
		Vector3(0.14, 0.07, 0.2),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.05, 0.05, 0.04, tire_material, root)
		wheel.rotation_degrees.z = 90.0
	_add_vehicle_headlights_local(root, 0.39, 0.12, 0.15, 3.2, 0.34)
	return root


func _spawn_ambient_trolley(road_cell: Vector2i) -> Node3D:
	var root := Node3D.new()
	var route_points := _build_trolley_route(road_cell)
	if route_points.size() < 2:
		var road_center := _cell_to_world(road_cell)
		route_points = [road_center + Vector3(0.0, 0.07, -0.6), road_center + Vector3(0.0, 0.07, 0.6)]
	var route_length := _route_length(route_points)
	root.position = route_points[0]
	root.rotation.y = atan2(route_points[1].x - route_points[0].x, route_points[1].z - route_points[0].z)
	root.set_meta("mode", "trolley")
	root.set_meta("route_points", route_points)
	root.set_meta("route_length", route_length)
	root.set_meta("route_progress", randf_range(0.0, maxf(route_length * 2.0, 0.01)))
	root.set_meta("speed", 1.25)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.72, 1.1), 0.18, root)
	var body_material := _make_material("d3b15b", 0.74)
	var trim_material := _make_material("f5efdf", 0.84)
	var rail_glass := _make_transparent_material(Color("bfe6ff"), 0.24, 0.16)
	_add_soft_block(Vector3(0.0, 0.28, 0.0), Vector3(0.54, 0.28, 1.08), body_material, root, 0.08)
	_add_soft_block(Vector3(0.0, 0.52, 0.0), Vector3(0.46, 0.18, 0.98), trim_material, root, 0.06)
	_add_box(Vector3(0.0, 0.55, 0.0), Vector3(0.38, 0.12, 0.74), rail_glass, root)
	for wheel_data in [
		Vector3(-0.22, 0.08, -0.36),
		Vector3(0.22, 0.08, -0.36),
		Vector3(-0.22, 0.08, 0.36),
		Vector3(0.22, 0.08, 0.36),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.06, 0.06, 0.05, _make_material("26252b", 0.98), root)
		wheel.rotation_degrees.z = 90.0
	_add_local_cylinder(Vector3(0.0, 0.92, 0.0), 0.02, 0.02, 0.64, _make_material("55514c", 0.92), root)
	_add_vehicle_headlights_local(root, 0.66, 0.18, 0.18, 4.0, 0.42)
	return root


func _spawn_ambient_person(anchor_key: String, index: int) -> Node3D:
	var root := Node3D.new()
	var placement: Dictionary = _placements[anchor_key]
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	var footprint := _footprint_from_cells(cells)
	var tool := str(placement.get("tool", BUILD_TOOL_HOUSE))
	var frontage_side := str(placement.get("frontage_side", _preferred_frontage_side(tool, anchor, footprint)))
	var sidewalk_route := _build_person_route(anchor, footprint, frontage_side, index, tool)
	if sidewalk_route.size() < 2:
		var rotation_y := _tool_rotation_y(str(placement["tool"]), anchor, footprint, frontage_side)
		var forward := Vector3(sin(rotation_y), 0.0, cos(rotation_y))
		var side := Vector3(forward.z, 0.0, -forward.x)
		var center := _anchor_to_world(anchor, footprint)
		var frontage := center + forward * (float(footprint.y) * 0.5 + 0.7)
		var stride := 0.52 + float(index % 3) * 0.08
		sidewalk_route = [
			frontage - side * stride + Vector3(0.0, 0.03, 0.0),
			frontage + side * stride + Vector3(0.0, 0.03, 0.0),
		]
	var start := sidewalk_route[0]
	var finish := sidewalk_route[sidewalk_route.size() - 1]
	root.position = start
	root.set_meta("mode", "person")
	root.set_meta("route_points", sidewalk_route)
	root.set_meta("route_length", _route_length(sidewalk_route))
	root.set_meta("route_progress", randf_range(0.0, maxf(_route_length(sidewalk_route) * 2.0, 0.01)))
	root.set_meta("speed", randf_range(0.75, 1.15))
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.18, 0.18), 0.16, root)

	var coat_palette := [
		Color("5b7db0"),
		Color("b86a58"),
		Color("728e57"),
		Color("8b6da8"),
		Color("cb9a5a"),
	]
	var coat_material := _make_material_from_color(coat_palette[index % coat_palette.size()], 0.74)
	var pant_material := _make_material("4a4748", 0.96)
	var skin_material := _make_material("e7c8a8", 0.86)
	_add_soft_block(Vector3(0.0, 0.2, 0.0), Vector3(0.12, 0.2, 0.1), coat_material, root, 0.04)
	_add_local_sphere(Vector3(0.0, 0.34, 0.0), 0.06, 0.08, skin_material, root)
	_add_box(Vector3(-0.03, 0.07, 0.0), Vector3(0.03, 0.14, 0.03), pant_material, root)
	_add_box(Vector3(0.03, 0.07, 0.0), Vector3(0.03, 0.14, 0.03), pant_material, root)
	_add_box(Vector3(0.0, 0.23, -0.07), Vector3(0.12, 0.03, 0.03), _make_material("f5efe4", 0.86), root)
	return root


func _animate_life(delta: float) -> void:
	for car in _ambient_cars:
		if not is_instance_valid(car):
			continue
		var route_points: Array = car.get_meta("route_points", [])
		var route_length: float = float(car.get_meta("route_length", 0.0))
		if route_points.size() < 2 or route_length <= 0.01:
			continue
		var progress: float = float(car.get_meta("route_progress", 0.0)) + delta * float(car.get_meta("speed", 1.6))
		car.set_meta("route_progress", progress)
		var sample := _sample_ping_pong_route(route_points, route_length, progress)
		car.position = sample["position"]
		car.rotation.y = sample["heading"]

	for trolley in _ambient_trolleys:
		if not is_instance_valid(trolley):
			continue
		var route_points: Array = trolley.get_meta("route_points", [])
		var route_length: float = float(trolley.get_meta("route_length", 0.0))
		if route_points.size() < 2 or route_length <= 0.01:
			continue
		var progress: float = float(trolley.get_meta("route_progress", 0.0)) + delta * float(trolley.get_meta("speed", 1.25))
		trolley.set_meta("route_progress", progress)
		var sample := _sample_ping_pong_route(route_points, route_length, progress)
		trolley.position = sample["position"]
		trolley.rotation.y = sample["heading"]

	for person in _ambient_people:
		if not is_instance_valid(person):
			continue
		var route_points: Array = person.get_meta("route_points", [])
		var route_length: float = float(person.get_meta("route_length", 0.0))
		if route_points.size() < 2 or route_length <= 0.01:
			continue
		var progress: float = float(person.get_meta("route_progress", 0.0)) + delta * float(person.get_meta("speed", 0.9))
		person.set_meta("route_progress", progress)
		var sample := _sample_ping_pong_route(route_points, route_length, progress)
		var next_position: Vector3 = sample["position"]
		next_position.y += abs(sin(progress * 6.0)) * 0.025
		person.position = next_position
		person.rotation.y = sample["heading"]


func _build_car_route(start_cell: Vector2i, index: int) -> Array[Vector3]:
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return []
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return []
	var route: Array[Vector3] = []
	var lane_sign := -1.0 if index % 2 == 0 else 1.0
	for i in range(path.size()):
		var cell: Vector2i = path[i]
		var center := _cell_to_world(cell)
		var direction := Vector3.ZERO
		if i < path.size() - 1:
			direction = (_cell_to_world(path[i + 1]) - center).normalized()
		elif i > 0:
			direction = (center - _cell_to_world(path[i - 1])).normalized()
		if direction.length() < 0.01:
			direction = Vector3.RIGHT
		var lateral := Vector3(direction.z, 0.0, -direction.x)
		var lane_offset := lateral * (0.42 * lane_sign)
		route.append(center + lane_offset + Vector3(0.0, 0.05, 0.0))
	return route


func _build_trolley_route(start_cell: Vector2i) -> Array[Vector3]:
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return []
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return []
	var route: Array[Vector3] = []
	for cell in path:
		var center := _cell_to_world(cell)
		route.append(center + Vector3(0.0, 0.07, 0.0))
	return route


func _frontage_road_cells(anchor: Vector2i, footprint: Vector2i, side: String, tool: String = BUILD_TOOL_HOUSE) -> Array[Vector2i]:
	var road_cells: Array[Vector2i] = []
	var road_offset := _frontage_transport_offset(tool)
	match side:
		"north":
			for dx in range(footprint.x):
				var cell := Vector2i(anchor.x + dx, anchor.y - road_offset)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"south":
			for dx in range(footprint.x):
				var cell := Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + road_offset)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"west":
			for dz in range(footprint.y):
				var cell := Vector2i(anchor.x - road_offset, anchor.y + dz)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"east":
			for dz in range(footprint.y):
				var cell := Vector2i(anchor.x + footprint.x - 1 + road_offset, anchor.y + dz)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
	return road_cells


func _build_person_route(anchor: Vector2i, footprint: Vector2i, frontage_side: String, index: int, tool: String = BUILD_TOOL_HOUSE) -> Array[Vector3]:
	var road_cells := _frontage_road_cells(anchor, footprint, frontage_side, tool)
	if road_cells.size() < 1:
		return []
	var start_cell := road_cells[index % road_cells.size()]
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return _build_sidewalk_route(anchor, footprint, frontage_side, tool)
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return _build_sidewalk_route(anchor, footprint, frontage_side, tool)
	var route: Array[Vector3] = []
	var sidewalk_sign := 1.0 if index % 2 == 0 else -1.0
	for i in range(path.size()):
		var road_cell: Vector2i = path[i]
		var center := _cell_to_world(road_cell)
		var direction := Vector3.ZERO
		if i < path.size() - 1:
			direction = (_cell_to_world(path[i + 1]) - center).normalized()
		elif i > 0:
			direction = (center - _cell_to_world(path[i - 1])).normalized()
		if direction.length() < 0.01:
			direction = Vector3.RIGHT
		var lateral := Vector3(direction.z, 0.0, -direction.x)
		var point := center + lateral * (SIDEWALK_ROUTE_OFFSET * sidewalk_sign) + Vector3(0.0, 0.03, 0.0)
		route.append(point)
	if route.size() >= 2 and randf() < 0.35:
		var center := _anchor_to_world(anchor, footprint)
		var rotation_y := _tool_rotation_y(BUILD_TOOL_HOUSE, anchor, footprint, frontage_side)
		var forward := Vector3(sin(rotation_y), 0.0, cos(rotation_y))
		var lateral := Vector3(forward.z, 0.0, -forward.x)
		var yard_front := center + forward * (float(footprint.y) * 0.5 - 1.55) + lateral * (0.42 if index % 2 == 0 else -0.42)
		var yard_back := center + forward * (float(footprint.y) * 0.5 - 2.3) + lateral * (0.78 if index % 2 == 0 else -0.78)
		route.push_front(yard_back + Vector3(0.0, 0.03, 0.0))
		route.push_front(yard_front + Vector3(0.0, 0.03, 0.0))
	return route


func _build_sidewalk_route(anchor: Vector2i, footprint: Vector2i, frontage_side: String = "", tool: String = BUILD_TOOL_HOUSE) -> Array[Vector3]:
	var side := frontage_side if frontage_side != "" else _preferred_frontage_side(tool, anchor, footprint)
	var road_cells := _frontage_road_cells(anchor, footprint, side, tool)
	if road_cells.size() < 1:
		return []
	road_cells.sort_custom(func(a: Vector2i, b: Vector2i) -> bool:
		if side == "north" or side == "south":
			return a.x < b.x
		return a.y < b.y
	)
	var route: Array[Vector3] = []
	for road_cell in road_cells:
		var center := _cell_to_world(road_cell)
		var point := center + Vector3(0.0, 0.03, 0.0)
		match side:
			"north":
				point.z += SIDEWALK_ROUTE_OFFSET
			"south":
				point.z -= SIDEWALK_ROUTE_OFFSET
			"west":
				point.x += SIDEWALK_ROUTE_OFFSET
			"east":
				point.x -= SIDEWALK_ROUTE_OFFSET
		route.append(point)
	return route


func _road_component_cells(start_cell: Vector2i) -> Array[Vector2i]:
	if not _road_cells.has(_cell_key(start_cell)):
		return []
	var queue: Array[Vector2i] = [start_cell]
	var visited := {_cell_key(start_cell): true}
	var component: Array[Vector2i] = []
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		component.append(current)
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not _road_cells.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			queue.append(neighbor)
	return component


func _farthest_road_in_component(start_cell: Vector2i, component: Array[Vector2i]) -> Vector2i:
	var allowed := {}
	for cell in component:
		allowed[_cell_key(cell)] = true
	var queue: Array[Vector2i] = [start_cell]
	var visited := {_cell_key(start_cell): true}
	var last := start_cell
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		last = current
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not allowed.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			queue.append(neighbor)
	return last


func _road_path_between(start_cell: Vector2i, end_cell: Vector2i, component: Array[Vector2i]) -> Array[Vector2i]:
	var allowed := {}
	for cell in component:
		allowed[_cell_key(cell)] = true
	var queue: Array[Vector2i] = [start_cell]
	var parents := {}
	var visited := {_cell_key(start_cell): true}
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		if current == end_cell:
			break
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not allowed.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			parents[neighbor_key] = current
			queue.append(neighbor)
	if not visited.has(_cell_key(end_cell)):
		return [start_cell, end_cell]
	var path: Array[Vector2i] = []
	var current: Vector2i = end_cell
	while true:
		path.push_front(current)
		if current == start_cell:
			break
		current = parents[_cell_key(current)]
	return path


func _route_length(route_points: Array[Vector3]) -> float:
	var total := 0.0
	for i in range(route_points.size() - 1):
		total += route_points[i].distance_to(route_points[i + 1])
	return total


func _sample_ping_pong_route(route_points: Array[Vector3], route_length: float, progress: float) -> Dictionary:
	var cycle_length := maxf(route_length * 2.0, 0.001)
	var cycle_progress := fmod(progress, cycle_length)
	var travel := cycle_progress
	var reverse := false
	if cycle_progress > route_length:
		travel = cycle_length - cycle_progress
		reverse = true
	var traversed := 0.0
	for i in range(route_points.size() - 1):
		var a: Vector3 = route_points[i]
		var b: Vector3 = route_points[i + 1]
		var segment_length := a.distance_to(b)
		if traversed + segment_length >= travel or i == route_points.size() - 2:
			var local_t := 0.0 if segment_length <= 0.001 else clampf((travel - traversed) / segment_length, 0.0, 1.0)
			var position := a.lerp(b, local_t)
			var heading_vec := (a - b) if reverse else (b - a)
			var heading := 0.0
			if heading_vec.length() > 0.01:
				heading = atan2(heading_vec.x, heading_vec.z)
			return {
				"position": position,
				"heading": heading,
			}
		traversed += segment_length
	return {
		"position": route_points[route_points.size() - 1],
		"heading": 0.0,
	}


func _update_day_night_visuals() -> void:
	if lighting_controller and lighting_controller.has_method("apply_cycle"):
		lighting_controller.call("apply_cycle", _day, _simulation_clock, _window_bands, _town_light_strength(), _ambient_light_scale)
		return
	var town_strength := _town_light_strength()
	var cycle := fmod(float(_day - 1) + _simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var night_strength: float = clampf(1.0 - town_strength * 0.1 + moon_wave * 0.01, 0.32, 1.0)
	var sky_top: Color = Color(0.05, 0.06, 0.09).lerp(Color(0.06, 0.07, 0.1), town_strength * 0.18)
	var sky_horizon: Color = Color(0.06, 0.06, 0.08).lerp(Color(0.12, 0.1, 0.09), town_strength * 0.12)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_COLOR
		env.background_color = sky_top.lerp(sky_horizon, 0.24)
		env.ambient_light_color = sky_top.lerp(Color(0.72, 0.7, 0.68), 0.05)
		env.ambient_light_energy = (0.048 + town_strength * 0.018) * _ambient_light_scale
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.005 + town_strength * 0.005
		env.glow_intensity = 0.01 + town_strength * 0.01
		env.adjustment_enabled = true
		env.adjustment_brightness = 1.0 + maxf(0.0, _ambient_light_scale - 1.0) * 0.45
		env.adjustment_contrast = 0.98 + night_strength * 0.015
		env.adjustment_saturation = 1.04
	if sun:
		sun.light_color = Color(0.55, 0.63, 0.82).lerp(Color(0.82, 0.74, 0.66), town_strength * 0.2)
		sun.light_energy = 0.16 + town_strength * 0.06
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 1.0
	if fill_light:
		fill_light.light_color = Color(0.26, 0.34, 0.54).lerp(Color(0.8, 0.75, 0.7), town_strength * 0.1)
		fill_light.light_energy = 0.02 + town_strength * 0.01

	for band in _window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.14 + town_strength * 0.05 + night_strength * 0.03


func _spawn_road_tile(world_position: Vector3, preview: bool) -> Node3D:
	var cell := _world_to_cell(world_position)
	var extra := [cell]
	for neighbor in _neighbor_cells(cell):
		if _road_cells.has(_cell_key(neighbor)):
			extra.append(neighbor)
	var root := _build_road_tile_mesh(cell, preview, extra)
	root.position = world_position
	return root


func _town_light_strength() -> float:
	var active_count := 0
	for placement_variant in _placements.values():
		var placement: Dictionary = placement_variant
		var tool := str(placement.get("tool", ""))
		if tool == BUILD_TOOL_ROAD or SCENIC_TOOL_SPECS.has(tool):
			continue
		active_count += 1
	return clampf(0.03 + float(active_count) * 0.01, 0.0, 0.08)


func _spawn_house_tile(world_position: Vector3, preview: bool) -> Node3D:
	var root := Node3D.new()
	root.position = world_position
	var wall_material: Material = _ghost_base_material if preview else _make_material("efe4d5", 0.88)
	var roof_material: Material = _ghost_accent_material if preview else _make_material("b66f4d", 0.74)
	var pad_material: Material = _ghost_base_material if preview else _make_material("ddd3c6", 0.9)

	_add_box(Vector3(0.0, 0.02, 0.42), Vector3(4.6, 0.04, 4.6), pad_material, root)
	_add_box(Vector3(0.0, 0.5, -0.56), Vector3(1.62, 0.92, 1.34), wall_material, root)
	_add_box(Vector3(0.42, 0.42, 0.04), Vector3(0.62, 0.66, 0.7), wall_material, root)
	var roof_a := _add_box(Vector3(0.0, 1.0, -0.42), Vector3(1.84, 0.16, 0.82), roof_material, root)
	var roof_b := _add_box(Vector3(0.0, 1.0, -0.78), Vector3(1.84, 0.16, 0.82), roof_material, root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -7.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 7.0)
	var window_material: Material = _ghost_accent_material if preview else _window_material
	_add_window_band_local(Vector3(-0.46, 0.5, -0.12), Vector3(0.28, 0.34, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.46, 0.5, -0.12), Vector3(0.28, 0.34, 0.05), root, window_material)
	_add_window_band_local(Vector3(-0.66, 0.44, -0.88), Vector3(0.22, 0.28, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.66, 0.44, -0.88), Vector3(0.22, 0.28, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.84, 0.42, -0.02), Vector3(0.18, 0.24, 0.05), root, window_material)
	_add_round_canopy(Vector3(0.0, 0.24, 0.42), Vector3(0.78, 0.12, 0.22), window_material, root)
	_add_house_front_lamp_local(Vector3(1.14, 0.0, 1.48), root, preview)
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
	water_mesh.top_radius = float(GRID_SIZE) * 0.54
	water_mesh.bottom_radius = float(GRID_SIZE) * 0.59
	water_mesh.height = 0.22
	water.mesh = water_mesh
	water.material_override = _water_material
	water.position = Vector3(0.0, -0.62, 0.0)
	grid_root.add_child(water)

	var shallows := MeshInstance3D.new()
	var shallow_mesh := CylinderMesh.new()
	shallow_mesh.top_radius = float(GRID_SIZE) * 0.515
	shallow_mesh.bottom_radius = float(GRID_SIZE) * 0.54
	shallow_mesh.height = 0.08
	shallows.mesh = shallow_mesh
	shallows.material_override = _make_transparent_material(Color("d7f3ee"), 0.2, 0.28)
	shallows.position = Vector3(0.0, -0.49, 0.0)
	grid_root.add_child(shallows)


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
	lip.material_override = _make_material("9b8b72", 0.95)
	lip.position = Vector3(0.0, -0.11, 0.0)
	grid_root.add_child(lip)

	var turf := MeshInstance3D.new()
	var turf_mesh := BoxMesh.new()
	turf_mesh.size = Vector3(GRID_SIZE + 0.8, 0.14, GRID_SIZE + 0.8)
	turf.mesh = turf_mesh
	turf.material_override = _make_material("8fa369", 0.98)
	turf.position = Vector3(0.0, -0.01, 0.0)
	grid_root.add_child(turf)


func _build_ground_tiles() -> void:
	var half := (GRID_SIZE - 1) * TILE_SIZE * 0.5

	for z in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			var tile := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			var height_variation := 0.1 + sin(float(x) * 0.35) * 0.012 + cos(float(z) * 0.27) * 0.01
			mesh.size = Vector3(1.04, height_variation, 1.04)
			tile.mesh = mesh
			var material := _ground_material_a
			if (x + z) % 3 == 0:
				material = _ground_material_b
			elif (x * 3 + z * 5) % 4 == 0:
				material = _ground_material_c
			tile.material_override = material
			tile.position = Vector3(x - half, -0.02, z - half)
			grid_root.add_child(tile)

	for edge in range(GRID_SIZE):
		_add_edge_post(Vector3(-half - 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(half + 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(edge - half, 0.12, -half - 0.9))
		_add_edge_post(Vector3(edge - half, 0.12, half + 0.9))

	var shore_ring := float(GRID_SIZE) * 0.5 - 2.1
	var shore_inner := float(GRID_SIZE) * 0.22
	for shore_pos in [
		Vector3(-shore_ring, -0.14, -shore_inner * 1.4),
		Vector3(-shore_ring, -0.14, -shore_inner * 0.4),
		Vector3(-shore_ring, -0.14, shore_inner * 0.4),
		Vector3(-shore_ring, -0.14, shore_inner * 1.4),
		Vector3(shore_ring, -0.14, -shore_inner * 1.2),
		Vector3(shore_ring, -0.14, -shore_inner * 0.2),
		Vector3(shore_ring, -0.14, shore_inner * 0.6),
		Vector3(shore_ring, -0.14, shore_inner * 1.6),
		Vector3(-shore_inner * 1.4, -0.14, -shore_ring),
		Vector3(-shore_inner * 0.4, -0.14, -shore_ring),
		Vector3(shore_inner * 0.6, -0.14, -shore_ring),
		Vector3(shore_inner * 1.6, -0.14, -shore_ring),
		Vector3(-shore_inner * 1.6, -0.14, shore_ring),
		Vector3(-shore_inner * 0.6, -0.14, shore_ring),
		Vector3(shore_inner * 0.6, -0.14, shore_ring),
		Vector3(shore_inner * 1.6, -0.14, shore_ring),
	]:
		_add_shore_detail(shore_pos)


func _build_meadow() -> void:
	var edge_ring := float(GRID_SIZE) * 0.5 - 6.0
	var near_ring := float(GRID_SIZE) * 0.32
	for patch in [
		{"center": Vector3(-edge_ring, 0.02, -near_ring), "size": Vector2(5.8, 3.4), "clumps": 14},
		{"center": Vector3(edge_ring, 0.02, -near_ring), "size": Vector2(5.2, 3.0), "clumps": 12},
		{"center": Vector3(-edge_ring, 0.02, near_ring), "size": Vector2(5.5, 3.8), "clumps": 15},
		{"center": Vector3(edge_ring, 0.02, near_ring), "size": Vector2(5.0, 3.2), "clumps": 12},
		{"center": Vector3(-near_ring, 0.02, edge_ring), "size": Vector2(4.6, 3.0), "clumps": 11},
		{"center": Vector3(near_ring, 0.02, edge_ring), "size": Vector2(4.2, 2.8), "clumps": 10},
		{"center": Vector3(-near_ring * 0.8, 0.02, -edge_ring), "size": Vector2(4.4, 2.8), "clumps": 11},
		{"center": Vector3(near_ring * 0.7, 0.02, -edge_ring), "size": Vector2(4.0, 2.6), "clumps": 10}
	]:
		_add_meadow_patch(patch.center, patch.size, patch.clumps)

	for tuft in [
		Vector3(-8.8, 0.06, 2.35),
		Vector3(-6.9, 0.06, 6.55),
		Vector3(-4.25, 0.06, 8.75),
		Vector3(4.75, 0.06, 9.45),
		Vector3(8.8, 0.06, 4.45),
		Vector3(9.4, 0.06, -3.2),
		Vector3(-9.2, 0.06, -5.35),
		Vector3(2.6, 0.06, -9.55),
	]:
		_add_grass_clump(tuft, 1.12)
	for patch in [
		Vector3(-14.0, 0.03, -11.0),
		Vector3(12.6, 0.03, -14.6),
		Vector3(-10.5, 0.03, 14.2),
		Vector3(14.1, 0.03, 11.6),
	]:
		_add_wildflower_cluster(patch, 8, _flower_material_blue if patch.x > 0.0 else _flower_material_pink, grid_root, 0.16)


func _build_nature() -> void:
	var edge_ring := float(GRID_SIZE) * 0.5 - 5.4
	var side_ring := float(GRID_SIZE) * 0.34
	for tree_pos in [
		Vector3(-edge_ring, 0.18, -side_ring),
		Vector3(-edge_ring, 0.18, side_ring),
		Vector3(edge_ring, 0.18, -side_ring),
		Vector3(edge_ring, 0.18, side_ring),
		Vector3(-side_ring, 0.18, edge_ring),
		Vector3(side_ring, 0.18, edge_ring),
		Vector3(-side_ring * 1.2, 0.18, -edge_ring),
		Vector3(side_ring * 1.1, 0.18, -edge_ring),
		Vector3(-edge_ring - 0.8, 0.18, -1.6),
		Vector3(edge_ring + 0.6, 0.18, 2.2),
	]:
		_add_tree(tree_pos)

	for park_pos in [
		Vector3(-side_ring, 0.04, -2.0),
		Vector3(side_ring, 0.04, 2.6),
		Vector3(0.0, 0.04, side_ring + 2.0)
	]:
		_add_park_corner(park_pos)

	for flower_pos in [
		Vector3(-4.25, 0.08, 6.8),
		Vector3(4.55, 0.08, 6.4),
		Vector3(-7.4, 0.08, -5.8),
		Vector3(7.2, 0.08, -6.2)
	]:
		_add_flower_patch(flower_pos, 5, _flower_material_pink if flower_pos.x < 0.0 else _flower_material_blue)


func _cozy_palette(kind: String, variant: int) -> Dictionary:
	var idx := posmod(variant, 10)
	var walls := ["efe2d1", "e7dbc4", "d9e2d0", "dce4eb"]
	var roofs := ["a86a48", "7f5a7c", "6f7d51", "546e87"]
	var trims := ["f8f0df", "ede5d2", "f4eee0", "fff7eb"]
	var accents := ["76d9c4", "ef9d6a", "8aaede", "d46e62"]

	match kind:
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
			walls = ["efe1cf", "e6ddcf", "d8e1d3", "dfe4e6"]
			roofs = ["b76f4d", "815640", "72835a", "5d6c7a"]
			accents = ["d9b67d", "94b6a7", "cb9d8b", "d8d1a3"]

	return {
		"wall": Color(walls[idx % walls.size()]),
		"roof": Color(roofs[idx % roofs.size()]),
		"trim": Color(trims[idx % trims.size()]),
		"accent": Color(accents[idx % accents.size()])
	}


func _house_variant_profile(variant: int) -> Dictionary:
	var profiles := [
		{"width": 2.34, "depth": 1.88, "height": 1.16, "roof_tilt": 22.0, "roof_lift": 0.32, "roof_overhang": 0.52, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.44, "porch_width": 0.66, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": false, "fence_width": 3.9},
		{"width": 2.18, "depth": 1.78, "height": 1.02, "roof_tilt": 16.0, "roof_lift": 0.24, "roof_overhang": 0.44, "wing": false, "garage": true, "garage_side": 1.0, "dormers": 0, "pool": false, "porch_depth": 0.32, "porch_width": 0.54, "entry_offset": -0.26, "bay": true, "shed": false, "trellis": false, "fence_width": 3.86},
		{"width": 2.64, "depth": 1.94, "height": 1.12, "roof_tilt": 18.0, "roof_lift": 0.28, "roof_overhang": 0.5, "wing": true, "garage": false, "garage_side": -1.0, "dormers": 1, "pool": true, "porch_depth": 0.46, "porch_width": 0.72, "entry_offset": 0.18, "bay": false, "shed": false, "trellis": false, "fence_width": 3.92},
		{"width": 2.24, "depth": 1.82, "height": 1.3, "roof_tilt": 25.0, "roof_lift": 0.34, "roof_overhang": 0.48, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.36, "porch_width": 0.52, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": true, "fence_width": 3.84},
		{"width": 2.82, "depth": 1.92, "height": 1.04, "roof_tilt": 14.0, "roof_lift": 0.22, "roof_overhang": 0.42, "wing": true, "garage": true, "garage_side": -1.0, "dormers": 0, "pool": false, "porch_depth": 0.28, "porch_width": 0.46, "entry_offset": 0.34, "bay": true, "shed": false, "trellis": false, "fence_width": 4.02},
		{"width": 2.48, "depth": 1.98, "height": 1.14, "roof_tilt": 20.0, "roof_lift": 0.3, "roof_overhang": 0.54, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.56, "porch_width": 0.86, "entry_offset": -0.14, "bay": false, "shed": true, "trellis": false, "fence_width": 3.96},
		{"width": 2.06, "depth": 1.68, "height": 1.38, "roof_tilt": 27.0, "roof_lift": 0.38, "roof_overhang": 0.46, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.28, "porch_width": 0.44, "entry_offset": 0.0, "bay": true, "shed": false, "trellis": false, "fence_width": 3.7},
		{"width": 2.72, "depth": 1.84, "height": 1.0, "roof_tilt": 15.0, "roof_lift": 0.22, "roof_overhang": 0.48, "wing": false, "garage": true, "garage_side": 1.0, "dormers": 1, "pool": true, "porch_depth": 0.34, "porch_width": 0.56, "entry_offset": -0.3, "bay": false, "shed": false, "trellis": false, "fence_width": 4.08},
		{"width": 2.42, "depth": 1.9, "height": 1.08, "roof_tilt": 19.0, "roof_lift": 0.28, "roof_overhang": 0.58, "wing": true, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.54, "porch_width": 0.94, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": true, "fence_width": 4.0},
		{"width": 2.56, "depth": 1.86, "height": 1.12, "roof_tilt": 21.0, "roof_lift": 0.3, "roof_overhang": 0.5, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.4, "porch_width": 0.62, "entry_offset": 0.22, "bay": true, "shed": true, "trellis": false, "fence_width": 3.9},
	]
	return profiles[posmod(variant, profiles.size())]


func _populate_village_house_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("house", variant)
	var profile := _house_variant_profile(variant)
	var width: float = float(profile["width"])
	var depth: float = float(profile["depth"])
	var height: float = float(profile["height"])
	var roof_tilt: float = float(profile["roof_tilt"])
	var roof_lift: float = float(profile["roof_lift"])
	var roof_overhang: float = float(profile["roof_overhang"])
	var porch_depth: float = float(profile["porch_depth"])
	var porch_width: float = float(profile["porch_width"])
	var entry_offset: float = float(profile["entry_offset"])
	var garage_side: float = float(profile["garage_side"])
	var dormers: int = int(profile["dormers"])
	var has_wing: bool = bool(profile["wing"])
	var has_garage: bool = bool(profile["garage"])
	var has_pool: bool = bool(profile["pool"])
	var has_bay: bool = bool(profile["bay"])
	var has_shed: bool = bool(profile["shed"])
	var has_trellis: bool = bool(profile["trellis"])
	var fence_width: float = max(4.8, float(profile["fence_width"]) + 0.9)
	_add_parcel_shadow(root, Vector2(5.7, 5.7), 0.26)
	_add_box(Vector3(0.0, 0.015, 0.28), Vector3(5.34, 0.04, 5.14), _make_material("8da56b", 0.98), lot_root)
	_add_box(Vector3(0.0, 0.02, 1.72), Vector3(4.84, 0.03, 1.44), _make_material("d8c6a7", 0.9), lot_root)
	_add_box(Vector3(0.0, 0.028, 1.12), Vector3(5.02, 0.025, 0.42), _make_material("c2b39b", 0.88), lot_root)
	if has_garage:
		var drive_x := 1.08 * garage_side
		_add_box(Vector3(drive_x * 1.18, 0.021, 0.74), Vector3(1.34, 0.028, 3.28), _make_material("b8a58b", 0.9), lot_root)
		_add_town_path(Vector3(drive_x * 1.18, 0.03, 1.2), Vector2(0.9, 2.42), lot_root)
	else:
		_add_town_path(Vector3(entry_offset, 0.03, 1.18), Vector2(0.74, 2.1), lot_root)

	var plaster := _make_material_from_color(palette.wall.lightened(0.02), 0.95)
	var timber := _make_material("8d6848", 0.88)
	var porch_wood := _make_material("976f49", 0.84)
	var roof_material := _make_material_from_color(palette.roof, 0.74)
	var trim_material := _make_material_from_color(palette.trim, 0.88)

	var house_z := -1.18
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.06, house_z), Vector3(width, height, depth), plaster, structure_root, 0.22)
	if has_wing:
		_add_soft_block(Vector3(-0.96, height * 0.42 + 0.04, house_z + 0.34), Vector3(width * 0.42, height * 0.68, depth * 0.82), plaster, structure_root, 0.16)
	if has_garage:
		_add_soft_block(Vector3(garage_side * 1.22, 0.42, house_z + 0.3), Vector3(1.24, 0.72, 1.68), _make_material_from_color(palette.wall.darkened(0.04), 0.93), structure_root, 0.12)
		_add_box(Vector3(garage_side * 1.22, 0.28, house_z + 1.0), Vector3(0.8, 0.52, 0.06), _make_material("f0eadc", 0.9), structure_root)
		_add_box(Vector3(garage_side * 1.22, 0.62, house_z + 1.02), Vector3(0.84, 0.06, 0.06), _make_material("d0c5b5", 0.86), structure_root)
	if has_bay:
		_add_soft_block(Vector3(0.74, 0.52, house_z + 0.66), Vector3(0.54, 0.64, 0.56), plaster, structure_root, 0.12)

	_add_gabled_roof(Vector3(0.0, height + roof_lift, house_z), Vector3(width + roof_overhang, 0.34, depth + roof_overhang), roof_material, structure_root, roof_tilt)
	if has_wing:
		_add_gabled_roof(Vector3(-0.96, height * 0.78 + 0.26, house_z + 0.34), Vector3(width * 0.56, 0.24, depth * 0.92), _make_material_from_color(palette.roof.lightened(0.04), 0.74), structure_root, roof_tilt - 2.0)
	if has_garage:
		_add_gabled_roof(Vector3(garage_side * 1.22, 0.84, house_z + 0.3), Vector3(1.44, 0.18, 1.92), _make_material_from_color(palette.roof.darkened(0.05), 0.74), structure_root, max(12.0, roof_tilt - 5.0))

	for timber_x in [-0.58, 0.0, 0.58]:
		_add_box(Vector3(timber_x, 0.54, house_z + 0.88), Vector3(0.12, 0.9, 0.1), timber, structure_root)
	_add_box(Vector3(entry_offset, 0.12, house_z + 1.08), Vector3(max(0.74, width * porch_width), 0.1, porch_depth), porch_wood, structure_root)
	_add_round_canopy(Vector3(entry_offset, 0.46, house_z + 1.12), Vector3(max(0.82, width * porch_width), 0.14, 0.32), _make_material_from_color(palette.accent, 0.5), structure_root)
	_add_box(Vector3(entry_offset, 0.06, house_z + 1.42), Vector3(max(0.42, width * 0.24), 0.08, 0.28), _make_material("d7c7b0", 0.9), structure_root)

	_add_box(Vector3(entry_offset, 0.32, house_z + 0.76), Vector3(width * 0.18, 0.62, 0.08), _make_material("6c4d32", 0.86), structure_root)
	_add_box(Vector3(entry_offset, 0.26, house_z + 1.08), Vector3(width * 0.12, 0.46, 0.02), _make_material("f4efe1", 0.88), structure_root)
	for window_pos in [
		Vector3(-0.62, 0.5, house_z + 0.82),
		Vector3(0.66, 0.5, house_z + 0.82),
		Vector3(-0.58, 0.56, house_z - 0.28),
		Vector3(0.6, 0.56, house_z - 0.28),
	]:
		_add_window_band_local(window_pos, Vector3(0.26, 0.34, 0.05), structure_root)
		_add_box(window_pos + Vector3(-0.16, 0.0, 0.0), Vector3(0.05, 0.36, 0.05), timber, structure_root)
		_add_box(window_pos + Vector3(0.16, 0.0, 0.0), Vector3(0.05, 0.36, 0.05), timber, structure_root)
	_add_window_band_local(Vector3(0.0, 0.56, house_z + 0.48), Vector3(0.42, 0.38, 0.05), structure_root)
	_add_box(Vector3(-0.24, 0.56, house_z + 0.48), Vector3(0.04, 0.4, 0.04), timber, structure_root)
	_add_box(Vector3(0.24, 0.56, house_z + 0.48), Vector3(0.04, 0.4, 0.04), timber, structure_root)
	if has_bay:
		_add_window_band_local(Vector3(0.74, 0.54, house_z + 0.86), Vector3(0.34, 0.3, 0.05), structure_root)

	_add_box(Vector3(0.0, 0.8, house_z - depth * 0.46), Vector3(width * 0.18, 0.78, depth * 0.06), timber, structure_root)
	for dormer_index in range(dormers):
		var spacing := 0.52 if dormers > 1 else 0.0
		var dormer_x := (float(dormer_index) - float(dormers - 1) * 0.5) * spacing
		_add_dormer(Vector3(dormer_x, height + roof_lift + 0.14, house_z + 0.12), palette.trim, palette.roof, structure_root)
	if not has_garage:
		_add_garden_path(lot_root, width * 0.24, 2.46)
	_add_picket_fence(lot_root, Vector3(0.0, 0.0, 1.86), fence_width)
	_add_box(Vector3(-2.28, 0.18, -0.12), Vector3(0.04, 0.32, 4.02), _make_material("efe3cf", 0.86), lot_root)
	_add_box(Vector3(2.28, 0.18, -0.12), Vector3(0.04, 0.32, 4.02), _make_material("efe3cf", 0.86), lot_root)
	_add_box(Vector3(0.0, 0.18, -2.14), Vector3(4.54, 0.32, 0.04), _make_material("efe3cf", 0.86), lot_root)
	_add_flower_box_local(Vector3(entry_offset - 0.32, 0.18, house_z + 0.76), palette.accent, lot_root)
	_add_flower_box_local(Vector3(entry_offset + 0.4, 0.18, house_z + 0.76), palette.trim, lot_root)
	_add_house_front_lamp_local(Vector3(1.18, 0.0, 1.56), lot_root, false)
	_add_shrub_cluster(Vector3(-1.7, 0.0, 1.36), palette.accent, lot_root, 6)
	_add_shrub_cluster(Vector3(1.7, 0.0, 1.36), palette.trim, lot_root, 6)
	_add_hedge_strip_local(Vector3(0.0, 0.08, -1.98), 4.12, palette.accent.darkened(0.18), lot_root)
	_add_local_flower_patch(Vector3(1.56, 0.05, 1.12), 9, _make_material_from_color(palette.trim, 0.8), lot_root)
	_add_local_flower_patch(Vector3(-1.56, 0.05, 1.06), 8, _make_material_from_color(palette.accent, 0.8), lot_root)
	_add_box(Vector3(-1.96, 0.26, 1.88), Vector3(0.16, 0.34, 0.12), _make_material("8c6f4f", 0.84), lot_root)
	_add_box(Vector3(-1.96, 0.38, 1.84), Vector3(0.22, 0.16, 0.04), _make_material("f4efe4", 0.86), lot_root)
	_add_bench_local(Vector3(1.46, 0.02, 1.26), -0.2, lot_root)
	if has_pool:
		_add_box(Vector3(1.38, 0.03, -0.74), Vector3(1.42, 0.05, 1.04), _make_material("5f9fb2", 0.46), lot_root)
		_add_box(Vector3(1.38, 0.04, -0.74), Vector3(1.22, 0.02, 0.86), _make_transparent_material(Color("c4f6ff"), 0.3, 0.16), lot_root)
	else:
		_add_box(Vector3(1.38, 0.03, -0.66), Vector3(1.52, 0.04, 1.22), _make_material("8ea06a", 0.96), lot_root)
		for gx in [-0.24, 0.0, 0.24]:
			_add_box(Vector3(1.38 + gx * 1.2, 0.08, -0.66), Vector3(0.04, 0.12, 0.92), _make_material("7a5e3f", 0.84), lot_root)
	if has_shed:
		_add_soft_block(Vector3(-1.52, 0.36, -1.46), Vector3(0.62, 0.58, 0.58), _make_material("c9b79f", 0.92), lot_root, 0.08)
		_add_gabled_roof(Vector3(-1.52, 0.72, -1.46), Vector3(0.76, 0.16, 0.74), _make_material_from_color(palette.roof.darkened(0.08), 0.74), lot_root, 18.0)
	if has_trellis:
		_add_box(Vector3(-1.58, 0.44, 1.18), Vector3(0.08, 0.84, 0.08), timber, lot_root)
		_add_box(Vector3(-1.12, 0.44, 1.18), Vector3(0.08, 0.84, 0.08), timber, lot_root)
		_add_box(Vector3(-1.35, 0.82, 1.18), Vector3(0.62, 0.06, 0.08), timber, lot_root)
	if int(variant) % 2 == 0:
		_add_box(Vector3(0.96, height + 0.58, house_z - 0.48), Vector3(0.22, 0.72, 0.22), _stone_material, structure_root)


func _add_village_house_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_village_house_variant(root, lot_root, structure_root, variant)
	return root


func _add_pond_variant(tool: String, position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_pond_variant(root, lot_root, structure_root, tool, variant)
	return root


func _populate_pond_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, tool: String, variant: int) -> void:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var footprint: Vector2i = spec.get("footprint", Vector2i(3, 3))
	var water_size: Vector2 = spec.get("water_size", Vector2(1.72, 1.64))
	var shore_size: Vector2 = spec.get("shore_size", Vector2(2.18, 2.04))
	var shore_color := _make_material("d4c09f", 0.92)
	var grass_color := _make_material("8da86a", 0.98)
	var water_surface := _make_transparent_material(Color("aee0eb"), 0.24, 0.38)
	var water_deep := _make_material("5b93a2", 0.32, 0.0, true, "d2f3f7", 0.05)
	_add_parcel_shadow(root, Vector2(float(footprint.x) + 0.6, float(footprint.y) + 0.6), 0.18)
	_add_box(Vector3(0.0, 0.012, 0.0), Vector3(shore_size.x, 0.04, shore_size.y), grass_color, lot_root)
	_add_soft_block(Vector3(0.0, 0.04, 0.0), Vector3(shore_size.x * 0.86, 0.04, shore_size.y * 0.86), shore_color, lot_root, 0.18)
	_add_soft_block(Vector3(0.0, 0.06, 0.0), Vector3(water_size.x, 0.03, water_size.y), water_deep, structure_root, 0.22)
	_add_soft_block(Vector3(0.0, 0.08, 0.0), Vector3(water_size.x * 0.82, 0.02, water_size.y * 0.82), water_surface, structure_root, 0.18)
	_add_box(Vector3(0.0, 0.07, water_size.y * 0.46), Vector3(water_size.x * 0.92, 0.02, 0.08), shore_color, lot_root)
	_add_box(Vector3(0.0, 0.07, -water_size.y * 0.46), Vector3(water_size.x * 0.92, 0.02, 0.08), shore_color, lot_root)
	_add_box(Vector3(water_size.x * 0.46, 0.07, 0.0), Vector3(0.08, 0.02, water_size.y * 0.92), shore_color, lot_root)
	_add_box(Vector3(-water_size.x * 0.46, 0.07, 0.0), Vector3(0.08, 0.02, water_size.y * 0.92), shore_color, lot_root)
	_add_local_sphere(Vector3(-water_size.x * 0.24, 0.09, -water_size.y * 0.18), 0.12, 0.08, _make_material("d8e7c5", 0.9), structure_root)
	_add_local_sphere(Vector3(water_size.x * 0.2, 0.09, water_size.y * 0.2), 0.1, 0.08, _make_material("d8e7c5", 0.9), structure_root)
	_add_local_cylinder(Vector3(-water_size.x * 0.4, 0.08, water_size.y * 0.36), 0.02, 0.02, 0.2, _grass_blade_material, lot_root)
	_add_local_cylinder(Vector3(water_size.x * 0.36, 0.08, -water_size.y * 0.34), 0.02, 0.02, 0.22, _grass_blade_material, lot_root)
	if tool == BUILD_TOOL_POND_LARGE:
		_add_box(Vector3(0.22, 0.076, -0.12), Vector3(0.32, 0.02, 0.18), _stone_material, lot_root)
		_add_box(Vector3(-0.18, 0.076, 0.16), Vector3(0.24, 0.02, 0.12), _stone_material, lot_root)


func _add_forest_variant(tool: String, position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_forest_variant(root, lot_root, structure_root, tool, variant)
	return root


func _populate_forest_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, tool: String, variant: int) -> void:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var footprint: Vector2i = spec.get("footprint", Vector2i(4, 4))
	var tree_count: int = int(spec.get("tree_count", 6))
	var footprint_x := float(footprint.x)
	var footprint_y := float(footprint.y)
	var ground_color := _make_material("8fa76d", 0.98)
	var soil_color := _make_material("7d694f", 0.95)
	_add_parcel_shadow(root, Vector2(footprint_x + 0.4, footprint_y + 0.4), 0.18)
	_add_box(Vector3(0.0, 0.012, 0.0), Vector3(footprint_x * 0.84, 0.05, footprint_y * 0.84), ground_color, lot_root)
	_add_soft_block(Vector3(0.0, 0.04, 0.0), Vector3(footprint_x * 0.72, 0.03, footprint_y * 0.72), soil_color, lot_root, 0.14)
	var angle_shift := float(posmod(variant, 3)) * 0.37
	var radius_x := footprint_x * 0.34
	var radius_z := footprint_y * 0.34
	for i in range(tree_count):
		var t := float(i) / maxf(1.0, float(tree_count))
		var angle := t * TAU + angle_shift
		var ring := 0.54 + 0.18 * sin(t * TAU * 2.0 + angle_shift * 1.6)
		var tree_pos := Vector3(cos(angle) * radius_x * ring, 0.0, sin(angle) * radius_z * ring)
		if abs(tree_pos.x) < 0.16 and abs(tree_pos.z) < 0.16:
			tree_pos += Vector3(0.26, 0.0, -0.18)
		_add_local_tree(tree_pos, lot_root)
	var deer_offset := 0.16 if posmod(variant, 2) == 0 else -0.12
	_add_deer_local(Vector3(-radius_x * 0.42, 0.0, radius_z * 0.18 + deer_offset), deg_to_rad(20.0), lot_root)
	_add_deer_local(Vector3(radius_x * 0.34, 0.0, -radius_z * 0.24 - deer_offset), deg_to_rad(-32.0), lot_root)
	_add_box(Vector3(0.0, 0.03, footprint_y * 0.32), Vector3(0.18, 0.02, footprint_y * 0.22), _make_material("d6c7a8", 0.9), lot_root)
	_add_box(Vector3(-footprint_x * 0.18, 0.03, footprint_y * 0.06), Vector3(0.18, 0.02, 0.12), _make_material("d6c7a8", 0.9), lot_root)
	_add_box(Vector3(footprint_x * 0.16, 0.03, -footprint_y * 0.08), Vector3(0.18, 0.02, 0.12), _make_material("d6c7a8", 0.9), lot_root)


func _add_deer_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.32, 0.2), 0.16, root)
	var body_material := _make_material("c5a373", 0.9)
	var head_material := _make_material("d3af82", 0.88)
	var antler_material := _make_material("dbc8b4", 0.9)
	var leg_material := _make_material("7b5e46", 0.95)
	_add_soft_block(Vector3(0.0, 0.24, 0.0), Vector3(0.24, 0.16, 0.42), body_material, root, 0.05)
	_add_soft_block(Vector3(0.0, 0.34, 0.16), Vector3(0.12, 0.11, 0.18), head_material, root, 0.04)
	_add_box(Vector3(0.0, 0.46, 0.24), Vector3(0.08, 0.08, 0.08), antler_material, root)
	_add_box(Vector3(-0.06, 0.42, 0.24), Vector3(0.02, 0.06, 0.04), antler_material, root)
	_add_box(Vector3(0.06, 0.42, 0.24), Vector3(0.02, 0.06, 0.04), antler_material, root)
	for leg_x in [-0.08, 0.08]:
		for leg_z in [-0.12, 0.12]:
			_add_box(Vector3(leg_x, 0.08, leg_z), Vector3(0.04, 0.16, 0.04), leg_material, root)
	_add_box(Vector3(0.0, 0.18, -0.22), Vector3(0.06, 0.04, 0.08), antler_material, root)


func _populate_fire_station_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("fire", variant)
	var width := 2.9 + float(variant % 2) * 0.24
	var depth := 2.1 + float(int(variant / 3) % 2) * 0.16
	var height := 1.06 + float(int(variant / 5)) * 0.12
	_add_parcel_shadow(root, Vector2(5.0, 3.9), 0.24)

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(4.8, 0.04, 3.6), _make_material("c9c7b2", 0.98), lot_root)
	_add_box(Vector3(0.0, 0.035, 0.88), Vector3(3.4, 0.03, 1.38), _make_material("7c857a", 0.94), lot_root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.38), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), structure_root, 0.18)
	_add_soft_block(Vector3(width * 0.36, 1.08, -0.72), Vector3(0.66, 1.82, 0.66), _make_material_from_color(palette.trim, 0.84), structure_root, 0.11)
	_add_gabled_roof(Vector3(0.0, height + 0.18, -0.38), Vector3(width + 0.16, 0.18, depth + 0.22), _make_material_from_color(palette.roof, 0.78), structure_root, 10.0)
	for i in [-1, 0, 1]:
		_add_box(Vector3(i * width * 0.24, 0.3, 0.46), Vector3(width * 0.18, 0.56, 0.06), _make_material_from_color(palette.trim, 0.74), structure_root)
		_add_box(Vector3(i * width * 0.24, 0.62, 0.46), Vector3(width * 0.18, 0.08, 0.07), _make_material_from_color(palette.accent, 0.44), structure_root)
	_add_box(Vector3(0.0, 0.84, 0.5), Vector3(width * 0.54, 0.12, 0.06), _make_material_from_color(palette.accent, 0.4), structure_root)
	_add_local_cylinder(Vector3(width * 0.36, 2.08, -0.74), 0.1, 0.1, 0.28, _make_material_from_color(palette.accent, 0.46), structure_root)
	_add_frontage_detail_cluster(lot_root, width, 1.3, palette.accent, "fire")
	_add_hydrant_local(Vector3(-1.24, 0.08, 1.34), lot_root)
	for truck_x in [-0.86, 0.0, 0.86]:
		var truck_color := _make_material("c64b41", 0.74)
		_add_soft_block(Vector3(truck_x, 0.12, 1.06), Vector3(0.52, 0.2, 0.88), truck_color, lot_root, 0.06)
		_add_soft_block(Vector3(truck_x, 0.26, 0.94), Vector3(0.32, 0.12, 0.34), _make_material("f4efe6", 0.82), lot_root, 0.04)
	_add_shrub_cluster(Vector3(-1.08, 0.0, 1.2), palette.accent, lot_root, 3)
	_add_shrub_cluster(Vector3(1.08, 0.0, 1.2), palette.trim, lot_root, 3)


func _add_fire_station_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_fire_station_variant(root, lot_root, structure_root, variant)
	return root


func _populate_bank_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("bank", variant)
	var width := 2.62 + float(variant % 3) * 0.16
	var depth := 1.82 + float(variant % 2) * 0.12
	var height := 0.98 + float(int(variant / 4)) * 0.1
	_add_parcel_shadow(root, Vector2(3.9, 2.9), 0.22)

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(3.8, 0.04, 2.7), _make_material("d9d2bf", 0.98), lot_root)
	_add_box(Vector3(0.0, 0.03, 0.8), Vector3(2.4, 0.03, 0.9), _make_material("ede8da", 0.9), lot_root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.24), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), structure_root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.18, -0.24), Vector3(width + 0.18, 0.2, depth + 0.18), _make_material_from_color(palette.roof, 0.76), structure_root, 9.0)
	for sx in [-1, 0, 1]:
		_add_local_cylinder(Vector3(sx * width * 0.18, 0.34, 0.7), 0.08, 0.08, 0.58, _make_material_from_color(palette.trim, 0.84), structure_root)
	_add_box(Vector3(0.0, 0.78, 0.72), Vector3(width * 0.52, 0.1, 0.06), _make_material_from_color(palette.accent, 0.46), structure_root)
	_add_box(Vector3(0.0, 0.28, 0.68), Vector3(width * 0.16, 0.42, 0.05), _window_material, structure_root)
	_add_round_canopy(Vector3(0.0, 0.28, 0.92), Vector3(width * 0.44, 0.14, 0.18), _make_material_from_color(palette.trim, 0.48), structure_root)
	_add_local_sphere(Vector3(0.0, 1.18, -0.12), 0.18, 0.22, _make_material_from_color(palette.accent, 0.36), structure_root)
	_add_frontage_detail_cluster(lot_root, width, 1.24, palette.accent, "vault")
	_add_shrub_cluster(Vector3(-1.06, 0.0, 1.04), palette.accent, lot_root, 3)
	_add_shrub_cluster(Vector3(1.06, 0.0, 1.04), palette.trim, lot_root, 3)


func _add_bank_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_bank_variant(root, lot_root, structure_root, variant)
	return root


func _populate_grocery_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("grocery", variant)
	var width := 3.0 + float(variant % 3) * 0.16
	var depth := 2.02 + float(int(variant / 3) % 2) * 0.16
	var height := 0.96 + float(int(variant / 5)) * 0.1
	_add_parcel_shadow(root, Vector2(5.0, 3.9), 0.24)

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(4.8, 0.04, 3.6), _make_material("d5d1bc", 0.98), lot_root)
	_add_box(Vector3(0.0, 0.028, 0.72), Vector3(3.5, 0.03, 1.4), _make_material("7b7f81", 0.94), lot_root)
	for lane in [-1.0, 0.0, 1.0]:
		_add_box(Vector3(lane * 0.92, 0.045, 0.72), Vector3(0.08, 0.01, 1.16), _road_mark_material, lot_root)
	for stop_z in [0.2, 0.72, 1.24]:
		_add_box(Vector3(-1.56, 0.045, stop_z), Vector3(0.34, 0.01, 0.04), _road_mark_material, lot_root)
		_add_box(Vector3(-0.52, 0.045, stop_z), Vector3(0.34, 0.01, 0.04), _road_mark_material, lot_root)
		_add_box(Vector3(0.52, 0.045, stop_z), Vector3(0.34, 0.01, 0.04), _road_mark_material, lot_root)
		_add_box(Vector3(1.56, 0.045, stop_z), Vector3(0.34, 0.01, 0.04), _road_mark_material, lot_root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.48), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), structure_root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.16, -0.48), Vector3(width + 0.18, 0.18, depth + 0.2), _make_material_from_color(palette.roof, 0.76), structure_root, 8.0)
	_add_round_canopy(Vector3(0.0, 0.4, 0.46), Vector3(width * 0.92, 0.18, 0.24), _make_material_from_color(palette.accent, 0.46), structure_root)
	_add_box(Vector3(0.0, 0.26, 0.34), Vector3(width * 0.52, 0.34, 0.05), _window_material, structure_root)
	_add_box(Vector3(0.0, 0.78, 0.38), Vector3(width * 0.56, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), structure_root)
	for produce_data in [
		{"pos": Vector3(-width * 0.28, 0.12, 0.74), "color": Color("cb644c")},
		{"pos": Vector3(-width * 0.1, 0.12, 0.74), "color": Color("7da85b")},
		{"pos": Vector3(width * 0.08, 0.12, 0.74), "color": Color("f0be63")},
		{"pos": Vector3(width * 0.26, 0.12, 0.74), "color": Color("6ca8c4")}
	]:
		_add_box(produce_data.pos, Vector3(0.18, 0.14, 0.18), _make_material_from_color(produce_data.color, 0.82), structure_root)
	_add_crate_stack_local(Vector3(-width * 0.42, 0.08, 0.92), palette.accent, lot_root)
	_add_frontage_detail_cluster(lot_root, width, 1.24, palette.accent, "grocer")
	_add_shrub_cluster(Vector3(-1.42, 0.0, 1.34), palette.trim, lot_root, 2)
	_add_shrub_cluster(Vector3(1.42, 0.0, 1.34), palette.accent, lot_root, 2)


func _add_grocery_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_grocery_variant(root, lot_root, structure_root, variant)
	return root


func _populate_restaurant_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("restaurant", variant)
	var width := 2.6 + float(variant % 3) * 0.16
	var depth := 1.84 + float(variant % 2) * 0.16
	var height := 0.96 + float(int(variant / 4)) * 0.08
	_add_parcel_shadow(root, Vector2(4.1, 3.0), 0.22)

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(3.8, 0.04, 2.8), _make_material("d9d0b9", 0.98), lot_root)
	_add_box(Vector3(0.0, 0.028, 0.88), Vector3(2.8, 0.03, 1.0), _make_material("d8cbb8", 0.92), lot_root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.26), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), structure_root, 0.18)
	_add_gabled_roof(Vector3(0.0, height + 0.18, -0.26), Vector3(width + 0.16, 0.2, depth + 0.2), _make_material_from_color(palette.roof, 0.74), structure_root, 11.0)
	_add_round_canopy(Vector3(0.0, 0.42, 0.72), Vector3(width * 0.8, 0.2, 0.24), _make_material_from_color(palette.accent, 0.48), structure_root)
	_add_box(Vector3(0.0, 0.26, 0.58), Vector3(width * 0.48, 0.36, 0.05), _window_material, structure_root)
	_add_box(Vector3(0.0, 0.82, 0.62), Vector3(width * 0.5, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), structure_root)
	for patio_x in [-0.34, 0.0, 0.34]:
		_add_local_cylinder(Vector3(patio_x * width, 0.12, 1.1), 0.04, 0.04, 0.18, _make_material_from_color(palette.trim, 0.7), lot_root)
		var umbrella := _add_local_sphere(Vector3(patio_x * width, 0.28, 1.1), 0.13, 0.16, _make_material_from_color(palette.accent, 0.46), lot_root)
		umbrella.scale = Vector3(1.4, 0.3, 1.4)
	_add_box(Vector3(width * 0.28, height + 0.42, -0.46), Vector3(0.12, 0.4, 0.12), _stone_material, structure_root)
	_add_string_lights_local(lot_root, 1.18, width * 0.78)
	_add_frontage_detail_cluster(lot_root, width, 1.22, palette.accent, "bistro")
	_add_shrub_cluster(Vector3(-1.18, 0.0, 1.18), palette.trim, lot_root, 2)
	_add_shrub_cluster(Vector3(1.18, 0.0, 1.18), palette.accent, lot_root, 2)


func _add_restaurant_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_restaurant_variant(root, lot_root, structure_root, variant)
	return root


func _populate_corner_store_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int) -> void:
	var palette := _cozy_palette("corner_store", variant)
	var width := 2.28 + float(variant % 3) * 0.14
	var depth := 1.74 + float(int(variant / 3) % 2) * 0.12
	var height := 0.92 + float(int(variant / 5)) * 0.1
	_add_parcel_shadow(root, Vector2(4.0, 2.95), 0.22)

	_add_box(Vector3(0.0, 0.015, 0.0), Vector3(3.8, 0.04, 2.8), _make_material("d5cfbc", 0.98), lot_root)
	_add_box(Vector3(0.9, 0.028, 0.64), Vector3(1.42, 0.03, 1.18), _make_material("7e8082", 0.94), lot_root)
	_add_soft_block(Vector3(-0.18, height * 0.5 + 0.05, -0.24), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), structure_root, 0.18)
	_add_gabled_roof(Vector3(-0.18, height + 0.18, -0.24), Vector3(width + 0.14, 0.18, depth + 0.18), _make_material_from_color(palette.roof, 0.76), structure_root, 10.0)
	_add_round_canopy(Vector3(-0.18, 0.36, 0.66), Vector3(width * 0.94, 0.18, 0.24), _make_material_from_color(palette.accent, 0.46), structure_root)
	_add_box(Vector3(-width * 0.18, 0.24, 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, structure_root)
	_add_box(Vector3(width * 0.18, 0.24, 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, structure_root)
	_add_box(Vector3(-0.18, 0.82, 0.6), Vector3(width * 0.46, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), structure_root)
	if variant % 2 == 1:
		_add_soft_block(Vector3(width * 0.34, 0.56, -0.42), Vector3(0.46, 0.68, 0.52), _make_material_from_color(palette.trim, 0.84), structure_root, 0.1)
	_add_frontage_detail_cluster(lot_root, width, 1.18, palette.accent, "corner")
	_add_crate_stack_local(Vector3(0.78, 0.08, 0.98), palette.trim, lot_root)
	_add_shrub_cluster(Vector3(-1.02, 0.0, 1.1), palette.accent, lot_root, 2)
	_add_shrub_cluster(Vector3(0.42, 0.0, 1.1), palette.trim, lot_root, 2)


func _add_corner_store_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_corner_store_variant(root, lot_root, structure_root, variant)
	return root


func _add_park_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("grocery", variant)
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	_add_parcel_shadow(root, Vector2(3.8, 2.9), 0.18)

	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(3.6, 0.05, 2.7), _make_material("86a65c", 0.96), lot_root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(2.8, 0.03, 0.24), _make_material("d8c7ab", 0.9), lot_root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.24, 0.03, 2.1), _make_material("d8c7ab", 0.9), lot_root)
	_add_local_sphere(Vector3(0.0, 0.08, 0.0), 0.17, 0.08, _make_material_from_color(palette.accent, 0.44), lot_root)
	_add_bench_local(Vector3(-0.78, 0.0, 0.0), PI * 0.5, lot_root)
	_add_bench_local(Vector3(0.78, 0.0, 0.0), -PI * 0.5, lot_root)
	_add_local_tree(Vector3(-1.06, 0.0, -0.72), lot_root)
	_add_local_tree(Vector3(1.06, 0.0, 0.62), lot_root)
	_add_local_flower_patch(Vector3(0.82, 0.05, -0.54), 6, _make_material_from_color(palette.trim, 0.8), lot_root)
	return root


func _apply_property_tier_visuals(root: Node3D, tool: String, tier: int, variant: int) -> void:
	tier = clamp(tier, 1, PropertyUpgradeData.max_tier(tool))
	_upgrade_debug("apply tier visuals tool=%s tier=%d variant=%d root=%s" % [tool, tier, variant, str(root)])
	if tier <= 1:
		_upgrade_debug("apply tier visuals skipped (base tier)")
		return

	var profile := PropertyUpgradeData.visual_profile(tool, tier)
	_upgrade_debug("apply tier visuals profile=%s" % [str(profile)])
	match tool:
		BUILD_TOOL_HOUSE:
			_apply_house_tier_visuals(root, tier, variant, profile)
		BUILD_TOOL_FIRE, BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE:
			_apply_service_tier_visuals(root, tool, tier, variant, profile)
		BUILD_TOOL_PARK:
			_apply_park_tier_visuals(root, tier, variant, profile)


func _apply_house_tier_visuals(root: Node3D, tier: int, variant: int, profile: Dictionary) -> void:
	_upgrade_debug("apply house tier visuals tier=%d variant=%d profile=%s" % [tier, variant, str(profile)])
	var palette := _cozy_palette("house", variant)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	var roof_trim := _make_material_from_color(palette.trim.lightened(0.04), 0.88)
	var roof_detail := _make_material_from_color(palette.roof.darkened(0.03), 0.74)
	var yard_trim := _make_material_from_color(palette.accent.lightened(0.08), 0.92)
	var fence_material := _make_material("efe3cf", 0.86)

	if tier >= 2:
		if bool(profile.get("roof_trim", false)):
			_add_box(Vector3(0.0, 0.26, 1.72), Vector3(1.28, 0.05, 0.05), roof_trim, structure_root)
		if bool(profile.get("frontage_steps", false)):
			_add_box(Vector3(0.0, 0.09, 1.48), Vector3(0.52, 0.08, 0.18), fence_material, lot_root)
			_add_box(Vector3(0.0, 0.04, 1.62), Vector3(0.36, 0.03, 0.12), _make_material("d9cbb7", 0.88), lot_root)
			_add_box(Vector3(0.0, 0.03, 1.76), Vector3(0.26, 0.02, 0.24), _make_material("d8c7ab", 0.92), lot_root)
		if bool(profile.get("frontage_path", false)):
			_add_town_path(Vector3(0.0, 0.03, 1.92), Vector2(0.86, 0.2), lot_root)
		if bool(profile.get("wall_windows", false)):
			_add_window_band_local(Vector3(-0.58, 0.5, -0.36), Vector3(0.28, 0.34, 0.05), structure_root)
			_add_window_band_local(Vector3(0.58, 0.5, -0.36), Vector3(0.28, 0.34, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, 0.58, -0.68), Vector3(0.42, 0.28, 0.05), structure_root)
		if bool(profile.get("landscaping", false)):
			_add_flower_box_local(Vector3(-0.92, 0.18, 1.38), palette.accent, lot_root)
			_add_flower_box_local(Vector3(0.92, 0.18, 1.38), palette.trim, lot_root)
			_add_flower_box_local(Vector3(-0.52, 0.18, 1.62), palette.accent.lightened(0.06), lot_root)
			_add_flower_box_local(Vector3(0.52, 0.18, 1.62), palette.trim.lightened(0.06), lot_root)
			_add_shrub_cluster(Vector3(-1.74, 0.0, 1.44), palette.accent, lot_root, 3)
			_add_shrub_cluster(Vector3(1.74, 0.0, 1.44), palette.trim, lot_root, 3)
		if bool(profile.get("fence_upgrade", false)):
			_add_box(Vector3(0.0, 0.2, 1.82), Vector3(1.2, 0.08, 0.06), fence_material, lot_root)

	if tier >= 3:
		if bool(profile.get("side_annex", false)):
			var side := -1.0 if posmod(variant, 2) == 0 else 1.0
			_add_soft_block(Vector3(side * 1.46, 0.48, 0.2), Vector3(0.82, 0.78, 1.02), _make_material_from_color(palette.wall.darkened(0.02), 0.94), structure_root, 0.14)
			_add_gabled_roof(Vector3(side * 1.46, 1.02, 0.2), Vector3(0.96, 0.14, 1.14), roof_detail, structure_root, 13.0)
			if bool(profile.get("wall_windows", false)):
				_add_window_band_local(Vector3(side * 1.48, 0.56, 0.72), Vector3(0.22, 0.3, 0.05), structure_root)
				_add_window_band_local(Vector3(side * 1.48, 0.9, 0.72), Vector3(0.2, 0.2, 0.05), structure_root)
		if bool(profile.get("garden_extension", false)):
			_add_hedge_strip_local(Vector3(0.0, 0.08, -1.84), 4.26, palette.accent.darkened(0.14), lot_root)
			_add_bench_local(Vector3(-1.04, 0.02, 1.58), 0.18, lot_root)
			_add_bench_local(Vector3(1.04, 0.02, 1.58), -0.18, lot_root)
		if bool(profile.get("wall_windows", false)):
			_add_window_band_local(Vector3(-0.38, 0.92, -0.48), Vector3(0.22, 0.24, 0.05), structure_root)
			_add_window_band_local(Vector3(0.38, 0.92, -0.48), Vector3(0.22, 0.24, 0.05), structure_root)

	if tier >= 4:
		var second_story_wall := _make_material_from_color(palette.wall.lightened(0.06), 0.94)
		var second_story_roof := _make_material_from_color(palette.roof.darkened(0.01), 0.76)
		var upper_width := 1.72
		var upper_depth := 1.5
		var upper_height := 0.92
		var upper_y := 1.82
		var upper_z := -0.02
		_add_soft_block(Vector3(0.0, upper_y + upper_height * 0.5, upper_z), Vector3(upper_width, upper_height, upper_depth), second_story_wall, structure_root, 0.12)
		_add_gabled_roof(Vector3(0.0, upper_y + upper_height + 0.32, upper_z), Vector3(upper_width + 0.18, 0.16, upper_depth + 0.16), second_story_roof, structure_root, 17.0)
		if bool(profile.get("wall_windows", false)):
			_add_window_band_local(Vector3(-0.54, upper_y + 0.06, upper_z - 0.38), Vector3(0.24, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(0.54, upper_y + 0.06, upper_z - 0.38), Vector3(0.24, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(-0.7, upper_y + 0.08, upper_z + 0.06), Vector3(0.2, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(0.7, upper_y + 0.08, upper_z + 0.06), Vector3(0.2, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, upper_y + 0.26, upper_z - 0.44), Vector3(0.42, 0.24, 0.05), structure_root)
		_add_box(Vector3(0.0, upper_y - 0.2, upper_z - 0.02), Vector3(1.5, 0.08, 1.1), _make_material("d8c7ab", 0.9), structure_root)
		_add_shrub_cluster(Vector3(-1.58, 0.0, -0.96), palette.trim, lot_root, 4)
		_add_shrub_cluster(Vector3(1.58, 0.0, -0.96), palette.accent, lot_root, 4)
		_add_box(Vector3(0.0, 0.34, -2.06), Vector3(0.16, 0.46, 0.16), _stone_material, lot_root)


func _apply_service_tier_visuals(root: Node3D, tool: String, tier: int, variant: int, profile: Dictionary) -> void:
	var palette: Dictionary = _cozy_palette(tool, variant)
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)

	if tier >= 2:
		if bool(profile.get("landscaping", false)):
			_add_shrub_cluster(Vector3(-1.16, 0.0, 1.22), trim, lot_root, 3)
			_add_shrub_cluster(Vector3(1.16, 0.0, 1.22), accent, lot_root, 3)
		_add_town_path(Vector3(0.0, 0.03, 1.44), Vector2(1.1, 0.32), lot_root)
		_add_front_lanterns(lot_root, 1.38, 0.72)
		if tool == BUILD_TOOL_FIRE:
			if bool(profile.get("front_hall", false)):
				_add_soft_block(Vector3(0.0, 0.3, 0.82), Vector3(1.44, 0.5, 0.7), _make_material_from_color(palette.wall.lightened(0.04), 0.94), structure_root, 0.12)
				_add_gabled_roof(Vector3(0.0, 0.66, 0.82), Vector3(1.56, 0.12, 0.8), _make_material_from_color(palette.roof.darkened(0.02), 0.78), structure_root, 11.0)
				_add_box(Vector3(0.0, 0.14, 1.12), Vector3(0.42, 0.44, 0.06), _window_material, structure_root)
				_add_box(Vector3(0.0, 0.04, 1.3), Vector3(0.98, 0.04, 0.08), _make_material_from_color(accent, 0.46), lot_root)
				_add_service_steps(lot_root, 1.38, 0.92)
			if bool(profile.get("bay_extend", false)):
				_add_soft_block(Vector3(1.0, 0.34, -0.08), Vector3(0.92, 0.62, 1.14), _make_material_from_color(palette.trim.darkened(0.01), 0.9), structure_root, 0.1)
				_add_gabled_roof(Vector3(1.0, 0.76, -0.08), Vector3(1.04, 0.12, 1.24), _make_material_from_color(palette.roof.darkened(0.02), 0.76), structure_root, 11.0)
				_add_box(Vector3(1.0, 0.36, 0.46), Vector3(0.36, 0.5, 0.05), _window_material, structure_root)

	if tier >= 3:
		match tool:
			BUILD_TOOL_FIRE:
				if bool(profile.get("bay_extend", false)):
					_add_soft_block(Vector3(-1.02, 0.34, -0.12), Vector3(0.82, 0.56, 1.02), _make_material_from_color(palette.wall.darkened(0.01), 0.92), structure_root, 0.1)
					_add_gabled_roof(Vector3(-1.02, 0.72, -0.12), Vector3(0.96, 0.12, 1.14), _make_material_from_color(palette.roof.darkened(0.02), 0.76), structure_root, 11.0)
				if bool(profile.get("hose_tower", false)):
					_add_soft_block(Vector3(1.02, 0.48, -0.78), Vector3(0.5, 0.96, 0.5), _make_material_from_color(palette.trim.darkened(0.01), 0.9), structure_root, 0.1)
					_add_gabled_roof(Vector3(1.02, 1.08, -0.78), Vector3(0.6, 0.1, 0.6), _make_material_from_color(palette.roof.darkened(0.03), 0.76), structure_root, 14.0)
				if bool(profile.get("parking_expand", false)):
					_add_fire_parking_lot(Vector3(1.22, 0.0, -0.18), Vector3(1.84, 1.0, 1.7), lot_root)
			BUILD_TOOL_BANK:
				if bool(profile.get("front_hall", false)):
					_add_frontage_detail_cluster(lot_root, 2.0, 1.34, accent, "vault")
				if bool(profile.get("side_wing", false)):
					_add_soft_block(Vector3(1.1, 0.72, -0.62), Vector3(0.72, 0.56, 0.9), _make_material_from_color(palette.wall.lightened(0.02), 0.9), structure_root, 0.12)
					_add_gabled_roof(Vector3(1.1, 1.1, -0.62), Vector3(0.92, 0.12, 1.08), _make_material_from_color(palette.roof.darkened(0.01), 0.76), structure_root, 10.0)
				if bool(profile.get("plaza", false)):
					_add_box(Vector3(0.0, 0.04, 0.92), Vector3(2.1, 0.03, 0.68), _make_material("d8d1c2", 0.94), lot_root)
					_add_box(Vector3(-0.84, 0.05, 1.14), Vector3(0.12, 0.08, 0.42), _make_material("f1eadc", 0.92), lot_root)
					_add_box(Vector3(0.84, 0.05, 1.14), Vector3(0.12, 0.08, 0.42), _make_material("f1eadc", 0.92), lot_root)
				if bool(profile.get("landscaping", false)):
					_add_shrub_cluster(Vector3(0.0, 0.0, 1.46), trim, lot_root, 4)
			BUILD_TOOL_GROCERY:
				if bool(profile.get("parking", false)):
					_add_box(Vector3(1.34, 0.04, 0.78), Vector3(1.18, 0.04, 0.84), _road_mark_material, lot_root)
				if bool(profile.get("service_wing", false)):
					_add_crate_stack_local(Vector3(-1.48, 0.08, 1.02), accent, lot_root)
				if bool(profile.get("awning", false)):
					_add_box(Vector3(0.0, 0.03, 1.34), Vector3(1.4, 0.04, 0.08), _make_material_from_color(trim, 0.42), structure_root)
			BUILD_TOOL_RESTAURANT:
				if bool(profile.get("patio", false)):
					_add_box(Vector3(-0.84, 0.08, 1.12), Vector3(1.42, 0.04, 0.08), _make_material_from_color(accent, 0.42), lot_root)
					_add_box(Vector3(0.84, 0.08, 1.12), Vector3(1.42, 0.04, 0.08), _make_material_from_color(accent, 0.42), lot_root)
				if bool(profile.get("pergola", false)):
					_add_box(Vector3(0.0, 0.04, 1.44), Vector3(1.34, 0.04, 0.08), _make_material_from_color(trim, 0.42), lot_root)
			BUILD_TOOL_CORNER_STORE:
				if bool(profile.get("corner_awning", false)):
					_add_box(Vector3(-1.08, 0.08, 1.12), Vector3(1.28, 0.04, 0.08), _make_material_from_color(accent, 0.42), structure_root)
				if bool(profile.get("delivery_nook", false)):
					_add_crate_stack_local(Vector3(0.84, 0.08, 1.02), trim, lot_root)

	if tier >= 4:
		match tool:
			BUILD_TOOL_FIRE:
				if bool(profile.get("second_story", false)):
					_add_soft_block(Vector3(0.0, 1.2, -0.08), Vector3(1.62, 0.78, 1.22), _make_material_from_color(palette.wall.lightened(0.06), 0.94), structure_root, 0.12)
					_add_gabled_roof(Vector3(0.0, 1.82, -0.08), Vector3(1.82, 0.14, 1.36), _make_material_from_color(palette.roof.darkened(0.02), 0.76), structure_root, 12.0)
					_add_box(Vector3(0.0, 1.02, 0.5), Vector3(0.52, 0.22, 0.06), _window_material, structure_root)
					_add_box(Vector3(0.0, 1.2, -0.6), Vector3(0.44, 0.18, 0.06), _window_material, structure_root)
				if bool(profile.get("parking_expand", false)):
					_add_box(Vector3(-1.08, 0.08, 1.5), Vector3(2.28, 0.08, 0.06), _make_material_from_color(accent, 0.4), lot_root)
					_add_box(Vector3(0.0, 0.08, 1.68), Vector3(1.62, 0.04, 0.12), _make_material_from_color(trim, 0.44), lot_root)
					_add_fire_truck_local(Vector3(-0.34, 0.02, 0.38), 0.0, lot_root)
			BUILD_TOOL_BANK:
				if bool(profile.get("front_hall", false)):
					_add_soft_block(Vector3(0.0, 0.34, 0.72), Vector3(1.64, 0.52, 0.74), _make_material_from_color(palette.wall.lightened(0.06), 0.94), structure_root, 0.12)
					_add_gabled_roof(Vector3(0.0, 0.72, 0.72), Vector3(1.78, 0.12, 0.84), _make_material_from_color(palette.roof.darkened(0.01), 0.78), structure_root, 11.0)
					for col_x in [-0.58, -0.2, 0.2, 0.58]:
						_add_local_cylinder(Vector3(col_x, 0.22, 1.0), 0.06, 0.06, 0.5, _make_material_from_color(trim, 0.84), structure_root)
					_add_box(Vector3(0.0, 0.16, 1.16), Vector3(0.46, 0.42, 0.06), _window_material, structure_root)
					_add_box(Vector3(0.0, 0.04, 1.36), Vector3(1.18, 0.04, 0.08), _make_material_from_color(accent, 0.46), lot_root)
				if bool(profile.get("plaza", false)):
					_add_box(Vector3(0.0, 0.03, 1.58), Vector3(2.0, 0.03, 0.62), _make_material("d8d1c2", 0.94), lot_root)
					_add_box(Vector3(-0.76, 0.05, 1.72), Vector3(0.12, 0.08, 0.34), _make_material("f1eadc", 0.92), lot_root)
					_add_box(Vector3(0.76, 0.05, 1.72), Vector3(0.12, 0.08, 0.34), _make_material("f1eadc", 0.92), lot_root)
				if bool(profile.get("side_wing", false)):
					var side := -1.0 if posmod(variant, 2) == 0 else 1.0
					_add_soft_block(Vector3(side * 1.12, 0.52, -0.18), Vector3(0.84, 0.72, 1.1), _make_material_from_color(palette.wall.darkened(0.02), 0.92), structure_root, 0.12)
					_add_gabled_roof(Vector3(side * 1.12, 1.0, -0.18), Vector3(0.98, 0.12, 1.22), _make_material_from_color(palette.roof.darkened(0.01), 0.76), structure_root, 10.0)
				if bool(profile.get("upper_story", false)):
					_add_soft_block(Vector3(0.0, 1.18, -0.04), Vector3(1.5, 0.76, 1.08), _make_material_from_color(palette.wall.lightened(0.05), 0.93), structure_root, 0.12)
					_add_gabled_roof(Vector3(0.0, 1.76, -0.04), Vector3(1.68, 0.12, 1.2), _make_material_from_color(palette.roof.darkened(0.02), 0.76), structure_root, 13.0)
					_add_box(Vector3(0.0, 1.0, 0.48), Vector3(0.44, 0.2, 0.06), _window_material, structure_root)
					_add_box(Vector3(0.0, 1.16, -0.52), Vector3(0.4, 0.18, 0.06), _window_material, structure_root)
				if bool(profile.get("landscaping", false)):
					_add_shrub_cluster(Vector3(-1.12, 0.0, 1.26), trim, lot_root, 2)
					_add_shrub_cluster(Vector3(1.12, 0.0, 1.26), accent, lot_root, 2)
			BUILD_TOOL_GROCERY:
				if bool(profile.get("parking", false)):
					_add_box(Vector3(0.0, 0.04, 0.38), Vector3(2.0, 0.03, 1.32), _road_mark_material, lot_root)
				if bool(profile.get("landscaping", false)):
					_add_box(Vector3(-1.36, 0.08, 1.34), Vector3(0.32, 0.32, 0.12), _make_material_from_color(accent, 0.66), lot_root)
					_add_box(Vector3(1.36, 0.08, 1.34), Vector3(0.32, 0.32, 0.12), _make_material_from_color(accent, 0.66), lot_root)
			BUILD_TOOL_RESTAURANT:
				if bool(profile.get("garden_room", false)):
					_add_box(Vector3(0.0, 0.08, 1.62), Vector3(1.86, 0.04, 0.08), _make_material_from_color(accent, 0.42), lot_root)
					_add_bench_local(Vector3(-0.84, 0.02, 1.58), 0.0, lot_root)
					_add_bench_local(Vector3(0.84, 0.02, 1.58), 0.0, lot_root)
			BUILD_TOOL_CORNER_STORE:
				if bool(profile.get("side_sign", false)):
					_add_box(Vector3(0.76, 0.08, 1.48), Vector3(0.18, 0.34, 0.12), _make_material_from_color(trim, 0.82), structure_root)
				if bool(profile.get("landscaping", false)):
					_add_shrub_cluster(Vector3(-0.92, 0.0, 1.36), accent, lot_root, 4)


func _apply_park_tier_visuals(root: Node3D, tier: int, variant: int, profile: Dictionary) -> void:
	var palette := _cozy_palette("house", variant)
	var lot_root := _property_lot_root(root)
	if tier >= 2:
		if bool(profile.get("extra_trees", false)):
			_add_wildflower_cluster(Vector3(-0.88, 0.06, -0.56), 5, _make_material_from_color(palette.accent, 0.8), lot_root, 0.12)
			_add_wildflower_cluster(Vector3(0.88, 0.06, 0.56), 5, _make_material_from_color(palette.trim, 0.8), lot_root, 0.12)
		if bool(profile.get("paths", false)):
			_add_box(Vector3(0.0, 0.04, 0.86), Vector3(0.18, 0.02, 0.96), _make_material("d8c7ab", 0.9), lot_root)
			_add_box(Vector3(0.0, 0.04, -0.86), Vector3(0.18, 0.02, 0.96), _make_material("d8c7ab", 0.9), lot_root)
	if tier >= 3:
		if bool(profile.get("gazebo", false)):
			_add_soft_block(Vector3(-0.54, 0.1, 0.08), Vector3(0.44, 0.32, 0.44), _make_material_from_color(palette.wall, 0.88), lot_root, 0.08)
			_add_gabled_roof(Vector3(-0.54, 0.3, 0.08), Vector3(0.56, 0.08, 0.56), _make_material_from_color(palette.roof, 0.74), lot_root, 18.0)
		_add_bench_local(Vector3(0.52, 0.0, -0.16), -0.9, lot_root)
	if tier >= 4:
		if bool(profile.get("fountain", false)):
			_add_local_sphere(Vector3(0.0, 0.14, 0.0), 0.22, 0.16, _make_material_from_color(palette.accent, 0.44), lot_root)
		if bool(profile.get("paths", false)):
			_add_box(Vector3(0.0, 0.06, 0.0), Vector3(0.82, 0.03, 0.82), _make_material_from_color(palette.trim, 0.56), lot_root)
			_add_box(Vector3(0.0, 0.12, 0.0), Vector3(0.08, 0.24, 1.34), _make_material("d8c7ab", 0.9), lot_root)
			_add_box(Vector3(0.0, 0.12, 0.0), Vector3(1.34, 0.24, 0.08), _make_material("d8c7ab", 0.9), lot_root)


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
	var verge_material: Material = _ghost_base_material if preview else _make_material("869760", 0.98)
	var sidewalk_material: Material = _ghost_base_material if preview else _sidewalk_material
	var curb_material: Material = _ghost_base_material if preview else _make_material("9f9788", 0.92)
	var road_material: Material = _ghost_accent_material if preview else _road_material
	var road_top_material: Material = _ghost_accent_material if preview else _make_material("7a8088", 0.88)
	var lane_material: Material = _ghost_base_material if preview else _road_mark_material
	var rail_material: Material = _ghost_base_material if preview else _make_material("4f4641", 0.94)
	var source := road_source if road_source.size() > 0 else [cell]
	var north := _road_in_source(Vector2i(cell.x, cell.y - 1), source)
	var east := _road_in_source(Vector2i(cell.x + 1, cell.y), source)
	var south := _road_in_source(Vector2i(cell.x, cell.y + 1), source)
	var west := _road_in_source(Vector2i(cell.x - 1, cell.y), source)

	_add_box(Vector3(0.0, 0.004, 0.0), Vector3(5.18, 0.022, 5.18), verge_material, root)
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(4.92, 0.03, 4.92), sidewalk_material, root)
	_add_box(Vector3(0.0, 0.038, 0.0), Vector3(4.22, 0.016, 4.22), curb_material, root)
	_add_box(Vector3(0.0, 0.068, 0.0), Vector3(3.42, 0.064, 3.42), road_material, root)
	_add_box(Vector3(0.0, 0.086, 0.0), Vector3(3.12, 0.022, 3.12), road_top_material, root)

	if north:
		_add_box(Vector3(0.0, 0.02, -1.28), Vector3(5.74, 0.03, 2.74), sidewalk_material, root)
		_add_box(Vector3(0.0, 0.04, -1.28), Vector3(5.02, 0.016, 2.28), curb_material, root)
		_add_box(Vector3(0.0, 0.074, -1.28), Vector3(4.04, 0.07, 1.82), road_material, root)
		_add_box(Vector3(0.0, 0.094, -1.28), Vector3(3.68, 0.024, 1.58), road_top_material, root)
	if south:
		_add_box(Vector3(0.0, 0.02, 1.28), Vector3(5.74, 0.03, 2.74), sidewalk_material, root)
		_add_box(Vector3(0.0, 0.04, 1.28), Vector3(5.02, 0.016, 2.28), curb_material, root)
		_add_box(Vector3(0.0, 0.074, 1.28), Vector3(4.04, 0.07, 1.82), road_material, root)
		_add_box(Vector3(0.0, 0.094, 1.28), Vector3(3.68, 0.024, 1.58), road_top_material, root)
	if east:
		_add_box(Vector3(1.28, 0.02, 0.0), Vector3(2.74, 0.03, 5.74), sidewalk_material, root)
		_add_box(Vector3(1.28, 0.04, 0.0), Vector3(2.28, 0.016, 5.02), curb_material, root)
		_add_box(Vector3(1.28, 0.074, 0.0), Vector3(1.82, 0.07, 4.04), road_material, root)
		_add_box(Vector3(1.28, 0.094, 0.0), Vector3(1.58, 0.024, 3.68), road_top_material, root)
	if west:
		_add_box(Vector3(-1.28, 0.02, 0.0), Vector3(2.74, 0.03, 5.74), sidewalk_material, root)
		_add_box(Vector3(-1.28, 0.04, 0.0), Vector3(2.28, 0.016, 5.02), curb_material, root)
		_add_box(Vector3(-1.28, 0.074, 0.0), Vector3(1.82, 0.07, 4.04), road_material, root)
		_add_box(Vector3(-1.28, 0.094, 0.0), Vector3(1.58, 0.024, 3.68), road_top_material, root)
	if not north and not south and not east and not west:
		_add_box(Vector3(0.0, 0.074, 0.0), Vector3(4.04, 0.07, 4.04), road_material, root)
		_add_box(Vector3(0.0, 0.094, 0.0), Vector3(3.68, 0.024, 3.68), road_top_material, root)

	var vertical_straight := north and south and not east and not west
	var horizontal_straight := east and west and not north and not south
	var intersection := (north or south) and (east or west)
	if vertical_straight:
		for z in [-1.24, -0.44, 0.44, 1.24]:
			_add_box(Vector3(0.0, 0.12, z), Vector3(0.16, 0.01, 0.3), lane_material, root)
		for x in [-2.06, 2.06]:
			_add_box(Vector3(x, 0.104, 0.0), Vector3(0.16, 0.01, 3.56), sidewalk_material, root)
		for rail_x in [-0.18, 0.18]:
			_add_box(Vector3(rail_x, 0.108, 0.0), Vector3(0.05, 0.012, 3.56), rail_material, root)
	elif horizontal_straight:
		for x in [-1.24, -0.44, 0.44, 1.24]:
			_add_box(Vector3(x, 0.12, 0.0), Vector3(0.3, 0.01, 0.16), lane_material, root)
		for z in [-2.06, 2.06]:
			_add_box(Vector3(0.0, 0.104, z), Vector3(3.56, 0.01, 0.16), sidewalk_material, root)
		for rail_z in [-0.18, 0.18]:
			_add_box(Vector3(0.0, 0.108, rail_z), Vector3(3.56, 0.012, 0.05), rail_material, root)
	elif intersection:
		_add_box(Vector3(0.0, 0.074, 0.0), Vector3(4.18, 0.07, 4.18), road_material, root)
		_add_box(Vector3(0.0, 0.094, 0.0), Vector3(3.82, 0.024, 3.82), road_top_material, root)
		for offset in [-2.06, 2.06]:
			_add_box(Vector3(offset, 0.104, 0.0), Vector3(0.16, 0.01, 4.18), sidewalk_material, root)
			_add_box(Vector3(0.0, 0.104, offset), Vector3(4.18, 0.01, 0.16), sidewalk_material, root)
		for offset in [-0.58, 0.58]:
			_add_box(Vector3(offset, 0.12, 0.0), Vector3(0.16, 0.01, 0.34), lane_material, root)
			_add_box(Vector3(0.0, 0.12, offset), Vector3(0.34, 0.01, 0.16), lane_material, root)
		for rail_offset in [-0.18, 0.18]:
			_add_box(Vector3(rail_offset, 0.108, 0.0), Vector3(0.05, 0.012, 4.18), rail_material, root)
			_add_box(Vector3(0.0, 0.108, rail_offset), Vector3(4.18, 0.012, 0.05), rail_material, root)
	else:
		_add_box(Vector3(0.0, 0.12, 0.0), Vector3(0.18, 0.01, 0.18), lane_material, root)
		_add_box(Vector3(-0.18, 0.108, 0.0), Vector3(0.05, 0.012, 0.84), rail_material, root)
		_add_box(Vector3(0.18, 0.108, 0.0), Vector3(0.05, 0.012, 0.84), rail_material, root)

	return root


func _road_in_source(cell: Vector2i, road_source: Array) -> bool:
	for item in road_source:
		if item == cell:
			return true
	return _road_cells.has(_cell_key(cell))


func _tool_rotation_y(tool: String, anchor: Vector2i, footprint: Vector2i, frontage_side_override: String = "") -> float:
	if tool == BUILD_TOOL_ROAD or not _tool_requires_road(tool):
		return 0.0

	var preferred_side := frontage_side_override if frontage_side_override != "" else _preferred_frontage_side(tool, anchor, footprint)
	var rotation := _rotation_for_side(preferred_side)
	return rotation + float(BUILDING_FRONT_ROTATION_OFFSETS.get(tool, 0.0))


func _transport_side_score(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> float:
	var side_center := _frontage_side_center(anchor, footprint, side)
	var adjacent_count := 0
	var nearest_distance := INF
	var min_offset := _frontage_transport_offset(tool)
	var max_offset := min_offset + 2
	match side:
		"north":
			for dx in range(footprint.x):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + dx, anchor.y - offset)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"south":
			for dx in range(footprint.x):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + offset)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"west":
			for dz in range(footprint.y):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x - offset, anchor.y + dz)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"east":
			for dz in range(footprint.y):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + footprint.x - 1 + offset, anchor.y + dz)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
	if nearest_distance == INF:
		return -9999.0
	return float(adjacent_count) * 100.0 - nearest_distance


func _preferred_frontage_side(tool: String, anchor: Vector2i, footprint: Vector2i) -> String:
	var sides := ["south", "north", "east", "west"]
	var best_touch := -1
	var best_score := -INF
	var best_side := "south"
	for side in sides:
		var touch := _adjacent_transport_count(tool, anchor, footprint, side)
		var score := _transport_side_score(tool, anchor, footprint, side)
		if touch > best_touch:
			best_touch = touch
			best_score = score
			best_side = side
			continue
		if touch == best_touch and score > best_score:
			best_score = score
			best_side = side
	if best_touch > 0 or best_score > -9000.0:
		return best_side

	var center := _anchor_to_world(anchor, footprint)
	var to_center := Vector2(-center.x, -center.z)
	if abs(to_center.x) > abs(to_center.y):
		return "east" if to_center.x > 0.0 else "west"
	return "south" if to_center.y > 0.0 else "north"


func _rotation_for_side(side: String) -> float:
	return float(FRONTAGE_ROTATIONS.get(side, 0.0))


func _frontage_side_center(anchor: Vector2i, footprint: Vector2i, side: String) -> Vector2:
	var center := _anchor_to_world(anchor, footprint)
	match side:
		"north":
			return Vector2(center.x, center.z - float(footprint.y) * 0.5 - 0.5)
		"south":
			return Vector2(center.x, center.z + float(footprint.y) * 0.5 + 0.5)
		"west":
			return Vector2(center.x - float(footprint.x) * 0.5 - 0.5, center.z)
		"east":
			return Vector2(center.x + float(footprint.x) * 0.5 + 0.5, center.z)
	return Vector2(center.x, center.z)


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


func _adjacent_transport_count(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> int:
	var count := 0
	var road_offset := _frontage_transport_offset(tool)
	match side:
		"north":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y - road_offset))):
					count += 1
		"south":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + road_offset))):
					count += 1
		"west":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x - road_offset, anchor.y + dz))):
					count += 1
		"east":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + footprint.x - 1 + road_offset, anchor.y + dz))):
					count += 1
	return count


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
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_register_nature_feature(root, 0.78)
	_add_shadow_disc_local(Vector3(0.0, 0.01, 0.0), Vector2(0.9, 0.7), 0.18, root)
	_add_local_cylinder(Vector3(0.0, 0.34, 0.0), 0.11, 0.08, 0.68, _trunk_material, root)
	_add_local_sphere(Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material, root)
	_add_local_sphere(Vector3(-0.2, 0.84, 0.0), 0.34, 0.66, _leaf_material, root)
	_add_local_sphere(Vector3(0.22, 0.84, -0.08), 0.3, 0.58, _leaf_material, root)


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
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_register_nature_feature(root, 1.08)
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(1.8, 0.05, 1.8), _make_material("eef4f5", 0.84), root)
	_add_local_tree(Vector3(-0.55, 0.0, -0.1), root)
	_add_local_tree(Vector3(0.52, 0.0, 0.28), root)
	_add_bench_local(Vector3(0.0, 0.06, -0.58), 0.0, root)
	_add_local_flower_patch(Vector3(0.58, 0.08, -0.55), 4, _flower_material_pink, root)


func _add_planter(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.22, 0.14, 0.22), _stone_material, building_root)
	_add_sphere(position_3d + Vector3(0.0, 0.18, 0.0), 0.14, 0.2, _leaf_material)


func _add_flower_patch(center: Vector3, count: int, material: StandardMaterial3D) -> void:
	var root := Node3D.new()
	root.position = center
	_nature_root.add_child(root)
	_register_nature_feature(root, 0.48)
	_add_wildflower_cluster(Vector3.ZERO, count, material, root, 0.1)


func _add_flower_box_local(position_3d: Vector3, color: Color, parent: Node) -> void:
	var box_material := _make_material("9f7b56", 0.78)
	_add_box(position_3d, Vector3(0.22, 0.08, 0.12), box_material, parent)
	for i in range(3):
		var offset := (float(i) - 1.0) * 0.05
		_add_box(position_3d + Vector3(offset, 0.08, 0.0), Vector3(0.05, 0.08, 0.05), _make_material_from_color(color, 0.8), parent)


func _add_garden_path(parent: Node, width: float, depth: float) -> void:
	var stone := _make_material("d9cbb7", 0.9)
	for step_index in range(3):
		var z := 0.78 + float(step_index) * (depth / 3.3)
		_add_box(Vector3(0.0, 0.03, z), Vector3(width, 0.03, 0.14), stone, parent)


func _add_picket_fence(parent: Node, center: Vector3, width: float) -> void:
	var fence_material := _make_material("efe3cf", 0.86)
	_add_box(center + Vector3(0.0, 0.14, 0.0), Vector3(width, 0.06, 0.04), fence_material, parent)
	for post_index in range(5):
		var t := float(post_index) / 4.0
		var x: float = lerpf(-width * 0.5, width * 0.5, t)
		_add_box(center + Vector3(x, 0.24, 0.0), Vector3(0.04, 0.26, 0.04), fence_material, parent)


func _add_dormer(position_3d: Vector3, wall_color: Color, roof_color: Color, parent: Node) -> void:
	_add_soft_block(position_3d + Vector3(0.0, 0.12, 0.0), Vector3(0.24, 0.24, 0.2), _make_material_from_color(wall_color, 0.88), parent, 0.06)
	_add_gabled_roof(position_3d + Vector3(0.0, 0.28, 0.0), Vector3(0.3, 0.08, 0.26), _make_material_from_color(roof_color, 0.74), parent, 8.0)
	_add_box(position_3d + Vector3(0.0, 0.12, 0.12), Vector3(0.1, 0.14, 0.04), _window_material, parent)


func _add_service_steps(parent: Node, z_position: float, width: float) -> void:
	var step_material := _make_material("d4c5ad", 0.9)
	_add_box(Vector3(0.0, 0.04, z_position), Vector3(width, 0.04, 0.2), step_material, parent)
	_add_box(Vector3(0.0, 0.08, z_position - 0.12), Vector3(width * 0.88, 0.04, 0.16), step_material, parent)


func _add_front_lanterns(parent: Node, z_position: float, width: float) -> void:
	for side in [-1.0, 1.0]:
		var lamp_x: float = side * width * 0.5
		_add_lantern_glow_local(Vector3(lamp_x, 0.88, z_position), parent)


func _add_house_front_lamp_local(position_3d: Vector3, parent: Node, preview: bool = false) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = position_3d
	parent.add_child(lamp_root)
	var pole_material := _ghost_base_material if preview else _make_material("f3eee5", 0.86)
	_add_local_cylinder(Vector3(0.0, 0.72, 0.0), 0.035, 0.035, 1.42, pole_material, lamp_root)
	if not preview:
		_add_lantern_glow_local(Vector3(0.0, 1.42, 0.0), lamp_root)


func _add_frontage_detail_cluster(parent: Node, width: float, z_position: float, accent: Color, kind: String) -> void:
	var pad_width: float = maxf(0.82, width * 0.46)
	_add_town_path(Vector3(0.0, 0.03, z_position), Vector2(pad_width, 0.34), parent)
	_add_service_steps(parent, z_position + 0.08, width * 0.48)
	_add_front_lanterns(parent, z_position + 0.2, width * 0.56)
	_add_signboard_local(Vector3(0.0, 0.98, z_position + 0.24), Vector2(maxf(0.78, width * 0.34), 0.16), accent, kind, parent)


func _add_fire_truck_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.52, 0.92), 0.18, root)
	var body_material := _make_material("c85243", 0.76)
	var cab_material := _make_material("f2efe5", 0.88)
	var stripe_material := _make_material("f1d072", 0.84)
	var tire_material := _make_material("26252b", 0.98)
	_add_soft_block(Vector3(0.0, 0.14, 0.0), Vector3(0.5, 0.16, 0.86), body_material, root, 0.06)
	_add_soft_block(Vector3(0.0, 0.24, -0.2), Vector3(0.38, 0.12, 0.32), cab_material, root, 0.05)
	_add_box(Vector3(0.0, 0.18, 0.26), Vector3(0.3, 0.04, 0.04), stripe_material, root)
	_add_box(Vector3(0.0, 0.26, -0.38), Vector3(0.22, 0.03, 0.08), stripe_material, root)
	for wheel_data in [
		Vector3(-0.18, 0.07, -0.3),
		Vector3(0.18, 0.07, -0.3),
		Vector3(-0.18, 0.07, 0.32),
		Vector3(0.18, 0.07, 0.32),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.055, 0.055, 0.04, tire_material, root)
		wheel.rotation_degrees.z = 90.0


func _add_fire_parking_lot(center: Vector3, size: Vector3, parent: Node) -> void:
	var lot_root := Node3D.new()
	lot_root.position = center
	parent.add_child(lot_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 0.98, size.z * 0.92), 0.1, lot_root)
	var apron_material := _make_material("d8d2c8", 0.94)
	var asphalt_material := _make_material("6f767f", 0.96)
	var curb_material := _make_material("ece7dd", 0.92)
	var line_material := _make_material("f1d072", 0.94)
	var stop_material := _make_material("f6f0e5", 0.94)
	var border_size := Vector3(size.x + 0.16, 0.02, size.z + 0.16)
	_add_box(Vector3(0.0, 0.018, 0.0), border_size, apron_material, lot_root)
	_add_box(Vector3(0.0, 0.045, 0.0), Vector3(size.x, 0.03, size.z), asphalt_material, lot_root)
	_add_box(Vector3(0.0, 0.07, -size.z * 0.5 + 0.07), Vector3(size.x * 0.9, 0.015, 0.08), curb_material, lot_root)
	_add_box(Vector3(0.0, 0.07, size.z * 0.5 - 0.07), Vector3(size.x * 0.9, 0.015, 0.08), curb_material, lot_root)
	_add_box(Vector3(-size.x * 0.5 + 0.07, 0.07, 0.0), Vector3(0.08, 0.015, size.z * 0.82), curb_material, lot_root)
	_add_box(Vector3(size.x * 0.5 - 0.07, 0.07, 0.0), Vector3(0.08, 0.015, size.z * 0.82), curb_material, lot_root)
	_add_box(Vector3(-0.26, 0.074, 0.08), Vector3(0.04, 0.01, 0.36), stop_material, lot_root)
	_add_box(Vector3(0.0, 0.074, 0.08), Vector3(0.04, 0.01, 0.36), stop_material, lot_root)
	_add_box(Vector3(0.26, 0.074, 0.08), Vector3(0.04, 0.01, 0.36), stop_material, lot_root)
	_add_box(Vector3(0.54, 0.074, 0.08), Vector3(0.04, 0.01, 0.36), stop_material, lot_root)
	_add_box(Vector3(0.42, 0.074, -0.54), Vector3(0.04, 0.01, 0.16), line_material, lot_root)
	_add_box(Vector3(0.42, 0.074, 0.54), Vector3(0.04, 0.01, 0.16), line_material, lot_root)
	_add_fire_truck_local(Vector3(0.4, 0.015, -0.06), 0.0, lot_root)


func _add_signboard_local(position_3d: Vector3, size: Vector2, accent: Color, kind: String, parent: Node) -> void:
	var sign_material := _make_material_from_color(accent.darkened(0.25), 0.5)
	var trim_material := _make_material("f4ecda", 0.84)
	_add_box(position_3d, Vector3(size.x, size.y, 0.06), sign_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.0, 0.04), Vector3(size.x * 0.82, size.y * 0.22, 0.02), trim_material, parent)
	match kind:
		"badge":
			_add_local_sphere(position_3d + Vector3(0.0, 0.0, 0.05), 0.06, 0.08, trim_material, parent)
		"fire":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.12, 0.12, 0.02), trim_material, parent)
		"vault":
			_add_local_cylinder(position_3d + Vector3(0.0, 0.0, 0.05), 0.06, 0.06, 0.04, trim_material, parent)
		"grocer":
			_add_box(position_3d + Vector3(-0.08, 0.0, 0.05), Vector3(0.08, 0.08, 0.02), _make_material("c95d49", 0.82), parent)
			_add_box(position_3d + Vector3(0.08, 0.0, 0.05), Vector3(0.08, 0.08, 0.02), _make_material("7da85b", 0.82), parent)
		"bistro":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.18, 0.06, 0.02), trim_material, parent)
		"corner":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.14, 0.08, 0.02), trim_material, parent)


func _add_crate_stack_local(position_3d: Vector3, accent: Color, parent: Node) -> void:
	var wood := _make_material("9f7b56", 0.8)
	_add_box(position_3d, Vector3(0.2, 0.12, 0.2), wood, parent)
	_add_box(position_3d + Vector3(0.18, 0.04, -0.04), Vector3(0.16, 0.1, 0.16), wood, parent)
	_add_box(position_3d + Vector3(0.0, 0.12, 0.0), Vector3(0.06, 0.06, 0.06), _make_material_from_color(accent, 0.82), parent)


func _add_hydrant_local(position_3d: Vector3, parent: Node) -> void:
	var hydrant := _make_material("c45043", 0.68)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.12, 0.0), 0.05, 0.06, 0.24, hydrant, parent)
	_add_box(position_3d + Vector3(0.0, 0.24, 0.0), Vector3(0.16, 0.06, 0.08), hydrant, parent)


func _add_string_lights_local(parent: Node, z_position: float, width: float) -> void:
	_add_box(Vector3(0.0, 0.82, z_position), Vector3(width, 0.02, 0.02), _make_material("6a5a4d", 0.82), parent)
	for i in range(5):
		var t := float(i) / 4.0
		var x := lerpf(-width * 0.5, width * 0.5, t)
		_add_box(Vector3(x, 0.76 + sin(t * TAU) * 0.04, z_position), Vector3(0.05, 0.06, 0.05), _window_material, parent)


func _add_shore_detail(position_3d: Vector3) -> void:
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_add_box(Vector3.ZERO, Vector3(0.34, 0.08, 0.24), _stone_material, root)
	_add_box(Vector3(0.18, 0.04, -0.1), Vector3(0.18, 0.06, 0.16), _stone_material, root)
	_register_nature_feature(root, 0.54)
	_add_grass_clump(position_3d + Vector3(-0.12, 0.12, 0.08), 0.72)


func _add_lamp(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material)
	_add_box(position_3d + Vector3(0.0, 1.12, 0.0), Vector3(0.18, 0.1, 0.18), _window_material, building_root)
	_add_lantern_glow_local(position_3d + Vector3(0.0, 1.12, 0.0), building_root)


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


func _add_lantern_glow_local(position_3d: Vector3, parent: Node) -> void:
	var light := OmniLight3D.new()
	light.position = position_3d + Vector3(0.0, 0.1, 0.0)
	light.light_color = Color(1.0, 0.73, 0.42)
	light.light_energy = 0.22
	light.omni_range = 2.2
	light.shadow_enabled = false
	parent.add_child(light)
	var bulb := _add_local_sphere(position_3d + Vector3(0.0, 0.06, 0.0), 0.08, 0.08, _street_lamp_bulb_material, parent)
	bulb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var glow := Sprite3D.new()
	glow.texture = _ensure_lamp_glow_texture(Color(1.0, 0.74, 0.38), 0.06)
	glow.billboard = 1
	glow.no_depth_test = true
	glow.shaded = false
	glow.double_sided = true
	glow.fixed_size = true
	glow.centered = true
	glow.pixel_size = 0.012
	glow.scale = Vector3(0.78, 0.78, 0.78)
	glow.position = position_3d + Vector3(0.0, 0.06, 0.0)
	glow.modulate = Color(1.0, 0.78, 0.4, 0.42)
	glow.render_priority = 8
	parent.add_child(glow)
	var ground_glow := Sprite3D.new()
	ground_glow.texture = _ensure_lamp_glow_texture(Color(1.0, 0.76, 0.4), 0.2)
	ground_glow.billboard = 1
	ground_glow.no_depth_test = true
	ground_glow.shaded = false
	ground_glow.double_sided = true
	ground_glow.fixed_size = true
	ground_glow.centered = true
	ground_glow.pixel_size = 0.012
	ground_glow.scale = Vector3(1.9, 1.9, 1.9)
	ground_glow.position = Vector3(position_3d.x, 0.08, position_3d.z)
	ground_glow.modulate = Color(1.0, 0.83, 0.45, 0.32)
	ground_glow.render_priority = 7
	parent.add_child(ground_glow)


func _add_vehicle_headlights_local(parent: Node, front_z: float, half_width: float, light_y: float, light_range: float, light_energy: float) -> void:
	var headlight_material := _make_material("fff5dd", 0.04, 0.0, true, "fff0b9", 1.25)
	for side_sign in [-1.0, 1.0]:
		var head_position := Vector3(half_width * side_sign, light_y, front_z)
		_add_local_sphere(head_position, 0.05, 0.05, headlight_material, parent)
		var beam := SpotLight3D.new()
		beam.position = head_position + Vector3(0.0, 0.02, 0.0)
		beam.rotation_degrees = Vector3(0.0, 180.0, 0.0)
		beam.light_color = Color(1.0, 0.97, 0.86)
		beam.light_energy = light_energy
		beam.spot_range = light_range
		beam.spot_angle = 28.0
		beam.shadow_enabled = false
		parent.add_child(beam)


func _add_road_lamp_local(position_3d: Vector3, parent: Node) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = position_3d
	parent.add_child(lamp_root)
	_add_local_cylinder(Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material, lamp_root)
	_add_lantern_glow_local(Vector3(0.0, 1.12, 0.0), lamp_root)


func _clear_road_lights() -> void:
	for node_variant in _road_light_nodes.values():
		var node := node_variant as Node
		if is_instance_valid(node):
			node.queue_free()
	_road_light_nodes.clear()


func _refresh_road_lights() -> void:
	if not is_instance_valid(_road_lights_root):
		return
	_clear_road_lights()
	var road_keys: Array = _road_cells.keys()
	road_keys.sort()
	for road_key_variant in road_keys:
		var cell := _anchor_key_to_cell(str(road_key_variant))
		if not _road_cells.has(_cell_key(cell)):
			continue
		var north := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y - 1)))
		var east := _road_cells.has(_cell_key(Vector2i(cell.x + 1, cell.y)))
		var south := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y + 1)))
		var west := _road_cells.has(_cell_key(Vector2i(cell.x - 1, cell.y)))
		var vertical_straight := north and south and not east and not west
		var horizontal_straight := east and west and not north and not south
		if not vertical_straight and not horizontal_straight:
			continue
		if posmod(cell.x + cell.y, 2) != 0:
			continue
		var preferred_sign := 1 if posmod(cell.x + cell.y, 4) == 0 else -1
		var candidate_signs := [preferred_sign, -preferred_sign]
		for side_sign in candidate_signs:
			if vertical_straight:
				if not _road_lamp_clearance_is_free(cell, true, side_sign):
					continue
				_place_road_light(cell, Vector3(2.82 * float(side_sign), 0.0, 0.0), "v_%s_%d" % [_cell_key(cell), side_sign])
				break
			elif horizontal_straight:
				if not _road_lamp_clearance_is_free(cell, false, side_sign):
					continue
				_place_road_light(cell, Vector3(0.0, 0.0, 2.82 * float(side_sign)), "h_%s_%d" % [_cell_key(cell), side_sign])
				break


func _road_lamp_clearance_is_free(cell: Vector2i, vertical: bool, side_sign: int = 0) -> bool:
	if side_sign == 0:
		side_sign = 1 if posmod(cell.x + cell.y, 4) == 0 else -1
	if vertical:
		var side_x := cell.x + side_sign
		for dz in [-1, 0, 1]:
			var candidate := Vector2i(side_x, cell.y + dz)
			var key := _cell_key(candidate)
			if _occupied_cells.has(key) or _reserved_cells.has(key):
				return false
	else:
		var side_y := cell.y + side_sign
		for dx in [-1, 0, 1]:
			var candidate := Vector2i(cell.x + dx, side_y)
			var key := _cell_key(candidate)
			if _occupied_cells.has(key) or _reserved_cells.has(key):
				return false
	return true


func _place_road_light(cell: Vector2i, local_offset: Vector3, key: String) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = _cell_to_world(cell) + local_offset
	_road_lights_root.add_child(lamp_root)
	_add_local_cylinder(Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material, lamp_root)
	_add_lantern_glow_local(Vector3(0.0, 1.12, 0.0), lamp_root)
	_road_light_nodes[key] = lamp_root


func _add_local_tree(position_3d: Vector3, parent: Node) -> void:
	_add_shadow_disc_local(position_3d + Vector3(0.0, 0.01, 0.0), Vector2(0.82, 0.64), 0.16, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.34, 0.0), 0.11, 0.08, 0.68, _trunk_material, parent)
	_add_local_sphere(position_3d + Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material, parent)
	_add_local_sphere(position_3d + Vector3(-0.2, 0.84, 0.0), 0.34, 0.66, _leaf_material, parent)
	_add_local_sphere(position_3d + Vector3(0.22, 0.84, -0.08), 0.3, 0.58, _leaf_material, parent)


func _add_local_flower_patch(center: Vector3, count: int, material: StandardMaterial3D, parent: Node) -> void:
	_add_wildflower_cluster(center, count, material, parent, 0.1)


func _add_wildflower_cluster(center: Vector3, count: int, material: StandardMaterial3D, parent: Node, spread: float) -> void:
	for i in range(count):
		var offset_x := randf_range(-spread, spread)
		var offset_z := randf_range(-spread, spread)
		var stem := _add_box(center + Vector3(offset_x, 0.05, offset_z), Vector3(0.02, 0.12, 0.02), _grass_blade_material, parent)
		stem.rotation_degrees.z = randf_range(-10.0, 10.0)
		var bloom := _add_box(center + Vector3(offset_x, 0.12, offset_z), Vector3(0.07, 0.04, 0.07), material, parent)
		bloom.rotation_degrees.y = randf_range(0.0, 45.0)


func _add_chimney(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.16, 0.44, 0.16), _stone_material, building_root)


func _add_sign(position_3d: Vector3, size: Vector3) -> void:
	var sign_material := _make_material("163140", 0.44, 0.0, true, "77f2dc", 0.08)
	_add_box(position_3d, size, sign_material, building_root)


func _add_window_band(position_3d: Vector3, size: Vector3) -> void:
	var band := _add_box(position_3d, size, _window_material, building_root)
	_window_bands.append(band)


func _add_window_band_local(position_3d: Vector3, size: Vector3, parent: Node, material: Material = null) -> MeshInstance3D:
	var band_material: Material = material if material != null else _window_material
	var band := _add_box(position_3d, size, band_material, parent)
	_window_bands.append(band)
	return band


func _ensure_lamp_glow_texture(glow_color: Color, alpha: float) -> Texture2D:
	if _lamp_glow_texture == null:
		var size := 64
		var image := Image.create(size, size, false, Image.FORMAT_RGBA8)
		image.lock()
		var center := Vector2((size - 1) * 0.5, (size - 1) * 0.5)
		for y in range(size):
			for x in range(size):
				var dist := center.distance_to(Vector2(float(x), float(y))) / center.x
				var falloff := clampf(1.0 - dist, 0.0, 1.0)
				falloff = pow(falloff, 1.9)
				var glow_alpha := alpha * maxf(falloff, clampf(1.0 - dist * 1.1, 0.0, 1.0) * 0.4)
				image.set_pixel(x, y, Color(glow_color.r, glow_color.g, glow_color.b, glow_alpha))
		image.unlock()
		_lamp_glow_texture = ImageTexture.create_from_image(image)
	return _lamp_glow_texture


func _add_edge_post(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.16, 0.0), 0.03, 0.03, 0.34, _stone_material)


func _add_shrub_cluster(center: Vector3, color: Color, parent: Node, count: int) -> void:
	var shrub_material := _make_material_from_color(color, 0.92)
	for i in range(count):
		var offset := (float(i) - float(count - 1) * 0.5) * 0.18
		var shrub := _add_local_sphere(center + Vector3(offset, 0.12, randf_range(-0.04, 0.04)), 0.12, 0.16, shrub_material, parent)
		shrub.scale = Vector3(1.05, 0.85, 1.0)


func _add_hedge_strip_local(center: Vector3, width: float, color: Color, parent: Node) -> void:
	var hedge_material := _make_material_from_color(color, 0.96)
	for i in range(6):
		var t := float(i) / 5.0
		var x: float = lerpf(-width * 0.5, width * 0.5, t)
		_add_local_sphere(center + Vector3(x, 0.13 + randf_range(-0.01, 0.02), randf_range(-0.05, 0.05)), 0.16, 0.2, hedge_material, parent)


func _add_parcel_shadow(parent: Node, size: Vector2, alpha: float) -> void:
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), size, alpha, parent)


func _add_shadow_disc_local(center: Vector3, size: Vector2, alpha: float, parent: Node) -> void:
	var shadow := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.5
	mesh.bottom_radius = 0.54
	mesh.height = 0.01
	shadow.mesh = mesh
	var material := _make_transparent_material(Color(0.08, 0.06, 0.04, 1.0), 1.0, alpha)
	shadow.material_override = material
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	shadow.scale = Vector3(size.x, 1.0, size.y)
	shadow.position = center
	parent.add_child(shadow)


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
	material.metallic_specular = 0.18
	material.emission_enabled = emission_enabled
	if emission_enabled:
		material.emission = Color(emission_color_hex)
		material.emission_energy_multiplier = emission_energy
	return material


func _make_material_from_color(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	material.metallic_specular = 0.18
	return material


func _make_transparent_material(color: Color, roughness: float, alpha: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.albedo_color.a = alpha
	material.roughness = roughness
	material.metallic_specular = 0.08
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
	var i := 0
	while i < _window_bands.size():
		var window_band := _window_bands[i]
		if not is_instance_valid(window_band):
			_window_bands.remove_at(i)
			continue
		var material := window_band.material_override as StandardMaterial3D
		if material:
			material.emission_energy_multiplier = 0.82 + (sin(time * 0.92 + i * 0.72) * 0.5 + 0.5) * 0.62
		i += 1


func _animate_grass() -> void:
	var time := Time.get_ticks_msec() * 0.001
	for clump in _grass_clumps:
		var phase: float = float(clump.get_meta("phase", 0.0))
		var sway: float = float(clump.get_meta("sway", 1.0))
		clump.rotation_degrees.z = sin(time * 1.6 * sway + phase) * 4.5


func _update_camera(force := false) -> void:
	_camera_yaw = lerp_angle(_camera_yaw, _target_camera_yaw, 0.18 if not force else 1.0)
	if camera_controller and camera_controller.has_method("apply_view"):
		camera_controller.call("apply_view", _focus, _zoom, _camera_yaw)
		return
	var orbit := Vector3(_zoom * 0.92, _zoom * 0.74, _zoom * 0.86).rotated(Vector3.UP, _camera_yaw)
	camera_controller.position = _focus
	camera.position = orbit
	camera.look_at(_focus + Vector3(0.0, 0.8, 0.0), Vector3.UP)
