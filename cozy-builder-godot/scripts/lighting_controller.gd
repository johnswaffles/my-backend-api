extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var moon_wave := sin(cycle * TAU)
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var night_strength: float = clampf(1.0 - town_strength * 0.54 + moon_wave * 0.025, 0.18, 1.0)
	var sky_top: Color = Color(0.05, 0.06, 0.09).lerp(Color(0.11, 0.13, 0.19), town_strength * 0.64)
	var sky_horizon: Color = Color(0.09, 0.08, 0.11).lerp(Color(0.34, 0.24, 0.22), town_strength * 0.56)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(0.86, 0.76, 0.7), 0.16)
		env.ambient_light_energy = 0.07 + town_strength * 0.16
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.1 + town_strength * 0.06
		env.fog_density = 0.0012 + night_strength * 0.0011
		env.glow_bloom = 0.11 + town_strength * 0.08
		env.glow_intensity = 0.18 + town_strength * 0.14
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.68 + town_strength * 0.12
		env.adjustment_contrast = 1.18 + night_strength * 0.08
		env.adjustment_saturation = 1.04
	if sun:
		sun.light_color = Color(0.5, 0.6, 0.84).lerp(Color(1.0, 0.82, 0.56), town_strength * 0.62)
		sun.light_energy = 0.16 + town_strength * 0.34
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 0.96
	if fill_light:
		fill_light.light_color = Color(0.26, 0.34, 0.54).lerp(Color(0.96, 0.84, 0.64), town_strength * 0.42)
		fill_light.light_energy = 0.06 + town_strength * 0.09
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 1.02 + town_strength * 1.08 + night_strength * 0.26
