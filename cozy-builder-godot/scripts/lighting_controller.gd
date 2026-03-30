extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var night_strength: float = clampf(1.0 - town_strength * 0.2 + moon_wave * 0.015, 0.24, 1.0)
	var sky_top: Color = Color(0.05, 0.06, 0.09).lerp(Color(0.08, 0.09, 0.12), town_strength * 0.4)
	var sky_horizon: Color = Color(0.08, 0.08, 0.1).lerp(Color(0.22, 0.18, 0.16), town_strength * 0.28)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.46)
		env.ambient_light_color = sky_top.lerp(Color(0.82, 0.78, 0.74), 0.07)
		env.ambient_light_energy = 0.08 + town_strength * 0.04
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.02 + town_strength * 0.015
		env.glow_intensity = 0.03 + town_strength * 0.02
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.97 + town_strength * 0.015
		env.adjustment_contrast = 1.0 + night_strength * 0.02
		env.adjustment_saturation = 1.04
	if sun:
		sun.light_color = Color(0.55, 0.63, 0.82).lerp(Color(0.95, 0.8, 0.62), town_strength * 0.35)
		sun.light_energy = 0.22 + town_strength * 0.12
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 0.96
	if fill_light:
		fill_light.light_color = Color(0.26, 0.34, 0.54).lerp(Color(0.9, 0.8, 0.68), town_strength * 0.22)
		fill_light.light_energy = 0.05 + town_strength * 0.025
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 1.08 + town_strength * 0.96 + night_strength * 0.22
