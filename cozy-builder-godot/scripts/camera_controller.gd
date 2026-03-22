extends Node3D

@export var orbit_scale := Vector3(0.92, 0.74, 0.86)
@export var look_height := 0.8

@onready var camera: Camera3D = $Camera3D


func apply_view(focus: Vector3, zoom: float, yaw: float) -> void:
	position = focus
	camera.position = Vector3(zoom * orbit_scale.x, zoom * orbit_scale.y, zoom * orbit_scale.z).rotated(Vector3.UP, yaw)
	camera.look_at(focus + Vector3(0.0, look_height, 0.0), Vector3.UP)


func get_camera() -> Camera3D:
	return camera
