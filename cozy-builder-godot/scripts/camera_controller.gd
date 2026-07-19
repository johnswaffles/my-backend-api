extends Node3D

@export var orbit_scale := Vector3(0.82, 0.44, 0.82)
@export var look_height := 0.66
@export var camera_distance := 36.0
@export var min_orthographic_size := 6.0
@export var max_orthographic_size := 38.0

@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 15.2
	camera.near = 0.04
	camera.far = 700.0


func apply_view(focus: Vector3, zoom: float, yaw: float) -> void:
	position = focus
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = clampf(zoom, min_orthographic_size, max_orthographic_size)
	# Orthographic zoom should only change the projection size. Tying physical camera
	# distance to zoom let foreground buildings cross the near plane at close range,
	# which sliced roofs and walls into the large triangular shards seen on screen.
	var orbit_direction := orbit_scale.normalized()
	camera.position = (orbit_direction * camera_distance).rotated(Vector3.UP, yaw)
	camera.look_at(focus + Vector3(0.0, look_height, 0.0), Vector3.UP)


func get_camera() -> Camera3D:
	return camera
