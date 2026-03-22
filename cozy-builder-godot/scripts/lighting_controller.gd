extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var warm_strength: float = clampf(0.5 + sun_wave * 0.32, 0.18, 0.9)
	var sky_top: Color = Color(0.22, 0.28, 0.38).lerp(Color(0.93, 0.64, 0.38), warm_strength * 0.74)
	var sky_horizon: Color = Color(0.78, 0.76, 0.67).lerp(Color(1.0, 0.83, 0.58), warm_strength * 0.82)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(1.0, 0.94, 0.86), 0.34)
		env.ambient_light_energy = 0.34 + warm_strength * 0.2
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.14 + warm_strength * 0.12
		env.fog_density = 0.0017
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.94
		env.adjustment_contrast = 1.1
		env.adjustment_saturation = 1.02
	if sun:
		sun.light_color = Color(1.0, 0.86, 0.68).lerp(Color(1.0, 0.72, 0.45), warm_strength * 0.64)
		sun.light_energy = 0.86 + warm_strength * 0.52
		sun.rotation_degrees = Vector3(-42.0 - warm_strength * 16.0, -26.0, 0.0)
	if fill_light:
		fill_light.light_color = Color(0.62, 0.72, 0.84).lerp(Color(0.96, 0.77, 0.56), warm_strength * 0.38)
		fill_light.light_energy = 0.1 + warm_strength * 0.12
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.12 + (1.0 - warm_strength) * 0.68
