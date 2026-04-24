extends RefCounted
class_name PropertyUpgradeData

const MAX_TIER := 4
const HOUSE_MAX_TIER := 5
const RESTAURANT_MAX_TIER := 5
const SERVICE_MAX_TIER := 5

const DEFAULT_TIER_LABELS := ["base", "refined", "developed", "grand"]
const HOUSE_TIER_LABELS := ["base", "entry", "family", "two-story", "estate"]
const RESTAURANT_TIER_LABELS := ["base", "expanded", "dining hall", "landmark", "two-story"]
const SERVICE_TIER_LABELS := ["base", "expanded", "developed", "landmark", "signature"]

const UPGRADEABLE_TOOLS := {
	"house": true,
	"fire": true,
	"bank": true,
	"grocery": true,
	"restaurant": true,
	"corner_store": true,
	"park": true,
}

const UPGRADE_COST_FACTORS := {
	"house": [0.0, 0.56, 0.80, 1.02, 1.22],
	"fire": [0.0, 0.58, 0.82, 1.06, 1.28],
	"bank": [0.0, 0.56, 0.78, 1.02, 1.24],
	"grocery": [0.0, 0.54, 0.76, 0.98, 1.18],
	"restaurant": [0.0, 0.54, 0.76, 0.98, 1.20],
	"corner_store": [0.0, 0.52, 0.74, 0.96, 1.16],
	"park": [0.0, 0.46, 0.68, 0.92],
}

const TOOL_YIELDS := {
	"house": {
		"population": [14, 18, 23, 29, 36],
		"jobs": [0, 0, 0, 0, 0],
		"cashflow": [168, 228, 302, 382, 474],
		"appeal": [6, 9, 13, 17, 22],
	},
	"fire": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [14, 16, 18, 21, 25],
		"cashflow": [-38, -42, -47, -53, -60],
		"appeal": [16, 22, 29, 37, 46],
	},
	"bank": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [18, 20, 23, 27, 32],
		"cashflow": [286, 352, 430, 522, 640],
		"appeal": [10, 13, 16, 20, 26],
	},
	"grocery": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [26, 30, 35, 41, 48],
		"cashflow": [278, 352, 442, 548, 674],
		"appeal": [10, 12, 15, 18, 24],
	},
	"restaurant": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [20, 24, 29, 35, 42],
		"cashflow": [246, 312, 392, 486, 612],
		"appeal": [12, 15, 19, 24, 31],
	},
	"corner_store": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [12, 14, 16, 18, 22],
		"cashflow": [178, 220, 270, 332, 410],
		"appeal": [8, 10, 12, 15, 20],
	},
	"park": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [-8, -10, -12, -14],
		"appeal": [28, 42, 56, 72],
	},
	"pond_small": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [10, 10, 10, 10],
	},
	"pond_medium": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [16, 16, 16, 16],
	},
	"pond_large": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [26, 26, 26, 26],
	},
	"forest_small": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [8, 8, 8, 8],
	},
	"forest_medium": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [12, 12, 12, 12],
	},
	"forest_large": {
		"population": [0, 0, 0, 0],
		"jobs": [0, 0, 0, 0],
		"cashflow": [0, 0, 0, 0],
		"appeal": [18, 18, 18, 18],
	},
}

const VISUAL_PROFILES := {
	"house": {
		1: {
			"frontage_path": false,
			"frontage_steps": false,
			"roof_trim": false,
			"wall_windows": false,
			"front_lamp": true,
			"side_annex": false,
			"second_story": false,
			"upper_windows": false,
			"roof_cap": false,
		},
		2: {
			"frontage_path": false,
			"frontage_steps": true,
			"front_bumpout": true,
			"roof_trim": true,
			"wall_windows": true,
			"front_lamp": true,
			"side_annex": false,
			"second_story": false,
			"upper_windows": false,
			"roof_cap": false,
		},
		3: {
			"frontage_path": false,
			"frontage_steps": true,
			"front_bumpout": true,
			"roof_trim": true,
			"wall_windows": true,
			"front_lamp": true,
			"side_annex": true,
			"second_story": false,
			"upper_windows": true,
			"roof_cap": false,
		},
		4: {
			"frontage_path": false,
			"frontage_steps": true,
			"front_bumpout": true,
			"roof_trim": true,
			"wall_windows": true,
			"front_lamp": true,
			"second_story": true,
			"side_annex": true,
			"upper_windows": true,
			"roof_cap": false,
		},
		5: {
			"frontage_path": false,
			"frontage_steps": true,
			"front_bumpout": true,
			"roof_trim": true,
			"wall_windows": true,
			"front_lamp": true,
			"second_story": true,
			"side_annex": true,
			"upper_windows": true,
			"upper_side_wing": true,
			"roof_cap": true,
		},
	},
	"fire": {
		1: {"front_hall": false, "bay_extend": false, "hose_tower": false, "parking_expand": false, "second_story": false, "landscaping": false},
		2: {"front_hall": true, "bay_extend": true, "hose_tower": false, "parking_expand": false, "second_story": false, "landscaping": false},
		3: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": false, "landscaping": false},
		4: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": true, "landscaping": false},
		5: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": true, "civic_wing": true, "landscaping": false},
	},
	"bank": {
		1: {"front_hall": false, "side_wing": false, "plaza": false, "upper_story": false, "landscaping": false},
		2: {"front_hall": true, "side_wing": false, "plaza": true, "upper_story": false, "landscaping": false},
		3: {"front_hall": true, "side_wing": true, "plaza": true, "upper_story": false, "landscaping": true},
		4: {"front_hall": true, "side_wing": true, "plaza": true, "upper_story": true, "landscaping": true},
		5: {"front_hall": true, "side_wing": true, "plaza": true, "upper_story": true, "grand_hall": true, "landscaping": true},
	},
	"grocery": {
		1: {"awning": false, "service_wing": false, "market_hall": false, "upper_story": false, "parking": false, "landscaping": false},
		2: {"awning": true, "service_wing": false, "market_hall": false, "upper_story": false, "parking": true, "landscaping": true},
		3: {"awning": true, "service_wing": true, "market_hall": false, "upper_story": false, "parking": true, "landscaping": true},
		4: {"awning": true, "service_wing": true, "market_hall": true, "upper_story": false, "parking": true, "landscaping": true},
		5: {"awning": true, "service_wing": true, "market_hall": true, "upper_story": true, "parking": true, "landscaping": true},
	},
	"restaurant": {
		1: {"front_expansion": false, "dining_wing": false, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		2: {"front_expansion": true, "dining_wing": false, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		3: {"front_expansion": true, "dining_wing": true, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		4: {"front_expansion": true, "dining_wing": true, "kitchen_wing": true, "signature_front": true, "second_floor": false},
		5: {"front_expansion": true, "dining_wing": true, "kitchen_wing": true, "signature_front": true, "second_floor": true},
	},
	"corner_store": {
		1: {"corner_awning": false, "delivery_nook": false, "side_sign": false, "corner_tower": false, "upper_story": false, "landscaping": false},
		2: {"corner_awning": true, "delivery_nook": false, "side_sign": false, "corner_tower": false, "upper_story": false, "landscaping": true},
		3: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "corner_tower": false, "upper_story": false, "landscaping": true},
		4: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "corner_tower": true, "upper_story": false, "landscaping": true},
		5: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "corner_tower": true, "upper_story": true, "landscaping": true},
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
	if tool == "house":
		return HOUSE_MAX_TIER
	if tool == "restaurant":
		return RESTAURANT_MAX_TIER
	if tool in ["fire", "bank", "grocery", "corner_store"]:
		return SERVICE_MAX_TIER
	return MAX_TIER if is_upgradeable(tool) else 1


static func upgrade_cost(base_cost: int, tool: String, current_tier: int) -> int:
	if not is_upgradeable(tool):
		return -1
	var factors: Array = UPGRADE_COST_FACTORS.get(tool, [0.0, 0.60, 0.85, 1.10])
	var index: int = clamp(current_tier, 1, maxi(1, factors.size() - 1))
	var factor := float(factors[index])
	return maxi(1, int(round(float(base_cost) * factor)))


static func tier_yield(tool: String, tier: int) -> Dictionary:
	if not TOOL_YIELDS.has(tool):
		return {"population": 0, "jobs": 0, "cashflow": 0, "appeal": 0}
	var profile: Dictionary = TOOL_YIELDS[tool]
	var population_values: Array = profile["population"]
	var count := population_values.size()
	var index: int = clamp(tier, 1, count) - 1
	return {
		"population": int(population_values[index]),
		"jobs": int(profile["jobs"][index]),
		"cashflow": int(profile["cashflow"][index]),
		"appeal": int(profile["appeal"][index]),
	}


static func visual_profile(tool: String, tier: int) -> Dictionary:
	var tier_cap := max_tier(tool)
	var tier_labels := _tier_labels(tool)
	if not VISUAL_PROFILES.has(tool):
		var fallback_tier: int = clamp(tier, 1, tier_cap)
		return {
			"tier": fallback_tier,
			"detail_level": fallback_tier - 1,
			"tier_label": tier_labels[fallback_tier - 1],
		}
	var tier_profiles: Dictionary = VISUAL_PROFILES[tool]
	var clamped_tier: int = clamp(tier, 1, tier_cap)
	var profile: Dictionary = tier_profiles.get(clamped_tier, {})
	profile = profile.duplicate(true)
	profile["tier"] = clamped_tier
	profile["detail_level"] = clamped_tier - 1
	profile["tier_label"] = tier_labels[clamped_tier - 1]
	return profile


static func _tier_labels(tool: String) -> Array:
	if tool == "house":
		return HOUSE_TIER_LABELS
	if tool == "restaurant":
		return RESTAURANT_TIER_LABELS
	if tool in ["fire", "bank", "grocery", "corner_store"]:
		return SERVICE_TIER_LABELS
	return DEFAULT_TIER_LABELS
