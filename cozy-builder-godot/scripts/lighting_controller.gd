extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var dusk_strength: float = clampf(0.66 + sun_wave * 0.2, 0.32, 0.92)
	var night_strength := 1.0 - dusk_strength
	var sky_top: Color = Color(0.1, 0.13, 0.2).lerp(Color(0.34, 0.24, 0.42), dusk_strength * 0.34)
	var sky_horizon: Color = Color(0.26, 0.24, 0.32).lerp(Color(0.96, 0.7, 0.43), dusk_strength * 0.8)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(0.95, 0.84, 0.72), 0.18)
		env.ambient_light_energy = 0.16 + dusk_strength * 0.12
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.12 + night_strength * 0.1
		env.fog_density = 0.0014 + night_strength * 0.0011
		env.glow_bloom = 0.08 + night_strength * 0.08
		env.glow_intensity = 0.14 + night_strength * 0.14
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.83 + dusk_strength * 0.08
		env.adjustment_contrast = 1.18 + night_strength * 0.14
		env.adjustment_saturation = 1.08
	if sun:
		sun.light_color = Color(1.0, 0.84, 0.66).lerp(Color(1.0, 0.68, 0.4), dusk_strength * 0.78)
		sun.light_energy = 0.72 + dusk_strength * 0.45
		sun.rotation_degrees = Vector3(-47.0 - dusk_strength * 18.0, -30.0, 0.0)
		sun.shadow_blur = 0.82
	if fill_light:
		fill_light.light_color = Color(0.42, 0.54, 0.7).lerp(Color(0.92, 0.78, 0.58), dusk_strength * 0.36)
		fill_light.light_energy = 0.12 + dusk_strength * 0.1
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.35 + night_strength * 1.12
