extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0, ambient_light_scale: float = 1.0) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var night_strength: float = clampf(1.0 - town_strength * 0.02 + moon_wave * 0.004, 0.55, 1.0)
	var sky_top: Color = Color(0.018, 0.024, 0.039).lerp(Color(0.028, 0.034, 0.052), town_strength * 0.03)
	var sky_horizon: Color = Color(0.02, 0.026, 0.042).lerp(Color(0.05, 0.055, 0.07), town_strength * 0.02)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.05)
		env.ambient_light_color = sky_top.lerp(Color(0.2, 0.24, 0.3), 0.04)
		env.ambient_light_energy = (0.012 + town_strength * 0.002) * ambient_light_scale
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.0
		env.glow_intensity = 0.0
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.72 + maxf(0.0, ambient_light_scale - 1.0) * 0.16
		env.adjustment_contrast = 1.0 + night_strength * 0.02
		env.adjustment_saturation = 0.96
	if sun:
		sun.light_color = Color(0.58, 0.66, 0.82).lerp(Color(0.68, 0.66, 0.7), town_strength * 0.04)
		sun.light_energy = 0.018 + town_strength * 0.004
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 1.05
	if fill_light:
		fill_light.light_color = Color(0.17, 0.2, 0.31).lerp(Color(0.35, 0.34, 0.36), town_strength * 0.03)
		fill_light.light_energy = 0.004 + town_strength * 0.001
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.1 + town_strength * 0.03 + night_strength * 0.08
