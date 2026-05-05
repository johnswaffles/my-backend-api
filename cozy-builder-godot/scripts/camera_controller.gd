extends Node3D

@export var orbit_scale := Vector3(0.82, 1.16, 0.82)
@export var look_height := 0.8
@export var min_orthographic_size := 10.0
@export var max_orthographic_size := 72.0

@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 34.0
	camera.near = 0.1
	camera.far = 700.0


func apply_view(focus: Vector3, zoom: float, yaw: float) -> void:
	position = focus
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = clampf(zoom, min_orthographic_size, max_orthographic_size)
	camera.position = Vector3(zoom * orbit_scale.x, zoom * orbit_scale.y, zoom * orbit_scale.z).rotated(Vector3.UP, yaw)
	camera.look_at(focus + Vector3(0.0, look_height, 0.0), Vector3.UP)


func get_camera() -> Camera3D:
	return camera
