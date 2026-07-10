extends Node3D

@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var sun: DirectionalLight3D = $Sun
@onready var fill_light: DirectionalLight3D = $FillLight

var _last_town_light_level := -1.0
var _last_ambient_light_scale := -1.0
var _last_window_band_count := -1


func _set_environment_property_if_present(env: Environment, property_name: String, value: Variant) -> void:
	for property in env.get_property_list():
		if str(property.get("name", "")) == property_name:
			env.set(property_name, value)
			return


func apply_cycle(day: int, simulation_clock: float, window_bands: Array, town_light_level: float = 0.0, ambient_light_scale: float = 1.0) -> void:
	var town_strength: float = clampf(town_light_level, 0.0, 1.0)
	var daylight_scale := clampf(ambient_light_scale, 0.0, 1.0)
	var night_amount := 1.0 - daylight_scale
	var daylight_curve := pow(daylight_scale, 1.12)
	var window_band_count := window_bands.size()
	if is_equal_approx(_last_town_light_level, town_strength) and is_equal_approx(_last_ambient_light_scale, daylight_scale) and _last_window_band_count == window_band_count:
		return
	_last_town_light_level = town_strength
	_last_ambient_light_scale = daylight_scale
	_last_window_band_count = window_band_count
	var sky_top: Color = Color(0.72, 0.88, 0.98).lerp(Color(0.025, 0.035, 0.075), night_amount)
	var sky_horizon: Color = Color(1.0, 0.9, 0.7).lerp(Color(0.05, 0.06, 0.11), night_amount)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.08)
		env.ambient_light_color = Color(0.76, 0.8, 0.72).lerp(Color(0.16, 0.2, 0.32), night_amount)
		env.ambient_light_energy = lerpf(0.07, 0.16, daylight_curve)
		env.fog_enabled = false
		env.fog_light_energy = 0.0
		env.fog_density = 0.0
		env.glow_enabled = true
		env.glow_bloom = lerpf(0.0, 0.006, daylight_curve)
		env.glow_intensity = lerpf(0.0, 0.035, daylight_curve)
		env.adjustment_enabled = false
		env.adjustment_brightness = lerpf(0.74, 0.91, daylight_scale)
		env.adjustment_contrast = lerpf(1.14, 1.08, daylight_scale)
		env.adjustment_saturation = lerpf(0.92, 0.98, daylight_scale)
		_set_environment_property_if_present(env, "ssao_enabled", true)
		_set_environment_property_if_present(env, "ssao_radius", 1.78)
		_set_environment_property_if_present(env, "ssao_intensity", 1.38)
		_set_environment_property_if_present(env, "ssao_power", 1.56)
		_set_environment_property_if_present(env, "ssao_detail", 0.48)
	if sun:
		sun.light_color = Color(1.0, 0.91, 0.77).lerp(Color(0.58, 0.66, 0.86), night_amount)
		sun.light_energy = lerpf(0.045, 0.45, daylight_curve)
		sun.rotation_degrees = Vector3(lerpf(-34.0, -50.0, daylight_scale), 32.0, 0.0)
		sun.shadow_blur = 2.7
		sun.shadow_bias = 0.035
		sun.shadow_normal_bias = 1.45
	if fill_light:
		fill_light.light_color = Color(0.66, 0.76, 1.0).lerp(Color(0.2, 0.26, 0.4), night_amount)
		fill_light.light_energy = lerpf(0.02, 0.04, daylight_curve)
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.08 + town_strength * 0.025 + night_amount * 0.18
