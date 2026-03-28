extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var dusk_strength: float = clampf(0.72 + sun_wave * 0.16, 0.42, 0.96)
	var night_strength := 1.0 - dusk_strength
	var sky_top: Color = Color(0.04, 0.06, 0.11).lerp(Color(0.18, 0.12, 0.18), dusk_strength * 0.38)
	var sky_horizon: Color = Color(0.15, 0.12, 0.16).lerp(Color(0.8, 0.46, 0.34), dusk_strength * 0.74)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(0.9, 0.78, 0.62), 0.15)
		env.ambient_light_energy = 0.08 + dusk_strength * 0.12
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.18 + night_strength * 0.12
		env.fog_density = 0.0023 + night_strength * 0.0018
		env.glow_bloom = 0.12 + night_strength * 0.12
		env.glow_intensity = 0.18 + night_strength * 0.2
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.72 + dusk_strength * 0.05
		env.adjustment_contrast = 1.3 + night_strength * 0.18
		env.adjustment_saturation = 1.03
	if sun:
		sun.light_color = Color(1.0, 0.76, 0.54).lerp(Color(1.0, 0.52, 0.3), dusk_strength * 0.74)
		sun.light_energy = 0.58 + dusk_strength * 0.42
		sun.rotation_degrees = Vector3(-52.0 - dusk_strength * 16.0, -30.0, 0.0)
		sun.shadow_blur = 0.96
	if fill_light:
		fill_light.light_color = Color(0.34, 0.45, 0.62).lerp(Color(0.92, 0.7, 0.52), dusk_strength * 0.28)
		fill_light.light_energy = 0.09 + dusk_strength * 0.06
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.62 + night_strength * 1.38
