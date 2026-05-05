extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight

var _last_town_light_level := -1.0
var _last_ambient_light_scale := -1.0
var _last_window_band_count := -1


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0, ambient_light_scale: float = 1.0) -> void:
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var daylight_scale := clampf(ambient_light_scale, 0.0, 1.0)
	var night_amount := 1.0 - daylight_scale
	var daylight_curve := pow(daylight_scale, 1.35)
	var window_band_count := window_bands.size()
	if is_equal_approx(_last_town_light_level, town_strength) and is_equal_approx(_last_ambient_light_scale, daylight_scale) and _last_window_band_count == window_band_count:
		return
	_last_town_light_level = town_strength
	_last_ambient_light_scale = daylight_scale
	_last_window_band_count = window_band_count
	var sky_top: Color = Color(0.62, 0.82, 1.0).lerp(Color(0.025, 0.035, 0.08), night_amount)
	var sky_horizon: Color = Color(0.86, 0.94, 0.88).lerp(Color(0.055, 0.07, 0.12), night_amount)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.08)
		env.ambient_light_color = Color(0.7, 0.8, 0.7).lerp(Color(0.16, 0.2, 0.32), night_amount)
		env.ambient_light_energy = lerpf(0.06, 0.6, daylight_curve)
		env.fog_enabled = false
		env.fog_density = 0.0
		env.glow_bloom = 0.0
		env.glow_intensity = 0.0
		env.adjustment_enabled = true
		env.adjustment_brightness = lerpf(0.72, 1.04, daylight_scale)
		env.adjustment_contrast = lerpf(1.06, 0.96, daylight_scale)
		env.adjustment_saturation = lerpf(0.96, 1.04, daylight_scale)
	if sun:
		sun.light_color = Color(1.0, 0.98, 0.92).lerp(Color(0.58, 0.66, 0.86), night_amount)
		sun.light_energy = lerpf(0.04, 1.2, daylight_curve)
		sun.rotation_degrees = Vector3(lerpf(-34.0, -60.0, daylight_scale), 30.0, 0.0)
		sun.shadow_blur = 2.0
	if fill_light:
		fill_light.light_color = Color(0.82, 0.9, 1.0).lerp(Color(0.2, 0.26, 0.4), night_amount)
		fill_light.light_energy = lerpf(0.08, 0.32, daylight_curve)
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.08 + town_strength * 0.025 + night_amount * 0.18
