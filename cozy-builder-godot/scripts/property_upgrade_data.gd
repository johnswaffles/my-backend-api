extends RefCounted
class_name PropertyUpgradeData

const MAX_TIER := 4

const UPGRADEABLE_TOOLS := {
	"house": true,
	"police": true,
	"fire": true,
	"bank": true,
	"grocery": true,
	"restaurant": true,
	"corner_store": true,
	"park": true,
}

const UPGRADE_COST_FACTORS := {
	"house": [0.0, 0.58, 0.82, 1.06],
	"police": [0.0, 0.62, 0.90, 1.15],
	"fire": [0.0, 0.62, 0.90, 1.15],
	"bank": [0.0, 0.60, 0.86, 1.12],
	"grocery": [0.0, 0.58, 0.84, 1.10],
	"restaurant": [0.0, 0.58, 0.82, 1.08],
	"corner_store": [0.0, 0.54, 0.78, 1.02],
	"park": [0.0, 0.46, 0.68, 0.92],
}

const TOOL_YIELDS := {
	"house": {
		"population": [14, 18, 23, 30],
		"jobs": [0, 0, 0, 0],
		"cashflow": [168, 228, 302, 388],
		"appeal": [6, 9, 13, 17],
	},
	"police": {
		"population": [0, 0, 0, 0],
		"jobs": [14, 16, 18, 21],
		"cashflow": [-38, -42, -47, -53],
		"appeal": [16, 22, 29, 37],
	},
	"fire": {
		"population": [0, 0, 0, 0],
		"jobs": [14, 16, 18, 21],
		"cashflow": [-38, -42, -47, -53],
		"appeal": [16, 22, 29, 37],
	},
	"bank": {
		"population": [0, 0, 0, 0],
		"jobs": [18, 20, 23, 27],
		"cashflow": [286, 352, 430, 522],
		"appeal": [10, 13, 16, 20],
	},
	"grocery": {
		"population": [0, 0, 0, 0],
		"jobs": [26, 30, 35, 41],
		"cashflow": [278, 352, 442, 548],
		"appeal": [10, 12, 15, 18],
	},
	"restaurant": {
		"population": [0, 0, 0, 0],
		"jobs": [20, 24, 29, 35],
		"cashflow": [246, 312, 392, 486],
		"appeal": [12, 15, 19, 24],
	},
	"corner_store": {
		"population": [0, 0, 0, 0],
		"jobs": [12, 14, 16, 18],
		"cashflow": [178, 220, 270, 332],
		"appeal": [8, 10, 12, 15],
	},
	"park": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [-8, -10, -12, -14],
		"appeal": [28, 42, 56, 72],
	},
}

const VISUAL_PROFILES := {
	"house": {
		1: {
			"frontage_path": false,
			"frontage_steps": false,
			"roof_trim": false,
			"roof_dormer": false,
			"side_annex": false,
			"fence_upgrade": false,
			"garden_extension": false,
			"landscaping": false,
		},
		2: {
			"frontage_path": false,
			"frontage_steps": true,
			"roof_trim": true,
			"roof_dormer": true,
			"side_annex": false,
			"fence_upgrade": false,
			"garden_extension": false,
			"landscaping": true,
		},
		3: {
			"frontage_path": true,
			"frontage_steps": true,
			"roof_trim": true,
			"roof_dormer": true,
			"side_annex": true,
			"fence_upgrade": true,
			"garden_extension": true,
			"landscaping": true,
		},
		4: {
			"frontage_path": true,
			"frontage_steps": true,
			"roof_trim": true,
			"roof_dormer": true,
			"side_annex": true,
			"fence_upgrade": true,
			"garden_extension": true,
			"landscaping": true,
		},
	},
	"police": {
		1: {"front_hall": false, "tower": false, "service_wing": false, "rear_hall": false, "parking_expand": false, "second_story": false, "landscaping": false},
		2: {"front_hall": true, "tower": true, "service_wing": true, "rear_hall": true, "parking_expand": false, "second_story": false, "landscaping": false},
		3: {"front_hall": true, "tower": true, "service_wing": true, "rear_hall": true, "parking_expand": true, "second_story": false, "landscaping": false},
		4: {"front_hall": true, "tower": true, "service_wing": true, "rear_hall": true, "parking_expand": true, "second_story": true, "landscaping": false},
	},
	"fire": {
		1: {"front_hall": false, "bay_extend": false, "hose_tower": false, "parking_expand": false, "second_story": false, "landscaping": false},
		2: {"front_hall": true, "bay_extend": true, "hose_tower": false, "parking_expand": false, "second_story": false, "landscaping": false},
		3: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": false, "landscaping": false},
		4: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": true, "landscaping": false},
	},
	"bank": {
		1: {"column_entry": false, "side_wing": false, "grand_plaza": false, "landscaping": false},
		2: {"column_entry": true, "side_wing": false, "grand_plaza": true, "landscaping": true},
		3: {"column_entry": true, "side_wing": true, "grand_plaza": true, "landscaping": true},
		4: {"column_entry": true, "side_wing": true, "grand_plaza": true, "landscaping": true},
	},
	"grocery": {
		1: {"awning": false, "service_wing": false, "parking": false, "landscaping": false},
		2: {"awning": true, "service_wing": false, "parking": true, "landscaping": true},
		3: {"awning": true, "service_wing": true, "parking": true, "landscaping": true},
		4: {"awning": true, "service_wing": true, "parking": true, "landscaping": true},
	},
	"restaurant": {
		1: {"patio": false, "pergola": false, "garden_room": false, "landscaping": false},
		2: {"patio": true, "pergola": false, "garden_room": false, "landscaping": true},
		3: {"patio": true, "pergola": true, "garden_room": false, "landscaping": true},
		4: {"patio": true, "pergola": true, "garden_room": true, "landscaping": true},
	},
	"corner_store": {
		1: {"corner_awning": false, "delivery_nook": false, "side_sign": false, "landscaping": false},
		2: {"corner_awning": true, "delivery_nook": false, "side_sign": false, "landscaping": true},
		3: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "landscaping": true},
		4: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "landscaping": true},
	},
	"park": {
		1: {"extra_trees": false, "gazebo": false, "fountain": false, "paths": false},
		2: {"extra_trees": true, "gazebo": false, "fountain": false, "paths": true},
		3: {"extra_trees": true, "gazebo": true, "fountain": false, "paths": true},
		4: {"extra_trees": true, "gazebo": true, "fountain": true, "paths": true},
	},
}


static func is_upgradeable(tool: String) -> bool:
	return UPGRADEABLE_TOOLS.has(tool)


static func max_tier(tool: String) -> int:
	return MAX_TIER if is_upgradeable(tool) else 1


static func upgrade_cost(base_cost: int, tool: String, current_tier: int) -> int:
	if not is_upgradeable(tool):
		return -1
	var factors: Array = UPGRADE_COST_FACTORS.get(tool, [0.0, 0.60, 0.85, 1.10])
	var index: int = clamp(current_tier, 1, MAX_TIER - 1)
	var factor := float(factors[index])
	return maxi(1, int(round(float(base_cost) * factor)))


static func tier_yield(tool: String, tier: int) -> Dictionary:
	if not TOOL_YIELDS.has(tool):
		return {"population": 0, "jobs": 0, "cashflow": 0, "appeal": 0}
	var profile: Dictionary = TOOL_YIELDS[tool]
	var index: int = clamp(tier, 1, MAX_TIER) - 1
	return {
		"population": int(profile["population"][index]),
		"jobs": int(profile["jobs"][index]),
		"cashflow": int(profile["cashflow"][index]),
		"appeal": int(profile["appeal"][index]),
	}


static func visual_profile(tool: String, tier: int) -> Dictionary:
	if not VISUAL_PROFILES.has(tool):
		var fallback_tier: int = clamp(tier, 1, MAX_TIER)
		return {
			"tier": fallback_tier,
			"detail_level": fallback_tier - 1,
			"tier_label": ["base", "refined", "developed", "grand"][fallback_tier - 1],
		}
	var tier_profiles: Dictionary = VISUAL_PROFILES[tool]
	var clamped_tier: int = clamp(tier, 1, MAX_TIER)
	var profile: Dictionary = tier_profiles.get(clamped_tier, {})
	profile = profile.duplicate(true)
	profile["tier"] = clamped_tier
	profile["detail_level"] = clamped_tier - 1
	profile["tier_label"] = ["base", "refined", "developed", "grand"][clamped_tier - 1]
	return profile
