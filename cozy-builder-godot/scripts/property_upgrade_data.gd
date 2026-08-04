extends RefCounted
class_name PropertyUpgradeData

const MAX_TIER := 5
const HOUSE_MAX_TIER := 5
const RESTAURANT_MAX_TIER := 5
const SERVICE_MAX_TIER := 5

const DEFAULT_TIER_LABELS := ["starter property", "community upgrade", "district destination", "regional landmark", "signature destination"]
const HOUSE_TIER_LABELS := ["starter home", "expanded home", "family residence", "luxury residence", "estate compound"]
const FIRE_TIER_LABELS := ["volunteer station", "dual-bay station", "district firehouse", "emergency command", "regional headquarters"]
const RESTAURANT_TIER_LABELS := ["local eatery", "destination restaurant", "full-service dining", "hospitality landmark", "flagship restaurant"]
const GROCERY_TIER_LABELS := ["neighborhood market", "full-service market", "department store", "market hall", "flagship marketplace"]
const BANK_TIER_LABELS := ["local branch", "full-service branch", "financial campus", "regional center", "bank headquarters"]
const CORNER_STORE_TIER_LABELS := ["neighborhood shop", "busy corner market", "service mart", "main-street landmark", "flagship emporium"]
const PARK_TIER_LABELS := ["pocket park", "family park", "community commons", "civic gardens", "grand destination park"]

const TIER_DESCRIPTIONS := {
	"house": [
		"A compact starter home.",
		"Adds a full covered porch and a much larger living footprint.",
		"Adds a garage wing and dedicated family rooms.",
		"Adds a conservatory pavilion and premium outdoor living.",
		"Completes an estate compound with a two-level carriage house.",
	],
	"fire": [
		"A compact neighborhood response station.",
		"Becomes a dual-bay station with a larger emergency apron.",
		"Adds a training tower, operations wing, and full district capability.",
		"Adds an upper command floor and emergency coordination plaza.",
		"Becomes a regional headquarters with communications mast and civic forecourt.",
	],
	"bank": [
		"A small neighborhood banking branch.",
		"Adds a protected grand entry and expanded customer hall.",
		"Adds a teller wing and a true multi-lane drive-through bank.",
		"Adds an upper financial-services floor and formal civic plaza.",
		"Becomes a headquarters campus with flagship atrium and landmark crown.",
	],
	"grocery": [
		"A practical milk-and-bread neighborhood market.",
		"Adds a broad produce arcade, cart vestibule, and larger storefront.",
		"Adds bakery, deli, and pickup departments in a new service wing.",
		"Adds a clerestory market hall, expanded parking, and covered pickup lanes.",
		"Becomes a flagship marketplace with two entrances and a landmark food hall.",
	],
	"restaurant": [
		"A small local dining room.",
		"Adds a major covered entry and furnished outdoor dining terrace.",
		"Adds a full dining wing, private room, and expanded guest capacity.",
		"Adds a professional kitchen wing, service court, and landmark frontage.",
		"Becomes a two-level flagship with roof terrace and event dining.",
	],
	"corner_store": [
		"A compact neighborhood convenience shop.",
		"Adds a wide weather canopy, cooler wall, and larger sales floor.",
		"Adds a delivery wing, fresh-food counter, and pickup services.",
		"Adds a landmark corner tower and expanded glass storefront.",
		"Becomes a two-level flagship emporium with an apartment loft and full forecourt.",
	],
	"park": [
		"A simple green pocket for the neighborhood.",
		"Adds a playground, looping paths, shade trees, and family seating.",
		"Adds a large community pavilion, picnic lawn, and event space.",
		"Adds a fountain plaza, formal gardens, and civic promenade.",
		"Becomes a destination park with a grand bandstand, pond, and illuminated gardens.",
	],
}

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
	"house": [0.0, 0.72, 1.10, 1.62, 2.30],
	"fire": [0.0, 0.68, 1.08, 1.58, 2.24],
	"bank": [0.0, 0.70, 1.12, 1.68, 2.38],
	"grocery": [0.0, 0.68, 1.08, 1.62, 2.28],
	"restaurant": [0.0, 0.66, 1.06, 1.60, 2.30],
	"corner_store": [0.0, 0.64, 1.02, 1.54, 2.20],
	"park": [0.0, 0.58, 0.94, 1.42, 2.04],
}

const TOOL_YIELDS := {
	"house": {
		"population": [14, 24, 38, 56, 82],
		"jobs": [0, 0, 0, 0, 0],
		"cashflow": [168, 292, 468, 706, 1040],
		"appeal": [6, 13, 23, 38, 60],
	},
	"fire": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [14, 24, 38, 56, 78],
		"cashflow": [-38, -48, -62, -80, -104],
		"appeal": [16, 34, 58, 88, 126],
	},
	"bank": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [18, 32, 50, 74, 104],
		"cashflow": [286, 520, 850, 1300, 1900],
		"appeal": [10, 20, 34, 54, 82],
	},
	"grocery": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [26, 44, 68, 98, 138],
		"cashflow": [278, 500, 820, 1260, 1840],
		"appeal": [10, 19, 32, 50, 76],
	},
	"restaurant": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [20, 36, 56, 84, 120],
		"cashflow": [246, 460, 760, 1180, 1740],
		"appeal": [12, 24, 40, 64, 96],
	},
	"corner_store": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [12, 22, 36, 54, 78],
		"cashflow": [178, 340, 570, 890, 1320],
		"appeal": [8, 16, 28, 44, 68],
	},
	"park": {
		"population": [0, 0, 0, 0, 0],
		"jobs": [0, 2, 5, 9, 14],
		"cashflow": [-8, -12, -18, -26, -38],
		"appeal": [28, 52, 82, 120, 168],
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
		3: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": false, "second_story": false, "landscaping": false},
		4: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": false, "second_story": true, "landscaping": false},
		5: {"front_hall": true, "bay_extend": true, "hose_tower": true, "parking_expand": true, "second_story": true, "civic_wing": true, "landscaping": false},
	},
	"bank": {
		1: {"front_hall": false, "side_wing": false, "plaza": false, "upper_story": false, "landscaping": false},
		2: {"front_hall": true, "side_wing": false, "plaza": false, "upper_story": false, "landscaping": false},
		3: {"front_hall": true, "side_wing": true, "plaza": false, "upper_story": false, "landscaping": false},
		4: {"front_hall": true, "side_wing": true, "plaza": false, "upper_story": true, "landscaping": false},
		5: {"front_hall": true, "side_wing": true, "plaza": true, "upper_story": true, "grand_hall": true, "landscaping": false},
	},
	"grocery": {
		1: {"customer_entry": true, "front_parking": true, "produce_display": true, "department_wing": false, "market_hall": false, "flagship": false},
		2: {"customer_entry": true, "front_parking": true, "covered_storefront": true, "cart_corral": true, "department_wing": false, "market_hall": false, "flagship": false},
		3: {"customer_entry": true, "front_parking": true, "covered_storefront": true, "cart_corral": true, "department_wing": true, "second_department": true, "market_hall": false, "flagship": false},
		4: {"customer_entry": true, "front_parking": true, "covered_storefront": true, "cart_corral": true, "department_wing": true, "second_department": true, "market_hall": true, "parking_lights": true, "flagship": false},
		5: {"customer_entry": true, "front_parking": true, "covered_storefront": true, "cart_corral": true, "department_wing": true, "second_department": true, "market_hall": true, "parking_lights": true, "entry_vestibule": true, "flagship": true},
	},
	"restaurant": {
		1: {"front_expansion": false, "dining_wing": false, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		2: {"front_expansion": true, "dining_wing": false, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		3: {"front_expansion": true, "dining_wing": true, "kitchen_wing": false, "signature_front": false, "second_floor": false},
		4: {"front_expansion": true, "dining_wing": true, "kitchen_wing": true, "signature_front": true, "second_floor": false},
		5: {"front_expansion": true, "dining_wing": true, "kitchen_wing": true, "signature_front": true, "second_floor": true, "parking_lot": true},
	},
	"corner_store": {
		1: {"corner_awning": false, "delivery_nook": false, "side_sign": false, "corner_tower": false, "upper_story": false, "parking_lot": false},
		2: {"corner_awning": true, "delivery_nook": false, "side_sign": false, "corner_tower": false, "upper_story": false, "parking_lot": false},
		3: {"corner_awning": true, "delivery_nook": true, "side_sign": false, "corner_tower": false, "upper_story": false, "parking_lot": false},
		4: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "corner_tower": true, "upper_story": false, "parking_lot": false},
		5: {"corner_awning": true, "delivery_nook": true, "side_sign": true, "corner_tower": true, "upper_story": true, "parking_lot": true},
	},
	"park": {
		1: {"extra_trees": false, "gazebo": false, "fountain": false, "paths": false},
		2: {"extra_trees": true, "gazebo": false, "fountain": false, "paths": true},
		3: {"extra_trees": true, "gazebo": true, "fountain": false, "paths": true},
		4: {"extra_trees": true, "gazebo": true, "fountain": true, "paths": true},
		5: {"extra_trees": true, "gazebo": true, "fountain": true, "paths": true, "bandstand": true, "pond": true, "illuminated": true},
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
	if tool == "fire":
		return FIRE_TIER_LABELS
	if tool == "grocery":
		return GROCERY_TIER_LABELS
	if tool == "bank":
		return BANK_TIER_LABELS
	if tool == "corner_store":
		return CORNER_STORE_TIER_LABELS
	if tool == "park":
		return PARK_TIER_LABELS
	return DEFAULT_TIER_LABELS


static func tier_label(tool: String, tier: int) -> String:
	var labels := _tier_labels(tool)
	if labels.is_empty():
		return "tier %d" % tier
	return str(labels[clamp(tier, 1, labels.size()) - 1])


static func tier_description(tool: String, tier: int) -> String:
	var descriptions: Array = TIER_DESCRIPTIONS.get(tool, [])
	if descriptions.is_empty():
		return "A major property expansion."
	return str(descriptions[clamp(tier, 1, descriptions.size()) - 1])
