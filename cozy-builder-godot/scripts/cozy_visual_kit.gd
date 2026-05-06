extends RefCounted
class_name CozyVisualKit

const GRASS := "8fcb7b"
const ROAD := "3a3a3a"
const ROAD_SOFT := "44484d"
const SIDEWALK := "d9d9d9"
const CURB := "eeeeea"
const YELLOW := "ffd75b"
const WHITE := "f8f4ec"
const GLASS := "bfe6ff"
const WALL := "f2e8d8"
const ROOF_GREEN := "6faf5f"
const ROOF_RED := "c96b5f"
const ROOF_BLUE := "557da1"
const TRIM := "fff4df"
const TREE := "4f9b47"
const TREE_LIGHT := "79bd63"
const TRUNK := "805a3c"
const SHADOW := "1f1a12"


static func polished_color(color: Color, roughness: float) -> Color:
	var luminance := color.r * 0.299 + color.g * 0.587 + color.b * 0.114
	var adjusted := color
	if luminance > 0.78:
		adjusted = adjusted.darkened(0.025)
	elif luminance < 0.2:
		adjusted = adjusted.lightened(0.018)
	adjusted = adjusted.lerp(Color(1.0, 0.93, 0.82), clampf((roughness - 0.65) * 0.055, 0.0, 0.025))
	return adjusted


static func material(color_hex: String, roughness: float = 0.85, emission_hex: String = "", emission_energy: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = polished_color(Color(color_hex), roughness)
	mat.roughness = roughness
	mat.metallic = 0.0
	mat.metallic_specular = 0.1
	if emission_hex != "":
		mat.emission_enabled = true
		mat.emission = Color(emission_hex)
		mat.emission_energy_multiplier = emission_energy
	return mat


static func transparent_material(color_hex: String, alpha: float = 0.42, roughness: float = 0.4) -> StandardMaterial3D:
	var mat := material(color_hex, roughness)
	mat.albedo_color.a = alpha
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return mat


static func box(parent: Node, position: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = position
	instance.material_override = mat
	parent.add_child(instance)
	return instance


static func cylinder(parent: Node, position: Vector3, radius: float, height: float, mat: Material) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 10
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = position
	instance.material_override = mat
	parent.add_child(instance)
	return instance


static func sphere(parent: Node, position: Vector3, radius: float, mat: Material, scale_y: float = 1.0) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 10
	mesh.rings = 5
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = position
	instance.scale.y = scale_y
	instance.material_override = mat
	parent.add_child(instance)
	return instance


static func add_tree(parent: Node, position: Vector3) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	box(root, Vector3(0.0, 0.012, 0.0), Vector3(0.74, 0.024, 0.56), transparent_material(SHADOW, 0.16, 1.0))
	cylinder(root, Vector3(0.0, 0.36, 0.0), 0.11, 0.72, material(TRUNK, 0.9))
	sphere(root, Vector3(0.0, 0.98, 0.0), 0.48, material(TREE, 0.88), 1.22)
	sphere(root, Vector3(-0.22, 0.9, 0.04), 0.32, material(TREE_LIGHT, 0.88), 1.08)
	sphere(root, Vector3(0.23, 0.86, -0.05), 0.3, material("3f7f38", 0.9), 1.0)
	return root


static func add_bush(parent: Node, position: Vector3, width: float = 0.42) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	for x in [-0.16, 0.0, 0.16]:
		sphere(root, Vector3(x * width, 0.18, 0.0), width * 0.32, material("6da85a", 0.92), 0.72)
	return root


static func add_hedge(parent: Node, position: Vector3, size: Vector3) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	box(root, Vector3.ZERO, size, material("6fa85b", 0.96))
	for x in [-0.38, 0.0, 0.38]:
		sphere(root, Vector3(x * size.x, size.y * 0.46, 0.0), min(size.x, size.z) * 0.18, material("86bd69", 0.94), 0.6)
	return root


static func add_bench(parent: Node, position: Vector3, rotation_y: float = 0.0) -> Node3D:
	var root := Node3D.new()
	root.position = position
	root.rotation.y = rotation_y
	parent.add_child(root)
	var wood := material("a57649", 0.72)
	var metal := material("3d4144", 0.88)
	box(root, Vector3(0.0, 0.18, 0.0), Vector3(0.56, 0.08, 0.18), wood)
	box(root, Vector3(0.0, 0.34, -0.08), Vector3(0.56, 0.22, 0.055), wood)
	for x in [-0.2, 0.2]:
		box(root, Vector3(x, 0.08, 0.04), Vector3(0.045, 0.16, 0.045), metal)
	return root


static func add_parking_lot(parent: Node, position: Vector3, size: Vector2, spaces: int = 4, handicap: bool = false) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	box(root, Vector3(0.0, 0.02, 0.0), Vector3(size.x + 0.18, 0.04, size.y + 0.18), material(CURB, 0.92))
	box(root, Vector3(0.0, 0.06, 0.0), Vector3(size.x, 0.04, size.y), material("555b60", 0.96))
	for i in range(spaces + 1):
		var x := lerpf(-size.x * 0.42, size.x * 0.42, float(i) / float(max(1, spaces)))
		box(root, Vector3(x, 0.1, -size.y * 0.04), Vector3(0.035, 0.014, size.y * 0.66), material(WHITE, 0.9))
	for i in range(spaces):
		var x := lerpf(-size.x * 0.36, size.x * 0.36, (float(i) + 0.5) / float(max(1, spaces)))
		box(root, Vector3(x, 0.12, -size.y * 0.32), Vector3(0.34, 0.035, 0.055), material("e6cf75", 0.88))
	if handicap:
		box(root, Vector3(-size.x * 0.38, 0.105, 0.06), Vector3(0.42, 0.012, size.y * 0.42), material("577da7", 0.82))
	return root


static func add_streetlight(parent: Node, position: Vector3) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	var metal := material("2f3335", 0.82)
	cylinder(root, Vector3(0.0, 0.58, 0.0), 0.035, 1.16, metal)
	box(root, Vector3(0.0, 1.16, 0.0), Vector3(0.24, 0.06, 0.24), metal)
	sphere(root, Vector3(0.0, 1.1, 0.0), 0.08, material("fff4d8", 0.08, "ffe7a8", 0.42), 0.8)
	return root


static func add_cart_rack(parent: Node, position: Vector3, rotation_y: float = 0.0) -> Node3D:
	var root := Node3D.new()
	root.position = position
	root.rotation.y = rotation_y
	parent.add_child(root)
	var metal := material("c7d0d2", 0.78)
	var handle := material("4d5962", 0.88)
	box(root, Vector3(0.0, 0.18, 0.0), Vector3(0.42, 0.08, 0.26), metal)
	for x in [-0.18, 0.18]:
		box(root, Vector3(x, 0.3, 0.0), Vector3(0.035, 0.26, 0.32), metal)
	for z in [-0.12, 0.12]:
		box(root, Vector3(0.0, 0.32, z), Vector3(0.48, 0.032, 0.032), handle)
	return root


static func add_trash_can(parent: Node, position: Vector3, color: Color = Color("4b6778")) -> Node3D:
	var root := Node3D.new()
	root.position = position
	parent.add_child(root)
	cylinder(root, Vector3(0.0, 0.18, 0.0), 0.1, 0.36, material(color.to_html(false), 0.86))
	box(root, Vector3(0.0, 0.38, 0.0), Vector3(0.25, 0.045, 0.25), material(color.lightened(0.18).to_html(false), 0.82))
	return root
