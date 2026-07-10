extends Node3D

const PALETTE := {
	"grass": Color("86a96b"),
	"grass_dark": Color("698b55"),
	"road": Color("54585b"),
	"stone": Color("c8bca8"),
	"cream": Color("e9ddc2"),
	"blue": Color("7693a1"),
	"sage": Color("79917b"),
	"timber": Color("75513b"),
	"roof_red": Color("a95f42"),
	"roof_slate": Color("4f5962"),
	"window": Color("ffd486"),
	"leaf": Color("557a45"),
	"leaf_light": Color("789c5d"),
	"flower": Color("d78396"),
}

var camera: Camera3D
var camera_yaw := -0.72
var residents: Array[Resident] = []
var elapsed := 0.0


func _ready() -> void:
	_build_environment()
	_build_landscape()
	_build_neighborhood()
	_build_residents()
	_build_ui()


func _process(delta: float) -> void:
	elapsed += delta
	if Input.is_action_pressed("orbit_left"):
		camera_yaw -= delta * 0.55
	if Input.is_action_pressed("orbit_right"):
		camera_yaw += delta * 0.55
	_update_camera()


func _build_environment() -> void:
	var world := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("a9c6d2")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("dbe7d1")
	env.ambient_light_energy = 0.48
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	env.glow_intensity = 0.22
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-53, -34, 0)
	sun.light_color = Color("ffe2b4")
	sun.light_energy = 0.88
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 75.0
	add_child(sun)

	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 23.5
	camera.current = true
	add_child(camera)
	_update_camera()


func _update_camera() -> void:
	if not camera:
		return
	var target := Vector3(0, 1.2, 0)
	var distance := 25.0
	camera.position = target + Vector3(cos(camera_yaw) * distance, 21.0, sin(camera_yaw) * distance)
	camera.look_at(target)


func _build_landscape() -> void:
	_add_box("Ground", Vector3(42, 0.7, 32), Vector3(0, -0.4, 0), PALETTE.grass, 0.96)
	# Layered border gives the island a soft diorama edge instead of an infinite test field.
	_add_box("Earth edge", Vector3(43, 0.9, 33), Vector3(0, -1.05, 0), Color("745a43"), 1.0)

	# Curving streets are built from short tangent-aligned pieces for a natural village plan.
	var loop := [
		Vector3(-12, 0.04, 4), Vector3(-8, 0.04, 8), Vector3(-2, 0.04, 9.5),
		Vector3(5, 0.04, 8), Vector3(11, 0.04, 3), Vector3(10, 0.04, -4),
		Vector3(4, 0.04, -8), Vector3(-3, 0.04, -9), Vector3(-10, 0.04, -5),
		Vector3(-12, 0.04, 4)
	]
	_add_path(loop, 3.1, PALETTE.road)
	_add_path([Vector3(-2, 0.06, 9.5), Vector3(0, 0.06, 3), Vector3(1, 0.06, -2)], 2.6, PALETTE.road)

	# River and banks frame the town and create gentle ambient motion later.
	_add_box("River", Vector3(8, 0.18, 38), Vector3(17, -0.03, 0), Color("5598a8"), 0.28, 0.55)
	_add_box("River highlight", Vector3(0.16, 0.03, 34), Vector3(15.8, 0.08, 0), Color("b9e4df"), 0.18, 0.42)
	for z in range(-14, 16, 3):
		_add_rock(Vector3(13.4 + sin(float(z)) * 0.3, 0.15, float(z)))
	for tree_data in [
		[Vector3(-15.2, 0.0, -10.5), 1.25], [Vector3(-14.2, 0.0, 10.8), 1.1],
		[Vector3(11.8, 0.0, 10.8), 1.2], [Vector3(11.0, 0.0, -11.5), 1.15],
		[Vector3(-1.0, 0.0, 12.2), 0.95], [Vector3(-12.8, 0.0, 0.0), 0.9],
	]:
		_build_tree(tree_data[0], tree_data[1])


func _build_neighborhood() -> void:
	_build_cottage(Vector3(-8.5, 0.35, 3.0), 0.52, PALETTE.cream, PALETTE.roof_red)
	_build_cottage(Vector3(-5.5, 0.35, -5.4), -0.16, PALETTE.blue, PALETTE.roof_slate)
	_build_cottage(Vector3(5.4, 0.35, 4.7), 2.6, PALETTE.sage, PALETTE.roof_slate)
	_build_cottage(Vector3(6.2, 0.35, -5.0), -2.65, Color("c89a64"), Color("6c4c3c"))
	_build_bakery(Vector3(0.2, 0.35, 5.7), PI)
	_build_park(Vector3(0.5, 0.25, -1.8))


func _build_cottage(at: Vector3, yaw: float, wall_color: Color, roof_color: Color) -> void:
	var house := Node3D.new()
	house.name = "Detailed cottage"
	house.position = at
	house.rotation.y = yaw
	add_child(house)
	_add_box_to(house, Vector3(5.2, 0.35, 4.3), Vector3(0, 0.18, 0), PALETTE.stone)
	_add_box_to(house, Vector3(4.7, 2.8, 3.8), Vector3(0, 1.75, 0), wall_color, 0.9)
	_add_roof_to(house, Vector3(5.5, 2.0, 4.5), Vector3(0, 3.55, 0), roof_color)
	# Porch with posts, steps, door and warm window depth.
	_add_box_to(house, Vector3(3.5, 0.18, 1.35), Vector3(0, 0.56, 2.35), Color("8a6548"))
	_add_box_to(house, Vector3(3.8, 0.16, 1.65), Vector3(0, 2.58, 2.25), roof_color)
	for x in [-1.55, 1.55]:
		_add_box_to(house, Vector3(0.16, 2.05, 0.16), Vector3(x, 1.55, 2.35), Color("eee6d3"))
	_add_box_to(house, Vector3(0.95, 1.85, 0.12), Vector3(0, 1.5, 1.97), PALETTE.timber, 0.72)
	_add_window_to(house, Vector3(-1.38, 1.78, 1.96), Vector2(0.9, 1.08))
	_add_window_to(house, Vector3(1.38, 1.78, 1.96), Vector2(0.9, 1.08))
	_add_window_to(house, Vector3(-1.25, 1.8, -1.96), Vector2(0.86, 1.0), PI)
	_add_window_to(house, Vector3(1.25, 1.8, -1.96), Vector2(0.86, 1.0), PI)
	_add_box_to(house, Vector3(0.6, 1.8, 0.6), Vector3(1.35, 4.25, -0.65), Color("824b37"))
	# Garden beds soften the footprint and make each lot feel lived in.
	for p in [Vector3(-2.2, 0.28, 2.45), Vector3(2.15, 0.28, 2.4), Vector3(-2.35, 0.28, -1.6)]:
		_add_shrub_to(house, p, PALETTE.leaf_light)
	for x in [-2.25, -1.9, 1.9, 2.28]:
		_add_flower_to(house, Vector3(x, 0.35, 2.7))


func _build_bakery(at: Vector3, yaw: float) -> void:
	var shop := Node3D.new()
	shop.position = at
	shop.rotation.y = yaw
	add_child(shop)
	_add_box_to(shop, Vector3(4.5, 2.8, 3.5), Vector3(0, 1.55, 0), Color("dfcda9"))
	_add_roof_to(shop, Vector3(5.0, 1.65, 4.0), Vector3(0, 3.3, 0), PALETTE.roof_slate)
	_add_box_to(shop, Vector3(3.6, 0.16, 1.2), Vector3(0, 2.55, 2.0), Color("75906a"))
	for x in [-1.4, -0.7, 0.0, 0.7, 1.4]:
		_add_box_to(shop, Vector3(0.35, 0.08, 1.28), Vector3(x, 2.5, 2.08), Color("eee1bb") if int((x + 1.4) / 0.7) % 2 == 0 else Color("78956f"))
	_add_window_to(shop, Vector3(-1.15, 1.45, 1.76), Vector2(1.35, 1.45))
	_add_window_to(shop, Vector3(1.15, 1.45, 1.76), Vector2(1.35, 1.45))


func _build_park(at: Vector3) -> void:
	_add_cylinder("Park lawn", 3.7, 0.12, at, Color("789d61"))
	_add_cylinder("Fountain rim", 1.05, 0.36, at + Vector3(0, 0.16, 0), PALETTE.stone)
	_add_cylinder("Fountain water", 0.78, 0.05, at + Vector3(0, 0.38, 0), Color("78b6bd"), 0.25)
	_add_cylinder("Fountain stem", 0.16, 1.0, at + Vector3(0, 0.75, 0), PALETTE.stone)
	for angle in [0.5, 2.55, 4.65]:
		var p := at + Vector3(cos(angle) * 2.55, 0.48, sin(angle) * 2.55)
		_add_bench(p, -angle + PI * 0.5)


func _build_residents() -> void:
	var paths := [
		[Vector3(-9, 0.4, 7), Vector3(-4, 0.4, 9), Vector3(2, 0.4, 8), Vector3(7, 0.4, 5)],
		[Vector3(8, 0.4, -6), Vector3(4, 0.4, -8), Vector3(-2, 0.4, -8), Vector3(-7, 0.4, -5)],
		[Vector3(-3, 0.4, 1), Vector3(0, 0.4, -3), Vector3(4, 0.4, 0), Vector3(1, 0.4, 5)],
	]
	var colors := [Color("c56f5f"), Color("628a9c"), Color("d4a35d")]
	for i in paths.size():
		var resident := Resident.new()
		resident.configure(paths[i], colors[i], i * 0.37)
		add_child(resident)
		residents.append(resident)


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := PanelContainer.new()
	panel.position = Vector2(28, 26)
	panel.custom_minimum_size = Vector2(310, 72)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.12, 0.1, 0.86)
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_left = 20
	style.corner_radius_bottom_right = 20
	style.content_margin_left = 22
	style.content_margin_right = 22
	style.content_margin_top = 14
	style.content_margin_bottom = 14
	panel.add_theme_stylebox_override("panel", style)
	var stack := VBoxContainer.new()
	var title := Label.new()
	title.text = "Cozy Village"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("fff8e7"))
	var subtitle := Label.new()
	subtitle.text = "A quiet place to build · Q / E rotates"
	subtitle.add_theme_font_size_override("font_size", 12)
	subtitle.add_theme_color_override("font_color", Color("bdcbbd"))
	stack.add_child(title)
	stack.add_child(subtitle)
	panel.add_child(stack)
	layer.add_child(panel)


func _add_path(points: Array, width: float, color: Color) -> void:
	for i in range(points.size() - 1):
		var a: Vector3 = points[i]
		var b: Vector3 = points[i + 1]
		var center := (a + b) * 0.5
		var length := a.distance_to(b)
		var segment := _add_box("Street", Vector3(width, 0.12, length + 0.35), center, color, 0.94)
		segment.rotation.y = atan2(b.x - a.x, b.z - a.z)


func _add_box(label: String, size: Vector3, at: Vector3, color: Color, roughness := 0.9, metallic := 0.0) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.position = at
	node.material_override = _material(color, roughness, metallic)
	add_child(node)
	return node


func _add_box_to(parent: Node3D, size: Vector3, at: Vector3, color: Color, roughness := 0.9) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.position = at
	node.material_override = _material(color, roughness)
	parent.add_child(node)
	return node


func _add_roof_to(parent: Node3D, size: Vector3, at: Vector3, color: Color) -> void:
	var roof := MeshInstance3D.new()
	var mesh := PrismMesh.new()
	mesh.size = size
	roof.mesh = mesh
	roof.position = at
	roof.rotation.y = PI * 0.5
	roof.material_override = _material(color, 0.88)
	parent.add_child(roof)


func _add_window_to(parent: Node3D, at: Vector3, size: Vector2, yaw := 0.0) -> void:
	var frame := Node3D.new()
	frame.position = at
	frame.rotation.y = yaw
	parent.add_child(frame)
	_add_box_to(frame, Vector3(size.x + 0.18, size.y + 0.18, 0.1), Vector3.ZERO, Color("ede4cf"))
	_add_box_to(frame, Vector3(size.x, size.y, 0.12), Vector3(0, 0, -0.06), PALETTE.window, 0.12)
	_add_box_to(frame, Vector3(0.06, size.y, 0.14), Vector3(0, 0, -0.13), Color("8b684d"))
	_add_box_to(frame, Vector3(size.x, 0.06, 0.14), Vector3(0, 0, -0.13), Color("8b684d"))


func _add_shrub_to(parent: Node3D, at: Vector3, color: Color) -> void:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.42
	mesh.height = 0.72
	node.mesh = mesh
	node.position = at
	node.scale = Vector3(1.15, 0.8, 0.9)
	node.material_override = _material(color, 0.96)
	parent.add_child(node)


func _add_flower_to(parent: Node3D, at: Vector3) -> void:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.12
	mesh.height = 0.2
	node.mesh = mesh
	node.position = at
	node.material_override = _material(PALETTE.flower, 0.8)
	parent.add_child(node)


func _add_rock(at: Vector3) -> void:
	var rock := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.42
	mesh.height = 0.58
	rock.mesh = mesh
	rock.position = at
	rock.scale = Vector3(1.35, 0.62, 1.0)
	rock.material_override = _material(Color("8f8b7d"), 1.0)
	add_child(rock)


func _build_tree(at: Vector3, scale_value: float) -> void:
	var tree := Node3D.new()
	tree.position = at
	tree.scale = Vector3.ONE * scale_value
	add_child(tree)
	_add_box_to(tree, Vector3(0.5, 3.4, 0.5), Vector3(0, 1.7, 0), PALETTE.timber, 1.0)
	for crown in [
		[Vector3(0, 3.6, 0), Vector3(1.65, 1.35, 1.55), PALETTE.leaf],
		[Vector3(-0.75, 3.25, 0.1), Vector3(1.2, 1.05, 1.15), PALETTE.leaf_light],
		[Vector3(0.72, 3.35, -0.1), Vector3(1.25, 1.12, 1.2), PALETTE.leaf],
		[Vector3(0.1, 4.35, 0), Vector3(1.15, 1.0, 1.1), PALETTE.leaf_light],
	]:
		var foliage := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 1.0
		mesh.height = 1.8
		foliage.mesh = mesh
		foliage.position = crown[0]
		foliage.scale = crown[1]
		foliage.material_override = _material(crown[2], 0.98)
		tree.add_child(foliage)


func _add_cylinder(label: String, radius: float, height: float, at: Vector3, color: Color, metallic := 0.0) -> void:
	var node := MeshInstance3D.new()
	node.name = label
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	node.mesh = mesh
	node.position = at
	node.material_override = _material(color, 0.75, metallic)
	add_child(node)


func _add_bench(at: Vector3, yaw: float) -> void:
	var bench := Node3D.new()
	bench.position = at
	bench.rotation.y = yaw
	add_child(bench)
	_add_box_to(bench, Vector3(1.35, 0.13, 0.45), Vector3(0, 0.45, 0), PALETTE.timber)
	_add_box_to(bench, Vector3(1.35, 0.65, 0.12), Vector3(0, 0.78, 0.2), PALETTE.timber)
	for x in [-0.5, 0.5]:
		_add_box_to(bench, Vector3(0.1, 0.55, 0.1), Vector3(x, 0.18, 0), Color("47443e"))


func _material(color: Color, roughness: float, metallic := 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = metallic
	return mat


class Resident extends Node3D:
	var route: Array = []
	var route_index := 0
	var speed := 1.05
	var phase := 0.0
	var body: Node3D
	var left_arm: Node3D
	var right_arm: Node3D
	var left_leg: Node3D
	var right_leg: Node3D

	func configure(points: Array, coat_color: Color, offset: float) -> void:
		route = points
		phase = offset * TAU
		position = route[0]
		body = Node3D.new()
		add_child(body)
		part(body, CapsuleMesh.new(), Vector3(0, 1.15, 0), Vector3(0.46, 0.72, 0.38), coat_color)
		part(body, SphereMesh.new(), Vector3(0, 2.05, 0), Vector3(0.34, 0.34, 0.34), Color("d9aa86"))
		left_arm = limb(body, Vector3(-0.38, 1.48, 0), coat_color)
		right_arm = limb(body, Vector3(0.38, 1.48, 0), coat_color)
		left_leg = limb(body, Vector3(-0.18, 0.62, 0), Color("4c5960"), true)
		right_leg = limb(body, Vector3(0.18, 0.62, 0), Color("4c5960"), true)

	func _process(delta: float) -> void:
		if route.size() < 2:
			return
		var target: Vector3 = route[(route_index + 1) % route.size()]
		var flat_delta := target - position
		flat_delta.y = 0
		if flat_delta.length() < 0.16:
			route_index = (route_index + 1) % route.size()
			return
		var direction := flat_delta.normalized()
		position += direction * speed * delta
		rotation.y = lerp_angle(rotation.y, atan2(direction.x, direction.z), delta * 7.0)
		phase += delta * speed * 7.0
		var stride := sin(phase) * 0.48
		left_leg.rotation.x = stride
		right_leg.rotation.x = -stride
		left_arm.rotation.x = -stride * 0.72
		right_arm.rotation.x = stride * 0.72
		body.position.y = abs(sin(phase)) * 0.035
		body.rotation.z = sin(phase * 0.5) * 0.018

	func part(parent: Node3D, mesh: PrimitiveMesh, at: Vector3, scale_value: Vector3, color: Color) -> void:
		var node := MeshInstance3D.new()
		node.mesh = mesh
		node.position = at
		node.scale = scale_value
		var mat := StandardMaterial3D.new()
		mat.albedo_color = color
		mat.roughness = 0.9
		node.material_override = mat
		parent.add_child(node)

	func limb(parent: Node3D, at: Vector3, color: Color, leg := false) -> Node3D:
		var pivot := Node3D.new()
		pivot.position = at
		parent.add_child(pivot)
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.1 if leg else 0.085
		capsule.height = 0.72 if leg else 0.62
		part(pivot, capsule, Vector3(0, -0.28, 0), Vector3.ONE, color)
		return pivot
