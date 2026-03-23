shader_type spatial;
render_mode unshaded, cull_disabled, depth_prepass_alpha, blend_mix;

uniform sampler2D albedo_tex : source_color;
uniform vec4 tint : source_color = vec4(1.0);
uniform float key_threshold = 0.965;
uniform float key_softness = 0.035;

void fragment() {
	vec4 col = texture(albedo_tex, UV) * tint;
	float key_r = smoothstep(key_threshold - key_softness, key_threshold + key_softness, col.r);
	float key_g = smoothstep(key_threshold - key_softness, key_threshold + key_softness, col.g);
	float key_b = smoothstep(key_threshold - key_softness, key_threshold + key_softness, col.b);
	float key = key_r * key_g * key_b;
	col.a *= 1.0 - key;
	if (col.a < 0.02) {
		discard;
	}
	ALBEDO = col.rgb;
	ALPHA = col.a;
}
