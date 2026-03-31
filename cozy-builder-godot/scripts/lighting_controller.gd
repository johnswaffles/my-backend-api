extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0, ambient_light_scale: float = 1.0) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var night_strength: float = clampf(1.0 - town_strength * 0.02 + moon_wave * 0.004, 0.55, 1.0)
	var sky_top: Color = Color(0.016, 0.022, 0.034).lerp(Color(0.022, 0.028, 0.042), town_strength * 0.02)
	var sky_horizon: Color = Color(0.018, 0.024, 0.036).lerp(Color(0.03, 0.035, 0.05), town_strength * 0.016)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.05)
		env.ambient_light_color = sky_top
		env.ambient_light_energy = (0.010 + town_strength * 0.0015) * ambient_light_scale
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.0
		env.glow_intensity = 0.0
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.72
		env.adjustment_contrast = 1.0 + night_strength * 0.02
		env.adjustment_saturation = 0.96
	if sun:
		sun.light_color = Color(0.56, 0.64, 0.8).lerp(Color(0.64, 0.64, 0.68), town_strength * 0.03)
		sun.light_energy = 0.018 + town_strength * 0.004
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 1.05
	if fill_light:
		fill_light.light_color = Color(0.15, 0.18, 0.28).lerp(Color(0.28, 0.28, 0.3), town_strength * 0.02)
		fill_light.light_energy = 0.004 + town_strength * 0.001
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.1 + town_strength * 0.03 + night_strength * 0.08
