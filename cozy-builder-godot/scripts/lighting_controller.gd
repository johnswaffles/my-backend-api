extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var night_strength: float = clampf(1.0 - town_strength * 0.76 + moon_wave * 0.03, 0.08, 1.0)
	var sky_top: Color = Color(0.025, 0.03, 0.06).lerp(Color(0.08, 0.1, 0.16), town_strength * 0.7)
	var sky_horizon: Color = Color(0.06, 0.05, 0.09).lerp(Color(0.28, 0.2, 0.22), town_strength * 0.64)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(0.84, 0.72, 0.66), 0.2)
		env.ambient_light_energy = 0.03 + town_strength * 0.17
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.08 + town_strength * 0.07
		env.fog_density = 0.0017 + night_strength * 0.0016
		env.glow_bloom = 0.14 + town_strength * 0.1
		env.glow_intensity = 0.22 + town_strength * 0.18
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.58 + town_strength * 0.22
		env.adjustment_contrast = 1.34 + night_strength * 0.12
		env.adjustment_saturation = 1.06
	if sun:
		sun.light_color = Color(0.48, 0.58, 0.84).lerp(Color(1.0, 0.8, 0.52), town_strength * 0.68)
		sun.light_energy = 0.08 + town_strength * 0.48
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 0.98
	if fill_light:
		fill_light.light_color = Color(0.24, 0.32, 0.52).lerp(Color(0.96, 0.82, 0.62), town_strength * 0.48)
		fill_light.light_energy = 0.04 + town_strength * 0.12
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.95 + town_strength * 1.0 + night_strength * 0.32
