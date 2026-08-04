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
	var sky_top: Color = Color(0.38, 0.67, 0.88).lerp(Color(0.018, 0.028, 0.07), night_amount)
	var sky_horizon: Color = Color(1.0, 0.78, 0.48).lerp(Color(0.06, 0.07, 0.14), night_amount)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.08)
		if env.sky and env.sky.sky_material is ProceduralSkyMaterial:
			var sky_material := env.sky.sky_material as ProceduralSkyMaterial
			sky_material.sky_top_color = sky_top
			sky_material.sky_horizon_color = sky_horizon
			sky_material.ground_bottom_color = Color(0.18, 0.32, 0.19).lerp(Color(0.025, 0.035, 0.065), night_amount)
			sky_material.ground_horizon_color = Color(0.76, 0.76, 0.48).lerp(Color(0.065, 0.075, 0.13), night_amount)
			sky_material.sun_angle_max = 18.0
			sky_material.sun_curve = 0.18
		env.ambient_light_color = Color(0.7, 0.8, 0.77).lerp(Color(0.13, 0.18, 0.33), night_amount)
		env.ambient_light_energy = lerpf(0.08, 0.24, daylight_curve)
		env.fog_enabled = true
		env.fog_light_color = sky_horizon.lerp(Color.WHITE, 0.16)
		env.fog_light_energy = lerpf(0.32, 0.58, daylight_curve)
		env.fog_density = lerpf(0.0032, 0.00135, daylight_scale)
		env.glow_enabled = true
		env.glow_bloom = lerpf(0.04, 0.014, daylight_curve)
		env.glow_intensity = lerpf(0.24, 0.075, daylight_curve)
		env.adjustment_enabled = true
		env.adjustment_brightness = lerpf(0.74, 0.88, daylight_scale)
		env.adjustment_contrast = lerpf(1.16, 1.1, daylight_scale)
		env.adjustment_saturation = lerpf(0.96, 1.03, daylight_scale)
		_set_environment_property_if_present(env, "ssao_enabled", true)
		_set_environment_property_if_present(env, "ssao_radius", 1.35)
		_set_environment_property_if_present(env, "ssao_intensity", 1.65)
		_set_environment_property_if_present(env, "ssao_power", 1.4)
		_set_environment_property_if_present(env, "ssao_detail", 0.7)
		_set_environment_property_if_present(env, "fog_aerial_perspective", 0.22)
	if sun:
		sun.light_color = Color(1.0, 0.84, 0.64).lerp(Color(0.54, 0.64, 0.9), night_amount)
		sun.light_energy = lerpf(0.08, 0.68, daylight_curve)
		sun.rotation_degrees = Vector3(lerpf(-34.0, -50.0, daylight_scale), 32.0, 0.0)
		sun.shadow_blur = 1.8
		sun.shadow_bias = 0.02
		sun.shadow_normal_bias = 0.65
	if fill_light:
		fill_light.light_color = Color(0.56, 0.72, 1.0).lerp(Color(0.18, 0.25, 0.46), night_amount)
		fill_light.light_energy = lerpf(0.025, 0.08, daylight_curve)
	for band in window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.12 + town_strength * 0.16 + night_amount * 0.92
