extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var warm_strength: float = clampf(0.5 + sun_wave * 0.32, 0.18, 0.9)
	var sky_top: Color = Color(0.2, 0.24, 0.3).lerp(Color(0.91, 0.58, 0.34), warm_strength * 0.72)
	var sky_horizon: Color = Color(0.68, 0.67, 0.6).lerp(Color(0.98, 0.79, 0.54), warm_strength * 0.82)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(1.0, 0.93, 0.84), 0.28)
		env.ambient_light_energy = 0.2 + warm_strength * 0.16
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.08 + warm_strength * 0.08
		env.fog_density = 0.0013
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.9
		env.adjustment_contrast = 1.16
		env.adjustment_saturation = 1.02
	if sun:
		sun.light_color = Color(1.0, 0.84, 0.66).lerp(Color(1.0, 0.69, 0.42), warm_strength * 0.66)
		sun.light_energy = 0.72 + warm_strength * 0.42
		sun.rotation_degrees = Vector3(-42.0 - warm_strength * 16.0, -26.0, 0.0)
	if fill_light:
		fill_light.light_color = Color(0.55, 0.64, 0.76).lerp(Color(0.94, 0.73, 0.52), warm_strength * 0.32)
		fill_light.light_energy = 0.06 + warm_strength * 0.08
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.12 + (1.0 - warm_strength) * 0.68
