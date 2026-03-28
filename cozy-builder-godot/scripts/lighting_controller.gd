extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array) -> void:
	var cycle := fmod(float(day - 1) + simulation_clock / 7.5, 6.0) / 6.0
	var sun_wave := sin(cycle * TAU)
	var warm_strength: float = clampf(0.46 + sun_wave * 0.3, 0.14, 0.88)
	var dusk_ratio := 1.0 - warm_strength
	var sky_top: Color = Color(0.16, 0.2, 0.28).lerp(Color(0.9, 0.62, 0.4), warm_strength * 0.74)
	var sky_horizon: Color = Color(0.56, 0.58, 0.56).lerp(Color(0.98, 0.78, 0.56), warm_strength * 0.84)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.ambient_light_color = sky_top.lerp(Color(1.0, 0.9, 0.8), 0.24)
		env.ambient_light_energy = 0.15 + warm_strength * 0.12
		env.fog_enabled = true
		env.fog_light_color = sky_horizon
		env.fog_light_energy = 0.07 + warm_strength * 0.08
		env.fog_density = 0.001 + dusk_ratio * 0.00055
		env.glow_bloom = 0.05 + dusk_ratio * 0.05
		env.glow_intensity = 0.06 + dusk_ratio * 0.08
		env.adjustment_enabled = true
		env.adjustment_brightness = 0.86 + warm_strength * 0.05
		env.adjustment_contrast = 1.18 + dusk_ratio * 0.04
		env.adjustment_saturation = 1.04
	if sun:
		sun.light_color = Color(1.0, 0.83, 0.65).lerp(Color(1.0, 0.7, 0.42), warm_strength * 0.7)
		sun.light_energy = 0.6 + warm_strength * 0.38
		sun.rotation_degrees = Vector3(-43.0 - warm_strength * 15.0, -26.0, 0.0)
	if fill_light:
		fill_light.light_color = Color(0.5, 0.61, 0.74).lerp(Color(0.92, 0.74, 0.56), warm_strength * 0.28)
		fill_light.light_energy = 0.08 + warm_strength * 0.08
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.18 + dusk_ratio * 0.95
