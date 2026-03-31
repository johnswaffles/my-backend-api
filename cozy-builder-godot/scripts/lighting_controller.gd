extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0, ambient_light_scale: float = 1.0) -> void:
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var daylight_scale := clampf(ambient_light_scale, 0.5, 1.0)
	var sky_top: Color = Color(0.34, 0.62, 0.95).lerp(Color(0.24, 0.44, 0.72), 1.0 - daylight_scale)
	var sky_horizon: Color = Color(0.74, 0.88, 1.0).lerp(Color(0.54, 0.70, 0.90), 1.0 - daylight_scale)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.08)
		env.ambient_light_color = sky_top.lerp(sky_horizon, 0.35)
		env.ambient_light_energy = 0.22 * daylight_scale
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.0
		env.glow_intensity = 0.0
		env.adjustment_enabled = true
		env.adjustment_brightness = 1.0
		env.adjustment_contrast = 1.0
		env.adjustment_saturation = 1.0
	if sun:
		sun.light_color = Color(1.0, 0.98, 0.93).lerp(Color(0.92, 0.96, 1.0), town_strength * 0.02)
		sun.light_energy = 1.35 * daylight_scale
		sun.rotation_degrees = Vector3(-62.0, -30.0, 0.0)
		sun.shadow_blur = 0.75
	if fill_light:
		fill_light.light_color = Color(0.86, 0.93, 1.0).lerp(Color(0.78, 0.84, 0.92), town_strength * 0.02)
		fill_light.light_energy = 0.2 * daylight_scale
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.08 + town_strength * 0.025 + (1.0 - daylight_scale) * 0.08
