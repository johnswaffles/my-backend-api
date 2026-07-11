extends Node3D

const GRID_SIZE := 64
const TILE_SIZE := 1.0
const PAN_SPEED := 0.018
const STARTING_MONEY := 500000
const DEFAULT_ZOOM := 17.4
const MIN_ZOOM := 6.0
const MAX_ZOOM := 38.0
const BUILD_TOOL_ROAD := "road"
const BUILD_TOOL_HOUSE := "house"
const BUILD_TOOL_FIRE := "fire"
const BUILD_TOOL_BANK := "bank"
const BUILD_TOOL_GROCERY := "grocery"
const BUILD_TOOL_RESTAURANT := "restaurant"
const BUILD_TOOL_CORNER_STORE := "corner_store"
const BUILD_TOOL_PARK := "park"
const BUILD_TOOL_POND_SMALL := "pond_small"
const BUILD_TOOL_POND_MEDIUM := "pond_medium"
const BUILD_TOOL_POND_LARGE := "pond_large"
const BUILD_TOOL_FOREST_SMALL := "forest_small"
const BUILD_TOOL_FOREST_MEDIUM := "forest_medium"
const BUILD_TOOL_FOREST_LARGE := "forest_large"
const BUILD_TOOL_INSPECT := "inspect"
const BUILD_TOOL_BULLDOZE := "bulldoze"
const BUILD_TOOL_SEQUENCE := [
	BUILD_TOOL_ROAD,
	BUILD_TOOL_HOUSE,
	BUILD_TOOL_FIRE,
	BUILD_TOOL_BANK,
	BUILD_TOOL_GROCERY,
	BUILD_TOOL_RESTAURANT,
	BUILD_TOOL_CORNER_STORE,
	BUILD_TOOL_PARK,
	BUILD_TOOL_POND_SMALL,
	BUILD_TOOL_POND_MEDIUM,
	BUILD_TOOL_POND_LARGE,
	BUILD_TOOL_FOREST_SMALL,
	BUILD_TOOL_FOREST_MEDIUM,
	BUILD_TOOL_FOREST_LARGE,
	BUILD_TOOL_INSPECT,
	BUILD_TOOL_BULLDOZE,
]
const BUILD_TOOL_LABELS := {
	BUILD_TOOL_ROAD: "Road",
	BUILD_TOOL_HOUSE: "House",
	BUILD_TOOL_FIRE: "Fire",
	BUILD_TOOL_BANK: "Bank",
	BUILD_TOOL_GROCERY: "Grocery",
	BUILD_TOOL_RESTAURANT: "Restaurant",
	BUILD_TOOL_CORNER_STORE: "Corner Store",
	BUILD_TOOL_PARK: "Park",
	BUILD_TOOL_POND_SMALL: "Small Pond",
	BUILD_TOOL_POND_MEDIUM: "Medium Pond",
	BUILD_TOOL_POND_LARGE: "Large Lake",
	BUILD_TOOL_FOREST_SMALL: "Small Forest",
	BUILD_TOOL_FOREST_MEDIUM: "Medium Forest",
	BUILD_TOOL_FOREST_LARGE: "Large Forest",
	BUILD_TOOL_INSPECT: "Inspect",
	BUILD_TOOL_BULLDOZE: "Bulldoze",
}
const BUILD_TOOL_COSTS := {
	BUILD_TOOL_ROAD: 20,
	BUILD_TOOL_HOUSE: 700,
	BUILD_TOOL_FIRE: 2600,
	BUILD_TOOL_BANK: 1900,
	BUILD_TOOL_GROCERY: 1650,
	BUILD_TOOL_RESTAURANT: 1500,
	BUILD_TOOL_CORNER_STORE: 1200,
	BUILD_TOOL_PARK: 500,
	BUILD_TOOL_POND_SMALL: 260,
	BUILD_TOOL_POND_MEDIUM: 420,
	BUILD_TOOL_POND_LARGE: 640,
	BUILD_TOOL_FOREST_SMALL: 240,
	BUILD_TOOL_FOREST_MEDIUM: 380,
	BUILD_TOOL_FOREST_LARGE: 560,
}
const FRONTAGE_ROTATIONS := {
	"south": 0.0,
	"north": PI,
	"east": PI * 0.5,
	"west": -PI * 0.5,
}
const BUILDING_FRONT_ROTATION_OFFSETS := {
	BUILD_TOOL_HOUSE: 0.0,
	BUILD_TOOL_FIRE: 0.0,
	BUILD_TOOL_BANK: 0.0,
	BUILD_TOOL_GROCERY: 0.0,
	BUILD_TOOL_RESTAURANT: 0.0,
	BUILD_TOOL_CORNER_STORE: 0.0,
}
const BUILDING_MAX_TIERS := {
	BUILD_TOOL_HOUSE: 5,
	BUILD_TOOL_FIRE: 5,
	BUILD_TOOL_BANK: 5,
	BUILD_TOOL_GROCERY: 5,
	BUILD_TOOL_RESTAURANT: 5,
	BUILD_TOOL_CORNER_STORE: 5,
	BUILD_TOOL_PARK: 4,
}
const SCENIC_TOOL_SPECS := {
	BUILD_TOOL_POND_SMALL: {"label": "Small Pond", "footprint": Vector2i(7, 6), "kind": "pond", "water_size": Vector2(5.5, 4.8), "shore_size": Vector2(6.5, 5.6), "cost": 260, "appeal": 10},
	BUILD_TOOL_POND_MEDIUM: {"label": "Medium Pond", "footprint": Vector2i(9, 8), "kind": "pond", "water_size": Vector2(7.7, 6.7), "shore_size": Vector2(8.7, 7.7), "cost": 420, "appeal": 16},
	BUILD_TOOL_POND_LARGE: {"label": "Large Lake", "footprint": Vector2i(12, 10), "kind": "pond", "water_size": Vector2(10.2, 8.8), "shore_size": Vector2(11.3, 9.8), "cost": 640, "appeal": 26},
	BUILD_TOOL_FOREST_SMALL: {"label": "Small Forest", "footprint": Vector2i(4, 4), "kind": "forest", "tree_count": 6, "cost": 240, "appeal": 8},
	BUILD_TOOL_FOREST_MEDIUM: {"label": "Medium Forest", "footprint": Vector2i(5, 5), "kind": "forest", "tree_count": 10, "cost": 380, "appeal": 12},
	BUILD_TOOL_FOREST_LARGE: {"label": "Large Forest", "footprint": Vector2i(6, 6), "kind": "forest", "tree_count": 15, "cost": 560, "appeal": 18},
}
const SAVE_PATH := "user://cozy_builder_save.json"
const MUSIC_STREAM_PATH := "res://assets/audio/Sunrise Over Tiny Blocks (2).mp3"
const AMBIENT_LIGHT_PRESETS := [
	{"label": "Daylight 100%", "scale": 1.0},
	{"label": "Daylight 80%", "scale": 0.8},
	{"label": "Daylight 60%", "scale": 0.6},
	{"label": "Daylight 40%", "scale": 0.4},
	{"label": "Daylight 20%", "scale": 0.2},
	{"label": "Night 10%", "scale": 0.1},
	{"label": "Deep Night 0%", "scale": 0.0},
]
const PROPERTY_FRONT_SETBACK := 1.0
const PROPERTY_FRONT_SETBACK_BY_TOOL := {
	BUILD_TOOL_HOUSE: 0.95,
	BUILD_TOOL_FIRE: 1.34,
	BUILD_TOOL_BANK: 1.3,
	BUILD_TOOL_GROCERY: 1.28,
	BUILD_TOOL_RESTAURANT: 1.26,
	BUILD_TOOL_CORNER_STORE: 1.24,
}
const PROPERTY_LOT_SETBACK_BY_TOOL := {
	BUILD_TOOL_HOUSE: 0.58,
	BUILD_TOOL_FIRE: 0.86,
	BUILD_TOOL_BANK: 0.84,
	BUILD_TOOL_GROCERY: 0.82,
	BUILD_TOOL_RESTAURANT: 0.8,
	BUILD_TOOL_CORNER_STORE: 0.78,
}
const PROPERTY_BUFFER_BY_TOOL := {
	BUILD_TOOL_HOUSE: 1,
	BUILD_TOOL_FIRE: 1,
	BUILD_TOOL_BANK: 1,
	BUILD_TOOL_GROCERY: 1,
	BUILD_TOOL_RESTAURANT: 1,
	BUILD_TOOL_CORNER_STORE: 1,
	BUILD_TOOL_PARK: 1,
}
const ROAD_WIDTH := 2.08
const CURB_WIDTH := 0.16
const SIDEWALK_WIDTH := 1.08
const FRONT_BUFFER := 0.32
const PARKING_DEPTH := 1.22
const BUILDING_SETBACK := 0.72
const BACK_BUFFER := 0.64
const LOT_DEPTH := 4.6
const LOT_FRONT_SIDEWALK_Z := 2.04
const LOT_PARKING_Z := 0.84
const PROPERTY_VISUAL_PRESETS := {
	BUILD_TOOL_HOUSE: {
		"display_name": "House",
		"roof_color": "b96a4d",
		"wall_color": "f4e3cf",
		"trim_color": "fff4df",
		"accent_color": "e1b672",
		"lot_type": "residential",
		"lot_color": "8da56b",
		"lot_size": Vector2(5.9, LOT_DEPTH + 1.34),
		"building_z_offset": -BUILDING_SETBACK * 1.05,
		"parking": "driveway",
		"sidewalk": {"width": 0.84, "z": LOT_FRONT_SIDEWALK_Z + 0.34, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 5.6, "depth": LOT_DEPTH + 0.84},
		"props": ["fence", "bushes", "porch_light", "mailbox"],
	},
	BUILD_TOOL_FIRE: {
		"display_name": "Fire Dept.",
		"roof_color": "34383d",
		"wall_color": "c94f45",
		"trim_color": "fff4df",
		"accent_color": "f1d072",
		"lot_type": "civic",
		"lot_color": "c9c7b2",
		"lot_size": Vector2(5.24, LOT_DEPTH + 0.2),
		"building_z_offset": -BUILDING_SETBACK * 0.82,
		"parking": "front_apron",
		"parking_position": Vector3(0.0, 0.0, LOT_PARKING_Z + 0.08),
		"parking_size": Vector3(4.08, 1.0, PARKING_DEPTH + 0.16),
		"parking_spaces": 3,
		"sidewalk": {"width": 1.18, "z": LOT_FRONT_SIDEWALK_Z, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 4.96, "depth": LOT_DEPTH - 0.18},
		"props": ["garage_door", "bollards", "flag", "fire_sign"],
	},
	BUILD_TOOL_BANK: {
		"display_name": "Bank",
		"roof_color": "557da1",
		"wall_color": "dfe8ef",
		"trim_color": "f6f1e6",
		"accent_color": "f1c85f",
		"lot_type": "commercial",
		"lot_color": "d9d2bf",
		"lot_size": Vector2(4.8, LOT_DEPTH - 0.08),
		"building_z_offset": -BUILDING_SETBACK * 1.34,
		"parking": "small_lot",
		"parking_position": Vector3(0.0, 0.0, LOT_PARKING_Z),
		"parking_size": Vector3(3.78, 1.0, PARKING_DEPTH),
		"parking_spaces": 4,
		"sidewalk": {"width": 1.0, "z": LOT_FRONT_SIDEWALK_Z - 0.04, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 4.46, "depth": LOT_DEPTH - 0.44},
		"props": ["columns", "atm", "security_light", "handicap_space"],
	},
	BUILD_TOOL_GROCERY: {
		"display_name": "Grocery",
		"roof_color": "6faf5f",
		"wall_color": "f2e8d8",
		"trim_color": "fff4df",
		"accent_color": "76d263",
		"lot_type": "commercial",
		"lot_color": "d5d1bc",
		"lot_size": Vector2(5.44, LOT_DEPTH + 0.18),
		"building_z_offset": -BUILDING_SETBACK * 1.18,
		"parking": "medium_lot",
		"parking_position": Vector3(0.0, 0.0, LOT_PARKING_Z + 0.08),
		"parking_size": Vector3(4.58, 1.0, PARKING_DEPTH + 0.06),
		"parking_spaces": 5,
		"sidewalk": {"width": 1.28, "z": LOT_FRONT_SIDEWALK_Z + 0.02, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 5.1, "depth": LOT_DEPTH - 0.1},
		"props": ["cart_rack", "produce_crates", "large_sign", "handicap_space"],
	},
	BUILD_TOOL_RESTAURANT: {
		"display_name": "Restaurant",
		"roof_color": "c96b5f",
		"wall_color": "f7d9bf",
		"trim_color": "fff4df",
		"accent_color": "ffc064",
		"lot_type": "commercial",
		"lot_color": "d9d0b9",
		"lot_size": Vector2(4.58, LOT_DEPTH - 0.36),
		"building_z_offset": -BUILDING_SETBACK * 1.12,
		"parking": "small_lot",
		"parking_position": Vector3(0.24, 0.0, LOT_PARKING_Z),
		"parking_size": Vector3(3.36, 1.0, PARKING_DEPTH - 0.16),
		"parking_spaces": 3,
		"sidewalk": {"width": 1.02, "z": LOT_FRONT_SIDEWALK_Z - 0.08, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 4.18, "depth": LOT_DEPTH - 0.72},
		"props": ["awning", "outdoor_tables", "planters", "menu_board"],
	},
	BUILD_TOOL_CORNER_STORE: {
		"display_name": "Corner Store",
		"roof_color": "557da1",
		"wall_color": "f2e8d8",
		"trim_color": "fff4df",
		"accent_color": "86b4f4",
		"lot_type": "commercial",
		"lot_color": "d5cfbc",
		"lot_size": Vector2(4.64, LOT_DEPTH - 0.24),
		"building_z_offset": -BUILDING_SETBACK * 1.42,
		"parking": "compact_lot",
		"parking_position": Vector3(0.52, 0.0, LOT_PARKING_Z - 0.02),
		"parking_size": Vector3(3.04, 1.0, PARKING_DEPTH - 0.08),
		"parking_spaces": 3,
		"sidewalk": {"width": 0.9, "z": LOT_FRONT_SIDEWALK_Z - 0.08, "depth": SIDEWALK_WIDTH},
		"hedges": {"width": 4.24, "depth": LOT_DEPTH - 0.6},
		"props": ["trash_can", "cooler_box", "neon_sign", "newspaper_box"],
	},
}
const COMMERCIAL_VISUAL_PRESETS := {
	BUILD_TOOL_FIRE: {"identity": "civic", "sign": "fire", "parking": "front_apron", "mood": "bold"},
	BUILD_TOOL_BANK: {"identity": "formal", "sign": "bank", "parking": "small_lot", "mood": "prestige"},
	BUILD_TOOL_GROCERY: {"identity": "market", "sign": "grocer", "parking": "medium_lot", "mood": "fresh"},
	BUILD_TOOL_RESTAURANT: {"identity": "hospitality", "sign": "restaurant", "parking": "small_lot", "mood": "warm"},
	BUILD_TOOL_CORNER_STORE: {"identity": "convenience", "sign": "quick_mart", "parking": "compact_lot", "mood": "bright"},
}
const PROPERTY_VARIANTS := {
	BUILD_TOOL_HOUSE: {
		"suburban_cottage": {"variant_name": "Suburban Cottage", "style_notes": "warm gabled cottage, porch focus, cozy yard", "tiers": {1: {"massing": "compact"}, 2: {"massing": "front entry"}, 3: {"massing": "side annex"}, 4: {"massing": "two story"}}},
		"modern_boxy_house": {"variant_name": "Modern Boxy House", "style_notes": "flat roof, clean lines, wide glass, simple driveway", "tiers": {1: {"massing": "single box"}, 2: {"massing": "front canopy"}, 3: {"massing": "garage wing"}, 4: {"massing": "upper box"}}},
		"farmhouse_style": {"variant_name": "Farmhouse Style", "style_notes": "broader roof, porch rail, rustic trim, garden edges", "tiers": {1: {"massing": "small farmhouse"}, 2: {"massing": "porch"}, 3: {"massing": "side room"}, 4: {"massing": "full farmhouse"}}},
		"compact_townhome": {"variant_name": "Compact Townhome", "style_notes": "narrow taller body, tidy stoop, vertical windows", "tiers": {1: {"massing": "narrow base"}, 2: {"massing": "stoop"}, 3: {"massing": "rear depth"}, 4: {"massing": "tall flagship"}}},
	},
	BUILD_TOOL_FIRE: {
		"classic_brick_station": {"variant_name": "Classic Brick Station", "style_notes": "brick civic face, garage bay rhythm, flag and bollards", "wall_color": "c94f45", "roof_color": "34383d", "trim_color": "fff4df", "accent_color": "f1d072", "tiers": {
			1: {"width": 2.58, "depth": 1.72, "height": 1.04, "center_z": -0.64, "front_z": 0.28, "bays": 1, "upper": false, "tower": false, "wing": 0, "signature": false, "roof": "flat"},
			2: {"width": 3.14, "depth": 1.92, "height": 1.14, "center_z": -0.66, "front_z": 0.36, "bays": 2, "upper": false, "tower": false, "wing": 1, "signature": false, "roof": "flat"},
			3: {"width": 3.54, "depth": 2.14, "height": 1.26, "center_z": -0.72, "front_z": 0.42, "bays": 2, "upper": false, "tower": true, "wing": 2, "signature": true, "roof": "flat"},
			4: {"width": 3.92, "depth": 2.32, "height": 1.38, "center_z": -0.78, "front_z": 0.48, "bays": 3, "upper": true, "tower": true, "wing": 2, "signature": true, "roof": "flat"},
		}},
		"modern_civic_station": {"variant_name": "Modern Civic Station", "style_notes": "flat modern mass, large glass, clean emergency apron", "wall_color": "d85c4e", "roof_color": "3e4248", "trim_color": "edf4f4", "accent_color": "8ec5df", "tiers": {
			1: {"width": 2.72, "depth": 1.66, "height": 1.0, "center_z": -0.62, "front_z": 0.28, "bays": 1, "upper": false, "tower": false, "wing": 0, "signature": false, "roof": "flat", "glass": true},
			2: {"width": 3.24, "depth": 1.86, "height": 1.12, "center_z": -0.66, "front_z": 0.34, "bays": 2, "upper": false, "tower": false, "wing": 1, "signature": false, "roof": "flat", "glass": true},
			3: {"width": 3.62, "depth": 2.04, "height": 1.22, "center_z": -0.72, "front_z": 0.4, "bays": 2, "upper": true, "tower": false, "wing": 1, "signature": true, "roof": "flat", "glass": true},
			4: {"width": 4.06, "depth": 2.24, "height": 1.34, "center_z": -0.8, "front_z": 0.46, "bays": 3, "upper": true, "tower": true, "wing": 2, "signature": true, "roof": "flat", "glass": true},
		}},
		"volunteer_station": {"variant_name": "Small-Town Volunteer Station", "style_notes": "friendly small-town station, pitched roof, single bay identity", "wall_color": "bd443f", "roof_color": "4b4542", "trim_color": "fff4df", "accent_color": "ffb35f", "tiers": {
			1: {"width": 2.38, "depth": 1.62, "height": 0.96, "center_z": -0.58, "front_z": 0.24, "bays": 1, "upper": false, "tower": false, "wing": 0, "signature": false, "roof": "gabled"},
			2: {"width": 2.86, "depth": 1.84, "height": 1.05, "center_z": -0.62, "front_z": 0.3, "bays": 1, "upper": false, "tower": false, "wing": 1, "signature": false, "roof": "gabled"},
			3: {"width": 3.18, "depth": 2.02, "height": 1.14, "center_z": -0.7, "front_z": 0.36, "bays": 2, "upper": false, "tower": true, "wing": 1, "signature": true, "roof": "gabled"},
			4: {"width": 3.52, "depth": 2.16, "height": 1.22, "center_z": -0.76, "front_z": 0.42, "bays": 2, "upper": true, "tower": true, "wing": 2, "signature": true, "roof": "gabled"},
		}},
		"industrial_emergency_station": {"variant_name": "Industrial Emergency Station", "style_notes": "wide apparatus bays, tower mass, rugged service wings", "wall_color": "b93f3a", "roof_color": "30353a", "trim_color": "e9ece8", "accent_color": "f6e7c8", "tiers": {
			1: {"width": 2.92, "depth": 1.82, "height": 1.08, "center_z": -0.66, "front_z": 0.32, "bays": 2, "upper": false, "tower": false, "wing": 0, "signature": false, "roof": "flat"},
			2: {"width": 3.44, "depth": 2.02, "height": 1.18, "center_z": -0.7, "front_z": 0.38, "bays": 2, "upper": false, "tower": true, "wing": 1, "signature": false, "roof": "flat"},
			3: {"width": 3.86, "depth": 2.26, "height": 1.32, "center_z": -0.78, "front_z": 0.44, "bays": 3, "upper": false, "tower": true, "wing": 2, "signature": true, "roof": "flat"},
			4: {"width": 4.22, "depth": 2.46, "height": 1.48, "center_z": -0.84, "front_z": 0.5, "bays": 3, "upper": true, "tower": true, "wing": 3, "signature": true, "roof": "flat"},
		}},
	},
	BUILD_TOOL_BANK: {
		"traditional_column_bank": {
			"variant_name": "Traditional Column Bank",
			"style_notes": "formal columns, symmetrical facade, stone trim",
			"wall_color": "dfe8ef",
			"roof_color": "557da1",
			"trim_color": "f6f1e6",
			"accent_color": "f1c85f",
			"parking_style": "formal_forecourt",
			"tiers": {
				1: {"width": 2.46, "depth": 1.54, "height": 1.0, "center_z": -0.58, "front_z": 0.24, "columns": 3, "roof": "flat", "glass": false, "upper": false, "wing": 0, "signature": false},
				2: {"width": 2.94, "depth": 1.76, "height": 1.1, "center_z": -0.62, "front_z": 0.32, "columns": 4, "roof": "flat", "glass": false, "upper": false, "wing": 1, "signature": false},
				3: {"width": 3.34, "depth": 1.98, "height": 1.22, "center_z": -0.7, "front_z": 0.38, "columns": 5, "roof": "flat", "glass": false, "upper": false, "wing": 2, "signature": true},
				4: {"width": 3.86, "depth": 2.22, "height": 1.38, "center_z": -0.82, "front_z": 0.44, "columns": 6, "roof": "flat", "glass": true, "upper": true, "wing": 2, "signature": true},
			},
		},
		"modern_glass_bank": {
			"variant_name": "Modern Glass Bank",
			"style_notes": "glass front, flat roof, offset tower, blue-gray palette",
			"wall_color": "d8e3ea",
			"roof_color": "3f6078",
			"trim_color": "eef6f7",
			"accent_color": "8ec5df",
			"parking_style": "sleek_asphalt",
			"tiers": {
				1: {"width": 2.4, "depth": 1.5, "height": 0.96, "center_z": -0.58, "front_z": 0.24, "columns": 0, "roof": "flat", "glass": true, "upper": false, "wing": 0, "signature": false},
				2: {"width": 2.92, "depth": 1.78, "height": 1.06, "center_z": -0.64, "front_z": 0.32, "columns": 0, "roof": "flat", "glass": true, "upper": false, "wing": 1, "signature": false},
				3: {"width": 3.34, "depth": 2.02, "height": 1.16, "center_z": -0.72, "front_z": 0.38, "columns": 0, "roof": "flat", "glass": true, "upper": false, "wing": 2, "signature": true},
				4: {"width": 3.78, "depth": 2.18, "height": 1.26, "center_z": -0.8, "front_z": 0.44, "columns": 0, "roof": "flat", "glass": true, "upper": true, "wing": 2, "signature": true},
			},
		},
		"small_town_brick_bank": {
			"variant_name": "Small-Town Brick Bank",
			"style_notes": "brick facade, pitched roof, old downtown branch character",
			"wall_color": "b96b58",
			"roof_color": "53616e",
			"trim_color": "f4dfc5",
			"accent_color": "d8b35a",
			"parking_style": "brick_branch",
			"tiers": {
				1: {"width": 2.34, "depth": 1.48, "height": 0.96, "center_z": -0.58, "front_z": 0.22, "columns": 0, "roof": "gabled", "glass": false, "upper": false, "wing": 0, "signature": false},
				2: {"width": 2.82, "depth": 1.72, "height": 1.06, "center_z": -0.64, "front_z": 0.3, "columns": 0, "roof": "gabled", "glass": false, "upper": false, "wing": 1, "signature": false},
				3: {"width": 3.18, "depth": 1.94, "height": 1.16, "center_z": -0.72, "front_z": 0.36, "columns": 0, "roof": "gabled", "glass": false, "upper": false, "wing": 2, "signature": true},
				4: {"width": 3.52, "depth": 2.08, "height": 1.28, "center_z": -0.78, "front_z": 0.42, "columns": 0, "roof": "gabled", "glass": true, "upper": true, "wing": 2, "signature": true},
			},
		},
		"premium_financial_center": {
			"variant_name": "Premium Financial Center",
			"style_notes": "prestige flagship, layered glass, premium landscaping, formal entry",
			"wall_color": "e9edf0",
			"roof_color": "6c7f90",
			"trim_color": "ffffff",
			"accent_color": "d9b76a",
			"parking_style": "premium_landscaped",
			"tiers": {
				1: {"width": 2.58, "depth": 1.6, "height": 1.04, "center_z": -0.6, "front_z": 0.26, "columns": 2, "roof": "flat", "glass": true, "upper": false, "wing": 0, "signature": false},
				2: {"width": 3.06, "depth": 1.84, "height": 1.14, "center_z": -0.66, "front_z": 0.34, "columns": 2, "roof": "flat", "glass": true, "upper": false, "wing": 1, "signature": false},
				3: {"width": 3.48, "depth": 2.06, "height": 1.24, "center_z": -0.74, "front_z": 0.4, "columns": 4, "roof": "flat", "glass": true, "upper": true, "wing": 1, "signature": true},
				4: {"width": 3.96, "depth": 2.28, "height": 1.38, "center_z": -0.84, "front_z": 0.46, "columns": 4, "roof": "flat", "glass": true, "upper": true, "wing": 2, "signature": true},
			},
		},
	},
	BUILD_TOOL_GROCERY: {
		"local_market": {"variant_name": "Local Market", "style_notes": "small neighborhood market, warm storefront, simple sign", "wall_color": "f2e8d8", "roof_color": "6faf5f", "trim_color": "fff4df", "accent_color": "ffd067", "tiers": {
			1: {"width": 2.66, "depth": 1.62, "height": 0.94, "center_z": -0.62, "front_z": 0.2, "wing": 0, "glass": false, "signature": false, "roof": "gabled", "awning": "round"},
			2: {"width": 3.06, "depth": 1.84, "height": 1.02, "center_z": -0.68, "front_z": 0.28, "wing": 0, "glass": false, "signature": false, "roof": "gabled", "awning": "round"},
			3: {"width": 3.42, "depth": 2.04, "height": 1.1, "center_z": -0.76, "front_z": 0.34, "wing": 1, "glass": true, "signature": true, "roof": "gabled", "awning": "round"},
			4: {"width": 3.72, "depth": 2.2, "height": 1.18, "center_z": -0.82, "front_z": 0.4, "wing": 2, "glass": true, "signature": true, "roof": "gabled", "awning": "round"},
		}},
		"green_supermarket": {"variant_name": "Green Supermarket", "style_notes": "green branded market, broad glass front, cart area", "wall_color": "e8ecd8", "roof_color": "5c9c52", "trim_color": "fff4df", "accent_color": "76d263", "tiers": {
			1: {"width": 2.86, "depth": 1.7, "height": 0.96, "center_z": -0.66, "front_z": 0.22, "wing": 0, "glass": true, "signature": false, "roof": "flat", "awning": "round"},
			2: {"width": 3.34, "depth": 1.96, "height": 1.06, "center_z": -0.72, "front_z": 0.3, "wing": 1, "glass": true, "signature": false, "roof": "flat", "awning": "round"},
			3: {"width": 3.78, "depth": 2.18, "height": 1.16, "center_z": -0.78, "front_z": 0.36, "wing": 2, "glass": true, "signature": true, "roof": "flat", "awning": "round"},
			4: {"width": 4.24, "depth": 2.48, "height": 1.34, "center_z": -0.88, "front_z": 0.46, "wing": 2, "glass": true, "signature": true, "roof": "flat", "awning": "round"},
		}},
		"warehouse_grocery": {"variant_name": "Warehouse-Style Grocery", "style_notes": "wide practical mass, flat roof, service loading feel", "wall_color": "e3ddca", "roof_color": "668f53", "trim_color": "e8ddcc", "accent_color": "7cc6e4", "tiers": {
			1: {"width": 3.02, "depth": 1.76, "height": 0.92, "center_z": -0.68, "front_z": 0.22, "wing": 0, "glass": false, "signature": false, "roof": "shed", "awning": "bold"},
			2: {"width": 3.52, "depth": 2.04, "height": 1.02, "center_z": -0.74, "front_z": 0.3, "wing": 1, "glass": false, "signature": false, "roof": "shed", "awning": "bold"},
			3: {"width": 3.96, "depth": 2.32, "height": 1.12, "center_z": -0.82, "front_z": 0.38, "wing": 2, "glass": true, "signature": true, "roof": "shed", "awning": "bold"},
			4: {"width": 4.32, "depth": 2.58, "height": 1.24, "center_z": -0.9, "front_z": 0.46, "wing": 3, "glass": true, "signature": true, "roof": "shed", "awning": "bold"},
		}},
		"organic_market": {"variant_name": "Organic Market", "style_notes": "wood accents, produce display, softer natural palette", "wall_color": "f6ecd5", "roof_color": "74a66a", "trim_color": "ead7b8", "accent_color": "5fae54", "tiers": {
			1: {"width": 2.72, "depth": 1.66, "height": 0.94, "center_z": -0.62, "front_z": 0.22, "wing": 0, "glass": false, "signature": false, "roof": "gabled", "awning": "stripe"},
			2: {"width": 3.16, "depth": 1.9, "height": 1.04, "center_z": -0.7, "front_z": 0.3, "wing": 1, "glass": true, "signature": false, "roof": "gabled", "awning": "stripe"},
			3: {"width": 3.56, "depth": 2.14, "height": 1.14, "center_z": -0.78, "front_z": 0.38, "wing": 1, "glass": true, "signature": true, "roof": "gabled", "awning": "stripe"},
			4: {"width": 3.9, "depth": 2.34, "height": 1.24, "center_z": -0.84, "front_z": 0.44, "wing": 2, "glass": true, "signature": true, "roof": "gabled", "awning": "stripe"},
		}},
	},
	BUILD_TOOL_RESTAURANT: {
		"classic_diner": {"variant_name": "Classic Diner", "style_notes": "low wide roadside diner family with trailer proportions, front parking strip, neon pylon, and horizontal glass", "wall_color": "f8dcc8", "roof_color": "c96058", "trim_color": "fff4df", "accent_color": "ffc45f", "tiers": {
			1: {"width": 4.24, "depth": 0.74, "height": 0.52, "center_z": -0.46, "front_z": 0.34, "roof": "diner_capsule", "service_loop": false, "signature": false},
			2: {"width": 4.58, "depth": 0.78, "height": 0.56, "center_z": -0.48, "front_z": 0.36, "roof": "diner_capsule", "service_loop": true, "signature": false},
			3: {"width": 4.92, "depth": 0.82, "height": 0.6, "center_z": -0.5, "front_z": 0.38, "roof": "diner_capsule", "service_loop": true, "signature": true},
			4: {"width": 5.2, "depth": 0.86, "height": 0.64, "center_z": -0.52, "front_z": 0.4, "roof": "diner_capsule", "service_loop": true, "signature": true, "corner_patio": true},
		}},
			"fast_food_drive_through": {"variant_name": "Fast Food Drive-Through", "style_notes": "compact square kitchen core, tall branded sign tower, pickup window, and intentional side/back drive-through loop", "wall_color": "f5dfc4", "roof_color": "d85b4d", "trim_color": "fff4df", "accent_color": "ffd24e", "tiers": {
				1: {"width": 1.58, "depth": 1.42, "height": 1.08, "center_z": -0.9, "front_z": 0.12, "roof": "flat", "drive_through": true, "drive_lanes": 1, "tower": true},
				2: {"width": 1.78, "depth": 1.58, "height": 1.18, "center_z": -0.96, "front_z": 0.12, "roof": "flat", "drive_through": true, "drive_lanes": 1, "tower": true},
				3: {"width": 1.98, "depth": 1.76, "height": 1.3, "center_z": -1.04, "front_z": 0.14, "roof": "flat", "drive_through": true, "drive_lanes": 2, "tower": true, "signature": true},
				4: {"width": 2.18, "depth": 1.92, "height": 1.42, "center_z": -1.12, "front_z": 0.16, "roof": "flat", "drive_through": true, "drive_lanes": 2, "tower": true, "signature": true},
			}},
			"modern_cafe": {"variant_name": "Modern Cafe", "style_notes": "small asymmetrical glass pavilion with patio-first lot, planters, umbrellas, and optional roof deck", "wall_color": "efe4d2", "roof_color": "5f8990", "trim_color": "fff4df", "accent_color": "6ed0b5", "tiers": {
				1: {"width": 1.52, "depth": 1.18, "height": 0.88, "center_z": -0.72, "front_z": 0.18, "roof": "flat_modern", "glass": true, "patio": true, "rooftop": false},
				2: {"width": 1.72, "depth": 1.3, "height": 0.94, "center_z": -0.76, "front_z": 0.2, "roof": "flat_modern", "glass": true, "patio": true, "rooftop": false},
				3: {"width": 1.92, "depth": 1.44, "height": 1.02, "center_z": -0.82, "front_z": 0.22, "roof": "flat_modern", "glass": true, "patio": true, "rooftop": false, "signature": true},
				4: {"width": 2.12, "depth": 1.58, "height": 1.08, "center_z": -0.88, "front_z": 0.24, "roof": "flat_modern", "glass": true, "patio": true, "rooftop": true, "signature": true},
			}},
			"family_restaurant": {"variant_name": "Family Restaurant", "style_notes": "broad suburban sit-down restaurant family with centered entry, dining wings, layered roofline, and larger parking field", "wall_color": "f0dac0", "roof_color": "b85b4f", "trim_color": "fff4df", "accent_color": "f1ac5f", "tiers": {
				1: {"width": 3.42, "depth": 1.7, "height": 0.88, "center_z": -0.82, "front_z": 0.28, "roof": "compound_gabled", "wing": 0, "entry_bay": true},
				2: {"width": 3.86, "depth": 1.92, "height": 0.96, "center_z": -0.9, "front_z": 0.32, "roof": "compound_gabled", "wing": 1, "entry_bay": true},
				3: {"width": 4.32, "depth": 2.12, "height": 1.04, "center_z": -1.0, "front_z": 0.36, "roof": "compound_gabled", "wing": 2, "entry_bay": true, "signature": true},
				4: {"width": 4.74, "depth": 2.3, "height": 1.12, "center_z": -1.08, "front_z": 0.4, "roof": "compound_gabled", "wing": 2, "entry_bay": true, "signature": true, "upper": true},
			}},
		"upscale_restaurant": {"variant_name": "Upscale Restaurant", "style_notes": "premium layered facade, valet court, elegant patio, accent lighting", "wall_color": "e7d8ca", "roof_color": "8c5d52", "trim_color": "fff0d8", "accent_color": "ef8170", "tiers": {
			1: {"width": 2.5, "depth": 1.9, "height": 1.16, "center_z": -0.86, "front_z": 0.22, "roof": "layered_flat", "patio": true, "layered": true},
			2: {"width": 2.96, "depth": 2.18, "height": 1.3, "center_z": -0.98, "front_z": 0.26, "roof": "layered_flat", "patio": true, "layered": true, "wing": 1},
			3: {"width": 3.38, "depth": 2.46, "height": 1.44, "center_z": -1.1, "front_z": 0.3, "roof": "layered_flat", "patio": true, "layered": true, "wing": 2, "signature": true},
			4: {"width": 3.74, "depth": 2.72, "height": 1.58, "center_z": -1.22, "front_z": 0.34, "roof": "layered_flat", "patio": true, "layered": true, "wing": 2, "upper": true, "signature": true},
		}},
		"food_truck_court": {"variant_name": "Food Truck Court", "style_notes": "open-air plaza with food trucks, central seating, string lights, and vendor stalls", "wall_color": "ead6bd", "roof_color": "5f7d78", "trim_color": "fff4df", "accent_color": "ffba68", "tiers": {
			1: {"width": 3.0, "depth": 1.68, "height": 0.72, "center_z": -0.66, "front_z": 0.38, "roof": "open_plaza", "vendor_count": 1, "plaza": true},
			2: {"width": 3.42, "depth": 1.92, "height": 0.82, "center_z": -0.76, "front_z": 0.4, "roof": "open_plaza", "vendor_count": 2, "plaza": true},
			3: {"width": 3.84, "depth": 2.18, "height": 0.92, "center_z": -0.88, "front_z": 0.42, "roof": "open_plaza", "vendor_count": 3, "plaza": true, "signature": true},
			4: {"width": 4.2, "depth": 2.42, "height": 1.02, "center_z": -1.0, "front_z": 0.44, "roof": "open_plaza", "vendor_count": 4, "plaza": true, "signature": true},
		}},
	},
	BUILD_TOOL_CORNER_STORE: {
		"small_quick_mart": {"variant_name": "Small Quick Mart", "style_notes": "compact convenience store, simple blue sign", "wall_color": "f2e8d8", "roof_color": "557da1", "trim_color": "fff4df", "accent_color": "86b4f4", "tiers": {
			1: {"width": 2.18, "depth": 1.42, "height": 0.9, "center_z": -0.56, "front_z": 0.2, "wing": 0, "glass": false, "upper": false, "signature": false, "roof": "flat", "awning": "bold"},
			2: {"width": 2.56, "depth": 1.62, "height": 1.0, "center_z": -0.64, "front_z": 0.28, "wing": 1, "glass": false, "upper": false, "signature": false, "roof": "flat", "awning": "bold"},
			3: {"width": 2.9, "depth": 1.82, "height": 1.08, "center_z": -0.7, "front_z": 0.34, "wing": 2, "glass": true, "upper": false, "signature": true, "roof": "flat", "awning": "bold"},
			4: {"width": 3.22, "depth": 1.98, "height": 1.18, "center_z": -0.76, "front_z": 0.38, "wing": 2, "glass": true, "upper": true, "signature": true, "roof": "flat", "awning": "bold"},
		}},
		"convenience_store_no_pumps": {"variant_name": "Convenience Store Without Pumps", "style_notes": "gas-station-style canopy language without pumps", "wall_color": "e8edf0", "roof_color": "4f76a0", "trim_color": "fff4df", "accent_color": "70d5bd", "tiers": {
			1: {"width": 2.32, "depth": 1.44, "height": 0.9, "center_z": -0.56, "front_z": 0.2, "wing": 0, "glass": true, "upper": false, "signature": false, "roof": "flat", "awning": "canopy"},
			2: {"width": 2.76, "depth": 1.64, "height": 1.0, "center_z": -0.64, "front_z": 0.28, "wing": 1, "glass": true, "upper": false, "signature": false, "roof": "flat", "awning": "canopy"},
			3: {"width": 3.1, "depth": 1.86, "height": 1.1, "center_z": -0.72, "front_z": 0.36, "wing": 1, "glass": true, "upper": false, "signature": true, "roof": "flat", "awning": "canopy"},
			4: {"width": 3.42, "depth": 2.04, "height": 1.2, "center_z": -0.78, "front_z": 0.42, "wing": 2, "glass": true, "upper": true, "signature": true, "roof": "flat", "awning": "canopy"},
		}},
		"urban_corner_shop": {"variant_name": "Urban Corner Shop", "style_notes": "street-corner storefront, poster windows, compact footprint", "wall_color": "fdebd7", "roof_color": "66839a", "trim_color": "f8e7c7", "accent_color": "f8d85f", "tiers": {
			1: {"width": 2.06, "depth": 1.36, "height": 1.0, "center_z": -0.54, "front_z": 0.2, "wing": 0, "glass": false, "upper": false, "signature": false, "roof": "gabled", "awning": "stripe"},
			2: {"width": 2.42, "depth": 1.58, "height": 1.08, "center_z": -0.62, "front_z": 0.28, "wing": 1, "glass": false, "upper": false, "signature": false, "roof": "gabled", "awning": "stripe"},
			3: {"width": 2.78, "depth": 1.8, "height": 1.18, "center_z": -0.7, "front_z": 0.34, "wing": 1, "glass": true, "upper": true, "signature": true, "roof": "gabled", "awning": "stripe"},
			4: {"width": 3.08, "depth": 1.96, "height": 1.28, "center_z": -0.76, "front_z": 0.4, "wing": 2, "glass": true, "upper": true, "signature": true, "roof": "gabled", "awning": "stripe"},
		}},
		"modern_mini_mart": {"variant_name": "Modern Mini-Mart", "style_notes": "clean modern mini-mart, larger glass, strong blue branding", "wall_color": "e7dfc4", "roof_color": "416d96", "trim_color": "fff4df", "accent_color": "df675f", "tiers": {
			1: {"width": 2.3, "depth": 1.46, "height": 0.94, "center_z": -0.58, "front_z": 0.22, "wing": 0, "glass": true, "upper": false, "signature": false, "roof": "shed", "awning": "round"},
			2: {"width": 2.74, "depth": 1.68, "height": 1.04, "center_z": -0.66, "front_z": 0.3, "wing": 1, "glass": true, "upper": false, "signature": false, "roof": "shed", "awning": "round"},
			3: {"width": 3.12, "depth": 1.9, "height": 1.14, "center_z": -0.74, "front_z": 0.36, "wing": 2, "glass": true, "upper": false, "signature": true, "roof": "shed", "awning": "round"},
			4: {"width": 3.46, "depth": 2.08, "height": 1.24, "center_z": -0.82, "front_z": 0.42, "wing": 2, "glass": true, "upper": true, "signature": true, "roof": "shed", "awning": "round"},
		}},
	},
}
const PROPERTY_VARIANT_ORDER := {
	BUILD_TOOL_HOUSE: ["suburban_cottage", "modern_boxy_house", "farmhouse_style", "compact_townhome"],
	BUILD_TOOL_FIRE: ["classic_brick_station", "modern_civic_station", "volunteer_station", "industrial_emergency_station"],
	BUILD_TOOL_BANK: ["traditional_column_bank", "modern_glass_bank", "small_town_brick_bank", "premium_financial_center"],
	BUILD_TOOL_GROCERY: ["local_market", "green_supermarket", "warehouse_grocery", "organic_market"],
	BUILD_TOOL_RESTAURANT: ["classic_diner", "fast_food_drive_through", "modern_cafe", "family_restaurant", "upscale_restaurant", "food_truck_court"],
	BUILD_TOOL_CORNER_STORE: ["small_quick_mart", "convenience_store_no_pumps", "urban_corner_shop", "modern_mini_mart"],
}
const PROPERTY_VARIANT_ARCHITECTURE_VERSION := 3
const RESTAURANT_VARIANT_DEFINITIONS := {
	"classic_diner": {
		"style": "classic_diner",
		"sign_kind": "diner",
		"supports_drive_through": true,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 0.88, "lot_size": Vector2(5.18, LOT_DEPTH - 0.34), "sidewalk": {"width": 1.18, "z": LOT_FRONT_SIDEWALK_Z - 0.08, "depth": SIDEWALK_WIDTH}, "hedges": {"width": 4.84, "depth": LOT_DEPTH - 0.72}},
	},
	"fast_food_drive_through": {
		"style": "fast_food_drive_through",
		"sign_kind": "fast_food",
		"supports_drive_through": true,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 1.04, "lot_size": Vector2(5.08, LOT_DEPTH - 0.12), "sidewalk": {"width": 0.9, "z": LOT_FRONT_SIDEWALK_Z - 0.1, "depth": SIDEWALK_WIDTH}, "hedges": {"width": 4.66, "depth": LOT_DEPTH - 0.58}},
	},
	"modern_cafe": {
		"style": "modern_cafe",
		"sign_kind": "cafe",
		"supports_drive_through": false,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 1.14, "lot_size": Vector2(4.64, LOT_DEPTH - 0.18), "sidewalk": {"width": 1.28, "z": LOT_FRONT_SIDEWALK_Z - 0.1, "depth": SIDEWALK_WIDTH}, "hedges": {"width": 4.18, "depth": LOT_DEPTH - 0.7}},
	},
	"family_restaurant": {
		"style": "family_restaurant",
		"sign_kind": "grill",
		"supports_drive_through": false,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 1.24, "lot_size": Vector2(5.34, LOT_DEPTH + 0.06), "sidewalk": {"width": 1.08, "z": LOT_FRONT_SIDEWALK_Z - 0.08, "depth": SIDEWALK_WIDTH}, "hedges": {"width": 4.96, "depth": LOT_DEPTH - 0.42}},
	},
	"upscale_restaurant": {
		"style": "upscale_restaurant",
		"sign_kind": "fine_dining",
		"supports_drive_through": false,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 1.34, "lot_size": Vector2(5.28, LOT_DEPTH + 0.22), "sidewalk": {"width": 1.04, "z": LOT_FRONT_SIDEWALK_Z - 0.06, "depth": SIDEWALK_WIDTH}, "hedges": {"width": 4.78, "depth": LOT_DEPTH - 0.28}},
	},
	"food_truck_court": {
		"style": "food_truck_court",
		"sign_kind": "food_court",
		"supports_drive_through": false,
		"lot_preset": {"parking": "none", "building_z_offset": -BUILDING_SETBACK * 0.92, "lot_size": Vector2(5.14, LOT_DEPTH - 0.12), "sidewalk": {"width": 1.34, "z": LOT_FRONT_SIDEWALK_Z - 0.1, "depth": SIDEWALK_WIDTH}, "hedges": {}},
	},
}
const COMMERCIAL_TIER_ARCHITECTURE := {
	BUILD_TOOL_FIRE: {
		1: {"width": 2.58, "depth": 1.72, "height": 1.04, "center_z": -0.64, "front_z": 0.28, "bays": 1, "columns": 0, "upper": false, "tower": false, "wing": 0, "sign": "fire", "roof": "flat"},
		2: {"width": 3.18, "depth": 1.92, "height": 1.14, "center_z": -0.66, "front_z": 0.36, "bays": 2, "columns": 0, "upper": false, "tower": false, "wing": 1, "sign": "fire", "roof": "flat"},
		3: {"width": 3.54, "depth": 2.14, "height": 1.28, "center_z": -0.72, "front_z": 0.42, "bays": 2, "columns": 0, "upper": false, "tower": true, "wing": 2, "sign": "fire", "roof": "flat"},
		4: {"width": 3.86, "depth": 2.3, "height": 1.4, "center_z": -0.76, "front_z": 0.48, "bays": 3, "columns": 0, "upper": true, "tower": true, "wing": 2, "sign": "fire", "roof": "flat"},
		5: {"width": 4.06, "depth": 2.42, "height": 1.52, "center_z": -0.8, "front_z": 0.5, "bays": 3, "columns": 0, "upper": true, "tower": true, "wing": 3, "signature": true, "sign": "fire", "roof": "flat"},
	},
	BUILD_TOOL_BANK: {
		1: {"width": 2.46, "depth": 1.54, "height": 1.0, "center_z": -0.58, "front_z": 0.24, "bays": 0, "columns": 3, "upper": false, "wing": 0, "sign": "bank", "roof": "flat"},
		2: {"width": 2.9, "depth": 1.74, "height": 1.1, "center_z": -0.62, "front_z": 0.32, "bays": 0, "columns": 4, "upper": false, "wing": 0, "sign": "bank", "roof": "flat"},
		3: {"width": 3.28, "depth": 1.94, "height": 1.2, "center_z": -0.7, "front_z": 0.38, "bays": 0, "columns": 5, "upper": false, "wing": 2, "sign": "bank", "roof": "flat"},
		4: {"width": 3.58, "depth": 2.08, "height": 1.28, "center_z": -0.76, "front_z": 0.42, "bays": 0, "columns": 5, "upper": true, "wing": 2, "glass": true, "sign": "bank", "roof": "flat"},
		5: {"width": 3.82, "depth": 2.22, "height": 1.38, "center_z": -0.82, "front_z": 0.44, "bays": 0, "columns": 6, "upper": true, "wing": 2, "glass": true, "signature": true, "sign": "bank", "roof": "flat"},
	},
	BUILD_TOOL_GROCERY: {
		1: {"width": 2.76, "depth": 1.7, "height": 0.96, "center_z": -0.66, "front_z": 0.22, "bays": 0, "columns": 0, "upper": false, "wing": 0, "sign": "grocer", "roof": "flat"},
		2: {"width": 3.22, "depth": 1.94, "height": 1.05, "center_z": -0.72, "front_z": 0.3, "bays": 0, "columns": 0, "upper": false, "wing": 0, "sign": "grocer", "roof": "flat"},
		3: {"width": 3.66, "depth": 2.16, "height": 1.14, "center_z": -0.78, "front_z": 0.36, "bays": 0, "columns": 0, "upper": false, "wing": 1, "sign": "grocer", "roof": "flat"},
		4: {"width": 4.02, "depth": 2.34, "height": 1.24, "center_z": -0.84, "front_z": 0.42, "bays": 0, "columns": 0, "upper": false, "wing": 2, "glass": true, "sign": "grocer", "roof": "flat"},
		5: {"width": 4.24, "depth": 2.5, "height": 1.36, "center_z": -0.88, "front_z": 0.46, "bays": 0, "columns": 0, "upper": false, "wing": 2, "glass": true, "signature": true, "sign": "grocer", "roof": "flat"},
	},
	BUILD_TOOL_RESTAURANT: {
		1: {"width": 2.42, "depth": 1.5, "height": 0.96, "center_z": -0.54, "front_z": 0.24, "bays": 0, "columns": 0, "upper": false, "wing": 0, "sign": "restaurant", "roof": "gabled"},
		2: {"width": 2.86, "depth": 1.72, "height": 1.05, "center_z": -0.62, "front_z": 0.32, "bays": 0, "columns": 0, "upper": false, "wing": 0, "patio": true, "sign": "restaurant", "roof": "gabled"},
		3: {"width": 3.2, "depth": 1.94, "height": 1.16, "center_z": -0.7, "front_z": 0.38, "bays": 0, "columns": 0, "upper": false, "wing": 1, "patio": true, "sign": "restaurant", "roof": "gabled"},
		4: {"width": 3.46, "depth": 2.08, "height": 1.26, "center_z": -0.76, "front_z": 0.44, "bays": 0, "columns": 0, "upper": false, "wing": 2, "patio": true, "signature": true, "sign": "restaurant", "roof": "gabled"},
		5: {"width": 3.62, "depth": 2.18, "height": 1.18, "center_z": -0.82, "front_z": 0.46, "bays": 0, "columns": 0, "upper": true, "wing": 2, "patio": true, "signature": true, "sign": "restaurant", "roof": "gabled"},
	},
	BUILD_TOOL_CORNER_STORE: {
		1: {"width": 2.2, "depth": 1.44, "height": 0.92, "center_z": -0.56, "front_z": 0.2, "bays": 0, "columns": 0, "upper": false, "wing": 0, "sign": "quick_mart", "roof": "flat"},
		2: {"width": 2.64, "depth": 1.64, "height": 1.0, "center_z": -0.64, "front_z": 0.28, "bays": 0, "columns": 0, "upper": false, "wing": 0, "sign": "quick_mart", "roof": "flat"},
		3: {"width": 2.98, "depth": 1.84, "height": 1.08, "center_z": -0.7, "front_z": 0.34, "bays": 0, "columns": 0, "upper": false, "wing": 1, "sign": "quick_mart", "roof": "flat"},
		4: {"width": 3.26, "depth": 1.98, "height": 1.18, "center_z": -0.76, "front_z": 0.38, "bays": 0, "columns": 0, "upper": false, "wing": 2, "glass": true, "sign": "quick_mart", "roof": "flat"},
		5: {"width": 3.44, "depth": 2.1, "height": 1.28, "center_z": -0.82, "front_z": 0.42, "bays": 0, "columns": 0, "upper": true, "wing": 2, "glass": true, "signature": true, "sign": "quick_mart", "roof": "flat"},
	},
}
const SIDEWALK_ROUTE_OFFSET := 1.96
const HOUSE_FRONT_BUFFER_CELLS := 1
const PropertyUpgradeData = preload("res://scripts/property_upgrade_data.gd")
const GRASS_MEADOW_ALBEDO = preload("res://assets/textures/grass_meadow_albedo-v1.png")
const ASPHALT_ALBEDO = preload("res://assets/textures/asphalt_albedo-v1.png")
const CEDAR_SHINGLES_ALBEDO = preload("res://assets/textures/cedar_shingles_albedo-v1.png")
const DEBUG_UPGRADES := false

@onready var grid_root: Node3D = $GridRoot
@onready var building_root: Node3D = $BuildingRoot
@onready var camera_controller: Node3D = $CameraController
@onready var camera: Camera3D = $CameraController/Camera3D
@onready var lighting_controller: Node3D = $LightingController
@onready var world_environment: WorldEnvironment = $LightingController/WorldEnvironment
@onready var sun: DirectionalLight3D = $LightingController/Sun
@onready var fill_light: DirectionalLight3D = $LightingController/FillLight

var _focus := Vector3(0.0, 0.0, 0.0)
var _target_focus := Vector3(0.0, 0.0, 0.0)
var _zoom := DEFAULT_ZOOM
var _target_zoom := DEFAULT_ZOOM
var _camera_yaw := deg_to_rad(45.0)
var _target_camera_yaw := deg_to_rad(45.0)
var _dragging := false
var _right_mouse_down := false
var _right_drag_moved := false
var _right_drag_origin := Vector2.ZERO
var _painting_bulldoze := false
var _bulldoze_visited: Dictionary = {}
var _road_line_active := false
var _road_line_start := Vector2i(-1, -1)
var _build_tool := BUILD_TOOL_ROAD
var _hovered_cell := Vector2i(-1, -1)
var _hover_anchor := Vector2i(-1, -1)
var _hover_cells: Array[Vector2i] = []
var _hover_frontage_side := "south"
var _hover_active := false
var _hover_can_build := false
var _selected_anchor_key := ""
var _selected_tile := Vector2i(-1, -1)
var _selection_cells: Array[Vector2i] = []
var _money := STARTING_MONEY
var _day := 1
var _simulation_clock := 0.0
var _cashflow_per_day := 0
var _occupied_cells: Dictionary = {}
var _reserved_cells: Dictionary = {}
var _placed_nodes: Dictionary = {}
var _placements: Dictionary = {}
var _cell_anchor_lookup: Dictionary = {}
var _road_cells: Dictionary = {}
var _road_nodes: Dictionary = {}
var _road_light_nodes: Dictionary = {}
var _action_history: Array[Dictionary] = []
var _variant_cycle: Dictionary = {}
var _loaded_save := false

var _ground_material_a: StandardMaterial3D
var _ground_material_b: StandardMaterial3D
var _ground_material_c: StandardMaterial3D
var _soil_material: StandardMaterial3D
var _stone_material: StandardMaterial3D
var _water_material: StandardMaterial3D
var _water_highlight_material: StandardMaterial3D
var _road_material: StandardMaterial3D
var _road_top_detail_material: StandardMaterial3D
var _road_edge_highlight_material: StandardMaterial3D
var _crosswalk_material: StandardMaterial3D
var _road_mark_material: StandardMaterial3D
var _sidewalk_material: StandardMaterial3D
var _window_material: StandardMaterial3D
var _window_frame_material: StandardMaterial3D
var _roof_fascia_material: StandardMaterial3D
var _street_lamp_bulb_material: StandardMaterial3D
var _leaf_material: StandardMaterial3D
var _leaf_material_light: StandardMaterial3D
var _leaf_material_dark: StandardMaterial3D
var _trunk_material: StandardMaterial3D
var _flower_material_pink: StandardMaterial3D
var _flower_material_blue: StandardMaterial3D
var _meadow_material: StandardMaterial3D
var _grass_blade_material: StandardMaterial3D
var _soft_shadow_material: StandardMaterial3D
var _hover_material_valid: StandardMaterial3D
var _hover_material_invalid: StandardMaterial3D
var _ghost_base_material: StandardMaterial3D
var _ghost_accent_material: StandardMaterial3D
var _lamp_glow_texture: Texture2D

var _clouds: Array[Node3D] = []
var _window_bands: Array[MeshInstance3D] = []
var _water_ripples: Array[Node3D] = []
var _grass_clumps: Array[Node3D] = []
var _road_preview_nodes: Array[Node3D] = []
var _nature_features: Array[Node3D] = []
var _hover_tiles: Array[MeshInstance3D] = []
var _meadow_patches: Array[MeshInstance3D] = []
var _ambient_cars: Array[Node3D] = []
var _ambient_trolleys: Array[Node3D] = []
var _ambient_people: Array[Node3D] = []
var _ambient_social_point := Vector3.ZERO
var _ambient_park_seats: Array[Vector3] = []
var _ambient_life_clock := 0.0
var _hover_root: Node3D
var _ghost_root: Node3D
var _ghost_nodes: Dictionary = {}
var _road_lights_root: Node3D
var _life_root: Node3D
var _hud_layer: CanvasLayer
var _hud_margin: MarginContainer
var _hud_panel: Control
var _title_label: Label
var _tool_status_label: Label
var _hint_label: Label
var _stats_label: Label
var _selection_label: Label
var _tool_buttons: Dictionary = {}
var _tool_dropdown: OptionButton
var _town_menu: MenuButton
var _fullscreen_button: Button
var _save_button: Button
var _load_button: Button
var _clear_button: Button
var _home_button: Button
var _rotate_left_button: Button
var _rotate_right_button: Button
var _place_button: Button
var _upgrade_button: Button
var _undo_button: Button
var _zoom_in_button: Button
var _zoom_out_button: Button
var _nature_root: Node3D
var _music_player: AudioStreamPlayer
var _music_button: Button
var _music_start_pending := false
var _ambient_dropdown: OptionButton
var _ambient_light_scale := 1.0
var _music_enabled := true


func _ready() -> void:
	_build_materials()
	_build_world()
	_create_runtime_helpers()
	_build_hud()
	_try_load_game()
	if not _loaded_save:
		_build_starter_neighborhood()
	_recalculate_cashflow()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	_update_camera(true)


func _pan_limit() -> float:
	return float(GRID_SIZE) * 0.46


func _process(delta: float) -> void:
	_focus = _focus.lerp(_target_focus, min(1.0, delta * 7.0))
	_zoom = lerp(_zoom, _target_zoom, min(1.0, delta * 6.5))
	_animate_clouds(delta)
	_animate_water(delta)
	_animate_windows()
	_animate_grass()
	_animate_life(delta)
	_update_keyboard_camera(delta)
	_update_hover_from_mouse()
	_update_day_night_visuals()
	_update_camera()
	_update_simulation(delta)


func _input(event: InputEvent) -> void:
	_maybe_start_music_from_user_gesture(event)
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				_set_build_tool(BUILD_TOOL_ROAD)
			KEY_2:
				_set_build_tool(BUILD_TOOL_HOUSE)
			KEY_3:
				_set_build_tool(BUILD_TOOL_FIRE)
			KEY_4:
				_set_build_tool(BUILD_TOOL_BANK)
			KEY_5:
				_set_build_tool(BUILD_TOOL_GROCERY)
			KEY_6:
				_set_build_tool(BUILD_TOOL_RESTAURANT)
			KEY_7:
				_set_build_tool(BUILD_TOOL_CORNER_STORE)
			KEY_8:
				_set_build_tool(BUILD_TOOL_PARK)
			KEY_P:
				_set_build_tool(BUILD_TOOL_POND_SMALL)
			KEY_9:
				_set_build_tool(BUILD_TOOL_INSPECT)
			KEY_0:
				_set_build_tool(BUILD_TOOL_BULLDOZE)
			KEY_U:
				_upgrade_selected_property()
			KEY_Q:
				_rotate_camera(-PI * 0.5)
			KEY_E:
				_rotate_camera(PI * 0.5)
			KEY_Z:
				if Input.is_key_pressed(KEY_META) or Input.is_key_pressed(KEY_CTRL):
					_undo_last_action()
			KEY_SPACE, KEY_ENTER:
				_try_place_hovered_tile()
			KEY_F:
				_toggle_fullscreen()
			KEY_ESCAPE:
				if _build_tool == BUILD_TOOL_ROAD and _road_line_active:
					_cancel_road_line()
					_refresh_tool_ui()
					_update_hover_from_mouse()
					return
				_exit_fullscreen()
				_clear_hover()
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_MIDDLE:
			_dragging = event.pressed
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				_right_mouse_down = true
				_right_drag_moved = false
				_right_drag_origin = event.position
				_dragging = true
			else:
				_dragging = false
				if _right_mouse_down and not _right_drag_moved and not _is_pointer_over_hud():
					_cancel_tool_and_select_at_mouse(event.position)
				_right_mouse_down = false
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and not _is_pointer_over_hud():
				if _build_tool == BUILD_TOOL_BULLDOZE:
					_painting_bulldoze = true
					_bulldoze_visited.clear()
				_try_place_hovered_tile()
			else:
				_painting_bulldoze = false
				_bulldoze_visited.clear()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_target_zoom = max(MIN_ZOOM, _target_zoom - 1.15)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_target_zoom = min(MAX_ZOOM, _target_zoom + 1.15)
	elif event is InputEventMouseMotion and _dragging:
		if _right_mouse_down and event.position.distance_to(_right_drag_origin) > 6.0:
			_right_drag_moved = true
		var right := Vector3.RIGHT.rotated(Vector3.UP, _target_camera_yaw)
		var forward := Vector3.FORWARD.rotated(Vector3.UP, _target_camera_yaw)
		var pan_delta: Vector3 = (-right * event.relative.x + forward * event.relative.y) * PAN_SPEED
		_target_focus += Vector3(pan_delta.x, 0.0, pan_delta.z)
		var pan_limit := _pan_limit()
		_target_focus.x = clamp(_target_focus.x, -pan_limit, pan_limit)
		_target_focus.z = clamp(_target_focus.z, -pan_limit, pan_limit)
	elif event is InputEventMouseMotion and _painting_bulldoze and _build_tool == BUILD_TOOL_BULLDOZE and not _is_pointer_over_hud():
		_try_place_hovered_tile()


func _build_materials() -> void:
	_ground_material_a = _make_material("8cc775", 0.94)
	# A calm matte field reads better at the isometric camera distance than the
	# previous high-frequency grass texture. Small plants and dressed lots provide
	# detail without turning the whole island into visual noise.
	_ground_material_a.albedo_color = Color("70975f")
	_ground_material_b = _make_material("76b15f", 0.96)
	_ground_material_c = _make_material("a9d986", 0.93)
	_soil_material = _make_material("6b5137", 0.98)
	_stone_material = _make_material("d8c9b3", 0.9)
	_water_material = _make_material("349ab4", 0.24, 0.0, true, "bceff5", 0.1)
	_water_highlight_material = _make_transparent_material(Color("effffb"), 0.26, 0.42)
	_road_material = _make_material("272d31", 0.98)
	_road_material.albedo_texture = ASPHALT_ALBEDO
	_road_material.albedo_color = Color(0.82, 0.84, 0.86)
	_road_material.uv1_scale = Vector3(2.5, 2.5, 2.5)
	_road_material.texture_repeat = true
	_road_material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_road_top_detail_material = _make_material("333a3f", 0.97)
	_road_top_detail_material.albedo_texture = ASPHALT_ALBEDO
	_road_top_detail_material.albedo_color = Color(0.9, 0.92, 0.94)
	_road_top_detail_material.uv1_scale = Vector3(2.5, 2.5, 2.5)
	_road_top_detail_material.texture_repeat = true
	_road_top_detail_material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_road_edge_highlight_material = _make_material("b8c1bd", 0.92)
	_crosswalk_material = _make_material("ddd8cb", 0.92)
	_road_mark_material = _make_material("e8c64f", 0.8)
	_sidewalk_material = _make_material("b9b09f", 0.94)
	_window_material = _make_material("ffc15e", 0.12, 0.0, true, "ffe09a", 0.38)
	_window_frame_material = _make_material("f6ecd8", 0.82)
	_roof_fascia_material = _make_material("5f412b", 0.84)
	_street_lamp_bulb_material = _make_material("fff4d8", 0.04, 0.0, true, "ffe7a8", 0.38)
	_leaf_material = _make_material("5b8d4b", 0.93)
	_leaf_material_light = _make_material("83b765", 0.91)
	_leaf_material_dark = _make_material("38683a", 0.95)
	_configure_foliage_material(_leaf_material, Color("91a979"))
	_configure_foliage_material(_leaf_material_light, Color("b3c994"))
	_configure_foliage_material(_leaf_material_dark, Color("657d5c"))
	_trunk_material = _make_material("7a5336", 0.94)
	_flower_material_pink = _make_material("ef93b5", 0.7)
	_flower_material_blue = _make_material("8fc6ef", 0.7)
	_meadow_material = _make_material("9aac68", 0.96)
	_grass_blade_material = _make_material("5d8540", 0.96)
	_soft_shadow_material = _make_transparent_material(Color(0.08, 0.06, 0.04, 1.0), 1.0, 0.18)
	_hover_material_valid = _make_transparent_material(Color("76e5c7"), 0.24, 0.34)
	_hover_material_invalid = _make_transparent_material(Color("f29a8d"), 0.24, 0.34)
	_ghost_base_material = _make_transparent_material(Color("f7f0d8"), 0.44, 0.52)
	_ghost_accent_material = _make_transparent_material(Color("78d7c8"), 0.32, 0.5)


func _build_world() -> void:
	_nature_root = Node3D.new()
	building_root.add_child(_nature_root)
	_life_root = Node3D.new()
	building_root.add_child(_life_root)
	_build_water_ring()
	_build_island_base()
	_build_diorama_backdrop()
	_build_ground_tiles()
	_build_meadow()
	_build_nature()
	_build_clouds()


func _create_runtime_helpers() -> void:
	_hover_root = Node3D.new()
	grid_root.add_child(_hover_root)

	_road_lights_root = Node3D.new()
	grid_root.add_child(_road_lights_root)

	_ghost_root = Node3D.new()
	_ghost_root.visible = false
	add_child(_ghost_root)

	for tool in BUILD_TOOL_SEQUENCE:
		var ghost := _spawn_tool_preview(tool)
		_ghost_nodes[tool] = ghost
		_ghost_root.add_child(ghost)

	_music_player = AudioStreamPlayer.new()
	_music_player.volume_db = -12.0
	add_child(_music_player)
	_load_music_stream()
	_music_start_pending = _music_player.stream != null


func _build_hud() -> void:
	_hud_layer = CanvasLayer.new()
	add_child(_hud_layer)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_TOP_WIDE)
	margin.offset_left = 14
	margin.offset_top = 12
	margin.offset_right = -14
	margin.offset_bottom = 0
	_hud_layer.add_child(margin)
	_hud_margin = margin

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _make_glass_panel_style())
	margin.add_child(panel)
	_hud_panel = panel

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 4)
	panel.add_child(stack)

	var top_row := HFlowContainer.new()
	top_row.add_theme_constant_override("separation", 6)
	stack.add_child(top_row)

	var title := Label.new()
	title.text = "Cozy Builder"
	title.add_theme_color_override("font_color", Color("f8f7f3"))
	title.add_theme_font_size_override("font_size", 16)
	title.custom_minimum_size = Vector2(110, 0)
	top_row.add_child(title)
	_title_label = title

	_tool_dropdown = OptionButton.new()
	_tool_dropdown.custom_minimum_size = Vector2(160, 0)
	for tool in [
		BUILD_TOOL_ROAD,
		BUILD_TOOL_HOUSE,
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
		BUILD_TOOL_PARK,
		BUILD_TOOL_POND_SMALL,
		BUILD_TOOL_POND_MEDIUM,
		BUILD_TOOL_POND_LARGE,
		BUILD_TOOL_FOREST_SMALL,
		BUILD_TOOL_FOREST_MEDIUM,
		BUILD_TOOL_FOREST_LARGE,
		BUILD_TOOL_INSPECT,
		BUILD_TOOL_BULLDOZE,
	]:
		var index := _tool_dropdown.item_count
		_tool_dropdown.add_item(_tool_dropdown_label(tool), index)
		_tool_dropdown.set_item_metadata(index, tool)
	_tool_dropdown.item_selected.connect(_on_tool_dropdown_selected)
	top_row.add_child(_tool_dropdown)

	_place_button = Button.new()
	_place_button.text = "Place"
	_place_button.custom_minimum_size = Vector2(74, 0)
	_place_button.pressed.connect(_try_place_hovered_tile)
	top_row.add_child(_place_button)

	_upgrade_button = Button.new()
	_upgrade_button.text = "Upgrade"
	_upgrade_button.custom_minimum_size = Vector2(86, 0)
	_upgrade_button.pressed.connect(_upgrade_selected_property)
	top_row.add_child(_upgrade_button)

	_town_menu = MenuButton.new()
	_town_menu.text = "Town"
	_town_menu.custom_minimum_size = Vector2(72, 0)
	var town_popup := _town_menu.get_popup()
	town_popup.add_item("Home View", 0)
	town_popup.add_item("Save Town", 1)
	town_popup.add_item("Load Save", 2)
	town_popup.add_item("New Map", 3)
	town_popup.id_pressed.connect(_on_town_menu_action)
	top_row.add_child(_town_menu)

	_ambient_dropdown = OptionButton.new()
	_ambient_dropdown.custom_minimum_size = Vector2(118, 0)
	for preset in AMBIENT_LIGHT_PRESETS:
		var ambient_index := _ambient_dropdown.item_count
		_ambient_dropdown.add_item(str(preset["label"]), ambient_index)
		_ambient_dropdown.set_item_metadata(ambient_index, float(preset["scale"]))
	_ambient_dropdown.item_selected.connect(_on_ambient_dropdown_selected)
	top_row.add_child(_ambient_dropdown)

	_fullscreen_button = Button.new()
	_fullscreen_button.text = "Fullscreen"
	_fullscreen_button.custom_minimum_size = Vector2(92, 0)
	_fullscreen_button.pressed.connect(_toggle_fullscreen)
	top_row.add_child(_fullscreen_button)

	_music_button = Button.new()
	_music_button.text = "Music On"
	_music_button.custom_minimum_size = Vector2(88, 0)
	_music_button.pressed.connect(_toggle_music)
	top_row.add_child(_music_button)

	_home_button = Button.new()
	_home_button.text = "Home"
	_home_button.custom_minimum_size = Vector2(64, 0)
	_home_button.pressed.connect(_reset_camera_view)
	top_row.add_child(_home_button)

	_rotate_left_button = Button.new()
	_rotate_left_button.text = "L"
	_rotate_left_button.tooltip_text = "Rotate view left (Q)"
	_rotate_left_button.custom_minimum_size = Vector2(38, 0)
	_rotate_left_button.pressed.connect(_rotate_camera.bind(-PI * 0.5))
	top_row.add_child(_rotate_left_button)

	_rotate_right_button = Button.new()
	_rotate_right_button.text = "R"
	_rotate_right_button.tooltip_text = "Rotate view right (E)"
	_rotate_right_button.custom_minimum_size = Vector2(38, 0)
	_rotate_right_button.pressed.connect(_rotate_camera.bind(PI * 0.5))
	top_row.add_child(_rotate_right_button)

	_zoom_out_button = Button.new()
	_zoom_out_button.text = "−"
	_zoom_out_button.tooltip_text = "Zoom out"
	_zoom_out_button.custom_minimum_size = Vector2(38, 0)
	_zoom_out_button.pressed.connect(_adjust_zoom.bind(1.6))
	top_row.add_child(_zoom_out_button)

	_zoom_in_button = Button.new()
	_zoom_in_button.text = "+"
	_zoom_in_button.tooltip_text = "Zoom in"
	_zoom_in_button.custom_minimum_size = Vector2(38, 0)
	_zoom_in_button.pressed.connect(_adjust_zoom.bind(-1.6))
	top_row.add_child(_zoom_in_button)

	_undo_button = Button.new()
	_undo_button.text = "Undo"
	_undo_button.custom_minimum_size = Vector2(64, 0)
	_undo_button.pressed.connect(_undo_last_action)
	top_row.add_child(_undo_button)

	_tool_status_label = Label.new()
	_tool_status_label.add_theme_color_override("font_color", Color("d3ebe4"))
	_tool_status_label.add_theme_font_size_override("font_size", 12)
	stack.add_child(_tool_status_label)
	_tool_status_label.visible = false

	_stats_label = Label.new()
	_stats_label.add_theme_color_override("font_color", Color("f7f2e6"))
	_stats_label.add_theme_font_size_override("font_size", 12)
	stack.add_child(_stats_label)

	_selection_label = Label.new()
	_selection_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_selection_label.custom_minimum_size = Vector2(320, 0)
	_selection_label.add_theme_color_override("font_color", Color("d7e7ef"))
	_selection_label.add_theme_font_size_override("font_size", 11)
	stack.add_child(_selection_label)

	_hint_label = Label.new()
	_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint_label.custom_minimum_size = Vector2(320, 0)
	_hint_label.add_theme_color_override("font_color", Color("a9bec5"))
	_hint_label.add_theme_font_size_override("font_size", 11)
	_hint_label.text = "Choose a build tool, then place it in the world. Right drag pans; Q/E rotates."
	stack.add_child(_hint_label)


func _refresh_tool_ui() -> void:
	if _tool_status_label:
		var tool_name := _tool_name(_build_tool)
		var cost_text := ""
		if BUILD_TOOL_COSTS.has(_build_tool):
			cost_text = "  |  Cost: $%d" % int(BUILD_TOOL_COSTS[_build_tool])
		_tool_status_label.text = "Tool: %s%s" % [tool_name, cost_text]
	if _stats_label:
		_stats_label.text = _build_stats_text()
	if _tool_dropdown:
		for index in range(_tool_dropdown.item_count):
			if str(_tool_dropdown.get_item_metadata(index)) == _build_tool:
				_tool_dropdown.select(index)
				break
	for tool in _tool_buttons.keys():
		_style_tool_button(_tool_buttons[tool], _build_tool == tool)
	if _tool_dropdown:
		_style_tool_button(_tool_dropdown, false)
	if _town_menu:
		_style_tool_button(_town_menu, false)
	if _fullscreen_button:
		_style_tool_button(_fullscreen_button, false)
		_fullscreen_button.text = "Exit Fullscreen" if _is_fullscreen() else "Fullscreen"
	if _music_button:
		_style_tool_button(_music_button, _music_enabled)
		_music_button.text = "Music On" if _music_enabled else "Music Off"
	if _ambient_dropdown:
		_refresh_ambient_dropdown()
	if _place_button:
		_style_tool_button(_place_button, true)
	if _upgrade_button:
		var can_upgrade := _can_upgrade_selected_property()
		_style_tool_button(_upgrade_button, can_upgrade)
		_upgrade_button.disabled = not can_upgrade
		if _selected_anchor_key != "" and _placements.has(_selected_anchor_key):
			var selected_tool := str(_placements[_selected_anchor_key]["tool"])
			var selected_tier := int(_placements[_selected_anchor_key].get("tier", 1))
			if PropertyUpgradeData.is_upgradeable(selected_tool) and selected_tier < PropertyUpgradeData.max_tier(selected_tool):
				var upgrade_cost := _selected_upgrade_cost()
				_upgrade_button.text = "Upgrade $%d" % upgrade_cost
			else:
				_upgrade_button.text = "Upgrade"
		else:
			_upgrade_button.text = "Upgrade"
		_upgrade_debug("ui refresh selected=%s can_upgrade=%s disabled=%s text=%s" % [
			_selected_anchor_key,
			str(can_upgrade),
			str(_upgrade_button.disabled),
			_upgrade_button.text
		])
	if _zoom_in_button:
		_style_tool_button(_zoom_in_button, false)
	if _zoom_out_button:
		_style_tool_button(_zoom_out_button, false)
	if _rotate_left_button:
		_style_tool_button(_rotate_left_button, false)
	if _rotate_right_button:
		_style_tool_button(_rotate_right_button, false)
	if _undo_button:
		_style_tool_button(_undo_button, _action_history.size() > 0)
		_undo_button.disabled = _action_history.is_empty()
	if _home_button:
		_style_tool_button(_home_button, false)
	if _save_button:
		_style_tool_button(_save_button, false)
	if _load_button:
		_style_tool_button(_load_button, false)
	if _clear_button:
		_style_tool_button(_clear_button, false)
	if _selection_label:
		_selection_label.text = _selection_text()
		_selection_label.visible = _selected_anchor_key != "" or _selected_tile.x >= 0
	_apply_hud_layout()
	if _ghost_root:
		for tool in _ghost_nodes.keys():
			_ghost_nodes[tool].visible = _build_tool == tool and BUILD_TOOL_COSTS.has(tool)


func _ambient_index_for_scale(scale: float) -> int:
	var best_index := 0
	var best_distance := INF
	for index in range(AMBIENT_LIGHT_PRESETS.size()):
		var preset_scale := float(AMBIENT_LIGHT_PRESETS[index]["scale"])
		var distance := absf(preset_scale - scale)
		if distance < best_distance:
			best_distance = distance
			best_index = index
	return best_index


func _refresh_ambient_dropdown() -> void:
	if not _ambient_dropdown:
		return
	var index := _ambient_index_for_scale(_ambient_light_scale)
	if _ambient_dropdown.get_selected_id() != index:
		_ambient_dropdown.select(index)
	_style_tool_button(_ambient_dropdown, false)


func _set_ambient_light_scale(scale: float) -> void:
	_ambient_light_scale = clampf(scale, 0.0, 1.0)
	_update_day_night_visuals()
	_refresh_tool_ui()


func _on_ambient_dropdown_selected(index: int) -> void:
	if index < 0 or index >= AMBIENT_LIGHT_PRESETS.size():
		return
	_set_ambient_light_scale(float(AMBIENT_LIGHT_PRESETS[index]["scale"]))


func _normalize_ambient_light_scale(saved_scale: float) -> float:
	if saved_scale > 1.0:
		return 1.0
	return clampf(saved_scale, 0.0, 1.0)


func _style_tool_button(button: Button, selected: bool) -> void:
	button.add_theme_color_override("font_color", Color("f7f2e6"))
	button.add_theme_color_override("font_hover_color", Color("ffffff"))
	button.add_theme_color_override("font_pressed_color", Color("ffffff"))
	var base_color := Color(0.11, 0.16, 0.22, 0.42) if not selected else Color(0.2, 0.58, 0.54, 0.5)
	var border_color := Color(0.86, 0.93, 0.98, 0.18) if not selected else Color(0.56, 0.92, 0.86, 0.34)
	button.add_theme_stylebox_override("normal", _make_panel_style(base_color, border_color))
	button.add_theme_stylebox_override("hover", _make_panel_style(base_color.lightened(0.08), border_color.lightened(0.08)))
	button.add_theme_stylebox_override("pressed", _make_panel_style(base_color.darkened(0.04), border_color))
	button.add_theme_stylebox_override("focus", _make_panel_style(base_color, border_color.lightened(0.12)))


func _set_build_tool(tool: String) -> void:
	if tool != _build_tool:
		_cancel_road_line()
	_build_tool = tool
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _tool_dropdown_label(tool: String) -> String:
	match tool:
		BUILD_TOOL_ROAD:
			return "Build: Road"
		BUILD_TOOL_HOUSE:
			return "Build: House"
		BUILD_TOOL_FIRE:
			return "Build: Fire"
		BUILD_TOOL_BANK:
			return "Build: Bank"
		BUILD_TOOL_GROCERY:
			return "Build: Grocery"
		BUILD_TOOL_RESTAURANT:
			return "Build: Restaurant"
		BUILD_TOOL_CORNER_STORE:
			return "Build: Corner"
		BUILD_TOOL_PARK:
			return "Build: Park"
		BUILD_TOOL_POND_SMALL:
			return "Build: Small Pond"
		BUILD_TOOL_POND_MEDIUM:
			return "Build: Medium Pond"
		BUILD_TOOL_POND_LARGE:
			return "Build: Large Lake"
		BUILD_TOOL_FOREST_SMALL:
			return "Build: Small Forest"
		BUILD_TOOL_FOREST_MEDIUM:
			return "Build: Medium Forest"
		BUILD_TOOL_FOREST_LARGE:
			return "Build: Large Forest"
		BUILD_TOOL_INSPECT:
			return "Tool: Inspect"
		BUILD_TOOL_BULLDOZE:
			return "Tool: Bulldoze"
	return _tool_name(tool)


func _on_tool_dropdown_selected(index: int) -> void:
	if not _tool_dropdown:
		return
	var tool := str(_tool_dropdown.get_item_metadata(index))
	if tool != "":
		_set_build_tool(tool)


func _on_town_menu_action(id: int) -> void:
	match id:
		0:
			_reset_camera_view()
		1:
			_save_game()
		2:
			_load_game()
		3:
			_new_map()


func _load_music_stream() -> void:
	if not is_instance_valid(_music_player):
		return
	if not ResourceLoader.exists(MUSIC_STREAM_PATH):
		_music_player.stream = null
		return
	var stream := load(MUSIC_STREAM_PATH)
	if stream is AudioStreamMP3:
		stream.loop = true
	_music_player.stream = stream


func _maybe_start_music_from_user_gesture(event: InputEvent) -> void:
	if not _music_start_pending or not _music_enabled:
		return
	if not is_instance_valid(_music_player) or _music_player.stream == null:
		return
	var should_start := false
	if event is InputEventKey and event.pressed and not event.echo:
		should_start = true
	elif event is InputEventMouseButton and event.pressed:
		should_start = true
	elif event is InputEventScreenTouch and event.pressed:
		should_start = true
	if not should_start:
		return
	_music_start_pending = false
	if not _music_player.playing:
		_music_player.play()


func _toggle_music() -> void:
	if not is_instance_valid(_music_player):
		return
	if _music_player.stream == null:
		_load_music_stream()
	if _music_player.stream == null:
		if _hint_label:
			_hint_label.text = "Music file not found. Expected at %s." % MUSIC_STREAM_PATH
		return
	_music_enabled = not _music_enabled
	if _music_enabled:
		_music_start_pending = false
		_music_player.play()
	else:
		_music_player.stop()
	_refresh_tool_ui()


func _apply_hud_layout() -> void:
	if not _hud_margin or not _hud_panel:
		return
	var viewport_size := get_viewport().get_visible_rect().size
	var compact := _is_fullscreen() or viewport_size.x < 980.0
	_hud_margin.offset_left = 10 if compact else 14
	_hud_margin.offset_top = 8 if compact else 12
	_hud_margin.offset_right = -10 if compact else -14
	if _title_label:
		_title_label.visible = not compact
	if _tool_status_label:
		_tool_status_label.add_theme_font_size_override("font_size", 11 if compact else 12)
	if _stats_label:
		_stats_label.add_theme_font_size_override("font_size", 10 if compact else 12)
	if _selection_label:
		_selection_label.visible = not compact and (_selected_anchor_key != "" or _selected_tile.x >= 0)
		_selection_label.add_theme_font_size_override("font_size", 10 if compact else 11)
	if _hint_label:
		_hint_label.add_theme_font_size_override("font_size", 10 if compact else 11)
	if _tool_dropdown:
		_tool_dropdown.custom_minimum_size = Vector2(136 if compact else 160, 0)
	if _place_button:
		_place_button.custom_minimum_size = Vector2(62 if compact else 74, 0)
	if _upgrade_button:
		_upgrade_button.custom_minimum_size = Vector2(86 if compact else 100, 0)
	if _fullscreen_button:
		_fullscreen_button.custom_minimum_size = Vector2(84 if compact else 92, 0)
	if _music_button:
		_music_button.custom_minimum_size = Vector2(82 if compact else 88, 0)
	if _town_menu:
		_town_menu.custom_minimum_size = Vector2(62 if compact else 72, 0)
	if _home_button:
		_home_button.visible = not compact


func _update_hover_from_mouse() -> void:
	if not is_instance_valid(camera):
		return
	var pick := _pick_grid_cell(get_viewport().get_mouse_position())
	var inspect_mode := _build_tool == BUILD_TOOL_INSPECT or _build_tool == BUILD_TOOL_BULLDOZE
	if pick.is_empty():
		if inspect_mode and _selected_anchor_key != "" and _placements.has(_selected_anchor_key):
			_sync_hover_to_selected_placement()
			return
		_clear_hover()
		return

	var cell: Vector2i = pick["cell"]
	var hover_layout := _resolve_hover_layout(_build_tool, cell)
	var footprint: Vector2i = hover_layout.get("footprint", _tool_footprint(_build_tool))
	var anchor: Vector2i = hover_layout.get("anchor", _anchor_for_hover_cell(cell, footprint))
	var cells: Array[Vector2i] = hover_layout.get("cells", _cells_for_anchor(anchor, footprint))
	var world := _anchor_to_world(anchor, footprint)
	var valid := false
	var pointer_over_hud := _is_pointer_over_hud()
	if inspect_mode:
		var found_anchor := _find_anchor_for_cell(cell)
		if found_anchor != "":
			anchor = _anchor_key_to_cell(found_anchor)
			cells = _placement_cells(found_anchor)
			footprint = _footprint_from_cells(cells)
			world = _anchor_to_world(anchor, footprint)
			valid = true
			_set_selected_anchor(found_anchor)
		elif _selected_anchor_key != "":
			_sync_hover_to_selected_placement()
			valid = true
			if DEBUG_UPGRADES:
				_upgrade_debug("inspect hover kept selection cell=%s selected=%s hud=%s" % [str(cell), _selected_anchor_key, str(pointer_over_hud)])
			return
		elif not pointer_over_hud:
			_upgrade_debug("inspect hover cleared selection cell=%s hud=%s selected_before=%s" % [str(cell), str(pointer_over_hud), _selected_anchor_key])
			_clear_selected_anchor()
		elif DEBUG_UPGRADES:
			_upgrade_debug("inspect hover preserved selection over HUD cell=%s selected=%s" % [str(cell), _selected_anchor_key])
	elif _build_tool == BUILD_TOOL_ROAD and _road_line_active and _road_line_start.x >= 0:
		var road_cells := _road_line_cells(_road_line_start, cell)
		valid = _road_line_is_valid(road_cells)
		_hovered_cell = cell
		_hover_anchor = _road_line_start
		_hover_cells = road_cells
		_hover_frontage_side = "south"
		_hover_active = true
		_hover_can_build = valid
		_clear_hover_tiles()
		_update_road_line_preview(road_cells, valid)
		if _ghost_root:
			_ghost_root.visible = false
		if _hint_label:
			if valid:
				_hint_label.text = "Road start set. Click again to place the straight road."
			else:
				_hint_label.text = "That road line is blocked. Pick a clearer end point or right click / Esc to cancel."
		return
	else:
		if _build_tool == BUILD_TOOL_ROAD:
			valid = _road_start_can_be_selected(anchor)
		else:
			valid = _cells_are_buildable(cells, _build_tool)
			var hover_side := str(hover_layout.get("frontage_side", _preferred_frontage_side(_build_tool, anchor, footprint)))
			if valid and _tool_requires_road(_build_tool) and not _placement_has_required_frontage(_build_tool, anchor, footprint, hover_side):
				valid = false
			if BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
				valid = false
		if _build_tool == BUILD_TOOL_ROAD and BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
			valid = false

	_hovered_cell = cell
	_hover_anchor = anchor
	_hover_cells = cells
	_hover_frontage_side = str(hover_layout.get("frontage_side", _preferred_frontage_side(_build_tool, anchor, footprint)))
	_hover_active = true
	_hover_can_build = valid
	_update_hover_tiles(cells, valid)
	_ghost_root.visible = true
	_ghost_root.position = world
	_ghost_root.rotation_degrees.y = rad_to_deg(_tool_rotation_y(_build_tool, anchor, footprint))
	for tool in _ghost_nodes.keys():
		_ghost_nodes[tool].visible = _build_tool == tool and BUILD_TOOL_COSTS.has(tool)

	if _hint_label:
		if valid:
			if inspect_mode:
				_hint_label.text = "Selected %s. Click or press Space to %s it." % [_selection_name(), "inspect" if _build_tool == BUILD_TOOL_INSPECT else "remove"]
			else:
				var size_label := "%dx%d" % [footprint.x, footprint.y]
				_hint_label.text = "Footprint %s at %d, %d is open. Left click to place a %s." % [size_label, anchor.x + 1, anchor.y + 1, _tool_name(_build_tool).to_lower()]
		elif BUILD_TOOL_COSTS.has(_build_tool) and _money < int(BUILD_TOOL_COSTS[_build_tool]):
			_hint_label.text = "Not enough money for %s. You need $%d." % [_tool_name(_build_tool).to_lower(), int(BUILD_TOOL_COSTS[_build_tool])]
		elif _tool_requires_road(_build_tool):
			_hint_label.text = "%s needs a clear frontage strip and a road just beyond it." % _tool_name(_build_tool)
		else:
			_hint_label.text = "That footprint collides with something already placed. Pick a clearer spot nearby."


func _clear_hover() -> void:
	_hover_active = false
	_hover_can_build = false
	_hover_anchor = Vector2i(-1, -1)
	_hover_cells.clear()
	_clear_hover_tiles()
	_clear_road_line_preview()
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Use the build buttons or keys 1-0 and P, then click or press Space to place. Q/E rotates. Cmd/Ctrl+Z undoes. Right drag pans."


func _sync_hover_to_selected_placement() -> void:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		return
	var placement: Dictionary = _placements[_selected_anchor_key]
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	_hovered_cell = anchor
	_hover_anchor = anchor
	_hover_cells = cells
	_hover_frontage_side = str(placement.get("frontage_side", "south"))
	_hover_active = true
	_hover_can_build = true
	_update_hover_tiles(cells, true)
	if _ghost_root:
		_ghost_root.visible = false
	if _hint_label:
		_hint_label.text = "Selected %s. Click or press Space to %s it." % [_selection_name(), "inspect" if _build_tool == BUILD_TOOL_INSPECT else "remove"]


func _cancel_road_line() -> void:
	_road_line_active = false
	_road_line_start = Vector2i(-1, -1)
	_clear_road_line_preview()


func _clear_road_line_preview() -> void:
	for node in _road_preview_nodes:
		if is_instance_valid(node):
			node.queue_free()
	_road_preview_nodes.clear()


func _road_line_cells(start_cell: Vector2i, end_cell: Vector2i) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	if start_cell.x < 0 or start_cell.y < 0 or end_cell.x < 0 or end_cell.y < 0:
		return cells
	var horizontal: bool = abs(end_cell.x - start_cell.x) >= abs(end_cell.y - start_cell.y)
	if horizontal:
		var from_x := mini(start_cell.x, end_cell.x)
		var to_x := maxi(start_cell.x, end_cell.x)
		for x in range(from_x, to_x + 1):
			cells.append(Vector2i(x, start_cell.y))
	else:
		var from_y := mini(start_cell.y, end_cell.y)
		var to_y := maxi(start_cell.y, end_cell.y)
		for y in range(from_y, to_y + 1):
			cells.append(Vector2i(start_cell.x, y))
	return cells


func _road_line_is_valid(cells: Array[Vector2i]) -> bool:
	if cells.is_empty():
		return false
	var has_new_tile := false
	for cell in cells:
		if cell.x < 0 or cell.x >= GRID_SIZE or cell.y < 0 or cell.y >= GRID_SIZE:
			return false
		var key := _cell_key(cell)
		if _reserved_cells.has(key):
			return false
		if _occupied_cells.has(key) and not _road_cells.has(key):
			return false
		if not _road_cells.has(key):
			has_new_tile = true
	return has_new_tile


func _road_start_can_be_selected(cell: Vector2i) -> bool:
	if cell.x < 0 or cell.x >= GRID_SIZE or cell.y < 0 or cell.y >= GRID_SIZE:
		return false
	var key := _cell_key(cell)
	if _reserved_cells.has(key):
		return false
	return not _occupied_cells.has(key) or _road_cells.has(key)


func _place_road_line(road_cells: Array[Vector2i]) -> void:
	var changed_cells: Array[Vector2i] = []
	for road_cell in road_cells:
		var road_key := _cell_key(road_cell)
		if not _road_cells.has(road_key):
			changed_cells.append(road_cell)
	if changed_cells.is_empty():
		_cancel_road_line()
		_refresh_tool_ui()
		_update_hover_from_mouse()
		return

	var road_cost := int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]) * changed_cells.size()
	if _money < road_cost:
		_cancel_road_line()
		_refresh_tool_ui()
		_update_hover_from_mouse()
		return

	for road_cell in changed_cells:
		_mark_road_cell(road_cell)

	var affected_cells: Array[Vector2i] = []
	for road_cell in changed_cells:
		affected_cells.append(road_cell)
		for neighbor in _neighbor_cells(road_cell):
			if _road_cells.has(_cell_key(neighbor)):
				affected_cells.append(neighbor)

	_money -= road_cost
	for road_cell in affected_cells:
		_rebuild_road_at(road_cell)

	var road_anchor := changed_cells[0]
	_register_placement(road_anchor, changed_cells, BUILD_TOOL_ROAD, _road_nodes.get(_cell_key(road_anchor)), road_cost, 1, -1)
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_cancel_road_line()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _update_road_line_preview(cells: Array[Vector2i], valid: bool) -> void:
	_clear_road_line_preview()
	for cell in cells:
		var tile := _build_road_tile_mesh(cell, true, cells)
		tile.position = _cell_to_world(cell)
		if not valid:
			_tint_preview_invalid(tile)
		_hover_root.add_child(tile)
		_road_preview_nodes.append(tile)


func _tint_preview_invalid(node: Node) -> void:
	if node is GeometryInstance3D:
		(node as GeometryInstance3D).material_override = _hover_material_invalid
	for child in node.get_children():
		_tint_preview_invalid(child)


func _pick_grid_cell(mouse_position: Vector2) -> Dictionary:
	var ground_plane := Plane(Vector3.UP, 0.0)
	var ray_origin := camera.project_ray_origin(mouse_position)
	var ray_direction := camera.project_ray_normal(mouse_position)
	var hit: Variant = ground_plane.intersects_ray(ray_origin, ray_direction)
	if hit == null:
		return {}

	var world_hit := hit as Vector3
	var grid_half := float(GRID_SIZE) * 0.5
	var cell_x := int(floor(world_hit.x + grid_half))
	var cell_z := int(floor(world_hit.z + grid_half))
	if cell_x < 0 or cell_x >= GRID_SIZE or cell_z < 0 or cell_z >= GRID_SIZE:
		return {}

	return {
		"cell": Vector2i(cell_x, cell_z),
		"world": world_hit,
	}


func _cell_to_world(cell: Vector2i) -> Vector3:
	var grid_half := float(GRID_SIZE) * 0.5
	return Vector3(float(cell.x) - grid_half + 0.5, 0.0, float(cell.y) - grid_half + 0.5)


func _cell_key(cell: Vector2i) -> String:
	return "%d:%d" % [cell.x, cell.y]


func _try_place_hovered_tile() -> void:
	if not _hover_active:
		return

	if _build_tool != BUILD_TOOL_BULLDOZE and not _hover_can_build:
		return

	if _build_tool == BUILD_TOOL_INSPECT:
		_refresh_tool_ui()
		return

	if _build_tool == BUILD_TOOL_BULLDOZE:
		var hover_key := _cell_key(_hover_anchor)
		if _road_cells.has(hover_key):
			if _bulldoze_visited.has(hover_key):
				return
			_bulldoze_visited[hover_key] = true
			_remove_road_at_cell(_hover_anchor, true)
			return

		var anchor_key := _find_anchor_for_cell(_hover_anchor)
		if anchor_key == "":
			return
		if _bulldoze_visited.has(anchor_key):
			return
		_bulldoze_visited[anchor_key] = true
		_selected_anchor_key = anchor_key
		_remove_selected_placement(true)
		return

	if _build_tool == BUILD_TOOL_ROAD:
		if not _road_line_active:
			if _hover_anchor.x < 0 or _hover_anchor.y < 0 or not _hover_can_build:
				return
			_road_line_active = true
			_road_line_start = _hover_anchor
			_refresh_tool_ui()
			_update_hover_from_mouse()
			return

		var road_end := _hovered_cell
		if road_end.x < 0 or road_end.y < 0:
			return
		var road_cells := _road_line_cells(_road_line_start, road_end)
		if not _road_line_is_valid(road_cells):
			return
		_place_road_line(road_cells)
		return

	var footprint := _footprint_from_cells(_hover_cells)
	var world := _anchor_to_world(_hover_anchor, footprint)
	var cost := int(BUILD_TOOL_COSTS.get(_build_tool, 0))
	if _money < cost:
		return
	var placed: Node3D
	var tier := 1
	var variant := _next_variant_for_tool(_build_tool)
	var variant_id := _property_variant_id_for_seed(_build_tool, variant)
	var frontage_side := _hover_frontage_side
	placed = _spawn_building_for_tool(_build_tool, world, _tool_rotation_y(_build_tool, _hover_anchor, footprint, frontage_side), tier, variant, variant_id)

	_clear_nature_for_cells(_hover_cells)
	_money -= cost
	_register_placement(_hover_anchor, _hover_cells, _build_tool, placed, cost, tier, variant, frontage_side, variant_id)
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_update_hover_from_mouse()
	_refresh_tool_ui()


func _tool_name(tool: String) -> String:
	if BUILD_TOOL_LABELS.has(tool):
		return str(BUILD_TOOL_LABELS[tool])
	if SCENIC_TOOL_SPECS.has(tool):
		return str(SCENIC_TOOL_SPECS[tool].get("label", "Building"))
	return "Building"


func _next_variant_for_tool(tool: String) -> int:
	if tool == BUILD_TOOL_ROAD or not BUILDING_MAX_TIERS.has(tool):
		return -1
	var next_variant := int(_variant_cycle.get(tool, 0))
	var variant_count := maxi(1, _property_variant_ids(tool).size())
	_variant_cycle[tool] = posmod(next_variant + 1, variant_count)
	return next_variant


func _property_variant_ids(tool: String) -> Array:
	if PROPERTY_VARIANT_ORDER.has(tool):
		return (PROPERTY_VARIANT_ORDER[tool] as Array).duplicate()
	if not PROPERTY_VARIANTS.has(tool):
		return []
	var ids := (PROPERTY_VARIANTS[tool] as Dictionary).keys()
	ids.sort()
	return ids


func _property_variant_config(tool: String, variant_id: String) -> Dictionary:
	if variant_id == "" or not PROPERTY_VARIANTS.has(tool):
		return {}
	var variants: Dictionary = PROPERTY_VARIANTS[tool]
	return variants.get(variant_id, {})


func _property_variant_display_name(tool: String, variant_id: String) -> String:
	var config := _property_variant_config(tool, variant_id)
	if config.is_empty():
		return ""
	return str(config.get("variant_name", variant_id.capitalize()))


func _property_variant_id_for_seed(tool: String, variant_seed: int) -> String:
	var ids := _property_variant_ids(tool)
	if ids.is_empty():
		return ""
	return str(ids[posmod(maxi(0, variant_seed), ids.size())])


func _resolve_property_variant_id(tool: String, variant_seed: int, requested_variant_id: String = "") -> String:
	if not _property_variant_config(tool, requested_variant_id).is_empty():
		return requested_variant_id
	return _property_variant_id_for_seed(tool, variant_seed)


func _legacy_variant_seed_for_loaded_placement(tool: String, anchor: Vector2i, saved_variant_seed: int) -> int:
	var ids := _property_variant_ids(tool)
	if ids.is_empty():
		return saved_variant_seed
	var base_seed := maxi(0, saved_variant_seed)
	var anchor_mix := absi(anchor.x * 31 + anchor.y * 17 + tool.length() * 7)
	return posmod(base_seed + anchor_mix, ids.size())


func _property_visual_tier(tier: int) -> int:
	return clamp(tier, 1, 4)


func _property_variant_tier_config(tool: String, variant_id: String, tier: int) -> Dictionary:
	var config := _property_variant_config(tool, variant_id)
	if config.is_empty():
		return {}
	var tiers: Dictionary = config.get("tiers", {})
	var visual_tier := _property_visual_tier(tier)
	return tiers.get(visual_tier, {}).duplicate(true)


func _palette_for_property_variant(tool: String, variant_seed: int, variant_id: String) -> Dictionary:
	var palette := _cozy_palette(tool, variant_seed)
	var config := _property_variant_config(tool, variant_id)
	if config.is_empty():
		return palette
	for key in [
		["wall_color", "wall"],
		["roof_color", "roof"],
		["trim_color", "trim"],
		["accent_color", "accent"],
	]:
		var config_key := str(key[0])
		var palette_key := str(key[1])
		if config.has(config_key):
			palette[palette_key] = Color(str(config[config_key]))
	return palette


func _tool_footprint(tool: String) -> Vector2i:
	if SCENIC_TOOL_SPECS.has(tool):
		return SCENIC_TOOL_SPECS[tool]["footprint"]
	match tool:
		BUILD_TOOL_ROAD, BUILD_TOOL_INSPECT, BUILD_TOOL_BULLDOZE:
			return Vector2i(1, 1)
		BUILD_TOOL_HOUSE:
			return Vector2i(5, 5)
		BUILD_TOOL_FIRE, BUILD_TOOL_GROCERY:
			return Vector2i(5, 4)
		BUILD_TOOL_BANK, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE, BUILD_TOOL_PARK:
			return Vector2i(4, 3)
	return Vector2i(4, 3)


func _footprint_for_hover_cell(tool: String, cell: Vector2i) -> Vector2i:
	var base_footprint := _tool_footprint(tool)
	if base_footprint.x == base_footprint.y or not _tool_requires_road(tool):
		return base_footprint
	var provisional_anchor := _anchor_for_hover_cell(cell, base_footprint)
	return _tool_footprint_for_anchor(tool, provisional_anchor)


func _tool_footprint_for_anchor(tool: String, anchor: Vector2i) -> Vector2i:
	var base_footprint := _tool_footprint(tool)
	if base_footprint.x == base_footprint.y or not _tool_requires_road(tool):
		return base_footprint
	var preferred_side := _preferred_frontage_side(tool, anchor, base_footprint)
	if preferred_side == "east" or preferred_side == "west":
		return Vector2i(base_footprint.y, base_footprint.x)
	return base_footprint


func _resolve_hover_layout(tool: String, cell: Vector2i) -> Dictionary:
	var base_footprint := _tool_footprint(tool)
	if tool == BUILD_TOOL_ROAD or tool == BUILD_TOOL_INSPECT or tool == BUILD_TOOL_BULLDOZE:
		var simple_anchor := _anchor_for_hover_cell(cell, base_footprint)
		return {
			"anchor": simple_anchor,
			"footprint": base_footprint,
			"cells": _cells_for_anchor(simple_anchor, base_footprint),
			"frontage_side": "south",
		}

	if not _tool_requires_road(tool):
		var default_anchor := _anchor_for_hover_cell(cell, base_footprint)
		return {
			"anchor": default_anchor,
			"footprint": base_footprint,
			"cells": _cells_for_anchor(default_anchor, base_footprint),
			"frontage_side": "south",
		}

	var candidate_footprints: Array[Vector2i] = [base_footprint]
	var rotated_footprint := Vector2i(base_footprint.y, base_footprint.x)
	if rotated_footprint != base_footprint:
		candidate_footprints.append(rotated_footprint)

	var best_score := -INF
	var best_layout := {}
	var hover_world := _cell_to_world(cell)
	for footprint in candidate_footprints:
		for ay in range(cell.y - footprint.y + 1, cell.y + 1):
			for ax in range(cell.x - footprint.x + 1, cell.x + 1):
				if ax < 0 or ay < 0 or ax + footprint.x > GRID_SIZE or ay + footprint.y > GRID_SIZE:
					continue
				var anchor := Vector2i(ax, ay)
				var cells := _cells_for_anchor(anchor, footprint)
				if not _cells_are_buildable(cells, tool):
					continue
				var side := _preferred_frontage_side(tool, anchor, footprint)
				if not _placement_has_required_frontage(tool, anchor, footprint, side):
					continue
				var reserved_cells := _property_reserved_cells(anchor, footprint, side, tool)
				if not reserved_cells.is_empty() and not _cells_are_buildable(reserved_cells, tool):
					continue
				var touch := _adjacent_transport_count(tool, anchor, footprint, side)
				var score := _transport_side_score(tool, anchor, footprint, side)
				var frontage_center := _frontage_side_center(anchor, footprint, side)
				var hover_distance := Vector2(hover_world.x, hover_world.z).distance_to(frontage_center)
				var layout_score := float(touch) * 10000.0 + score * 100.0 - hover_distance
				if layout_score > best_score:
					best_score = layout_score
					best_layout = {
						"anchor": anchor,
						"footprint": footprint,
						"cells": cells,
						"frontage_side": side,
					}

	if not best_layout.is_empty():
		return best_layout

	var fallback_footprint := _footprint_for_hover_cell(tool, cell)
	var fallback_anchor := _anchor_for_hover_cell(cell, fallback_footprint)
	return {
		"anchor": fallback_anchor,
		"footprint": fallback_footprint,
		"cells": _cells_for_anchor(fallback_anchor, fallback_footprint),
		"frontage_side": _preferred_frontage_side(tool, fallback_anchor, fallback_footprint),
	}


func _anchor_for_hover_cell(cell: Vector2i, footprint: Vector2i) -> Vector2i:
	return Vector2i(
		clamp(cell.x, 0, GRID_SIZE - footprint.x),
		clamp(cell.y, 0, GRID_SIZE - footprint.y)
	)


func _cells_for_anchor(anchor: Vector2i, footprint: Vector2i) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	for dz in range(footprint.y):
		for dx in range(footprint.x):
			cells.append(Vector2i(anchor.x + dx, anchor.y + dz))
	return cells


func _cells_are_buildable(cells: Array[Vector2i], tool: String = "") -> bool:
	for cell in cells:
		var key := _cell_key(cell)
		if _reserved_cells.has(key):
			return false
		if _occupied_cells.has(key):
			if tool != "" and _is_forest_tool(tool):
				var occupied_tool := str(_occupied_cells[key])
				if _is_forest_tool(occupied_tool):
					continue
			return false
	return true


func _cells_touch_reserved(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		if _reserved_cells.has(_cell_key(cell)):
			return true
	return false


func _property_spacing_margin_for_tool(tool: String) -> int:
	return int(PROPERTY_BUFFER_BY_TOOL.get(tool, 0))


func _property_reserved_cells(anchor: Vector2i, footprint: Vector2i, frontage_side: String, tool: String) -> Array[Vector2i]:
	var margin := _property_spacing_margin_for_tool(tool)
	if margin <= 0:
		return []

	var min_x := maxi(0, anchor.x - margin)
	var max_x := mini(GRID_SIZE - 1, anchor.x + footprint.x + margin - 1)
	var min_y := maxi(0, anchor.y - margin)
	var max_y := mini(GRID_SIZE - 1, anchor.y + footprint.y + margin - 1)
	var reserved: Array[Vector2i] = []

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			if x >= anchor.x and x < anchor.x + footprint.x and y >= anchor.y and y < anchor.y + footprint.y:
				continue
			reserved.append(Vector2i(x, y))
	return reserved


func _cells_touch_road(cells: Array[Vector2i]) -> bool:
	for cell in cells:
		for neighbor in _neighbor_cells(cell):
			if _road_cells.has(_cell_key(neighbor)):
				return true
	return false


func _frontage_transport_offset(tool: String) -> int:
	if tool == BUILD_TOOL_HOUSE:
		return HOUSE_FRONT_BUFFER_CELLS + 1
	if tool in [
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
	]:
		return HOUSE_FRONT_BUFFER_CELLS + 1
	return 2


func _frontage_buffer_cells(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	var buffer_depth := _frontage_transport_offset(tool) - 1
	if buffer_depth <= 0:
		return cells
	match side:
		"north":
			for offset in range(1, buffer_depth + 1):
				for dx in range(footprint.x):
					cells.append(Vector2i(anchor.x + dx, anchor.y - offset))
		"south":
			for offset in range(1, buffer_depth + 1):
				for dx in range(footprint.x):
					cells.append(Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + offset))
		"west":
			for offset in range(1, buffer_depth + 1):
				for dz in range(footprint.y):
					cells.append(Vector2i(anchor.x - offset, anchor.y + dz))
		"east":
			for offset in range(1, buffer_depth + 1):
				for dz in range(footprint.y):
					cells.append(Vector2i(anchor.x + footprint.x - 1 + offset, anchor.y + dz))
	return cells


func _placement_has_required_frontage(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> bool:
	if not _tool_requires_road(tool):
		return true
	for buffer_cell in _frontage_buffer_cells(tool, anchor, footprint, side):
		if buffer_cell.x < 0 or buffer_cell.y < 0 or buffer_cell.x >= GRID_SIZE or buffer_cell.y >= GRID_SIZE:
			return false
		var buffer_key := _cell_key(buffer_cell)
		if _occupied_cells.has(buffer_key) or _reserved_cells.has(buffer_key) or _road_cells.has(buffer_key):
			return false
	return _adjacent_transport_count(tool, anchor, footprint, side) > 0


func _tool_requires_road(tool: String) -> bool:
	return tool in [
		BUILD_TOOL_HOUSE,
		BUILD_TOOL_FIRE,
		BUILD_TOOL_BANK,
		BUILD_TOOL_GROCERY,
		BUILD_TOOL_RESTAURANT,
		BUILD_TOOL_CORNER_STORE,
	]


func _is_forest_tool(tool: String) -> bool:
	return tool in [
		BUILD_TOOL_FOREST_SMALL,
		BUILD_TOOL_FOREST_MEDIUM,
		BUILD_TOOL_FOREST_LARGE,
	]


func _anchor_to_world(anchor: Vector2i, footprint: Vector2i) -> Vector3:
	var min_world := _cell_to_world(anchor)
	return min_world + Vector3(float(footprint.x - 1) * 0.5, 0.0, float(footprint.y - 1) * 0.5)


func _update_hover_tiles(cells: Array[Vector2i], valid: bool) -> void:
	while _hover_tiles.size() < cells.size():
		var tile := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.92, 0.05, 0.92)
		tile.mesh = mesh
		tile.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_hover_root.add_child(tile)
		_hover_tiles.append(tile)
	for i in range(_hover_tiles.size()):
		var tile := _hover_tiles[i]
		if i < cells.size():
			tile.visible = true
			tile.position = _cell_to_world(cells[i]) + Vector3(0.0, 0.06, 0.0)
			tile.material_override = _hover_material_valid if valid else _hover_material_invalid
		else:
			tile.visible = false


func _clear_hover_tiles() -> void:
	for tile in _hover_tiles:
		tile.visible = false


func _mark_cells(cells: Array[Vector2i], tool: String, node: Node3D) -> void:
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells[key] = tool
		_placed_nodes[key] = node


func _register_placement(anchor: Vector2i, cells: Array[Vector2i], tool: String, node: Node3D, cost: int, tier: int = 1, variant: int = -1, frontage_side: String = "", variant_id: String = "") -> void:
	var anchor_key := _cell_key(anchor)
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	if is_instance_valid(node):
		node.set_meta("variant_id", resolved_variant_id)
		node.set_meta("variant_architecture_version", PROPERTY_VARIANT_ARCHITECTURE_VERSION)
	_upgrade_debug("register placement anchor=%s tool=%s tier=%d variant=%d variant_id=%s frontage=%s cost=%d cells=%s node=%s" % [
		anchor_key, tool, tier, variant, resolved_variant_id, frontage_side, cost, str(cells), str(node)
	])
	_placements[anchor_key] = {
		"anchor": anchor,
		"cells": cells.duplicate(),
		"tool": tool,
		"node": node,
		"cost": cost,
		"tier": tier,
		"variant": variant,
		"variant_id": resolved_variant_id,
		"variant_architecture_version": PROPERTY_VARIANT_ARCHITECTURE_VERSION,
		"frontage_side": frontage_side,
	}
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells[key] = tool
		_placed_nodes[key] = node
		_cell_anchor_lookup[key] = anchor_key
	for cell in _property_reserved_cells(anchor, _footprint_from_cells(cells), frontage_side, tool):
		var reserved_key := _cell_key(cell)
		if not _occupied_cells.has(reserved_key):
			_reserved_cells[reserved_key] = tool
	_action_history.append({
		"type": "place",
		"anchor_key": anchor_key,
		"money": cost,
		"variant_id": resolved_variant_id,
		"frontage_side": frontage_side,
	})
	_set_selected_anchor(anchor_key)
	_upgrade_debug("register placement selected=%s selection_cells=%s" % [_selected_anchor_key, str(_selection_cells)])
	_refresh_road_lights()


func _find_anchor_for_cell(cell: Vector2i) -> String:
	return _cell_anchor_lookup.get(_cell_key(cell), "")


func _cancel_tool_and_select_at_mouse(mouse_position: Vector2) -> void:
	var pick := _pick_grid_cell(mouse_position)
	if pick.is_empty():
		_clear_selected_anchor()
		_set_build_tool(BUILD_TOOL_INSPECT)
		if _hint_label:
			_hint_label.text = "Build tool cancelled."
		return

	var cell: Vector2i = pick["cell"]
	var found_anchor := _find_anchor_for_cell(cell)
	_set_build_tool(BUILD_TOOL_INSPECT)
	if found_anchor != "":
		_set_selected_anchor(found_anchor)
		if _hint_label:
			_hint_label.text = "%s selected. Left click to inspect or switch tools to build again." % _tool_name(_placements[found_anchor]["tool"])
	else:
		_set_selected_tile(cell)
		if _hint_label:
			_hint_label.text = "Tile %d, %d selected. Build tool cancelled." % [cell.x + 1, cell.y + 1]
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _anchor_key_to_cell(anchor_key: String) -> Vector2i:
	var parts := anchor_key.split(":")
	return Vector2i(parts[0].to_int(), parts[1].to_int())


func _placement_cells(anchor_key: String) -> Array[Vector2i]:
	if not _placements.has(anchor_key):
		return []
	return _placements[anchor_key]["cells"]


func _footprint_from_cells(cells: Array[Vector2i]) -> Vector2i:
	if cells.is_empty():
		return Vector2i(1, 1)
	var min_x := cells[0].x
	var max_x := cells[0].x
	var min_y := cells[0].y
	var max_y := cells[0].y
	for cell in cells:
		min_x = mini(min_x, cell.x)
		max_x = maxi(max_x, cell.x)
		min_y = mini(min_y, cell.y)
		max_y = maxi(max_y, cell.y)
	return Vector2i(max_x - min_x + 1, max_y - min_y + 1)


func _set_selected_anchor(anchor_key: String) -> void:
	if _selected_anchor_key == anchor_key and _selected_tile == Vector2i(-1, -1):
		return
	_selected_anchor_key = anchor_key
	_selected_tile = Vector2i(-1, -1)
	_selection_cells = _placement_cells(anchor_key)
	_refresh_tool_ui()


func _set_selected_tile(cell: Vector2i) -> void:
	if _selected_anchor_key == "" and _selected_tile == cell:
		return
	_selected_anchor_key = ""
	_selected_tile = cell
	_selection_cells = [cell]
	_refresh_tool_ui()


func _clear_selected_anchor() -> void:
	if _selected_anchor_key == "" and _selected_tile == Vector2i(-1, -1) and _selection_cells.is_empty():
		return
	_selected_anchor_key = ""
	_selected_tile = Vector2i(-1, -1)
	_selection_cells.clear()
	_refresh_tool_ui()


func _upgrade_debug(message: String) -> void:
	if DEBUG_UPGRADES:
		print("[UPGRADE] ", message)


func _placement_debug_string(placement: Dictionary) -> String:
	if placement.is_empty():
		return "<empty>"
	var anchor: Vector2i = placement.get("anchor", Vector2i(-1, -1))
	var tool: String = str(placement.get("tool", ""))
	var tier: int = int(placement.get("tier", 1))
	var cost: int = int(placement.get("cost", 0))
	var variant: int = int(placement.get("variant", -1))
	var variant_id: String = str(placement.get("variant_id", ""))
	var frontage_side: String = str(placement.get("frontage_side", ""))
	return "anchor=%s tool=%s tier=%d cost=%d variant=%d variant_id=%s frontage=%s" % [
		str(anchor),
		tool,
		tier,
		cost,
		variant,
		variant_id,
		frontage_side,
	]


func _can_upgrade_selected_property() -> bool:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("can_upgrade -> false (no selected placement) selected=%s" % _selected_anchor_key)
		return false
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	if not PropertyUpgradeData.is_upgradeable(tool):
		_upgrade_debug("can_upgrade -> false (tool not upgradeable) tool=%s placement=%s" % [tool, _placement_debug_string(placement)])
		return false
	var tier := int(placement.get("tier", 1))
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	if tier >= max_tier:
		_upgrade_debug("can_upgrade -> false (already max tier) tool=%s tier=%d max=%d placement=%s" % [tool, tier, max_tier, _placement_debug_string(placement)])
		return false
	var cost := _selected_upgrade_cost()
	var allowed := cost > 0 and _money >= cost
	_upgrade_debug("can_upgrade check tool=%s tier=%d max=%d cost=%d money=%d allowed=%s placement=%s" % [
		tool, tier, max_tier, cost, _money, str(allowed), _placement_debug_string(placement)
	])
	return allowed


func _selected_upgrade_cost() -> int:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("selected_upgrade_cost -> -1 (no selected placement) selected=%s" % _selected_anchor_key)
		return -1
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	var tier := int(placement.get("tier", 1))
	var cost := PropertyUpgradeData.upgrade_cost(int(placement["cost"]), tool, tier)
	_upgrade_debug("selected_upgrade_cost tool=%s current_tier=%d base_cost=%d cost=%d placement=%s" % [
		tool, tier, int(placement["cost"]), cost, _placement_debug_string(placement)
	])
	return cost


func _upgrade_selected_property() -> void:
	_upgrade_debug("upgrade_pressed signal received selected=%s" % _selected_anchor_key)
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("upgrade aborted (no selected placement)")
		return
	var placement: Dictionary = _placements[_selected_anchor_key]
	var tool := str(placement["tool"])
	_upgrade_debug("upgrade target tool=%s placement=%s" % [tool, _placement_debug_string(placement)])
	if not PropertyUpgradeData.is_upgradeable(tool):
		_upgrade_debug("upgrade aborted (tool not upgradeable) tool=%s" % tool)
		if _hint_label:
			_hint_label.text = "%s cannot be upgraded." % _tool_name(tool)
		return
	var current_tier := int(placement.get("tier", 1))
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	_upgrade_debug("upgrade tier state tool=%s current=%d max=%d" % [tool, current_tier, max_tier])
	if current_tier >= max_tier:
		_upgrade_debug("upgrade aborted (already max tier) tool=%s tier=%d max=%d" % [tool, current_tier, max_tier])
		if _hint_label:
			_hint_label.text = "%s is already at the top tier." % _tool_name(tool)
		return
	var upgrade_cost := _selected_upgrade_cost()
	_upgrade_debug("upgrade cost check tool=%s current_tier=%d upgrade_cost=%d money=%d" % [tool, current_tier, upgrade_cost, _money])
	if upgrade_cost <= 0 or _money < upgrade_cost:
		_upgrade_debug("upgrade aborted (cannot afford or invalid cost) tool=%s cost=%d money=%d" % [tool, upgrade_cost, _money])
		if _hint_label:
			_hint_label.text = "Not enough money to upgrade %s. You need $%d." % [_tool_name(tool).to_lower(), max(0, upgrade_cost)]
		return

	var anchor_key := _selected_anchor_key
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	var variant := int(placement.get("variant", -1))
	var variant_id := _resolve_property_variant_id(tool, variant, str(placement.get("variant_id", "")))
	var frontage_side := str(placement.get("frontage_side", ""))
	var base_cost := int(placement["cost"])
	var next_tier := current_tier + 1
	var existing_node := placement.get("node") as Node3D

	_upgrade_debug("upgrade begin anchor=%s tool=%s current_tier=%d next_tier=%d variant=%d frontage=%s cells=%s" % [
		anchor_key, tool, current_tier, next_tier, variant, frontage_side, str(cells)
	])
	_money -= upgrade_cost
	_upgrade_debug("upgrade money deducted cost=%d remaining=%d" % [upgrade_cost, _money])
	if (tool == BUILD_TOOL_HOUSE or tool == BUILD_TOOL_FIRE or tool == BUILD_TOOL_BANK or tool == BUILD_TOOL_GROCERY or tool == BUILD_TOOL_RESTAURANT or tool == BUILD_TOOL_CORNER_STORE) and is_instance_valid(existing_node):
		var before_global := existing_node.global_position
		var before_rotation := existing_node.global_rotation_degrees
		if tool == BUILD_TOOL_HOUSE:
			_rebuild_house_visuals_in_place(existing_node, next_tier, variant, variant_id)
		elif tool == BUILD_TOOL_FIRE:
			_rebuild_fire_visuals_in_place(existing_node, next_tier, variant, variant_id)
		else:
			_rebuild_service_visuals_in_place(existing_node, tool, next_tier, variant, variant_id)
		var after_global := existing_node.global_position
		var after_rotation := existing_node.global_rotation_degrees
		placement["node"] = existing_node
		placement["tier"] = next_tier
		placement["variant"] = variant
		placement["variant_id"] = variant_id
		placement["frontage_side"] = frontage_side
		_placements[anchor_key] = placement
		print("[%s UPGRADE VERIFY] anchor=%s before_pos=%s after_pos=%s before_rot=%s after_rot=%s identical_pos=%s identical_rot=%s" % [
			"FIRE" if tool == BUILD_TOOL_FIRE else "BANK" if tool == BUILD_TOOL_BANK else "GROCERY" if tool == BUILD_TOOL_GROCERY else "RESTAURANT" if tool == BUILD_TOOL_RESTAURANT else "CORNER",
			anchor_key,
			str(before_global),
			str(after_global),
			str(before_rotation),
			str(after_rotation),
			str(before_global.is_equal_approx(after_global)),
			str(before_rotation.is_equal_approx(after_rotation))
		])
		_upgrade_debug("upgrade rebuilt %s in place anchor=%s tier=%d" % [
			tool,
			anchor_key,
			next_tier
		])
	else:
		_remove_selected_placement(false, false)
		_upgrade_debug("upgrade after remove money=%d selected=%s placement_exists=%s" % [
			_money,
			_selected_anchor_key,
			str(_placements.has(anchor_key))
		])
		var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(tool, anchor, _footprint_from_cells(cells), frontage_side), next_tier, variant, variant_id)
		_upgrade_debug("upgrade spawned node=%s next_tier=%d" % [str(node), next_tier])
		_register_placement(anchor, cells, tool, node, base_cost, next_tier, variant, frontage_side, variant_id)
		_upgrade_debug("upgrade registered placement anchor=%s selected_now=%s placement=%s" % [
			anchor_key,
			_selected_anchor_key,
			_placement_debug_string(_placements.get(anchor_key, {}))
		])
		if _selected_anchor_key != anchor_key:
			_set_selected_anchor(anchor_key)
			_upgrade_debug("upgrade restored selection anchor=%s" % anchor_key)
	_action_history.append({
		"type": "upgrade",
		"anchor_key": anchor_key,
		"tool": tool,
		"from_tier": current_tier,
		"to_tier": next_tier,
		"cost": upgrade_cost,
		"base_cost": base_cost,
		"variant": variant,
		"variant_id": variant_id,
		"frontage_side": frontage_side,
	})
	_upgrade_debug("upgrade action recorded from=%d to=%d cost=%d base_cost=%d" % [current_tier, next_tier, upgrade_cost, base_cost])
	_recalculate_cashflow()
	_upgrade_debug("upgrade cashflow recalculated cashflow=%d money=%d" % [_cashflow_per_day, _money])
	_rebuild_ambient_life()
	_upgrade_debug("upgrade ambient life rebuilt")
	_refresh_tool_ui()
	_upgrade_debug("upgrade complete selected=%s can_upgrade=%s button_disabled=%s" % [
		_selected_anchor_key,
		str(_can_upgrade_selected_property()),
		str(_upgrade_button.disabled if _upgrade_button else false)
	])
	if _hint_label:
		_hint_label.text = "%s upgraded to tier %d." % [_tool_name(tool), next_tier]


func _selection_name() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		if _selected_tile.x >= 0 and _selected_tile.y >= 0:
			return "tile"
		return "nothing"
	return _tool_name(_placements[_selected_anchor_key]["tool"]).to_lower()


func _selection_text() -> String:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		if _selected_tile.x >= 0 and _selected_tile.y >= 0:
			return "Selection: tile  |  Grid: %d,%d  |  Empty land ready for roads, homes, or civic buildings." % [_selected_tile.x + 1, _selected_tile.y + 1]
		return "Selection: none  |  Start with roads, then place homes and town buildings off the road network."
	var placement: Dictionary = _placements[_selected_anchor_key]
	var cells: Array[Vector2i] = placement["cells"]
	var footprint := _footprint_from_cells(cells)
	var road_status := "Road Access: yes" if _cells_touch_road(cells) else "Road Access: no"
	var tool := str(placement["tool"])
	var tier := int(placement.get("tier", 1))
	var variant_id := _resolve_property_variant_id(tool, int(placement.get("variant", -1)), str(placement.get("variant_id", "")))
	var variant_name := _property_variant_display_name(tool, variant_id)
	var max_tier: int = PropertyUpgradeData.max_tier(tool)
	var upgrade_text := "Upgrade: maxed"
	if tier < max_tier:
		upgrade_text = "Upgrade: $%d" % _selected_upgrade_cost()
	var display_name := _tool_name(tool)
	if variant_name != "":
		display_name = "%s (%s)" % [display_name, variant_name]
	return "Selection: %s  |  Tier: %d/%d  |  Footprint: %dx%d  |  Build Cost: $%d  |  %s  |  %s" % [
		display_name,
		tier,
		max_tier,
		footprint.x,
		footprint.y,
		int(placement["cost"]),
		road_status,
		upgrade_text
	]


func _build_stats_text() -> String:
	var homes := 0
	var shops := 0
	var civics := 0
	var parks := 0
	var population := 0
	var jobs := 0
	var appeal := 0
	var net_cashflow := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		var tier := int(_placements[anchor_key].get("tier", 1))
		var yield_data: Dictionary = PropertyUpgradeData.tier_yield(tool, tier)
		population += int(yield_data.get("population", 0))
		jobs += int(yield_data.get("jobs", 0))
		appeal += int(yield_data.get("appeal", 0))
		net_cashflow += int(yield_data.get("cashflow", 0))
		if tool == BUILD_TOOL_HOUSE:
			homes += 1
		elif tool in [BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE]:
			shops += 1
		elif tool == BUILD_TOOL_FIRE:
			civics += 1
		elif tool == BUILD_TOOL_PARK:
			parks += 1
	return "Day %d  |  Money: $%d  |  +$%d/day  |  Pop: %d  |  Jobs: %d  |  Homes: %d  |  Shops: %d  |  Civic: %d  |  Parks: %d  |  Appeal: %d  |  Roads: %d" % [_day, _money, net_cashflow, population, jobs, homes, shops, civics, parks, appeal, _road_cells.size()]


func _recalculate_cashflow() -> void:
	var net_cashflow := 0
	for anchor_key in _placements.keys():
		var tool: String = _placements[anchor_key]["tool"]
		var tier := int(_placements[anchor_key].get("tier", 1))
		net_cashflow += int(PropertyUpgradeData.tier_yield(tool, tier).get("cashflow", 0))
	_cashflow_per_day = net_cashflow - _road_cells.size() * 1


func _update_simulation(delta: float) -> void:
	_simulation_clock += delta
	if _simulation_clock >= 7.5:
		_simulation_clock = 0.0
		_day += 1
		_recalculate_cashflow()
		_money = max(0, _money + _cashflow_per_day)
		_refresh_tool_ui()


func _is_fullscreen() -> bool:
	var current_mode := DisplayServer.window_get_mode()
	return current_mode == DisplayServer.WINDOW_MODE_FULLSCREEN or current_mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN


func _remove_selected_placement(refund: bool, record_action: bool = true) -> void:
	if _selected_anchor_key == "" or not _placements.has(_selected_anchor_key):
		_upgrade_debug("remove selected placement skipped selected=%s has=%s" % [_selected_anchor_key, str(_placements.has(_selected_anchor_key))])
		return
	var anchor_key := _selected_anchor_key
	var placement = _placements[anchor_key]
	var tool: String = placement["tool"]
	var cells: Array[Vector2i] = placement["cells"]
	var node: Node3D = placement["node"]
	var road_neighbors: Array[Vector2i] = []
	var refund_amount := int(round(float(placement["cost"]) * 0.7)) if refund else 0
	_upgrade_debug("remove selected placement anchor=%s tool=%s refund=%s refund_amount=%d placement=%s" % [
		anchor_key, tool, str(refund), refund_amount, _placement_debug_string(placement)
	])
	if refund:
		_money += refund_amount
	if tool == BUILD_TOOL_ROAD:
		for cell in cells:
			for neighbor in _neighbor_cells(cell):
				if _road_cells.has(_cell_key(neighbor)):
					road_neighbors.append(neighbor)
			var road_key := _cell_key(cell)
			_road_cells.erase(road_key)
			if _road_nodes.has(road_key):
				var road_node: Node3D = _road_nodes[road_key]
				if is_instance_valid(road_node):
					road_node.queue_free()
				_road_nodes.erase(road_key)
	else:
		if is_instance_valid(node):
			node.queue_free()
	for cell in _property_reserved_cells(
		placement["anchor"],
		_footprint_from_cells(cells),
		str(placement.get("frontage_side", "")),
		tool
	):
		_reserved_cells.erase(_cell_key(cell))
	for cell in cells:
		var key := _cell_key(cell)
		_occupied_cells.erase(key)
		_placed_nodes.erase(key)
		_cell_anchor_lookup.erase(key)
	_placements.erase(anchor_key)
	if record_action:
		_action_history.append({
			"type": "remove",
			"anchor_key": anchor_key,
			"tool": tool,
			"cells": cells.duplicate(),
			"cost": int(placement["cost"]),
			"refund": refund_amount,
			"tier": int(placement.get("tier", 1)),
			"variant": int(placement.get("variant", -1)),
			"variant_id": str(placement.get("variant_id", "")),
			"variant_architecture_version": int(placement.get("variant_architecture_version", PROPERTY_VARIANT_ARCHITECTURE_VERSION)),
			"frontage_side": str(placement.get("frontage_side", "")),
		})
	if tool == BUILD_TOOL_ROAD:
		for neighbor in road_neighbors:
			if _road_cells.has(_cell_key(neighbor)):
				_rebuild_road_at(neighbor)
	_clear_selected_anchor()
	_upgrade_debug("remove selected placement complete selected=%s money=%d" % [_selected_anchor_key, _money])
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _remove_road_at_cell(cell: Vector2i, refund: bool, record_action: bool = true) -> void:
	var road_key := _cell_key(cell)
	if not _road_cells.has(road_key):
		return

	var anchor_key := _find_anchor_for_cell(cell)
	if anchor_key != "" and _placements.has(anchor_key):
		_selected_anchor_key = anchor_key
		_remove_selected_placement(refund, record_action)
		return

	var road_neighbors: Array[Vector2i] = []
	for neighbor in _neighbor_cells(cell):
		if _road_cells.has(_cell_key(neighbor)):
			road_neighbors.append(neighbor)

	var refund_amount := int(round(float(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]) * 0.7)) if refund else 0
	if refund:
		_money += refund_amount

	_road_cells.erase(road_key)
	if _road_nodes.has(road_key):
		var road_node: Node3D = _road_nodes[road_key]
		if is_instance_valid(road_node):
			road_node.queue_free()
		_road_nodes.erase(road_key)

	_occupied_cells.erase(road_key)
	_placed_nodes.erase(road_key)
	_cell_anchor_lookup.erase(road_key)
	_placements.erase(road_key)

	if record_action:
		_action_history.append({
			"type": "remove",
			"anchor_key": road_key,
			"tool": BUILD_TOOL_ROAD,
			"cells": [cell],
			"cost": int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]),
			"refund": refund_amount,
			"tier": 1,
			"variant": -1,
		})

	for neighbor in road_neighbors:
		if _road_cells.has(_cell_key(neighbor)):
			_rebuild_road_at(neighbor)
	_clear_selected_anchor()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()


func _undo_last_action() -> void:
	if _action_history.is_empty():
		return
	var action = _action_history.pop_back()
	if action["type"] == "place":
		var anchor_key: String = action["anchor_key"]
		if _placements.has(anchor_key):
			_selected_anchor_key = anchor_key
			_remove_selected_placement(false, false)
			_money += int(action["money"])
	elif action["type"] == "remove":
		_money -= int(action["refund"])
		var anchor: Vector2i = _anchor_key_to_cell(action["anchor_key"])
		var cells: Array[Vector2i] = action["cells"]
		if action["tool"] == BUILD_TOOL_ROAD:
			for cell in cells:
				_mark_road_cell(cell)
				_rebuild_road_at(cell)
				for neighbor in _neighbor_cells(cell):
					if _road_cells.has(_cell_key(neighbor)):
						_rebuild_road_at(neighbor)
			_register_placement(anchor, cells, action["tool"], _road_nodes.get(_cell_key(anchor)), int(action["cost"]), 1, -1)
		else:
			var tier := int(action.get("tier", 1))
			var variant := int(action.get("variant", -1))
			var variant_id := _resolve_property_variant_id(str(action["tool"]), variant, str(action.get("variant_id", "")))
			var frontage_side := str(action.get("frontage_side", ""))
			var node := _spawn_building_for_tool(action["tool"], _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(action["tool"], anchor, _footprint_from_cells(cells), frontage_side), tier, variant, variant_id)
			_register_placement(anchor, cells, action["tool"], node, int(action["cost"]), tier, variant, frontage_side, variant_id)
	elif action["type"] == "upgrade":
		_money += int(action["cost"])
		var anchor_key := str(action["anchor_key"])
		if _placements.has(anchor_key):
			_selected_anchor_key = anchor_key
			var placement: Dictionary = _placements[anchor_key]
			var tool := str(placement["tool"])
			var variant := int(placement.get("variant", -1))
			var variant_id := _resolve_property_variant_id(tool, variant, str(placement.get("variant_id", action.get("variant_id", ""))))
			var frontage_side := str(placement.get("frontage_side", ""))
			var from_tier := int(action.get("from_tier", 1))
			if (tool == BUILD_TOOL_HOUSE or tool == BUILD_TOOL_FIRE or tool == BUILD_TOOL_BANK or tool == BUILD_TOOL_GROCERY or tool == BUILD_TOOL_RESTAURANT or tool == BUILD_TOOL_CORNER_STORE) and is_instance_valid(placement.get("node") as Node3D):
				var node := placement.get("node") as Node3D
				if tool == BUILD_TOOL_HOUSE:
					_rebuild_house_visuals_in_place(node, from_tier, variant, variant_id)
				elif tool == BUILD_TOOL_FIRE:
					_rebuild_fire_visuals_in_place(node, from_tier, variant, variant_id)
				else:
					_rebuild_service_visuals_in_place(node, tool, from_tier, variant, variant_id)
				placement["tier"] = from_tier
				placement["variant"] = variant
				placement["variant_id"] = variant_id
				placement["frontage_side"] = frontage_side
				_placements[anchor_key] = placement
			else:
				var anchor: Vector2i = placement["anchor"]
				var cells: Array[Vector2i] = placement["cells"]
				_remove_selected_placement(false, false)
				var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, _footprint_from_cells(cells)), _tool_rotation_y(tool, anchor, _footprint_from_cells(cells), frontage_side), from_tier, variant, variant_id)
				_register_placement(anchor, cells, tool, node, int(action.get("base_cost", placement.get("cost", 0))), from_tier, variant, frontage_side, variant_id)
		if not _action_history.is_empty():
			_action_history.pop_back()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_tool_ui()


func _mark_road_cell(cell: Vector2i) -> void:
	var key := _cell_key(cell)
	_road_cells[key] = true
	_occupied_cells[key] = BUILD_TOOL_ROAD
	_clear_nature_for_cells([cell])


func _neighbor_cells(cell: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(cell.x, cell.y - 1),
		Vector2i(cell.x + 1, cell.y),
		Vector2i(cell.x, cell.y + 1),
		Vector2i(cell.x - 1, cell.y),
	]


func _add_tool_button(container: HBoxContainer, tool: String, label: String, width: float) -> void:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(width, 0)
	button.pressed.connect(_set_build_tool.bind(tool))
	container.add_child(button)
	_tool_buttons[tool] = button


func _spawn_tool_preview(tool: String) -> Node3D:
	if tool == BUILD_TOOL_INSPECT or tool == BUILD_TOOL_BULLDOZE:
		return Node3D.new()
	if tool == BUILD_TOOL_ROAD:
		return _build_road_tile_mesh(Vector2i.ZERO, true, [Vector2i(0, 0)])
	if tool == BUILD_TOOL_HOUSE:
		return _spawn_house_tile(Vector3.ZERO, true)
	if tool == BUILD_TOOL_PARK:
		return _spawn_park_preview()
	if SCENIC_TOOL_SPECS.has(tool):
		return _spawn_scenic_preview(tool)

	return _spawn_generic_building_preview(tool)


func _spawn_park_preview() -> Node3D:
	var root := Node3D.new()
	var lawn_material := _ghost_base_material
	var path_material := _ghost_accent_material
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(1.82, 0.04, 1.82), lawn_material, root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(1.54, 0.03, 0.26), path_material, root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.26, 0.03, 1.54), path_material, root)
	_add_local_sphere(Vector3(-0.42, 0.22, -0.32), 0.18, 0.22, _ghost_accent_material, root)
	_add_local_sphere(Vector3(0.42, 0.22, 0.32), 0.18, 0.22, _ghost_accent_material, root)
	return root


func _spawn_scenic_preview(tool: String) -> Node3D:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var root := Node3D.new()
	var label := str(spec.get("kind", ""))
	if label == "pond":
		var water_size: Vector2 = spec.get("water_size", Vector2(4.6, 3.6))
		var shore_size: Vector2 = spec.get("shore_size", Vector2(5.5, 4.4))
		_add_organic_pond_layer_local(Vector3(0.0, 0.02, 0.0), shore_size, 0.04, _ghost_base_material, root, 0.0)
		_add_organic_pond_layer_local(Vector3(0.0, 0.05, 0.0), water_size, 0.03, _ghost_accent_material, root, 8.0)
		_add_organic_pond_highlights_local(water_size, root, true)
		return root
	if label == "forest":
		_add_box(Vector3(0.0, 0.02, 0.0), Vector3(2.1, 0.04, 2.1), _ghost_base_material, root)
		for tree_pos in [
			Vector3(-0.58, 0.0, -0.48),
			Vector3(0.12, 0.0, -0.7),
			Vector3(0.72, 0.0, -0.18),
			Vector3(-0.78, 0.0, 0.46),
			Vector3(0.3, 0.0, 0.54),
		]:
			_add_local_tree(tree_pos, root)
		_add_box(Vector3(-0.54, 0.06, 0.62), Vector3(0.12, 0.2, 0.12), _ghost_accent_material, root)
		_add_box(Vector3(0.52, 0.06, 0.32), Vector3(0.12, 0.2, 0.12), _ghost_accent_material, root)
		return root
	return root


func _spawn_generic_building_preview(tool: String) -> Node3D:
	var root := Node3D.new()
	var pad_material := _ghost_base_material
	var wall_material := _ghost_base_material
	var accent_material := _ghost_accent_material
	var body_size := Vector3(1.38, 0.88, 1.18)
	var roof_size := Vector3(1.52, 0.18, 1.3)

	match tool:
		BUILD_TOOL_FIRE:
			body_size = Vector3(1.58, 0.96, 1.34)
			roof_size = Vector3(1.72, 0.18, 1.44)
		BUILD_TOOL_BANK:
			body_size = Vector3(1.42, 0.86, 1.14)
			roof_size = Vector3(1.58, 0.18, 1.28)
		BUILD_TOOL_GROCERY:
			body_size = Vector3(1.66, 0.82, 1.36)
			roof_size = Vector3(1.78, 0.16, 1.46)
		BUILD_TOOL_RESTAURANT:
			body_size = Vector3(1.52, 0.84, 1.24)
			roof_size = Vector3(1.7, 0.18, 1.4)
		BUILD_TOOL_CORNER_STORE:
			body_size = Vector3(1.36, 0.8, 1.08)
			roof_size = Vector3(1.5, 0.16, 1.22)

	_add_box(Vector3(0.0, 0.02, 0.1), Vector3(1.8, 0.04, 1.6), pad_material, root)
	_add_soft_block(Vector3(0.0, body_size.y * 0.5 + 0.05, 0.0), body_size, wall_material, root, 0.14)
	_add_gabled_roof(Vector3(0.0, body_size.y + 0.16, 0.0), roof_size, accent_material, root, 9.0)
	_add_round_canopy(Vector3(0.0, 0.34, body_size.z * 0.56), Vector3(body_size.x * 0.74, 0.12, 0.18), accent_material, root)
	return root


func _spawn_building_for_tool(tool: String, world_position: Vector3, rotation_y: float, tier: int = 1, variant: int = -1, variant_id: String = "") -> Node3D:
	if variant < 0:
		variant = randi() % 10
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	tier = clamp(tier, 1, PropertyUpgradeData.max_tier(tool))
	_upgrade_debug("spawn building tool=%s tier=%d variant=%d variant_id=%s world=%s rot=%.2f" % [tool, tier, variant, resolved_variant_id, str(world_position), rotation_y])
	var node: Node3D
	match tool:
		BUILD_TOOL_HOUSE:
			node = _add_village_house_variant(world_position, variant, resolved_variant_id)
		BUILD_TOOL_FIRE:
			node = _add_fire_station_variant(world_position, variant)
		BUILD_TOOL_BANK:
			node = _add_bank_variant(world_position, variant)
		BUILD_TOOL_GROCERY:
			node = _add_grocery_variant(world_position, variant)
		BUILD_TOOL_RESTAURANT:
			node = _add_restaurant_variant(world_position, variant)
		BUILD_TOOL_CORNER_STORE:
			node = _add_corner_store_variant(world_position, variant)
		BUILD_TOOL_PARK:
			node = _add_park_variant(world_position, variant)
		BUILD_TOOL_POND_SMALL, BUILD_TOOL_POND_MEDIUM, BUILD_TOOL_POND_LARGE:
			node = _add_pond_variant(tool, world_position, variant)
		BUILD_TOOL_FOREST_SMALL, BUILD_TOOL_FOREST_MEDIUM, BUILD_TOOL_FOREST_LARGE:
			node = _add_forest_variant(tool, world_position, variant)
		_:
			node = _spawn_house_tile(world_position, false)
	node.rotation_degrees.y = rad_to_deg(rotation_y)
	if _tool_requires_road(tool):
		var lot_setback := 0.0
		var setback := 0.0
		if tool != BUILD_TOOL_HOUSE:
			var lot_root := _property_lot_root(node)
			lot_setback = float(PROPERTY_LOT_SETBACK_BY_TOOL.get(tool, 0.0))
			if lot_setback > 0.0:
				lot_root.translate_object_local(Vector3(0.0, 0.0, -lot_setback))
			setback = float(PROPERTY_FRONT_SETBACK_BY_TOOL.get(tool, PROPERTY_FRONT_SETBACK))
			var structure_root := _property_structure_root(node)
			structure_root.translate_object_local(Vector3(0.0, 0.0, -setback))
		_upgrade_debug("spawn building tool=%s applied lot_setback=%.2f structure_setback=%.2f" % [tool, lot_setback, setback])
	_apply_property_tier_visuals(node, tool, tier, variant, resolved_variant_id)
	node.set_meta("tier", tier)
	node.set_meta("variant", variant)
	node.set_meta("variant_id", resolved_variant_id)
	_upgrade_debug("spawn building complete node=%s tier_meta=%d variant_meta=%d variant_id_meta=%s" % [str(node), int(node.get_meta("tier", -1)), int(node.get_meta("variant", -1)), str(node.get_meta("variant_id", ""))])
	return node


func _create_property_roots(position_3d: Vector3) -> Dictionary:
	var root := Node3D.new()
	root.name = "PropertyLotRoot"
	root.position = position_3d
	building_root.add_child(root)

	var lot_root := Node3D.new()
	lot_root.name = "LotRoot"
	root.add_child(lot_root)

	var structure_root := Node3D.new()
	structure_root.name = "StructureRoot"
	root.add_child(structure_root)

	return {
		"root": root,
		"lot": lot_root,
		"structure": structure_root,
	}


func _property_lot_root(root: Node3D) -> Node3D:
	var lot_root := root.get_node_or_null("LotRoot") as Node3D
	return lot_root if lot_root != null else root


func _property_structure_root(root: Node3D) -> Node3D:
	var structure_root := root.get_node_or_null("StructureRoot") as Node3D
	return structure_root if structure_root != null else root


func _property_building_anchor(root: Node3D) -> Node3D:
	var structure_root := _property_structure_root(root)
	return _ensure_visual_section(structure_root, "BuildingAnchor")


func _property_upgrade_visual_root(root: Node3D) -> Node3D:
	var building_anchor := _property_building_anchor(root)
	return _ensure_visual_section(building_anchor, "BuildingUpgradeVisual")


func _property_dynamic_props_root(root: Node3D) -> Node3D:
	var lot_root := _property_lot_root(root)
	return _ensure_visual_section(lot_root, "DynamicProps")


func _property_visual_preset(tool: String) -> Dictionary:
	return PROPERTY_VISUAL_PRESETS.get(tool, {})


func _property_visual_preset_for_variant(tool: String, variant: int, variant_id: String = "") -> Dictionary:
	var preset := _property_visual_preset(tool).duplicate(true)
	if tool != BUILD_TOOL_RESTAURANT:
		return preset
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	var definition: Dictionary = RESTAURANT_VARIANT_DEFINITIONS.get(resolved_variant_id, {})
	var lot_preset: Dictionary = definition.get("lot_preset", {})
	for key in lot_preset.keys():
		preset[key] = lot_preset[key]
	return preset


func _apply_property_structure_setback(structure_root: Node3D, preset: Dictionary) -> void:
	var setback_z := float(preset.get("building_z_offset", 0.0))
	structure_root.position.z = setback_z
	structure_root.set_meta("visual_building_setback", -setback_z)


func _validate_property_visual_spacing(tool: String, preset: Dictionary) -> void:
	if not preset.has("sidewalk"):
		push_warning("%s visual preset is missing a sidewalk section; lot frontage may drift into the road." % tool)
		return
	var lot_size: Vector2 = preset.get("lot_size", Vector2(4.0, LOT_DEPTH))
	var sidewalk: Dictionary = preset["sidewalk"]
	var sidewalk_center_z := float(sidewalk.get("z", LOT_FRONT_SIDEWALK_Z))
	var sidewalk_depth := float(sidewalk.get("depth", SIDEWALK_WIDTH))
	var sidewalk_width := float(sidewalk.get("width", SIDEWALK_WIDTH))
	var sidewalk_front_edge := sidewalk_center_z + sidewalk_depth * 0.5
	var sidewalk_back_edge := sidewalk_center_z - sidewalk_depth * 0.5
	var lot_front_edge := lot_size.y * 0.5
	if sidewalk_width <= 0.0 or sidewalk_depth <= 0.0:
		push_warning("%s visual preset has an invalid sidewalk size; sidewalks must stay continuous." % tool)
	if sidewalk_front_edge > lot_front_edge + CURB_WIDTH:
		push_warning("%s visual preset pushes sidewalk beyond the lot frontage: sidewalk_front=%.2f lot_front=%.2f" % [tool, sidewalk_front_edge, lot_front_edge])
	var setback_z := float(preset.get("building_z_offset", 0.0))
	if -setback_z < BUILDING_SETBACK * 0.72:
		push_warning("%s visual preset has a shallow building setback: %.2f" % [tool, -setback_z])
	var estimated_building_front := setback_z + 1.05
	if estimated_building_front > sidewalk_back_edge - FRONT_BUFFER:
		push_warning("%s visual preset may let building visuals overlap the sidewalk buffer: building_front=%.2f sidewalk_back=%.2f" % [tool, estimated_building_front, sidewalk_back_edge])
	var parking_kind := str(preset.get("parking", "none"))
	if parking_kind == "none" or parking_kind == "driveway":
		return
	if not preset.has("parking_position") or not preset.has("parking_size"):
		push_warning("%s visual preset needs parking bounds so parking cannot overlap the road." % tool)
		return
	var parking_position: Vector3 = preset["parking_position"]
	var parking_size: Vector3 = preset["parking_size"]
	var parking_front_edge := parking_position.z + parking_size.z * 0.5
	var parking_back_edge := parking_position.z - parking_size.z * 0.5
	if parking_size.x <= 0.0 or parking_size.z <= 0.0:
		push_warning("%s visual preset has invalid parking dimensions." % tool)
	if parking_size.x > lot_size.x - CURB_WIDTH * 2.0:
		push_warning("%s visual preset parking is wider than its usable lot frontage." % tool)
	if parking_front_edge > sidewalk_front_edge:
		push_warning("%s visual preset pushes parking into road-side frontage: parking_front=%.2f sidewalk_front=%.2f" % [tool, parking_front_edge, sidewalk_front_edge])
	if parking_front_edge > sidewalk_back_edge - CURB_WIDTH * 0.25:
		push_warning("%s visual preset overlaps parking into sidewalk: parking_front=%.2f sidewalk_back=%.2f" % [tool, parking_front_edge, sidewalk_back_edge])
	if parking_back_edge < -lot_size.y * 0.5 + BACK_BUFFER * 0.2:
		push_warning("%s visual preset pushes parking too far into the rear lot buffer." % tool)


func _property_preset_color(preset: Dictionary, key: String, fallback: String) -> Color:
	return Color(str(preset.get(key, fallback)))


func _property_preset_variant_color(preset: Dictionary, key: String, fallback: String, variant: int, strength: float = 0.035) -> Color:
	var color := _property_preset_color(preset, key, fallback)
	var offset := float(posmod(variant, 5) - 2) * strength
	if offset > 0.0:
		return color.lightened(offset)
	if offset < 0.0:
		return color.darkened(absf(offset))
	return color


func _ensure_visual_section(parent: Node, section_name: String) -> Node3D:
	var existing := parent.get_node_or_null(section_name) as Node3D
	if existing != null:
		return existing
	var section := Node3D.new()
	section.name = section_name
	parent.add_child(section)
	return section


func _property_visual_sections(root: Node3D, lot_root: Node3D, structure_root: Node3D) -> Dictionary:
	var building_anchor := _ensure_visual_section(structure_root, "BuildingAnchor")
	return {
		"lot_base": _ensure_visual_section(lot_root, "LotBase"),
		"sidewalk": _ensure_visual_section(lot_root, "Sidewalk"),
		"parking": _ensure_visual_section(lot_root, "ParkingOrDriveway"),
		"props": _ensure_visual_section(lot_root, "Props"),
		"landscaping": _ensure_visual_section(lot_root, "Landscaping"),
		"dynamic_props": _ensure_visual_section(lot_root, "DynamicProps"),
		"building_anchor": building_anchor,
		"main_building": _ensure_visual_section(building_anchor, "MainBuilding"),
		"signage": _ensure_visual_section(building_anchor, "Signage"),
		"upgrade_visuals": _ensure_visual_section(building_anchor, "BuildingUpgradeVisual"),
	}


func create_lot_base(parent: Node, preset: Dictionary, size_override: Vector2 = Vector2.ZERO) -> void:
	var lot_size := Vector2(3.8, 2.8)
	if size_override != Vector2.ZERO:
		lot_size = size_override
	elif preset.has("lot_size"):
		lot_size = preset["lot_size"]
	var lot_type := str(preset.get("lot_type", "commercial"))
	var lot_color := str(preset.get("lot_color", "d9d0b9"))
	var sidewalk: Dictionary = preset.get("sidewalk", {})
	var sidewalk_back_z := float(sidewalk.get("z", lot_size.y * 0.45)) - float(sidewalk.get("depth", SIDEWALK_WIDTH)) * 0.5
	var curb_material := _make_material("eee8dc", 0.92)
	var paver_material := _make_material("d8c7ab", 0.9)
	_add_shadow_disc_local(Vector3(0.0, 0.002, 0.06), Vector2(lot_size.x * 1.04, lot_size.y * 1.02), 0.1, parent)
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(lot_size.x + 0.16, 0.028, lot_size.y + 0.14), curb_material, parent)
	if lot_type == "residential":
		_add_box(Vector3(0.0, 0.046, 0.0), Vector3(lot_size.x, 0.04, lot_size.y), _make_material(lot_color, 0.98), parent)
		_add_box(Vector3(0.0, 0.062, sidewalk_back_z - 0.48), Vector3(lot_size.x * 0.9, 0.032, 0.92), _make_material("d8c6a7", 0.9), parent)
		_add_box(Vector3(0.0, 0.082, sidewalk_back_z - 0.94), Vector3(lot_size.x * 0.94, 0.025, 0.42), _make_material("c2b39b", 0.88), parent)
	elif lot_type == "civic":
		_add_box(Vector3(0.0, 0.046, 0.0), Vector3(lot_size.x, 0.04, lot_size.y), _make_material(lot_color, 0.98), parent)
		_add_box(Vector3(0.0, 0.082, sidewalk_back_z - 0.24), Vector3(lot_size.x * 0.82, 0.024, 0.42), paver_material, parent)
	else:
		_add_box(Vector3(0.0, 0.046, 0.0), Vector3(lot_size.x, 0.04, lot_size.y), _make_material(lot_color, 0.98), parent)
		_add_box(Vector3(0.0, 0.078, sidewalk_back_z - 0.54), Vector3(lot_size.x * 0.72, 0.025, 0.36), _make_material("ede3cf", 0.92), parent)
		_add_box(Vector3(0.0, 0.084, sidewalk_back_z - 0.12), Vector3(lot_size.x * 0.94, 0.018, 0.18), paver_material, parent)
	for side_x in [-1.0, 1.0]:
		_add_box(Vector3(side_x * lot_size.x * 0.5, 0.084, 0.0), Vector3(0.06, 0.04, lot_size.y * 0.88), curb_material, parent)
	_add_box(Vector3(0.0, 0.084, lot_size.y * 0.5), Vector3(lot_size.x * 0.92, 0.04, 0.06), curb_material, parent)
	_add_lot_surface_polish_local(parent, lot_size, lot_type, sidewalk_back_z)


func create_sidewalk_connection(parent: Node, preset: Dictionary) -> void:
	var sidewalk: Dictionary = preset.get("sidewalk", {})
	_add_lot_sidewalk_connector(
		parent,
		float(sidewalk.get("width", 0.86)),
		float(sidewalk.get("z", 1.28)),
		float(sidewalk.get("depth", 0.82))
	)


func create_sidewalk_strip(parent: Node, center: Vector3, size: Vector3) -> void:
	_add_box(center, size, _sidewalk_material, parent)


func create_curb(parent: Node, center: Vector3, size: Vector3) -> void:
	_add_box(center, size, _make_material("eee8dc", 0.92), parent)


func create_crosswalk(parent: Node, center: Vector3, horizontal: bool) -> void:
	_add_crosswalk_local(parent as Node3D, center, horizontal)


func create_driveway(parent: Node, preset: Dictionary, entry_offset: float = 0.0, garage_side: float = 1.0, has_garage: bool = false) -> void:
	var sidewalk: Dictionary = preset.get("sidewalk", {})
	var sidewalk_center_z := float(sidewalk.get("z", LOT_FRONT_SIDEWALK_Z))
	var sidewalk_depth := float(sidewalk.get("depth", SIDEWALK_WIDTH))
	var sidewalk_back_z := sidewalk_center_z - sidewalk_depth * 0.5
	var yard_end_z := sidewalk_back_z - FRONT_BUFFER
	var curb_cut_z := sidewalk_center_z
	if has_garage:
		var drive_x := 1.08 * garage_side
		_add_box(Vector3(drive_x * 1.18, 0.021, yard_end_z - 0.62), Vector3(1.34, 0.028, 1.7), _make_material("b8a58b", 0.9), parent)
		_add_box(Vector3(drive_x * 1.18, 0.026, curb_cut_z), Vector3(1.06, 0.026, sidewalk_depth * 0.78), _make_material("b8a58b", 0.9), parent)
		_add_town_path(Vector3(drive_x * 1.18, 0.03, yard_end_z - 0.42), Vector2(0.9, 1.36), parent)
	else:
		_add_town_path(Vector3(entry_offset, 0.03, yard_end_z - 0.52), Vector2(0.74, 1.48), parent)
		_add_box(Vector3(entry_offset, 0.038, curb_cut_z), Vector3(0.58, 0.018, sidewalk_depth * 0.72), _make_material("d9cbb7", 0.9), parent)


func create_parking_lot(parent: Node, preset: Dictionary, accent: Color = Color("f1d072"), trim: Color = Color("fff4df")) -> void:
	var parking := str(preset.get("parking", "none"))
	if parking == "none" or parking == "driveway":
		return
	var position := Vector3(0.0, 0.0, 0.9)
	if preset.has("parking_position"):
		position = preset["parking_position"]
	var size := Vector3(2.8, 1.0, 0.9)
	if preset.has("parking_size"):
		size = preset["parking_size"]
	var root := Node3D.new()
	root.name = "SharedParkingLot"
	root.position = position
	root.set_meta("visual_zone", "between_sidewalk_and_building")
	parent.add_child(root)

	var curb_material := _make_material("eee8dc", 0.92)
	var line_material := _make_material("f7f2df", 0.92)
	var asphalt_material := _make_material("626b72", 0.97)
	var stop_material := _make_material_from_color(accent.lightened(0.14), 0.86)
	if parking == "front_apron":
		asphalt_material = _make_material("7c857a", 0.94)
		line_material = _make_material_from_color(accent, 0.9)
		stop_material = _make_material_from_color(accent.lightened(0.05), 0.84)

	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.02), Vector2(size.x * 0.96, size.z * 0.92), 0.08, root)
	_add_box(Vector3(0.0, 0.032, 0.0), Vector3(size.x + 0.16, 0.026, size.z + 0.14), curb_material, root)
	_add_box(Vector3(0.0, 0.058, 0.0), Vector3(size.x, 0.034, size.z), asphalt_material, root)
	_add_parking_surface_polish_local(root, size, parking)
	_add_box(Vector3(0.0, 0.084, -size.z * 0.5 + 0.055), Vector3(size.x * 0.94, 0.014, 0.07), curb_material, root)
	_add_box(Vector3(-size.x * 0.5 + 0.055, 0.084, 0.0), Vector3(0.07, 0.014, size.z * 0.82), curb_material, root)
	_add_box(Vector3(size.x * 0.5 - 0.055, 0.084, 0.0), Vector3(0.07, 0.014, size.z * 0.82), curb_material, root)
	var curb_cut_width := minf(size.x * 0.38, 1.18)
	_add_box(Vector3(0.0, 0.092, size.z * 0.5 + 0.08), Vector3(curb_cut_width, 0.018, 0.2), asphalt_material, root)
	_add_box(Vector3(-curb_cut_width * 0.62, 0.1, size.z * 0.5 + 0.08), Vector3(0.05, 0.03, 0.18), curb_material, root)
	_add_box(Vector3(curb_cut_width * 0.62, 0.1, size.z * 0.5 + 0.08), Vector3(0.05, 0.03, 0.18), curb_material, root)
	if parking != "front_apron":
		for island_x in [-size.x * 0.44, size.x * 0.44]:
			_add_box(Vector3(island_x, 0.096, -size.z * 0.22), Vector3(0.22, 0.026, size.z * 0.44), curb_material, root)
			create_bush_cluster(root, Vector3(island_x, 0.11, -size.z * 0.22), 3, Color("6fa85b"))

	var spaces := int(preset.get("parking_spaces", 3))
	if parking == "medium_lot":
		spaces = int(preset.get("parking_spaces", 5))
	elif parking == "compact_lot":
		spaces = int(preset.get("parking_spaces", 3))
	elif parking == "front_apron":
		spaces = int(preset.get("parking_spaces", 3))
	for line_index in range(spaces + 1):
		var t := 0.5 if spaces <= 0 else float(line_index) / float(spaces)
		var x := lerpf(-size.x * 0.38, size.x * 0.38, t)
		_add_box(Vector3(x, 0.098, -size.z * 0.04), Vector3(0.035, 0.012, size.z * 0.58), line_material, root)
	for stop_index in range(spaces):
		var t := (float(stop_index) + 0.5) / float(max(1, spaces))
		var x := lerpf(-size.x * 0.38, size.x * 0.38, t)
		_add_box(Vector3(x, 0.113, -size.z * 0.28), Vector3(0.3, 0.032, 0.05), stop_material, root)
	var preset_props: Array = preset.get("props", [])
	if parking == "medium_lot" or preset_props.has("handicap_space"):
		_add_box(Vector3(-size.x * 0.39, 0.103, 0.05), Vector3(0.42, 0.012, size.z * 0.42), _make_material("577da7", 0.82), root)
		_add_box(Vector3(-size.x * 0.39, 0.118, 0.05), Vector3(0.24, 0.012, 0.035), line_material, root)
		_add_box(Vector3(-size.x * 0.39, 0.118, 0.05), Vector3(0.035, 0.012, 0.24), line_material, root)
	if parking == "compact_lot":
		_add_box(Vector3(size.x * 0.44, 0.104, size.z * 0.32), Vector3(0.16, 0.1, 0.22), _make_material_from_color(trim, 0.86), root)
	if parking == "front_apron":
		_add_fire_truck_local(Vector3(size.x * 0.24, 0.02, -0.02), 0.0, root)


func _add_lot_surface_polish_local(parent: Node, lot_size: Vector2, lot_type: String, sidewalk_back_z: float) -> void:
	var seam_material := _make_material("c7bca8", 0.95)
	var warm_patch := _make_material("9acb7a", 0.96)
	var cool_patch := _make_material("78b462", 0.96)
	var slab_z := sidewalk_back_z - 0.34
	for x in [-lot_size.x * 0.34, -lot_size.x * 0.12, lot_size.x * 0.12, lot_size.x * 0.34]:
		_add_box(Vector3(x, 0.104, slab_z), Vector3(0.026, 0.01, 0.48), seam_material, parent)
	for z in [lot_size.y * 0.26, -lot_size.y * 0.28]:
		_add_box(Vector3(0.0, 0.088, z), Vector3(lot_size.x * 0.7, 0.01, 0.022), seam_material, parent)
	if lot_type == "residential":
		for patch in [
			{"pos": Vector3(-lot_size.x * 0.32, 0.088, -lot_size.y * 0.18), "size": Vector3(0.56, 0.012, 0.28), "rot": -8.0, "mat": warm_patch},
			{"pos": Vector3(lot_size.x * 0.28, 0.088, -lot_size.y * 0.05), "size": Vector3(0.48, 0.012, 0.24), "rot": 11.0, "mat": cool_patch},
		]:
			var patch_pos: Vector3 = patch["pos"]
			var patch_size: Vector3 = patch["size"]
			var patch_material: Material = patch["mat"]
			var patch_node := _add_box(patch_pos, patch_size, patch_material, parent)
			patch_node.rotation_degrees.y = float(patch["rot"])
	else:
		for x in [-lot_size.x * 0.42, lot_size.x * 0.42]:
			create_landscape_island(parent, Vector3(x, 0.1, -lot_size.y * 0.42), Vector3(0.32, 0.08, 0.22), Color("6fa85b"), 3)


func _add_parking_surface_polish_local(parent: Node, size: Vector3, parking_kind: String) -> void:
	var mid_material := _make_material("6b7378", 0.98)
	var dark_material := _make_material("454c51", 0.99)
	var arrow_material := _make_material("d8d0c1", 0.92)
	for patch in [
		{"pos": Vector3(-size.x * 0.22, 0.082, -size.z * 0.18), "size": Vector3(size.x * 0.22, 0.006, 0.035), "rot": -7.0, "mat": mid_material},
		{"pos": Vector3(size.x * 0.2, 0.083, size.z * 0.18), "size": Vector3(size.x * 0.18, 0.006, 0.03), "rot": 9.0, "mat": dark_material},
	]:
		var patch_pos: Vector3 = patch["pos"]
		var patch_size: Vector3 = patch["size"]
		var patch_material: Material = patch["mat"]
		var patch_node := _add_box(patch_pos, patch_size, patch_material, parent)
		patch_node.rotation_degrees.y = float(patch["rot"])
	if parking_kind != "front_apron":
		_add_box(Vector3(0.0, 0.107, size.z * 0.28), Vector3(0.3, 0.01, 0.035), arrow_material, parent)
		var arrow_left := _add_box(Vector3(0.13, 0.108, size.z * 0.28), Vector3(0.12, 0.01, 0.035), arrow_material, parent)
		arrow_left.rotation_degrees.y = 28.0
		var arrow_right := _add_box(Vector3(0.13, 0.108, size.z * 0.28), Vector3(0.12, 0.01, 0.035), arrow_material, parent)
		arrow_right.rotation_degrees.y = -28.0


func create_storefront_windows(parent: Node, width: float, height: float, front_z: float, columns: int = 3) -> void:
	_add_storefront_window_set(parent, width, height, front_z, columns)


func create_glass_frontage(parent: Node, width: float, y_position: float, front_z: float, columns: int = 4) -> void:
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.2, 0.24)
	var frame_material := _make_material("f4ecda", 0.84)
	var usable_width := width * 0.72
	_add_box(Vector3(0.0, y_position, front_z - 0.015), Vector3(usable_width + 0.18, 0.58, 0.055), frame_material, parent)
	for index in range(columns):
		var t := 0.5 if columns <= 1 else float(index) / float(columns - 1)
		var x := lerpf(-usable_width * 0.5, usable_width * 0.5, t)
		_add_box(Vector3(x, y_position, front_z + 0.018), Vector3(usable_width / maxf(1.0, float(columns)) * 0.78, 0.48, 0.035), glass_material, parent)
		if index > 0:
			_add_box(Vector3(x - usable_width / float(columns - 1) * 0.5, y_position, front_z + 0.04), Vector3(0.035, 0.54, 0.035), _window_frame_material, parent)
	_add_box(Vector3(0.0, y_position - 0.32, front_z + 0.04), Vector3(usable_width + 0.28, 0.06, 0.08), _roof_fascia_material, parent)
	_add_box(Vector3(0.0, y_position + 0.32, front_z + 0.04), Vector3(usable_width + 0.22, 0.06, 0.08), _window_frame_material, parent)


func create_storefront(parent: Node, width: float, front_z: float, palette: Dictionary, sign_kind: String, glass_columns: int = 4) -> void:
	create_glass_frontage(parent, width, 0.46, front_z, glass_columns)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.04), parent, palette["accent"])
	_add_box(Vector3(0.0, 0.86, front_z + 0.04), Vector3(width * 0.72, 0.11, 0.07), _make_material_from_color(palette["trim"], 0.72), parent)
	if sign_kind != "":
		_add_signboard_local(Vector3(0.0, 1.08, front_z + 0.08), Vector2(width * 0.4, 0.16), palette["accent"], sign_kind, parent)


func create_sign(parent: Node, position_3d: Vector3, size: Vector2, accent: Color, kind: String) -> void:
	_add_signboard_local(position_3d, size, accent, kind, parent)


func create_roof(parent: Node, center: Vector3, size: Vector3, roof_material: Material, style: String = "gabled") -> void:
	if style == "flat":
		_add_box(center + Vector3(0.0, -0.08, 0.0), Vector3(size.x, 0.16, size.z), roof_material, parent)
		_add_flat_roof_surface_details(parent, center, size, roof_material)
	elif style == "shed":
		var roof := _add_box(center, Vector3(size.x, 0.16, size.z), roof_material, parent)
		roof.rotation_degrees.x = -5.0
		_add_flat_roof_surface_details(parent, center + Vector3(0.0, 0.09, 0.0), size * 0.92, roof_material)
	else:
		_add_gabled_roof(center, size, roof_material, parent, 10.0)


func create_modular_roof(parent: Node, center: Vector3, size: Vector3, roof_material: Material, style: String = "flat") -> void:
	if style == "flat":
		_add_box(center + Vector3(0.0, -0.08, 0.0), Vector3(size.x, 0.16, size.z), roof_material, parent)
		var base_color := Color("3f454a")
		if roof_material is StandardMaterial3D:
			base_color = (roof_material as StandardMaterial3D).albedo_color
		var cap_material := _make_material_from_color(base_color.darkened(0.2), 0.86)
		_add_box(center + Vector3(0.0, 0.04, size.z * 0.49), Vector3(size.x, 0.16, 0.09), cap_material, parent)
		_add_box(center + Vector3(0.0, 0.04, -size.z * 0.49), Vector3(size.x, 0.16, 0.09), cap_material, parent)
		_add_box(center + Vector3(-size.x * 0.49, 0.04, 0.0), Vector3(0.09, 0.16, size.z), cap_material, parent)
		_add_box(center + Vector3(size.x * 0.49, 0.04, 0.0), Vector3(0.09, 0.16, size.z), cap_material, parent)
		_add_flat_roof_surface_details(parent, center, size, roof_material)
	elif style == "shed":
		create_roof(parent, center, size, roof_material, "shed")
	else:
		create_roof(parent, center, size, roof_material, "gabled")


func _add_flat_roof_surface_details(parent: Node, center: Vector3, size: Vector3, roof_material: Material) -> void:
	if size.x < 0.7 or size.z < 0.7:
		return
	var base_color := Color("5b6266")
	if roof_material is StandardMaterial3D:
		base_color = (roof_material as StandardMaterial3D).albedo_color
	var seam_material := _make_material_from_color(base_color.darkened(0.16), 0.9)
	var highlight_material := _make_material_from_color(base_color.lightened(0.12), 0.86)
	var detail_y := center.y + 0.14
	var seam_count := clampi(int(size.x / 0.56), 2, 6)
	for seam_index in range(seam_count):
		var t := (float(seam_index) + 1.0) / float(seam_count + 1)
		var x := lerpf(-size.x * 0.36, size.x * 0.36, t)
		_add_box(Vector3(center.x + x, detail_y, center.z), Vector3(0.025, 0.018, size.z * 0.72), seam_material, parent)
	for z in [-size.z * 0.28, size.z * 0.08]:
		_add_box(Vector3(center.x, detail_y + 0.005, center.z + z), Vector3(size.x * 0.64, 0.014, 0.035), highlight_material, parent)
	if size.x > 1.4 and size.z > 1.2:
		var unit_material := _make_material("c9d0d2", 0.82)
		var vent_material := _make_material("77838c", 0.88)
		create_hvac_unit(parent, Vector3(center.x - size.x * 0.26, detail_y + 0.08, center.z - size.z * 0.18), unit_material, vent_material)
	if size.x > 2.4:
		_add_box(Vector3(center.x + size.x * 0.26, detail_y + 0.07, center.z + size.z * 0.1), Vector3(0.28, 0.07, 0.16), highlight_material, parent)


func create_trim_layer(parent: Node, width: float, height: float, front_z: float, palette: Dictionary, sign_kind: String = "") -> void:
	_add_facade_trim_package(parent, width, height, front_z, palette, sign_kind)


func create_bush_row(parent: Node, preset: Dictionary, color: Color = Color("6fa85b")) -> void:
	var hedge: Dictionary = preset.get("hedges", {})
	if hedge.is_empty():
		return
	_add_lot_hedge_edges(parent, float(hedge.get("width", 3.6)), float(hedge.get("depth", 2.6)), color)


func create_tree(parent: Node, position_3d: Vector3) -> void:
	_add_local_tree(position_3d, parent)


func create_streetlamp(parent: Node, position_3d: Vector3) -> void:
	_add_house_front_lamp_local(position_3d, parent, false)


func create_fence(parent: Node, position_3d: Vector3, width: float) -> void:
	_add_picket_fence(parent, position_3d, width)


func create_bollards(parent: Node, z_position: float, width: float, count: int, color: Color) -> void:
	_add_bollard_row_local(parent, z_position, width, count, color)


func create_cart_rack(parent: Node, position_3d: Vector3, rotation_y: float = 0.0) -> void:
	_add_cart_rack_local(parent, position_3d, rotation_y)


func create_awning(parent: Node, center: Vector3, width: float, accent_material: Material, trim_material: Material, style: String = "bold") -> void:
	_add_restaurant_canopy_local(style, center, width, accent_material, trim_material, parent)


func create_columns(parent: Node, width: float, front_z: float, count: int, material: Material) -> void:
	for index in range(count):
		var t := 0.5 if count <= 1 else float(index) / float(count - 1)
		var x := lerpf(-width * 0.5, width * 0.5, t)
		_add_local_cylinder(Vector3(x, 0.34, front_z), 0.07, 0.07, 0.58, material, parent)


func create_hvac_units(parent: Node, width: float, depth: float, roof_y: float, roof_z: float, variant: int) -> void:
	var metal := _make_material("d9dde0", 0.76)
	var vent := _make_material("85919a", 0.84)
	var count := 1 + posmod(variant, 2)
	for index in range(count):
		var x := lerpf(-width * 0.28, width * 0.28, 0.5 if count == 1 else float(index) / float(count - 1))
		var z := roof_z - depth * 0.2 + float(index) * 0.12
		create_hvac_unit(parent, Vector3(x, roof_y, z), metal, vent)


func create_hvac_unit(parent: Node, position_3d: Vector3, metal: Material = null, vent: Material = null) -> void:
	var unit_material := metal if metal != null else _make_material("d9dde0", 0.76)
	var vent_material := vent if vent != null else _make_material("85919a", 0.84)
	_add_box(position_3d, Vector3(0.28, 0.12, 0.22), unit_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.07, 0.0), Vector3(0.2, 0.018, 0.14), vent_material, parent)


func create_planters(parent: Node, positions: Array, accent: Color) -> void:
	for position_variant in positions:
		var position_3d: Vector3 = position_variant
		_add_planter_box_local(parent, position_3d, accent)


func create_landscape_island(parent: Node, center: Vector3, size: Vector3, accent: Color, bush_count: int = 4) -> void:
	var curb_material := _make_material("eee8dc", 0.92)
	var mulch_material := _make_material("8a6a4c", 0.9)
	_add_box(center, Vector3(size.x, 0.052, size.z), curb_material, parent)
	_add_box(center + Vector3(0.0, 0.024, 0.0), Vector3(maxf(0.12, size.x - 0.12), 0.03, maxf(0.12, size.z - 0.12)), mulch_material, parent)
	create_bush_cluster(parent, center + Vector3(0.0, 0.04, 0.0), bush_count, accent)


func create_bush_cluster(parent: Node, center: Vector3, count: int, color: Color = Color("6fa85b")) -> void:
	var leaf_material := _make_material_from_color(color, 0.92)
	var highlight_material := _make_material_from_color(color.lightened(0.16), 0.9)
	for index in range(count):
		var x := (float(index % 3) - 1.0) * 0.13
		var z := (float(index / 3) - 0.5) * 0.12
		var material := highlight_material if index % 3 == 0 else leaf_material
		_add_local_sphere(center + Vector3(x, 0.12 + float(index % 2) * 0.025, z), 0.13, 0.1, material, parent)


func create_street_sign(parent: Node, position_3d: Vector3, accent: Color, label_kind: String = "") -> void:
	var pole_material := _make_material("3d4144", 0.86)
	var sign_material := _make_material_from_color(accent.darkened(0.08), 0.72)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.34, 0.0), 0.025, 0.025, 0.68, pole_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.74, 0.0), Vector3(0.42, 0.18, 0.035), sign_material, parent)
	if label_kind != "":
		_add_sign_text_label_local(position_3d + Vector3(0.0, 0.74, 0.028), Vector2(0.38, 0.12), label_kind, parent)


func create_rooftop_detail(parent: Node, position_3d: Vector3, roof_color: Color) -> void:
	var vent_material := _make_material("e8ddcc", 0.78)
	var cap_material := _make_material_from_color(roof_color.darkened(0.22), 0.82)
	_add_soft_block(position_3d, Vector3(0.34, 0.13, 0.24), vent_material, parent, 0.035)
	_add_box(position_3d + Vector3(0.0, 0.085, 0.0), Vector3(0.25, 0.035, 0.16), cap_material, parent)
	for slat_x in [-0.08, 0.0, 0.08]:
		_add_box(position_3d + Vector3(slat_x, 0.12, 0.0), Vector3(0.018, 0.018, 0.14), cap_material, parent)


func _add_planter_box_local(parent: Node, position_3d: Vector3, accent: Color, width: float = 0.42) -> void:
	var planter_material := _make_material("9f7b56", 0.82)
	var leaf_material := _make_material_from_color(accent.lightened(0.12), 0.9)
	_add_box(position_3d, Vector3(width, 0.12, 0.16), planter_material, parent)
	for x in [-width * 0.28, 0.0, width * 0.28]:
		_add_local_sphere(position_3d + Vector3(x, 0.12, 0.0), 0.07, 0.08, leaf_material, parent)


func _add_property_ground_variation(parent: Node, preset: Dictionary, variant: int) -> void:
	var lot_size := Vector2(3.8, 2.8)
	if preset.has("lot_size"):
		lot_size = preset["lot_size"]
	var patch_materials := [
		_make_material("99c97b", 0.96),
		_make_material("83b866", 0.96),
		_make_material("a9d78a", 0.96),
	]
	var patch_positions := [
		Vector3(-lot_size.x * 0.31, 0.062, -lot_size.y * 0.33),
		Vector3(lot_size.x * 0.32, 0.062, -lot_size.y * 0.28),
		Vector3(-lot_size.x * 0.18, 0.062, lot_size.y * 0.36),
		Vector3(lot_size.x * 0.28, 0.062, lot_size.y * 0.34),
	]
	for index in range(patch_positions.size()):
		var size := Vector3(0.36 + 0.08 * float((index + variant) % 2), 0.012, 0.18 + 0.06 * float((index + variant) % 3))
		var patch := _add_box(patch_positions[index], size, patch_materials[(index + variant) % patch_materials.size()], parent)
		patch.rotation_degrees.y = float((index * 23 + variant * 7) % 42) - 21.0
	for rock_index in range(2):
		var x := (-0.42 + float(rock_index) * 0.84) * lot_size.x * 0.38
		var z := -lot_size.y * (0.42 - float(rock_index) * 0.14)
		_add_local_sphere(Vector3(x, 0.072, z), 0.08, 0.045, _stone_material, parent)


func _add_sidewalk_scene_cluster(parent: Node, center: Vector3, palette: Dictionary, variant: int, mood: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	var planter_offset := 0.32 if posmod(variant, 2) == 0 else -0.32
	create_planters(parent, [
		center + Vector3(planter_offset, 0.07, -0.04),
		center + Vector3(planter_offset * -0.55, 0.07, 0.12),
	], accent)
	match mood:
		"residential":
			_add_bench_local(center + Vector3(0.0, 0.0, 0.18), deg_to_rad(0.0), parent)
		"civic":
			_add_hydrant_local(center + Vector3(-0.36, 0.02, 0.08), parent)
			_add_sidewalk_banner_local(parent, center + Vector3(0.36, 0.0, 0.04), accent)
		"restaurant":
			_add_bench_local(center + Vector3(-0.26, 0.0, 0.16), deg_to_rad(0.0), parent)
			_add_menu_board_local(parent, center + Vector3(0.34, 0.0, 0.08), accent)
		_:
			_add_bench_local(center + Vector3(-0.24, 0.0, 0.14), deg_to_rad(0.0), parent)
			_add_trash_can_local(parent, center + Vector3(0.38, 0.02, 0.1), trim)


func _add_property_composed_lot_details(tool: String, sections: Dictionary, preset: Dictionary, palette: Dictionary, variant: int) -> void:
	var props_root := sections["props"] as Node3D
	var landscaping_root := sections["landscaping"] as Node3D
	var sidewalk_root := sections["sidewalk"] as Node3D
	var lot_size := Vector2(3.8, 2.8)
	if preset.has("lot_size"):
		lot_size = preset["lot_size"]
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	var lot_type := str(preset.get("lot_type", "commercial"))
	var front_z := lot_size.y * 0.48
	var sidewalk: Dictionary = preset.get("sidewalk", {})
	var sidewalk_back_z := float(sidewalk.get("z", front_z)) - float(sidewalk.get("depth", SIDEWALK_WIDTH)) * 0.5
	var frontage_z := sidewalk_back_z - 0.16
	_add_box(Vector3(0.0, 0.118, front_z - 0.24), Vector3(lot_size.x * 0.84, 0.026, 0.08), _make_material("eee8dc", 0.92), sidewalk_root)
	for paver_x in [-lot_size.x * 0.32, 0.0, lot_size.x * 0.32]:
		_add_box(Vector3(paver_x, 0.126, front_z - 0.46), Vector3(0.04, 0.012, 0.42), _make_material("c9bea9", 0.92), sidewalk_root)
	if lot_type == "residential":
		_add_residential_yard_life(landscaping_root, props_root, lot_size, frontage_z, sidewalk_back_z, accent, trim, variant)
		create_street_sign(props_root, Vector3(lot_size.x * 0.4, 0.02, sidewalk_back_z + 0.06), accent)
		_add_sidewalk_scene_cluster(props_root, Vector3(-lot_size.x * 0.36, 0.02, sidewalk_back_z + 0.06), palette, variant, "residential")
	elif tool == BUILD_TOOL_FIRE:
		_add_flower_bed_local(landscaping_root, Vector3(-lot_size.x * 0.38, 0.09, frontage_z), 0.7, accent)
		create_bush_cluster(landscaping_root, Vector3(lot_size.x * 0.38, 0.08, -lot_size.y * 0.36), 4, Color("778f68"))
		create_tree(landscaping_root, Vector3(-lot_size.x * 0.45, 0.0, -lot_size.y * 0.3))
		create_street_sign(props_root, Vector3(-lot_size.x * 0.42, 0.02, sidewalk_back_z + 0.06), accent, "fire")
		_add_sidewalk_scene_cluster(props_root, Vector3(lot_size.x * 0.34, 0.02, sidewalk_back_z + 0.06), palette, variant, "civic")
	elif lot_type == "commercial":
		if tool == BUILD_TOOL_RESTAURANT:
			# Restaurant archetypes own their full lot composition so they do not
			# inherit the same generic bench/banner/planter pattern.
			_add_sidewalk_scene_cluster(props_root, Vector3(-lot_size.x * 0.38, 0.02, sidewalk_back_z + 0.06), palette, variant, "restaurant")
			return
		_add_flower_bed_local(landscaping_root, Vector3(-lot_size.x * 0.38, 0.09, frontage_z), 0.66, accent)
		_add_flower_bed_local(landscaping_root, Vector3(lot_size.x * 0.38, 0.09, frontage_z), 0.66, trim)
		create_bush_cluster(landscaping_root, Vector3(-lot_size.x * 0.43, 0.08, -lot_size.y * 0.34), 4, Color("6fa85b"))
		create_bush_cluster(landscaping_root, Vector3(lot_size.x * 0.43, 0.08, -lot_size.y * 0.28), 4, Color("86bd69"))
		create_tree(landscaping_root, Vector3(lot_size.x * 0.44, 0.0, -lot_size.y * 0.43))
		create_streetlamp(props_root, Vector3(lot_size.x * 0.46, 0.0, sidewalk_back_z + 0.08))
		_add_sidewalk_scene_cluster(props_root, Vector3(-lot_size.x * 0.34, 0.02, sidewalk_back_z + 0.06), palette, variant, "commercial")
		if tool == BUILD_TOOL_BANK or tool == BUILD_TOOL_GROCERY:
			_add_bench_local(Vector3(-lot_size.x * 0.34, 0.02, sidewalk_back_z + 0.04), deg_to_rad(0.0), props_root)
		if tool == BUILD_TOOL_CORNER_STORE:
			_add_compact_vending_machine_local(props_root, Vector3(-lot_size.x * 0.36, 0.03, frontage_z), accent)
			_add_trash_can_local(props_root, Vector3(lot_size.x * 0.38, 0.03, sidewalk_back_z + 0.04), palette["roof"])


func _add_flower_bed_local(parent: Node, center: Vector3, width: float, accent: Color) -> void:
	var soil_material := _make_material("8a6a4c", 0.92)
	var leaf_material := _make_material("5d944f", 0.9)
	var bloom_material := _make_material_from_color(accent.lightened(0.1), 0.78)
	_add_box(center, Vector3(width, 0.055, 0.16), soil_material, parent)
	for index in range(5):
		var x := lerpf(-width * 0.42, width * 0.42, float(index) / 4.0)
		_add_box(center + Vector3(x, 0.08, -0.025), Vector3(0.025, 0.1, 0.025), leaf_material, parent)
		_add_box(center + Vector3(x, 0.14, 0.025), Vector3(0.065, 0.035, 0.065), bloom_material, parent)


func _add_residential_yard_life(landscaping_root: Node3D, props_root: Node3D, lot_size: Vector2, frontage_z: float, sidewalk_back_z: float, accent: Color, trim: Color, variant: int) -> void:
	# Residential lots need a point of view. These are deliberately small, lived-in
	# compositions rather than more copies of the same hedge/tree strip.
	var left_edge := -lot_size.x * 0.42
	var right_edge := lot_size.x * 0.42
	var back_z := -lot_size.y * 0.38
	var front_z := frontage_z - 0.08
	var soil := _make_material("78563d", 0.94)
	var stone := _make_material("c8b9a0", 0.9)
	var grass_dark := _make_material("6f9d5d", 0.96)
	# Soft, irregular-looking planted edges break up the rectangular lot boundary.
	create_landscape_island(landscaping_root, Vector3(left_edge, 0.1, back_z), Vector3(0.34, 0.08, 0.64), accent, 4)
	create_landscape_island(landscaping_root, Vector3(right_edge, 0.1, back_z + 0.12), Vector3(0.32, 0.08, 0.52), trim, 3)
	for stone_index in range(4):
		var t := float(stone_index) / 3.0
		var x := lerpf(-0.22, 0.22, t)
		var z := lerpf(front_z - 0.06, 0.32, t)
		var paver := _add_box(Vector3(x, 0.112, z), Vector3(0.18, 0.025, 0.12), stone, landscaping_root)
		paver.rotation_degrees.y = float((stone_index % 2) * 12 - 6)
	match posmod(variant, 5):
		0:
			# Cottage garden: layered blooms, a low fence, and a bird bath.
			_add_flower_bed_local(landscaping_root, Vector3(-0.36, 0.1, front_z), lot_size.x * 0.34, accent)
			_add_flower_bed_local(landscaping_root, Vector3(0.64, 0.1, front_z - 0.14), lot_size.x * 0.22, trim)
			_add_picket_fence(props_root, Vector3(-lot_size.x * 0.27, 0.02, sidewalk_back_z - 0.02), lot_size.x * 0.34)
			_add_picket_fence(props_root, Vector3(lot_size.x * 0.31, 0.02, sidewalk_back_z - 0.02), lot_size.x * 0.26)
			_add_bird_bath_local(landscaping_root, Vector3(right_edge * 0.55, 0.04, back_z + 0.08), accent)
			create_tree(landscaping_root, Vector3(left_edge * 0.88, 0.0, back_z + 0.08))
		1:
			# Patio yard: a small evening table, herbs, and a shade tree.
			_add_box(Vector3(right_edge * 0.56, 0.09, back_z + 0.08), Vector3(0.9, 0.025, 0.72), _make_material("bba990", 0.9), landscaping_root)
			_add_outdoor_table_local(props_root, Vector3(right_edge * 0.56, 0.04, back_z + 0.08), accent)
			create_planters(landscaping_root, [Vector3(-0.72, 0.09, front_z), Vector3(-0.42, 0.09, front_z - 0.18)], trim)
			create_tree(landscaping_root, Vector3(left_edge * 0.92, 0.0, back_z - 0.04))
			_add_hanging_lights_local(props_root, Vector3(0.15, 0.0, back_z + 0.18), accent)
		2:
			# Kitchen garden: raised beds, crops, a little shed-like tool box.
			for row in [-0.28, 0.28]:
				_add_box(Vector3(right_edge * 0.52, 0.095, back_z + row), Vector3(0.7, 0.09, 0.2), soil, landscaping_root)
				for plant_index in range(4):
					_add_local_sphere(Vector3(right_edge * 0.52 - 0.24 + plant_index * 0.16, 0.18, back_z + row), 0.07, 0.1, _leaf_material_light, landscaping_root)
			_add_box(Vector3(left_edge * 0.7, 0.2, back_z + 0.1), Vector3(0.34, 0.32, 0.26), _make_material("9b7652", 0.86), props_root)
			_add_box(Vector3(left_edge * 0.7, 0.38, back_z + 0.1), Vector3(0.4, 0.06, 0.32), _make_material_from_color(trim.darkened(0.18), 0.8), props_root)
			_add_flower_bed_local(landscaping_root, Vector3(0.0, 0.1, front_z), lot_size.x * 0.42, accent)
		3:
			# Family yard: open grass, a tree swing and scattered play stones.
			_add_box(Vector3(0.0, 0.084, back_z + 0.08), Vector3(1.35, 0.012, 0.88), grass_dark, landscaping_root)
			create_tree(landscaping_root, Vector3(left_edge * 0.84, 0.0, back_z - 0.08))
			_add_tree_swing_local(props_root, Vector3(left_edge * 0.84, 0.0, back_z - 0.08), trim)
			_add_local_sphere(Vector3(0.35, 0.115, back_z + 0.2), 0.11, 0.09, _make_material_from_color(accent, 0.72), props_root)
			_add_flower_bed_local(landscaping_root, Vector3(right_edge * 0.52, 0.1, front_z), 0.56, trim)
		_:
			# Wildflower retreat: a denser, softer planting with a reading bench.
			for cluster_index in range(3):
				var cluster_x := -0.56 + float(cluster_index) * 0.56
				_add_wildflower_cluster(Vector3(cluster_x, 0.08, back_z + 0.12), 6, _flower_material_pink if cluster_index % 2 == 0 else _flower_material_blue, landscaping_root, 0.16)
			create_bush_cluster(landscaping_root, Vector3(right_edge * 0.62, 0.08, back_z - 0.04), 5, Color("6d9b59"))
			_add_bench_local(Vector3(left_edge * 0.48, 0.02, back_z + 0.16), deg_to_rad(18.0), props_root)
			create_tree(landscaping_root, Vector3(right_edge * 0.86, 0.0, back_z - 0.1))


func _add_bird_bath_local(parent: Node3D, position_3d: Vector3, accent: Color) -> void:
	var stone := _make_material("d8d0c3", 0.9)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.18, 0.0), 0.045, 0.06, 0.34, stone, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.37, 0.0), 0.16, 0.12, 0.05, stone, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.405, 0.0), 0.115, 0.11, 0.015, _make_material_from_color(accent.lightened(0.24), 0.28), parent)


func _add_tree_swing_local(parent: Node3D, position_3d: Vector3, accent: Color) -> void:
	var rope := _make_material("7f694e", 0.9)
	var seat := _make_material_from_color(accent.darkened(0.12), 0.82)
	for x in [-0.16, 0.16]:
		_add_local_cylinder(position_3d + Vector3(x, 0.46, 0.04), 0.008, 0.008, 0.5, rope, parent)
	_add_box(position_3d + Vector3(0.0, 0.21, 0.04), Vector3(0.34, 0.045, 0.13), seat, parent)


func _add_hanging_lights_local(parent: Node3D, position_3d: Vector3, accent: Color) -> void:
	var cord := _make_material("54483d", 0.92)
	var glow := _make_material_from_color(accent.lightened(0.3), 0.28)
	glow.emission_enabled = true
	glow.emission = Color("fff0b5")
	glow.emission_energy_multiplier = 0.22
	for x in [-0.42, 0.0, 0.42]:
		_add_local_cylinder(position_3d + Vector3(x, 0.52, 0.0), 0.008, 0.008, 0.5, cord, parent)
		_add_local_sphere(position_3d + Vector3(x, 0.26, 0.0), 0.035, 0.045, glow, parent)


func _add_decorative_pedestrian_local(parent: Node, position_3d: Vector3, coat: Color, rotation_y: float) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	var coat_material := _make_material_from_color(coat, 0.8)
	var skin_material := _make_material("f0c7a2", 0.76)
	var dark_material := _make_material("2f3335", 0.88)
	_add_local_cylinder(Vector3(0.0, 0.21, 0.0), 0.07, 0.08, 0.28, coat_material, root)
	_add_local_sphere(Vector3(0.0, 0.43, 0.0), 0.09, 0.11, skin_material, root)
	_add_box(Vector3(-0.035, 0.07, 0.0), Vector3(0.035, 0.14, 0.035), dark_material, root)
	_add_box(Vector3(0.035, 0.07, 0.0), Vector3(0.035, 0.14, 0.035), dark_material, root)
	_add_box(Vector3(-0.09, 0.25, 0.0), Vector3(0.035, 0.16, 0.035), coat_material, root)
	_add_box(Vector3(0.09, 0.25, 0.0), Vector3(0.035, 0.16, 0.035), coat_material, root)


func _add_sidewalk_banner_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var pole_material := _make_material("3d4144", 0.86)
	var banner_material := _make_material_from_color(accent, 0.74)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.45, 0.0), 0.025, 0.025, 0.9, pole_material, parent)
	_add_box(position_3d + Vector3(0.18, 0.72, 0.0), Vector3(0.34, 0.18, 0.035), banner_material, parent)
	_add_box(position_3d + Vector3(0.16, 0.62, 0.0), Vector3(0.26, 0.035, 0.035), _make_material("fff4df", 0.84), parent)


func _add_compact_vending_machine_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var body_material := _make_material_from_color(accent.darkened(0.18), 0.78)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.22, 0.22)
	_add_box(position_3d + Vector3(0.0, 0.3, 0.0), Vector3(0.28, 0.58, 0.2), body_material, parent)
	_add_box(position_3d + Vector3(-0.035, 0.36, 0.115), Vector3(0.16, 0.3, 0.025), glass_material, parent)
	_add_box(position_3d + Vector3(0.08, 0.18, 0.12), Vector3(0.055, 0.08, 0.025), _make_material("ffd067", 0.78), parent)


func _add_property_identity_props(tool: String, sections: Dictionary, preset: Dictionary, palette: Dictionary) -> void:
	var props_root := sections["props"] as Node3D
	var landscaping_root := sections["landscaping"] as Node3D
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	match tool:
		BUILD_TOOL_HOUSE:
			_add_mailbox_local(props_root, Vector3(-1.84, 0.0, 1.68), accent)
			create_planters(props_root, [Vector3(-0.94, 0.08, 1.48), Vector3(0.94, 0.08, 1.48)], accent)
		BUILD_TOOL_FIRE:
			_add_flag_local(props_root, Vector3(-1.84, 0.0, 1.1), accent)
			_add_hydrant_local(Vector3(1.88, 0.08, 1.38), props_root)
		BUILD_TOOL_BANK:
			_add_atm_local(props_root, Vector3(-1.48, 0.02, 1.02), palette["roof"])
			create_streetlamp(props_root, Vector3(1.62, 0.0, 1.28))
			create_planters(landscaping_root, [Vector3(-1.42, 0.09, 1.32), Vector3(1.42, 0.09, 1.32)], accent)
		BUILD_TOOL_GROCERY:
			_add_crate_stack_local(Vector3(-1.72, 0.12, 1.16), accent, props_root)
			_add_crate_stack_local(Vector3(-1.32, 0.12, 1.18), trim, props_root)
			create_planters(landscaping_root, [Vector3(1.86, 0.09, 1.34)], accent)
		BUILD_TOOL_RESTAURANT:
			pass
		BUILD_TOOL_CORNER_STORE:
			_add_ice_box_local(props_root, Vector3(1.52, 0.02, 1.0), palette["roof"])
			_add_newspaper_box_local(props_root, Vector3(-1.42, 0.02, 1.08), accent)
			create_planters(landscaping_root, [Vector3(1.46, 0.09, 1.34)], trim)


func _add_mailbox_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var post_material := _make_material("7b5a42", 0.86)
	var box_material := _make_material_from_color(accent.darkened(0.08), 0.78)
	_add_box(position_3d + Vector3(0.0, 0.18, 0.0), Vector3(0.045, 0.34, 0.045), post_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.38, 0.0), Vector3(0.24, 0.14, 0.18), box_material, parent)
	_add_box(position_3d + Vector3(0.09, 0.47, 0.0), Vector3(0.035, 0.12, 0.035), _make_material("d24d42", 0.74), parent)


func _add_flag_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var pole_material := _make_material("f3ead8", 0.76)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.62, 0.0), 0.025, 0.025, 1.24, pole_material, parent)
	_add_box(position_3d + Vector3(0.22, 1.08, 0.0), Vector3(0.42, 0.24, 0.035), _make_material_from_color(accent, 0.7), parent)
	_add_box(position_3d + Vector3(0.2, 0.96, 0.0), Vector3(0.34, 0.035, 0.04), pole_material, parent)


func _add_atm_local(parent: Node, position_3d: Vector3, color: Color) -> void:
	var root := Node3D.new()
	root.position = position_3d
	parent.add_child(root)
	_add_box(Vector3(0.0, 0.28, 0.0), Vector3(0.28, 0.56, 0.18), _make_material_from_color(color.darkened(0.12), 0.82), root)
	_add_box(Vector3(0.0, 0.4, 0.1), Vector3(0.2, 0.1, 0.035), _window_material, root)
	_add_box(Vector3(0.0, 0.25, 0.1), Vector3(0.18, 0.035, 0.035), _make_material("f7f2df", 0.84), root)


func _add_menu_board_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var board_material := _make_material_from_color(accent.darkened(0.3), 0.8)
	var chalk_material := _make_material("fff4df", 0.86)
	_add_box(position_3d + Vector3(0.0, 0.34, 0.0), Vector3(0.3, 0.42, 0.04), board_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.44, 0.024), Vector3(0.2, 0.035, 0.018), chalk_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.34, 0.024), Vector3(0.24, 0.025, 0.018), chalk_material, parent)


func _add_ice_box_local(parent: Node, position_3d: Vector3, color: Color) -> void:
	var box_material := _make_material("eef6fb", 0.7)
	var trim_material := _make_material_from_color(color, 0.76)
	_add_box(position_3d + Vector3(0.0, 0.26, 0.0), Vector3(0.42, 0.52, 0.28), box_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.5, 0.16), Vector3(0.34, 0.1, 0.035), trim_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.28, 0.17), Vector3(0.24, 0.18, 0.025), _make_material("bfe6ff", 0.5), parent)


func _add_newspaper_box_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var box_material := _make_material_from_color(accent.darkened(0.1), 0.78)
	_add_box(position_3d + Vector3(0.0, 0.2, 0.0), Vector3(0.28, 0.36, 0.22), box_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.28, 0.13), Vector3(0.18, 0.12, 0.025), _make_material("fff4df", 0.86), parent)


func create_property_visual_framework(root: Node3D, lot_root: Node3D, structure_root: Node3D, tool: String, variant: int, include_parking: bool = true, rebuild_lot_layout: bool = true) -> Dictionary:
	var preset := _property_visual_preset_for_variant(tool, variant)
	var sections := _property_visual_sections(root, lot_root, structure_root)
	if preset.is_empty():
		return sections
	var palette := _cozy_palette(tool, variant)
	_apply_property_structure_setback(sections["building_anchor"] as Node3D, preset)
	_validate_property_visual_spacing(tool, preset)
	root.set_meta("visual_preset", tool)
	root.set_meta("visual_lot_type", str(preset.get("lot_type", "commercial")))
	var visual_lot_size: Vector2 = preset.get("lot_size", Vector2(0.0, LOT_DEPTH))
	root.set_meta("visual_lot_depth", visual_lot_size.y)
	root.set_meta("visual_building_setback", float(preset.get("building_z_offset", 0.0)))
	root.set_meta("visual_props", preset.get("props", []))
	if rebuild_lot_layout:
		root.set_meta("visual_layout_version", 2)
		create_lot_base(sections["lot_base"], preset)
		create_sidewalk_connection(sections["sidewalk"], preset)
		_add_property_ground_variation(sections["landscaping"], preset, variant)
		create_bush_row(sections["landscaping"], preset, Color("6fa85b"))
		if include_parking:
			create_parking_lot(sections["parking"], preset, palette["accent"], palette["trim"])
		_add_property_composed_lot_details(tool, sections, preset, palette, variant)
		_add_property_identity_props(tool, sections, preset, palette)
	return sections


func _clear_property_visuals(root: Node3D) -> void:
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	for child in root.get_children():
		if child == lot_root or child == structure_root:
			continue
		root.remove_child(child)
		child.free()
	for visual_root in [lot_root, structure_root]:
		for child in visual_root.get_children():
			visual_root.remove_child(child)
			child.free()


func _clear_property_building_visuals(root: Node3D) -> void:
	var structure_root := _property_structure_root(root)
	for child in structure_root.get_children():
		structure_root.remove_child(child)
		child.free()
	var dynamic_props := _property_dynamic_props_root(root)
	for child in dynamic_props.get_children():
		dynamic_props.remove_child(child)
		child.free()


func _rebuild_house_visuals_in_place(root: Node3D, tier: int, variant: int, variant_id: String = "") -> void:
	_clear_property_building_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_village_house_variant(root, lot_root, structure_root, variant, false, variant_id)
	var resolved_variant_id := _resolve_property_variant_id(BUILD_TOOL_HOUSE, variant, variant_id)
	_apply_property_tier_visuals(root, BUILD_TOOL_HOUSE, tier, variant, resolved_variant_id)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)
	root.set_meta("variant_id", resolved_variant_id)


func _rebuild_fire_visuals_in_place(root: Node3D, tier: int, variant: int, variant_id: String = "") -> void:
	_clear_property_building_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_fire_station_variant(root, lot_root, structure_root, variant, false)
	var resolved_variant_id := _resolve_property_variant_id(BUILD_TOOL_FIRE, variant, variant_id)
	_apply_property_tier_visuals(root, BUILD_TOOL_FIRE, tier, variant, resolved_variant_id)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)
	root.set_meta("variant_id", resolved_variant_id)


func _populate_service_variant(tool: String, root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	match tool:
		BUILD_TOOL_BANK:
			_populate_bank_variant(root, lot_root, structure_root, variant, rebuild_lot_layout)
		BUILD_TOOL_GROCERY:
			_populate_grocery_variant(root, lot_root, structure_root, variant, rebuild_lot_layout)
		BUILD_TOOL_RESTAURANT:
			_populate_restaurant_variant(root, lot_root, structure_root, variant, rebuild_lot_layout)
		BUILD_TOOL_CORNER_STORE:
			_populate_corner_store_variant(root, lot_root, structure_root, variant, rebuild_lot_layout)
		_:
			pass


func _rebuild_service_visuals_in_place(root: Node3D, tool: String, tier: int, variant: int, variant_id: String = "") -> void:
	var before_global := root.global_position
	var before_rotation := root.global_rotation_degrees
	_clear_property_building_visuals(root)
	var lot_root := _property_lot_root(root)
	var structure_root := _property_structure_root(root)
	_populate_service_variant(tool, root, lot_root, structure_root, variant, false)
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	_apply_property_tier_visuals(root, tool, tier, variant, resolved_variant_id)
	root.set_meta("tier", tier)
	root.set_meta("variant", variant)
	root.set_meta("variant_id", resolved_variant_id)
	var after_global := root.global_position
	var after_rotation := root.global_rotation_degrees
	print("[%s UPGRADE VERIFY] before_pos=%s after_pos=%s before_rot=%s after_rot=%s identical_pos=%s identical_rot=%s" % [
		tool.to_upper(),
		str(before_global),
		str(after_global),
		str(before_rotation),
		str(after_rotation),
		str(before_global.is_equal_approx(after_global)),
		str(before_rotation.is_equal_approx(after_rotation))
	])


func _adjust_zoom(delta_amount: float) -> void:
	_target_zoom = clamp(_target_zoom + delta_amount, MIN_ZOOM, MAX_ZOOM)


func _rotate_camera(delta_yaw: float) -> void:
	_target_camera_yaw = wrapf(snappedf(_target_camera_yaw + delta_yaw, PI * 0.5), -PI, PI)


func _update_keyboard_camera(delta: float) -> void:
	var move := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		move.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		move.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		move.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		move.y += 1.0
	if move != Vector2.ZERO:
		move = move.normalized()
		var right := Vector3.RIGHT.rotated(Vector3.UP, _target_camera_yaw)
		var forward := Vector3.FORWARD.rotated(Vector3.UP, _target_camera_yaw)
		var motion := (right * move.x + forward * move.y) * delta * 8.0
		var pan_limit := _pan_limit()
		_target_focus.x = clamp(_target_focus.x + motion.x, -pan_limit, pan_limit)
		_target_focus.z = clamp(_target_focus.z + motion.z, -pan_limit, pan_limit)

	if Input.is_key_pressed(KEY_EQUAL) or Input.is_key_pressed(KEY_KP_ADD):
		_target_zoom = max(MIN_ZOOM, _target_zoom - delta * 10.0)
	elif Input.is_key_pressed(KEY_MINUS) or Input.is_key_pressed(KEY_KP_SUBTRACT):
		_target_zoom = min(MAX_ZOOM, _target_zoom + delta * 10.0)


func _is_pointer_over_hud() -> bool:
	var hovered := get_viewport().gui_get_hovered_control()
	if hovered == null or _hud_panel == null:
		return false
	return _hud_panel == hovered or _hud_panel.is_ancestor_of(hovered)


func _toggle_fullscreen() -> void:
	var current_mode := DisplayServer.window_get_mode()
	if current_mode == DisplayServer.WINDOW_MODE_FULLSCREEN or current_mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
		_exit_fullscreen()
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)


func _exit_fullscreen() -> void:
	if OS.has_feature("web"):
		if Engine.has_singleton("JavaScriptBridge"):
			JavaScriptBridge.eval("if (document.fullscreenElement) { document.exitFullscreen(); }", true)
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)


func _reset_camera_view() -> void:
	_target_focus = Vector3.ZERO
	_focus = _target_focus
	_target_zoom = DEFAULT_ZOOM
	_zoom = _target_zoom
	_target_camera_yaw = deg_to_rad(45.0)
	_camera_yaw = _target_camera_yaw
	_update_camera(true)


func _save_game() -> void:
	var save_data := {
		"money": _money,
		"day": _day,
		"clock": _simulation_clock,
		"build_tool": _build_tool,
		"ambient_light_scale": _ambient_light_scale,
		"focus": [_target_focus.x, _target_focus.y, _target_focus.z],
		"zoom": _target_zoom,
		"yaw": _target_camera_yaw,
		"placements": []
	}
	var placement_list: Array = []
	for anchor_key in _placements.keys():
		var placement = _placements[anchor_key]
		var anchor: Vector2i = placement["anchor"]
		placement_list.append({
			"tool": placement["tool"],
			"anchor": [anchor.x, anchor.y],
			"cost": int(placement["cost"]),
			"tier": int(placement.get("tier", 1)),
			"variant": int(placement.get("variant", -1)),
			"variant_id": str(placement.get("variant_id", "")),
			"frontage_side": str(placement.get("frontage_side", "")),
		})
	save_data["placements"] = placement_list

	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		if _hint_label:
			_hint_label.text = "Could not save the town right now."
		return
	file.store_string(JSON.stringify(save_data))
	file.close()
	if _hint_label:
		_hint_label.text = "Town saved. You can reload it anytime from this device."


func _load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		if _hint_label:
			_hint_label.text = "No saved town yet. Build something first, then use Save Town."
		return
	_try_load_game(true)


func _try_load_game(force_feedback: bool = false) -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		if force_feedback and _hint_label:
			_hint_label.text = "No saved town found on this device."
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		if force_feedback and _hint_label:
			_hint_label.text = "Saved town could not be opened."
		return
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	var parse_result := json.parse(text)
	if parse_result != OK or typeof(json.data) != TYPE_DICTIONARY:
		if force_feedback and _hint_label:
			_hint_label.text = "Saved town is corrupted or unreadable."
		return
	var data: Dictionary = json.data
	_clear_map_data()
	_money = int(data.get("money", STARTING_MONEY))
	_day = int(data.get("day", 1))
	_simulation_clock = float(data.get("clock", 0.0))
	_build_tool = str(data.get("build_tool", BUILD_TOOL_ROAD))
	_set_ambient_light_scale(_normalize_ambient_light_scale(float(data.get("ambient_light_scale", 1.0))))
	var focus_data: Array = data.get("focus", [0.0, 0.0, 0.0])
	if focus_data.size() == 3:
		_target_focus = Vector3(float(focus_data[0]), float(focus_data[1]), float(focus_data[2]))
		_focus = _target_focus
	_target_zoom = float(data.get("zoom", DEFAULT_ZOOM))
	_zoom = _target_zoom
	_target_camera_yaw = float(data.get("yaw", deg_to_rad(45.0)))
	_camera_yaw = _target_camera_yaw
	var placements: Array = data.get("placements", [])
	for entry_variant in placements:
		if typeof(entry_variant) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = entry_variant
		var tool := str(entry.get("tool", ""))
		if tool == "" or not BUILD_TOOL_LABELS.has(tool):
			continue
		var anchor_data: Array = entry.get("anchor", [])
		if anchor_data.size() != 2:
			continue
		var anchor := Vector2i(int(anchor_data[0]), int(anchor_data[1]))
		if tool == BUILD_TOOL_ROAD:
			_mark_road_cell(anchor)
		else:
			var footprint := _tool_footprint_for_anchor(tool, anchor)
			var cells := _cells_for_anchor(anchor, footprint)
			var tier := int(entry.get("tier", 1))
			var variant := int(entry.get("variant", randi() % 10))
			var saved_variant_id := str(entry.get("variant_id", ""))
			var variant_architecture_version := int(entry.get("variant_architecture_version", 0))
			var needs_variant_remap := variant_architecture_version < PROPERTY_VARIANT_ARCHITECTURE_VERSION and not _property_variant_ids(tool).is_empty()
			if tool != BUILD_TOOL_RESTAURANT and variant_architecture_version >= 2:
				needs_variant_remap = false
			if needs_variant_remap:
				variant = _legacy_variant_seed_for_loaded_placement(tool, anchor, variant)
				saved_variant_id = ""
			var variant_id := _resolve_property_variant_id(tool, variant, saved_variant_id)
			var frontage_side := str(entry.get("frontage_side", _preferred_frontage_side(tool, anchor, footprint)))
			var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, footprint), _tool_rotation_y(tool, anchor, footprint, frontage_side), tier, variant, variant_id)
			_register_placement(anchor, cells, tool, node, int(entry.get("cost", BUILD_TOOL_COSTS.get(tool, 0))), tier, variant, frontage_side, variant_id)
			if not _action_history.is_empty():
				_action_history.pop_back()
	for road_key in _road_cells.keys():
		var cell := _anchor_key_to_cell(road_key)
		_rebuild_road_at(cell)
		_register_placement(cell, [cell], BUILD_TOOL_ROAD, _road_nodes.get(road_key), int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]), 1, -1)
		if not _action_history.is_empty():
			_action_history.pop_back()
	_loaded_save = true
	_clear_selected_anchor()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	_update_camera(true)
	if _hint_label:
		_hint_label.text = "Saved town loaded."


func _new_map() -> void:
	_clear_map_data()
	_money = STARTING_MONEY
	_day = 1
	_simulation_clock = 0.0
	_build_tool = BUILD_TOOL_ROAD
	_set_ambient_light_scale(1.0)
	_variant_cycle.clear()
	_loaded_save = false
	_build_starter_neighborhood()
	_reset_camera_view()
	_recalculate_cashflow()
	_rebuild_ambient_life()
	_refresh_road_lights()
	_refresh_tool_ui()
	_update_hover_from_mouse()
	if _hint_label:
		_hint_label.text = "Starter neighborhood ready. Select a build tool to expand the town."


func _build_starter_neighborhood() -> void:
	# A new player should arrive in a place worth caring about, not an empty test
	# field. This small neighborhood also establishes the scale and visual quality
	# that future construction is meant to continue.
	var road_cells: Array[Vector2i] = []
	for x in range(20, 49):
		road_cells.append(Vector2i(x, 31))
	for y in range(28, 36):
		road_cells.append(Vector2i(40, y))

	for cell in road_cells:
		if not _road_cells.has(_cell_key(cell)):
			_mark_road_cell(cell)
			_clear_nature_for_cells([cell])
	for cell in road_cells:
		_rebuild_road_at(cell)
		_register_placement(cell, [cell], BUILD_TOOL_ROAD, _road_nodes.get(_cell_key(cell)), int(BUILD_TOOL_COSTS[BUILD_TOOL_ROAD]), 1, -1)
		if not _action_history.is_empty():
			_action_history.pop_back()

	var properties := [
		{"tool": BUILD_TOOL_HOUSE, "anchor": Vector2i(22, 25), "frontage": "south", "tier": 2, "variant": 0},
		{"tool": BUILD_TOOL_HOUSE, "anchor": Vector2i(28, 25), "frontage": "south", "tier": 1, "variant": 3},
		{"tool": BUILD_TOOL_HOUSE, "anchor": Vector2i(34, 25), "frontage": "south", "tier": 2, "variant": 5},
		{"tool": BUILD_TOOL_HOUSE, "anchor": Vector2i(23, 33), "frontage": "north", "tier": 1, "variant": 2},
		{"tool": BUILD_TOOL_HOUSE, "anchor": Vector2i(30, 33), "frontage": "north", "tier": 2, "variant": 7},
		{"tool": BUILD_TOOL_PARK, "anchor": Vector2i(42, 34), "frontage": "south", "tier": 2, "variant": 2},
	]
	for spec_variant in properties:
		var spec: Dictionary = spec_variant
		var tool := str(spec["tool"])
		var anchor: Vector2i = spec["anchor"]
		var footprint := _tool_footprint_for_anchor(tool, anchor)
		var cells := _cells_for_anchor(anchor, footprint)
		var frontage := str(spec["frontage"])
		var tier := int(spec["tier"])
		var variant := int(spec["variant"])
		_clear_nature_for_cells(cells)
		var node := _spawn_building_for_tool(tool, _anchor_to_world(anchor, footprint), _tool_rotation_y(tool, anchor, footprint, frontage), tier, variant)
		_register_placement(anchor, cells, tool, node, int(BUILD_TOOL_COSTS.get(tool, 0)), tier, variant, frontage)
		if not _action_history.is_empty():
			_action_history.pop_back()

	_action_history.clear()
	_clear_selected_anchor()
	_build_tool = BUILD_TOOL_INSPECT
	_rebuild_ambient_life()
	_refresh_road_lights()
	if _hint_label:
		_hint_label.text = "Welcome to the neighborhood. Select a build tool to expand the town."


func _clear_map_data() -> void:
	for node_variant in _road_nodes.values():
		var node: Node3D = node_variant
		if is_instance_valid(node):
			node.queue_free()
	for placement_variant in _placements.values():
		var placement: Dictionary = placement_variant
		if placement["tool"] == BUILD_TOOL_ROAD:
			continue
		var building: Node3D = placement["node"]
		if is_instance_valid(building):
			building.queue_free()
	_occupied_cells.clear()
	_reserved_cells.clear()
	_placed_nodes.clear()
	_placements.clear()
	_cell_anchor_lookup.clear()
	_road_cells.clear()
	_road_nodes.clear()
	_clear_road_lights()
	_action_history.clear()
	_variant_cycle.clear()
	_clear_selected_anchor()
	_reset_nature_layer()
	_clear_ambient_life()


func _reset_nature_layer() -> void:
	for feature in _nature_features:
		if is_instance_valid(feature):
			feature.queue_free()
	_nature_features.clear()
	for patch in _meadow_patches:
		if is_instance_valid(patch):
			patch.queue_free()
	_meadow_patches.clear()
	for clump in _grass_clumps:
		if is_instance_valid(clump):
			clump.queue_free()
	_grass_clumps.clear()
	_build_meadow()


func _clear_nature_for_cells(cells: Array[Vector2i]) -> void:
	for i in range(_nature_features.size() - 1, -1, -1):
		var feature := _nature_features[i]
		if not is_instance_valid(feature):
			_nature_features.remove_at(i)
			continue
		var radius: float = float(feature.get_meta("clear_radius", 0.72))
		var feature_center := Vector2(feature.global_position.x, feature.global_position.z)
		for cell in cells:
			if _circle_overlaps_cell(feature_center, radius, cell):
				feature.queue_free()
				_nature_features.remove_at(i)
				break
	for cell in cells:
		for i in range(_grass_clumps.size() - 1, -1, -1):
			var clump := _grass_clumps[i]
			if not is_instance_valid(clump):
				_grass_clumps.remove_at(i)
				continue
			if _circle_overlaps_cell(Vector2(clump.position.x, clump.position.z), 0.72, cell):
				clump.queue_free()
				_grass_clumps.remove_at(i)
		for j in range(_meadow_patches.size() - 1, -1, -1):
			var patch := _meadow_patches[j]
			if not is_instance_valid(patch):
				_meadow_patches.remove_at(j)
				continue
			var radius: float = float(patch.get_meta("radius", 1.0))
			if _circle_overlaps_cell(Vector2(patch.position.x, patch.position.z), radius, cell):
				patch.queue_free()
				_meadow_patches.remove_at(j)


func _register_nature_feature(node: Node3D, clear_radius: float) -> void:
	node.set_meta("clear_radius", clear_radius)
	_nature_features.append(node)


func _circle_overlaps_cell(center: Vector2, radius: float, cell: Vector2i) -> bool:
	var world_center := _cell_to_world(cell)
	var half: float = 0.5
	var min_x: float = world_center.x - half
	var max_x: float = world_center.x + half
	var min_y: float = world_center.z - half
	var max_y: float = world_center.z + half
	var nearest_x: float = clampf(center.x, min_x, max_x)
	var nearest_y: float = clampf(center.y, min_y, max_y)
	return center.distance_to(Vector2(nearest_x, nearest_y)) <= radius


func _clear_ambient_life() -> void:
	for car in _ambient_cars:
		if is_instance_valid(car):
			car.queue_free()
	_ambient_cars.clear()
	for trolley in _ambient_trolleys:
		if is_instance_valid(trolley):
			trolley.queue_free()
	_ambient_trolleys.clear()
	for person in _ambient_people:
		if is_instance_valid(person):
			person.queue_free()
	_ambient_people.clear()
	_ambient_park_seats.clear()
	_ambient_social_point = Vector3.ZERO


func _rebuild_ambient_life() -> void:
	_clear_ambient_life()
	_ambient_life_clock = 0.0
	if _road_cells.is_empty():
		return
	var road_keys: Array = _road_cells.keys()
	var car_count := clampi(int(floor(float(road_keys.size()) / 18.0)), 0, 4)
	if road_keys.size() >= 18:
		car_count = maxi(car_count, 1)
	for index in range(car_count):
		var road_key: String = str(road_keys[(index * max(1, int(floor(float(road_keys.size()) / max(1, car_count))))) % road_keys.size()])
		var road_cell := _anchor_key_to_cell(road_key)
		var car := _spawn_ambient_car(road_cell, index)
		_life_root.add_child(car)
		_ambient_cars.append(car)
	if road_keys.size() >= 10:
		var trolley_start := _anchor_key_to_cell(str(road_keys[0]))
		var trolley := _spawn_ambient_trolley(trolley_start)
		_life_root.add_child(trolley)
		_ambient_trolleys.append(trolley)

	var anchors: Array = _placements.keys()
	_prepare_resident_activity_points(anchors)
	var person_count := mini(8, anchors.size())
	var spawned_people := 0
	for anchor_key_variant in anchors:
		if spawned_people >= person_count:
			break
		var anchor_key := str(anchor_key_variant)
		if not _placements.has(anchor_key):
			continue
		var placement: Dictionary = _placements[anchor_key]
		var tool := str(placement["tool"])
		if tool == BUILD_TOOL_ROAD or SCENIC_TOOL_SPECS.has(tool):
			continue
		var person := _spawn_ambient_person(anchor_key, spawned_people)
		_life_root.add_child(person)
		_ambient_people.append(person)
		spawned_people += 1
	if _ambient_people.size() >= 2:
		_ambient_people[0].set_meta("conversation_partner", _ambient_people[1])
		_ambient_people[1].set_meta("conversation_partner", _ambient_people[0])


func _prepare_resident_activity_points(anchors: Array) -> void:
	# Parks become genuine destinations: two people can rest while another pair
	# meets nearby. If a town has no park yet, use the first developed lot as a
	# modest social point so residents still feel connected.
	var park_center := Vector3.ZERO
	var found_park := false
	for anchor_key_variant in anchors:
		var anchor_key := str(anchor_key_variant)
		if not _placements.has(anchor_key):
			continue
		var placement: Dictionary = _placements[anchor_key]
		if str(placement.get("tool", "")) != BUILD_TOOL_PARK:
			continue
		var anchor: Vector2i = placement["anchor"]
		var footprint := _footprint_from_cells(placement["cells"])
		park_center = _anchor_to_world(anchor, footprint)
		found_park = true
		break
	if not found_park and not anchors.is_empty():
		var first_key := str(anchors[0])
		if _placements.has(first_key):
			var first_placement: Dictionary = _placements[first_key]
			park_center = _anchor_to_world(first_placement["anchor"], _footprint_from_cells(first_placement["cells"]))
	_ambient_social_point = park_center + Vector3(0.0, 0.03, -0.25)
	_ambient_park_seats = [
		park_center + Vector3(-0.78, 0.03, 0.0),
		park_center + Vector3(0.78, 0.03, 0.0),
	]


func _spawn_ambient_car(road_cell: Vector2i, index: int) -> Node3D:
	var root := Node3D.new()
	var route_points := _build_car_route(road_cell, index)
	if route_points.size() < 2:
		var road_center := _cell_to_world(road_cell)
		route_points = [road_center + Vector3(-0.4, 0.05, 0.0), road_center + Vector3(0.4, 0.05, 0.0)]
	var route_length := _route_length(route_points)
	var start := route_points[0]
	var initial_heading := atan2(route_points[1].x - route_points[0].x, route_points[1].z - route_points[0].z)
	root.position = start
	root.rotation.y = initial_heading
	root.set_meta("mode", "car")
	root.set_meta("route_points", route_points)
	root.set_meta("route_length", route_length)
	root.set_meta("route_progress", randf_range(0.0, maxf(route_length * 2.0, 0.01)))
	root.set_meta("speed", randf_range(1.4, 2.2))
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.48, 0.72), 0.16, root)

	var palette := [
		Color("d16758"),
		Color("5f8cb8"),
		Color("86a05d"),
		Color("e3be67"),
		Color("7e6ba1"),
	]
	var body_material := _make_material_from_color(palette[index % palette.size()], 0.68)
	var trim_material := _make_material("f6f1e4", 0.82)
	var tire_material := _make_material("26252b", 0.98)
	var hub_material := _make_material("d8d1c6", 0.88)
	var bumper_material := _make_material("ddd4c4", 0.86)
	var tail_material := _make_material("e85b49", 0.4, 0.0, true, "ff6d54", 0.2)
	var window_glass := _make_transparent_material(Color("bfe6ff"), 0.24, 0.16)
	var dark_trim := _make_material("2f3338", 0.9)
	var plate_material := _make_material("f8f1dc", 0.8)
	_add_soft_block(Vector3(0.0, 0.16, 0.0), Vector3(0.4, 0.18, 0.66), body_material, root, 0.09)
	_add_soft_block(Vector3(0.0, 0.3, -0.04), Vector3(0.28, 0.14, 0.32), trim_material, root, 0.06)
	_add_box(Vector3(0.0, 0.255, 0.14), Vector3(0.28, 0.035, 0.22), _make_material_from_color(palette[index % palette.size()].lightened(0.12), 0.58), root)
	_add_box(Vector3(0.0, 0.31, 0.13), Vector3(0.22, 0.08, 0.04), window_glass, root)
	_add_box(Vector3(0.0, 0.31, -0.22), Vector3(0.2, 0.08, 0.04), window_glass, root)
	_add_box(Vector3(-0.15, 0.3, -0.04), Vector3(0.04, 0.08, 0.2), window_glass, root)
	_add_box(Vector3(0.15, 0.3, -0.04), Vector3(0.04, 0.08, 0.2), window_glass, root)
	_add_box(Vector3(0.0, 0.13, 0.35), Vector3(0.26, 0.045, 0.04), bumper_material, root)
	_add_box(Vector3(0.0, 0.13, -0.35), Vector3(0.26, 0.045, 0.04), bumper_material, root)
	_add_box(Vector3(0.0, 0.17, 0.372), Vector3(0.12, 0.035, 0.018), plate_material, root)
	_add_box(Vector3(0.0, 0.17, -0.372), Vector3(0.12, 0.035, 0.018), plate_material, root)
	_add_box(Vector3(-0.14, 0.15, -0.36), Vector3(0.07, 0.04, 0.025), tail_material, root)
	_add_box(Vector3(0.14, 0.15, -0.36), Vector3(0.07, 0.04, 0.025), tail_material, root)
	_add_box(Vector3(0.0, 0.26, -0.04), Vector3(0.3, 0.035, 0.34), _make_material_from_color(palette[index % palette.size()].lightened(0.08), 0.62), root)
	for side_x in [-0.215, 0.215]:
		_add_box(Vector3(side_x, 0.2, 0.0), Vector3(0.024, 0.045, 0.5), dark_trim, root)
		_add_box(Vector3(side_x, 0.26, 0.2), Vector3(0.026, 0.05, 0.045), dark_trim, root)
		_add_box(Vector3(side_x, 0.26, -0.2), Vector3(0.026, 0.05, 0.045), dark_trim, root)
	for wheel_data in [
		Vector3(-0.19, 0.075, -0.22),
		Vector3(0.19, 0.075, -0.22),
		Vector3(-0.19, 0.075, 0.22),
		Vector3(0.19, 0.075, 0.22),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.05, 0.05, 0.04, tire_material, root)
		wheel.rotation_degrees.z = 90.0
		var hub := _add_local_cylinder(wheel_data + Vector3(0.0, 0.0, 0.002), 0.026, 0.026, 0.045, hub_material, root)
		hub.rotation_degrees.z = 90.0
	for fender_data in [
		Vector3(-0.2, 0.135, -0.22),
		Vector3(0.2, 0.135, -0.22),
		Vector3(-0.2, 0.135, 0.22),
		Vector3(0.2, 0.135, 0.22),
	]:
		_add_box(fender_data, Vector3(0.06, 0.035, 0.14), body_material, root)
	_add_car_detail_package(root, index, body_material, trim_material, dark_trim, window_glass)
	_add_vehicle_headlights_local(root, 0.39, 0.12, 0.15, 3.2, 0.34)
	return root


func _spawn_ambient_trolley(road_cell: Vector2i) -> Node3D:
	var root := Node3D.new()
	var route_points := _build_trolley_route(road_cell)
	if route_points.size() < 2:
		var road_center := _cell_to_world(road_cell)
		route_points = [road_center + Vector3(0.0, 0.07, -0.6), road_center + Vector3(0.0, 0.07, 0.6)]
	var route_length := _route_length(route_points)
	root.position = route_points[0]
	root.rotation.y = atan2(route_points[1].x - route_points[0].x, route_points[1].z - route_points[0].z)
	root.set_meta("mode", "trolley")
	root.set_meta("route_points", route_points)
	root.set_meta("route_length", route_length)
	root.set_meta("route_progress", randf_range(0.0, maxf(route_length * 2.0, 0.01)))
	root.set_meta("speed", 1.25)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.72, 1.1), 0.18, root)
	var body_material := _make_material("d3b15b", 0.74)
	var trim_material := _make_material("f5efdf", 0.84)
	var stripe_material := _make_material("9b5f35", 0.78)
	var roof_material := _make_material("7b6752", 0.86)
	var sign_material := _make_material("2e3942", 0.72, 0.0, true, "ffd875", 0.25)
	var hub_material := _make_material("d8d1c6", 0.88)
	var rail_glass := _make_transparent_material(Color("bfe6ff"), 0.24, 0.16)
	var brass_material := _make_material("d9b85f", 0.64)
	_add_soft_block(Vector3(0.0, 0.28, 0.0), Vector3(0.62, 0.3, 1.18), body_material, root, 0.08)
	_add_soft_block(Vector3(0.0, 0.54, 0.0), Vector3(0.52, 0.2, 1.06), trim_material, root, 0.06)
	_add_box(Vector3(0.0, 0.68, 0.0), Vector3(0.6, 0.08, 1.2), roof_material, root)
	_add_box(Vector3(0.0, 0.735, 0.0), Vector3(0.48, 0.035, 0.82), _make_material("9a8267", 0.84), root)
	for vent_z in [-0.28, 0.0, 0.28]:
		_add_box(Vector3(0.0, 0.77, vent_z), Vector3(0.24, 0.025, 0.07), brass_material, root)
	_add_box(Vector3(0.0, 0.42, 0.61), Vector3(0.44, 0.08, 0.035), stripe_material, root)
	_add_box(Vector3(0.0, 0.42, -0.61), Vector3(0.44, 0.08, 0.035), stripe_material, root)
	_add_box(Vector3(-0.33, 0.4, 0.0), Vector3(0.035, 0.06, 0.98), stripe_material, root)
	_add_box(Vector3(0.33, 0.4, 0.0), Vector3(0.035, 0.06, 0.98), stripe_material, root)
	_add_box(Vector3(0.0, 0.59, 0.58), Vector3(0.3, 0.1, 0.035), sign_material, root)
	_add_box(Vector3(0.0, 0.59, 0.62), Vector3(0.18, 0.035, 0.02), brass_material, root)
	_add_box(Vector3(0.0, 0.56, -0.58), Vector3(0.32, 0.11, 0.035), rail_glass, root)
	for window_z in [-0.3, 0.0, 0.3]:
		_add_box(Vector3(-0.27, 0.56, window_z), Vector3(0.035, 0.12, 0.18), rail_glass, root)
		_add_box(Vector3(0.27, 0.56, window_z), Vector3(0.035, 0.12, 0.18), rail_glass, root)
	for mullion_z in [-0.42, -0.15, 0.15, 0.42]:
		_add_box(Vector3(-0.292, 0.56, mullion_z), Vector3(0.02, 0.14, 0.025), stripe_material, root)
		_add_box(Vector3(0.292, 0.56, mullion_z), Vector3(0.02, 0.14, 0.025), stripe_material, root)
	for wheel_data in [
		Vector3(-0.22, 0.08, -0.36),
		Vector3(0.22, 0.08, -0.36),
		Vector3(-0.22, 0.08, 0.36),
		Vector3(0.22, 0.08, 0.36),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.06, 0.06, 0.05, _make_material("26252b", 0.98), root)
		wheel.rotation_degrees.z = 90.0
		var hub := _add_local_cylinder(wheel_data + Vector3(0.0, 0.0, 0.002), 0.03, 0.03, 0.055, hub_material, root)
		hub.rotation_degrees.z = 90.0
	var pole_material := _make_material("55514c", 0.92)
	_add_local_cylinder(Vector3(0.0, 0.94, 0.0), 0.018, 0.018, 0.66, pole_material, root)
	var trolley_arm := _add_local_cylinder(Vector3(0.0, 1.22, -0.18), 0.012, 0.012, 0.62, pole_material, root)
	trolley_arm.rotation_degrees.x = 58.0
	_add_box(Vector3(0.0, 1.5, -0.44), Vector3(0.16, 0.025, 0.04), pole_material, root)
	_add_box(Vector3(0.0, 0.2, 0.72), Vector3(0.5, 0.04, 0.08), brass_material, root)
	_add_box(Vector3(0.0, 0.2, -0.72), Vector3(0.5, 0.04, 0.08), brass_material, root)
	_add_trolley_detail_package(root, trim_material, stripe_material, brass_material, rail_glass)
	_add_vehicle_headlights_local(root, 0.66, 0.18, 0.18, 4.0, 0.42)
	return root


func _spawn_ambient_person(anchor_key: String, index: int) -> Node3D:
	var root := Node3D.new()
	var placement: Dictionary = _placements[anchor_key]
	var anchor: Vector2i = placement["anchor"]
	var cells: Array[Vector2i] = placement["cells"]
	var footprint := _footprint_from_cells(cells)
	var tool := str(placement.get("tool", BUILD_TOOL_HOUSE))
	var frontage_side := str(placement.get("frontage_side", _preferred_frontage_side(tool, anchor, footprint)))
	var sidewalk_route := _build_person_route(anchor, footprint, frontage_side, index, tool)
	if sidewalk_route.size() < 2:
		var rotation_y := _tool_rotation_y(str(placement["tool"]), anchor, footprint, frontage_side)
		var forward := Vector3(sin(rotation_y), 0.0, cos(rotation_y))
		var side := Vector3(forward.z, 0.0, -forward.x)
		var center := _anchor_to_world(anchor, footprint)
		var frontage := center + forward * (float(footprint.y) * 0.5 + 0.7)
		var stride := 0.52 + float(index % 3) * 0.08
		sidewalk_route = [
			frontage - side * stride + Vector3(0.0, 0.03, 0.0),
			frontage + side * stride + Vector3(0.0, 0.03, 0.0),
		]
	var start := sidewalk_route[0]
	root.position = start
	root.set_meta("mode", "person")
	root.set_meta("speed", randf_range(0.75, 1.15))
	root.set_meta("home_point", start)
	root.set_meta("activity_point", _resident_activity_point(index))
	root.set_meta("walk_target", _resident_activity_point(index))
	root.set_meta("routine", "walking")
	root.set_meta("arrival_routine", _resident_arrival_routine(index))
	root.set_meta("routine_timer", 0.0)
	root.set_meta("walk_phase", randf() * TAU)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.18, 0.18), 0.16, root)
	var visual := Node3D.new()
	visual.name = "Resident visual"
	root.add_child(visual)
	root.set_meta("visual", visual)

	var coat_palette := [
		Color("5b7db0"),
		Color("b86a58"),
		Color("728e57"),
		Color("8b6da8"),
		Color("cb9a5a"),
	]
	var coat_material := _make_material_from_color(coat_palette[index % coat_palette.size()], 0.74)
	var pant_material := _make_material("4a4748", 0.96)
	var skin_material := _make_material("e7c8a8", 0.86)
	var hair_colors := ["6a4632", "2d2522", "b6814d", "8c5a3c"]
	var hair_material := _make_material(str(hair_colors[index % hair_colors.size()]), 0.84)
	var shoe_material := _make_material("2b2929", 0.98)
	var bag_material := _make_material("b88955", 0.82)
	_add_soft_block(Vector3(0.0, 0.2, 0.0), Vector3(0.12, 0.2, 0.1), coat_material, visual, 0.04)
	_add_local_sphere(Vector3(0.0, 0.34, 0.0), 0.06, 0.08, skin_material, visual)
	_add_local_sphere(Vector3(0.0, 0.385, -0.005), 0.062, 0.04, hair_material, visual)
	if index % 3 == 0:
		_add_box(Vector3(0.0, 0.42, 0.0), Vector3(0.15, 0.025, 0.12), hair_material, visual)
		_add_box(Vector3(0.0, 0.44, 0.0), Vector3(0.09, 0.035, 0.08), hair_material, visual)
	var left_arm_pivot := Node3D.new()
	left_arm_pivot.position = Vector3(-0.075, 0.27, 0.0)
	visual.add_child(left_arm_pivot)
	_add_box(Vector3(0.0, -0.07, 0.0), Vector3(0.025, 0.16, 0.025), skin_material, left_arm_pivot)
	var right_arm_pivot := Node3D.new()
	right_arm_pivot.position = Vector3(0.075, 0.27, 0.0)
	visual.add_child(right_arm_pivot)
	_add_box(Vector3(0.0, -0.07, 0.0), Vector3(0.025, 0.16, 0.025), skin_material, right_arm_pivot)
	var left_leg_pivot := Node3D.new()
	left_leg_pivot.position = Vector3(-0.03, 0.13, 0.0)
	visual.add_child(left_leg_pivot)
	_add_box(Vector3(0.0, -0.06, 0.0), Vector3(0.03, 0.14, 0.03), pant_material, left_leg_pivot)
	_add_box(Vector3(0.0, -0.135, 0.02), Vector3(0.055, 0.025, 0.04), shoe_material, left_leg_pivot)
	var right_leg_pivot := Node3D.new()
	right_leg_pivot.position = Vector3(0.03, 0.13, 0.0)
	visual.add_child(right_leg_pivot)
	_add_box(Vector3(0.0, -0.06, 0.0), Vector3(0.03, 0.14, 0.03), pant_material, right_leg_pivot)
	_add_box(Vector3(0.0, -0.135, 0.02), Vector3(0.055, 0.025, 0.04), shoe_material, right_leg_pivot)
	_add_box(Vector3(0.0, 0.23, -0.07), Vector3(0.12, 0.03, 0.03), _make_material("f5efe4", 0.86), visual)
	if index % 2 == 1:
		_add_box(Vector3(-0.085, 0.2, -0.045), Vector3(0.04, 0.12, 0.035), bag_material, visual)
	root.set_meta("left_arm", left_arm_pivot)
	root.set_meta("right_arm", right_arm_pivot)
	root.set_meta("left_leg", left_leg_pivot)
	root.set_meta("right_leg", right_leg_pivot)
	return root


func _animate_life(delta: float) -> void:
	_ambient_life_clock += delta
	for car in _ambient_cars:
		if not is_instance_valid(car):
			continue
		var route_points: Array = car.get_meta("route_points", [])
		var route_length: float = float(car.get_meta("route_length", 0.0))
		if route_points.size() < 2 or route_length <= 0.01:
			continue
		var progress: float = float(car.get_meta("route_progress", 0.0)) + delta * float(car.get_meta("speed", 1.6))
		car.set_meta("route_progress", progress)
		var sample := _sample_ping_pong_route(route_points, route_length, progress)
		car.position = sample["position"]
		car.rotation.y = lerp_angle(car.rotation.y, float(sample["heading"]), min(1.0, delta * 10.0))

	for trolley in _ambient_trolleys:
		if not is_instance_valid(trolley):
			continue
		var route_points: Array = trolley.get_meta("route_points", [])
		var route_length: float = float(trolley.get_meta("route_length", 0.0))
		if route_points.size() < 2 or route_length <= 0.01:
			continue
		var progress: float = float(trolley.get_meta("route_progress", 0.0)) + delta * float(trolley.get_meta("speed", 1.25))
		trolley.set_meta("route_progress", progress)
		var sample := _sample_ping_pong_route(route_points, route_length, progress)
		trolley.position = sample["position"]
		trolley.rotation.y = sample["heading"]

	for person in _ambient_people:
		if not is_instance_valid(person):
			continue
		_animate_resident_routine(person, delta)


func _resident_activity_point(index: int) -> Vector3:
	if index < 2:
		return _ambient_social_point + Vector3(-0.16 if index == 0 else 0.16, 0.03, 0.0)
	if index < 4 and _ambient_park_seats.size() >= 2:
		return _ambient_park_seats[index - 2]
	return _ambient_social_point + Vector3(cos(float(index) * 2.1) * 0.7, 0.03, sin(float(index) * 2.1) * 0.7)


func _resident_arrival_routine(index: int) -> String:
	if index < 2:
		return "talking"
	if index < 4:
		return "sitting"
	return "talking" if index % 2 == 0 else "sitting"


func _animate_resident_routine(person: Node3D, delta: float) -> void:
	var routine := str(person.get_meta("routine", "walking"))
	var visual := person.get_meta("visual", null) as Node3D
	var left_arm := person.get_meta("left_arm", null) as Node3D
	var right_arm := person.get_meta("right_arm", null) as Node3D
	var left_leg := person.get_meta("left_leg", null) as Node3D
	var right_leg := person.get_meta("right_leg", null) as Node3D
	if visual == null:
		return
	var phase := float(person.get_meta("walk_phase", 0.0)) + delta * float(person.get_meta("speed", 0.9)) * 8.0
	person.set_meta("walk_phase", phase)
	if routine == "walking":
		visual.visible = true
		var target: Vector3 = person.get_meta("walk_target", person.get_meta("activity_point", person.position))
		var flat_delta := target - person.position
		flat_delta.y = 0.0
		if flat_delta.length() <= 0.055:
			person.position = target
			var arrival := str(person.get_meta("arrival_routine", "talking"))
			_set_resident_routine(person, arrival, 7.0 + fmod(phase, 5.0))
			return
		var direction := flat_delta.normalized()
		person.position += direction * float(person.get_meta("speed", 0.9)) * delta
		person.rotation.y = lerp_angle(person.rotation.y, atan2(direction.x, direction.z), min(1.0, delta * 9.0))
		visual.position.y = abs(sin(phase)) * 0.018
		visual.rotation.z = sin(phase * 0.5) * 0.035
		var stride := sin(phase) * 0.52
		if left_arm: left_arm.rotation.x = -stride * 0.72
		if right_arm: right_arm.rotation.x = stride * 0.72
		if left_leg: left_leg.rotation.x = stride
		if right_leg: right_leg.rotation.x = -stride
		return

	var timer := float(person.get_meta("routine_timer", 0.0)) - delta
	person.set_meta("routine_timer", timer)
	if routine == "inside":
		visual.visible = false
		if timer <= 0.0:
			person.set_meta("walk_target", person.get_meta("activity_point", person.position))
			person.set_meta("arrival_routine", person.get_meta("next_activity", "talking"))
			_set_resident_routine(person, "walking", 0.0)
		return

	visual.visible = true
	visual.position.y = 0.0
	visual.rotation.z = sin(_ambient_life_clock * 1.7 + phase) * 0.012
	if routine == "talking":
		var partner: Node3D = person.get_meta("conversation_partner") as Node3D if person.has_meta("conversation_partner") else null
		if is_instance_valid(partner):
			var toward_partner := partner.position - person.position
			toward_partner.y = 0.0
			if toward_partner.length() > 0.01:
				person.rotation.y = lerp_angle(person.rotation.y, atan2(toward_partner.x, toward_partner.z), min(1.0, delta * 6.0))
		if left_arm: left_arm.rotation.x = sin(_ambient_life_clock * 2.6 + phase) * 0.28
		if right_arm: right_arm.rotation.x = -sin(_ambient_life_clock * 2.1 + phase) * 0.22
	if routine == "sitting":
		visual.position.y = -0.055
		visual.rotation.x = -0.18
		if left_leg: left_leg.rotation.x = -1.18
		if right_leg: right_leg.rotation.x = -1.18
		if left_arm: left_arm.rotation.x = -0.32
		if right_arm: right_arm.rotation.x = -0.32
	if timer <= 0.0:
		person.set_meta("walk_target", person.get_meta("home_point", person.position))
		person.set_meta("arrival_routine", "inside")
		person.set_meta("next_activity", "sitting" if routine == "talking" else "talking")
		_set_resident_routine(person, "walking", 0.0)


func _set_resident_routine(person: Node3D, routine: String, duration: float) -> void:
	person.set_meta("routine", routine)
	person.set_meta("routine_timer", duration)
	if routine == "inside":
		person.set_meta("routine_timer", 5.0 + fmod(float(person.get_meta("walk_phase", 0.0)), 5.0))


func _build_car_route(start_cell: Vector2i, index: int) -> Array[Vector3]:
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return []
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return []
	var route: Array[Vector3] = []
	var lane_sign := -1.0 if index % 2 == 0 else 1.0
	for i in range(path.size()):
		var cell: Vector2i = path[i]
		var center := _cell_to_world(cell)
		var direction := Vector3.ZERO
		if i < path.size() - 1:
			direction = (_cell_to_world(path[i + 1]) - center).normalized()
		elif i > 0:
			direction = (center - _cell_to_world(path[i - 1])).normalized()
		if direction.length() < 0.01:
			direction = Vector3.RIGHT
		var lateral := Vector3(direction.z, 0.0, -direction.x)
		var lane_offset := lateral * (0.42 * lane_sign)
		route.append(center + lane_offset + Vector3(0.0, 0.05, 0.0))
	return route


func _build_trolley_route(start_cell: Vector2i) -> Array[Vector3]:
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return []
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return []
	var route: Array[Vector3] = []
	for cell in path:
		var center := _cell_to_world(cell)
		route.append(center + Vector3(0.0, 0.07, 0.0))
	return route


func _frontage_road_cells(anchor: Vector2i, footprint: Vector2i, side: String, tool: String = BUILD_TOOL_HOUSE) -> Array[Vector2i]:
	var road_cells: Array[Vector2i] = []
	var road_offset := _frontage_transport_offset(tool)
	match side:
		"north":
			for dx in range(footprint.x):
				var cell := Vector2i(anchor.x + dx, anchor.y - road_offset)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"south":
			for dx in range(footprint.x):
				var cell := Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + road_offset)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"west":
			for dz in range(footprint.y):
				var cell := Vector2i(anchor.x - road_offset, anchor.y + dz)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
		"east":
			for dz in range(footprint.y):
				var cell := Vector2i(anchor.x + footprint.x - 1 + road_offset, anchor.y + dz)
				if _road_cells.has(_cell_key(cell)):
					road_cells.append(cell)
	return road_cells


func _build_person_route(anchor: Vector2i, footprint: Vector2i, frontage_side: String, index: int, tool: String = BUILD_TOOL_HOUSE) -> Array[Vector3]:
	var road_cells := _frontage_road_cells(anchor, footprint, frontage_side, tool)
	if road_cells.size() < 1:
		return []
	var start_cell := road_cells[index % road_cells.size()]
	var component := _road_component_cells(start_cell)
	if component.size() < 2:
		return _build_sidewalk_route(anchor, footprint, frontage_side, tool)
	var far_a := _farthest_road_in_component(start_cell, component)
	var far_b := _farthest_road_in_component(far_a, component)
	var path := _road_path_between(far_a, far_b, component)
	if path.size() < 2:
		return _build_sidewalk_route(anchor, footprint, frontage_side, tool)
	var route: Array[Vector3] = []
	var sidewalk_sign := 1.0 if index % 2 == 0 else -1.0
	for i in range(path.size()):
		var road_cell: Vector2i = path[i]
		var center := _cell_to_world(road_cell)
		var direction := Vector3.ZERO
		if i < path.size() - 1:
			direction = (_cell_to_world(path[i + 1]) - center).normalized()
		elif i > 0:
			direction = (center - _cell_to_world(path[i - 1])).normalized()
		if direction.length() < 0.01:
			direction = Vector3.RIGHT
		var lateral := Vector3(direction.z, 0.0, -direction.x)
		var point := center + lateral * (SIDEWALK_ROUTE_OFFSET * sidewalk_sign) + Vector3(0.0, 0.03, 0.0)
		route.append(point)
	if route.size() >= 2 and randf() < 0.35:
		var center := _anchor_to_world(anchor, footprint)
		var rotation_y := _tool_rotation_y(BUILD_TOOL_HOUSE, anchor, footprint, frontage_side)
		var forward := Vector3(sin(rotation_y), 0.0, cos(rotation_y))
		var lateral := Vector3(forward.z, 0.0, -forward.x)
		var yard_front := center + forward * (float(footprint.y) * 0.5 - 1.55) + lateral * (0.42 if index % 2 == 0 else -0.42)
		var yard_back := center + forward * (float(footprint.y) * 0.5 - 2.3) + lateral * (0.78 if index % 2 == 0 else -0.78)
		route.push_front(yard_back + Vector3(0.0, 0.03, 0.0))
		route.push_front(yard_front + Vector3(0.0, 0.03, 0.0))
	return route


func _build_sidewalk_route(anchor: Vector2i, footprint: Vector2i, frontage_side: String = "", tool: String = BUILD_TOOL_HOUSE) -> Array[Vector3]:
	var side := frontage_side if frontage_side != "" else _preferred_frontage_side(tool, anchor, footprint)
	var road_cells := _frontage_road_cells(anchor, footprint, side, tool)
	if road_cells.size() < 1:
		return []
	road_cells.sort_custom(func(a: Vector2i, b: Vector2i) -> bool:
		if side == "north" or side == "south":
			return a.x < b.x
		return a.y < b.y
	)
	var route: Array[Vector3] = []
	for road_cell in road_cells:
		var center := _cell_to_world(road_cell)
		var point := center + Vector3(0.0, 0.03, 0.0)
		match side:
			"north":
				point.z += SIDEWALK_ROUTE_OFFSET
			"south":
				point.z -= SIDEWALK_ROUTE_OFFSET
			"west":
				point.x += SIDEWALK_ROUTE_OFFSET
			"east":
				point.x -= SIDEWALK_ROUTE_OFFSET
		route.append(point)
	return route


func _road_component_cells(start_cell: Vector2i) -> Array[Vector2i]:
	if not _road_cells.has(_cell_key(start_cell)):
		return []
	var queue: Array[Vector2i] = [start_cell]
	var visited := {_cell_key(start_cell): true}
	var component: Array[Vector2i] = []
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		component.append(current)
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not _road_cells.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			queue.append(neighbor)
	return component


func _farthest_road_in_component(start_cell: Vector2i, component: Array[Vector2i]) -> Vector2i:
	var allowed := {}
	for cell in component:
		allowed[_cell_key(cell)] = true
	var queue: Array[Vector2i] = [start_cell]
	var visited := {_cell_key(start_cell): true}
	var last := start_cell
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		last = current
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not allowed.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			queue.append(neighbor)
	return last


func _road_path_between(start_cell: Vector2i, end_cell: Vector2i, component: Array[Vector2i]) -> Array[Vector2i]:
	var allowed := {}
	for cell in component:
		allowed[_cell_key(cell)] = true
	var queue: Array[Vector2i] = [start_cell]
	var parents := {}
	var visited := {_cell_key(start_cell): true}
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		if current == end_cell:
			break
		for neighbor in _neighbor_cells(current):
			var neighbor_key := _cell_key(neighbor)
			if visited.has(neighbor_key) or not allowed.has(neighbor_key):
				continue
			visited[neighbor_key] = true
			parents[neighbor_key] = current
			queue.append(neighbor)
	if not visited.has(_cell_key(end_cell)):
		return [start_cell, end_cell]
	var path: Array[Vector2i] = []
	var current: Vector2i = end_cell
	while true:
		path.push_front(current)
		if current == start_cell:
			break
		current = parents[_cell_key(current)]
	return path


func _route_length(route_points: Array[Vector3]) -> float:
	var total := 0.0
	for i in range(route_points.size() - 1):
		total += route_points[i].distance_to(route_points[i + 1])
	return total


func _sample_ping_pong_route(route_points: Array[Vector3], route_length: float, progress: float) -> Dictionary:
	var cycle_length := maxf(route_length * 2.0, 0.001)
	var cycle_progress := fmod(progress, cycle_length)
	var travel := cycle_progress
	var reverse := false
	if cycle_progress > route_length:
		travel = cycle_length - cycle_progress
		reverse = true
	var traversed := 0.0
	for i in range(route_points.size() - 1):
		var a: Vector3 = route_points[i]
		var b: Vector3 = route_points[i + 1]
		var segment_length := a.distance_to(b)
		if traversed + segment_length >= travel or i == route_points.size() - 2:
			var local_t := 0.0 if segment_length <= 0.001 else clampf((travel - traversed) / segment_length, 0.0, 1.0)
			var position := a.lerp(b, local_t)
			var heading_vec := (a - b) if reverse else (b - a)
			var heading := 0.0
			if heading_vec.length() > 0.01:
				heading = atan2(heading_vec.x, heading_vec.z)
			return {
				"position": position,
				"heading": heading,
			}
		traversed += segment_length
	return {
		"position": route_points[route_points.size() - 1],
		"heading": 0.0,
	}


func _update_day_night_visuals() -> void:
	if lighting_controller and lighting_controller.has_method("apply_cycle"):
		lighting_controller.call("apply_cycle", _day, _simulation_clock, _window_bands, _town_light_strength(), _ambient_light_scale)
		return
	var town_strength := _town_light_strength()
	var daylight_scale := clampf(_ambient_light_scale, 0.0, 1.0)
	var night_amount := 1.0 - daylight_scale
	var daylight_curve := pow(daylight_scale, 1.12)
	var sky_top: Color = Color(0.68, 0.84, 0.98).lerp(Color(0.025, 0.035, 0.075), night_amount)
	var sky_horizon: Color = Color(1.0, 0.88, 0.66).lerp(Color(0.05, 0.06, 0.11), night_amount)
	if world_environment and world_environment.environment:
		var env: Environment = world_environment.environment
		env.background_mode = Environment.BG_SKY
		env.background_color = sky_top.lerp(sky_horizon, 0.08)
		env.ambient_light_color = Color(0.8, 0.84, 0.74).lerp(Color(0.16, 0.2, 0.32), night_amount)
		env.ambient_light_energy = lerpf(0.12, 0.82, daylight_curve)
		env.fog_enabled = false
		env.fog_light_energy = 0.0
		env.fog_density = 0.0
		env.glow_enabled = true
		env.glow_bloom = lerpf(0.0, 0.014, daylight_curve)
		env.glow_intensity = lerpf(0.0, 0.075, daylight_curve)
		env.adjustment_enabled = true
		env.adjustment_brightness = lerpf(0.76, 1.0, daylight_scale)
		env.adjustment_contrast = lerpf(1.12, 1.08, daylight_scale)
		env.adjustment_saturation = lerpf(0.98, 1.07, daylight_scale)
	if sun:
		sun.light_color = Color(1.0, 0.86, 0.62).lerp(Color(0.58, 0.66, 0.86), night_amount)
		sun.light_energy = lerpf(0.08, 1.42, daylight_curve)
		sun.rotation_degrees = Vector3(lerpf(-34.0, -54.0, daylight_scale), 30.0, 0.0)
		sun.shadow_blur = 2.35
	if fill_light:
		fill_light.light_color = Color(0.62, 0.74, 1.0).lerp(Color(0.2, 0.26, 0.4), night_amount)
		fill_light.light_energy = lerpf(0.06, 0.2, daylight_curve)

	for band in _window_bands:
		if is_instance_valid(band):
			var material := band.material_override as StandardMaterial3D
			if material:
				material.emission_energy_multiplier = 0.08 + town_strength * 0.025 + night_amount * 0.18


func _spawn_road_tile(world_position: Vector3, preview: bool) -> Node3D:
	var cell := _world_to_cell(world_position)
	var extra := [cell]
	for neighbor in _neighbor_cells(cell):
		if _road_cells.has(_cell_key(neighbor)):
			extra.append(neighbor)
	var root := _build_road_tile_mesh(cell, preview, extra)
	root.position = world_position
	return root


func _town_light_strength() -> float:
	var active_count := 0
	for placement_variant in _placements.values():
		var placement: Dictionary = placement_variant
		var tool := str(placement.get("tool", ""))
		if tool == BUILD_TOOL_ROAD or SCENIC_TOOL_SPECS.has(tool):
			continue
		active_count += 1
	return clampf(0.03 + float(active_count) * 0.01, 0.0, 0.08)


func _spawn_house_tile(world_position: Vector3, preview: bool) -> Node3D:
	var root := Node3D.new()
	root.position = world_position
	var wall_material: Material = _ghost_base_material if preview else _make_material("efe4d5", 0.88)
	var roof_material: Material = _ghost_accent_material if preview else _make_material("b66f4d", 0.74)
	var pad_material: Material = _ghost_base_material if preview else _make_material("ddd3c6", 0.9)

	_add_box(Vector3(0.0, 0.02, 0.42), Vector3(4.6, 0.04, 4.6), pad_material, root)
	_add_box(Vector3(0.0, 0.5, -0.56), Vector3(1.62, 0.92, 1.34), wall_material, root)
	_add_box(Vector3(0.42, 0.42, 0.04), Vector3(0.62, 0.66, 0.7), wall_material, root)
	var roof_a := _add_box(Vector3(0.0, 1.0, -0.42), Vector3(1.84, 0.16, 0.82), roof_material, root)
	var roof_b := _add_box(Vector3(0.0, 1.0, -0.78), Vector3(1.84, 0.16, 0.82), roof_material, root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -7.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 7.0)
	var window_material: Material = _ghost_accent_material if preview else _window_material
	_add_window_band_local(Vector3(-0.46, 0.5, -0.12), Vector3(0.28, 0.34, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.46, 0.5, -0.12), Vector3(0.28, 0.34, 0.05), root, window_material)
	_add_window_band_local(Vector3(-0.66, 0.44, -0.88), Vector3(0.22, 0.28, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.66, 0.44, -0.88), Vector3(0.22, 0.28, 0.05), root, window_material)
	_add_window_band_local(Vector3(0.84, 0.42, -0.02), Vector3(0.18, 0.24, 0.05), root, window_material)
	_add_house_front_door_local(Vector3(0.0, 0.0, 0.82), root, preview)
	_add_house_front_lamp_local(Vector3(1.14, 0.0, 1.48), root, preview)
	return root


func _make_panel_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_right = 14
	style.corner_radius_bottom_left = 14
	style.content_margin_left = 14
	style.content_margin_top = 12
	style.content_margin_right = 14
	style.content_margin_bottom = 12
	return style


func _make_glass_panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.11, 0.16, 0.34)
	style.border_color = Color(0.94, 0.98, 1.0, 0.16)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_right = 20
	style.corner_radius_bottom_left = 20
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.18)
	style.shadow_size = 18
	style.content_margin_left = 12
	style.content_margin_top = 10
	style.content_margin_right = 12
	style.content_margin_bottom = 10
	return style


func _build_water_ring() -> void:
	var water := MeshInstance3D.new()
	var water_mesh := CylinderMesh.new()
	water_mesh.top_radius = float(GRID_SIZE) * 0.54
	water_mesh.bottom_radius = float(GRID_SIZE) * 0.59
	water_mesh.height = 0.22
	water.mesh = water_mesh
	water.material_override = _water_material
	water.position = Vector3(0.0, -0.62, 0.0)
	grid_root.add_child(water)

	var shallows := MeshInstance3D.new()
	var shallow_mesh := CylinderMesh.new()
	shallow_mesh.top_radius = float(GRID_SIZE) * 0.515
	shallow_mesh.bottom_radius = float(GRID_SIZE) * 0.54
	shallow_mesh.height = 0.08
	shallows.mesh = shallow_mesh
	shallows.material_override = _make_transparent_material(Color("d7f3ee"), 0.2, 0.28)
	shallows.position = Vector3(0.0, -0.49, 0.0)
	grid_root.add_child(shallows)

	for ring_data in [
		{"radius": float(GRID_SIZE) * 0.506, "height": -0.425, "alpha": 0.16},
		{"radius": float(GRID_SIZE) * 0.472, "height": -0.43, "alpha": 0.09},
	]:
		var ripple := MeshInstance3D.new()
		var ripple_mesh := TorusMesh.new()
		ripple_mesh.inner_radius = float(ring_data["radius"]) - 0.04
		ripple_mesh.outer_radius = float(ring_data["radius"]) + 0.04
		ripple_mesh.rings = 8
		ripple_mesh.ring_segments = 96
		ripple.mesh = ripple_mesh
		ripple.material_override = _make_transparent_material(Color("dff8ef"), 0.36, float(ring_data["alpha"]))
		ripple.position = Vector3(0.0, float(ring_data["height"]), 0.0)
		grid_root.add_child(ripple)
	_add_shoreline_pebbles()


func _build_island_base() -> void:
	var base := MeshInstance3D.new()
	var base_mesh := BoxMesh.new()
	base_mesh.size = Vector3(GRID_SIZE + 4.6, 1.1, GRID_SIZE + 4.6)
	base.mesh = base_mesh
	base.material_override = _soil_material
	base.position = Vector3(0.0, -0.66, 0.0)
	grid_root.add_child(base)

	var lip := MeshInstance3D.new()
	var lip_mesh := BoxMesh.new()
	# Keep the stone support clearly below the meadow surface. Its previous top
	# face landed at the exact same y as MeadowSurface, which caused WebGL
	# z-fighting stripes across the entire island.
	lip_mesh.size = Vector3(GRID_SIZE + 1.4, 0.2, GRID_SIZE + 1.4)
	lip.mesh = lip_mesh
	lip.material_override = _make_material("9b8b72", 0.95)
	lip.position = Vector3(0.0, -0.11, 0.0)
	grid_root.add_child(lip)

	var turf := MeshInstance3D.new()
	var turf_mesh := BoxMesh.new()
	# Keep the structural island cap below the authored meadow. Previously its top
	# sat at y=0.06, hiding both the detailed ground and the lower sidewalk layers.
	turf_mesh.size = Vector3(GRID_SIZE + 0.8, 0.08, GRID_SIZE + 0.8)
	turf.mesh = turf_mesh
	turf.material_override = _make_material("8fa369", 0.98)
	turf.position = Vector3(0.0, -0.07, 0.0)
	grid_root.add_child(turf)
	_add_island_edge_layers()


func _add_shoreline_pebbles() -> void:
	var pebble_materials := [
		_make_material("d8ccb6", 0.9),
		_make_material("b9ad99", 0.94),
		_make_material("eee2cc", 0.88),
	]
	var radius := float(GRID_SIZE) * 0.505
	for i in range(16):
		var angle := TAU * float(i) / 16.0 + 0.12 * sin(float(i))
		var cluster_center := Vector3(cos(angle) * radius, -0.36, sin(angle) * radius)
		for j in range(2):
			var side_offset := Vector3(cos(angle + 1.57), 0.0, sin(angle + 1.57)) * (float(j) - 0.5) * 0.42
			var pebble := _add_box(cluster_center + side_offset, Vector3(0.24 + 0.04 * float(j), 0.08, 0.18), pebble_materials[(i + j) % pebble_materials.size()], grid_root)
			pebble.rotation_degrees.y = rad_to_deg(angle) + float(j) * 18.0


func _add_island_edge_layers() -> void:
	var half := (float(GRID_SIZE) + 0.9) * 0.5
	var grass_lip := _make_material("9fb777", 0.96)
	var soil_mid := _make_material("7c6246", 0.97)
	var soil_low := _make_material("5f472f", 0.98)
	for layer in [
		{"y": -0.13, "w": 0.14, "mat": grass_lip},
		{"y": -0.34, "w": 0.18, "mat": soil_mid},
		{"y": -0.58, "w": 0.22, "mat": soil_low},
	]:
		var y := float(layer["y"])
		var w := float(layer["w"])
		var material := layer["mat"] as Material
		_add_box(Vector3(-half, y, 0.0), Vector3(w, 0.1, GRID_SIZE + 0.92), material, grid_root)
		_add_box(Vector3(half, y, 0.0), Vector3(w, 0.1, GRID_SIZE + 0.92), material, grid_root)
		_add_box(Vector3(0.0, y, -half), Vector3(GRID_SIZE + 0.92, 0.1, w), material, grid_root)
		_add_box(Vector3(0.0, y, half), Vector3(GRID_SIZE + 0.92, 0.1, w), material, grid_root)


func _build_diorama_backdrop() -> void:
	var hill_materials := [
		_make_material("6f8a5f", 0.98),
		_make_material("789765", 0.98),
		_make_material("5f7d58", 0.98),
	]
	var ridge_radius := float(GRID_SIZE) * 0.58
	for i in range(12):
		var angle := TAU * float(i) / 12.0 + 0.08 * sin(float(i) * 1.3)
		var hill := _add_local_sphere(
			Vector3(cos(angle) * ridge_radius, -0.42, sin(angle) * ridge_radius),
			1.4 + float(i % 3) * 0.22,
			0.8 + float(i % 2) * 0.16,
			hill_materials[i % hill_materials.size()],
			grid_root
		)
		hill.scale = Vector3(1.9 + float(i % 2) * 0.35, 0.85, 1.0 + float(i % 3) * 0.18)
		hill.rotation_degrees.y = rad_to_deg(angle)
	for i in range(10):
		var angle := TAU * float(i) / 10.0 + 0.22
		var tree_root := Node3D.new()
		tree_root.position = Vector3(cos(angle) * (ridge_radius - 1.8), -0.18, sin(angle) * (ridge_radius - 1.8))
		tree_root.rotation_degrees.y = rad_to_deg(angle)
		grid_root.add_child(tree_root)
		_add_local_cylinder(Vector3(0.0, 0.28, 0.0), 0.07, 0.09, 0.56, _trunk_material, tree_root)
		_add_local_sphere(Vector3(0.0, 0.78, 0.0), 0.34, 0.58, _leaf_material_dark, tree_root)
		_add_local_sphere(Vector3(0.18, 0.68, -0.04), 0.24, 0.38, _leaf_material, tree_root)


func _build_ground_tiles() -> void:
	var half := (GRID_SIZE - 1) * TILE_SIZE * 0.5

	# The old terrain used 4,096 individual box meshes. Besides being expensive on
	# the web renderer, their alternating flat colors made the island read as a
	# checkerboard. A single textured surface gives the town a continuous,
	# handcrafted meadow while the existing polish patches add large-scale breakup.
	var ground := MeshInstance3D.new()
	ground.name = "MeadowSurface"
	var ground_mesh := BoxMesh.new()
	ground_mesh.size = Vector3(float(GRID_SIZE) + 0.08, 0.1, float(GRID_SIZE) + 0.08)
	ground.mesh = ground_mesh
	ground.material_override = _ground_material_a
	ground.position = Vector3(0.0, -0.02, 0.0)
	ground.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	grid_root.add_child(ground)

	for edge in range(GRID_SIZE):
		_add_edge_post(Vector3(-half - 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(half + 0.9, 0.12, edge - half))
		_add_edge_post(Vector3(edge - half, 0.12, -half - 0.9))
		_add_edge_post(Vector3(edge - half, 0.12, half + 0.9))

	var shore_ring := float(GRID_SIZE) * 0.5 - 2.1
	var shore_inner := float(GRID_SIZE) * 0.22
	for shore_pos in [
		Vector3(-shore_ring, -0.14, -shore_inner * 1.4),
		Vector3(-shore_ring, -0.14, -shore_inner * 0.4),
		Vector3(-shore_ring, -0.14, shore_inner * 0.4),
		Vector3(-shore_ring, -0.14, shore_inner * 1.4),
		Vector3(shore_ring, -0.14, -shore_inner * 1.2),
		Vector3(shore_ring, -0.14, -shore_inner * 0.2),
		Vector3(shore_ring, -0.14, shore_inner * 0.6),
		Vector3(shore_ring, -0.14, shore_inner * 1.6),
		Vector3(-shore_inner * 1.4, -0.14, -shore_ring),
		Vector3(-shore_inner * 0.4, -0.14, -shore_ring),
		Vector3(shore_inner * 0.6, -0.14, -shore_ring),
		Vector3(shore_inner * 1.6, -0.14, -shore_ring),
		Vector3(-shore_inner * 1.6, -0.14, shore_ring),
		Vector3(-shore_inner * 0.6, -0.14, shore_ring),
		Vector3(shore_inner * 0.6, -0.14, shore_ring),
		Vector3(shore_inner * 1.6, -0.14, shore_ring),
	]:
		_add_shore_detail(shore_pos)


func _build_meadow() -> void:
	# Avoid large flat discs and high-frequency wallpaper. Sparse vegetation makes
	# the playable field feel tended while leaving buildings and roads legible.
	for tuft in [
		Vector3(-11.8, 0.06, 7.4),
		Vector3(-9.2, 0.06, -8.1),
		Vector3(-3.4, 0.06, 10.6),
		Vector3(5.7, 0.06, 10.2),
		Vector3(10.8, 0.06, 5.6),
		Vector3(11.4, 0.06, -6.8),
		Vector3(-11.0, 0.06, -3.4),
		Vector3(4.4, 0.06, -10.6),
	]:
		_add_grass_clump(tuft, 0.88)


func _build_ground_surface_polish() -> void:
	var patch_specs := [
		{"center": Vector3(-7.4, 0.045, -7.8), "size": Vector2(2.2, 1.1), "color": "9fc979", "rot": -18.0},
		{"center": Vector3(-3.2, 0.045, -9.2), "size": Vector2(1.7, 0.78), "color": "86bb69", "rot": 12.0},
		{"center": Vector3(5.8, 0.045, -8.0), "size": Vector2(2.0, 0.92), "color": "a9d486", "rot": 24.0},
		{"center": Vector3(9.2, 0.045, -3.5), "size": Vector2(1.5, 0.72), "color": "7fb768", "rot": -32.0},
		{"center": Vector3(-9.0, 0.045, 3.6), "size": Vector2(1.8, 0.84), "color": "a2c977", "rot": 35.0},
		{"center": Vector3(-4.8, 0.045, 8.6), "size": Vector2(2.2, 1.0), "color": "82b962", "rot": -9.0},
		{"center": Vector3(3.4, 0.045, 9.4), "size": Vector2(1.8, 0.78), "color": "a4d083", "rot": 16.0},
		{"center": Vector3(8.6, 0.045, 4.8), "size": Vector2(1.6, 0.72), "color": "8cc06f", "rot": -22.0},
		{"center": Vector3(-1.6, 0.045, 6.8), "size": Vector2(1.25, 0.52), "color": "9ab96b", "rot": 38.0},
		{"center": Vector3(1.2, 0.045, -6.6), "size": Vector2(1.35, 0.58), "color": "7fb15f", "rot": -28.0},
	]
	for spec in patch_specs:
		_add_ground_tone_patch(spec.center, spec.size, Color(str(spec.color)), float(spec.rot))

func _build_nature() -> void:
	var edge_ring := float(GRID_SIZE) * 0.5 - 5.4
	var side_ring := float(GRID_SIZE) * 0.34
	for tree_pos in [
		Vector3(-edge_ring, 0.18, -side_ring),
		Vector3(-edge_ring, 0.18, side_ring),
		Vector3(edge_ring, 0.18, -side_ring),
		Vector3(edge_ring, 0.18, side_ring),
		Vector3(-side_ring, 0.18, edge_ring),
		Vector3(side_ring, 0.18, edge_ring),
		Vector3(-side_ring * 1.2, 0.18, -edge_ring),
		Vector3(side_ring * 1.1, 0.18, -edge_ring),
		Vector3(-edge_ring - 0.8, 0.18, -1.6),
		Vector3(edge_ring + 0.6, 0.18, 2.2),
	]:
		_add_tree(tree_pos)

	for park_pos in [
		Vector3(-side_ring, 0.04, -2.0),
		Vector3(side_ring, 0.04, 2.6),
		Vector3(0.0, 0.04, side_ring + 2.0)
	]:
		_add_park_corner(park_pos)


func _cozy_palette(kind: String, variant: int) -> Dictionary:
	var preset := _property_visual_preset(kind)
	if not preset.is_empty():
		return {
			"wall": _property_preset_variant_color(preset, "wall_color", "f2e8d8", variant, 0.03),
			"roof": _property_preset_variant_color(preset, "roof_color", "6faf5f", variant, 0.025),
			"trim": _property_preset_variant_color(preset, "trim_color", "fff4df", variant, 0.018),
			"accent": _property_preset_variant_color(preset, "accent_color", "f1c85f", variant, 0.025),
		}

	var idx := posmod(variant, 10)
	var walls := ["f3e4cf", "eadfc9", "dce9d5", "e3edf1"]
	var roofs := ["c46f45", "8a5c80", "7f914e", "55728e"]
	var trims := ["fff5df", "f2e8d5", "faf0dc", "fff8e8"]
	var accents := ["62d8c3", "f29b5f", "7db2ee", "df675f"]

	match kind:
		"fire":
			walls = ["c94f45", "d85c4e", "bd443f", "d76556", "c24f49"]
			roofs = ["34383d", "3e4248", "4b4542", "30353a", "54504a"]
			accents = ["f1d072", "ffe086", "fff4df", "ffb35f", "f6e7c8"]
		"bank":
			walls = ["dfe8ef", "d3dde7", "e6edf2", "d9e2ea", "edf0ee"]
			roofs = ["557da1", "4f6f8d", "627c96", "4e7695", "6c7f90"]
			accents = ["f1c85f", "d7b45a", "a9d4e2", "f6df8f", "d9b76a"]
		"grocery":
			walls = ["f2e8d8", "f6ecd5", "e8ecd8", "fff0dc", "e8e3c6"]
			roofs = ["6faf5f", "5c9c52", "77a65a", "668f53", "74a66a"]
			accents = ["76d263", "5fae54", "ffd067", "7cc6e4", "f29b5f"]
		"restaurant":
			walls = ["f7d9bf", "f6dfc8", "ffe4d2", "f3ddc8", "ead8c9"]
			roofs = ["c96b5f", "d77758", "b85b4f", "d96f4f", "b3563e"]
			accents = ["ffc064", "ef8b5f", "65d8c0", "ef7178", "f2b35f"]
		"corner_store":
			walls = ["f2e8d8", "f8e7c7", "e8edf0", "fdebd7", "e7dfc4"]
			roofs = ["557da1", "4f76a0", "66839a", "416d96", "6a8cad"]
			accents = ["86b4f4", "70d5bd", "f8d85f", "ff9a5f", "df675f"]
		"house":
			walls = ["f4e3cf", "f2e8d8", "ece2d2", "e7eef0"]
			roofs = ["c87349", "b96a4d", "8d5b40", "7c9359"]
			accents = ["e1b672", "8dc5a6", "d89a87", "e3d48f"]

	return {
		"wall": Color(walls[idx % walls.size()]),
		"roof": Color(roofs[idx % roofs.size()]),
		"trim": Color(trims[idx % trims.size()]),
		"accent": Color(accents[idx % accents.size()])
	}


func _house_variant_profile(variant: int) -> Dictionary:
	var profiles := [
		{"width": 2.34, "depth": 1.88, "height": 1.16, "roof_tilt": 22.0, "roof_lift": 0.32, "roof_overhang": 0.52, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.44, "porch_width": 0.66, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": false, "fence_width": 3.9},
		{"width": 2.18, "depth": 1.78, "height": 1.02, "roof_tilt": 16.0, "roof_lift": 0.24, "roof_overhang": 0.44, "wing": false, "garage": true, "garage_side": 1.0, "dormers": 0, "pool": false, "porch_depth": 0.32, "porch_width": 0.54, "entry_offset": -0.26, "bay": true, "shed": false, "trellis": false, "fence_width": 3.86},
		{"width": 2.64, "depth": 1.94, "height": 1.12, "roof_tilt": 18.0, "roof_lift": 0.28, "roof_overhang": 0.5, "wing": true, "garage": false, "garage_side": -1.0, "dormers": 1, "pool": true, "porch_depth": 0.46, "porch_width": 0.72, "entry_offset": 0.18, "bay": false, "shed": false, "trellis": false, "fence_width": 3.92},
		{"width": 2.24, "depth": 1.82, "height": 1.3, "roof_tilt": 25.0, "roof_lift": 0.34, "roof_overhang": 0.48, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.36, "porch_width": 0.52, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": true, "fence_width": 3.84},
		{"width": 2.82, "depth": 1.92, "height": 1.04, "roof_tilt": 14.0, "roof_lift": 0.22, "roof_overhang": 0.42, "wing": true, "garage": true, "garage_side": -1.0, "dormers": 0, "pool": false, "porch_depth": 0.28, "porch_width": 0.46, "entry_offset": 0.34, "bay": true, "shed": false, "trellis": false, "fence_width": 4.02},
		{"width": 2.48, "depth": 1.98, "height": 1.14, "roof_tilt": 20.0, "roof_lift": 0.3, "roof_overhang": 0.54, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.56, "porch_width": 0.86, "entry_offset": -0.14, "bay": false, "shed": true, "trellis": false, "fence_width": 3.96},
		{"width": 2.06, "depth": 1.68, "height": 1.38, "roof_tilt": 27.0, "roof_lift": 0.38, "roof_overhang": 0.46, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.28, "porch_width": 0.44, "entry_offset": 0.0, "bay": true, "shed": false, "trellis": false, "fence_width": 3.7},
		{"width": 2.72, "depth": 1.84, "height": 1.0, "roof_tilt": 15.0, "roof_lift": 0.22, "roof_overhang": 0.48, "wing": false, "garage": true, "garage_side": 1.0, "dormers": 1, "pool": true, "porch_depth": 0.34, "porch_width": 0.56, "entry_offset": -0.3, "bay": false, "shed": false, "trellis": false, "fence_width": 4.08},
		{"width": 2.42, "depth": 1.9, "height": 1.08, "roof_tilt": 19.0, "roof_lift": 0.28, "roof_overhang": 0.58, "wing": true, "garage": false, "garage_side": 1.0, "dormers": 1, "pool": false, "porch_depth": 0.54, "porch_width": 0.94, "entry_offset": 0.0, "bay": false, "shed": false, "trellis": true, "fence_width": 4.0},
		{"width": 2.56, "depth": 1.86, "height": 1.12, "roof_tilt": 21.0, "roof_lift": 0.3, "roof_overhang": 0.5, "wing": false, "garage": false, "garage_side": 1.0, "dormers": 2, "pool": false, "porch_depth": 0.4, "porch_width": 0.62, "entry_offset": 0.22, "bay": true, "shed": true, "trellis": false, "fence_width": 3.9},
	]
	return profiles[posmod(variant, profiles.size())]


func _populate_village_house_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true, variant_id: String = "") -> void:
	var palette := _cozy_palette("house", variant)
	var profile := _house_variant_profile(variant)
	var width: float = float(profile["width"])
	var depth: float = float(profile["depth"])
	var height: float = float(profile["height"])
	var roof_tilt: float = float(profile["roof_tilt"])
	var roof_lift: float = float(profile["roof_lift"])
	var roof_overhang: float = float(profile["roof_overhang"])
	var porch_depth: float = float(profile["porch_depth"])
	var porch_width: float = float(profile["porch_width"])
	var entry_offset: float = float(profile["entry_offset"])
	var garage_side: float = float(profile["garage_side"])
	var has_wing: bool = bool(profile["wing"])
	var has_garage: bool = bool(profile["garage"])
	var has_bay: bool = bool(profile["bay"])
	var resolved_variant_id := _resolve_property_variant_id(BUILD_TOOL_HOUSE, variant, variant_id)
	var fence_width: float = max(4.8, float(profile["fence_width"]) + 0.9)
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(5.7, 5.7), 0.26)
	var sections := create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_HOUSE, variant, false, rebuild_lot_layout)
	var parking_root := sections["parking"] as Node3D
	var landscaping_root := sections["landscaping"] as Node3D
	var props_root := sections["props"] as Node3D
	structure_root = sections["main_building"] as Node3D
	if rebuild_lot_layout:
		if has_garage:
			create_driveway(parking_root, _property_visual_preset(BUILD_TOOL_HOUSE), entry_offset, garage_side, true)
		else:
			create_driveway(parking_root, _property_visual_preset(BUILD_TOOL_HOUSE), entry_offset, garage_side, false)

	var plaster := _make_material_from_color(palette.wall.lightened(0.02), 0.95)
	var timber := _make_material("8d6848", 0.88)
	var porch_wood := _make_material("976f49", 0.84)
	var roof_material := _make_house_roof_material(palette.roof)
	match resolved_variant_id:
		"modern_boxy_house":
			_build_modern_residential_home(structure_root, profile, palette, variant)
			return
		"farmhouse_style":
			_build_farmhouse_residential_home(structure_root, profile, palette, variant)
			return
		"compact_townhome":
			_build_townhome_residential_home(structure_root, profile, palette, variant)
			return

	var house_z := -1.18
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.06, house_z), Vector3(width, height, depth), plaster, structure_root, 0.22)
	if has_wing:
		_add_soft_block(Vector3(-0.96, height * 0.42 + 0.04, house_z + 0.34), Vector3(width * 0.42, height * 0.68, depth * 0.82), plaster, structure_root, 0.16)
	if has_garage:
		_add_soft_block(Vector3(garage_side * 1.22, 0.42, house_z + 0.3), Vector3(1.24, 0.72, 1.68), _make_material_from_color(palette.wall.darkened(0.04), 0.93), structure_root, 0.12)
		_add_box(Vector3(garage_side * 1.22, 0.28, house_z + 1.0), Vector3(0.8, 0.52, 0.06), _make_material("f0eadc", 0.9), structure_root)
		_add_box(Vector3(garage_side * 1.22, 0.62, house_z + 1.02), Vector3(0.84, 0.06, 0.06), _make_material("d0c5b5", 0.86), structure_root)
	if has_bay:
		_add_soft_block(Vector3(0.74, 0.52, house_z + 0.66), Vector3(0.54, 0.64, 0.56), plaster, structure_root, 0.12)
	_add_facade_trim_package(structure_root, width, height, house_z + depth * 0.48, palette)
	for siding_y in [0.38, 0.68, 0.98]:
		if siding_y < height:
			_add_box(Vector3(0.0, siding_y, house_z + depth * 0.515), Vector3(width * 0.82, 0.025, 0.035), _make_material_from_color(palette.trim.darkened(0.04), 0.82), structure_root)

	_add_gabled_roof(Vector3(0.0, height + roof_lift, house_z), Vector3(width + roof_overhang, 0.34, depth + roof_overhang), roof_material, structure_root, roof_tilt)
	if has_wing:
		_add_gabled_roof(Vector3(-0.96, height * 0.78 + 0.26, house_z + 0.34), Vector3(width * 0.56, 0.24, depth * 0.92), _make_house_roof_material(palette.roof.lightened(0.04)), structure_root, roof_tilt - 2.0)
	if has_garage:
		_add_gabled_roof(Vector3(garage_side * 1.22, 0.84, house_z + 0.3), Vector3(1.44, 0.18, 1.92), _make_house_roof_material(palette.roof.darkened(0.05)), structure_root, max(12.0, roof_tilt - 5.0))

	for timber_x in [-0.58, 0.0, 0.58]:
		_add_box(Vector3(timber_x, 0.54, house_z + 0.88), Vector3(0.12, 0.9, 0.1), timber, structure_root)
	_add_house_front_door_local(Vector3(entry_offset, 0.0, house_z + 1.06), structure_root, false)
	_add_box(Vector3(entry_offset, 0.06, house_z + 1.18), Vector3(max(0.42, width * porch_width * 0.84), 0.05, max(0.18, porch_depth * 0.26)), porch_wood, structure_root)
	_add_window_band_local(Vector3(entry_offset, 0.82, house_z + 1.16), Vector3(0.14, 0.16, 0.05), structure_root)
	var front_window_z := house_z + 0.76
	_add_house_wall_window_local(Vector3(-0.68, 0.56, front_window_z), Vector3(0.28, 0.34, 0.05), structure_root)
	_add_house_wall_window_local(Vector3(0.68, 0.56, front_window_z), Vector3(0.28, 0.34, 0.05), structure_root)
	_add_window_planter_local(structure_root, Vector3(-0.68, 0.34, front_window_z + 0.04), 0.38, palette.accent)
	_add_window_planter_local(structure_root, Vector3(0.68, 0.34, front_window_z + 0.04), 0.38, palette.accent)
	var side_window_x := width * 0.52
	_add_house_side_window_local(Vector3(-side_window_x, 0.56, house_z + 0.18), Vector3(0.26, 0.34, 0.05), structure_root, -1.0)
	_add_house_side_window_local(Vector3(side_window_x, 0.56, house_z + 0.18), Vector3(0.26, 0.34, 0.05), structure_root, 1.0)
	if has_wing:
		_add_window_band_local(Vector3(-1.18, 0.54, house_z + 0.52), Vector3(0.2, 0.28, 0.05), structure_root)
		_add_window_band_local(Vector3(-1.18, 0.84, house_z + 0.52), Vector3(0.16, 0.2, 0.05), structure_root)
	if has_garage:
		_add_window_band_local(Vector3(garage_side * 1.22, 0.54, house_z + 0.84), Vector3(0.22, 0.28, 0.05), structure_root)
	if has_bay:
		_add_window_band_local(Vector3(0.74, 0.54, house_z + 0.86), Vector3(0.34, 0.3, 0.05), structure_root)
	_add_house_character_details(structure_root, profile, palette, width, depth, height, house_z, roof_lift, entry_offset, has_bay, variant)

	if rebuild_lot_layout and not has_garage:
		_add_garden_path(lot_root, width * 0.24, 1.52)
	if rebuild_lot_layout:
		create_fence(props_root, Vector3(0.0, 0.0, 1.56), fence_width)
		create_streetlamp(props_root, Vector3(1.18, 0.0, 1.5))
		create_tree(landscaping_root, Vector3(-2.0, 0.0, -1.64))
	if int(variant) % 2 == 0:
		_add_box(Vector3(0.9, height + roof_lift + 0.2, house_z - 0.34), Vector3(0.16, 0.5, 0.16), _stone_material, structure_root)
		_add_box(Vector3(0.9, height + roof_lift + 0.48, house_z - 0.34), Vector3(0.2, 0.08, 0.2), _make_material("efe3cf", 0.92), structure_root)


func _add_house_character_details(parent: Node3D, profile: Dictionary, palette: Dictionary, width: float, depth: float, height: float, house_z: float, roof_lift: float, entry_offset: float, has_bay: bool, variant: int) -> void:
	# The structural massing is intentionally simple for readability. These layers
	# make each house feel built, maintained and loved rather than like a roof on a box.
	var trim_material := _make_material_from_color(palette.trim, 0.86)
	var timber_material := _make_material_from_color(palette.roof.darkened(0.3), 0.88)
	var shutter_material := _make_material_from_color(palette.accent.darkened(0.12), 0.8)
	var porch_width := maxf(0.72, float(profile.get("porch_width", 0.62)) * width)
	var porch_z := house_z + depth * 0.56
	_add_house_entry_canopy_local(Vector3(entry_offset, 0.0, porch_z + 0.04), parent, false, porch_width)
	_add_house_entry_steps_local(Vector3(entry_offset, 0.0, porch_z + 0.16), parent, false, porch_width * 0.72)
	# A little porch architecture gives the front door a true destination.
	for side in [-1.0, 1.0]:
		var post_x: float = entry_offset + float(side) * porch_width * 0.34
		_add_box(Vector3(post_x, 0.42, porch_z + 0.15), Vector3(0.055, 0.72, 0.055), trim_material, parent)
		_add_box(Vector3(post_x, 0.18, porch_z + 0.24), Vector3(0.04, 0.24, 0.04), timber_material, parent)
	_add_box(Vector3(entry_offset, 0.5, porch_z + 0.15), Vector3(porch_width * 0.76, 0.05, 0.05), trim_material, parent)
	for shutter_x in [-0.68, 0.68]:
		_add_box(Vector3(shutter_x - 0.2, 0.56, house_z + 0.81), Vector3(0.055, 0.38, 0.035), shutter_material, parent)
		_add_box(Vector3(shutter_x + 0.2, 0.56, house_z + 0.81), Vector3(0.055, 0.38, 0.035), shutter_material, parent)
	# Boards and trim visually split the façade into materials instead of a single slab.
	for board_x in [-width * 0.34, -width * 0.12, width * 0.12, width * 0.34]:
		_add_box(Vector3(board_x, height * 0.52, house_z + depth * 0.515), Vector3(0.025, height * 0.62, 0.025), trim_material, parent)
	var dormer_count := int(profile.get("dormers", 0))
	for dormer_index in range(dormer_count):
		var t := 0.5 if dormer_count == 1 else float(dormer_index) / float(dormer_count - 1)
		var dormer_x := lerpf(-width * 0.28, width * 0.28, t)
		_add_dormer(Vector3(dormer_x, height + roof_lift + 0.13, house_z + depth * 0.28), palette.wall.lightened(0.04), palette.roof.darkened(0.05), parent)
	if has_bay:
		_add_gabled_roof(Vector3(0.74, 0.92, house_z + 0.66), Vector3(0.7, 0.1, 0.68), _make_house_roof_material(palette.roof.darkened(0.06)), parent, 12.0)
	# A chimney on most homes adds a strong silhouette at the current camera scale.
	if posmod(variant, 3) != 1:
		var chimney_x := -width * 0.3 if posmod(variant, 2) == 0 else width * 0.3
		var chimney_material := _make_material("9c856f", 0.94)
		_add_box(Vector3(chimney_x, height + roof_lift + 0.42, house_z - depth * 0.22), Vector3(0.16, 0.62, 0.16), chimney_material, parent)
		_add_box(Vector3(chimney_x, height + roof_lift + 0.75, house_z - depth * 0.22), Vector3(0.22, 0.06, 0.22), trim_material, parent)


func _build_modern_residential_home(parent: Node3D, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var wall := _make_material_from_color(palette.wall.lightened(0.04), 0.86)
	var charcoal := _make_house_roof_material(palette.roof.darkened(0.22))
	var cedar := _make_material("8b6849", 0.84)
	var glass := _make_transparent_material(Color("c6e8ef"), 0.18, 0.2)
	# Deliberately horizontal, layered massing: an actual modern home rather than
	# the old gable house recolored gray.
	_add_soft_block(Vector3(-0.28, 0.62, -1.05), Vector3(2.5, 1.18, 1.84), wall, parent, 0.1)
	_add_soft_block(Vector3(0.82, 0.86, -1.38), Vector3(1.1, 1.66, 1.16), _make_material_from_color(palette.wall.darkened(0.06), 0.9), parent, 0.08)
	_add_box(Vector3(-0.28, 1.25, -1.05), Vector3(2.68, 0.12, 2.02), charcoal, parent)
	_add_box(Vector3(0.82, 1.74, -1.38), Vector3(1.26, 0.12, 1.32), charcoal, parent)
	_add_box(Vector3(-0.36, 0.68, -0.1), Vector3(1.35, 0.62, 0.05), glass, parent)
	_add_box(Vector3(0.68, 0.88, -0.78), Vector3(0.05, 0.94, 0.72), glass, parent)
	_add_box(Vector3(-0.82, 0.36, -0.04), Vector3(0.52, 0.72, 0.1), cedar, parent)
	_add_house_front_door_local(Vector3(-0.82, 0.0, -0.0), parent, false)
	_add_box(Vector3(-0.82, 0.08, 0.28), Vector3(0.82, 0.06, 0.54), _make_material("bcb09c", 0.9), parent)
	for x in [-1.14, -0.48, 0.34]:
		_add_box(Vector3(x, 1.34, -0.06), Vector3(0.36, 0.035, 0.07), cedar, parent)
	_add_local_sphere(Vector3(1.25, 0.12, -0.28), 0.18, 0.14, _make_material_from_color(palette.accent, 0.82), parent)


func _build_farmhouse_residential_home(parent: Node3D, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var wall := _make_material_from_color(palette.wall.lightened(0.06), 0.94)
	var roof := _make_house_roof_material(palette.roof.darkened(0.06))
	var trim := _make_material_from_color(palette.trim, 0.88)
	var barn_red := _make_material_from_color(palette.accent.darkened(0.18), 0.84)
	_add_soft_block(Vector3(0.0, 0.74, -1.14), Vector3(2.72, 1.42, 2.02), wall, parent, 0.14)
	_add_soft_block(Vector3(-1.34, 0.48, -0.88), Vector3(0.86, 0.88, 1.36), barn_red, parent, 0.1)
	_add_gabled_roof(Vector3(0.0, 1.64, -1.14), Vector3(3.04, 0.3, 2.28), roof, parent, 24.0)
	_add_gabled_roof(Vector3(-1.34, 1.1, -0.88), Vector3(1.04, 0.2, 1.54), _make_house_roof_material(palette.roof.darkened(0.12)), parent, 20.0)
	# Wide wraparound porch with a row of posts and a railing.
	_add_box(Vector3(0.16, 0.11, 0.06), Vector3(2.78, 0.08, 0.72), _make_material("9c7652", 0.84), parent)
	for x in [-1.05, -0.52, 0.0, 0.52, 1.05]:
		_add_box(Vector3(x, 0.46, 0.22), Vector3(0.055, 0.72, 0.055), trim, parent)
		_add_box(Vector3(x, 0.23, 0.34), Vector3(0.03, 0.24, 0.03), trim, parent)
	_add_box(Vector3(0.16, 0.55, 0.22), Vector3(2.28, 0.055, 0.055), trim, parent)
	_add_house_front_door_local(Vector3(0.16, 0.0, 0.06), parent, false)
	for x in [-0.74, 0.96]:
		_add_house_wall_window_local(Vector3(x, 0.76, -0.1), Vector3(0.34, 0.42, 0.05), parent)
		_add_window_planter_local(parent, Vector3(x, 0.5, -0.04), 0.42, palette.accent)
	_add_dormer(Vector3(0.62, 1.72, -0.44), palette.wall, palette.roof, parent)
	_add_box(Vector3(-0.82, 1.9, -1.42), Vector3(0.18, 0.72, 0.18), _make_material("9c856f", 0.94), parent)
	_add_box(Vector3(-0.82, 2.28, -1.42), Vector3(0.24, 0.07, 0.24), trim, parent)


func _build_townhome_residential_home(parent: Node3D, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var brick := _make_material_from_color(palette.wall.darkened(0.1), 0.94)
	var trim := _make_material_from_color(palette.trim, 0.9)
	var roof := _make_house_roof_material(palette.roof.darkened(0.12))
	_add_soft_block(Vector3(0.0, 1.0, -1.14), Vector3(1.88, 1.94, 1.68), brick, parent, 0.1)
	_add_soft_block(Vector3(0.66, 1.18, -0.78), Vector3(0.62, 2.3, 0.96), _make_material_from_color(palette.wall.lightened(0.04), 0.92), parent, 0.08)
	_add_gabled_roof(Vector3(0.0, 2.18, -1.14), Vector3(2.12, 0.24, 1.9), roof, parent, 27.0)
	_add_gabled_roof(Vector3(0.66, 2.48, -0.78), Vector3(0.78, 0.18, 1.12), _make_house_roof_material(palette.roof.lightened(0.04)), parent, 24.0)
	_add_house_front_door_local(Vector3(-0.36, 0.0, -0.2), parent, false)
	_add_house_entry_steps_local(Vector3(-0.36, 0.0, 0.08), parent, false, 0.62)
	for y in [0.72, 1.38]:
		_add_house_wall_window_local(Vector3(-0.46, y, -0.28), Vector3(0.28, 0.36, 0.05), parent)
		_add_house_wall_window_local(Vector3(0.44, y, -0.28), Vector3(0.26, 0.36, 0.05), parent)
	_add_house_side_window_local(Vector3(0.98, 1.32, -1.02), Vector3(0.22, 0.42, 0.05), parent, 1.0)
	for y in [0.5, 1.05, 1.6]:
		_add_box(Vector3(-0.98, y, -1.14), Vector3(0.04, 0.035, 1.45), trim, parent)
	_add_box(Vector3(0.0, 2.44, -1.58), Vector3(0.16, 0.66, 0.16), _make_material("8b7460", 0.94), parent)


func _add_village_house_variant(position_3d: Vector3, variant: int, variant_id: String = "") -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_village_house_variant(root, lot_root, structure_root, variant, true, variant_id)
	return root


func _add_pond_variant(tool: String, position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_pond_variant(root, lot_root, structure_root, tool, variant)
	return root


func _populate_pond_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, tool: String, variant: int) -> void:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var footprint: Vector2i = spec.get("footprint", Vector2i(3, 3))
	var water_size: Vector2 = spec.get("water_size", Vector2(1.72, 1.64))
	var shore_size: Vector2 = spec.get("shore_size", Vector2(2.18, 2.04))
	var shore_color := _make_material("d6c39d", 0.94)
	var grass_color := _make_material("8fa86a", 0.98)
	var water_surface := _make_transparent_material(Color("aee0eb"), 0.24, 0.38)
	var water_deep := _make_material("5b93a2", 0.32, 0.0, true, "d2f3f7", 0.05)
	var variant_turn := float(posmod(variant, 6)) * 9.0
	_add_parcel_shadow(root, Vector2(float(footprint.x) + 0.8, float(footprint.y) + 0.8), 0.16)
	_add_organic_pond_layer_local(Vector3(0.0, 0.012, 0.0), shore_size * 1.08, 0.04, grass_color, lot_root, variant_turn - 5.0)
	_add_organic_pond_layer_local(Vector3(0.0, 0.04, 0.0), shore_size * 0.94, 0.04, shore_color, lot_root, variant_turn + 7.0)
	_add_organic_pond_layer_local(Vector3(0.0, 0.065, 0.0), water_size, 0.035, water_deep, structure_root, variant_turn)
	_add_organic_pond_layer_local(Vector3(0.0, 0.09, 0.0), water_size * 0.88, 0.018, water_surface, structure_root, variant_turn + 13.0)
	_add_organic_pond_highlights_local(water_size, structure_root)
	_add_ripple_ring_local(Vector3(0.0, 0.106, 0.0), water_size.x * 0.36, water_size.y * 0.3, structure_root)
	_add_ripple_ring_local(Vector3(water_size.x * 0.12, 0.108, water_size.y * 0.1), water_size.x * 0.24, water_size.y * 0.18, structure_root)
	_add_pond_edge_details_local(water_size, shore_size, lot_root, variant)
	if tool == BUILD_TOOL_POND_LARGE:
		_add_local_sphere(Vector3(water_size.x * 0.18, 0.09, -water_size.y * 0.08), 0.22, 0.12, _stone_material, lot_root)
		_add_local_sphere(Vector3(water_size.x * 0.24, 0.096, -water_size.y * 0.03), 0.16, 0.1, _stone_material, lot_root)
		_add_local_sphere(Vector3(-water_size.x * 0.2, 0.09, water_size.y * 0.14), 0.18, 0.1, _stone_material, lot_root)


func _add_forest_variant(tool: String, position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_forest_variant(root, lot_root, structure_root, tool, variant)
	return root


func _populate_forest_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, tool: String, variant: int) -> void:
	var spec: Dictionary = SCENIC_TOOL_SPECS.get(tool, {})
	var footprint: Vector2i = spec.get("footprint", Vector2i(4, 4))
	var tree_count: int = int(spec.get("tree_count", 6))
	var footprint_x := float(footprint.x)
	var footprint_y := float(footprint.y)
	var ground_color := _make_material("8fa76d", 0.98)
	var soil_color := _make_material("7d694f", 0.95)
	_add_parcel_shadow(root, Vector2(footprint_x + 0.4, footprint_y + 0.4), 0.18)
	_add_box(Vector3(0.0, 0.012, 0.0), Vector3(footprint_x * 0.84, 0.05, footprint_y * 0.84), ground_color, lot_root)
	_add_soft_block(Vector3(0.0, 0.04, 0.0), Vector3(footprint_x * 0.72, 0.03, footprint_y * 0.72), soil_color, lot_root, 0.14)
	var angle_shift := float(posmod(variant, 3)) * 0.37
	var radius_x := footprint_x * 0.34
	var radius_z := footprint_y * 0.34
	for i in range(tree_count):
		var t := float(i) / maxf(1.0, float(tree_count))
		var angle := t * TAU + angle_shift
		var ring := 0.54 + 0.18 * sin(t * TAU * 2.0 + angle_shift * 1.6)
		var tree_pos := Vector3(cos(angle) * radius_x * ring, 0.0, sin(angle) * radius_z * ring)
		if abs(tree_pos.x) < 0.16 and abs(tree_pos.z) < 0.16:
			tree_pos += Vector3(0.26, 0.0, -0.18)
		_add_local_tree(tree_pos, lot_root)
	var deer_offset := 0.16 if posmod(variant, 2) == 0 else -0.12
	_add_deer_local(Vector3(-radius_x * 0.42, 0.0, radius_z * 0.18 + deer_offset), deg_to_rad(20.0), lot_root)
	_add_deer_local(Vector3(radius_x * 0.34, 0.0, -radius_z * 0.24 - deer_offset), deg_to_rad(-32.0), lot_root)
	_add_box(Vector3(0.0, 0.03, footprint_y * 0.32), Vector3(0.18, 0.02, footprint_y * 0.22), _make_material("d6c7a8", 0.9), lot_root)
	_add_box(Vector3(-footprint_x * 0.18, 0.03, footprint_y * 0.06), Vector3(0.18, 0.02, 0.12), _make_material("d6c7a8", 0.9), lot_root)
	_add_box(Vector3(footprint_x * 0.16, 0.03, -footprint_y * 0.08), Vector3(0.18, 0.02, 0.12), _make_material("d6c7a8", 0.9), lot_root)


func _add_deer_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.32, 0.2), 0.16, root)
	var body_material := _make_material("c5a373", 0.9)
	var head_material := _make_material("d3af82", 0.88)
	var antler_material := _make_material("dbc8b4", 0.9)
	var leg_material := _make_material("7b5e46", 0.95)
	var spot_material := _make_material("f1dfbd", 0.86)
	var eye_material := _make_material("2f251d", 0.72)
	var ear_material := _make_material("e0bd8a", 0.86)
	_add_soft_block(Vector3(0.0, 0.24, 0.0), Vector3(0.24, 0.16, 0.42), body_material, root, 0.05)
	_add_soft_block(Vector3(0.0, 0.34, 0.16), Vector3(0.12, 0.11, 0.18), head_material, root, 0.04)
	_add_box(Vector3(-0.075, 0.41, 0.2), Vector3(0.055, 0.08, 0.025), ear_material, root)
	_add_box(Vector3(0.075, 0.41, 0.2), Vector3(0.055, 0.08, 0.025), ear_material, root)
	_add_box(Vector3(-0.034, 0.355, 0.255), Vector3(0.018, 0.018, 0.012), eye_material, root)
	_add_box(Vector3(0.034, 0.355, 0.255), Vector3(0.018, 0.018, 0.012), eye_material, root)
	_add_box(Vector3(0.0, 0.46, 0.24), Vector3(0.08, 0.08, 0.08), antler_material, root)
	_add_box(Vector3(-0.06, 0.42, 0.24), Vector3(0.02, 0.06, 0.04), antler_material, root)
	_add_box(Vector3(0.06, 0.42, 0.24), Vector3(0.02, 0.06, 0.04), antler_material, root)
	var left_antler_tip := _add_box(Vector3(-0.09, 0.48, 0.26), Vector3(0.018, 0.08, 0.025), antler_material, root)
	left_antler_tip.rotation_degrees.z = -24.0
	var right_antler_tip := _add_box(Vector3(0.09, 0.48, 0.26), Vector3(0.018, 0.08, 0.025), antler_material, root)
	right_antler_tip.rotation_degrees.z = 24.0
	for spot in [
		Vector3(-0.07, 0.31, -0.04),
		Vector3(0.06, 0.31, -0.02),
		Vector3(-0.02, 0.3, -0.14),
	]:
		_add_local_sphere(spot, 0.024, 0.012, spot_material, root)
	for leg_x in [-0.08, 0.08]:
		for leg_z in [-0.12, 0.12]:
			_add_box(Vector3(leg_x, 0.08, leg_z), Vector3(0.04, 0.16, 0.04), leg_material, root)
	_add_box(Vector3(0.0, 0.18, -0.24), Vector3(0.07, 0.045, 0.09), spot_material, root)


func _add_storefront_depth_package(tool: String, parent: Node, width: float, depth: float, height: float, front_z: float, palette: Dictionary, variant: int) -> void:
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var roof_shadow := _make_material_from_color(palette["roof"].darkened(0.18), 0.82)
	var base_material := _make_material("d8c7ab", 0.9)
	var side_window_y := minf(height * 0.62, 0.78)
	_add_box(Vector3(0.0, 0.12, front_z + 0.04), Vector3(width * 1.02, 0.12, 0.08), base_material, parent)
	_add_box(Vector3(0.0, height + 0.12, front_z + 0.04), Vector3(width * 1.04, 0.08, 0.12), roof_shadow, parent)
	_add_box(Vector3(0.0, height + 0.2, front_z + 0.08), Vector3(width * 0.86, 0.055, 0.1), trim_material, parent)
	for side_x in [-width * 0.52, width * 0.52]:
		_add_box(Vector3(side_x, height * 0.5, front_z + 0.035), Vector3(0.08, height * 0.9, 0.07), trim_material, parent)
	_add_box(Vector3(0.0, 0.42, front_z + 0.07), Vector3(width * 0.28, 0.58, 0.04), _make_transparent_material(Color("2a2f33"), 0.18, 0.24), parent)
	if tool != BUILD_TOOL_FIRE:
		_add_house_side_window_local(Vector3(-width * 0.54, side_window_y, -depth * 0.18), Vector3(0.22, 0.28, 0.05), parent, -1.0)
		_add_house_side_window_local(Vector3(width * 0.54, side_window_y, -depth * 0.18), Vector3(0.22, 0.28, 0.05), parent, 1.0)
	if tool == BUILD_TOOL_BANK:
		_add_box(Vector3(0.0, height + 0.34, front_z + 0.02), Vector3(width * 0.62, 0.08, 0.12), accent_material, parent)
	elif tool == BUILD_TOOL_GROCERY:
		_add_box(Vector3(0.0, height + 0.32, front_z + 0.02), Vector3(width * 0.86, 0.09, 0.14), accent_material, parent)
	elif tool == BUILD_TOOL_RESTAURANT:
		_add_box(Vector3(0.0, height + 0.26, front_z + 0.04), Vector3(width * 0.74, 0.08, 0.18), accent_material, parent)
	elif tool == BUILD_TOOL_CORNER_STORE:
		_add_box(Vector3(0.0, height + 0.28, front_z + 0.04), Vector3(width * 0.78, 0.08, 0.14), accent_material, parent)
	create_rooftop_detail(parent, Vector3(-width * 0.26, height + 0.42, -depth * 0.18), palette["roof"])
	if width > 2.45:
		create_rooftop_detail(parent, Vector3(width * 0.28, height + 0.4, -depth * 0.28), palette["roof"])


func _add_fire_department_signature_upgrade(structure_root: Node, props_root: Node, width: float, depth: float, height: float, palette: Dictionary) -> void:
	var wall_material := _make_material_from_color(palette["wall"].darkened(0.04), 0.86)
	var trim_material := _make_material_from_color(palette["trim"], 0.8)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	var dark_material := _make_material("383d42", 0.88)
	var brass_material := _make_material("f1d072", 0.7)
	var tower_x := -width * 0.48
	var tower_z := -0.62
	_add_soft_block(Vector3(tower_x, 1.16, tower_z), Vector3(0.58, 2.1, 0.58), wall_material, structure_root, 0.09)
	_add_box(Vector3(tower_x, 2.28, tower_z), Vector3(0.7, 0.14, 0.7), dark_material, structure_root)
	_add_box(Vector3(tower_x, 2.42, tower_z), Vector3(0.5, 0.12, 0.5), accent_material, structure_root)
	_add_local_sphere(Vector3(tower_x, 1.92, -0.28), 0.13, 0.035, brass_material, structure_root)
	for level_y in [0.82, 1.22, 1.62]:
		_add_house_wall_window_local(Vector3(tower_x, level_y, -0.27), Vector3(0.18, 0.22, 0.05), structure_root)
	for rung_y in [0.76, 0.98, 1.2, 1.42, 1.64]:
		_add_box(Vector3(width * 0.52, rung_y, -0.22), Vector3(0.03, 0.035, 0.38), brass_material, structure_root)
	_add_box(Vector3(width * 0.52, 1.18, -0.22), Vector3(0.035, 1.02, 0.035), brass_material, structure_root)
	_add_box(Vector3(width * 0.4, 1.18, -0.22), Vector3(0.035, 1.02, 0.035), brass_material, structure_root)
	for bay_x in [-width * 0.18, width * 0.18]:
		_add_box(Vector3(bay_x, 0.38, 0.62), Vector3(width * 0.24, 0.62, 0.055), dark_material, structure_root)
		_add_box(Vector3(bay_x, 0.64, 0.66), Vector3(width * 0.21, 0.035, 0.055), trim_material, structure_root)
		_add_box(Vector3(bay_x, 0.46, 0.66), Vector3(width * 0.21, 0.035, 0.055), trim_material, structure_root)
		_add_box(Vector3(bay_x, 0.28, 0.66), Vector3(width * 0.21, 0.035, 0.055), trim_material, structure_root)
	if props_root != null:
		_add_box(Vector3(0.0, 0.12, 1.08), Vector3(width * 0.86, 0.045, 0.5), _make_material("848d92", 0.92), props_root)
		_add_box(Vector3(0.0, 0.15, 1.0), Vector3(width * 0.78, 0.035, 0.06), brass_material, props_root)


func _add_bank_signature_upgrade(structure_root: Node, props_root: Node, width: float, depth: float, height: float, palette: Dictionary) -> void:
	var stone_material := _make_material_from_color(palette["trim"], 0.84)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.08), 0.76)
	var accent_material := _make_material_from_color(palette["accent"], 0.46)
	var brass_material := _make_material("d0a64c", 0.56)
	var plaza_material := _make_material("d8d2c8", 0.9)
	if props_root != null:
		_add_box(Vector3(0.0, 0.08, 0.98), Vector3(width * 0.82, 0.05, 0.5), plaza_material, props_root)
		for step_index in range(3):
			_add_box(Vector3(0.0, 0.05 + float(step_index) * 0.045, 0.82 + float(step_index) * 0.11), Vector3(width * (0.72 - float(step_index) * 0.08), 0.04, 0.16), plaza_material, props_root)
	_add_box(Vector3(0.0, 1.03, 0.8), Vector3(width * 0.74, 0.14, 0.16), stone_material, structure_root)
	_add_box(Vector3(0.0, 1.18, 0.78), Vector3(width * 0.58, 0.1, 0.12), roof_material, structure_root)
	for col_x in [-width * 0.34, -width * 0.17, 0.0, width * 0.17, width * 0.34]:
		_add_local_cylinder(Vector3(col_x, 0.48, 0.83), 0.055, 0.07, 0.86, stone_material, structure_root)
		_add_box(Vector3(col_x, 0.92, 0.83), Vector3(0.18, 0.045, 0.12), stone_material, structure_root)
		_add_box(Vector3(col_x, 0.05, 0.83), Vector3(0.18, 0.05, 0.12), stone_material, structure_root)
	_add_local_sphere(Vector3(0.0, 1.34, 0.76), 0.16, 0.045, brass_material, structure_root)
	_add_box(Vector3(0.0, 1.34, 0.8), Vector3(0.1, 0.18, 0.035), accent_material, structure_root)
	for side in [-1.0, 1.0]:
		_add_box(Vector3(side * width * 0.48, 0.64, 0.42), Vector3(0.16, 0.42, 0.055), _window_material, structure_root)
		_add_window_planter_local(structure_root, Vector3(side * width * 0.48, 0.34, 0.48), 0.28, palette["accent"])
	if props_root != null:
		_add_atm_local(props_root, Vector3(width * 0.48, 0.03, 0.72), palette["roof"])
	_add_lantern_glow_local(Vector3(-width * 0.5, 0.92, 0.72), structure_root)
	_add_lantern_glow_local(Vector3(width * 0.5, 0.92, 0.72), structure_root)


func _add_grocery_signature_upgrade(structure_root: Node, props_root: Node, width: float, depth: float, height: float, palette: Dictionary) -> void:
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.05), 0.74)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.22, 0.22)
	_add_box(Vector3(0.0, height + 0.38, 0.42), Vector3(width * 0.94, 0.18, 0.14), roof_material, structure_root)
	create_sign(structure_root, Vector3(0.0, height + 0.5, 0.52), Vector2(width * 0.54, 0.22), palette["accent"], "grocer")
	for x in [-width * 0.35, -width * 0.12, width * 0.12, width * 0.35]:
		_add_house_wall_window_local(Vector3(x, 0.56, 0.56), Vector3(0.22, 0.42, 0.055), structure_root)
		_add_box(Vector3(x, 0.31, 0.62), Vector3(0.18, 0.05, 0.04), trim_material, structure_root)
	_add_box(Vector3(0.0, 0.68, 0.66), Vector3(width * 0.88, 0.055, 0.34), accent_material, structure_root)
	for stripe_x in [-0.34, -0.12, 0.12, 0.34]:
		_add_box(Vector3(stripe_x * width, 0.7, 0.68), Vector3(width * 0.08, 0.04, 0.36), trim_material, structure_root)
	_add_box(Vector3(-width * 0.55, 0.32, 0.56), Vector3(0.26, 0.42, 0.05), glass_material, structure_root)
	_add_box(Vector3(width * 0.55, 0.32, 0.56), Vector3(0.26, 0.42, 0.05), glass_material, structure_root)
	if props_root != null:
		_add_box(Vector3(-width * 0.46, 0.18, 1.0), Vector3(0.92, 0.11, 0.28), _make_material("9f7b56", 0.82), props_root)
		for produce_index in range(7):
			var x := -width * 0.66 + float(produce_index) * 0.18
			var produce_colors: Array[Color] = [Color("cb644c"), Color("7da85b"), Color("f0be63"), Color("6ca8c4")]
			var produce_color: Color = produce_colors[produce_index % produce_colors.size()]
			_add_local_sphere(Vector3(x, 0.28, 1.0 + sin(float(produce_index)) * 0.03), 0.055, 0.045, _make_material_from_color(produce_color, 0.82), props_root)
		create_cart_rack(props_root, Vector3(width * 0.52, 0.08, 0.98), deg_to_rad(90.0))
		_add_box(Vector3(width * 0.52, 0.48, 0.98), Vector3(0.62, 0.08, 0.36), roof_material, props_root)
		for post_x in [width * 0.33, width * 0.71]:
			_add_box(Vector3(post_x, 0.28, 0.98), Vector3(0.045, 0.48, 0.045), trim_material, props_root)


func _add_restaurant_signature_upgrade(structure_root: Node, props_root: Node, width: float, depth: float, height: float, palette: Dictionary, canopy_style: String) -> void:
	var wood_material := _make_material("8d543c", 0.78)
	var accent_material := _make_material_from_color(palette["accent"], 0.52)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var light_material := _make_material("fff4d8", 0.12, 0.0, true, "ffe4a4", 0.28)
	if props_root != null:
		_add_box(Vector3(0.0, 0.11, 1.0), Vector3(width * 0.92, 0.05, 0.66), _make_material("d8c7ab", 0.88), props_root)
		for post_x in [-width * 0.4, -width * 0.13, width * 0.13, width * 0.4]:
			_add_box(Vector3(post_x, 0.62, 1.08), Vector3(0.045, 1.04, 0.045), wood_material, props_root)
		_add_box(Vector3(0.0, 1.16, 1.08), Vector3(width * 0.94, 0.07, 0.62), wood_material, props_root)
		for beam_x in [-width * 0.34, -width * 0.17, 0.0, width * 0.17, width * 0.34]:
			_add_box(Vector3(beam_x, 1.22, 1.08), Vector3(0.045, 0.06, 0.68), accent_material, props_root)
		_add_string_lights_local(props_root, 1.08, width * 0.86)
		for table_data in [
			Vector3(-width * 0.28, 0.06, 1.04),
			Vector3(0.0, 0.06, 1.14),
			Vector3(width * 0.28, 0.06, 1.04),
		]:
			_add_outdoor_table_local(props_root, table_data, palette["accent"])
		_add_menu_board_local(props_root, Vector3(-width * 0.54, 0.0, 0.76), palette["accent"])
		_add_planter_box_local(props_root, Vector3(width * 0.54, 0.12, 0.76), palette["accent"], 0.5)
	if canopy_style != "stripe":
		create_awning(structure_root, Vector3(0.0, 0.58, 0.72), width * 0.88, accent_material, trim_material, "stripe")
	_add_box(Vector3(-width * 0.58, 0.78, 0.54), Vector3(0.08, 0.16, 0.035), light_material, structure_root)
	_add_box(Vector3(width * 0.58, 0.78, 0.54), Vector3(0.08, 0.16, 0.035), light_material, structure_root)


func _add_corner_store_signature_upgrade(structure_root: Node, props_root: Node, width: float, depth: float, height: float, palette: Dictionary) -> void:
	var blue_material := _make_material_from_color(palette["roof"], 0.72)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	var poster_materials := [
		_make_material("ffd067", 0.8),
		_make_material("df675f", 0.8),
		_make_material("70d5bd", 0.8),
	]
	_add_box(Vector3(-0.18, 0.72, 0.72), Vector3(width * 1.05, 0.14, 0.34), blue_material, structure_root)
	_add_box(Vector3(-width * 0.55, 0.72, -0.18), Vector3(0.28, 0.14, depth * 0.86), blue_material, structure_root)
	_add_box(Vector3(-0.18, 0.86, 0.76), Vector3(width * 0.78, 0.1, 0.08), trim_material, structure_root)
	create_sign(structure_root, Vector3(-0.18, height + 0.3, 0.7), Vector2(width * 0.62, 0.2), palette["accent"], "quick_mart")
	for window_index in range(3):
		var x := -width * 0.32 + float(window_index) * width * 0.22
		_add_box(Vector3(x, 0.36, 0.7), Vector3(0.18, 0.22, 0.035), poster_materials[window_index % poster_materials.size()], structure_root)
	if props_root != null:
		_add_ice_box_local(props_root, Vector3(width * 0.5, 0.02, 0.82), palette["roof"])
		_add_newspaper_box_local(props_root, Vector3(-width * 0.58, 0.02, 0.82), palette["accent"])
		_add_trash_can_local(props_root, Vector3(width * 0.75, 0.02, 0.96), Color("4b6778"))
		_add_box(Vector3(0.0, 0.1, 1.08), Vector3(width * 0.82, 0.04, 0.26), _make_material("d8c7ab", 0.88), props_root)
		for mat_index in range(3):
			var x := -width * 0.28 + float(mat_index) * width * 0.28
			_add_box(Vector3(x, 0.13, 1.08), Vector3(0.22, 0.03, 0.18), poster_materials[mat_index % poster_materials.size()], props_root)


func _populate_fire_station_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	var palette := _cozy_palette("fire", variant)
	var width := 2.9 + float(variant % 2) * 0.24
	var depth := 2.1 + float(int(variant / 3) % 2) * 0.16
	var height := 1.06 + float(int(variant / 5)) * 0.12
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(5.0, 3.9), 0.24)

	var sections := create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_FIRE, variant, true, rebuild_lot_layout)
	var props_root := sections["props"] as Node3D
	structure_root = sections["main_building"] as Node3D
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.38), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), structure_root, 0.18)
	_add_soft_block(Vector3(width * 0.36, 1.08, -0.72), Vector3(0.66, 1.82, 0.66), _make_material_from_color(palette.trim, 0.84), structure_root, 0.11)
	create_roof(structure_root, Vector3(0.0, height + 0.18, -0.38), Vector3(width + 0.16, 0.18, depth + 0.22), _make_material_from_color(palette.roof, 0.78))
	_add_storefront_depth_package(BUILD_TOOL_FIRE, structure_root, width, depth, height, 0.52, palette, variant)
	for i in [-1, 0, 1]:
		_add_box(Vector3(i * width * 0.24, 0.3, 0.46), Vector3(width * 0.18, 0.56, 0.06), _make_material_from_color(palette.trim, 0.74), structure_root)
		_add_box(Vector3(i * width * 0.24, 0.62, 0.46), Vector3(width * 0.18, 0.08, 0.07), _make_material_from_color(palette.accent, 0.44), structure_root)
	_add_box(Vector3(0.0, 0.84, 0.5), Vector3(width * 0.54, 0.12, 0.06), _make_material_from_color(palette.accent, 0.4), structure_root)
	_add_facade_trim_package(structure_root, width, height, 0.52, palette, "fire")
	create_storefront_windows(structure_root, width * 0.72, 0.72, 0.54, 3)
	create_hvac_units(structure_root, width, depth, height + 0.34, -0.38, variant)
	_add_local_cylinder(Vector3(width * 0.36, 2.08, -0.74), 0.1, 0.1, 0.28, _make_material_from_color(palette.accent, 0.46), structure_root)
	var signature_props: Node = null
	_add_fire_department_signature_upgrade(structure_root, signature_props, width, depth, height, palette)
	match posmod(variant, 5):
		1:
			_add_soft_block(Vector3(-width * 0.38, 0.52, -0.96), Vector3(0.72, 0.76, 0.82), _make_material_from_color(palette.wall.darkened(0.03), 0.9), structure_root, 0.1)
			_add_box(Vector3(-width * 0.38, 0.56, -0.54), Vector3(0.24, 0.3, 0.05), _window_material, structure_root)
		2:
			_add_box(Vector3(0.0, height + 0.36, 0.42), Vector3(width * 0.72, 0.12, 0.12), _make_material_from_color(palette.accent, 0.44), structure_root)
			_add_box(Vector3(0.0, height + 0.48, 0.42), Vector3(width * 0.5, 0.08, 0.08), _make_material_from_color(palette.trim, 0.62), structure_root)
		3:
			_add_soft_block(Vector3(-width * 0.36, 0.86, -0.72), Vector3(0.56, 1.18, 0.58), _make_material_from_color(palette.trim.darkened(0.02), 0.86), structure_root, 0.09)
			_add_box(Vector3(-width * 0.36, 1.16, -0.36), Vector3(0.2, 0.22, 0.05), _window_material, structure_root)
		4:
			_add_box(Vector3(-width * 0.28, 0.9, 0.56), Vector3(0.18, 0.2, 0.06), _window_material, structure_root)
			_add_box(Vector3(width * 0.28, 0.9, 0.56), Vector3(0.18, 0.2, 0.06), _window_material, structure_root)


func _add_fire_station_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_fire_station_variant(root, lot_root, structure_root, variant)
	return root


func _populate_bank_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	var palette := _cozy_palette("bank", variant)
	var width := 2.62 + float(variant % 3) * 0.16
	var depth := 1.82 + float(variant % 2) * 0.12
	var height := 0.98 + float(int(variant / 4)) * 0.1
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(3.9, 2.9), 0.22)

	var sections := create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_BANK, variant, true, rebuild_lot_layout)
	var signage_root := sections["signage"] as Node3D
	var props_root := sections["props"] as Node3D
	structure_root = sections["main_building"] as Node3D
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.24), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.88), structure_root, 0.18)
	create_roof(structure_root, Vector3(0.0, height + 0.18, -0.24), Vector3(width + 0.18, 0.2, depth + 0.18), _make_material_from_color(palette.roof, 0.76))
	_add_storefront_depth_package(BUILD_TOOL_BANK, structure_root, width, depth, height, 0.74, palette, variant)
	create_columns(structure_root, width * 0.36, 0.7, 3, _make_material_from_color(palette.trim, 0.84))
	_add_box(Vector3(0.0, 0.78, 0.72), Vector3(width * 0.52, 0.1, 0.06), _make_material_from_color(palette.accent, 0.46), structure_root)
	_add_facade_trim_package(structure_root, width, height, 0.74, palette, "vault")
	_add_box(Vector3(0.0, 0.28, 0.68), Vector3(width * 0.16, 0.42, 0.05), _window_material, structure_root)
	create_storefront_windows(structure_root, width * 0.58, 0.54, 0.73, 2)
	_add_window_planter_local(structure_root, Vector3(-width * 0.28, 0.32, 0.78), 0.34, palette.accent)
	_add_window_planter_local(structure_root, Vector3(width * 0.28, 0.32, 0.78), 0.34, palette.accent)
	create_hvac_units(structure_root, width, depth, height + 0.34, -0.24, variant)
	_add_round_canopy(Vector3(0.0, 0.28, 0.92), Vector3(width * 0.44, 0.14, 0.18), _make_material_from_color(palette.trim, 0.48), structure_root)
	_add_local_sphere(Vector3(0.0, 1.18, -0.12), 0.18, 0.22, _make_material_from_color(palette.accent, 0.36), structure_root)
	create_sign(signage_root, Vector3(0.0, height + 0.18, 0.78), Vector2(width * 0.42, 0.18), palette.accent, "vault")
	var signature_props: Node = null
	_add_bank_signature_upgrade(structure_root, signature_props, width, depth, height, palette)
	match posmod(variant, 5):
		1:
			_add_box(Vector3(0.0, height + 0.38, 0.22), Vector3(width * 0.74, 0.08, 0.18), _make_material_from_color(palette.accent, 0.46), structure_root)
		2:
			_add_soft_block(Vector3(-width * 0.38, 0.5, -0.62), Vector3(0.72, 0.72, 0.78), _make_material_from_color(palette.wall.darkened(0.04), 0.9), structure_root, 0.1)
			_add_box(Vector3(-width * 0.38, 0.54, -0.2), Vector3(0.22, 0.3, 0.05), _window_material, structure_root)
		3:
			for col_x in [-0.76, -0.38, 0.0, 0.38, 0.76]:
				_add_local_cylinder(Vector3(col_x, 0.42, 0.82), 0.045, 0.045, 0.78, _make_material_from_color(palette.trim, 0.84), structure_root)
		4:
			_add_local_cylinder(Vector3(0.0, 1.3, -0.12), 0.16, 0.16, 0.18, _make_material_from_color(palette.accent, 0.36), structure_root)


func _add_bank_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_bank_variant(root, lot_root, structure_root, variant)
	return root


func _populate_grocery_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	var palette := _cozy_palette("grocery", variant)
	var width := 3.0 + float(variant % 3) * 0.16
	var depth := 2.02 + float(int(variant / 3) % 2) * 0.16
	var height := 0.96 + float(int(variant / 5)) * 0.1
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(5.0, 3.9), 0.24)

	var sections := create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_GROCERY, variant, true, rebuild_lot_layout)
	var props_root := sections["props"] as Node3D
	structure_root = sections["main_building"] as Node3D
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, -0.48), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), structure_root, 0.18)
	create_roof(structure_root, Vector3(0.0, height + 0.16, -0.48), Vector3(width + 0.18, 0.18, depth + 0.2), _make_material_from_color(palette.roof, 0.76))
	_add_storefront_depth_package(BUILD_TOOL_GROCERY, structure_root, width, depth, height, 0.5, palette, variant)
	create_awning(structure_root, Vector3(0.0, 0.4, 0.46), width * 0.92, _make_material_from_color(palette.accent, 0.46), _make_material_from_color(palette.trim, 0.76), "round")
	_add_facade_trim_package(structure_root, width, height, 0.5, palette, "grocer")
	_add_box(Vector3(0.0, 0.26, 0.34), Vector3(width * 0.52, 0.34, 0.05), _window_material, structure_root)
	create_storefront_windows(structure_root, width * 0.72, 0.58, 0.46, 3)
	create_hvac_units(structure_root, width, depth, height + 0.32, -0.48, variant)
	_add_box(Vector3(0.0, 0.78, 0.38), Vector3(width * 0.56, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), structure_root)
	for produce_data in [
		{"pos": Vector3(-width * 0.28, 0.12, 0.74), "color": Color("cb644c")},
		{"pos": Vector3(-width * 0.1, 0.12, 0.74), "color": Color("7da85b")},
		{"pos": Vector3(width * 0.08, 0.12, 0.74), "color": Color("f0be63")},
		{"pos": Vector3(width * 0.26, 0.12, 0.74), "color": Color("6ca8c4")}
	]:
		_add_box(produce_data.pos, Vector3(0.18, 0.14, 0.18), _make_material_from_color(produce_data.color, 0.82), structure_root)
	var signature_props: Node = null
	_add_grocery_signature_upgrade(structure_root, signature_props, width, depth, height, palette)
	match posmod(variant, 5):
		1:
			_add_box(Vector3(0.0, height + 0.34, 0.36), Vector3(width * 0.76, 0.1, 0.14), _make_material_from_color(palette.accent, 0.46), structure_root)
		2:
			_add_soft_block(Vector3(width * 0.36, 0.46, -0.78), Vector3(0.82, 0.74, 0.86), _make_material_from_color(palette.wall.darkened(0.03), 0.9), structure_root, 0.1)
			_add_box(Vector3(width * 0.36, 0.54, -0.36), Vector3(0.24, 0.3, 0.05), _window_material, structure_root)
		3:
			_add_box(Vector3(0.0, height + 0.34, -0.28), Vector3(width * 0.44, 0.16, 0.32), _make_material_from_color(palette.trim, 0.64), structure_root)
			_add_box(Vector3(0.0, height + 0.44, -0.28), Vector3(width * 0.34, 0.08, 0.24), _window_material, structure_root)
		4:
			_add_restaurant_canopy_local("stripe", Vector3(0.0, 0.48, 0.58), width * 0.84, _make_material_from_color(palette.accent, 0.5), _make_material_from_color(palette.trim, 0.76), structure_root)


func _add_grocery_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_grocery_variant(root, lot_root, structure_root, variant)
	return root


func _restaurant_variant_profile(variant: int) -> Dictionary:
	var profiles := [
		{"kind": "bistro", "width": 2.5, "depth": 1.78, "height": 0.96, "roof": "gabled", "canopy": "round", "columns": 3, "sign": "bistro"},
		{"kind": "diner", "width": 2.9, "depth": 1.62, "height": 0.88, "roof": "flat", "canopy": "stripe", "columns": 4, "sign": "diner"},
		{"kind": "cafe", "width": 2.42, "depth": 1.92, "height": 1.0, "roof": "shed", "canopy": "pergola", "columns": 2, "sign": "cafe"},
		{"kind": "trattoria", "width": 2.66, "depth": 1.86, "height": 1.04, "roof": "gabled", "canopy": "tile", "columns": 3, "sign": "pizza"},
		{"kind": "grill", "width": 2.76, "depth": 1.74, "height": 0.98, "roof": "flat", "canopy": "bold", "columns": 3, "sign": "grill"},
	]
	return profiles[posmod(variant, profiles.size())]


func _populate_restaurant_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(4.1, 3.0), 0.22)
	create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_RESTAURANT, variant, true, rebuild_lot_layout)


func _add_restaurant_roof_local(center: Vector3, size: Vector3, material: Material, style: String, parent: Node) -> void:
	if style == "flat":
		_add_box(center + Vector3(0.0, -0.08, 0.0), Vector3(size.x, 0.16, size.z), material, parent)
		_add_box(center + Vector3(0.0, 0.04, size.z * 0.48), Vector3(size.x, 0.16, 0.08), material, parent)
		_add_box(center + Vector3(0.0, 0.04, -size.z * 0.48), Vector3(size.x, 0.16, 0.08), material, parent)
		_add_box(center + Vector3(-size.x * 0.48, 0.04, 0.0), Vector3(0.08, 0.16, size.z), material, parent)
		_add_box(center + Vector3(size.x * 0.48, 0.04, 0.0), Vector3(0.08, 0.16, size.z), material, parent)
	elif style == "shed":
		var roof := _add_box(center, Vector3(size.x, 0.16, size.z), material, parent)
		roof.rotation_degrees.x = -5.0
	else:
		_add_gabled_roof(center, size, material, parent, 11.0)


func _add_restaurant_canopy_local(style: String, center: Vector3, width: float, accent_material: Material, trim_material: Material, parent: Node) -> void:
	match style:
		"round":
			_add_round_canopy(center, Vector3(width * 0.78, 0.2, 0.24), accent_material, parent)
		"stripe":
			_add_box(center, Vector3(width * 0.86, 0.12, 0.26), accent_material, parent)
			for stripe_x in [-0.32, -0.1, 0.12, 0.34]:
				_add_box(center + Vector3(stripe_x * width, 0.03, 0.02), Vector3(width * 0.08, 0.035, 0.3), trim_material, parent)
		"pergola":
			_add_box(center + Vector3(0.0, 0.08, 0.0), Vector3(width * 0.78, 0.06, 0.3), accent_material, parent)
			for post_x in [-0.34, 0.34]:
				_add_local_cylinder(center + Vector3(post_x * width, -0.18, 0.06), 0.025, 0.025, 0.46, trim_material, parent)
		"tile":
			_add_box(center, Vector3(width * 0.82, 0.12, 0.28), accent_material, parent)
			for tile_x in [-0.36, -0.12, 0.12, 0.36]:
				_add_box(center + Vector3(tile_x * width, 0.07, -0.02), Vector3(width * 0.12, 0.035, 0.26), trim_material, parent)
		_:
			_add_box(center, Vector3(width * 0.9, 0.16, 0.3), accent_material, parent)
			_add_box(center + Vector3(0.0, 0.11, 0.02), Vector3(width * 0.62, 0.045, 0.32), trim_material, parent)


func _add_restaurant_front_door_local(position_3d: Vector3, parent: Node, accent: Color) -> void:
	var frame_material := _make_material("f4ecda", 0.84)
	var door_material := _make_material_from_color(accent.darkened(0.28), 0.66)
	var brass_material := _make_material("c29c67", 0.54)
	_add_box(position_3d + Vector3(0.0, 0.32, 0.0), Vector3(0.34, 0.64, 0.07), frame_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.3, 0.035), Vector3(0.2, 0.5, 0.035), door_material, parent)
	_add_box(position_3d + Vector3(0.06, 0.32, 0.06), Vector3(0.035, 0.035, 0.025), brass_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.58, 0.06), Vector3(0.14, 0.07, 0.025), _window_material, parent)


func _add_restaurant_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_restaurant_variant(root, lot_root, structure_root, variant)
	return root


func _populate_corner_store_variant(root: Node3D, lot_root: Node3D, structure_root: Node3D, variant: int, rebuild_lot_layout: bool = true) -> void:
	var palette := _cozy_palette("corner_store", variant)
	var width := 2.28 + float(variant % 3) * 0.14
	var depth := 1.74 + float(int(variant / 3) % 2) * 0.12
	var height := 0.92 + float(int(variant / 5)) * 0.1
	if rebuild_lot_layout:
		_add_parcel_shadow(root, Vector2(4.0, 2.95), 0.22)

	var sections := create_property_visual_framework(root, lot_root, structure_root, BUILD_TOOL_CORNER_STORE, variant, true, rebuild_lot_layout)
	var props_root := sections["props"] as Node3D
	structure_root = sections["main_building"] as Node3D
	_add_soft_block(Vector3(-0.18, height * 0.5 + 0.05, -0.24), Vector3(width, height, depth), _make_material_from_color(palette.wall, 0.9), structure_root, 0.18)
	create_roof(structure_root, Vector3(-0.18, height + 0.18, -0.24), Vector3(width + 0.14, 0.18, depth + 0.18), _make_material_from_color(palette.roof, 0.76))
	_add_storefront_depth_package(BUILD_TOOL_CORNER_STORE, structure_root, width, depth, height, 0.62, palette, variant)
	create_awning(structure_root, Vector3(-0.18, 0.36, 0.66), width * 0.94, _make_material_from_color(palette.accent, 0.46), _make_material_from_color(palette.trim, 0.76), "round")
	_add_facade_trim_package(structure_root, width, height, 0.62, palette, "corner")
	_add_box(Vector3(-width * 0.18, 0.24, 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, structure_root)
	_add_box(Vector3(width * 0.18, 0.24, 0.56), Vector3(width * 0.2, 0.34, 0.05), _window_material, structure_root)
	create_storefront_windows(structure_root, width * 0.58, 0.58, 0.62, 2)
	create_hvac_units(structure_root, width, depth, height + 0.34, -0.24, variant)
	_add_box(Vector3(-0.18, 0.82, 0.6), Vector3(width * 0.46, 0.1, 0.05), _make_material_from_color(palette.trim, 0.42), structure_root)
	var signature_props: Node = null
	_add_corner_store_signature_upgrade(structure_root, signature_props, width, depth, height, palette)
	if variant % 2 == 1:
		_add_soft_block(Vector3(width * 0.34, 0.56, -0.42), Vector3(0.46, 0.68, 0.52), _make_material_from_color(palette.trim, 0.84), structure_root, 0.1)


func _add_corner_store_variant(position_3d: Vector3, variant: int) -> Node3D:
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	var structure_root := property_roots["structure"] as Node3D
	_populate_corner_store_variant(root, lot_root, structure_root, variant)
	return root


func _add_park_variant(position_3d: Vector3, variant: int) -> Node3D:
	var palette := _cozy_palette("grocery", variant)
	var property_roots := _create_property_roots(position_3d)
	var root := property_roots["root"] as Node3D
	var lot_root := property_roots["lot"] as Node3D
	_add_parcel_shadow(root, Vector2(3.8, 2.9), 0.18)

	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(3.6, 0.05, 2.7), _make_material("86a65c", 0.96), lot_root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(2.8, 0.03, 0.24), _make_material("d8c7ab", 0.9), lot_root)
	_add_box(Vector3(0.0, 0.04, 0.0), Vector3(0.24, 0.03, 2.1), _make_material("d8c7ab", 0.9), lot_root)
	_add_local_sphere(Vector3(0.0, 0.08, 0.0), 0.17, 0.08, _make_material_from_color(palette.accent, 0.44), lot_root)
	_add_bench_local(Vector3(-0.78, 0.0, 0.0), PI * 0.5, lot_root)
	_add_bench_local(Vector3(0.78, 0.0, 0.0), -PI * 0.5, lot_root)
	_add_local_tree(Vector3(-1.06, 0.0, -0.72), lot_root)
	_add_local_tree(Vector3(1.06, 0.0, 0.62), lot_root)
	_add_local_flower_patch(Vector3(0.82, 0.05, -0.54), 6, _make_material_from_color(palette.trim, 0.8), lot_root)
	return root


func _apply_property_tier_visuals(root: Node3D, tool: String, tier: int, variant: int, variant_id: String = "") -> void:
	tier = clamp(tier, 1, PropertyUpgradeData.max_tier(tool))
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	root.set_meta("variant_id", resolved_variant_id)
	_upgrade_debug("apply tier visuals tool=%s tier=%d variant=%d variant_id=%s root=%s" % [tool, tier, variant, resolved_variant_id, str(root)])
	if tier <= 1 and not _is_commercial_property_tool(tool):
		_upgrade_debug("apply tier visuals skipped (base tier)")
		return

	var profile := PropertyUpgradeData.visual_profile(tool, tier)
	_upgrade_debug("apply tier visuals profile=%s" % [str(profile)])
	match tool:
		BUILD_TOOL_HOUSE:
			_apply_house_tier_visuals(root, tier, variant, profile, resolved_variant_id)
		BUILD_TOOL_FIRE, BUILD_TOOL_BANK, BUILD_TOOL_GROCERY, BUILD_TOOL_RESTAURANT, BUILD_TOOL_CORNER_STORE:
			_apply_service_tier_visuals(root, tool, tier, variant, profile, resolved_variant_id)
		BUILD_TOOL_PARK:
			_apply_park_tier_visuals(root, tier, variant, profile)


func _apply_house_tier_visuals(root: Node3D, tier: int, variant: int, profile: Dictionary, variant_id: String = "") -> void:
	_upgrade_debug("apply house tier visuals tier=%d variant=%d profile=%s" % [tier, variant, str(profile)])
	var palette := _cozy_palette("house", variant)
	var structure_root := _property_upgrade_visual_root(root)
	if variant_id != "" and variant_id != "suburban_cottage":
		_apply_variant_house_upgrades(structure_root, tier, palette, variant_id)
		return
	var roof_trim := _make_material_from_color(palette.trim.lightened(0.04), 0.88)
	var roof_detail := _make_material_from_color(palette.roof.darkened(0.03), 0.74)
	var second_story_wall := _make_material_from_color(palette.wall.lightened(0.06), 0.94)
	var second_story_roof := _make_material_from_color(palette.roof.darkened(0.01), 0.76)
	var upper_width := 1.84
	var upper_depth := 1.58
	var upper_height := 0.98
	var upper_y := 1.86
	var upper_z := -0.02
	var entry_wall := _make_material_from_color(palette.wall.lightened(0.03), 0.94)

	if tier >= 2:
		if bool(profile.get("front_bumpout", false)):
			_add_soft_block(Vector3(0.0, 0.48, 0.12), Vector3(1.08, 0.78, 0.72), entry_wall, structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 1.04, 0.12), Vector3(1.26, 0.16, 0.9), roof_detail, structure_root, 15.0)
			_add_house_front_door_local(Vector3(0.0, 0.0, 0.52), structure_root, false)
			_add_window_band_local(Vector3(-0.36, 0.58, 0.52), Vector3(0.2, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(0.36, 0.58, 0.52), Vector3(0.2, 0.28, 0.05), structure_root)
			_add_house_side_window_local(Vector3(-0.56, 0.58, 0.12), Vector3(0.18, 0.26, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3(0.56, 0.58, 0.12), Vector3(0.18, 0.26, 0.05), structure_root, 1.0)
		if bool(profile.get("roof_trim", false)):
			_add_box(Vector3(0.0, 0.26, 1.72), Vector3(1.52, 0.05, 0.05), roof_trim, structure_root)
			_add_box(Vector3(-0.76, 0.26, 0.2), Vector3(0.05, 0.05, 1.2), roof_trim, structure_root)
			_add_box(Vector3(0.76, 0.26, 0.2), Vector3(0.05, 0.05, 1.2), roof_trim, structure_root)
		if bool(profile.get("frontage_steps", false)):
			_add_house_entry_canopy_local(Vector3(0.0, 0.0, 0.86), structure_root, false, 0.84)
			_add_house_entry_steps_local(Vector3(0.0, 0.0, 0.96), structure_root, false, 0.6)
		if bool(profile.get("wall_windows", false)):
			_add_window_band_local(Vector3(-0.64, 0.5, -0.36), Vector3(0.28, 0.34, 0.05), structure_root)
			_add_window_band_local(Vector3(0.64, 0.5, -0.36), Vector3(0.28, 0.34, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, 0.58, -0.68), Vector3(0.42, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(-0.58, 0.54, 0.52), Vector3(0.2, 0.22, 0.05), structure_root)
			_add_window_band_local(Vector3(0.58, 0.54, 0.52), Vector3(0.2, 0.22, 0.05), structure_root)

	if tier >= 3:
		if bool(profile.get("side_annex", false)):
			var side := -1.0 if posmod(variant, 2) == 0 else 1.0
			_add_soft_block(Vector3(side * 1.42, 0.55, 0.12), Vector3(1.12, 0.94, 1.34), _make_material_from_color(palette.wall.darkened(0.02), 0.94), structure_root, 0.14)
			_add_gabled_roof(Vector3(side * 1.42, 1.18, 0.12), Vector3(1.32, 0.16, 1.48), roof_detail, structure_root, 13.0)
			if bool(profile.get("wall_windows", false)):
				_add_window_band_local(Vector3(side * 1.46, 0.6, 0.76), Vector3(0.24, 0.3, 0.05), structure_root)
				_add_window_band_local(Vector3(side * 1.46, 0.94, 0.76), Vector3(0.22, 0.22, 0.05), structure_root)
				_add_house_side_window_local(Vector3(side * 1.98, 0.62, 0.04), Vector3(0.28, 0.34, 0.05), structure_root, side)
				_add_house_side_window_local(Vector3(side * 1.98, 0.94, -0.34), Vector3(0.22, 0.24, 0.05), structure_root, side)
		if bool(profile.get("upper_windows", false)):
			_add_window_band_local(Vector3(-0.36, 0.92, -0.5), Vector3(0.22, 0.24, 0.05), structure_root)
			_add_window_band_local(Vector3(0.36, 0.92, -0.5), Vector3(0.22, 0.24, 0.05), structure_root)
		_add_box(Vector3(0.72, 1.48, -0.42), Vector3(0.18, 0.42, 0.18), _stone_material, structure_root)

	if tier >= 4:
		_add_soft_block(Vector3(0.0, upper_y + upper_height * 0.5, upper_z), Vector3(upper_width, upper_height, upper_depth), second_story_wall, structure_root, 0.12)
		_add_gabled_roof(Vector3(0.0, upper_y + upper_height + 0.32, upper_z), Vector3(upper_width + 0.2, 0.16, upper_depth + 0.18), second_story_roof, structure_root, 17.0)
		if bool(profile.get("wall_windows", false)):
			_add_window_band_local(Vector3(-0.62, upper_y + 0.06, upper_z - 0.42), Vector3(0.26, 0.32, 0.05), structure_root)
			_add_window_band_local(Vector3(0.62, upper_y + 0.06, upper_z - 0.42), Vector3(0.26, 0.32, 0.05), structure_root)
			_add_window_band_local(Vector3(-0.76, upper_y + 0.08, upper_z + 0.08), Vector3(0.22, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(0.76, upper_y + 0.08, upper_z + 0.08), Vector3(0.22, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, upper_y + 0.26, upper_z - 0.5), Vector3(0.48, 0.26, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, upper_y + 0.26, upper_z + 0.28), Vector3(0.32, 0.2, 0.05), structure_root)
		if bool(profile.get("upper_windows", false)):
			_add_window_band_local(Vector3(0.0, upper_y + 0.2, upper_z + 0.82), Vector3(0.5, 0.32, 0.05), structure_root)
			_add_window_band_local(Vector3(-0.72, upper_y + 0.16, upper_z + 0.42), Vector3(0.24, 0.24, 0.05), structure_root)
			_add_window_band_local(Vector3(0.72, upper_y + 0.16, upper_z + 0.42), Vector3(0.24, 0.24, 0.05), structure_root)
			_add_window_band_local(Vector3(-0.66, upper_y + 0.16, upper_z - 0.54), Vector3(0.2, 0.2, 0.05), structure_root)
			_add_window_band_local(Vector3(0.66, upper_y + 0.16, upper_z - 0.54), Vector3(0.2, 0.2, 0.05), structure_root)
			_add_house_side_window_local(Vector3(-upper_width * 0.56, upper_y + 0.12, upper_z + 0.02), Vector3(0.26, 0.32, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3(upper_width * 0.56, upper_y + 0.12, upper_z + 0.02), Vector3(0.26, 0.32, 0.05), structure_root, 1.0)
		_add_box(Vector3(0.0, upper_y - 0.22, upper_z - 0.02), Vector3(1.72, 0.08, 1.18), _make_material("d8c7ab", 0.9), structure_root)
		_add_box(Vector3(-0.74, 1.54, -0.46), Vector3(0.18, 0.46, 0.18), _stone_material, structure_root)
		_add_box(Vector3(0.74, 1.54, -0.46), Vector3(0.18, 0.46, 0.18), _stone_material, structure_root)

	if tier >= 5:
		if bool(profile.get("upper_side_wing", false)):
			var upper_side := 1.0 if posmod(variant, 2) == 0 else -1.0
			_add_soft_block(Vector3(upper_side * 1.18, upper_y + 0.26, upper_z + 0.1), Vector3(0.86, 0.72, 1.0), second_story_wall, structure_root, 0.1)
			_add_gabled_roof(Vector3(upper_side * 1.18, upper_y + 0.84, upper_z + 0.1), Vector3(1.02, 0.13, 1.12), second_story_roof, structure_root, 14.0)
			_add_window_band_local(Vector3(upper_side * 1.18, upper_y + 0.3, upper_z + 0.62), Vector3(0.34, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(upper_side * 1.18, upper_y + 0.34, upper_z - 0.42), Vector3(0.22, 0.24, 0.05), structure_root)
			_add_house_side_window_local(Vector3(upper_side * 1.64, upper_y + 0.28, upper_z + 0.06), Vector3(0.24, 0.28, 0.05), structure_root, upper_side)
		if bool(profile.get("roof_cap", false)):
			_add_box(Vector3(0.0, upper_y + upper_height + 0.14, upper_z), Vector3(upper_width + 0.34, 0.06, 0.22), roof_trim, structure_root)
			_add_gabled_roof(Vector3(0.0, upper_y + upper_height + 0.44, upper_z), Vector3(upper_width + 0.38, 0.12, upper_depth + 0.12), second_story_roof, structure_root, 15.0)
			_add_window_band_local(Vector3(-0.72, upper_y + 0.24, upper_z + 0.44), Vector3(0.22, 0.22, 0.05), structure_root)
			_add_window_band_local(Vector3(0.72, upper_y + 0.24, upper_z + 0.44), Vector3(0.22, 0.22, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, upper_y + 0.34, upper_z - 0.56), Vector3(0.38, 0.22, 0.05), structure_root)
			_add_box(Vector3(-0.92, upper_y + 0.04, 0.08), Vector3(0.08, 0.38, 0.08), roof_trim, structure_root)
			_add_box(Vector3(0.92, upper_y + 0.04, 0.08), Vector3(0.08, 0.38, 0.08), roof_trim, structure_root)


func _apply_variant_house_upgrades(parent: Node3D, tier: int, palette: Dictionary, variant_id: String) -> void:
	var wall := _make_material_from_color(palette.wall.lightened(0.05), 0.92)
	var roof := _make_house_roof_material(palette.roof.darkened(0.08))
	var trim := _make_material_from_color(palette.trim, 0.88)
	var accent := _make_material_from_color(palette.accent, 0.78)
	match variant_id:
		"modern_boxy_house":
			if tier >= 2:
				_add_box(Vector3(-0.28, 1.42, -1.05), Vector3(2.86, 0.08, 2.14), trim, parent)
				_add_box(Vector3(-1.12, 0.62, 0.08), Vector3(0.82, 0.88, 0.12), _make_transparent_material(Color("c6e8ef"), 0.18, 0.2), parent)
			if tier >= 3:
				_add_soft_block(Vector3(1.46, 0.58, -0.64), Vector3(0.92, 1.04, 1.34), wall, parent, 0.08)
				_add_box(Vector3(1.46, 1.14, -0.64), Vector3(1.08, 0.1, 1.5), roof, parent)
				_add_box(Vector3(1.46, 0.48, 0.08), Vector3(0.62, 0.46, 0.06), trim, parent)
			if tier >= 4:
				_add_soft_block(Vector3(-0.54, 1.72, -1.16), Vector3(1.34, 0.7, 1.08), wall, parent, 0.08)
				_add_box(Vector3(-0.54, 2.1, -1.16), Vector3(1.52, 0.1, 1.26), roof, parent)
				_add_box(Vector3(-0.54, 1.82, -0.56), Vector3(0.88, 0.36, 0.05), _window_material, parent)
		"farmhouse_style":
			if tier >= 2:
				_add_box(Vector3(0.18, 0.18, 0.5), Vector3(3.1, 0.08, 0.74), _make_material("9c7652", 0.84), parent)
				for x in [-1.22, -0.62, 0.0, 0.62, 1.22]:
					_add_box(Vector3(x, 0.48, 0.68), Vector3(0.05, 0.78, 0.05), trim, parent)
			if tier >= 3:
				_add_soft_block(Vector3(1.48, 0.58, -0.98), Vector3(1.02, 1.04, 1.48), wall, parent, 0.1)
				_add_gabled_roof(Vector3(1.48, 1.28, -0.98), Vector3(1.22, 0.18, 1.68), roof, parent, 19.0)
				_add_house_wall_window_local(Vector3(1.48, 0.62, -0.2), Vector3(0.3, 0.36, 0.05), parent)
			if tier >= 4:
				_add_soft_block(Vector3(0.0, 1.88, -1.18), Vector3(1.92, 0.8, 1.44), wall, parent, 0.1)
				_add_gabled_roof(Vector3(0.0, 2.42, -1.18), Vector3(2.14, 0.18, 1.64), roof, parent, 22.0)
				_add_dormer(Vector3(-0.48, 2.1, -0.68), palette.wall, palette.roof, parent)
				_add_dormer(Vector3(0.48, 2.1, -0.68), palette.wall, palette.roof, parent)
		"compact_townhome":
			if tier >= 2:
				_add_soft_block(Vector3(-0.68, 0.72, -0.42), Vector3(0.72, 1.3, 0.94), wall, parent, 0.07)
				_add_gabled_roof(Vector3(-0.68, 1.52, -0.42), Vector3(0.88, 0.14, 1.1), roof, parent, 22.0)
				_add_house_wall_window_local(Vector3(-0.68, 0.82, 0.08), Vector3(0.24, 0.34, 0.05), parent)
			if tier >= 3:
				_add_soft_block(Vector3(1.12, 0.72, -1.28), Vector3(0.72, 1.34, 1.18), wall, parent, 0.08)
				_add_gabled_roof(Vector3(1.12, 1.54, -1.28), Vector3(0.9, 0.14, 1.36), roof, parent, 20.0)
				_add_house_side_window_local(Vector3(1.48, 0.88, -1.2), Vector3(0.22, 0.38, 0.05), parent, 1.0)
			if tier >= 4:
				_add_soft_block(Vector3(0.0, 2.38, -1.14), Vector3(1.56, 0.86, 1.32), wall, parent, 0.08)
				_add_gabled_roof(Vector3(0.0, 2.96, -1.14), Vector3(1.76, 0.16, 1.52), roof, parent, 25.0)
				_add_box(Vector3(0.0, 2.48, -0.46), Vector3(0.72, 0.38, 0.05), _window_material, parent)
				_add_box(Vector3(-0.62, 2.78, -1.48), Vector3(0.16, 0.64, 0.16), accent, parent)


func _is_commercial_property_tool(tool: String) -> bool:
	return COMMERCIAL_TIER_ARCHITECTURE.has(tool)


func _clear_visual_children(parent: Node) -> void:
	for child in parent.get_children():
		parent.remove_child(child)
		child.free()


func _commercial_tier_architecture(tool: String, tier: int, variant_id: String = "") -> Dictionary:
	var variant_tier := _property_variant_tier_config(tool, variant_id, tier)
	if not variant_tier.is_empty():
		var variant_profile := variant_tier.duplicate(true)
		variant_profile["tier"] = _property_visual_tier(tier)
		variant_profile["gameplay_tier"] = tier
		variant_profile["variant_id"] = variant_id
		variant_profile["variant_config"] = _property_variant_config(tool, variant_id)
		variant_profile["visual_preset"] = COMMERCIAL_VISUAL_PRESETS.get(tool, {})
		return variant_profile
	var tier_map: Dictionary = COMMERCIAL_TIER_ARCHITECTURE.get(tool, {})
	if tier_map.is_empty():
		return {}
	var clamped_tier: int = clamp(tier, 1, 5)
	var profile: Dictionary = tier_map.get(clamped_tier, tier_map.get(1, {})).duplicate(true)
	profile["tier"] = clamped_tier
	profile["gameplay_tier"] = tier
	profile["variant_id"] = variant_id
	profile["visual_preset"] = COMMERCIAL_VISUAL_PRESETS.get(tool, {})
	return profile


func _rebuild_commercial_tier_visuals(root: Node3D, tool: String, tier: int, variant: int, palette: Dictionary, variant_id: String = "") -> void:
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	var architecture := _commercial_tier_architecture(tool, tier, resolved_variant_id)
	if architecture.is_empty():
		return
	var building_anchor := _property_building_anchor(root)
	var main_root := _ensure_visual_section(building_anchor, "MainBuilding")
	var signage_root := _ensure_visual_section(building_anchor, "Signage")
	var upgrade_root := _ensure_visual_section(building_anchor, "BuildingUpgradeVisual")
	var dynamic_root := _property_dynamic_props_root(root)
	_clear_visual_children(main_root)
	_clear_visual_children(signage_root)
	_clear_visual_children(upgrade_root)
	_clear_visual_children(dynamic_root)
	root.set_meta("commercial_architecture_tier", _property_visual_tier(tier) if not _property_variant_config(tool, resolved_variant_id).is_empty() else int(architecture.get("tier", tier)))
	root.set_meta("commercial_gameplay_tier", tier)
	root.set_meta("commercial_architecture_profile", architecture)
	root.set_meta("variant_id", resolved_variant_id)
	var shadow_width := _commercial_float(architecture, "width", 2.8)
	var shadow_depth := _commercial_float(architecture, "depth", 1.8)
	var shadow_z := _commercial_float(architecture, "center_z", -0.6)
	_add_shadow_disc_local(Vector3(0.0, 0.01, shadow_z + 0.04), Vector2(shadow_width * 1.12, shadow_depth * 1.0), 0.18, main_root)
	match tool:
		BUILD_TOOL_FIRE:
			_build_fire_department_architecture(main_root, signage_root, upgrade_root, architecture, palette, variant)
		BUILD_TOOL_BANK:
			_build_bank_architecture(main_root, signage_root, upgrade_root, architecture, palette, variant)
		BUILD_TOOL_GROCERY:
			_build_grocery_architecture(main_root, signage_root, upgrade_root, architecture, palette, variant)
		BUILD_TOOL_RESTAURANT:
			_build_restaurant_architecture(main_root, signage_root, upgrade_root, architecture, palette, variant)
		BUILD_TOOL_CORNER_STORE:
			_build_corner_store_architecture(main_root, signage_root, upgrade_root, architecture, palette, variant)
	if tool != BUILD_TOOL_RESTAURANT:
		_add_commercial_architecture_depth_polish(main_root, architecture, palette)
	_add_commercial_dynamic_lot_details(dynamic_root, tool, architecture, palette, tier, variant, resolved_variant_id)


func _add_commercial_architecture_depth_polish(parent: Node, profile: Dictionary, palette: Dictionary) -> void:
	var width := _commercial_float(profile, "width", 2.8)
	var depth := _commercial_float(profile, "depth", 1.7)
	var height := _commercial_float(profile, "height", 0.96)
	var center_z := _commercial_float(profile, "center_z", -0.55)
	var front_z := _commercial_float(profile, "front_z", 0.42)
	var trim_material := _make_material_from_color(palette["trim"], 0.8)
	var roof_shadow := _make_material_from_color(palette["roof"].darkened(0.22), 0.86)
	var warm_glass := _make_transparent_material(Color("fff0c4"), 0.18, 0.18)
	_add_box(Vector3(0.0, 0.17, front_z + 0.07), Vector3(width * 0.92, 0.06, 0.08), roof_shadow, parent)
	_add_box(Vector3(0.0, height + 0.18, front_z + 0.06), Vector3(width * 0.96, 0.06, 0.09), roof_shadow, parent)
	for side_x in [-width * 0.52, width * 0.52]:
		_add_box(Vector3(side_x, height * 0.5, center_z + depth * 0.06), Vector3(0.05, height * 0.78, depth * 0.62), trim_material, parent)
		_add_box(Vector3(side_x * 0.98, minf(0.68, height * 0.62), center_z - depth * 0.18), Vector3(0.032, 0.22, 0.24), warm_glass, parent)
	if width > 2.6:
		create_rooftop_detail(parent, Vector3(width * 0.32, height + 0.44, center_z - depth * 0.22), palette["roof"])
	_add_box(Vector3(0.0, 0.1, center_z - depth * 0.54), Vector3(width * 0.78, 0.05, 0.05), roof_shadow, parent)


func _commercial_float(profile: Dictionary, key: String, fallback: float) -> float:
	return float(profile.get(key, fallback))


func _commercial_int(profile: Dictionary, key: String, fallback: int) -> int:
	return int(profile.get(key, fallback))


func _commercial_bool(profile: Dictionary, key: String) -> bool:
	return bool(profile.get(key, false))


func _build_fire_department_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var variant_id := str(profile.get("variant_id", "classic_brick_station"))
	var width := _commercial_float(profile, "width", 2.8)
	var depth := _commercial_float(profile, "depth", 1.8)
	var height := _commercial_float(profile, "height", 1.0)
	var center_z := _commercial_float(profile, "center_z", -0.62)
	var front_z := _commercial_float(profile, "front_z", 0.32)
	var bays := _commercial_int(profile, "bays", 1)
	var roof_style := str(profile.get("roof", "flat"))
	var wall_material := _make_material_from_color(palette["wall"], 0.88)
	var darker_wall := _make_material_from_color(palette["wall"].darkened(0.08), 0.9)
	var roof_material := _make_material_from_color(palette["roof"], 0.76)
	var bay_material := _make_material("383d42", 0.88)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.16)
	create_modular_roof(main_root, Vector3(0.0, height + 0.2, center_z), Vector3(width + 0.18, 0.18, depth + 0.2), roof_material, roof_style)
	create_trim_layer(main_root, width, height, front_z, palette, "")
	var bay_area_width := width * 0.74
	var bay_width := minf(0.82, bay_area_width / maxf(1.0, float(bays)) * 0.82)
	for bay_index in range(bays):
		var t := 0.5 if bays <= 1 else float(bay_index) / float(bays - 1)
		var x := lerpf(-bay_area_width * 0.5 + bay_width * 0.5, bay_area_width * 0.5 - bay_width * 0.5, t)
		_add_box(Vector3(x, 0.38, front_z + 0.045), Vector3(bay_width, 0.68, 0.075), bay_material, main_root)
		for slat_y in [0.2, 0.38, 0.56]:
			_add_box(Vector3(x, slat_y, front_z + 0.09), Vector3(bay_width * 0.84, 0.035, 0.035), trim_material, main_root)
	_add_restaurant_front_door_local(Vector3(-width * 0.42, 0.0, front_z + 0.06), main_root, palette["accent"])
	_add_box(Vector3(width * 0.42, 0.68, front_z + 0.06), Vector3(0.28, 0.28, 0.06), _window_material, main_root)
	if _commercial_bool(profile, "glass"):
		_add_box(Vector3(-width * 0.36, 0.68, front_z + 0.08), Vector3(width * 0.18, 0.38, 0.055), _make_transparent_material(Color("bfe6ff"), 0.2, 0.22), main_root)
	if variant_id == "volunteer_station":
		_add_box(Vector3(0.0, 0.82, front_z + 0.08), Vector3(width * 0.42, 0.08, 0.055), accent_material, main_root)
	if variant_id == "industrial_emergency_station":
		_add_box(Vector3(width * 0.48, 0.92, center_z - depth * 0.1), Vector3(0.035, 0.78, 0.035), trim_material, main_root)
		for rung_y in [0.58, 0.78, 0.98]:
			_add_box(Vector3(width * 0.48, rung_y, center_z - depth * 0.1), Vector3(0.24, 0.026, 0.026), trim_material, main_root)
	create_sign(signage_root, Vector3(0.0, height + 0.42, front_z + 0.12), Vector2(width * 0.46, 0.2), palette["accent"], _variant_sign_kind(BUILD_TOOL_FIRE, variant_id))
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(-width * 0.42, 0.52, center_z - depth * 0.42), Vector3(width * 0.34, 0.84, depth * 0.74), darker_wall, upgrade_root, 0.12)
		_add_box(Vector3(-width * 0.42, 0.62, center_z - depth * 0.08), Vector3(0.28, 0.34, 0.055), _window_material, upgrade_root)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(width * 0.42, 0.58, center_z - depth * 0.48), Vector3(width * 0.34, 0.94, depth * 0.68), _make_material_from_color(palette["wall"].lightened(0.04), 0.9), upgrade_root, 0.12)
		_add_box(Vector3(width * 0.42, 0.72, center_z - depth * 0.12), Vector3(0.28, 0.36, 0.055), _window_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.48, center_z - 0.08), Vector3(width * 0.78, 0.74, depth * 0.72), _make_material_from_color(palette["wall"].lightened(0.06), 0.92), upgrade_root, 0.12)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 0.98, center_z - 0.08), Vector3(width * 0.88, 0.14, depth * 0.82), roof_material, "flat")
		for window_x in [-width * 0.24, 0.0, width * 0.24]:
			_add_window_band_local(Vector3(window_x, height + 0.42, front_z + 0.02), Vector3(0.22, 0.26, 0.05), upgrade_root)
	if _commercial_bool(profile, "tower"):
		var tower_x := width * 0.46
		_add_soft_block(Vector3(tower_x, 1.22, center_z - depth * 0.28), Vector3(0.62, 2.1, 0.62), darker_wall, upgrade_root, 0.08)
		_add_box(Vector3(tower_x, 2.36, center_z - depth * 0.28), Vector3(0.78, 0.16, 0.78), roof_material, upgrade_root)
		for level_y in [0.82, 1.22, 1.62]:
			_add_window_band_local(Vector3(tower_x, level_y, center_z + 0.05), Vector3(0.18, 0.22, 0.05), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_local_cylinder(Vector3(-width * 0.5, 1.18, front_z + 0.1), 0.055, 0.055, 1.0, accent_material, upgrade_root)
		_add_local_cylinder(Vector3(width * 0.5, 1.18, front_z + 0.1), 0.055, 0.055, 1.0, accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.5, 1.72, front_z + 0.1), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.5, 1.72, front_z + 0.1), upgrade_root)


func _build_bank_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var variant_id := str(profile.get("variant_id", _property_variant_id_for_seed(BUILD_TOOL_BANK, variant)))
	match variant_id:
		"modern_glass_bank":
			_build_modern_glass_bank_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"small_town_brick_bank":
			_build_small_town_brick_bank_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"premium_financial_center":
			_build_premium_financial_center_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		_:
			_build_traditional_column_bank_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)


func _build_traditional_column_bank_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 2.6)
	var depth := _commercial_float(profile, "depth", 1.6)
	var height := _commercial_float(profile, "height", 1.0)
	var center_z := _commercial_float(profile, "center_z", -0.58)
	var front_z := _commercial_float(profile, "front_z", 0.28)
	var columns := _commercial_int(profile, "columns", 3)
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	var trim_material := _make_material_from_color(palette["trim"], 0.84)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.16)
	create_modular_roof(main_root, Vector3(0.0, height + 0.2, center_z), Vector3(width + 0.2, 0.18, depth + 0.18), roof_material, "flat")
	create_trim_layer(main_root, width, height, front_z, palette, "")
	create_glass_frontage(main_root, width * (0.78 if _commercial_bool(profile, "glass") else 0.62), 0.48, front_z + 0.04, 3 + int(_commercial_bool(profile, "glass")))
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.08), main_root, palette["accent"])
	create_columns(main_root, width * 0.72, front_z + 0.12, columns, trim_material)
	create_sign(signage_root, Vector3(0.0, height + 0.38, front_z + 0.12), Vector2(width * 0.44, 0.2), palette["accent"], "bank")
	if _commercial_int(profile, "wing", 0) >= 2:
		for side in [-1.0, 1.0]:
			_add_soft_block(Vector3(side * width * 0.42, 0.54, center_z - depth * 0.46), Vector3(width * 0.32, 0.86, depth * 0.66), _make_material_from_color(palette["wall"].darkened(0.02), 0.9), upgrade_root, 0.1)
			_add_box(Vector3(side * width * 0.42, 0.58, center_z - depth * 0.12), Vector3(0.26, 0.34, 0.05), _window_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.46, center_z - 0.08), Vector3(width * 0.82, 0.78, depth * 0.72), _make_material_from_color(palette["wall"].lightened(0.06), 0.92), upgrade_root, 0.12)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 1.0, center_z - 0.08), Vector3(width * 0.92, 0.14, depth * 0.82), roof_material, "flat")
		for window_x in [-width * 0.26, 0.0, width * 0.26]:
			_add_window_band_local(Vector3(window_x, height + 0.42, front_z), Vector3(0.24, 0.28, 0.05), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_soft_block(Vector3(0.0, 0.96, front_z + 0.08), Vector3(width * 0.5, 1.18, 0.26), _make_transparent_material(Color("d8f2ff"), 0.18, 0.22), upgrade_root, 0.08)
		_add_box(Vector3(0.0, height + 0.62, front_z + 0.16), Vector3(width * 0.56, 0.1, 0.12), accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.48, 0.9, front_z + 0.14), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.48, 0.9, front_z + 0.14), upgrade_root)


func _build_modern_glass_bank_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 2.8)
	var depth := _commercial_float(profile, "depth", 1.8)
	var height := _commercial_float(profile, "height", 1.06)
	var center_z := _commercial_float(profile, "center_z", -0.64)
	var front_z := _commercial_float(profile, "front_z", 0.32)
	var wall_material := _make_material_from_color(palette["wall"], 0.88)
	var roof_material := _make_material_from_color(palette["roof"], 0.78)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.46)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.18, 0.2)
	_add_soft_block(Vector3(-width * 0.08, height * 0.5 + 0.05, center_z), Vector3(width * 0.86, height, depth), wall_material, main_root, 0.1)
	_add_soft_block(Vector3(width * 0.36, height * 0.56 + 0.05, center_z + 0.04), Vector3(width * 0.28, height * 1.08, depth * 0.88), glass_material, main_root, 0.06)
	create_modular_roof(main_root, Vector3(-width * 0.08, height + 0.2, center_z), Vector3(width + 0.26, 0.16, depth + 0.18), roof_material, "flat")
	_add_box(Vector3(-width * 0.1, 0.7, front_z + 0.08), Vector3(width * 0.72, 0.08, 0.08), accent_material, main_root)
	create_glass_frontage(main_root, width * 0.82, 0.48, front_z + 0.05, 4)
	_add_restaurant_front_door_local(Vector3(-width * 0.14, 0.0, front_z + 0.1), main_root, palette["accent"])
	create_sign(signage_root, Vector3(-width * 0.08, height + 0.38, front_z + 0.14), Vector2(width * 0.42, 0.2), palette["accent"], "bank")
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(-width * 0.44, 0.52, center_z - depth * 0.42), Vector3(width * 0.32, 0.84, depth * 0.62), _make_material_from_color(palette["wall"].darkened(0.04), 0.9), upgrade_root, 0.08)
		_add_box(Vector3(-width * 0.44, 0.62, center_z - depth * 0.08), Vector3(0.28, 0.34, 0.055), glass_material, upgrade_root)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(width * 0.12, 0.6, center_z - depth * 0.5), Vector3(width * 0.42, 0.96, depth * 0.58), glass_material, upgrade_root, 0.06)
		_add_box(Vector3(width * 0.12, 1.14, center_z - depth * 0.5), Vector3(width * 0.46, 0.08, depth * 0.62), roof_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(-width * 0.08, height + 0.42, center_z - 0.1), Vector3(width * 0.66, 0.74, depth * 0.66), glass_material, upgrade_root, 0.06)
		create_modular_roof(upgrade_root, Vector3(-width * 0.08, height + 0.94, center_z - 0.1), Vector3(width * 0.76, 0.12, depth * 0.74), roof_material, "flat")
		_add_box(Vector3(-width * 0.08, height + 0.38, front_z + 0.06), Vector3(width * 0.5, 0.28, 0.05), glass_material, upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(-width * 0.1, height + 0.58, front_z + 0.16), Vector3(width * 0.62, 0.08, 0.1), accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.48, 0.92, front_z + 0.14), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.42, 0.92, front_z + 0.14), upgrade_root)


func _build_small_town_brick_bank_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 2.5)
	var depth := _commercial_float(profile, "depth", 1.6)
	var height := _commercial_float(profile, "height", 1.0)
	var center_z := _commercial_float(profile, "center_z", -0.6)
	var front_z := _commercial_float(profile, "front_z", 0.28)
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var brick_shadow := _make_material_from_color(palette["wall"].darkened(0.12), 0.92)
	var roof_material := _make_material_from_color(palette["roof"], 0.78)
	var trim_material := _make_material_from_color(palette["trim"], 0.84)
	var accent_material := _make_material_from_color(palette["accent"], 0.54)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.12)
	create_modular_roof(main_root, Vector3(0.0, height + 0.26, center_z), Vector3(width + 0.24, 0.16, depth + 0.22), roof_material, str(profile.get("roof", "gabled")))
	for row_y in [0.34, 0.58, 0.82]:
		_add_box(Vector3(0.0, row_y, front_z + 0.055), Vector3(width * 0.78, 0.028, 0.035), brick_shadow, main_root)
	_add_box(Vector3(0.0, 0.82, front_z + 0.06), Vector3(width * 0.62, 0.11, 0.07), trim_material, main_root)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.08), main_root, palette["accent"])
	for window_x in [-width * 0.3, width * 0.3]:
		_add_box(Vector3(window_x, 0.54, front_z + 0.06), Vector3(0.28, 0.34, 0.055), _window_material, main_root)
	create_sign(signage_root, Vector3(0.0, height + 0.26, front_z + 0.12), Vector2(width * 0.42, 0.18), palette["accent"], "bank")
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(-width * 0.4, 0.54, center_z - depth * 0.42), Vector3(width * 0.34, 0.86, depth * 0.64), _make_material_from_color(palette["wall"].darkened(0.04), 0.9), upgrade_root, 0.1)
		_add_box(Vector3(-width * 0.4, 0.58, center_z - depth * 0.08), Vector3(0.24, 0.32, 0.055), _window_material, upgrade_root)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(width * 0.4, 0.58, center_z - depth * 0.44), Vector3(width * 0.34, 0.94, depth * 0.7), _make_material_from_color(palette["wall"].lightened(0.04), 0.9), upgrade_root, 0.1)
		_add_box(Vector3(width * 0.4, 0.64, center_z - depth * 0.08), Vector3(0.26, 0.34, 0.055), _window_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.42, center_z - 0.06), Vector3(width * 0.78, 0.72, depth * 0.66), _make_material_from_color(palette["wall"].lightened(0.05), 0.9), upgrade_root, 0.1)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 0.94, center_z - 0.06), Vector3(width * 0.86, 0.13, depth * 0.72), roof_material, str(profile.get("roof", "gabled")))
		for window_x in [-width * 0.22, width * 0.22]:
			_add_window_band_local(Vector3(window_x, height + 0.38, front_z + 0.02), Vector3(0.24, 0.26, 0.05), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(0.0, height + 0.5, front_z + 0.16), Vector3(width * 0.54, 0.09, 0.1), accent_material, upgrade_root)
		_add_local_cylinder(Vector3(width * 0.46, 1.0, center_z - depth * 0.35), 0.06, 0.06, 0.42, trim_material, upgrade_root)


func _build_premium_financial_center_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 3.1)
	var depth := _commercial_float(profile, "depth", 1.9)
	var height := _commercial_float(profile, "height", 1.14)
	var center_z := _commercial_float(profile, "center_z", -0.68)
	var front_z := _commercial_float(profile, "front_z", 0.34)
	var wall_material := _make_material_from_color(palette["wall"], 0.88)
	var roof_material := _make_material_from_color(palette["roof"], 0.76)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var glass_material := _make_transparent_material(Color("d8f2ff"), 0.18, 0.2)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.12)
	_add_soft_block(Vector3(0.0, 0.62, front_z + 0.04), Vector3(width * 0.58, 0.86, 0.18), glass_material, main_root, 0.06)
	create_modular_roof(main_root, Vector3(0.0, height + 0.22, center_z), Vector3(width + 0.28, 0.18, depth + 0.2), roof_material, "flat")
	create_trim_layer(main_root, width, height, front_z, palette, "")
	_add_box(Vector3(0.0, 0.88, front_z + 0.13), Vector3(width * 0.72, 0.1, 0.1), accent_material, main_root)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.12), main_root, palette["accent"])
	create_columns(main_root, width * 0.72, front_z + 0.13, _commercial_int(profile, "columns", 4), trim_material)
	create_sign(signage_root, Vector3(0.0, height + 0.4, front_z + 0.14), Vector2(width * 0.48, 0.2), palette["accent"], "bank")
	if _commercial_int(profile, "wing", 0) >= 1:
		for side in [-1.0, 1.0]:
			_add_soft_block(Vector3(side * width * 0.42, 0.62, center_z - depth * 0.44), Vector3(width * 0.3, 0.96, depth * 0.68), _make_material_from_color(palette["wall"].darkened(0.02), 0.88), upgrade_root, 0.1)
			_add_box(Vector3(side * width * 0.42, 0.66, center_z - depth * 0.1), Vector3(0.24, 0.34, 0.055), glass_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.48, center_z - 0.08), Vector3(width * 0.84, 0.8, depth * 0.72), _make_material_from_color(palette["wall"].lightened(0.04), 0.88), upgrade_root, 0.1)
		_add_soft_block(Vector3(0.0, height + 0.46, front_z + 0.05), Vector3(width * 0.54, 0.66, 0.16), glass_material, upgrade_root, 0.05)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 1.02, center_z - 0.08), Vector3(width * 0.94, 0.14, depth * 0.84), roof_material, "flat")
		for side in [-1.0, 1.0]:
			_add_window_band_local(Vector3(side * width * 0.3, height + 0.44, front_z + 0.02), Vector3(0.24, 0.28, 0.05), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(0.0, height + 0.68, front_z + 0.18), Vector3(width * 0.62, 0.1, 0.12), accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.48, 0.96, front_z + 0.16), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.48, 0.96, front_z + 0.16), upgrade_root)


func _build_grocery_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var variant_id := str(profile.get("variant_id", "green_supermarket"))
	var width := _commercial_float(profile, "width", 3.0)
	var depth := _commercial_float(profile, "depth", 1.8)
	var height := _commercial_float(profile, "height", 1.0)
	var center_z := _commercial_float(profile, "center_z", -0.66)
	var front_z := _commercial_float(profile, "front_z", 0.28)
	var roof_style := str(profile.get("roof", "flat"))
	var awning_style := str(profile.get("awning", "round"))
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.16)
	create_modular_roof(main_root, Vector3(0.0, height + 0.2, center_z), Vector3(width + 0.24, 0.18, depth + 0.22), roof_material, roof_style)
	create_trim_layer(main_root, width, height, front_z, palette, "")
	create_glass_frontage(main_root, width * (0.82 if _commercial_bool(profile, "glass") else 0.68), 0.48, front_z + 0.04, 4)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.08), main_root, palette["accent"])
	create_awning(main_root, Vector3(0.0, 0.72, front_z + 0.14), width * 0.9, accent_material, trim_material, awning_style)
	create_sign(signage_root, Vector3(0.0, height + 0.38, front_z + 0.14), Vector2(width * 0.5, 0.22), palette["accent"], _variant_sign_kind(BUILD_TOOL_GROCERY, variant_id))
	if variant_id == "warehouse_grocery":
		_add_box(Vector3(width * 0.42, 0.38, center_z - depth * 0.42), Vector3(0.46, 0.52, 0.06), _make_material("4d5962", 0.86), main_root)
		_add_box(Vector3(width * 0.42, 0.7, center_z - depth * 0.42), Vector3(0.52, 0.055, 0.075), accent_material, main_root)
	if variant_id == "organic_market":
		_add_box(Vector3(0.0, 0.9, front_z + 0.12), Vector3(width * 0.7, 0.06, 0.06), _make_material("9f7b56", 0.78), main_root)
		for crate_x in [-width * 0.34, width * 0.34]:
			_add_box(Vector3(crate_x, 0.18, front_z + 0.18), Vector3(0.28, 0.14, 0.18), _make_material("9f7b56", 0.82), main_root)
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(-width * 0.38, 0.56, center_z - depth * 0.42), Vector3(width * 0.34, 0.9, depth * 0.68), _make_material_from_color(palette["wall"].darkened(0.03), 0.9), upgrade_root, 0.12)
		_add_box(Vector3(-width * 0.38, 0.58, center_z - depth * 0.08), Vector3(0.32, 0.36, 0.055), _window_material, upgrade_root)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(width * 0.34, 0.62, center_z - depth * 0.48), Vector3(width * 0.42, 1.0, depth * 0.76), _make_material_from_color(palette["wall"].lightened(0.04), 0.92), upgrade_root, 0.12)
		_add_box(Vector3(width * 0.34, 0.72, center_z - depth * 0.08), Vector3(0.36, 0.4, 0.055), _window_material, upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(0.0, height + 0.56, front_z + 0.16), Vector3(width * 0.76, 0.16, 0.12), accent_material, upgrade_root)
		for x in [-width * 0.32, -width * 0.12, width * 0.12, width * 0.32]:
			_add_box(Vector3(x, 0.3, front_z + 0.12), Vector3(0.2, 0.12, 0.06), trim_material, upgrade_root)


func _build_restaurant_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var variant_id := str(profile.get("variant_id", "classic_diner"))
	var definition: Dictionary = RESTAURANT_VARIANT_DEFINITIONS.get(variant_id, RESTAURANT_VARIANT_DEFINITIONS.get("classic_diner", {}))
	var style := str(definition.get("style", variant_id))
	match style:
		"fast_food_drive_through":
			_build_fast_food_drive_through_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"modern_cafe":
			_build_modern_cafe_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"family_restaurant":
			_build_family_restaurant_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"upscale_restaurant":
			_build_upscale_restaurant_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		"food_truck_court":
			_build_food_truck_court_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)
		_:
			_build_classic_diner_architecture(main_root, signage_root, upgrade_root, profile, palette, variant)


func create_restaurant_base(parent: Node, center: Vector3, size: Vector3, palette: Dictionary, roof_style: String, corner_radius: float = 0.14) -> void:
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	_add_soft_block(center, size, wall_material, parent, corner_radius)
	create_modular_roof(parent, Vector3(center.x, center.y + size.y * 0.5 + 0.16, center.z), Vector3(size.x + 0.2, 0.18, size.z + 0.2), roof_material, roof_style)


func create_modular_signage(parent: Node, position_3d: Vector3, size: Vector2, palette: Dictionary, kind: String) -> void:
	create_sign(parent, position_3d, size, palette["accent"], kind)


func create_drive_through_window(parent: Node, position_3d: Vector3, palette: Dictionary, side: float = 1.0) -> void:
	var frame_material := _make_material_from_color(palette["trim"], 0.82)
	var counter_material := _make_material_from_color(palette["accent"].darkened(0.08), 0.74)
	_add_box(position_3d, Vector3(0.05, 0.34, 0.32), frame_material, parent)
	_add_house_side_window_local(position_3d + Vector3(0.012 * side, 0.02, 0.0), Vector3(0.05, 0.25, 0.22), parent, side)
	_add_box(position_3d + Vector3(0.02 * side, -0.22, 0.0), Vector3(0.08, 0.06, 0.38), counter_material, parent)


func create_menu_board(parent: Node, position_3d: Vector3, palette: Dictionary, large: bool = false) -> void:
	var root := Node3D.new()
	root.position = position_3d
	parent.add_child(root)
	var post_material := _make_material("4b3a34", 0.86)
	var board_material := _make_material_from_color(palette["accent"].darkened(0.22), 0.72)
	var panel_material := _make_material("f7ecd7", 0.84)
	var board_size := Vector3(0.44 if large else 0.34, 0.32 if large else 0.24, 0.04)
	_add_local_cylinder(Vector3(0.0, 0.22, 0.0), 0.025, 0.025, 0.44, post_material, root)
	_add_box(Vector3(0.0, 0.5, 0.0), board_size, board_material, root)
	for line_y in [-0.06, 0.02, 0.1]:
		_add_box(Vector3(0.0, 0.5 + line_y, 0.025), Vector3(board_size.x * 0.66, 0.018, 0.012), panel_material, root)


func create_drive_through_lane(parent: Node, center: Vector3, size: Vector3, palette: Dictionary, lane_count: int = 1) -> void:
	var root := Node3D.new()
	root.name = "DriveThroughLane"
	root.position = center
	parent.add_child(root)
	var asphalt := _make_material("555f63", 0.98)
	var curb := _make_material("eee8dc", 0.92)
	var paint := _make_material("f7f2df", 0.92)
	var arrow := _make_material_from_color(palette["accent"].lightened(0.1), 0.82)
	var lane_width := size.x / float(maxi(1, lane_count))
	_add_shadow_disc_local(Vector3(0.0, 0.0, -0.02), Vector2(size.x * 1.05, size.z * 1.0), 0.08, root)
	_add_box(Vector3(0.0, 0.055, 0.0), Vector3(size.x, 0.035, size.z), asphalt, root)
	_add_box(Vector3(0.0, 0.083, size.z * 0.5), Vector3(size.x, 0.016, 0.05), curb, root)
	_add_box(Vector3(0.0, 0.083, -size.z * 0.5), Vector3(size.x, 0.016, 0.05), curb, root)
	for lane_index in range(lane_count + 1):
		var x := -size.x * 0.5 + float(lane_index) * lane_width
		_add_box(Vector3(x, 0.096, 0.0), Vector3(0.026, 0.01, size.z * 0.88), paint, root)
	for arrow_z in [size.z * 0.22, -size.z * 0.2]:
		_add_box(Vector3(0.0, 0.104, arrow_z), Vector3(size.x * 0.3, 0.01, 0.035), arrow, root)
		var left := _add_box(Vector3(size.x * 0.1, 0.105, arrow_z - 0.04), Vector3(size.x * 0.12, 0.01, 0.035), arrow, root)
		left.rotation_degrees.y = 28.0
		var right := _add_box(Vector3(-size.x * 0.1, 0.105, arrow_z - 0.04), Vector3(size.x * 0.12, 0.01, 0.035), arrow, root)
		right.rotation_degrees.y = -28.0
	create_menu_board(root, Vector3(-size.x * 0.36, 0.05, size.z * 0.24), palette, lane_count > 1)


func create_patio(parent: Node, center: Vector3, size: Vector3, palette: Dictionary, table_count: int = 2, fenced: bool = true) -> void:
	var root := Node3D.new()
	root.name = "RestaurantPatio"
	root.position = center
	parent.add_child(root)
	var patio_material := _make_material("d7c5ac", 0.92)
	var curb_material := _make_material("eee8dc", 0.92)
	var rail_material := _make_material_from_color(palette["trim"].darkened(0.1), 0.84)
	_add_box(Vector3(0.0, 0.052, 0.0), Vector3(size.x, 0.035, size.z), patio_material, root)
	_add_paved_stone_variation_local(root, Vector2(size.x * 0.86, size.z * 0.72), 0.07)
	if fenced:
		_add_box(Vector3(-size.x * 0.5, 0.16, 0.0), Vector3(0.045, 0.22, size.z), rail_material, root)
		_add_box(Vector3(size.x * 0.5, 0.16, 0.0), Vector3(0.045, 0.22, size.z), rail_material, root)
		_add_box(Vector3(0.0, 0.16, size.z * 0.5), Vector3(size.x, 0.22, 0.045), rail_material, root)
		_add_box(Vector3(0.0, 0.08, -size.z * 0.5), Vector3(size.x, 0.04, 0.05), curb_material, root)
	for index in range(table_count):
		var t := 0.5 if table_count <= 1 else float(index) / float(table_count - 1)
		var x := lerpf(-size.x * 0.28, size.x * 0.28, t)
		_add_outdoor_table_local(root, Vector3(x, 0.05, 0.0), palette["accent"])


func create_rooftop_seating(parent: Node, center: Vector3, size: Vector3, palette: Dictionary) -> void:
	var deck_material := _make_material("c4a784", 0.86)
	var rail_material := _make_material_from_color(palette["trim"].darkened(0.14), 0.82)
	_add_box(center, Vector3(size.x, 0.05, size.z), deck_material, parent)
	_add_box(center + Vector3(0.0, 0.12, size.z * 0.5), Vector3(size.x, 0.16, 0.04), rail_material, parent)
	_add_box(center + Vector3(-size.x * 0.5, 0.12, 0.0), Vector3(0.04, 0.16, size.z), rail_material, parent)
	_add_box(center + Vector3(size.x * 0.5, 0.12, 0.0), Vector3(0.04, 0.16, size.z), rail_material, parent)
	_add_outdoor_table_local(parent, center + Vector3(-size.x * 0.18, 0.06, 0.0), palette["accent"])
	_add_outdoor_table_local(parent, center + Vector3(size.x * 0.18, 0.06, 0.0), palette["accent"])


func create_food_truck_stall(parent: Node, position_3d: Vector3, rotation_y: float, palette: Dictionary, index: int) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	var body_color: Color = palette["accent"] if index % 2 == 0 else palette["roof"]
	var body_material := _make_material_from_color(body_color, 0.72)
	var trim_material := _make_material_from_color(palette["trim"], 0.84)
	var tire_material := _make_material("26252b", 0.98)
	_add_soft_block(Vector3(0.0, 0.2, 0.0), Vector3(0.64, 0.34, 0.34), body_material, root, 0.06)
	_add_box(Vector3(0.08, 0.25, 0.2), Vector3(0.28, 0.18, 0.045), _window_material, root)
	_add_box(Vector3(-0.16, 0.42, 0.2), Vector3(0.32, 0.08, 0.08), trim_material, root)
	_add_box(Vector3(0.0, 0.08, 0.0), Vector3(0.72, 0.035, 0.42), _make_material("5f676c", 0.92), root)
	for x in [-0.24, 0.24]:
		for z in [-0.14, 0.14]:
			var wheel := _add_local_cylinder(Vector3(x, 0.08, z), 0.045, 0.045, 0.035, tire_material, root)
			wheel.rotation_degrees.z = 90.0


func create_string_lights(parent: Node, left: Vector3, right: Vector3, palette: Dictionary, bulb_count: int = 5) -> void:
	var pole_material := _make_material("4b3a34", 0.86)
	var cable_material := _make_material("2f2c28", 0.9)
	var bulb_material := _make_material("fff0a8", 0.46, 0.0, true, "ffe19a", 0.5)
	_add_local_cylinder(left + Vector3(0.0, 0.48, 0.0), 0.025, 0.025, 0.96, pole_material, parent)
	_add_local_cylinder(right + Vector3(0.0, 0.48, 0.0), 0.025, 0.025, 0.96, pole_material, parent)
	var mid := (left + right) * 0.5 + Vector3(0.0, 0.96, 0.0)
	_add_box(mid, Vector3(abs(right.x - left.x) + 0.05, 0.018, 0.018), cable_material, parent)
	for index in range(bulb_count):
		var t := 0.5 if bulb_count <= 1 else float(index) / float(bulb_count - 1)
		var pos := left.lerp(right, t) + Vector3(0.0, 0.9 - 0.06 * sin(t * PI), 0.0)
		_add_local_sphere(pos, 0.045, 0.035, bulb_material, parent)


func _add_restaurant_window_wall(parent: Node, center: Vector3, size: Vector2, columns: int, glass_color: Color = Color("bfe6ff")) -> void:
	var frame_material := _make_material("f4ecda", 0.84)
	var glass_material := _make_transparent_material(glass_color, 0.2, 0.24)
	_add_box(center, Vector3(size.x + 0.12, size.y + 0.1, 0.055), frame_material, parent)
	var usable_width := size.x * 0.86
	for index in range(maxi(1, columns)):
		var t := 0.5 if columns <= 1 else float(index) / float(columns - 1)
		var x := center.x + lerpf(-usable_width * 0.5, usable_width * 0.5, t)
		_add_box(Vector3(x, center.y, center.z + 0.028), Vector3(usable_width / maxf(1.0, float(columns)) * 0.72, size.y * 0.82, 0.035), glass_material, parent)
		if index > 0:
			var mullion_x := center.x + lerpf(-usable_width * 0.5, usable_width * 0.5, t - 0.5 / float(columns - 1))
			_add_box(Vector3(mullion_x, center.y, center.z + 0.04), Vector3(0.03, size.y * 0.92, 0.035), _window_frame_material, parent)
	_add_box(center + Vector3(0.0, -size.y * 0.58, 0.04), Vector3(size.x + 0.22, 0.055, 0.075), _roof_fascia_material, parent)


func _add_vertical_window_stack(parent: Node, x: float, base_y: float, z: float, count: int, glass_color: Color = Color("ffe6cc")) -> void:
	for index in range(count):
		_add_restaurant_window_wall(parent, Vector3(x, base_y + float(index) * 0.28, z), Vector2(0.28, 0.2), 1, glass_color)


func _add_restaurant_pylon_sign(parent: Node, position_3d: Vector3, palette: Dictionary, kind: String, height: float = 1.4, wide: bool = false) -> void:
	var pole_material := _make_material("3d4144", 0.86)
	var cap_material := _make_material_from_color(palette["trim"], 0.82)
	var sign_width := 0.72 if wide else 0.46
	_add_local_cylinder(position_3d + Vector3(0.0, height * 0.5, 0.0), 0.03, 0.035, height, pole_material, parent)
	_add_box(position_3d + Vector3(0.0, height + 0.08, 0.0), Vector3(sign_width + 0.1, 0.36, 0.06), cap_material, parent)
	_add_signboard_local(position_3d + Vector3(0.0, height + 0.08, 0.045), Vector2(sign_width, 0.24), palette["accent"], kind, parent)


func _add_restaurant_arrow(parent: Node, position_3d: Vector3, material: Material, rotation_y: float = 0.0) -> void:
	var shaft := _add_box(position_3d, Vector3(0.36, 0.012, 0.045), material, parent)
	shaft.rotation_degrees.y = rotation_y
	var left := _add_box(position_3d + Vector3(0.13, 0.002, -0.055), Vector3(0.14, 0.012, 0.045), material, parent)
	left.rotation_degrees.y = rotation_y + 35.0
	var right := _add_box(position_3d + Vector3(0.13, 0.002, 0.055), Vector3(0.14, 0.012, 0.045), material, parent)
	right.rotation_degrees.y = rotation_y - 35.0


func _add_restaurant_parking_pad(parent: Node, center: Vector3, size: Vector3, spaces: int, palette: Dictionary, rotation_y: float = 0.0, handicap: bool = false) -> void:
	var root := Node3D.new()
	root.name = "ArchetypeParking"
	root.position = center
	root.rotation_degrees.y = rotation_y
	parent.add_child(root)
	var curb_material := _make_material("eee8dc", 0.92)
	var asphalt_material := _make_material("525b61", 0.98)
	var paint_material := _make_material("f7f2df", 0.92)
	var stop_material := _make_material_from_color(palette["accent"].lightened(0.12), 0.84)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 1.02, size.z * 0.95), 0.08, root)
	_add_box(Vector3(0.0, 0.052, 0.0), Vector3(size.x + 0.12, 0.03, size.z + 0.12), curb_material, root)
	_add_box(Vector3(0.0, 0.078, 0.0), Vector3(size.x, 0.035, size.z), asphalt_material, root)
	_add_parking_surface_polish_local(root, size, "small_lot")
	for line_index in range(spaces + 1):
		var t := 0.5 if spaces <= 0 else float(line_index) / float(spaces)
		var x := lerpf(-size.x * 0.42, size.x * 0.42, t)
		_add_box(Vector3(x, 0.108, -size.z * 0.08), Vector3(0.032, 0.012, size.z * 0.62), paint_material, root)
	for stop_index in range(spaces):
		var t := (float(stop_index) + 0.5) / float(maxi(1, spaces))
		var x := lerpf(-size.x * 0.42, size.x * 0.42, t)
		_add_box(Vector3(x, 0.124, -size.z * 0.32), Vector3(0.3, 0.032, 0.05), stop_material, root)
	if handicap:
		_add_box(Vector3(-size.x * 0.34, 0.116, 0.06), Vector3(0.42, 0.012, size.z * 0.42), _make_material("577da7", 0.82), root)
		_add_box(Vector3(-size.x * 0.34, 0.13, 0.06), Vector3(0.24, 0.012, 0.035), paint_material, root)
		_add_box(Vector3(-size.x * 0.34, 0.13, 0.06), Vector3(0.035, 0.012, 0.24), paint_material, root)


func _add_drive_through_loop(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var asphalt_material := _make_material("4f595e", 0.98)
	var curb_material := _make_material("eee8dc", 0.92)
	var paint_material := _make_material("f7f2df", 0.92)
	var lane_width := 0.62 if visual_tier < 3 else 0.86
	for segment in [
		{"center": Vector3(1.46, 0.07, -0.18), "size": Vector3(lane_width, 0.035, 2.78)},
		{"center": Vector3(0.46, 0.071, -1.48), "size": Vector3(2.2, 0.035, lane_width)},
		{"center": Vector3(0.28, 0.072, 0.92), "size": Vector3(1.6, 0.035, lane_width * 0.78)},
	]:
		var center: Vector3 = segment["center"]
		var size: Vector3 = segment["size"]
		_add_box(center, size + Vector3(0.12, 0.012, 0.12), curb_material, parent)
		_add_box(center + Vector3(0.0, 0.024, 0.0), size, asphalt_material, parent)
	_add_box(Vector3(1.46, 0.106, -0.18), Vector3(0.035, 0.012, 2.36), paint_material, parent)
	_add_box(Vector3(0.46, 0.106, -1.48), Vector3(1.78, 0.012, 0.035), paint_material, parent)
	_add_restaurant_arrow(parent, Vector3(1.46, 0.122, 0.54), paint_material, -90.0)
	_add_restaurant_arrow(parent, Vector3(0.54, 0.122, -1.48), paint_material, 180.0)
	create_menu_board(parent, Vector3(1.06, 0.04, 0.82), palette, visual_tier >= 3)
	_add_box(Vector3(1.12, 0.17, 0.5), Vector3(0.42, 0.2, 0.08), _make_material_from_color(palette["accent"], 0.78), parent)


func _add_umbrella_table(parent: Node, position_3d: Vector3, palette: Dictionary) -> void:
	_add_outdoor_table_local(parent, position_3d, palette["accent"])
	var pole_material := _make_material("f4ecda", 0.82)
	var canopy_material := _make_material_from_color(palette["accent"].lightened(0.06), 0.72)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.42, 0.0), 0.018, 0.018, 0.48, pole_material, parent)
	var canopy := _add_local_sphere(position_3d + Vector3(0.0, 0.68, 0.0), 0.22, 0.12, canopy_material, parent)
	canopy.scale.x = 1.18
	canopy.scale.z = 1.18


func _add_retro_diner_window_band(parent: Node, center: Vector3, width: float, trim_material: Material) -> void:
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.18, 0.22)
	_add_box(center, Vector3(width, 0.28, 0.055), trim_material, parent)
	_add_box(center + Vector3(0.0, 0.0, 0.035), Vector3(width * 0.9, 0.2, 0.035), glass_material, parent)
	for mullion_x in [-width * 0.36, -width * 0.18, 0.0, width * 0.18, width * 0.36]:
		_add_box(center + Vector3(mullion_x, 0.0, 0.062), Vector3(0.026, 0.25, 0.03), trim_material, parent)
	_add_box(center + Vector3(0.0, -0.18, 0.06), Vector3(width * 0.96, 0.04, 0.05), _roof_fascia_material, parent)


func _add_retro_diner_roofline(parent: Node, width: float, depth: float, height: float, center_z: float, palette: Dictionary) -> void:
	var roof_material := _make_material_from_color(palette["roof"], 0.72)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var chrome_material := _make_material("dfe7e6", 0.54)
	_add_soft_block(Vector3(0.0, height + 0.18, center_z), Vector3(width + 0.34, 0.16, depth + 0.3), roof_material, parent, 0.24)
	_add_box(Vector3(0.0, height + 0.32, center_z + depth * 0.03), Vector3(width * 0.86, 0.07, depth * 0.34), trim_material, parent)
	_add_box(Vector3(0.0, height + 0.04, center_z + depth * 0.5 + 0.02), Vector3(width + 0.48, 0.055, 0.06), chrome_material, parent)
	_add_box(Vector3(0.0, height + 0.04, center_z - depth * 0.5 - 0.02), Vector3(width + 0.32, 0.045, 0.045), chrome_material, parent)


func _add_retro_diner_front_canopy(parent: Node, width: float, front_z: float, palette: Dictionary) -> void:
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var canopy_width := width * 0.72
	_add_round_canopy(Vector3(0.24, 0.7, front_z + 0.18), Vector3(canopy_width, 0.065, 0.14), accent_material, parent)
	for stripe_x in [-canopy_width * 0.38, -canopy_width * 0.16, canopy_width * 0.08, canopy_width * 0.32]:
		_add_box(Vector3(0.24 + stripe_x, 0.735, front_z + 0.29), Vector3(canopy_width * 0.075, 0.032, 0.11), trim_material, parent)
	for post_x in [-canopy_width * 0.43, canopy_width * 0.43]:
		_add_local_cylinder(Vector3(0.24 + post_x, 0.36, front_z + 0.28), 0.024, 0.026, 0.62, trim_material, parent)


func _add_retro_diner_counter_side(parent: Node, x_side: float, center_z: float, depth: float, palette: Dictionary) -> void:
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.18, 0.22)
	_add_box(Vector3(x_side, 0.44, center_z), Vector3(0.052, 0.24, depth * 0.5), trim_material, parent)
	_add_box(Vector3(x_side, 0.44, center_z), Vector3(0.032, 0.18, depth * 0.38), glass_material, parent)
	_add_box(Vector3(x_side, 0.25, center_z), Vector3(0.07, 0.08, depth * 0.58), accent_material, parent)


func _add_retro_diner_rooftop_neon(parent: Node, width: float, height: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var neon_material := _make_material("fff0a8", 0.44, 0.0, true, "ffd86c", 0.65)
	var sign_width := width * (0.32 if visual_tier < 3 else 0.44)
	_add_box(Vector3(0.0, height + 0.48, front_z + 0.16), Vector3(sign_width + 0.18, 0.18, 0.08), trim_material, parent)
	_add_signboard_local(Vector3(0.0, height + 0.48, front_z + 0.21), Vector2(sign_width, 0.14), palette["accent"], "diner", parent)
	_add_box(Vector3(0.0, height + 0.64, front_z + 0.16), Vector3(sign_width * 0.74, 0.035, 0.045), neon_material, parent)


func _build_classic_diner_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 4.6)
	var depth := _commercial_float(profile, "depth", 0.78)
	var height := _commercial_float(profile, "height", 0.58)
	var center_z := _commercial_float(profile, "center_z", -0.48)
	var front_z := _commercial_float(profile, "front_z", 0.36)
	var visual_tier := int(profile.get("tier", 1))
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var trim_material := _make_material_from_color(palette["trim"], 0.78)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var chrome_material := _make_material("dfe7e6", 0.54)
	var rear_material := _make_material_from_color(palette["wall"].darkened(0.05), 0.9)
	var shadow_width := width + 0.42
	_add_shadow_disc_local(Vector3(0.0, 0.0, center_z + 0.02), Vector2(shadow_width, depth * 1.28), 0.18, main_root)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.06, center_z), Vector3(width, height, depth), wall_material, main_root, 0.28)
	_add_soft_block(Vector3(-width * 0.42, height * 0.5 + 0.06, center_z), Vector3(width * 0.18, height * 0.94, depth * 0.96), rear_material, main_root, 0.22)
	_add_soft_block(Vector3(width * 0.42, height * 0.5 + 0.06, center_z), Vector3(width * 0.18, height * 0.94, depth * 0.96), rear_material, main_root, 0.22)
	_add_box(Vector3(0.0, 0.22, center_z + depth * 0.49), Vector3(width * 0.96, 0.09, 0.055), accent_material, main_root)
	_add_box(Vector3(0.0, 0.16, center_z - depth * 0.49), Vector3(width * 0.9, 0.06, 0.045), chrome_material, main_root)
	_add_retro_diner_roofline(main_root, width, depth, height, center_z, palette)
	_add_retro_diner_window_band(main_root, Vector3(0.32, 0.45, front_z + 0.08), width * 0.68, trim_material)
	_add_retro_diner_counter_side(main_root, -width * 0.52, center_z, depth, palette)
	_add_retro_diner_counter_side(main_root, width * 0.52, center_z, depth, palette)
	_add_restaurant_front_door_local(Vector3(-width * 0.38, 0.0, front_z + 0.11), main_root, palette["accent"])
	_add_retro_diner_front_canopy(main_root, width, front_z, palette)
	_add_retro_diner_rooftop_neon(signage_root, width, height, front_z, palette, visual_tier)
	if _commercial_bool(profile, "service_loop"):
		create_drive_through_window(main_root, Vector3(width * 0.52, 0.38, center_z - depth * 0.06), palette, 1.0)
		_add_box(Vector3(width * 0.48, 0.2, center_z - depth * 0.48), Vector3(0.42, 0.18, 0.18), accent_material, upgrade_root)
		_add_box(Vector3(width * 0.48, 0.34, center_z - depth * 0.48), Vector3(0.3, 0.035, 0.2), chrome_material, upgrade_root)
	if _commercial_bool(profile, "signature"):
		for vent_x in [-width * 0.28, width * 0.18]:
			_add_local_cylinder(Vector3(vent_x, height + 0.42, center_z - depth * 0.22), 0.065, 0.065, 0.14, accent_material, upgrade_root)
			_add_box(Vector3(vent_x, height + 0.5, center_z - depth * 0.22), Vector3(0.16, 0.035, 0.16), trim_material, upgrade_root)
		_add_box(Vector3(-width * 0.02, height + 0.42, center_z - depth * 0.34), Vector3(width * 0.46, 0.055, 0.16), chrome_material, upgrade_root)
	if bool(profile.get("corner_patio", false)):
		create_patio(upgrade_root, Vector3(width * 0.25, 0.04, front_z + 0.44), Vector3(width * 0.34, 0.05, 0.46), palette, 1, true)
		_add_box(Vector3(width * 0.02, 0.14, front_z + 0.64), Vector3(width * 0.7, 0.05, 0.08), chrome_material, upgrade_root)
	_add_front_lanterns(main_root, front_z + 0.16, width * 0.86)


func _build_fast_food_drive_through_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 1.78)
	var depth := _commercial_float(profile, "depth", 1.58)
	var height := _commercial_float(profile, "height", 1.18)
	var center_z := _commercial_float(profile, "center_z", -0.96)
	var front_z := _commercial_float(profile, "front_z", 0.12)
	var visual_tier := int(profile.get("tier", 1))
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.16, 0.2)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	_add_shadow_disc_local(Vector3(0.1, 0.0, center_z), Vector2(width * 1.34, depth * 1.18), 0.17, main_root)
	_add_soft_block(Vector3(0.22, height * 0.5 + 0.06, center_z), Vector3(width * 0.72, height, depth * 0.78), wall_material, main_root, 0.06)
	_add_soft_block(Vector3(-width * 0.28, height * 0.38 + 0.05, center_z + depth * 0.16), Vector3(width * 0.58, height * 0.62, depth * 0.5), glass_material, main_root, 0.04)
	_add_soft_block(Vector3(width * 0.48, height * 0.48 + 0.05, center_z - depth * 0.26), Vector3(width * 0.38, height * 0.82, depth * 0.46), _make_material_from_color(palette["wall"].lightened(0.07), 0.9), main_root, 0.05)
	_add_fast_food_roof_canopy(main_root, width, depth, height, center_z, front_z, palette, visual_tier)
	_add_fast_food_frontage(main_root, width, height, front_z, palette)
	_add_fast_food_pickup_side(main_root, width * 0.72, center_z, depth, palette)
	create_modular_signage(signage_root, Vector3(-0.18, height + 0.58, front_z + 0.18), Vector2(width * 0.48, 0.18), palette, "fast_food")
	if bool(profile.get("tower", false)):
		_add_fast_food_sign_tower(main_root, signage_root, width, height, center_z, front_z, palette, visual_tier)
	if _commercial_int(profile, "drive_lanes", 1) >= 2:
		_add_box(Vector3(0.18, height + 0.48, front_z + 0.04), Vector3(width * 0.62, 0.1, 0.14), accent_material, upgrade_root)
		_add_box(Vector3(width * 0.62, 0.17, center_z + depth * 0.38), Vector3(0.62, 0.08, 0.18), _make_material("555f63", 0.96), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_lantern_glow_local(Vector3(-width * 0.48, 0.88, front_z + 0.12), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.46, 0.92, front_z + 0.12), upgrade_root)
		_add_box(Vector3(0.18, height + 0.56, center_z - depth * 0.34), Vector3(width * 0.46, 0.08, 0.16), accent_material, upgrade_root)


func _build_modern_cafe_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 1.72)
	var depth := _commercial_float(profile, "depth", 1.3)
	var height := _commercial_float(profile, "height", 0.94)
	var center_z := _commercial_float(profile, "center_z", -0.76)
	var front_z := _commercial_float(profile, "front_z", 0.2)
	var visual_tier := int(profile.get("tier", 1))
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_shadow_disc_local(Vector3(-0.02, 0.0, center_z + 0.04), Vector2(width * 1.28, depth * 1.12), 0.16, main_root)
	_add_modern_cafe_glass_pavilion(main_root, width, depth, height, center_z, front_z, palette)
	_add_modern_cafe_roof(main_root, width, depth, height, center_z, front_z, palette, visual_tier)
	_add_modern_cafe_sign(signage_root, width, height, front_z, palette)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(-width * 0.56, 0.82, center_z - depth * 0.22), Vector3(0.12, 0.62, 0.54), accent_material, upgrade_root)
		create_planters(upgrade_root, [Vector3(width * 0.48, 0.08, front_z + 0.22), Vector3(-width * 0.58, 0.08, front_z + 0.18)], palette["accent"])
	if bool(profile.get("rooftop", false)):
		create_rooftop_seating(upgrade_root, Vector3(-0.08, height + 0.36, center_z), Vector3(width * 0.68, 0.05, depth * 0.5), palette)


func _build_family_restaurant_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 3.86)
	var depth := _commercial_float(profile, "depth", 1.92)
	var height := _commercial_float(profile, "height", 0.96)
	var center_z := _commercial_float(profile, "center_z", -0.9)
	var front_z := _commercial_float(profile, "front_z", 0.32)
	var visual_tier := int(profile.get("tier", 1))
	_add_shadow_disc_local(Vector3(0.0, 0.0, center_z + 0.02), Vector2(width * 1.02, depth * 1.04), 0.18, main_root)
	_add_family_restaurant_main_hall(main_root, width, depth, height, center_z, palette, visual_tier)
	_add_family_restaurant_roofline(main_root, width, depth, height, center_z, front_z, palette, visual_tier)
	_add_family_restaurant_frontage(main_root, signage_root, width, height, front_z, palette, visual_tier)
	_add_family_restaurant_upgrade_massing(upgrade_root, width, depth, height, center_z, front_z, palette, profile)
	if _commercial_bool(profile, "signature"):
		_add_front_lanterns(upgrade_root, front_z + 0.18, width * 0.92)


func _build_upscale_restaurant_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 3.0)
	var depth := _commercial_float(profile, "depth", 1.9)
	var height := _commercial_float(profile, "height", 1.2)
	var center_z := _commercial_float(profile, "center_z", -0.78)
	var front_z := _commercial_float(profile, "front_z", 0.38)
	var roof_material := _make_material_from_color(palette["roof"], 0.72)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.46)
	_add_soft_block(Vector3(-width * 0.22, height * 0.5 + 0.05, center_z), Vector3(width * 0.54, height, depth * 0.88), _make_material_from_color(palette["wall"], 0.9), main_root, 0.06)
	_add_soft_block(Vector3(width * 0.24, height * 0.58 + 0.05, center_z - depth * 0.18), Vector3(width * 0.4, height * 1.14, depth * 0.74), _make_transparent_material(Color("ffe6cc"), 0.16, 0.2), main_root, 0.04)
	_add_soft_block(Vector3(-width * 0.46, 0.56, center_z + depth * 0.18), Vector3(width * 0.22, height * 0.7, depth * 0.54), _make_material_from_color(palette["wall"].darkened(0.06), 0.9), main_root, 0.08)
	create_modular_roof(main_root, Vector3(-width * 0.22, height + 0.28, center_z), Vector3(width * 0.64, 0.14, depth + 0.2), roof_material, "flat")
	create_modular_roof(main_root, Vector3(width * 0.24, height * 1.16 + 0.18, center_z - depth * 0.18), Vector3(width * 0.48, 0.12, depth * 0.86), roof_material, "flat")
	create_modular_roof(main_root, Vector3(-width * 0.46, 0.98, center_z + depth * 0.18), Vector3(width * 0.28, 0.1, depth * 0.6), roof_material, "flat")
	_add_restaurant_window_wall(main_root, Vector3(-width * 0.14, 0.66, front_z + 0.1), Vector2(width * 0.42, 0.46), 2, Color("ffe6cc"))
	_add_vertical_window_stack(main_root, width * 0.28, 0.5, front_z + 0.02, 3, Color("ffe6cc"))
	_add_restaurant_front_door_local(Vector3(-width * 0.34, 0.0, front_z + 0.14), main_root, palette["accent"])
	_add_box(Vector3(-width * 0.26, 0.96, front_z + 0.2), Vector3(width * 0.34, 0.08, 0.2), accent_material, main_root)
	create_modular_signage(signage_root, Vector3(0.0, height + 0.58, front_z + 0.18), Vector2(width * 0.42, 0.2), palette, "fine_dining")
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(-width * 0.44, 0.62, center_z - depth * 0.5), Vector3(width * 0.28, 0.98, depth * 0.58), _make_material_from_color(palette["wall"].darkened(0.06), 0.9), upgrade_root, 0.08)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(width * 0.44, 0.68, center_z - depth * 0.48), Vector3(width * 0.3, 1.08, depth * 0.62), _make_material_from_color(palette["wall"].lightened(0.06), 0.9), upgrade_root, 0.08)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.5, center_z - 0.1), Vector3(width * 0.68, 0.78, depth * 0.58), _make_material_from_color(palette["wall"].lightened(0.08), 0.9), upgrade_root, 0.09)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 1.04, center_z - 0.1), Vector3(width * 0.76, 0.12, depth * 0.66), roof_material, "flat")
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(0.0, height + 0.66, front_z + 0.18), Vector3(width * 0.6, 0.08, 0.1), accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.46, 0.96, front_z + 0.14), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.46, 0.96, front_z + 0.14), upgrade_root)


func _build_food_truck_court_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var width := _commercial_float(profile, "width", 3.0)
	var depth := _commercial_float(profile, "depth", 1.7)
	var center_z := _commercial_float(profile, "center_z", -0.68)
	var front_z := _commercial_float(profile, "front_z", 0.42)
	var vendor_count := _commercial_int(profile, "vendor_count", 2)
	var plaza_material := _make_material("d7c5ac", 0.92)
	var curb_material := _make_material("eee8dc", 0.92)
	_add_box(Vector3(0.0, 0.05, center_z), Vector3(width, 0.04, depth), plaza_material, main_root)
	_add_box(Vector3(0.0, 0.08, center_z + depth * 0.5), Vector3(width, 0.035, 0.06), curb_material, main_root)
	_add_box(Vector3(-width * 0.5, 0.08, center_z), Vector3(0.06, 0.035, depth), curb_material, main_root)
	_add_box(Vector3(width * 0.5, 0.08, center_z), Vector3(0.06, 0.035, depth), curb_material, main_root)
	_add_box(Vector3(0.0, 0.12, front_z + 0.1), Vector3(width * 0.82, 0.05, 0.18), _make_material_from_color(palette["accent"].darkened(0.12), 0.82), main_root)
	_add_restaurant_pylon_sign(signage_root, Vector3(0.0, 0.0, front_z + 0.2), palette, "food_court", 0.72, true)
	var vendor_positions := [
		Vector3(-width * 0.28, 0.06, center_z - depth * 0.28),
		Vector3(width * 0.28, 0.06, center_z - depth * 0.18),
		Vector3(-width * 0.32, 0.06, center_z + depth * 0.14),
		Vector3(width * 0.32, 0.06, center_z + depth * 0.18),
	]
	for index in range(mini(vendor_count, vendor_positions.size())):
		create_food_truck_stall(main_root, vendor_positions[index], deg_to_rad(90.0 if index % 2 == 0 else -90.0), palette, index)
	for table_pos in [Vector3(0.0, 0.06, center_z), Vector3(-width * 0.16, 0.06, center_z + depth * 0.24), Vector3(width * 0.16, 0.06, center_z + depth * 0.22)]:
		_add_outdoor_table_local(main_root, table_pos, palette["accent"])
	create_string_lights(main_root, Vector3(-width * 0.46, 0.0, center_z + depth * 0.44), Vector3(width * 0.46, 0.0, center_z + depth * 0.44), palette, 5)
	if vendor_count >= 3:
		create_string_lights(upgrade_root, Vector3(-width * 0.46, 0.0, center_z - depth * 0.1), Vector3(width * 0.46, 0.0, center_z - depth * 0.1), palette, 6)
	if _commercial_bool(profile, "signature"):
		create_landscape_island(upgrade_root, Vector3(0.0, 0.11, center_z - depth * 0.48), Vector3(width * 0.6, 0.08, 0.18), palette["accent"], 5)


func _build_corner_store_architecture(main_root: Node, signage_root: Node, upgrade_root: Node, profile: Dictionary, palette: Dictionary, variant: int) -> void:
	var variant_id := str(profile.get("variant_id", "small_quick_mart"))
	var width := _commercial_float(profile, "width", 2.4)
	var depth := _commercial_float(profile, "depth", 1.5)
	var height := _commercial_float(profile, "height", 0.96)
	var center_z := _commercial_float(profile, "center_z", -0.58)
	var front_z := _commercial_float(profile, "front_z", 0.24)
	var roof_style := str(profile.get("roof", "flat"))
	var awning_style := str(profile.get("awning", "bold"))
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width, height, depth), wall_material, main_root, 0.16)
	create_modular_roof(main_root, Vector3(0.0, height + 0.2, center_z), Vector3(width + 0.2, 0.18, depth + 0.2), roof_material, roof_style)
	create_trim_layer(main_root, width, height, front_z, palette, "")
	create_glass_frontage(main_root, width * (0.76 if _commercial_bool(profile, "glass") else 0.62), 0.45, front_z + 0.04, 3)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.08), main_root, palette["accent"])
	create_awning(main_root, Vector3(0.0, 0.68, front_z + 0.16), width * 0.92, accent_material, trim_material, awning_style)
	create_sign(signage_root, Vector3(0.0, height + 0.34, front_z + 0.16), Vector2(width * 0.58, 0.22), palette["accent"], _variant_sign_kind(BUILD_TOOL_CORNER_STORE, variant_id))
	if variant_id == "convenience_store_no_pumps":
		_add_box(Vector3(0.0, 0.9, front_z + 0.32), Vector3(width * 0.96, 0.12, 0.34), accent_material, main_root)
		for post_x in [-width * 0.42, width * 0.42]:
			_add_local_cylinder(Vector3(post_x, 0.5, front_z + 0.34), 0.035, 0.035, 0.78, trim_material, main_root)
	if variant_id == "urban_corner_shop":
		_add_box(Vector3(-width * 0.48, 0.72, front_z - 0.1), Vector3(0.08, 0.66, 0.42), accent_material, main_root)
	if variant_id == "modern_mini_mart":
		_add_box(Vector3(0.0, height + 0.5, front_z + 0.18), Vector3(width * 0.68, 0.1, 0.08), accent_material, main_root)
	if _commercial_int(profile, "wing", 0) >= 1:
		_add_soft_block(Vector3(width * 0.36, 0.52, center_z - depth * 0.42), Vector3(width * 0.34, 0.84, depth * 0.66), _make_material_from_color(palette["trim"].darkened(0.02), 0.9), upgrade_root, 0.1)
		_add_box(Vector3(width * 0.36, 0.56, center_z - depth * 0.1), Vector3(0.26, 0.34, 0.055), _window_material, upgrade_root)
	if _commercial_int(profile, "wing", 0) >= 2:
		_add_soft_block(Vector3(-width * 0.38, 0.66, center_z - depth * 0.26), Vector3(width * 0.34, 1.08, depth * 0.86), _make_material_from_color(palette["wall"].lightened(0.05), 0.92), upgrade_root, 0.1)
		_add_box(Vector3(-width * 0.38, 0.76, front_z - 0.12), Vector3(0.26, 0.36, 0.055), _window_material, upgrade_root)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.46, center_z - 0.06), Vector3(width * 0.86, 0.76, depth * 0.72), _make_material_from_color(palette["wall"].lightened(0.06), 0.92), upgrade_root, 0.1)
		create_modular_roof(upgrade_root, Vector3(0.0, height + 0.96, center_z - 0.06), Vector3(width * 0.96, 0.14, depth * 0.82), roof_material, "flat")
		for window_x in [-width * 0.24, 0.0, width * 0.24]:
			_add_window_band_local(Vector3(window_x, height + 0.4, front_z), Vector3(0.22, 0.26, 0.05), upgrade_root)
	if _commercial_bool(profile, "signature"):
		_add_box(Vector3(0.0, height + 0.58, front_z + 0.16), Vector3(width * 0.78, 0.14, 0.1), accent_material, upgrade_root)
		_add_lantern_glow_local(Vector3(-width * 0.46, 0.86, front_z + 0.14), upgrade_root)
		_add_lantern_glow_local(Vector3(width * 0.46, 0.86, front_z + 0.14), upgrade_root)


func _add_commercial_dynamic_lot_details(parent: Node, tool: String, profile: Dictionary, palette: Dictionary, tier: int, variant: int, variant_id: String = "") -> void:
	var preset := _property_visual_preset_for_variant(tool, variant, variant_id)
	var parking_position: Vector3 = preset.get("parking_position", Vector3(0.0, 0.0, LOT_PARKING_Z))
	var parking_size: Vector3 = preset.get("parking_size", Vector3(3.0, 1.0, PARKING_DEPTH))
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	if tool == BUILD_TOOL_RESTAURANT:
		_add_restaurant_variant_lot_details(parent, parking_position, parking_size, palette, tier, variant_id)
		return
	if tier >= 2:
		for x in [-parking_size.x * 0.28, 0.0, parking_size.x * 0.28]:
			_add_box(parking_position + Vector3(x, 0.13, -parking_size.z * 0.32), Vector3(0.32, 0.035, 0.055), _make_material_from_color(accent.lightened(0.12), 0.84), parent)
	if tier >= 3:
		create_landscape_island(parent, parking_position + Vector3(-parking_size.x * 0.44, 0.1, -parking_size.z * 0.14), Vector3(0.22, 0.08, parking_size.z * 0.44), accent, 3)
		create_landscape_island(parent, parking_position + Vector3(parking_size.x * 0.44, 0.1, -parking_size.z * 0.14), Vector3(0.22, 0.08, parking_size.z * 0.44), trim, 3)
	if tier >= 4:
		create_streetlamp(parent, parking_position + Vector3(-parking_size.x * 0.5 + 0.22, 0.0, parking_size.z * 0.42))
		create_streetlamp(parent, parking_position + Vector3(parking_size.x * 0.5 - 0.22, 0.0, parking_size.z * 0.42))
	if tier >= 5:
		_add_small_parked_car_local(parent, parking_position + Vector3(parking_size.x * 0.22, 0.04, -parking_size.z * 0.05), 0.0, accent)
	match tool:
		BUILD_TOOL_FIRE:
			_add_fire_variant_lot_details(parent, parking_position, parking_size, palette, tier, variant_id)
			if tier >= 2:
				create_bollards(parent, parking_position.z + parking_size.z * 0.5 + 0.02, parking_size.x * 0.78, 5 if tier < 4 else 7, accent)
			if tier >= 4:
				_add_fire_truck_local(parking_position + Vector3(parking_size.x * 0.26, 0.03, -parking_size.z * 0.12), 0.0, parent)
		BUILD_TOOL_BANK:
			_add_bank_variant_lot_details(parent, parking_position, parking_size, palette, tier, variant_id)
			if tier >= 2:
				_add_atm_local(parent, parking_position + Vector3(-parking_size.x * 0.44, 0.04, parking_size.z * 0.44), palette["roof"])
			if tier >= 4:
				_add_box(parking_position + Vector3(0.0, 0.13, parking_size.z * 0.42), Vector3(parking_size.x * 0.6, 0.045, 0.18), _make_material("d8d2c8", 0.9), parent)
		BUILD_TOOL_GROCERY:
			_add_grocery_variant_lot_details(parent, parking_position, parking_size, palette, tier, variant_id)
			if tier >= 2:
				create_cart_rack(parent, parking_position + Vector3(parking_size.x * 0.42, 0.08, parking_size.z * 0.32), deg_to_rad(90.0))
			if tier >= 4:
				_add_box(parking_position + Vector3(-parking_size.x * 0.42, 0.16, parking_size.z * 0.38), Vector3(0.72, 0.12, 0.24), _make_material("9f7b56", 0.82), parent)
		BUILD_TOOL_CORNER_STORE:
			_add_corner_store_variant_lot_details(parent, parking_position, parking_size, palette, tier, variant_id)
			if tier >= 2:
				_add_ice_box_local(parent, parking_position + Vector3(parking_size.x * 0.42, 0.04, parking_size.z * 0.36), palette["roof"])
			if tier >= 3:
				_add_trash_can_local(parent, parking_position + Vector3(-parking_size.x * 0.44, 0.04, parking_size.z * 0.36), palette["roof"])


func _add_fire_variant_lot_details(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, tier: int, variant_id: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	match variant_id:
		"modern_civic_station":
			_add_box(parking_position + Vector3(-parking_size.x * 0.36, 0.13, parking_size.z * 0.36), Vector3(0.38, 0.035, 0.08), _make_material_from_color(trim, 0.84), parent)
			if tier >= 3:
				create_landscape_island(parent, parking_position + Vector3(parking_size.x * 0.36, 0.12, parking_size.z * 0.18), Vector3(0.34, 0.08, 0.2), accent, 2)
		"volunteer_station":
			_add_box(parking_position + Vector3(-parking_size.x * 0.4, 0.14, parking_size.z * 0.42), Vector3(0.24, 0.08, 0.12), _make_material_from_color(accent, 0.78), parent)
			if tier >= 3:
				_add_hydrant_local(parking_position + Vector3(parking_size.x * 0.42, 0.04, parking_size.z * 0.36), parent)
		"industrial_emergency_station":
			for x in [-parking_size.x * 0.28, parking_size.x * 0.28]:
				_add_box(parking_position + Vector3(x, 0.14, -parking_size.z * 0.42), Vector3(0.34, 0.05, 0.08), _make_material_from_color(trim.darkened(0.16), 0.86), parent)
			if tier >= 4:
				_add_box(parking_position + Vector3(0.0, 0.15, parking_size.z * 0.4), Vector3(parking_size.x * 0.54, 0.06, 0.1), _make_material_from_color(accent.darkened(0.1), 0.82), parent)
		_:
			if tier >= 3:
				_add_box(parking_position + Vector3(0.0, 0.13, parking_size.z * 0.44), Vector3(parking_size.x * 0.42, 0.04, 0.09), _make_material_from_color(accent, 0.82), parent)


func _add_grocery_variant_lot_details(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, tier: int, variant_id: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	match variant_id:
		"local_market":
			_add_box(parking_position + Vector3(-parking_size.x * 0.38, 0.15, parking_size.z * 0.38), Vector3(0.46, 0.16, 0.2), _make_material("9f7b56", 0.82), parent)
			if tier >= 3:
				_add_crate_stack_local(parking_position + Vector3(parking_size.x * 0.34, 0.12, parking_size.z * 0.4), accent, parent)
		"green_supermarket":
			if tier >= 2:
				create_landscape_island(parent, parking_position + Vector3(0.0, 0.12, parking_size.z * 0.36), Vector3(0.48, 0.08, 0.2), accent, 3)
		"warehouse_grocery":
			_add_box(parking_position + Vector3(parking_size.x * 0.42, 0.13, -parking_size.z * 0.34), Vector3(0.34, 0.05, 0.08), _make_material_from_color(trim.darkened(0.2), 0.86), parent)
			if tier >= 3:
				_add_small_parked_car_local(parent, parking_position + Vector3(-parking_size.x * 0.24, 0.04, -parking_size.z * 0.16), 0.0, accent)
		"organic_market":
			for x in [-parking_size.x * 0.32, parking_size.x * 0.32]:
				_add_box(parking_position + Vector3(x, 0.15, parking_size.z * 0.42), Vector3(0.34, 0.14, 0.18), _make_material("9f7b56", 0.82), parent)
			if tier >= 3:
				create_landscape_island(parent, parking_position + Vector3(0.0, 0.12, -parking_size.z * 0.32), Vector3(parking_size.x * 0.46, 0.08, 0.18), accent, 4)


func create_restaurant_parking_layout(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, layout: String, spaces: int = 3) -> void:
	var paint := _make_material("f7f2df", 0.92)
	var accent_paint := _make_material_from_color(palette["accent"].lightened(0.12), 0.84)
	var curb := _make_material("eee8dc", 0.92)
	match layout:
		"diner_front":
			_add_box(parking_position + Vector3(0.0, 0.125, parking_size.z * 0.42), Vector3(parking_size.x * 0.72, 0.035, 0.08), accent_paint, parent)
			for x in [-parking_size.x * 0.3, -parking_size.x * 0.1, parking_size.x * 0.1, parking_size.x * 0.3]:
				_add_box(parking_position + Vector3(x, 0.13, -parking_size.z * 0.3), Vector3(0.28, 0.034, 0.052), accent_paint, parent)
		"fast_food_front":
			_add_box(parking_position + Vector3(0.0, 0.126, parking_size.z * 0.36), Vector3(parking_size.x * 0.56, 0.04, 0.09), accent_paint, parent)
			_add_box(parking_position + Vector3(parking_size.x * 0.44, 0.12, -parking_size.z * 0.08), Vector3(0.16, 0.1, parking_size.z * 0.46), curb, parent)
		"family_parking":
			for x in [-parking_size.x * 0.36, parking_size.x * 0.36]:
				create_landscape_island(parent, parking_position + Vector3(x, 0.12, parking_size.z * 0.28), Vector3(0.28, 0.08, 0.22), palette["accent"], 3)
			_add_box(parking_position + Vector3(0.0, 0.124, parking_size.z * 0.44), Vector3(parking_size.x * 0.58, 0.04, 0.08), paint, parent)
		_:
			if spaces > 0:
				for index in range(spaces):
					var t := (float(index) + 0.5) / float(spaces)
					var x := lerpf(-parking_size.x * 0.36, parking_size.x * 0.36, t)
					_add_box(parking_position + Vector3(x, 0.126, -parking_size.z * 0.3), Vector3(0.28, 0.034, 0.052), accent_paint, parent)


func _add_retro_diner_front_lot(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var asphalt := _make_material("51585d", 0.98)
	var curb := _make_material("eee8dc", 0.92)
	var paint := _make_material("f7f2df", 0.92)
	var accent_paint := _make_material_from_color(palette["accent"].lightened(0.08), 0.82)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 1.0), Vector2(5.26, 0.9), 0.08, parent)
	_add_box(Vector3(0.0, 0.052, 0.98), Vector3(5.16, 0.035, 0.82), curb, parent)
	_add_box(Vector3(0.0, 0.078, 0.98), Vector3(4.96, 0.035, 0.66), asphalt, parent)
	_add_parking_surface_polish_local(parent, Vector3(4.96, 1.0, 0.66), "diner_front")
	for index in range(6):
		var x := lerpf(-2.05, 2.05, float(index) / 5.0)
		var stall_line := _add_box(Vector3(x, 0.112, 0.98), Vector3(0.028, 0.012, 0.48), paint, parent)
		stall_line.rotation_degrees.y = -9.0
	for stop_index in range(5):
		var x := lerpf(-1.62, 1.62, float(stop_index) / 4.0)
		_add_box(Vector3(x, 0.128, 0.7), Vector3(0.3, 0.035, 0.052), accent_paint, parent)
	_add_box(Vector3(0.0, 0.13, 1.4), Vector3(4.72, 0.045, 0.08), accent_paint, parent)
	if visual_tier >= 3:
		_add_small_parked_car_local(parent, Vector3(-1.34, 0.04, 0.94), 0.0, palette["accent"])
	if visual_tier >= 4:
		_add_small_parked_car_local(parent, Vector3(0.78, 0.04, 0.92), 0.0, palette["trim"])


func _add_retro_diner_service_lane(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var asphalt := _make_material("4e575c", 0.98)
	var curb := _make_material("eee8dc", 0.92)
	var paint := _make_material_from_color(palette["accent"].lightened(0.08), 0.82)
	_add_box(Vector3(2.32, 0.06, -0.28), Vector3(0.72, 0.034, 1.86), curb, parent)
	_add_box(Vector3(2.32, 0.088, -0.28), Vector3(0.58, 0.034, 1.72), asphalt, parent)
	_add_box(Vector3(2.32, 0.118, 0.38), Vector3(0.32, 0.012, 0.04), paint, parent)
	_add_restaurant_arrow(parent, Vector3(2.32, 0.128, -0.1), paint, -90.0)
	_add_box(Vector3(2.04, 0.16, 0.48), Vector3(0.36, 0.18, 0.08), _make_material_from_color(palette["accent"], 0.72), parent)
	if visual_tier >= 4:
		_add_box(Vector3(2.32, 0.13, -1.1), Vector3(0.44, 0.04, 0.08), _make_material_from_color(palette["trim"], 0.82), parent)


func _add_fast_food_roof_canopy(parent: Node, width: float, depth: float, height: float, center_z: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var roof_material := _make_material_from_color(palette["roof"], 0.72)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	_add_box(Vector3(0.18, height + 0.18, center_z), Vector3(width * 0.92, 0.16, depth * 0.88), roof_material, parent)
	_add_box(Vector3(-0.18, height + 0.31, front_z + 0.02), Vector3(width * 1.18, 0.12, 0.2), accent_material, parent)
	_add_box(Vector3(-0.18, height + 0.39, front_z + 0.02), Vector3(width * 0.72, 0.045, 0.22), trim_material, parent)
	if visual_tier >= 3:
		_add_box(Vector3(0.38, height + 0.44, center_z - depth * 0.26), Vector3(width * 0.46, 0.1, depth * 0.44), accent_material, parent)


func _add_fast_food_frontage(parent: Node, width: float, height: float, front_z: float, palette: Dictionary) -> void:
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.5)
	_add_restaurant_window_wall(parent, Vector3(-width * 0.22, 0.58, front_z + 0.06), Vector2(width * 0.5, 0.34), 2, Color("bfe6ff"))
	_add_restaurant_front_door_local(Vector3(width * 0.18, 0.0, front_z + 0.1), parent, palette["accent"])
	_add_box(Vector3(-width * 0.08, 0.87, front_z + 0.16), Vector3(width * 0.82, 0.09, 0.12), accent_material, parent)
	_add_box(Vector3(-width * 0.48, 0.36, front_z + 0.14), Vector3(0.08, 0.62, 0.08), trim_material, parent)


func _add_fast_food_sign_tower(main_root: Node, signage_root: Node, width: float, height: float, center_z: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var accent_material := _make_material_from_color(palette["accent"], 0.46)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var tower_height := 1.56 + float(visual_tier) * 0.16
	var tower_x := -width * 0.68
	var tower_z := center_z - 0.04
	_add_soft_block(Vector3(tower_x, tower_height * 0.5 + 0.08, tower_z), Vector3(0.34, tower_height, 0.34), accent_material, main_root, 0.05)
	_add_box(Vector3(tower_x, tower_height + 0.18, tower_z), Vector3(0.58, 0.18, 0.58), trim_material, main_root)
	_add_signboard_local(Vector3(tower_x, tower_height + 0.2, front_z + 0.1), Vector2(0.44, 0.22), palette["accent"], "fast_food", signage_root)
	if visual_tier >= 4:
		_add_box(Vector3(tower_x, tower_height + 0.42, tower_z), Vector3(0.28, 0.09, 0.28), _make_material("fff0a8", 0.44, 0.0, true, "ffd86c", 0.55), main_root)


func _add_fast_food_pickup_side(parent: Node, x_side: float, center_z: float, depth: float, palette: Dictionary) -> void:
	create_drive_through_window(parent, Vector3(x_side, 0.56, center_z + depth * 0.12), palette, 1.0)
	_add_box(Vector3(x_side + 0.02, 0.24, center_z + depth * 0.12), Vector3(0.08, 0.08, 0.48), _make_material_from_color(palette["accent"], 0.72), parent)
	_add_box(Vector3(x_side + 0.02, 0.78, center_z + depth * 0.12), Vector3(0.08, 0.08, 0.56), _make_material_from_color(palette["trim"], 0.82), parent)


func _add_fast_food_drive_through_site(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var asphalt := _make_material("4f595e", 0.98)
	var curb := _make_material("eee8dc", 0.92)
	var paint := _make_material("f7f2df", 0.92)
	var accent_paint := _make_material_from_color(palette["accent"].lightened(0.08), 0.82)
	var lane_width := 0.62 if visual_tier < 3 else 0.84
	_add_restaurant_parking_pad(parent, Vector3(-1.12, 0.0, 0.94), Vector3(1.52, 1.0, 0.68), 2, palette, 0.0, false)
	for segment in [
		{"center": Vector3(1.64, 0.06, 0.18), "size": Vector3(lane_width, 0.035, 2.34)},
		{"center": Vector3(0.64, 0.062, -1.14), "size": Vector3(2.24, 0.035, lane_width)},
		{"center": Vector3(0.22, 0.064, 1.08), "size": Vector3(2.2, 0.035, lane_width * 0.78)},
	]:
		var center: Vector3 = segment["center"]
		var size: Vector3 = segment["size"]
		_add_box(center, size + Vector3(0.12, 0.012, 0.12), curb, parent)
		_add_box(center + Vector3(0.0, 0.024, 0.0), size, asphalt, parent)
	_add_restaurant_arrow(parent, Vector3(1.64, 0.128, 0.56), accent_paint, -90.0)
	_add_restaurant_arrow(parent, Vector3(0.72, 0.128, -1.14), accent_paint, 180.0)
	_add_box(Vector3(1.64, 0.112, -0.08), Vector3(0.035, 0.012, 1.74), paint, parent)
	_add_box(Vector3(0.62, 0.114, -1.14), Vector3(1.58, 0.012, 0.035), paint, parent)
	create_menu_board(parent, Vector3(1.15, 0.04, 0.68), palette, visual_tier >= 3)
	_add_box(Vector3(1.16, 0.18, 0.42), Vector3(0.4, 0.2, 0.08), _make_material_from_color(palette["accent"], 0.72), parent)
	if visual_tier >= 3:
		_add_box(Vector3(1.22, 0.116, 0.0), Vector3(0.032, 0.012, 1.36), paint, parent)
	if visual_tier >= 4:
		_add_small_parked_car_local(parent, Vector3(-1.12, 0.04, 0.92), 0.0, palette["trim"])
		create_landscape_island(parent, Vector3(-0.1, 0.12, 0.72), Vector3(0.5, 0.08, 0.2), palette["accent"], 3)


func _add_modern_cafe_glass_pavilion(parent: Node, width: float, depth: float, height: float, center_z: float, front_z: float, palette: Dictionary) -> void:
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.14, 0.18)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_soft_block(Vector3(-width * 0.28, height * 0.5 + 0.05, center_z - depth * 0.12), Vector3(width * 0.48, height, depth * 0.82), wall_material, parent, 0.05)
	_add_soft_block(Vector3(width * 0.16, height * 0.47 + 0.05, center_z + depth * 0.04), Vector3(width * 0.72, height * 0.86, depth), glass_material, parent, 0.04)
	_add_box(Vector3(width * 0.22, 0.54, front_z + 0.08), Vector3(width * 0.62, 0.38, 0.055), trim_material, parent)
	_add_box(Vector3(width * 0.22, 0.54, front_z + 0.115), Vector3(width * 0.52, 0.3, 0.035), glass_material, parent)
	for mullion_x in [-width * 0.02, width * 0.22, width * 0.46]:
		_add_box(Vector3(mullion_x, 0.55, front_z + 0.14), Vector3(0.024, 0.34, 0.03), trim_material, parent)
	_add_restaurant_front_door_local(Vector3(width * 0.52, 0.0, front_z + 0.12), parent, palette["accent"])
	_add_box(Vector3(-width * 0.5, 0.58, center_z + depth * 0.08), Vector3(0.07, 0.74, depth * 0.62), accent_material, parent)


func _add_modern_cafe_roof(parent: Node, width: float, depth: float, height: float, center_z: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	var roof := _add_box(Vector3(0.0, height + 0.18, center_z - 0.02), Vector3(width + 0.42, 0.12, depth + 0.3), roof_material, parent)
	roof.rotation_degrees.x = -4.0
	roof.rotation_degrees.z = 5.0
	_add_box(Vector3(-width * 0.08, height + 0.31, front_z + 0.12), Vector3(width * 0.9, 0.055, 0.28), accent_material, parent)
	for post_x in [-width * 0.42, width * 0.18]:
		_add_local_cylinder(Vector3(post_x, 0.42, front_z + 0.22), 0.022, 0.024, 0.68, trim_material, parent)
	if visual_tier >= 3:
		_add_box(Vector3(-width * 0.36, height + 0.42, center_z - depth * 0.28), Vector3(0.1, 0.62, 0.52), accent_material, parent)


func _add_modern_cafe_sign(parent: Node, width: float, height: float, front_z: float, palette: Dictionary) -> void:
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_box(Vector3(-width * 0.3, height + 0.46, front_z + 0.18), Vector3(width * 0.42, 0.08, 0.08), accent_material, parent)
	_add_signboard_local(Vector3(-width * 0.3, height + 0.47, front_z + 0.23), Vector2(width * 0.3, 0.14), palette["accent"], "cafe", parent)


func _add_modern_cafe_patio_site(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var patio_size := Vector3(2.36 + float(visual_tier) * 0.18, 0.05, 1.08 + float(visual_tier) * 0.08)
	create_patio(parent, Vector3(-0.82, 0.04, 1.02), patio_size, palette, 2, true)
	_add_umbrella_table(parent, Vector3(-1.42, 0.06, 1.02), palette)
	_add_umbrella_table(parent, Vector3(-0.58, 0.06, 1.1), palette)
	if visual_tier >= 2:
		_add_umbrella_table(parent, Vector3(0.18, 0.06, 0.88), palette)
	create_planters(parent, [Vector3(-1.94, 0.1, 1.36), Vector3(0.54, 0.1, 1.42), Vector3(1.26, 0.1, 0.76)], palette["accent"])
	if visual_tier >= 3:
		create_string_lights(parent, Vector3(-1.92, 0.0, 1.5), Vector3(0.72, 0.0, 1.5), palette, 6)
		create_landscape_island(parent, Vector3(1.2, 0.12, 0.18), Vector3(0.44, 0.08, 0.32), palette["accent"], 4)
	if visual_tier >= 4:
		_add_restaurant_parking_pad(parent, Vector3(1.48, 0.0, 0.72), Vector3(0.94, 1.0, 0.62), 1, palette, 90.0, false)


func _add_family_restaurant_main_hall(parent: Node, width: float, depth: float, height: float, center_z: float, palette: Dictionary, visual_tier: int) -> void:
	var wall_material := _make_material_from_color(palette["wall"], 0.9)
	var left_material := _make_material_from_color(palette["wall"].lightened(0.04), 0.9)
	var right_material := _make_material_from_color(palette["wall"].darkened(0.035), 0.9)
	_add_soft_block(Vector3(0.0, height * 0.5 + 0.05, center_z), Vector3(width * 0.66, height, depth), wall_material, parent, 0.12)
	_add_soft_block(Vector3(-width * 0.39, height * 0.45 + 0.05, center_z + depth * 0.05), Vector3(width * 0.24, height * 0.78, depth * 0.72), left_material, parent, 0.1)
	_add_soft_block(Vector3(width * 0.39, height * 0.45 + 0.05, center_z + depth * 0.05), Vector3(width * 0.24, height * 0.78, depth * 0.72), right_material, parent, 0.1)
	if visual_tier >= 3:
		_add_soft_block(Vector3(0.0, height * 0.5 + 0.07, center_z - depth * 0.52), Vector3(width * 0.48, height * 0.82, depth * 0.38), _make_material_from_color(palette["wall"].lightened(0.03), 0.9), parent, 0.1)


func _add_family_restaurant_roofline(parent: Node, width: float, depth: float, height: float, center_z: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_gabled_roof(Vector3(0.0, height + 0.22, center_z), Vector3(width * 0.78, 0.2, depth + 0.26), roof_material, parent, 13.0)
	_add_gabled_roof(Vector3(-width * 0.39, height * 0.78 + 0.18, center_z + depth * 0.04), Vector3(width * 0.3, 0.15, depth * 0.82), roof_material, parent, 10.0)
	_add_gabled_roof(Vector3(width * 0.39, height * 0.78 + 0.18, center_z + depth * 0.04), Vector3(width * 0.3, 0.15, depth * 0.82), roof_material, parent, 10.0)
	_add_gabled_roof(Vector3(0.0, height + 0.36, front_z + 0.02), Vector3(width * 0.34, 0.16, 0.5), accent_material, parent, 15.0)
	_add_box(Vector3(0.0, height + 0.08, front_z + 0.24), Vector3(width * 0.42, 0.06, 0.08), trim_material, parent)
	if visual_tier >= 4:
		_add_box(Vector3(0.0, height + 0.56, center_z - depth * 0.16), Vector3(width * 0.42, 0.08, depth * 0.42), trim_material, parent)


func _add_family_restaurant_frontage(parent: Node, signage_root: Node, width: float, height: float, front_z: float, palette: Dictionary, visual_tier: int) -> void:
	var trim_material := _make_material_from_color(palette["trim"], 0.82)
	var accent_material := _make_material_from_color(palette["accent"], 0.48)
	_add_soft_block(Vector3(0.0, 0.58, front_z + 0.08), Vector3(width * 0.34, 0.94, 0.34), _make_material_from_color(palette["wall"].lightened(0.08), 0.9), parent, 0.08)
	_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z + 0.16), parent, palette["accent"])
	for window_x in [-width * 0.28, width * 0.28]:
		_add_restaurant_window_wall(parent, Vector3(window_x, 0.54, front_z + 0.14), Vector2(width * 0.22, 0.34), 1, Color("ffe6cc"))
	for window_x in [-width * 0.44, width * 0.44]:
		_add_restaurant_window_wall(parent, Vector3(window_x, 0.5, front_z + 0.08), Vector2(width * 0.16, 0.28), 1, Color("ffe6cc"))
	_add_box(Vector3(0.0, 0.92, front_z + 0.24), Vector3(width * 0.52, 0.11, 0.16), accent_material, parent)
	_add_box(Vector3(0.0, 0.99, front_z + 0.28), Vector3(width * 0.38, 0.04, 0.18), trim_material, parent)
	create_modular_signage(signage_root, Vector3(0.0, height + 0.48, front_z + 0.22), Vector2(width * 0.46, 0.22), palette, "grill")
	if visual_tier >= 3:
		_add_front_lanterns(parent, front_z + 0.2, width * 0.86)


func _add_family_restaurant_upgrade_massing(parent: Node, width: float, depth: float, height: float, center_z: float, front_z: float, palette: Dictionary, profile: Dictionary) -> void:
	var wing_count := _commercial_int(profile, "wing", 0)
	var roof_material := _make_material_from_color(palette["roof"], 0.74)
	if wing_count >= 1:
		_add_soft_block(Vector3(-width * 0.48, 0.54, center_z - depth * 0.38), Vector3(width * 0.24, 0.82, depth * 0.58), _make_material_from_color(palette["wall"].darkened(0.03), 0.9), parent, 0.1)
		_add_gabled_roof(Vector3(-width * 0.48, 1.1, center_z - depth * 0.38), Vector3(width * 0.3, 0.13, depth * 0.68), roof_material, parent, 10.0)
		_add_house_side_window_local(Vector3(-width * 0.59, 0.62, center_z - depth * 0.1), Vector3(0.05, 0.32, 0.26), parent, -1.0)
	if wing_count >= 2:
		_add_soft_block(Vector3(width * 0.48, 0.58, center_z - depth * 0.42), Vector3(width * 0.24, 0.9, depth * 0.64), _make_material_from_color(palette["wall"].lightened(0.04), 0.9), parent, 0.1)
		_add_gabled_roof(Vector3(width * 0.48, 1.18, center_z - depth * 0.42), Vector3(width * 0.3, 0.13, depth * 0.74), roof_material, parent, 10.0)
		_add_house_side_window_local(Vector3(width * 0.59, 0.66, center_z - depth * 0.12), Vector3(0.05, 0.34, 0.26), parent, 1.0)
	if _commercial_bool(profile, "upper"):
		_add_soft_block(Vector3(0.0, height + 0.42, center_z - 0.08), Vector3(width * 0.6, 0.64, depth * 0.52), _make_material_from_color(palette["wall"].lightened(0.08), 0.92), parent, 0.11)
		create_modular_roof(parent, Vector3(0.0, height + 0.9, center_z - 0.08), Vector3(width * 0.68, 0.13, depth * 0.62), roof_material, "gabled")
		for x in [-width * 0.18, width * 0.18]:
			_add_window_band_local(Vector3(x, height + 0.38, front_z + 0.02), Vector3(0.24, 0.26, 0.05), parent)


func _add_family_restaurant_parking_field(parent: Node, palette: Dictionary, visual_tier: int) -> void:
	var spaces := 4 + int(visual_tier >= 3)
	_add_restaurant_parking_pad(parent, Vector3(0.0, 0.0, 0.98), Vector3(4.62, 1.0, 1.04), spaces, palette, 0.0, true)
	create_landscape_island(parent, Vector3(-2.12, 0.12, 0.72), Vector3(0.28, 0.08, 0.58), palette["accent"], 3)
	create_landscape_island(parent, Vector3(2.12, 0.12, 0.72), Vector3(0.28, 0.08, 0.58), palette["trim"], 3)
	_add_box(Vector3(0.0, 0.14, 1.48), Vector3(3.3, 0.055, 0.1), _make_material_from_color(palette["trim"], 0.84), parent)
	if visual_tier >= 2:
		_add_small_parked_car_local(parent, Vector3(-0.72, 0.04, 0.88), 0.0, palette["accent"])
	if visual_tier >= 3:
		create_landscape_island(parent, Vector3(0.0, 0.12, 0.26), Vector3(2.6, 0.08, 0.18), palette["accent"], 5)
	if visual_tier >= 4:
		_add_small_parked_car_local(parent, Vector3(0.88, 0.04, 0.9), 0.0, palette["roof"])


func _add_restaurant_variant_lot_details(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, tier: int, variant_id: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	var visual_tier := _property_visual_tier(tier)
	match variant_id:
		"classic_diner":
			_add_retro_diner_front_lot(parent, palette, visual_tier)
			_add_restaurant_pylon_sign(parent, Vector3(-2.32, 0.02, 1.08), palette, "diner", 1.38 if visual_tier >= 3 else 1.1, true)
			create_planters(parent, [Vector3(-2.08, 0.1, 0.38), Vector3(2.08, 0.1, 0.38)], accent)
			if visual_tier >= 2:
				_add_retro_diner_service_lane(parent, palette, visual_tier)
			if visual_tier >= 4:
				create_patio(parent, Vector3(1.28, 0.04, 1.48), Vector3(1.04, 0.05, 0.42), palette, 1, true)
		"fast_food_drive_through":
			_add_fast_food_drive_through_site(parent, palette, visual_tier)
			_add_restaurant_pylon_sign(parent, Vector3(-2.1, 0.02, 0.86), palette, "fast_food", 1.52 if visual_tier >= 3 else 1.18, false)
			if visual_tier >= 2:
				_add_box(Vector3(1.38, 0.13, -1.12), Vector3(0.78, 0.04, 0.08), _make_material_from_color(accent, 0.82), parent)
			if visual_tier >= 4:
				_add_box(Vector3(-1.62, 0.14, 1.38), Vector3(0.72, 0.06, 0.1), _make_material_from_color(trim, 0.84), parent)
		"modern_cafe":
			_add_modern_cafe_patio_site(parent, palette, visual_tier)
		"family_restaurant":
			_add_family_restaurant_parking_field(parent, palette, visual_tier)
		"upscale_restaurant":
			_add_box(Vector3(0.0, 0.05, 0.9), Vector3(2.42, 0.04, 0.84), _make_material("d8c7ab", 0.92), parent)
			create_patio(parent, Vector3(-0.86, 0.06, 0.98), Vector3(1.38, 0.05, 0.82), palette, 2 + int(visual_tier >= 3), true)
			create_landscape_island(parent, Vector3(0.88, 0.12, 0.9), Vector3(0.66, 0.08, 0.42), accent, 5)
			_add_box(Vector3(0.34, 0.08, 1.48), Vector3(1.42, 0.035, 0.24), _make_material("c7bca8", 0.92), parent)
			_add_restaurant_pylon_sign(parent, Vector3(1.72, 0.02, 1.16), palette, "fine_dining", 0.92, false)
			if visual_tier >= 3:
				_add_local_sphere(Vector3(0.78, 0.18, 0.82), 0.2, 0.04, _make_transparent_material(Color("aee0eb"), 0.24, 0.34), parent)
				create_string_lights(parent, Vector3(-1.38, 0.0, 1.24), Vector3(1.24, 0.0, 1.24), palette, 6)
			if visual_tier >= 4:
				_add_lantern_glow_local(Vector3(-1.16, 0.56, 0.48), parent)
				_add_lantern_glow_local(Vector3(1.16, 0.56, 0.48), parent)
		"food_truck_court":
			_add_box(Vector3(0.0, 0.048, 0.24), Vector3(3.72, 0.04, 1.56), _make_material("d7c5ac", 0.92), parent)
			for table in [Vector3(-1.0, 0.05, 0.74), Vector3(-0.24, 0.05, 0.94), Vector3(0.58, 0.05, 0.76), Vector3(1.18, 0.05, 0.24)]:
				_add_umbrella_table(parent, table, palette)
			create_string_lights(parent, Vector3(-1.78, 0.0, 1.18), Vector3(1.78, 0.0, 1.18), palette, 7)
			create_landscape_island(parent, Vector3(-1.74, 0.12, -0.46), Vector3(0.36, 0.08, 0.66), accent, 5)
			create_landscape_island(parent, Vector3(1.74, 0.12, -0.46), Vector3(0.36, 0.08, 0.66), trim, 5)
			if visual_tier >= 3:
				create_landscape_island(parent, Vector3(0.0, 0.12, -0.84), Vector3(2.0, 0.08, 0.2), accent, 5)
		_:
			_add_restaurant_parking_pad(parent, parking_position, parking_size, 3, palette, 0.0, false)


func _add_corner_store_variant_lot_details(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, tier: int, variant_id: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	match variant_id:
		"convenience_store_no_pumps":
			_add_box(parking_position + Vector3(0.0, 0.14, parking_size.z * 0.42), Vector3(parking_size.x * 0.52, 0.05, 0.1), _make_material_from_color(accent, 0.78), parent)
		"urban_corner_shop":
			_add_box(parking_position + Vector3(-parking_size.x * 0.42, 0.2, parking_size.z * 0.34), Vector3(0.18, 0.26, 0.08), _make_material_from_color(trim, 0.78), parent)
			if tier >= 3:
				_add_box(parking_position + Vector3(parking_size.x * 0.4, 0.14, parking_size.z * 0.38), Vector3(0.22, 0.1, 0.08), _make_material_from_color(accent, 0.82), parent)
		"modern_mini_mart":
			create_landscape_island(parent, parking_position + Vector3(parking_size.x * 0.36, 0.12, parking_size.z * 0.24), Vector3(0.32, 0.08, 0.2), accent, 2)
		_:
			if tier >= 3:
				_add_box(parking_position + Vector3(parking_size.x * 0.34, 0.14, parking_size.z * 0.4), Vector3(0.24, 0.08, 0.1), _make_material_from_color(accent, 0.82), parent)


func _add_bank_variant_lot_details(parent: Node, parking_position: Vector3, parking_size: Vector3, palette: Dictionary, tier: int, variant_id: String) -> void:
	var accent: Color = palette["accent"]
	var trim: Color = palette["trim"]
	match variant_id:
		"modern_glass_bank":
			_add_box(parking_position + Vector3(0.0, 0.125, parking_size.z * 0.42), Vector3(parking_size.x * 0.54, 0.035, 0.1), _make_material_from_color(accent.lightened(0.18), 0.82), parent)
			if tier >= 3:
				create_landscape_island(parent, parking_position + Vector3(parking_size.x * 0.34, 0.12, parking_size.z * 0.2), Vector3(0.42, 0.08, 0.22), accent, 2)
		"small_town_brick_bank":
			_add_box(parking_position + Vector3(-parking_size.x * 0.36, 0.13, parking_size.z * 0.44), Vector3(0.42, 0.04, 0.1), _make_material_from_color(trim.darkened(0.08), 0.86), parent)
			if tier >= 3:
				_add_box(parking_position + Vector3(parking_size.x * 0.36, 0.13, parking_size.z * 0.44), Vector3(0.42, 0.04, 0.1), _make_material_from_color(trim.darkened(0.08), 0.86), parent)
		"premium_financial_center":
			create_landscape_island(parent, parking_position + Vector3(-parking_size.x * 0.36, 0.12, parking_size.z * 0.32), Vector3(0.38, 0.08, 0.24), accent, 3)
			create_landscape_island(parent, parking_position + Vector3(parking_size.x * 0.36, 0.12, parking_size.z * 0.32), Vector3(0.38, 0.08, 0.24), trim, 3)
			if tier >= 4:
				_add_box(parking_position + Vector3(0.0, 0.14, -parking_size.z * 0.44), Vector3(parking_size.x * 0.62, 0.04, 0.08), _make_material_from_color(accent, 0.78), parent)
		_:
			if tier >= 3:
				_add_box(parking_position + Vector3(0.0, 0.13, parking_size.z * 0.44), Vector3(parking_size.x * 0.44, 0.04, 0.1), _make_material_from_color(trim, 0.86), parent)


func _apply_service_tier_visuals(root: Node3D, tool: String, tier: int, variant: int, profile: Dictionary, variant_id: String = "") -> void:
	var resolved_variant_id := _resolve_property_variant_id(tool, variant, variant_id)
	var palette: Dictionary = _palette_for_property_variant(tool, variant, resolved_variant_id)
	_rebuild_commercial_tier_visuals(root, tool, tier, variant, palette, resolved_variant_id)


func _apply_fire_station_tier_visuals(lot_root: Node3D, structure_root: Node3D, tier: int, variant: int, profile: Dictionary, palette: Dictionary, accent: Color, trim: Color) -> void:
	var wall_material := _make_material_from_color(palette["wall"].lightened(0.05), 0.94)
	var wing_material := _make_material_from_color(palette["wall"].darkened(0.02), 0.92)
	var bay_material := _make_material_from_color(palette["trim"].darkened(0.01), 0.9)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.02), 0.76)
	if tier >= 2:
		if bool(profile.get("front_hall", false)):
			_add_soft_block(Vector3(0.0, 0.44, 0.74), Vector3(2.04, 0.72, 0.92), wall_material, structure_root, 0.13)
			_add_gabled_roof(Vector3(0.0, 0.96, 0.74), Vector3(2.2, 0.13, 1.02), roof_material, structure_root, 11.0)
			_add_box(Vector3(-0.46, 0.3, 1.22), Vector3(0.28, 0.46, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.46, 0.3, 1.22), Vector3(0.28, 0.46, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.0, 0.82, 1.18), Vector3(1.12, 0.1, 0.06), _make_material_from_color(accent, 0.42), structure_root)
		if bool(profile.get("bay_extend", false)):
			_add_soft_block(Vector3(1.04, 0.42, -0.12), Vector3(1.14, 0.76, 1.42), bay_material, structure_root, 0.11)
			_add_gabled_roof(Vector3(1.04, 0.96, -0.12), Vector3(1.3, 0.12, 1.56), roof_material, structure_root, 11.0)
			_add_box(Vector3(1.0, 0.36, 0.44), Vector3(0.36, 0.5, 0.05), _window_material, structure_root)

	if tier >= 3:
		if bool(profile.get("bay_extend", false)):
			_add_soft_block(Vector3(-1.04, 0.42, -0.18), Vector3(1.12, 0.74, 1.36), wing_material, structure_root, 0.11)
			_add_gabled_roof(Vector3(-1.04, 0.94, -0.18), Vector3(1.28, 0.12, 1.5), roof_material, structure_root, 11.0)
			_add_box(Vector3(-1.04, 0.38, 0.5), Vector3(0.34, 0.44, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(-1.62, 0.46, -0.18), Vector3(0.24, 0.34, 0.05), structure_root, -1.0)
		if bool(profile.get("hose_tower", false)):
			_add_soft_block(Vector3(1.12, 0.72, -0.86), Vector3(0.68, 1.34, 0.68), bay_material, structure_root, 0.1)
			_add_gabled_roof(Vector3(1.12, 1.5, -0.86), Vector3(0.82, 0.1, 0.82), _make_material_from_color(palette["roof"].darkened(0.03), 0.76), structure_root, 14.0)
			_add_box(Vector3(1.08, 0.94, -0.8), Vector3(0.18, 0.18, 0.06), _window_material, structure_root)

	if tier >= 4:
		if bool(profile.get("second_story", false)):
			_add_soft_block(Vector3(0.0, 1.26, -0.02), Vector3(2.0, 0.84, 1.34), _make_material_from_color(palette["wall"].lightened(0.06), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 1.94, -0.02), Vector3(2.18, 0.14, 1.5), roof_material, structure_root, 12.0)
			_add_box(Vector3(0.0, 1.04, 0.5), Vector3(0.52, 0.22, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.0, 1.2, -0.58), Vector3(0.44, 0.18, 0.06), _window_material, structure_root)

	if tier >= 5:
		if bool(profile.get("civic_wing", false)):
			_add_soft_block(Vector3(-1.24, 1.0, -0.24), Vector3(1.08, 1.06, 1.36), _make_material_from_color(palette["wall"].lightened(0.04), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(-1.24, 1.74, -0.24), Vector3(1.24, 0.13, 1.52), _make_material_from_color(palette["roof"].darkened(0.03), 0.76), structure_root, 12.0)
			_add_box(Vector3(-1.12, 0.92, 0.48), Vector3(0.34, 0.32, 0.06), _window_material, structure_root)
			_add_box(Vector3(-1.12, 1.22, -0.54), Vector3(0.26, 0.24, 0.06), _window_material, structure_root)
			_add_house_side_window_local(Vector3(-1.62, 1.08, -0.08), Vector3(0.24, 0.3, 0.05), structure_root, -1.0)
			_add_box(Vector3(0.0, 2.18, 0.46), Vector3(1.18, 0.14, 0.08), _make_material_from_color(accent, 0.42), structure_root)
			_add_local_cylinder(Vector3(1.08, 1.86, -0.8), 0.12, 0.12, 0.34, _make_material_from_color(accent, 0.46), structure_root)


func _apply_bank_tier_visuals(lot_root: Node3D, structure_root: Node3D, tier: int, variant: int, profile: Dictionary, palette: Dictionary, accent: Color, trim: Color) -> void:
	var wall_material := _make_material_from_color(palette["wall"].lightened(0.05), 0.94)
	var wing_material := _make_material_from_color(palette["wall"].darkened(0.01), 0.92)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.01), 0.76)
	if tier >= 2:
		if bool(profile.get("front_hall", false)):
			_add_soft_block(Vector3(0.0, 0.42, 0.72), Vector3(2.08, 0.68, 0.94), wall_material, structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 0.92, 0.72), Vector3(2.26, 0.12, 1.04), roof_material, structure_root, 10.0)
			_add_box(Vector3(-0.56, 0.18, 0.98), Vector3(0.18, 0.36, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.56, 0.18, 0.98), Vector3(0.18, 0.36, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.0, 0.22, 1.12), Vector3(0.46, 0.4, 0.06), _window_material, structure_root)
			for col_x in [-0.64, -0.22, 0.22, 0.64]:
				_add_local_cylinder(Vector3(col_x, 0.22, 1.02), 0.06, 0.06, 0.52, _make_material_from_color(trim, 0.84), structure_root)

	if tier >= 3:
		if bool(profile.get("side_wing", false)):
			var side := -1.0 if posmod(variant, 2) == 0 else 1.0
			_add_soft_block(Vector3(side * 1.18, 0.64, -0.48), Vector3(1.04, 0.9, 1.28), wing_material, structure_root, 0.12)
			_add_gabled_roof(Vector3(side * 1.18, 1.24, -0.48), Vector3(1.18, 0.12, 1.42), roof_material, structure_root, 10.0)
			_add_box(Vector3(side * 1.14, 0.36, 0.04), Vector3(0.28, 0.42, 0.05), _window_material, structure_root)
			_add_box(Vector3(side * 1.14, 0.72, -0.42), Vector3(0.18, 0.22, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(side * 1.72, 0.7, -0.32), Vector3(0.24, 0.32, 0.05), structure_root, side)

	if tier >= 4:
		if bool(profile.get("upper_story", false)):
			_add_soft_block(Vector3(0.0, 1.26, -0.02), Vector3(1.9, 0.86, 1.22), _make_material_from_color(palette["wall"].lightened(0.06), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 1.96, -0.02), Vector3(2.08, 0.14, 1.36), roof_material, structure_root, 12.0)
			_add_box(Vector3(-0.54, 1.08, 0.5), Vector3(0.24, 0.28, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.54, 1.08, 0.5), Vector3(0.24, 0.28, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.0, 1.18, -0.52), Vector3(0.46, 0.24, 0.06), _window_material, structure_root)

	if tier >= 5:
		if bool(profile.get("grand_hall", false)):
			_add_soft_block(Vector3(0.0, 1.5, -0.16), Vector3(2.42, 0.96, 1.38), _make_material_from_color(palette["wall"].lightened(0.08), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 2.2, -0.16), Vector3(2.64, 0.16, 1.52), roof_material, structure_root, 11.0)
			for window_x in [-0.68, 0.0, 0.68]:
				_add_window_band_local(Vector3(window_x, 1.36, 0.5), Vector3(0.24, 0.3, 0.05), structure_root)
			_add_window_band_local(Vector3(0.0, 1.52, -0.72), Vector3(0.52, 0.24, 0.05), structure_root)
			_add_house_side_window_local(Vector3(-1.18, 1.42, -0.12), Vector3(0.24, 0.3, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3(1.18, 1.42, -0.12), Vector3(0.24, 0.3, 0.05), structure_root, 1.0)
			for col_x in [-0.86, -0.42, 0.0, 0.42, 0.86]:
				_add_local_cylinder(Vector3(col_x, 0.76, 0.98), 0.055, 0.055, 0.92, _make_material_from_color(trim, 0.84), structure_root)
			_add_restaurant_front_door_local(Vector3(0.0, 0.0, 1.23), structure_root, accent)
			for window_x in [-0.72, 0.72]:
				_add_house_wall_window_local(Vector3(window_x, 0.54, 1.23), Vector3(0.32, 0.42, 0.055), structure_root)
			for window_x in [-0.34, 0.34]:
				_add_window_band_local(Vector3(window_x, 1.04, 1.2), Vector3(0.22, 0.24, 0.05), structure_root)
			_add_box(Vector3(0.0, 2.3, 0.46), Vector3(1.36, 0.12, 0.08), _make_material_from_color(accent, 0.42), structure_root)


func _apply_grocery_tier_visuals(lot_root: Node3D, structure_root: Node3D, tier: int, variant: int, profile: Dictionary, palette: Dictionary, accent: Color, trim: Color) -> void:
	var width := 3.0 + float(variant % 3) * 0.16
	var depth := 2.02 + float(int(variant / 3) % 2) * 0.16
	var height := 0.96 + float(int(variant / 5)) * 0.1
	var wall_material := _make_material_from_color(palette["wall"].lightened(0.04), 0.92)
	var wing_material := _make_material_from_color(palette["wall"].darkened(0.02), 0.92)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.01), 0.76)
	var accent_material := _make_material_from_color(accent, 0.46)
	var trim_material := _make_material_from_color(trim, 0.58)
	if tier >= 2:
		if bool(profile.get("awning", false)):
			_add_soft_block(Vector3(0.0, 0.44, 0.0), Vector3(width * 1.04, height + 0.26, 0.96), wall_material, structure_root, 0.16)
			_add_gabled_roof(Vector3(0.0, height + 0.32, 0.0), Vector3(width + 0.34, 0.16, 1.08), roof_material, structure_root, 8.0)
			_add_box(Vector3(0.0, 0.22, 0.46), Vector3(width * 0.58, 0.3, 0.05), _window_material, structure_root)
			_add_box(Vector3(-width * 0.34, 0.28, 0.5), Vector3(0.26, 0.42, 0.06), _window_material, structure_root)
			_add_box(Vector3(width * 0.34, 0.28, 0.5), Vector3(0.26, 0.42, 0.06), _window_material, structure_root)
			_add_box(Vector3(0.0, 0.82, 0.52), Vector3(width * 0.6, 0.1, 0.05), _make_material_from_color(trim, 0.42), structure_root)
			_add_box(Vector3(0.0, 0.52, 0.76), Vector3(width * 1.02, 0.12, 0.22), accent_material, structure_root)
			for post_x in [-width * 0.43, width * 0.43]:
				_add_local_cylinder(Vector3(post_x, 0.3, 0.82), 0.035, 0.035, 0.6, trim_material, structure_root)

	if tier >= 3:
		if bool(profile.get("service_wing", false)):
			_add_soft_block(Vector3(-1.24, 0.48, -0.32), Vector3(1.22, 0.86, 1.58), wing_material, structure_root, 0.13)
			_add_gabled_roof(Vector3(-1.24, 1.02, -0.32), Vector3(1.38, 0.13, 1.72), roof_material, structure_root, 9.0)
			_add_box(Vector3(-1.24, 0.38, 0.48), Vector3(0.36, 0.44, 0.06), _window_material, structure_root)
			_add_box(Vector3(-1.24, 0.72, -0.92), Vector3(0.28, 0.24, 0.06), _window_material, structure_root)
			_add_house_side_window_local(Vector3(-1.86, 0.48, -0.32), Vector3(0.24, 0.34, 0.05), structure_root, -1.0)
			_add_box(Vector3(-1.24, 0.12, 0.58), Vector3(0.66, 0.1, 0.12), trim_material, structure_root)

	if tier >= 4:
		if bool(profile.get("market_hall", false)):
			_add_soft_block(Vector3(0.88, 0.56, -0.64), Vector3(width * 0.78, height + 0.22, 1.54), _make_material_from_color(palette["wall"].lightened(0.06), 0.94), structure_root, 0.14)
			_add_gabled_roof(Vector3(0.88, height + 0.32, -0.64), Vector3(width * 0.88, 0.15, 1.72), roof_material, structure_root, 7.0)
			_add_box(Vector3(0.3, 0.58, 0.18), Vector3(0.32, 0.38, 0.06), _window_material, structure_root)
			_add_box(Vector3(1.1, 0.58, 0.18), Vector3(0.32, 0.38, 0.06), _window_material, structure_root)
			_add_house_side_window_local(Vector3(1.82, 0.52, -0.6), Vector3(0.28, 0.36, 0.05), structure_root, 1.0)
			_add_box(Vector3(0.0, 0.9, 0.56), Vector3(width * 0.72, 0.12, 0.05), _make_material_from_color(accent, 0.46), structure_root)
			_add_box(Vector3(0.88, 0.16, 0.26), Vector3(1.18, 0.12, 0.12), trim_material, structure_root)

	if tier >= 5:
		if bool(profile.get("upper_story", false)):
			_add_soft_block(Vector3(0.0, 1.22, -0.32), Vector3(width * 0.86, 0.78, depth * 0.82), _make_material_from_color(palette["wall"].lightened(0.06), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(0.0, 1.82, -0.32), Vector3(width * 0.98, 0.14, depth * 0.92), _make_material_from_color(palette["roof"].darkened(0.01), 0.76), structure_root, 7.0)
			_add_box(Vector3(-0.58, 1.08, 0.42), Vector3(0.22, 0.28, 0.05), _window_material, structure_root)
			_add_box(Vector3(0.0, 1.08, 0.42), Vector3(0.22, 0.28, 0.05), _window_material, structure_root)
			_add_box(Vector3(0.58, 1.08, 0.42), Vector3(0.22, 0.28, 0.05), _window_material, structure_root)
			_add_box(Vector3(0.0, 1.2, -0.62), Vector3(0.46, 0.24, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(-width * 0.45, 1.12, -0.24), Vector3(0.24, 0.3, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3(width * 0.45, 1.12, -0.24), Vector3(0.24, 0.3, 0.05), structure_root, 1.0)
			_add_box(Vector3(0.0, 2.02, 0.34), Vector3(width * 0.74, 0.1, 0.08), accent_material, structure_root)


func _apply_restaurant_tier_visuals(lot_root: Node3D, structure_root: Node3D, tier: int, variant: int, profile: Dictionary, palette: Dictionary, accent: Color, trim: Color) -> void:
	var restaurant_profile := _restaurant_variant_profile(variant)
	var width := float(restaurant_profile["width"])
	var depth := float(restaurant_profile["depth"])
	var height := float(restaurant_profile["height"])
	var roof_style := str(restaurant_profile["roof"])
	var canopy_style := str(restaurant_profile["canopy"])
	var sign_kind := str(restaurant_profile["sign"])
	var wall_material := _make_material_from_color(palette["wall"].lightened(0.04), 0.92)
	var wing_material := _make_material_from_color(palette["wall"].darkened(0.02), 0.92)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.01), 0.76)
	var trim_material := _make_material_from_color(trim, 0.52)
	var accent_material := _make_material_from_color(accent, 0.48)
	if tier >= 2:
		if bool(profile.get("front_expansion", false)):
			_add_soft_block(Vector3(0.0, 0.45, 0.34), Vector3(width * 0.94, height * 0.82, 0.64), wall_material, structure_root, 0.14)
			_add_restaurant_roof_local(Vector3(0.0, height * 0.88 + 0.2, 0.34), Vector3(width + 0.12, 0.14, 0.76), roof_material, roof_style, structure_root)
			_add_restaurant_canopy_local(canopy_style, Vector3(0.0, 0.48, 0.86), width * 0.92, accent_material, trim_material, structure_root)
			_add_restaurant_front_door_local(Vector3(0.0, 0.0, 0.74), structure_root, accent)
			_add_storefront_window_set(structure_root, width * 0.62, 0.56, 0.78, 3)
			_add_box(Vector3(0.0, 0.86, 0.82), Vector3(width * 0.62, 0.1, 0.05), trim_material, structure_root)

	if tier >= 3:
		if bool(profile.get("dining_wing", false)):
			var side := -1.0 if posmod(variant, 2) == 0 else 1.0
			var wing_x := side * minf(1.52, width * 0.43 + 0.34)
			_add_soft_block(Vector3(wing_x, 0.52, -0.08), Vector3(1.02, height + 0.1, 1.54), wing_material, structure_root, 0.12)
			_add_restaurant_roof_local(Vector3(wing_x, height + 0.28, -0.08), Vector3(1.16, 0.12, 1.68), roof_material, roof_style, structure_root)
			_add_box(Vector3(wing_x, 0.58, 0.58), Vector3(0.34, 0.36, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(wing_x + side * 0.42, 0.58, -0.08), Vector3(0.28, 0.34, 0.05), structure_root, side)

	if tier >= 4:
		if bool(profile.get("kitchen_wing", false)):
			_add_soft_block(Vector3(0.0, 0.52, -1.02), Vector3(width * 0.88, height + 0.04, 0.9), _make_material_from_color(palette["wall"].darkened(0.03), 0.92), structure_root, 0.12)
			_add_restaurant_roof_local(Vector3(0.0, height + 0.24, -1.02), Vector3(width, 0.12, 1.02), roof_material, roof_style, structure_root)
			_add_box(Vector3(-width * 0.22, 0.58, -0.62), Vector3(0.24, 0.28, 0.05), _window_material, structure_root)
			_add_box(Vector3(width * 0.22, 0.58, -0.62), Vector3(0.24, 0.28, 0.05), _window_material, structure_root)
		if bool(profile.get("signature_front", false)):
			_add_signboard_local(Vector3(0.0, height + 0.28, 0.82), Vector2(width * 0.58, 0.24), accent, sign_kind, structure_root)
			_add_front_lanterns(structure_root, 0.9, width * 0.86)

	if tier >= 5:
		if bool(profile.get("second_floor", false)):
			var second_height := 0.82
			var second_y := height + 0.12
			_add_soft_block(Vector3(0.0, second_y + second_height * 0.5, -0.28), Vector3(width + 0.08, second_height, depth + 0.04), _make_material_from_color(palette["wall"].lightened(0.06), 0.94), structure_root, 0.12)
			_add_restaurant_roof_local(Vector3(0.0, second_y + second_height + 0.2, -0.28), Vector3(width + 0.24, 0.14, depth + 0.18), roof_material, roof_style, structure_root)
			for window_x in [-0.52, 0.0, 0.52]:
				_add_window_band_local(Vector3(window_x * width * 0.55, second_y + 0.34, 0.64), Vector3(0.24, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(-width * 0.24, second_y + 0.36, -0.84), Vector3(0.24, 0.24, 0.05), structure_root)
			_add_window_band_local(Vector3(width * 0.24, second_y + 0.36, -0.84), Vector3(0.24, 0.24, 0.05), structure_root)
			_add_house_side_window_local(Vector3(-(width + 0.08) * 0.52, second_y + 0.34, -0.22), Vector3(0.26, 0.3, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3((width + 0.08) * 0.52, second_y + 0.34, -0.22), Vector3(0.26, 0.3, 0.05), structure_root, 1.0)


func _apply_corner_store_tier_visuals(lot_root: Node3D, structure_root: Node3D, tier: int, variant: int, profile: Dictionary, palette: Dictionary, accent: Color, trim: Color) -> void:
	var width := 2.28 + float(variant % 3) * 0.14
	var depth := 1.74 + float(int(variant / 3) % 2) * 0.12
	var height := 0.92 + float(int(variant / 5)) * 0.1
	var wall_material := _make_material_from_color(palette["wall"].lightened(0.03), 0.92)
	var wing_material := _make_material_from_color(palette["trim"].darkened(0.01), 0.9)
	var roof_material := _make_material_from_color(palette["roof"].darkened(0.01), 0.76)
	if tier >= 2:
		if bool(profile.get("corner_awning", false)):
			var front_z := 1.02
			_add_soft_block(Vector3(0.0, 0.42, -0.04), Vector3(width + 0.46, height + 0.28, depth + 0.28), wall_material, structure_root, 0.16)
			_add_gabled_roof(Vector3(0.0, height + 0.34, -0.04), Vector3(width + 0.58, 0.16, depth + 0.34), roof_material, structure_root, 10.0)
			_add_restaurant_front_door_local(Vector3(0.0, 0.0, front_z), structure_root, accent)
			_add_house_wall_window_local(Vector3(-width * 0.28, 0.48, front_z), Vector3(width * 0.18, 0.34, 0.055), structure_root)
			_add_house_wall_window_local(Vector3(width * 0.28, 0.48, front_z), Vector3(width * 0.18, 0.34, 0.055), structure_root)
			_add_box(Vector3(-0.18, 0.82, front_z + 0.02), Vector3(width * 0.48, 0.1, 0.05), _make_material_from_color(trim, 0.42), structure_root)

	if tier >= 3:
		if bool(profile.get("delivery_nook", false)):
			_add_soft_block(Vector3(0.9, 0.42, -0.42), Vector3(0.82, 0.82, 1.02), wing_material, structure_root, 0.1)
			_add_gabled_roof(Vector3(0.9, 0.98, -0.42), Vector3(0.96, 0.12, 1.16), _make_material_from_color(palette["roof"].darkened(0.02), 0.76), structure_root, 9.0)
			_add_box(Vector3(0.9, 0.38, 0.12), Vector3(0.24, 0.4, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(1.32, 0.5, -0.42), Vector3(0.22, 0.3, 0.05), structure_root, 1.0)
		if bool(profile.get("side_sign", false)):
			_add_box(Vector3(0.82, 0.78, 0.72), Vector3(0.42, 0.16, 0.05), _make_material_from_color(trim, 0.82), structure_root)

	if tier >= 4:
		if bool(profile.get("corner_tower", false)):
			_add_soft_block(Vector3(-0.72, 0.92, 0.12), Vector3(0.92, 1.24, 1.02), _make_material_from_color(palette["wall"].lightened(0.05), 0.94), structure_root, 0.1)
			_add_gabled_roof(Vector3(-0.72, 1.68, 0.12), Vector3(1.04, 0.14, 1.16), roof_material, structure_root, 11.0)
			_add_box(Vector3(-0.72, 0.86, 0.68), Vector3(0.26, 0.32, 0.05), _window_material, structure_root)
			_add_box(Vector3(-0.72, 1.16, -0.28), Vector3(0.22, 0.24, 0.05), _window_material, structure_root)
			_add_house_side_window_local(Vector3(-1.1, 1.02, 0.12), Vector3(0.22, 0.28, 0.05), structure_root, -1.0)

	if tier >= 5:
		if bool(profile.get("upper_story", false)):
			var upper_front_z := -0.12 + (depth + 0.18) * 0.5 + 0.04
			_add_soft_block(Vector3(0.18, 1.22, -0.12), Vector3(width + 0.28, 0.86, depth + 0.18), _make_material_from_color(palette["wall"].lightened(0.07), 0.94), structure_root, 0.12)
			_add_gabled_roof(Vector3(0.18, 1.9, -0.12), Vector3(width + 0.42, 0.14, depth + 0.3), roof_material, structure_root, 10.0)
			for window_x in [-0.52, 0.0, 0.52]:
				_add_window_band_local(Vector3(window_x, 1.08, upper_front_z), Vector3(0.22, 0.28, 0.05), structure_root)
			_add_window_band_local(Vector3(0.18, 1.18, -0.54), Vector3(0.42, 0.24, 0.05), structure_root)
			_add_house_side_window_local(Vector3(-width * 0.5, 1.12, -0.08), Vector3(0.24, 0.3, 0.05), structure_root, -1.0)
			_add_house_side_window_local(Vector3(width * 0.58, 1.12, -0.08), Vector3(0.24, 0.3, 0.05), structure_root, 1.0)
			_add_signboard_local(Vector3(-0.74, 1.72, upper_front_z + 0.14), Vector2(0.52, 0.2), accent, "corner", structure_root)


func _apply_park_tier_visuals(root: Node3D, tier: int, variant: int, profile: Dictionary) -> void:
	var palette := _cozy_palette("house", variant)
	var lot_root := _property_lot_root(root)
	if tier >= 2:
		if bool(profile.get("extra_trees", false)):
			_add_wildflower_cluster(Vector3(-0.88, 0.06, -0.56), 5, _make_material_from_color(palette.accent, 0.8), lot_root, 0.12)
			_add_wildflower_cluster(Vector3(0.88, 0.06, 0.56), 5, _make_material_from_color(palette.trim, 0.8), lot_root, 0.12)
		if bool(profile.get("paths", false)):
			_add_box(Vector3(0.0, 0.04, 0.86), Vector3(0.18, 0.02, 0.96), _make_material("d8c7ab", 0.9), lot_root)
			_add_box(Vector3(0.0, 0.04, -0.86), Vector3(0.18, 0.02, 0.96), _make_material("d8c7ab", 0.9), lot_root)
	if tier >= 3:
		if bool(profile.get("gazebo", false)):
			_add_soft_block(Vector3(-0.54, 0.1, 0.08), Vector3(0.44, 0.32, 0.44), _make_material_from_color(palette.wall, 0.88), lot_root, 0.08)
			_add_gabled_roof(Vector3(-0.54, 0.3, 0.08), Vector3(0.56, 0.08, 0.56), _make_material_from_color(palette.roof, 0.74), lot_root, 18.0)
		_add_bench_local(Vector3(0.52, 0.0, -0.16), -0.9, lot_root)
	if tier >= 4:
		if bool(profile.get("fountain", false)):
			_add_park_fountain_local(Vector3(0.0, 0.07, 0.0), lot_root)
		if bool(profile.get("paths", false)):
			_add_box(Vector3(0.0, 0.06, 0.0), Vector3(0.82, 0.03, 0.82), _make_material_from_color(palette.trim, 0.56), lot_root)
			_add_box(Vector3(0.0, 0.12, 0.0), Vector3(0.08, 0.24, 1.34), _make_material("d8c7ab", 0.9), lot_root)
			_add_box(Vector3(0.0, 0.12, 0.0), Vector3(1.34, 0.24, 0.08), _make_material("d8c7ab", 0.9), lot_root)


func _add_town_path(center: Vector3, size: Vector2, parent: Node = null) -> void:
	var path_material := _make_material("d9cbb7", 0.9)
	var path_parent := parent if parent != null else grid_root
	_add_box(center, Vector3(size.x, 0.04, size.y), path_material, path_parent)


func _build_clouds() -> void:
	# Clouds floating between an orthographic camera and the build surface read as
	# white blobs that hide the town. The procedural sky provides atmosphere
	# without obscuring player-created work.
	return


func _add_meadow_patch(center: Vector3, size: Vector2, clump_count: int) -> void:
	var patch := MeshInstance3D.new()
	var patch_mesh := CylinderMesh.new()
	patch_mesh.top_radius = max(size.x, size.y) * 0.52
	patch_mesh.bottom_radius = patch_mesh.top_radius * 1.04
	patch_mesh.height = 0.04
	patch.mesh = patch_mesh
	patch.material_override = _meadow_material
	patch.scale = Vector3(size.x / max(size.x, size.y), 1.0, size.y / max(size.x, size.y))
	patch.position = center
	patch.set_meta("radius", max(size.x, size.y) * 0.52)
	grid_root.add_child(patch)
	_meadow_patches.append(patch)

	for i in range(clump_count):
		var t: float = float(i) / maxf(1.0, float(clump_count))
		var local_x: float = (sin(t * TAU * 1.7) * 0.5 + randf_range(-0.22, 0.22)) * size.x * 0.38
		var local_z: float = (cos(t * TAU * 1.3) * 0.5 + randf_range(-0.22, 0.22)) * size.y * 0.38
		_add_grass_clump(center + Vector3(local_x, 0.05, local_z), randf_range(0.85, 1.25))


func _add_ground_tone_patch(center: Vector3, size: Vector2, color: Color, rotation_degrees_y: float) -> void:
	var patch := MeshInstance3D.new()
	var patch_mesh := CylinderMesh.new()
	patch_mesh.top_radius = max(size.x, size.y) * 0.5
	patch_mesh.bottom_radius = patch_mesh.top_radius * 1.04
	patch_mesh.height = 0.018
	patch.mesh = patch_mesh
	patch.material_override = _make_material_from_color(color, 0.98)
	patch.scale = Vector3(size.x / max(size.x, size.y), 1.0, size.y / max(size.x, size.y))
	patch.position = center
	patch.rotation_degrees.y = rotation_degrees_y
	patch.set_meta("radius", max(size.x, size.y) * 0.5)
	grid_root.add_child(patch)
	_meadow_patches.append(patch)


func _place_road_strip(origin: Vector3, count: int, horizontal: bool) -> void:
	for i in range(count):
		var offset := float(i) - float(count - 1) * 0.5
		var world := origin + (Vector3(offset, 0.0, 0.0) if horizontal else Vector3(0.0, 0.0, offset))
		_mark_road_cell(_world_to_cell(world))

	for i in range(count):
		var offset := float(i) - float(count - 1) * 0.5
		var world := origin + (Vector3(offset, 0.0, 0.0) if horizontal else Vector3(0.0, 0.0, offset))
		_rebuild_road_at(_world_to_cell(world))


func _world_to_cell(world_position: Vector3) -> Vector2i:
	var grid_half := float(GRID_SIZE) * 0.5
	return Vector2i(
		int(round(world_position.x + grid_half - 0.5)),
		int(round(world_position.z + grid_half - 0.5))
	)


func _rebuild_road_at(cell: Vector2i) -> void:
	var key := _cell_key(cell)
	if not _road_cells.has(key):
		return
	if _road_nodes.has(key):
		var existing: Node3D = _road_nodes[key]
		if is_instance_valid(existing):
			existing.queue_free()
	var road := _build_road_tile_mesh(cell, false)
	road.position = _cell_to_world(cell)
	grid_root.add_child(road)
	_road_nodes[key] = road
	_placed_nodes[key] = road


func _build_road_tile_mesh(cell: Vector2i, preview: bool, road_source: Array = []) -> Node3D:
	var root := Node3D.new()
	var verge_material: Material = _ghost_base_material if preview else _ground_material_a
	var sidewalk_material: Material = _ghost_base_material if preview else _sidewalk_material
	var curb_material: Material = _ghost_base_material if preview else _make_material("eeeeea", 0.92)
	var road_material: Material = _ghost_accent_material if preview else _road_material
	var road_top_material: Material = _ghost_accent_material if preview else _road_top_detail_material
	var lane_material: Material = _ghost_base_material if preview else _road_mark_material
	var road_width := ROAD_WIDTH
	var road_top_width := maxf(1.76, road_width - 0.18)
	var road_connector_width := road_width
	var road_connector_top_width := road_top_width
	var source := road_source if road_source.size() > 0 else [cell]
	var north := _road_in_source(Vector2i(cell.x, cell.y - 1), source)
	var east := _road_in_source(Vector2i(cell.x + 1, cell.y), source)
	var south := _road_in_source(Vector2i(cell.x, cell.y + 1), source)
	var west := _road_in_source(Vector2i(cell.x - 1, cell.y), source)

	_add_box(Vector3(0.0, 0.004, 0.0), Vector3(3.52, 0.022, 3.52), verge_material, root)
	_add_box(Vector3(0.0, 0.026, 0.0), Vector3(3.28, 0.042, 3.28), sidewalk_material, root)
	_add_box(Vector3(0.0, 0.052, 0.0), Vector3(2.5, 0.026, 2.5), curb_material, root)
	_add_box(Vector3(0.0, 0.078, 0.0), Vector3(road_width, 0.06, road_width), road_material, root)
	_add_box(Vector3(0.0, 0.096, 0.0), Vector3(road_top_width, 0.022, road_top_width), road_top_material, root)

	if north:
		_add_box(Vector3(0.0, 0.026, -1.28), Vector3(3.52, 0.042, 2.2), sidewalk_material, root)
		_add_box(Vector3(0.0, 0.052, -1.28), Vector3(2.6, 0.026, 1.86), curb_material, root)
		_add_box(Vector3(0.0, 0.08, -1.28), Vector3(road_connector_width, 0.064, 1.72), road_material, root)
		_add_box(Vector3(0.0, 0.1, -1.28), Vector3(road_connector_top_width, 0.024, 1.48), road_top_material, root)
	if south:
		_add_box(Vector3(0.0, 0.026, 1.28), Vector3(3.52, 0.042, 2.2), sidewalk_material, root)
		_add_box(Vector3(0.0, 0.052, 1.28), Vector3(2.6, 0.026, 1.86), curb_material, root)
		_add_box(Vector3(0.0, 0.08, 1.28), Vector3(road_connector_width, 0.064, 1.72), road_material, root)
		_add_box(Vector3(0.0, 0.1, 1.28), Vector3(road_connector_top_width, 0.024, 1.48), road_top_material, root)
	if east:
		_add_box(Vector3(1.28, 0.026, 0.0), Vector3(2.2, 0.042, 3.52), sidewalk_material, root)
		_add_box(Vector3(1.28, 0.052, 0.0), Vector3(1.86, 0.026, 2.6), curb_material, root)
		_add_box(Vector3(1.28, 0.08, 0.0), Vector3(1.72, 0.064, road_connector_width), road_material, root)
		_add_box(Vector3(1.28, 0.1, 0.0), Vector3(1.48, 0.024, road_connector_top_width), road_top_material, root)
	if west:
		_add_box(Vector3(-1.28, 0.026, 0.0), Vector3(2.2, 0.042, 3.52), sidewalk_material, root)
		_add_box(Vector3(-1.28, 0.052, 0.0), Vector3(1.86, 0.026, 2.6), curb_material, root)
		_add_box(Vector3(-1.28, 0.08, 0.0), Vector3(1.72, 0.064, road_connector_width), road_material, root)
		_add_box(Vector3(-1.28, 0.1, 0.0), Vector3(1.48, 0.024, road_connector_top_width), road_top_material, root)
	if not north and not south and not east and not west:
		_add_box(Vector3(0.0, 0.08, 0.0), Vector3(road_connector_width, 0.064, road_connector_width), road_material, root)
		_add_box(Vector3(0.0, 0.1, 0.0), Vector3(road_connector_top_width, 0.024, road_connector_top_width), road_top_material, root)

	var vertical_straight := north and south and not east and not west
	var horizontal_straight := east and west and not north and not south
	var intersection := (north or south) and (east or west)
	if vertical_straight:
		_add_lane_dashes_local(root, true, lane_material)
	elif horizontal_straight:
		_add_lane_dashes_local(root, false, lane_material)
	elif intersection:
		_add_box(Vector3(0.0, 0.08, 0.0), Vector3(road_width + 0.26, 0.064, road_width + 0.26), road_material, root)
		_add_box(Vector3(0.0, 0.1, 0.0), Vector3(road_top_width + 0.18, 0.024, road_top_width + 0.18), road_top_material, root)
		_add_intersection_center_mark_local(root, lane_material)
	else:
		if north or south:
			_add_lane_dashes_local(root, true, lane_material)
		else:
			_add_lane_dashes_local(root, false, lane_material)

	if not preview:
		_add_road_finish_details(root, vertical_straight, horizontal_straight, intersection, north, east, south, west)
		_add_road_surface_polish_local(root, vertical_straight, horizontal_straight, intersection, north, east, south, west)

	return root


func _add_lane_dashes_local(root: Node3D, vertical: bool, material: Material) -> void:
	for offset in [-0.68, 0.0, 0.68]:
		if vertical:
			_add_box(Vector3(0.0, 0.148, offset), Vector3(0.064, 0.018, 0.22), material, root)
		else:
			_add_box(Vector3(offset, 0.148, 0.0), Vector3(0.22, 0.018, 0.064), material, root)


func _add_road_edge_lines_local(root: Node3D, vertical: bool) -> void:
	pass


func _add_intersection_center_mark_local(root: Node3D, material: Material) -> void:
	_add_box(Vector3(0.0, 0.15, 0.0), Vector3(0.34, 0.018, 0.09), material, root)
	_add_box(Vector3(0.0, 0.15, 0.0), Vector3(0.09, 0.018, 0.34), material, root)
	for offset in [-0.72, 0.72]:
		_add_box(Vector3(offset, 0.15, 0.0), Vector3(0.22, 0.018, 0.08), material, root)
		_add_box(Vector3(0.0, 0.15, offset), Vector3(0.08, 0.018, 0.22), material, root)


func _add_road_finish_details(root: Node3D, vertical_straight: bool, horizontal_straight: bool, intersection: bool, north: bool, east: bool, south: bool, west: bool) -> void:
	if vertical_straight:
		if not north:
			_add_crosswalk_local(root, Vector3(0.0, 0.156, -1.08), false)
		if not south:
			_add_crosswalk_local(root, Vector3(0.0, 0.156, 1.08), false)
	elif horizontal_straight:
		if not west:
			_add_crosswalk_local(root, Vector3(-1.08, 0.156, 0.0), true)
		if not east:
			_add_crosswalk_local(root, Vector3(1.08, 0.156, 0.0), true)
	elif intersection:
		if north:
			_add_crosswalk_local(root, Vector3(0.0, 0.156, -1.32), false)
		if south:
			_add_crosswalk_local(root, Vector3(0.0, 0.156, 1.32), false)
		if west:
			_add_crosswalk_local(root, Vector3(-1.32, 0.156, 0.0), true)
		if east:
			_add_crosswalk_local(root, Vector3(1.32, 0.156, 0.0), true)


func _add_crosswalk_local(root: Node3D, center: Vector3, horizontal: bool) -> void:
	for stripe_index in range(4):
		var offset := (float(stripe_index) - 1.5) * 0.18
		if horizontal:
			_add_box(center + Vector3(offset, 0.0, 0.0), Vector3(0.075, 0.018, 0.42), _crosswalk_material, root)
		else:
			_add_box(center + Vector3(0.0, 0.0, offset), Vector3(0.42, 0.018, 0.075), _crosswalk_material, root)


func _add_road_surface_polish_local(root: Node3D, vertical_straight: bool, horizontal_straight: bool, intersection: bool, north: bool, east: bool, south: bool, west: bool) -> void:
	pass


func _add_asphalt_surface_variation_local(parent: Node, size: Vector2, y_position: float) -> void:
	var mid_material := _make_material("42474b", 0.99)
	var dark_material := _make_material("2d3135", 0.99)
	for patch in [
		{"pos": Vector2(-0.24, -0.28), "size": Vector2(0.42, 0.055), "rot": -8.0, "mat": mid_material},
		{"pos": Vector2(0.28, 0.2), "size": Vector2(0.34, 0.042), "rot": 12.0, "mat": dark_material},
		{"pos": Vector2(-0.05, 0.36), "size": Vector2(0.5, 0.032), "rot": 3.0, "mat": mid_material},
	]:
		var patch_pos: Vector2 = patch["pos"] * size
		var patch_size: Vector2 = patch["size"] * size
		var mark := _add_box(Vector3(patch_pos.x, y_position, patch_pos.y), Vector3(patch_size.x, 0.008, patch_size.y), patch["mat"], parent)
		mark.rotation_degrees.y = float(patch["rot"])


func _add_paved_stone_variation_local(parent: Node, size: Vector2, y_position: float) -> void:
	var warm_material := _make_material("e3dac6", 0.94)
	var cool_material := _make_material("c9c2b3", 0.96)
	for patch in [
		{"pos": Vector2(-0.28, -0.22), "size": Vector2(0.26, 0.035), "rot": -3.0, "mat": warm_material},
		{"pos": Vector2(0.2, 0.18), "size": Vector2(0.22, 0.04), "rot": 7.0, "mat": cool_material},
		{"pos": Vector2(0.0, -0.02), "size": Vector2(0.42, 0.026), "rot": 0.0, "mat": warm_material},
	]:
		var patch_pos: Vector2 = patch["pos"] * size
		var patch_size: Vector2 = patch["size"] * size
		var mark := _add_box(Vector3(patch_pos.x, y_position, patch_pos.y), Vector3(patch_size.x, 0.008, patch_size.y), patch["mat"], parent)
		mark.rotation_degrees.y = float(patch["rot"])


func _add_drain_grate_local(root: Node3D, center: Vector3, vertical: bool, material: Material) -> void:
	var grate_size := Vector3(0.22, 0.012, 0.08) if vertical else Vector3(0.08, 0.012, 0.22)
	_add_box(center, grate_size, material, root)
	for i in range(3):
		var offset := (float(i) - 1.0) * 0.055
		if vertical:
			_add_box(center + Vector3(offset, 0.008, 0.0), Vector3(0.012, 0.008, 0.08), _road_edge_highlight_material, root)
		else:
			_add_box(center + Vector3(0.0, 0.008, offset), Vector3(0.08, 0.008, 0.012), _road_edge_highlight_material, root)


func _add_sidewalk_paver_detail_local(root: Node3D, vertical_straight: bool, horizontal_straight: bool, intersection: bool) -> void:
	pass


func _road_in_source(cell: Vector2i, road_source: Array) -> bool:
	for item in road_source:
		if item == cell:
			return true
	return _road_cells.has(_cell_key(cell))


func _tool_rotation_y(tool: String, anchor: Vector2i, footprint: Vector2i, frontage_side_override: String = "") -> float:
	if tool == BUILD_TOOL_ROAD or not _tool_requires_road(tool):
		return 0.0

	var preferred_side := frontage_side_override if frontage_side_override != "" else _preferred_frontage_side(tool, anchor, footprint)
	var rotation := _rotation_for_side(preferred_side)
	return rotation + float(BUILDING_FRONT_ROTATION_OFFSETS.get(tool, 0.0))


func _transport_side_score(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> float:
	var side_center := _frontage_side_center(anchor, footprint, side)
	var adjacent_count := 0
	var nearest_distance := INF
	var min_offset := _frontage_transport_offset(tool)
	var max_offset := min_offset + 2
	match side:
		"north":
			for dx in range(footprint.x):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + dx, anchor.y - offset)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"south":
			for dx in range(footprint.x):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + offset)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"west":
			for dz in range(footprint.y):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x - offset, anchor.y + dz)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
		"east":
			for dz in range(footprint.y):
				for offset in range(min_offset, max_offset + 1):
					var candidate := Vector2i(anchor.x + footprint.x - 1 + offset, anchor.y + dz)
					if _road_cells.has(_cell_key(candidate)):
						nearest_distance = minf(nearest_distance, side_center.distance_to(Vector2(_cell_to_world(candidate).x, _cell_to_world(candidate).z)))
						if offset == min_offset:
							adjacent_count += 1
	if nearest_distance == INF:
		return -9999.0
	return float(adjacent_count) * 100.0 - nearest_distance


func _preferred_frontage_side(tool: String, anchor: Vector2i, footprint: Vector2i) -> String:
	var sides := ["south", "north", "east", "west"]
	var best_touch := -1
	var best_score := -INF
	var best_side := "south"
	for side in sides:
		var touch := _adjacent_transport_count(tool, anchor, footprint, side)
		var score := _transport_side_score(tool, anchor, footprint, side)
		if touch > best_touch:
			best_touch = touch
			best_score = score
			best_side = side
			continue
		if touch == best_touch and score > best_score:
			best_score = score
			best_side = side
	if best_touch > 0 or best_score > -9000.0:
		return best_side

	var center := _anchor_to_world(anchor, footprint)
	var to_center := Vector2(-center.x, -center.z)
	if abs(to_center.x) > abs(to_center.y):
		return "east" if to_center.x > 0.0 else "west"
	return "south" if to_center.y > 0.0 else "north"


func _rotation_for_side(side: String) -> float:
	return float(FRONTAGE_ROTATIONS.get(side, 0.0))


func _frontage_side_center(anchor: Vector2i, footprint: Vector2i, side: String) -> Vector2:
	var center := _anchor_to_world(anchor, footprint)
	match side:
		"north":
			return Vector2(center.x, center.z - float(footprint.y) * 0.5 - 0.5)
		"south":
			return Vector2(center.x, center.z + float(footprint.y) * 0.5 + 0.5)
		"west":
			return Vector2(center.x - float(footprint.x) * 0.5 - 0.5, center.z)
		"east":
			return Vector2(center.x + float(footprint.x) * 0.5 + 0.5, center.z)
	return Vector2(center.x, center.z)


func _rotation_toward_nearest_transport(anchor: Vector2i, footprint: Vector2i) -> Variant:
	if _road_cells.is_empty():
		return null
	var center := _anchor_to_world(anchor, footprint)
	var nearest_distance := INF
	var nearest_direction := Vector2.ZERO
	for road_key in _road_cells.keys():
		var road_cell := _anchor_key_to_cell(road_key)
		var road_world := _cell_to_world(road_cell)
		var offset := Vector2(road_world.x - center.x, road_world.z - center.z)
		var distance := offset.length()
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_direction = offset
	if nearest_distance == INF:
		return null
	if abs(nearest_direction.x) > abs(nearest_direction.y):
		return -PI * 0.5 if nearest_direction.x > 0.0 else PI * 0.5
	return 0.0 if nearest_direction.y > 0.0 else PI


func _adjacent_transport_count(tool: String, anchor: Vector2i, footprint: Vector2i, side: String) -> int:
	var count := 0
	var road_offset := _frontage_transport_offset(tool)
	match side:
		"north":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y - road_offset))):
					count += 1
		"south":
			for dx in range(footprint.x):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + dx, anchor.y + footprint.y - 1 + road_offset))):
					count += 1
		"west":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x - road_offset, anchor.y + dz))):
					count += 1
		"east":
			for dz in range(footprint.y):
				if _road_cells.has(_cell_key(Vector2i(anchor.x + footprint.x - 1 + road_offset, anchor.y + dz))):
					count += 1
	return count


func _add_house(center: Vector3, size: Vector3, wall_color: Color, roof_color: Color) -> void:
	var shell_material := _make_material_from_color(wall_color, 0.88)
	var roof_material := _make_material_from_color(roof_color, 0.76)

	var shell := _add_box(center, size, shell_material, building_root)
	var shell_top := center.y + size.y * 0.5

	var roof_a := _add_box(center + Vector3(0.0, size.y * 0.55 + 0.08, 0.12), Vector3(size.x + 0.1, 0.16, size.z * 0.52), roof_material, building_root)
	var roof_b := _add_box(center + Vector3(0.0, size.y * 0.55 + 0.08, -0.12), Vector3(size.x + 0.1, 0.16, size.z * 0.52), roof_material, building_root)
	roof_a.rotation_degrees = Vector3(0.0, 0.0, -6.0)
	roof_b.rotation_degrees = Vector3(0.0, 0.0, 6.0)

	var porch := _add_box(center + Vector3(0.0, -size.y * 0.32, size.z * 0.55), Vector3(size.x * 0.48, 0.12, 0.38), _sidewalk_material, building_root)
	porch.position.y = max(0.1, porch.position.y)
	_add_window_band(center + Vector3(0.0, 0.12, size.z * 0.52), Vector3(size.x * 0.58, 0.16, 0.05))
	_add_window_band(center + Vector3(size.x * 0.51, 0.16, 0.0), Vector3(0.05, 0.16, size.z * 0.32))
	_add_chimney(center + Vector3(size.x * 0.24, shell_top + 0.36, -size.z * 0.15))
	_add_planter(center + Vector3(size.x * 0.24, 0.1, size.z * 0.78))
	_add_planter(center + Vector3(-size.x * 0.24, 0.1, size.z * 0.78))

	shell.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON


func _add_shop(center: Vector3, size: Vector3, wall_color: Color, roof_color: Color, awning_color: Color) -> void:
	var shell_material := _make_material_from_color(wall_color, 0.84)
	var roof_material := _make_material_from_color(roof_color, 0.74)
	var awning_material := _make_material_from_color(awning_color, 0.48)

	_add_box(center, size, shell_material, building_root)
	_add_box(center + Vector3(0.0, size.y * 0.55 + 0.1, 0.0), Vector3(size.x + 0.08, 0.2, size.z + 0.08), roof_material, building_root)
	_add_box(center + Vector3(0.0, 0.18, size.z * 0.58), Vector3(size.x * 0.88, 0.08, 0.44), awning_material, building_root)
	_add_window_band(center + Vector3(0.0, 0.2, size.z * 0.54), Vector3(size.x * 0.7, 0.2, 0.05))
	_add_window_band(center + Vector3(-size.x * 0.34, 0.16, size.z * 0.54), Vector3(0.05, 0.26, 0.05))
	_add_window_band(center + Vector3(size.x * 0.34, 0.16, size.z * 0.54), Vector3(0.05, 0.26, 0.05))
	_add_sign(center + Vector3(0.0, 0.74, size.z * 0.58), Vector3(0.9, 0.18, 0.05))
	_add_planter(center + Vector3(-size.x * 0.32, 0.1, size.z * 0.82))
	_add_planter(center + Vector3(size.x * 0.32, 0.1, size.z * 0.82))


func _add_landmark(position_3d: Vector3) -> void:
	var base_material := _make_material("e5ebf1", 0.86)
	var roof_material := _make_material("5a7596", 0.76)

	_add_box(position_3d, Vector3(1.85, 1.24, 1.5), base_material, building_root)
	_add_box(position_3d + Vector3(0.0, 0.76, 0.0), Vector3(1.98, 0.22, 1.64), roof_material, building_root)
	_add_box(position_3d + Vector3(0.0, 1.28, 0.0), Vector3(0.5, 1.95, 0.5), base_material, building_root)

	var steeple := MeshInstance3D.new()
	var steeple_mesh := PrismMesh.new()
	steeple_mesh.left_to_right = 0.0
	steeple_mesh.size = Vector3(0.56, 0.85, 0.56)
	steeple.mesh = steeple_mesh
	steeple.material_override = roof_material
	steeple.position = position_3d + Vector3(0.0, 2.58, 0.0)
	steeple.rotation_degrees = Vector3(0.0, 45.0, 0.0)
	building_root.add_child(steeple)

	_add_window_band(position_3d + Vector3(0.0, 0.24, 0.78), Vector3(0.26, 0.5, 0.05))
	_add_window_band(position_3d + Vector3(-0.48, 0.16, 0.78), Vector3(0.18, 0.24, 0.05))
	_add_window_band(position_3d + Vector3(0.48, 0.16, 0.78), Vector3(0.18, 0.24, 0.05))
	_add_plaza(position_3d + Vector3(0.0, -0.44, 0.24), Vector2(2.5, 2.2))
	_add_planter(position_3d + Vector3(-0.82, 0.08, 0.86))
	_add_planter(position_3d + Vector3(0.82, 0.08, 0.86))


func _add_plaza(center: Vector3, size: Vector2) -> void:
	var plaza_material := _make_material("eef4f5", 0.84)
	_add_box(center, Vector3(size.x, 0.05, size.y), plaza_material, grid_root)


func _add_tree(position_3d: Vector3) -> void:
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_register_nature_feature(root, 0.78)
	_add_shadow_disc_local(Vector3(0.0, 0.01, 0.0), Vector2(0.9, 0.7), 0.18, root)
	_add_local_cylinder(Vector3(0.0, 0.18, 0.0), 0.15, 0.18, 0.18, _trunk_material, root)
	_add_local_cylinder(Vector3(0.0, 0.44, 0.0), 0.1, 0.075, 0.72, _trunk_material, root)
	var left_branch := _add_box(Vector3(-0.09, 0.7, 0.02), Vector3(0.08, 0.28, 0.06), _trunk_material, root)
	left_branch.rotation_degrees.z = -18.0
	var right_branch := _add_box(Vector3(0.1, 0.72, -0.02), Vector3(0.07, 0.24, 0.06), _trunk_material, root)
	right_branch.rotation_degrees.z = 20.0
	_add_local_sphere(Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material, root)
	_add_local_sphere(Vector3(-0.24, 0.84, 0.0), 0.36, 0.66, _leaf_material_light, root)
	_add_local_sphere(Vector3(0.24, 0.84, -0.08), 0.32, 0.58, _leaf_material_dark, root)
	_add_local_sphere(Vector3(0.08, 1.13, -0.06), 0.26, 0.4, _leaf_material_light, root)
	_add_local_sphere(Vector3(-0.02, 0.74, 0.12), 0.3, 0.36, _leaf_material_dark, root)
	_add_tree_detail_local(Vector3.ZERO, root)


func _add_grass_clump(position_3d: Vector3, scale_factor: float) -> void:
	var clump := Node3D.new()
	clump.position = position_3d
	clump.rotation_degrees.y = randf_range(0.0, 180.0)
	clump.set_meta("phase", randf_range(0.0, TAU))
	clump.set_meta("sway", randf_range(0.8, 1.3))
	_nature_root.add_child(clump)
	_grass_clumps.append(clump)

	for blade_data in [
		{"pos": Vector3(-0.08, 0.17, 0.0), "rot": -10.0, "size": Vector3(0.06, 0.38, 0.02)},
		{"pos": Vector3(0.02, 0.2, 0.03), "rot": 7.0, "size": Vector3(0.06, 0.44, 0.02)},
		{"pos": Vector3(0.1, 0.15, -0.02), "rot": 14.0, "size": Vector3(0.05, 0.32, 0.02)},
		{"pos": Vector3(-0.02, 0.16, -0.08), "rot": -18.0, "size": Vector3(0.05, 0.3, 0.02)}
	]:
		var blade := _add_box(blade_data.pos * scale_factor, blade_data.size * scale_factor, _grass_blade_material, clump)
		blade.rotation_degrees.z = blade_data.rot


func _add_park_corner(position_3d: Vector3) -> void:
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_register_nature_feature(root, 1.08)
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(1.8, 0.05, 1.8), _make_material("eef4f5", 0.84), root)
	_add_ellipse_disc_local(Vector3(0.0, 0.055, 0.0), Vector2(1.34, 1.16), 0.025, _make_material("9caf78", 0.98), root, 18.0)
	_add_box(Vector3(0.0, 0.08, 0.0), Vector3(1.48, 0.024, 0.14), _make_material("d9cbb7", 0.9), root)
	_add_box(Vector3(0.0, 0.082, 0.0), Vector3(0.14, 0.024, 1.28), _make_material("d9cbb7", 0.9), root)
	_add_park_fountain_local(Vector3(0.0, 0.09, 0.04), root)
	_add_local_tree(Vector3(-0.55, 0.0, -0.1), root)
	_add_local_tree(Vector3(0.52, 0.0, 0.28), root)
	_add_bench_local(Vector3(0.0, 0.06, -0.58), 0.0, root)
	_add_box(Vector3(-0.62, 0.1, 0.58), Vector3(0.42, 0.08, 0.12), _make_material("a57649", 0.72), root)
	_add_local_flower_patch(Vector3(0.58, 0.08, -0.55), 4, _flower_material_pink, root)


func _add_planter(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.22, 0.14, 0.22), _stone_material, building_root)
	_add_sphere(position_3d + Vector3(0.0, 0.18, 0.0), 0.14, 0.2, _leaf_material)


func _add_park_fountain_local(position_3d: Vector3, parent: Node) -> void:
	var basin_material := _make_material("d8d4c8", 0.88)
	var water_material := _make_transparent_material(Color("aee0eb"), 0.24, 0.38)
	_add_ellipse_disc_local(position_3d + Vector3(0.0, 0.0, 0.0), Vector2(0.44, 0.44), 0.08, basin_material, parent, 0.0)
	_add_ellipse_disc_local(position_3d + Vector3(0.0, 0.052, 0.0), Vector2(0.32, 0.32), 0.02, water_material, parent, 0.0)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.16, 0.0), 0.045, 0.06, 0.18, basin_material, parent)
	_add_local_sphere(position_3d + Vector3(0.0, 0.28, 0.0), 0.08, 0.08, water_material, parent)


func _add_flower_patch(center: Vector3, count: int, material: StandardMaterial3D) -> void:
	var root := Node3D.new()
	root.position = center
	_nature_root.add_child(root)
	_register_nature_feature(root, 0.48)
	_add_wildflower_cluster(Vector3.ZERO, count, material, root, 0.1)


func _add_flower_box_local(position_3d: Vector3, color: Color, parent: Node) -> void:
	var box_material := _make_material("9f7b56", 0.78)
	_add_box(position_3d, Vector3(0.22, 0.08, 0.12), box_material, parent)
	for i in range(3):
		var offset := (float(i) - 1.0) * 0.05
		_add_box(position_3d + Vector3(offset, 0.08, 0.0), Vector3(0.05, 0.08, 0.05), _make_material_from_color(color, 0.8), parent)


func _add_garden_path(parent: Node, width: float, depth: float) -> void:
	var stone := _make_material("d9cbb7", 0.9)
	for step_index in range(3):
		var z := 0.78 + float(step_index) * (depth / 3.3)
		_add_box(Vector3(0.0, 0.03, z), Vector3(width, 0.03, 0.14), stone, parent)


func _add_picket_fence(parent: Node, center: Vector3, width: float) -> void:
	var fence_material := _make_material("efe3cf", 0.86)
	_add_box(center + Vector3(0.0, 0.14, 0.0), Vector3(width, 0.06, 0.04), fence_material, parent)
	for post_index in range(5):
		var t := float(post_index) / 4.0
		var x: float = lerpf(-width * 0.5, width * 0.5, t)
		_add_box(center + Vector3(x, 0.24, 0.0), Vector3(0.04, 0.26, 0.04), fence_material, parent)


func _add_dormer(position_3d: Vector3, wall_color: Color, roof_color: Color, parent: Node) -> void:
	_add_soft_block(position_3d + Vector3(0.0, 0.12, 0.0), Vector3(0.24, 0.24, 0.2), _make_material_from_color(wall_color, 0.88), parent, 0.06)
	_add_gabled_roof(position_3d + Vector3(0.0, 0.28, 0.0), Vector3(0.3, 0.08, 0.26), _make_material_from_color(roof_color, 0.74), parent, 8.0)
	_add_box(position_3d + Vector3(0.0, 0.12, 0.12), Vector3(0.1, 0.14, 0.04), _window_material, parent)


func _add_service_steps(parent: Node, z_position: float, width: float) -> void:
	var step_material := _make_material("d4c5ad", 0.9)
	_add_box(Vector3(0.0, 0.04, z_position), Vector3(width, 0.04, 0.2), step_material, parent)
	_add_box(Vector3(0.0, 0.08, z_position - 0.12), Vector3(width * 0.88, 0.04, 0.16), step_material, parent)


func _add_front_lanterns(parent: Node, z_position: float, width: float) -> void:
	for side in [-1.0, 1.0]:
		var lamp_x: float = side * width * 0.5
		_add_lantern_glow_local(Vector3(lamp_x, 0.88, z_position), parent)


func _add_house_front_lamp_local(position_3d: Vector3, parent: Node, preview: bool = false) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = position_3d
	parent.add_child(lamp_root)
	var pole_material := _ghost_base_material if preview else _make_material("f3eee5", 0.86)
	_add_local_cylinder(Vector3(0.0, 0.72, 0.0), 0.035, 0.035, 1.42, pole_material, lamp_root)
	_add_lamp_fixture_local(Vector3.ZERO, lamp_root, preview, true)
	if not preview:
		_add_lantern_glow_local(Vector3(0.0, 1.42, 0.0), lamp_root)


func _add_house_front_door_local(position_3d: Vector3, parent: Node, preview: bool = false) -> void:
	var door_root := Node3D.new()
	door_root.position = position_3d
	parent.add_child(door_root)
	var frame_material := _ghost_base_material if preview else _make_material("e8dccb", 0.88)
	var door_material := _ghost_accent_material if preview else _make_material("7d5437", 0.7)
	var threshold_material := _ghost_base_material if preview else _make_material("d8c7ab", 0.92)
	var brass_material := _ghost_accent_material if preview else _make_material("c29c67", 0.54)
	_add_box(Vector3(0.0, 0.44, 0.0), Vector3(0.34, 0.78, 0.08), frame_material, door_root)
	_add_box(Vector3(0.0, 0.34, 0.03), Vector3(0.18, 0.56, 0.04), door_material, door_root)
	_add_box(Vector3(0.0, 0.58, 0.04), Vector3(0.08, 0.08, 0.03), brass_material, door_root)
	_add_box(Vector3(0.0, 0.76, 0.04), Vector3(0.14, 0.08, 0.03), _ghost_base_material if preview else _window_material, door_root)
	_add_box(Vector3(0.0, 0.08, 0.14), Vector3(0.42, 0.04, 0.22), threshold_material, door_root)


func _add_house_entry_canopy_local(position_3d: Vector3, parent: Node, preview: bool = false, width: float = 0.76) -> void:
	var canopy_root := Node3D.new()
	canopy_root.position = position_3d
	parent.add_child(canopy_root)
	var roof_material := _ghost_base_material if preview else _make_material("bca58a", 0.82)
	var post_material := _ghost_base_material if preview else _make_material("efe3cf", 0.86)
	_add_box(Vector3(0.0, 0.8, 0.0), Vector3(width, 0.06, 0.18), roof_material, canopy_root)
	_add_box(Vector3(-width * 0.34, 0.42, 0.0), Vector3(0.05, 0.42, 0.05), post_material, canopy_root)
	_add_box(Vector3(width * 0.34, 0.42, 0.0), Vector3(0.05, 0.42, 0.05), post_material, canopy_root)
	_add_box(Vector3(0.0, 0.06, 0.08), Vector3(width * 0.68, 0.04, 0.18), _ghost_base_material if preview else _make_material("d9cbb7", 0.9), canopy_root)


func _add_house_entry_steps_local(position_3d: Vector3, parent: Node, preview: bool = false, width: float = 0.56) -> void:
	var step_material := _ghost_base_material if preview else _make_material("d8c7ab", 0.9)
	_add_box(position_3d + Vector3(0.0, 0.04, 0.0), Vector3(width, 0.04, 0.22), step_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.08, 0.12), Vector3(width * 0.82, 0.04, 0.16), step_material, parent)


func _add_lot_sidewalk_connector(parent: Node, width: float = 0.72, z_position: float = 1.32, depth: float = 0.94) -> void:
	_add_box(Vector3(0.0, 0.058, z_position), Vector3(width, 0.035, depth), _sidewalk_material, parent)
	_add_box(Vector3(-width * 0.52, 0.078, z_position), Vector3(0.055, 0.028, depth * 0.88), _make_material("eee8dc", 0.92), parent)
	_add_box(Vector3(width * 0.52, 0.078, z_position), Vector3(0.055, 0.028, depth * 0.88), _make_material("eee8dc", 0.92), parent)


func _add_lot_hedge_edges(parent: Node, width: float, depth: float, color: Color = Color("6fa85b")) -> void:
	var hedge_material := _make_material_from_color(color, 0.96)
	var cap_material := _make_material_from_color(color.lightened(0.16), 0.92)
	for side_x in [-1.0, 1.0]:
		_add_box(Vector3(side_x * width * 0.47, 0.12, -0.08), Vector3(0.12, 0.22, depth * 0.62), hedge_material, parent)
		for z in [-depth * 0.24, 0.0, depth * 0.24]:
			_add_local_sphere(Vector3(side_x * width * 0.47, 0.26, z), 0.1, 0.14, cap_material, parent)
	for x in [-width * 0.28, width * 0.28]:
		_add_box(Vector3(x, 0.12, -depth * 0.46), Vector3(width * 0.28, 0.2, 0.1), hedge_material, parent)


func _add_window_planter_local(parent: Node, position_3d: Vector3, width: float, accent: Color) -> void:
	var box_material := _make_material("9f7b56", 0.8)
	var leaf_material := _make_material_from_color(accent.lightened(0.12), 0.9)
	_add_box(position_3d, Vector3(width, 0.08, 0.09), box_material, parent)
	for i in range(3):
		var x := (float(i) - 1.0) * width * 0.28
		_add_local_sphere(position_3d + Vector3(x, 0.075, 0.0), width * 0.12, 0.08, leaf_material, parent)


func _add_bollard_row_local(parent: Node, z_position: float, width: float, count: int = 4, color: Color = Color("f1d072")) -> void:
	var bollard_material := _make_material_from_color(color, 0.74)
	var cap_material := _make_material("fff4df", 0.82)
	for i in range(count):
		var t := 0.5 if count <= 1 else float(i) / float(count - 1)
		var x := lerpf(-width * 0.5, width * 0.5, t)
		_add_local_cylinder(Vector3(x, 0.18, z_position), 0.04, 0.045, 0.36, bollard_material, parent)
		_add_box(Vector3(x, 0.38, z_position), Vector3(0.09, 0.035, 0.09), cap_material, parent)


func _add_cart_rack_local(parent: Node, position_3d: Vector3, rotation_y: float = 0.0) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	var metal := _make_material("c7d0d2", 0.78)
	var handle := _make_material("4d5962", 0.88)
	_add_box(Vector3(0.0, 0.18, 0.0), Vector3(0.44, 0.08, 0.28), metal, root)
	for x in [-0.18, 0.18]:
		_add_box(Vector3(x, 0.3, 0.0), Vector3(0.035, 0.28, 0.34), metal, root)
	for z in [-0.13, 0.13]:
		_add_box(Vector3(0.0, 0.32, z), Vector3(0.5, 0.035, 0.035), handle, root)


func _add_trash_can_local(parent: Node, position_3d: Vector3, color: Color = Color("4b6778")) -> void:
	var can_material := _make_material_from_color(color, 0.86)
	var lid_material := _make_material_from_color(color.lightened(0.18), 0.82)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.18, 0.0), 0.11, 0.1, 0.36, can_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.38, 0.0), Vector3(0.26, 0.045, 0.26), lid_material, parent)


func _add_outdoor_table_local(parent: Node, position_3d: Vector3, accent: Color) -> void:
	var table_material := _make_material_from_color(accent.lightened(0.08), 0.76)
	var chair_material := _make_material("a57649", 0.76)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.19, 0.0), 0.16, 0.16, 0.04, table_material, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.09, 0.0), 0.025, 0.025, 0.18, _make_material("5b5149", 0.88), parent)
	for angle in [0.0, 120.0, 240.0]:
		var dir := Vector3(cos(deg_to_rad(angle)), 0.0, sin(deg_to_rad(angle)))
		_add_box(position_3d + dir * 0.26 + Vector3(0.0, 0.12, 0.0), Vector3(0.16, 0.07, 0.14), chair_material, parent)


func _add_small_parked_car_local(parent: Node, position_3d: Vector3, rotation_y: float, color: Color) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	var body := _make_material_from_color(color, 0.68)
	var glass := _make_transparent_material(Color("bfe6ff"), 0.24, 0.28)
	var tire := _make_material("26252b", 0.98)
	_add_soft_block(Vector3(0.0, 0.16, 0.0), Vector3(0.42, 0.18, 0.72), body, root, 0.06)
	_add_box(Vector3(0.0, 0.3, -0.06), Vector3(0.3, 0.12, 0.32), glass, root)
	for x in [-0.21, 0.21]:
		for z in [-0.24, 0.24]:
			var wheel := _add_local_cylinder(Vector3(x, 0.08, z), 0.055, 0.055, 0.045, tire, root)
			wheel.rotation_degrees.z = 90.0


func _add_frontage_detail_cluster(parent: Node, width: float, z_position: float, accent: Color, kind: String) -> void:
	var pad_width: float = maxf(0.82, width * 0.46)
	_add_town_path(Vector3(0.0, 0.03, z_position), Vector2(pad_width, 0.34), parent)
	_add_service_steps(parent, z_position + 0.08, width * 0.48)
	_add_front_lanterns(parent, z_position + 0.2, width * 0.56)
	_add_signboard_local(Vector3(0.0, 0.98, z_position + 0.24), Vector2(maxf(0.78, width * 0.34), 0.16), accent, kind, parent)


func _add_fire_truck_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var root := Node3D.new()
	root.position = position_3d
	root.rotation.y = rotation_y
	parent.add_child(root)
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), Vector2(0.52, 0.92), 0.18, root)
	var body_material := _make_material("c85243", 0.76)
	var cab_material := _make_material("f2efe5", 0.88)
	var stripe_material := _make_material("f1d072", 0.84)
	var tire_material := _make_material("26252b", 0.98)
	_add_soft_block(Vector3(0.0, 0.14, 0.0), Vector3(0.5, 0.16, 0.86), body_material, root, 0.06)
	_add_soft_block(Vector3(0.0, 0.24, -0.2), Vector3(0.38, 0.12, 0.32), cab_material, root, 0.05)
	_add_box(Vector3(0.0, 0.18, 0.26), Vector3(0.3, 0.04, 0.04), stripe_material, root)
	_add_box(Vector3(0.0, 0.26, -0.38), Vector3(0.22, 0.03, 0.08), stripe_material, root)
	for wheel_data in [
		Vector3(-0.18, 0.07, -0.3),
		Vector3(0.18, 0.07, -0.3),
		Vector3(-0.18, 0.07, 0.32),
		Vector3(0.18, 0.07, 0.32),
	]:
		var wheel := _add_local_cylinder(wheel_data, 0.055, 0.055, 0.04, tire_material, root)
		wheel.rotation_degrees.z = 90.0


func _add_fire_parking_lot(center: Vector3, size: Vector3, parent: Node) -> void:
	var lot_root := Node3D.new()
	lot_root.position = center
	parent.add_child(lot_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 0.98, size.z * 0.92), 0.1, lot_root)
	var apron_material := _make_material("d8d2c8", 0.94)
	var asphalt_material := _make_material("6f767f", 0.96)
	var curb_material := _make_material("ece7dd", 0.92)
	var line_material := _make_material("f1d072", 0.94)
	var stop_material := _make_material("f6d36e", 0.9)
	_add_box(Vector3(0.0, 0.02, 0.0), Vector3(size.x + 0.18, 0.026, size.z + 0.16), apron_material, lot_root)
	_add_box(Vector3(0.0, 0.052, 0.0), Vector3(size.x, 0.034, size.z), asphalt_material, lot_root)
	_add_asphalt_surface_variation_local(lot_root, Vector2(size.x * 0.82, size.z * 0.72), 0.084)
	_add_box(Vector3(0.0, 0.08, -size.z * 0.5 + 0.055), Vector3(size.x * 0.96, 0.014, 0.07), curb_material, lot_root)
	_add_box(Vector3(-size.x * 0.5 + 0.055, 0.08, 0.0), Vector3(0.07, 0.014, size.z * 0.84), curb_material, lot_root)
	_add_box(Vector3(size.x * 0.5 - 0.055, 0.08, 0.0), Vector3(0.07, 0.014, size.z * 0.84), curb_material, lot_root)
	for lane_x in [-size.x * 0.24, 0.0, size.x * 0.24]:
		_add_box(Vector3(lane_x, 0.095, 0.0), Vector3(0.04, 0.012, size.z * 0.72), line_material, lot_root)
	for stop_x in [-size.x * 0.24, 0.0, size.x * 0.24]:
		_add_box(Vector3(stop_x, 0.112, size.z * 0.26), Vector3(0.42, 0.035, 0.055), stop_material, lot_root)
	_add_fire_truck_local(Vector3(size.x * 0.28, 0.016, -0.03), 0.0, lot_root)


func _add_grocery_parking_lot(center: Vector3, size: Vector3, parent: Node) -> void:
	var lot_root := Node3D.new()
	lot_root.position = center
	parent.add_child(lot_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.02), Vector2(size.x * 0.96, size.z * 0.92), 0.12, lot_root)
	var sidewalk_material := _make_material("ddd5c3", 0.94)
	var asphalt_material := _make_material("626b72", 0.97)
	var line_material := _make_material("f7f2df", 0.92)
	var curb_material := _make_material("eee8dc", 0.92)
	var stop_material := _make_material("d9c991", 0.88)
	var accessible_material := _make_material("577da7", 0.82)
	var planter_material := _make_material("799557", 0.86)
	_add_box(Vector3(0.0, 0.032, 0.0), Vector3(size.x + 0.2, 0.026, size.z + 0.18), sidewalk_material, lot_root)
	_add_box(Vector3(0.0, 0.058, 0.02), Vector3(size.x, 0.034, size.z), asphalt_material, lot_root)
	_add_asphalt_surface_variation_local(lot_root, Vector2(size.x * 0.82, size.z * 0.68), 0.092)
	_add_box(Vector3(0.0, 0.084, -size.z * 0.5 + 0.055), Vector3(size.x * 0.96, 0.014, 0.07), curb_material, lot_root)
	_add_box(Vector3(0.0, 0.084, size.z * 0.5 - 0.055), Vector3(size.x * 0.96, 0.014, 0.07), curb_material, lot_root)
	_add_box(Vector3(-size.x * 0.5 + 0.055, 0.084, 0.0), Vector3(0.07, 0.014, size.z * 0.86), curb_material, lot_root)
	_add_box(Vector3(size.x * 0.5 - 0.055, 0.084, 0.0), Vector3(0.07, 0.014, size.z * 0.86), curb_material, lot_root)

	var accessible_x := -size.x * 0.39
	_add_box(Vector3(accessible_x, 0.09, -0.08), Vector3(0.52, 0.012, size.z * 0.58), accessible_material, lot_root)
	_add_box(Vector3(accessible_x, 0.104, -0.08), Vector3(0.28, 0.014, 0.035), line_material, lot_root)
	_add_box(Vector3(accessible_x, 0.104, 0.0), Vector3(0.035, 0.014, 0.28), line_material, lot_root)
	for hatch_index in range(5):
		var hatch := _add_box(Vector3(accessible_x + 0.38, 0.106, -0.32 + float(hatch_index) * 0.16), Vector3(0.035, 0.012, 0.52), line_material, lot_root)
		hatch.rotation_degrees.y = -28.0

	var parking_left := -size.x * 0.22
	var parking_right := size.x * 0.42
	for stall_index in range(6):
		var t := float(stall_index) / 5.0
		var x := lerpf(parking_left, parking_right, t)
		_add_box(Vector3(x, 0.1, -0.05), Vector3(0.035, 0.012, size.z * 0.62), line_material, lot_root)
	for stop_index in range(5):
		var t := (float(stop_index) + 0.5) / 5.0
		var x := lerpf(parking_left, parking_right, t)
		_add_box(Vector3(x, 0.116, -size.z * 0.3), Vector3(0.34, 0.035, 0.055), stop_material, lot_root)
	_add_box(Vector3((parking_left + parking_right) * 0.5, 0.102, size.z * 0.2), Vector3(parking_right - parking_left, 0.012, 0.045), line_material, lot_root)
	_add_box(Vector3(-size.x * 0.5 + 0.18, 0.12, size.z * 0.38), Vector3(0.18, 0.12, 0.28), planter_material, lot_root)
	_add_box(Vector3(size.x * 0.5 - 0.18, 0.12, size.z * 0.38), Vector3(0.18, 0.12, 0.28), planter_material, lot_root)


func _add_bank_forecourt(center: Vector3, size: Vector3, parent: Node, accent: Color, trim: Color) -> void:
	var court_root := Node3D.new()
	court_root.position = center
	parent.add_child(court_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 0.96, size.z * 0.9), 0.1, court_root)
	var stone_material := _make_material("d9d1bd", 0.94)
	var curb_material := _make_material("f0eadf", 0.92)
	var line_material := _make_material_from_color(trim.lightened(0.2), 0.82)
	var accent_material := _make_material_from_color(accent, 0.48)
	_add_box(Vector3(0.0, 0.036, 0.0), Vector3(size.x, 0.034, size.z), stone_material, court_root)
	_add_paved_stone_variation_local(court_root, Vector2(size.x * 0.82, size.z * 0.72), 0.07)
	_add_box(Vector3(0.0, 0.064, -size.z * 0.5 + 0.05), Vector3(size.x * 0.94, 0.014, 0.07), curb_material, court_root)
	_add_box(Vector3(0.0, 0.064, size.z * 0.5 - 0.05), Vector3(size.x * 0.94, 0.014, 0.07), curb_material, court_root)
	_add_box(Vector3(-size.x * 0.5 + 0.05, 0.064, 0.0), Vector3(0.07, 0.014, size.z * 0.82), curb_material, court_root)
	_add_box(Vector3(size.x * 0.5 - 0.05, 0.064, 0.0), Vector3(0.07, 0.014, size.z * 0.82), curb_material, court_root)
	_add_box(Vector3(0.0, 0.08, 0.0), Vector3(size.x * 0.42, 0.014, 0.06), accent_material, court_root)
	for mark_x in [-size.x * 0.26, 0.0, size.x * 0.26]:
		_add_box(Vector3(mark_x, 0.082, size.z * 0.16), Vector3(0.035, 0.012, size.z * 0.34), line_material, court_root)
		_add_box(Vector3(mark_x, 0.094, -size.z * 0.28), Vector3(0.28, 0.03, 0.05), accent_material, court_root)


func _add_restaurant_parking_court(center: Vector3, size: Vector3, parent: Node, accent: Color, trim: Color) -> void:
	var court_root := Node3D.new()
	court_root.position = center
	parent.add_child(court_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 0.96, size.z * 0.92), 0.1, court_root)
	var paving_material := _make_material("5f676c", 0.97)
	var patio_material := _make_material("d7c5ac", 0.92)
	var curb_material := _make_material("ece4d6", 0.92)
	var line_material := _make_material("f7f2df", 0.92)
	var stop_material := _make_material_from_color(accent.lightened(0.15), 0.82)
	_add_box(Vector3(0.0, 0.034, 0.0), Vector3(size.x + 0.16, 0.026, size.z + 0.14), curb_material, court_root)
	_add_box(Vector3(0.0, 0.058, -size.z * 0.06), Vector3(size.x, 0.034, size.z * 0.82), paving_material, court_root)
	_add_asphalt_surface_variation_local(court_root, Vector2(size.x * 0.82, size.z * 0.55), 0.092)
	_add_box(Vector3(0.0, 0.084, size.z * 0.34), Vector3(size.x * 0.9, 0.018, size.z * 0.24), patio_material, court_root)
	for stall_index in range(4):
		var t := float(stall_index) / 3.0
		var x := lerpf(-size.x * 0.32, size.x * 0.32, t)
		_add_box(Vector3(x, 0.098, -size.z * 0.1), Vector3(0.035, 0.012, size.z * 0.48), line_material, court_root)
	for stop_index in range(3):
		var t := (float(stop_index) + 0.5) / 3.0
		var x := lerpf(-size.x * 0.32, size.x * 0.32, t)
		_add_box(Vector3(x, 0.112, -size.z * 0.32), Vector3(0.32, 0.032, 0.05), stop_material, court_root)
	_add_box(Vector3(0.0, 0.104, size.z * 0.22), Vector3(size.x * 0.68, 0.012, 0.04), _make_material_from_color(trim, 0.72), court_root)


func _add_corner_store_parking_lot(center: Vector3, size: Vector3, parent: Node, accent: Color, trim: Color) -> void:
	var lot_root := Node3D.new()
	lot_root.position = center
	parent.add_child(lot_root)
	_add_shadow_disc_local(Vector3(0.0, 0.0, 0.0), Vector2(size.x * 0.96, size.z * 0.9), 0.1, lot_root)
	var asphalt_material := _make_material("626a70", 0.97)
	var curb_material := _make_material("ece5d8", 0.92)
	var line_material := _make_material("f7f2df", 0.92)
	var stop_material := _make_material_from_color(accent.lightened(0.12), 0.84)
	var planter_material := _make_material_from_color(trim, 0.86)
	_add_box(Vector3(0.0, 0.034, 0.0), Vector3(size.x + 0.12, 0.026, size.z + 0.12), curb_material, lot_root)
	_add_box(Vector3(0.0, 0.058, 0.0), Vector3(size.x, 0.034, size.z), asphalt_material, lot_root)
	_add_asphalt_surface_variation_local(lot_root, Vector2(size.x * 0.78, size.z * 0.68), 0.092)
	for line_x in [-size.x * 0.22, size.x * 0.22]:
		_add_box(Vector3(line_x, 0.096, 0.0), Vector3(0.034, 0.012, size.z * 0.62), line_material, lot_root)
	for stop_x in [-size.x * 0.11, size.x * 0.34]:
		_add_box(Vector3(stop_x, 0.112, -size.z * 0.28), Vector3(0.26, 0.032, 0.05), stop_material, lot_root)
	for hatch_index in range(4):
		var hatch := _add_box(Vector3(-size.x * 0.42, 0.1, -0.24 + float(hatch_index) * 0.14), Vector3(0.03, 0.012, 0.36), line_material, lot_root)
		hatch.rotation_degrees.y = -28.0
	_add_box(Vector3(size.x * 0.44, 0.1, size.z * 0.32), Vector3(0.16, 0.1, 0.22), planter_material, lot_root)


func _variant_sign_kind(tool: String, variant_id: String) -> String:
	match tool:
		BUILD_TOOL_FIRE:
			match variant_id:
				"modern_civic_station":
					return "fire_civic"
				"volunteer_station":
					return "fire_volunteer"
				"industrial_emergency_station":
					return "fire_rescue"
				_:
					return "fire"
		BUILD_TOOL_GROCERY:
			match variant_id:
				"local_market":
					return "local_market"
				"warehouse_grocery":
					return "warehouse_market"
				"organic_market":
					return "organic_market"
				_:
					return "grocer"
		BUILD_TOOL_RESTAURANT:
			match variant_id:
				"fast_food_drive_through":
					return "fast_food"
				"modern_cafe":
					return "cafe"
				"family_restaurant":
					return "grill"
				"upscale_restaurant":
					return "fine_dining"
				"food_truck_court":
					return "food_court"
				"upscale_patio_restaurant":
					return "bistro"
				_:
					return "diner"
		BUILD_TOOL_CORNER_STORE:
			match variant_id:
				"convenience_store_no_pumps":
					return "corner_canopy"
				"urban_corner_shop":
					return "corner_shop"
				"modern_mini_mart":
					return "mini_mart"
				_:
					return "quick_mart"
		_:
			return ""


func _add_signboard_local(position_3d: Vector3, size: Vector2, accent: Color, kind: String, parent: Node) -> void:
	var sign_material := _make_material_from_color(accent.darkened(0.25), 0.5)
	var trim_material := _make_material("f4ecda", 0.84)
	_add_box(position_3d, Vector3(size.x, size.y, 0.06), sign_material, parent)
	_add_box(position_3d + Vector3(0.0, 0.0, 0.04), Vector3(size.x * 0.82, size.y * 0.22, 0.02), trim_material, parent)
	_add_sign_text_label_local(position_3d + Vector3(0.0, 0.0, 0.075), size, kind, parent)
	match kind:
		"badge":
			_add_local_sphere(position_3d + Vector3(0.0, 0.0, 0.05), 0.06, 0.08, trim_material, parent)
		"fire":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.12, 0.12, 0.02), trim_material, parent)
		"vault":
			_add_local_cylinder(position_3d + Vector3(0.0, 0.0, 0.05), 0.06, 0.06, 0.04, trim_material, parent)
		"grocer":
			_add_box(position_3d + Vector3(-0.08, 0.0, 0.05), Vector3(0.08, 0.08, 0.02), _make_material("c95d49", 0.82), parent)
			_add_box(position_3d + Vector3(0.08, 0.0, 0.05), Vector3(0.08, 0.08, 0.02), _make_material("7da85b", 0.82), parent)
		"bistro":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.18, 0.06, 0.02), trim_material, parent)
		"diner":
			_add_box(position_3d + Vector3(-0.08, 0.0, 0.05), Vector3(0.06, 0.1, 0.02), trim_material, parent)
			_add_box(position_3d + Vector3(0.04, 0.0, 0.05), Vector3(0.16, 0.05, 0.02), trim_material, parent)
		"fast_food":
			_add_local_sphere(position_3d + Vector3(-0.07, 0.0, 0.05), 0.05, 0.025, _make_material("f1d072", 0.7), parent)
			_add_box(position_3d + Vector3(0.06, 0.0, 0.05), Vector3(0.14, 0.045, 0.02), trim_material, parent)
		"cafe":
			_add_local_cylinder(position_3d + Vector3(-0.04, 0.0, 0.05), 0.055, 0.055, 0.025, trim_material, parent)
			_add_box(position_3d + Vector3(0.06, -0.01, 0.05), Vector3(0.06, 0.035, 0.02), trim_material, parent)
		"pizza":
			_add_box(position_3d + Vector3(0.0, -0.01, 0.05), Vector3(0.16, 0.08, 0.02), trim_material, parent)
			_add_box(position_3d + Vector3(0.0, 0.04, 0.055), Vector3(0.08, 0.04, 0.02), _make_material("c95d49", 0.82), parent)
		"grill":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.18, 0.035, 0.02), trim_material, parent)
			_add_box(position_3d + Vector3(-0.06, 0.04, 0.05), Vector3(0.025, 0.08, 0.02), trim_material, parent)
			_add_box(position_3d + Vector3(0.06, 0.04, 0.05), Vector3(0.025, 0.08, 0.02), trim_material, parent)
		"fine_dining":
			_add_local_sphere(position_3d + Vector3(0.0, 0.0, 0.05), 0.065, 0.026, trim_material, parent)
			_add_box(position_3d + Vector3(0.0, -0.045, 0.055), Vector3(0.12, 0.028, 0.02), _make_material("f1d072", 0.7), parent)
		"food_court":
			for x in [-0.09, 0.0, 0.09]:
				_add_box(position_3d + Vector3(x, 0.0, 0.05), Vector3(0.045, 0.08, 0.02), trim_material, parent)
		"corner":
			_add_box(position_3d + Vector3(0.0, 0.0, 0.05), Vector3(0.14, 0.08, 0.02), trim_material, parent)


func _add_sign_text_label_local(position_3d: Vector3, size: Vector2, kind: String, parent: Node) -> void:
	var text := _sign_text_for_kind(kind)
	if text == "":
		return
	var label := Label3D.new()
	label.text = text
	label.position = position_3d
	label.pixel_size = 0.008
	label.font_size = 28
	label.modulate = Color("fff4df")
	label.outline_size = 4
	label.outline_modulate = Color("2e3033")
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.width = size.x / maxf(0.001, label.pixel_size)
	parent.add_child(label)


func _sign_text_for_kind(kind: String) -> String:
	match kind:
		"fire":
			return "FIRE DEPT"
		"fire_civic":
			return "CIVIC FIRE"
		"fire_volunteer":
			return "VOL. FIRE"
		"fire_rescue":
			return "RESCUE"
		"vault", "bank":
			return "BANK"
		"grocer", "grocery":
			return "GROCERY"
		"local_market":
			return "LOCAL MARKET"
		"warehouse_market":
			return "FOOD DEPOT"
		"organic_market":
			return "ORGANIC"
		"restaurant":
			return "TASTY BITES"
		"diner":
			return "DINER"
		"fast_food":
			return "BURGER LOOP"
		"cafe":
			return "COZY CAFE"
		"grill":
			return "FAMILY GRILL"
		"fine_dining":
			return "SAGE TABLE"
		"food_court":
			return "FOOD COURT"
		"bistro":
			return "BISTRO"
		"pizza":
			return "PIZZA"
		"corner_canopy":
			return "MART EXPRESS"
		"corner_shop":
			return "CORNER SHOP"
		"mini_mart":
			return "MINI MART"
		"corner", "quick_mart":
			return "QUICK MART"
		_:
			return ""


func _add_crate_stack_local(position_3d: Vector3, accent: Color, parent: Node) -> void:
	var wood := _make_material("9f7b56", 0.8)
	_add_box(position_3d, Vector3(0.2, 0.12, 0.2), wood, parent)
	_add_box(position_3d + Vector3(0.18, 0.04, -0.04), Vector3(0.16, 0.1, 0.16), wood, parent)
	_add_box(position_3d + Vector3(0.0, 0.12, 0.0), Vector3(0.06, 0.06, 0.06), _make_material_from_color(accent, 0.82), parent)


func _add_hydrant_local(position_3d: Vector3, parent: Node) -> void:
	var hydrant := _make_material("c45043", 0.68)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.12, 0.0), 0.05, 0.06, 0.24, hydrant, parent)
	_add_box(position_3d + Vector3(0.0, 0.24, 0.0), Vector3(0.16, 0.06, 0.08), hydrant, parent)


func _add_string_lights_local(parent: Node, z_position: float, width: float) -> void:
	_add_box(Vector3(0.0, 0.82, z_position), Vector3(width, 0.02, 0.02), _make_material("6a5a4d", 0.82), parent)
	for i in range(5):
		var t := float(i) / 4.0
		var x := lerpf(-width * 0.5, width * 0.5, t)
		_add_box(Vector3(x, 0.76 + sin(t * TAU) * 0.04, z_position), Vector3(0.05, 0.06, 0.05), _window_material, parent)


func _add_shore_detail(position_3d: Vector3) -> void:
	var root := Node3D.new()
	root.position = position_3d
	_nature_root.add_child(root)
	_add_box(Vector3.ZERO, Vector3(0.34, 0.08, 0.24), _stone_material, root)
	_add_box(Vector3(0.18, 0.04, -0.1), Vector3(0.18, 0.06, 0.16), _stone_material, root)
	_register_nature_feature(root, 0.54)
	_add_grass_clump(position_3d + Vector3(-0.12, 0.12, 0.08), 0.72)


func _add_lamp(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material)
	_add_lamp_fixture_local(position_3d, building_root)
	_add_box(position_3d + Vector3(0.0, 1.12, 0.0), Vector3(0.18, 0.1, 0.18), _window_material, building_root)
	_add_lantern_glow_local(position_3d + Vector3(0.0, 1.12, 0.0), building_root)


func _add_lamp_fixture_local(base_position: Vector3, parent: Node, preview: bool = false, tall: bool = false) -> void:
	var metal := _ghost_base_material if preview else _make_material("2f3335", 0.82)
	var trim := _ghost_accent_material if preview else _make_material("f3e8c8", 0.58)
	var top_y := 1.42 if tall else 1.12
	_add_box(base_position + Vector3(0.0, 0.035, 0.0), Vector3(0.2, 0.045, 0.2), metal, parent)
	_add_local_cylinder(base_position + Vector3(0.0, 0.16, 0.0), 0.06, 0.075, 0.1, metal, parent)
	_add_box(base_position + Vector3(0.0, top_y - 0.12, 0.0), Vector3(0.1, 0.035, 0.1), trim, parent)
	_add_box(base_position + Vector3(0.0, top_y + 0.085, 0.0), Vector3(0.26, 0.045, 0.26), metal, parent)
	_add_box(base_position + Vector3(0.0, top_y + 0.13, 0.0), Vector3(0.17, 0.035, 0.17), trim, parent)
	for side in [-1.0, 1.0]:
		var bracket := _add_box(base_position + Vector3(0.075 * side, top_y - 0.02, 0.0), Vector3(0.1, 0.025, 0.035), metal, parent)
		bracket.rotation_degrees.z = side * 18.0


func _add_bench(position_3d: Vector3, rotation_y: float) -> void:
	var seat_material := _make_material("a57649", 0.72)
	var bench := _add_box(position_3d + Vector3(0.0, 0.14, 0.0), Vector3(0.48, 0.08, 0.18), seat_material, building_root)
	bench.rotation_degrees.y = rotation_y
	var back := _add_box(position_3d + Vector3(0.0, 0.28, -0.07), Vector3(0.48, 0.18, 0.06), seat_material, building_root)
	back.rotation_degrees.y = rotation_y


func _add_bench_local(position_3d: Vector3, rotation_y: float, parent: Node) -> void:
	var seat_material := _make_material("a57649", 0.72)
	var bench := _add_box(position_3d + Vector3(0.0, 0.14, 0.0), Vector3(0.48, 0.08, 0.18), seat_material, parent)
	bench.rotation_degrees.y = rotation_y
	var back := _add_box(position_3d + Vector3(0.0, 0.28, -0.07), Vector3(0.48, 0.18, 0.06), seat_material, parent)
	back.rotation_degrees.y = rotation_y


func _add_lantern_glow_local(position_3d: Vector3, parent: Node) -> void:
	var light := OmniLight3D.new()
	light.position = position_3d + Vector3(0.0, 0.1, 0.0)
	light.light_color = Color(1.0, 0.73, 0.42)
	light.light_energy = 0.22
	light.omni_range = 2.2
	light.shadow_enabled = false
	parent.add_child(light)
	var bulb := _add_local_sphere(position_3d + Vector3(0.0, 0.06, 0.0), 0.08, 0.08, _street_lamp_bulb_material, parent)
	bulb.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var glow := Sprite3D.new()
	glow.texture = _ensure_lamp_glow_texture(Color(1.0, 0.74, 0.38), 0.06)
	glow.billboard = 1
	glow.no_depth_test = true
	glow.shaded = false
	glow.double_sided = true
	glow.fixed_size = true
	glow.centered = true
	glow.pixel_size = 0.012
	glow.scale = Vector3(0.78, 0.78, 0.78)
	glow.position = position_3d + Vector3(0.0, 0.06, 0.0)
	glow.modulate = Color(1.0, 0.78, 0.4, 0.42)
	glow.render_priority = 8
	parent.add_child(glow)
	var ground_glow := Sprite3D.new()
	ground_glow.texture = _ensure_lamp_glow_texture(Color(1.0, 0.76, 0.4), 0.2)
	ground_glow.billboard = 1
	ground_glow.no_depth_test = true
	ground_glow.shaded = false
	ground_glow.double_sided = true
	ground_glow.fixed_size = true
	ground_glow.centered = true
	ground_glow.pixel_size = 0.012
	ground_glow.scale = Vector3(1.9, 1.9, 1.9)
	ground_glow.position = Vector3(position_3d.x, 0.08, position_3d.z)
	ground_glow.modulate = Color(1.0, 0.83, 0.45, 0.32)
	ground_glow.render_priority = 7
	parent.add_child(ground_glow)


func _add_car_detail_package(root: Node3D, index: int, body_material: Material, trim_material: Material, dark_trim: Material, glass_material: Material) -> void:
	var style := posmod(index, 3)
	var chrome_material := _make_material("ddd6c8", 0.72)
	var amber_material := _make_material("f0b14e", 0.42, 0.0, true, "ffc069", 0.16)
	_add_box(Vector3(-0.225, 0.31, 0.16), Vector3(0.045, 0.045, 0.06), dark_trim, root)
	_add_box(Vector3(0.225, 0.31, 0.16), Vector3(0.045, 0.045, 0.06), dark_trim, root)
	_add_box(Vector3(-0.155, 0.152, 0.368), Vector3(0.045, 0.026, 0.018), amber_material, root)
	_add_box(Vector3(0.155, 0.152, 0.368), Vector3(0.045, 0.026, 0.018), amber_material, root)
	match style:
		0:
			_add_box(Vector3(0.0, 0.402, -0.06), Vector3(0.24, 0.025, 0.26), chrome_material, root)
			_add_box(Vector3(-0.12, 0.424, -0.06), Vector3(0.025, 0.035, 0.3), dark_trim, root)
			_add_box(Vector3(0.12, 0.424, -0.06), Vector3(0.025, 0.035, 0.3), dark_trim, root)
		1:
			_add_soft_block(Vector3(0.0, 0.27, -0.2), Vector3(0.34, 0.2, 0.28), body_material, root, 0.05)
			_add_box(Vector3(0.0, 0.35, -0.36), Vector3(0.24, 0.075, 0.035), glass_material, root)
			_add_box(Vector3(0.0, 0.16, -0.47), Vector3(0.28, 0.05, 0.035), chrome_material, root)
		2:
			_add_box(Vector3(0.0, 0.24, -0.22), Vector3(0.32, 0.05, 0.24), dark_trim, root)
			_add_box(Vector3(-0.16, 0.28, -0.22), Vector3(0.035, 0.11, 0.26), body_material, root)
			_add_box(Vector3(0.16, 0.28, -0.22), Vector3(0.035, 0.11, 0.26), body_material, root)
			_add_box(Vector3(0.0, 0.3, -0.36), Vector3(0.32, 0.045, 0.035), body_material, root)


func _add_trolley_detail_package(root: Node3D, trim_material: Material, stripe_material: Material, brass_material: Material, rail_glass: Material) -> void:
	var dark_material := _make_material("3d3430", 0.84)
	for z in [-0.28, 0.28]:
		_add_box(Vector3(-0.326, 0.36, z), Vector3(0.03, 0.28, 0.18), dark_material, root)
		_add_box(Vector3(0.326, 0.36, z), Vector3(0.03, 0.28, 0.18), dark_material, root)
		_add_box(Vector3(-0.345, 0.44, z), Vector3(0.022, 0.08, 0.11), rail_glass, root)
		_add_box(Vector3(0.345, 0.44, z), Vector3(0.022, 0.08, 0.11), rail_glass, root)
	_add_box(Vector3(0.0, 0.36, 0.705), Vector3(0.26, 0.2, 0.025), trim_material, root)
	_add_box(Vector3(0.0, 0.43, 0.73), Vector3(0.16, 0.055, 0.018), stripe_material, root)
	_add_box(Vector3(0.0, 0.36, -0.705), Vector3(0.26, 0.2, 0.025), trim_material, root)
	_add_box(Vector3(0.0, 0.66, 0.66), Vector3(0.4, 0.035, 0.03), brass_material, root)
	_add_box(Vector3(0.0, 0.66, -0.66), Vector3(0.4, 0.035, 0.03), brass_material, root)
	_add_box(Vector3(-0.36, 0.18, 0.0), Vector3(0.035, 0.04, 0.86), brass_material, root)
	_add_box(Vector3(0.36, 0.18, 0.0), Vector3(0.035, 0.04, 0.86), brass_material, root)


func _add_vehicle_headlights_local(parent: Node, front_z: float, half_width: float, light_y: float, light_range: float, light_energy: float) -> void:
	var headlight_material := _make_material("fff5dd", 0.04, 0.0, true, "fff0b9", 1.25)
	var halo_material := _make_transparent_material(Color("fff1b8"), 0.08, 0.18)
	for side_sign in [-1.0, 1.0]:
		var head_position := Vector3(half_width * side_sign, light_y, front_z)
		_add_local_sphere(head_position, 0.05, 0.05, headlight_material, parent)
		var halo := _add_local_sphere(head_position + Vector3(0.0, 0.0, 0.018), 0.11, 0.04, halo_material, parent)
		halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var beam := SpotLight3D.new()
		beam.position = head_position + Vector3(0.0, 0.02, 0.0)
		beam.rotation_degrees = Vector3(0.0, 180.0, 0.0)
		beam.light_color = Color(1.0, 0.97, 0.86)
		beam.light_energy = light_energy
		beam.spot_range = light_range
		beam.spot_angle = 28.0
		beam.shadow_enabled = false
		parent.add_child(beam)


func _add_road_lamp_local(position_3d: Vector3, parent: Node) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = position_3d
	parent.add_child(lamp_root)
	_add_local_cylinder(Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material, lamp_root)
	_add_lamp_fixture_local(Vector3.ZERO, lamp_root)
	_add_lantern_glow_local(Vector3(0.0, 1.12, 0.0), lamp_root)


func _clear_road_lights() -> void:
	for node_variant in _road_light_nodes.values():
		var node := node_variant as Node
		if is_instance_valid(node):
			node.queue_free()
	_road_light_nodes.clear()


func _refresh_road_lights() -> void:
	if not is_instance_valid(_road_lights_root):
		return
	_clear_road_lights()
	var road_keys: Array = _road_cells.keys()
	road_keys.sort()
	for road_key_variant in road_keys:
		var cell := _anchor_key_to_cell(str(road_key_variant))
		if not _road_cells.has(_cell_key(cell)):
			continue
		var north := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y - 1)))
		var east := _road_cells.has(_cell_key(Vector2i(cell.x + 1, cell.y)))
		var south := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y + 1)))
		var west := _road_cells.has(_cell_key(Vector2i(cell.x - 1, cell.y)))
		var vertical_straight := north and south and not east and not west
		var horizontal_straight := east and west and not north and not south
		if not vertical_straight and not horizontal_straight:
			continue
		if _road_light_has_nearby_junction(cell):
			continue
		if posmod(cell.x + cell.y, 3) != 0:
			continue
		var preferred_sign := 1 if posmod(cell.x + cell.y, 4) == 0 else -1
		var candidate_signs := [preferred_sign, -preferred_sign]
		for side_sign in candidate_signs:
			if vertical_straight:
				if not _road_lamp_clearance_is_free(cell, true, side_sign):
					continue
				_place_road_light(cell, Vector3(2.42 * float(side_sign), 0.0, 0.0), "v_%s_%d" % [_cell_key(cell), side_sign])
				break
			elif horizontal_straight:
				if not _road_lamp_clearance_is_free(cell, false, side_sign):
					continue
				_place_road_light(cell, Vector3(0.0, 0.0, 2.42 * float(side_sign)), "h_%s_%d" % [_cell_key(cell), side_sign])
				break


func _road_light_has_nearby_junction(cell: Vector2i) -> bool:
	for dx in [-1, 0, 1]:
		for dy in [-1, 0, 1]:
			if dx == 0 and dy == 0:
				continue
			var neighbor := Vector2i(cell.x + dx, cell.y + dy)
			if not _road_cells.has(_cell_key(neighbor)):
				continue
			if _road_light_is_junction_like(neighbor):
				return true
	return _road_light_is_junction_like(cell)


func _road_light_is_junction_like(cell: Vector2i) -> bool:
	var north := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y - 1)))
	var east := _road_cells.has(_cell_key(Vector2i(cell.x + 1, cell.y)))
	var south := _road_cells.has(_cell_key(Vector2i(cell.x, cell.y + 1)))
	var west := _road_cells.has(_cell_key(Vector2i(cell.x - 1, cell.y)))
	var vertical_straight := north and south and not east and not west
	var horizontal_straight := east and west and not north and not south
	return not vertical_straight and not horizontal_straight


func _road_lamp_clearance_is_free(cell: Vector2i, vertical: bool, side_sign: int = 0) -> bool:
	if side_sign == 0:
		side_sign = 1 if posmod(cell.x + cell.y, 4) == 0 else -1
	if vertical:
		var side_x := cell.x + side_sign
		for dz in [-1, 0, 1]:
			var candidate := Vector2i(side_x, cell.y + dz)
			var key := _cell_key(candidate)
			if _occupied_cells.has(key) or _reserved_cells.has(key):
				return false
	else:
		var side_y := cell.y + side_sign
		for dx in [-1, 0, 1]:
			var candidate := Vector2i(cell.x + dx, side_y)
			var key := _cell_key(candidate)
			if _occupied_cells.has(key) or _reserved_cells.has(key):
				return false
	return true


func _place_road_light(cell: Vector2i, local_offset: Vector3, key: String) -> void:
	var lamp_root := Node3D.new()
	lamp_root.position = _cell_to_world(cell) + local_offset
	_road_lights_root.add_child(lamp_root)
	_add_local_cylinder(Vector3(0.0, 0.54, 0.0), 0.04, 0.04, 1.08, _road_material, lamp_root)
	_add_lamp_fixture_local(Vector3.ZERO, lamp_root)
	_add_lantern_glow_local(Vector3(0.0, 1.12, 0.0), lamp_root)
	_road_light_nodes[key] = lamp_root


func _add_local_tree(position_3d: Vector3, parent: Node) -> void:
	_add_shadow_disc_local(position_3d + Vector3(0.0, 0.01, 0.0), Vector2(0.82, 0.64), 0.16, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.18, 0.0), 0.13, 0.16, 0.18, _trunk_material, parent)
	_add_local_cylinder(position_3d + Vector3(0.0, 0.42, 0.0), 0.1, 0.075, 0.68, _trunk_material, parent)
	_add_local_sphere(position_3d + Vector3(0.0, 0.92, 0.02), 0.52, 0.86, _leaf_material, parent)
	_add_local_sphere(position_3d + Vector3(-0.22, 0.84, 0.0), 0.36, 0.66, _leaf_material_light, parent)
	_add_local_sphere(position_3d + Vector3(0.24, 0.84, -0.08), 0.32, 0.58, _leaf_material_dark, parent)
	_add_local_sphere(position_3d + Vector3(0.06, 1.11, -0.04), 0.24, 0.38, _leaf_material_light, parent)
	_add_local_sphere(position_3d + Vector3(-0.02, 0.74, 0.12), 0.28, 0.34, _leaf_material_dark, parent)
	_add_tree_detail_local(position_3d, parent)


func _add_tree_detail_local(position_3d: Vector3, parent: Node) -> void:
	var bark_dark := _make_material("5c412d", 0.96)
	var leaf_spark := _make_material("9dc06e", 0.9)
	var fruit_material := _make_material("d96d5c", 0.78)
	var variant := posmod(int(round((position_3d.x + 17.0) * 11.0 + (position_3d.z + 23.0) * 7.0)), 4)
	for root_angle in [0.0, 120.0, 240.0]:
		var root_dir := Vector3(cos(deg_to_rad(root_angle)), 0.0, sin(deg_to_rad(root_angle)))
		var root_piece := _add_box(position_3d + root_dir * 0.12 + Vector3(0.0, 0.07, 0.0), Vector3(0.22, 0.045, 0.055), bark_dark, parent)
		root_piece.rotation_degrees.y = -root_angle
	for branch_data in [
		{"offset": Vector3(-0.12, 0.68, 0.02), "rot_z": -28.0, "rot_x": 8.0},
		{"offset": Vector3(0.12, 0.72, -0.03), "rot_z": 26.0, "rot_x": -5.0},
	]:
		var offset: Vector3 = branch_data["offset"]
		var branch := _add_local_cylinder(position_3d + offset, 0.035, 0.05, 0.36, bark_dark, parent)
		branch.rotation_degrees.z = float(branch_data["rot_z"])
		branch.rotation_degrees.x = float(branch_data["rot_x"])
	_add_local_sphere(position_3d + Vector3(-0.18, 1.1, 0.14), 0.11, 0.08, leaf_spark, parent)
	_add_local_sphere(position_3d + Vector3(0.18, 1.02, -0.18), 0.1, 0.07, leaf_spark, parent)
	if variant == 0 or variant == 2:
		_add_local_sphere(position_3d + Vector3(-0.22, 0.88, 0.16), 0.045, 0.045, fruit_material, parent)
		_add_local_sphere(position_3d + Vector3(0.16, 0.78, -0.24), 0.038, 0.038, fruit_material, parent)


func _add_local_flower_patch(center: Vector3, count: int, material: StandardMaterial3D, parent: Node) -> void:
	_add_wildflower_cluster(center, count, material, parent, 0.1)


func _add_wildflower_cluster(center: Vector3, count: int, material: StandardMaterial3D, parent: Node, spread: float) -> void:
	for i in range(count):
		var offset_x := randf_range(-spread, spread)
		var offset_z := randf_range(-spread, spread)
		var stem := _add_box(center + Vector3(offset_x, 0.05, offset_z), Vector3(0.02, 0.12, 0.02), _grass_blade_material, parent)
		stem.rotation_degrees.z = randf_range(-10.0, 10.0)
		var bloom := _add_box(center + Vector3(offset_x, 0.12, offset_z), Vector3(0.07, 0.04, 0.07), material, parent)
		bloom.rotation_degrees.y = randf_range(0.0, 45.0)


func _add_chimney(position_3d: Vector3) -> void:
	_add_box(position_3d, Vector3(0.16, 0.44, 0.16), _stone_material, building_root)


func _add_sign(position_3d: Vector3, size: Vector3) -> void:
	var sign_material := _make_material("163140", 0.44, 0.0, true, "77f2dc", 0.08)
	_add_box(position_3d, size, sign_material, building_root)


func _add_window_band(position_3d: Vector3, size: Vector3) -> void:
	_add_window_band_local(position_3d, size, building_root)


func _add_window_band_local(position_3d: Vector3, size: Vector3, parent: Node, material: Material = null) -> MeshInstance3D:
	var band_material: Material = material if material != null else _window_material
	var frame_size := Vector3(
		size.x + (0.08 if size.x >= size.z else 0.045),
		size.y + 0.075,
		size.z + (0.08 if size.z > size.x else 0.045)
	)
	_add_box(position_3d - Vector3(0.0, 0.0, 0.006), frame_size, _window_frame_material, parent)
	var band := _add_box(position_3d + Vector3(0.0, 0.0, 0.012), size, band_material, parent)
	_window_bands.append(band)
	if maxf(size.x, size.z) > 0.24:
		if size.x >= size.z:
			_add_box(position_3d + Vector3(0.0, 0.0, 0.02), Vector3(0.025, size.y * 0.86, maxf(size.z * 0.7, 0.02)), _roof_fascia_material, parent)
		else:
			_add_box(position_3d + Vector3(0.0, 0.0, 0.02), Vector3(maxf(size.x * 0.7, 0.02), size.y * 0.86, 0.025), _roof_fascia_material, parent)
	return band


func _add_house_wall_window_local(position_3d: Vector3, size: Vector3, parent: Node, preview: bool = false) -> void:
	var window_root := Node3D.new()
	window_root.position = position_3d
	parent.add_child(window_root)
	var frame_material := _ghost_base_material if preview else _make_material("efe3cf", 0.9)
	var mullion_material := _ghost_base_material if preview else _make_material("8d6848", 0.84)
	var glass_material := _ghost_accent_material if preview else _window_material
	var frame_size := Vector3(size.x + 0.1, size.y + 0.08, maxf(size.z, 0.04))
	_add_box(Vector3.ZERO, frame_size, frame_material, window_root)
	_add_box(Vector3(0.0, 0.0, size.z * 0.06), Vector3(size.x, size.y, maxf(size.z * 0.4, 0.03)), glass_material, window_root)
	if size.x >= 0.2:
		_add_box(Vector3(-size.x * 0.18, 0.0, size.z * 0.08), Vector3(0.03, size.y * 0.84, maxf(size.z * 0.22, 0.02)), mullion_material, window_root)
		_add_box(Vector3(size.x * 0.18, 0.0, size.z * 0.08), Vector3(0.03, size.y * 0.84, maxf(size.z * 0.22, 0.02)), mullion_material, window_root)


func _add_house_side_window_local(position_3d: Vector3, size: Vector3, parent: Node, side_sign: float, preview: bool = false) -> void:
	var side_root := Node3D.new()
	side_root.position = position_3d
	side_root.rotation_degrees.y = 90.0 if side_sign >= 0.0 else -90.0
	parent.add_child(side_root)
	_add_house_wall_window_local(Vector3.ZERO, size, side_root, preview)


func _ensure_lamp_glow_texture(glow_color: Color, alpha: float) -> Texture2D:
	if _lamp_glow_texture == null:
		var size := 64
		var image := Image.create(size, size, false, Image.FORMAT_RGBA8)
		var center := Vector2((size - 1) * 0.5, (size - 1) * 0.5)
		for y in range(size):
			for x in range(size):
				var dist := center.distance_to(Vector2(float(x), float(y))) / center.x
				var falloff := clampf(1.0 - dist, 0.0, 1.0)
				falloff = pow(falloff, 1.9)
				var glow_alpha := alpha * maxf(falloff, clampf(1.0 - dist * 1.1, 0.0, 1.0) * 0.4)
				image.set_pixel(x, y, Color(glow_color.r, glow_color.g, glow_color.b, glow_alpha))
		_lamp_glow_texture = ImageTexture.create_from_image(image)
	return _lamp_glow_texture


func _add_edge_post(position_3d: Vector3) -> void:
	_add_cylinder(position_3d + Vector3(0.0, 0.16, 0.0), 0.03, 0.03, 0.34, _stone_material)


func _add_shrub_cluster(center: Vector3, color: Color, parent: Node, count: int) -> void:
	var shrub_material := _make_material_from_color(color, 0.92)
	for i in range(count):
		var offset := (float(i) - float(count - 1) * 0.5) * 0.18
		var shrub := _add_local_sphere(center + Vector3(offset, 0.12, randf_range(-0.04, 0.04)), 0.12, 0.16, shrub_material, parent)
		shrub.scale = Vector3(1.05, 0.85, 1.0)


func _add_hedge_strip_local(center: Vector3, width: float, color: Color, parent: Node) -> void:
	var hedge_material := _make_material_from_color(color, 0.96)
	for i in range(6):
		var t := float(i) / 5.0
		var x: float = lerpf(-width * 0.5, width * 0.5, t)
		_add_local_sphere(center + Vector3(x, 0.13 + randf_range(-0.01, 0.02), randf_range(-0.05, 0.05)), 0.16, 0.2, hedge_material, parent)


func _add_parcel_shadow(parent: Node, size: Vector2, alpha: float) -> void:
	_add_shadow_disc_local(Vector3(0.0, 0.005, 0.0), size, alpha, parent)


func _add_shadow_disc_local(center: Vector3, size: Vector2, alpha: float, parent: Node) -> void:
	var shadow := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.5
	mesh.bottom_radius = 0.54
	mesh.height = 0.01
	shadow.mesh = mesh
	var material := _make_transparent_material(Color(0.08, 0.06, 0.04, 1.0), 1.0, alpha)
	shadow.material_override = material
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	shadow.scale = Vector3(size.x, 1.0, size.y)
	shadow.position = center
	parent.add_child(shadow)


func _add_ellipse_disc_local(center: Vector3, size: Vector2, height: float, material: Material, parent: Node, rotation_y: float = 0.0) -> MeshInstance3D:
	var disc := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.5
	mesh.bottom_radius = 0.52
	mesh.height = height
	mesh.radial_segments = 40
	disc.mesh = mesh
	disc.material_override = material
	disc.position = center
	disc.scale = Vector3(size.x, 1.0, size.y)
	disc.rotation_degrees.y = rotation_y
	disc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(disc)
	return disc


func _add_organic_pond_layer_local(center: Vector3, size: Vector2, height: float, material: Material, parent: Node, rotation_y: float = 0.0) -> void:
	var lobes := [
		{"offset": Vector2(0.0, 0.0), "scale": Vector2(1.0, 0.82), "rotation": 0.0},
		{"offset": Vector2(-0.24, 0.1), "scale": Vector2(0.54, 0.48), "rotation": -18.0},
		{"offset": Vector2(0.23, -0.13), "scale": Vector2(0.5, 0.43), "rotation": 16.0},
		{"offset": Vector2(0.06, 0.28), "scale": Vector2(0.58, 0.34), "rotation": 8.0},
	]
	for index in range(lobes.size()):
		var lobe: Dictionary = lobes[index]
		var offset: Vector2 = lobe["offset"]
		var lobe_scale: Vector2 = lobe["scale"]
		var lobe_rotation := float(lobe["rotation"])
		_add_ellipse_disc_local(
			center + Vector3(offset.x * size.x, float(index) * 0.0015, offset.y * size.y),
			Vector2(size.x * lobe_scale.x, size.y * lobe_scale.y),
			height,
			material,
			parent,
			rotation_y + lobe_rotation
		)


func _add_organic_pond_highlights_local(water_size: Vector2, parent: Node, preview: bool = false) -> void:
	var material := _ghost_base_material if preview else _water_highlight_material
	var y := 0.108 if not preview else 0.075
	var highlights := [
		{"position": Vector2(-0.18, -0.14), "size": Vector2(0.34, 0.032), "rotation": -8.0},
		{"position": Vector2(0.18, 0.12), "size": Vector2(0.24, 0.026), "rotation": 11.0},
		{"position": Vector2(0.02, 0.0), "size": Vector2(0.18, 0.022), "rotation": 4.0},
	]
	for highlight in highlights:
		var position: Vector2 = highlight["position"]
		var size: Vector2 = highlight["size"]
		_add_ellipse_disc_local(
			Vector3(position.x * water_size.x, y, position.y * water_size.y),
			Vector2(water_size.x * size.x, maxf(0.035, water_size.y * size.y)),
			0.008,
			material,
			parent,
			float(highlight["rotation"])
		)


func _add_pond_edge_details_local(water_size: Vector2, shore_size: Vector2, parent: Node, variant: int) -> void:
	var pebble_material := _make_material("d7d2bd", 0.9)
	var reed_material := _make_material("566f3c", 0.92)
	var flower_material := _make_material("f2d4e6", 0.78)
	for index in range(14):
		var angle := float(index) / 14.0 * TAU + float(posmod(variant, 5)) * 0.18
		var radius_jitter := 0.88 + 0.06 * sin(float(index) * 1.7)
		var x := cos(angle) * shore_size.x * 0.44 * radius_jitter
		var z := sin(angle) * shore_size.y * 0.36 * radius_jitter
		if index % 3 == 0:
			_add_local_cylinder(Vector3(x, 0.12, z), 0.018, 0.022, 0.24, reed_material, parent)
			_add_local_cylinder(Vector3(x + 0.08, 0.1, z - 0.04), 0.014, 0.018, 0.18, reed_material, parent)
		elif index % 5 == 0:
			_add_local_sphere(Vector3(x, 0.105, z), 0.06, 0.045, flower_material, parent)
		else:
			_add_local_sphere(Vector3(x, 0.08, z), 0.07 + float(index % 2) * 0.018, 0.045, pebble_material, parent)
	var lily_material := _make_material("7cab70", 0.86)
	_add_ellipse_disc_local(Vector3(-water_size.x * 0.22, 0.112, water_size.y * 0.08), Vector2(0.32, 0.2), 0.006, lily_material, parent, -18.0)
	_add_ellipse_disc_local(Vector3(water_size.x * 0.2, 0.114, -water_size.y * 0.16), Vector2(0.26, 0.18), 0.006, lily_material, parent, 24.0)


func _add_round_canopy(center: Vector3, size: Vector3, material: Material, parent: Node) -> void:
	var canopy := _add_local_sphere(center, 0.22, 0.24, material, parent)
	canopy.scale = Vector3(size.x * 2.1, size.y * 1.8, size.z * 2.1)


func _add_ripple_ring_local(center: Vector3, radius_x: float, radius_z: float, parent: Node) -> void:
	var ripple := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = 0.46
	mesh.outer_radius = 0.5
	mesh.rings = 8
	mesh.ring_segments = 48
	ripple.mesh = mesh
	ripple.material_override = _water_highlight_material
	ripple.scale = Vector3(radius_x, 0.02, radius_z)
	ripple.position = center
	ripple.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ripple.set_meta("base_scale", ripple.scale)
	ripple.set_meta("phase", randf_range(0.0, TAU))
	parent.add_child(ripple)
	_water_ripples.append(ripple)


func _add_gabled_roof(center: Vector3, size: Vector3, material: Material, parent: Node, tilt_degrees: float = 10.0) -> void:
	var left := _add_box(center + Vector3(0.0, 0.0, size.z * 0.16), Vector3(size.x, size.y, size.z * 0.58), material, parent)
	var right := _add_box(center + Vector3(0.0, 0.0, -size.z * 0.16), Vector3(size.x, size.y, size.z * 0.58), material, parent)
	left.rotation_degrees.x = -tilt_degrees
	right.rotation_degrees.x = tilt_degrees
	_add_box(center + Vector3(0.0, size.y * 0.24, 0.0), Vector3(size.x * 0.12, size.y * 0.8, 0.08), material, parent)
	var trim_material := _roof_fascia_material
	var material_3d := material as StandardMaterial3D
	if material_3d != null:
		trim_material = _make_material_from_color(material_3d.albedo_color.darkened(0.28), 0.86)
	_add_box(center + Vector3(0.0, size.y * 0.34, 0.0), Vector3(size.x * 0.96, maxf(0.035, size.y * 0.16), 0.055), trim_material, parent)
	_add_box(center + Vector3(0.0, -size.y * 0.42, size.z * 0.49), Vector3(size.x * 1.04, maxf(0.035, size.y * 0.14), 0.08), trim_material, parent)
	_add_box(center + Vector3(0.0, -size.y * 0.42, -size.z * 0.49), Vector3(size.x * 1.04, maxf(0.035, size.y * 0.14), 0.08), trim_material, parent)
	_add_box(center + Vector3(size.x * 0.51, -size.y * 0.3, 0.0), Vector3(0.07, maxf(0.035, size.y * 0.12), size.z * 0.86), trim_material, parent)
	_add_box(center + Vector3(-size.x * 0.51, -size.y * 0.3, 0.0), Vector3(0.07, maxf(0.035, size.y * 0.12), size.z * 0.86), trim_material, parent)
	_add_roof_ridge_details(center, size, trim_material, parent)


func _add_roof_ridge_details(center: Vector3, size: Vector3, material: Material, parent: Node) -> void:
	_add_box(center + Vector3(0.0, size.y * 0.5, 0.0), Vector3(size.x * 0.84, maxf(0.03, size.y * 0.12), 0.055), material, parent)
	for z_sign in [-1.0, 1.0]:
		for row in range(2):
			var z: float = float(z_sign) * (size.z * (0.18 + float(row) * 0.16))
			_add_box(center + Vector3(0.0, -size.y * 0.05 + float(row) * size.y * 0.08, z), Vector3(size.x * 0.72, 0.026, 0.035), material, parent)
	if size.x > 0.9 and size.z > 0.8:
		var vent_material := _make_material("efe6d6", 0.76)
		for x_sign in [-1.0, 1.0]:
			var vent_x: float = float(x_sign) * size.x * 0.24
			_add_box(center + Vector3(vent_x, size.y * 0.58, -size.z * 0.1), Vector3(0.14, 0.05, 0.12), vent_material, parent)
			_add_box(center + Vector3(vent_x, size.y * 0.64, -size.z * 0.1), Vector3(0.11, 0.04, 0.09), material, parent)
	if size.x > 1.8:
		_add_box(center + Vector3(-size.x * 0.32, size.y * 0.3, size.z * 0.18), Vector3(0.26, 0.035, 0.16), _window_material, parent)


func _add_facade_trim_package(parent: Node, width: float, height: float, z: float, palette: Dictionary, accent_name: String = "") -> void:
	var trim := _make_material_from_color(palette["trim"], 0.78)
	var accent := _make_material_from_color(palette["accent"], 0.46)
	var shadow_trim := _make_material_from_color(palette["roof"].darkened(0.18), 0.82)
	var base_trim := _make_material_from_color(palette["roof"].darkened(0.26), 0.86)
	_add_box(Vector3(0.0, 0.16, z + 0.028), Vector3(width * 0.98, 0.11, 0.06), base_trim, parent)
	_add_box(Vector3(0.0, height + 0.12, z), Vector3(width * 0.86, 0.08, 0.07), trim, parent)
	_add_box(Vector3(0.0, height + 0.03, z + 0.02), Vector3(width * 0.72, 0.04, 0.055), shadow_trim, parent)
	_add_box(Vector3(-width * 0.46, height * 0.48, z), Vector3(0.055, height * 0.76, 0.06), trim, parent)
	_add_box(Vector3(width * 0.46, height * 0.48, z), Vector3(0.055, height * 0.76, 0.06), trim, parent)
	for inset_x in [-width * 0.24, width * 0.24]:
		_add_box(Vector3(inset_x, height * 0.48, z + 0.018), Vector3(0.035, height * 0.52, 0.045), shadow_trim, parent)
	_add_box(Vector3(0.0, height * 0.74, z + 0.03), Vector3(width * 0.56, 0.07, 0.045), accent, parent)
	if accent_name != "":
		_add_signboard_local(Vector3(0.0, height + 0.28, z + 0.04), Vector2(maxf(0.78, width * 0.3), 0.16), palette["accent"], accent_name, parent)


func _add_storefront_window_set(parent: Node, width: float, y: float, z: float, columns: int = 3) -> void:
	var usable_width := width * 0.62
	for i in range(columns):
		var t := 0.5 if columns <= 1 else float(i) / float(columns - 1)
		var x := lerpf(-usable_width * 0.5, usable_width * 0.5, t)
		_add_house_wall_window_local(Vector3(x, y, z), Vector3(0.22, 0.34, 0.05), parent)
		_add_box(Vector3(x + 0.052, y + 0.07, z + 0.045), Vector3(0.045, 0.22, 0.018), _make_transparent_material(Color("fff0b7"), 0.2, 0.18), parent)
	_add_box(Vector3(0.0, y - 0.25, z + 0.02), Vector3(usable_width + 0.28, 0.055, 0.055), _roof_fascia_material, parent)
	_add_box(Vector3(0.0, y + 0.25, z + 0.02), Vector3(usable_width + 0.18, 0.045, 0.055), _window_frame_material, parent)
	_add_box(Vector3(0.0, y - 0.48, z + 0.04), Vector3(usable_width + 0.42, 0.045, 0.08), _make_material("d8c7ab", 0.88), parent)
	for post_x in [-usable_width * 0.5 - 0.18, usable_width * 0.5 + 0.18]:
		_add_box(Vector3(post_x, y - 0.08, z + 0.04), Vector3(0.045, 0.48, 0.045), _window_frame_material, parent)


func _add_commercial_roof_details_local(parent: Node, width: float, depth: float, height: float, center_z: float, palette: Dictionary, variant: int) -> void:
	var vent_material := _make_material("e8ddcc", 0.78)
	var cap_material := _make_material_from_color(palette["roof"].darkened(0.22), 0.82)
	var glass_material := _make_transparent_material(Color("bfe6ff"), 0.22, 0.24)
	var roof_y := height + 0.44
	var unit_x := width * (0.18 if posmod(variant, 2) == 0 else -0.18)
	_add_soft_block(Vector3(unit_x, roof_y, center_z - depth * 0.18), Vector3(0.36, 0.16, 0.28), vent_material, parent, 0.04)
	_add_box(Vector3(unit_x, roof_y + 0.1, center_z - depth * 0.18), Vector3(0.28, 0.045, 0.2), cap_material, parent)
	for slat in [-0.08, 0.0, 0.08]:
		_add_box(Vector3(unit_x + slat, roof_y + 0.19, center_z - depth * 0.18), Vector3(0.024, 0.025, 0.18), cap_material, parent)
	_add_local_cylinder(Vector3(-width * 0.28, roof_y + 0.04, center_z + depth * 0.14), 0.045, 0.055, 0.24, vent_material, parent)
	_add_local_cylinder(Vector3(-width * 0.28, roof_y + 0.2, center_z + depth * 0.14), 0.06, 0.06, 0.035, cap_material, parent)
	if width > 2.4:
		_add_box(Vector3(width * 0.26, roof_y + 0.03, center_z + depth * 0.05), Vector3(0.34, 0.025, 0.22), glass_material, parent)


func _add_soft_block(center: Vector3, size: Vector3, material: Material, parent: Node, corner_radius: float = 0.14) -> Node3D:
	var root := Node3D.new()
	root.position = center
	parent.add_child(root)

	var radius: float = minf(corner_radius, minf(size.x * 0.22, size.z * 0.22))
	_add_box(Vector3.ZERO, Vector3(max(0.12, size.x - radius * 1.45), size.y, size.z), material, root)
	_add_box(Vector3.ZERO, Vector3(size.x, size.y, max(0.12, size.z - radius * 1.45)), material, root)

	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			_add_local_cylinder(
				Vector3(sx * (size.x * 0.5 - radius), 0.0, sz * (size.z * 0.5 - radius)),
				radius,
				radius,
				size.y,
				material,
				root
			)

	if material is StandardMaterial3D and size.y >= 0.12:
		var base_material := material as StandardMaterial3D
		var top_material := _make_material_from_color(base_material.albedo_color.lightened(0.065), maxf(0.72, base_material.roughness - 0.04))
		var foot_material := _make_material_from_color(base_material.albedo_color.darkened(0.12), minf(0.98, base_material.roughness + 0.04))
		var cap_size := Vector3(maxf(0.12, size.x - radius * 1.2), 0.012, maxf(0.12, size.z - radius * 1.2))
		_add_box(Vector3(0.0, size.y * 0.5 + 0.008, 0.0), cap_size, top_material, root)
		if size.y > 0.28:
			_add_box(Vector3(0.0, -size.y * 0.5 + 0.026, size.z * 0.49), Vector3(size.x * 0.78, 0.045, 0.035), foot_material, root)
			_add_box(Vector3(-size.x * 0.49, -size.y * 0.5 + 0.026, 0.0), Vector3(0.035, 0.045, size.z * 0.7), foot_material, root)

	return root


func _add_box(position_3d: Vector3, size: Vector3, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_local_cylinder(position_3d: Vector3, top_radius: float, bottom_radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top_radius
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_local_sphere(position_3d: Vector3, radius: float, height: float, material: Material, parent: Node) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	parent.add_child(mesh_instance)
	return mesh_instance


func _add_cylinder(position_3d: Vector3, top_radius: float, bottom_radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top_radius
	mesh.bottom_radius = bottom_radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	building_root.add_child(mesh_instance)
	return mesh_instance


func _add_sphere(position_3d: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = position_3d
	building_root.add_child(mesh_instance)
	return mesh_instance


func _polished_albedo_color(color: Color, roughness: float) -> Color:
	var luminance := color.r * 0.299 + color.g * 0.587 + color.b * 0.114
	var adjusted := color
	if luminance > 0.78:
		adjusted = adjusted.darkened(0.12)
	elif luminance < 0.2:
		adjusted = adjusted.lightened(0.026)
	var warm_amount := clampf((roughness - 0.55) * 0.07, 0.0, 0.038)
	adjusted = adjusted.lerp(Color(1.0, 0.94, 0.82), warm_amount)
	return adjusted


func _make_material(color_hex: String, roughness: float, metallic: float = 0.0, emission_enabled: bool = false, emission_color_hex: String = "ffffff", emission_energy: float = 0.0) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = _polished_albedo_color(Color(color_hex), roughness)
	material.roughness = roughness
	material.metallic = metallic
	material.metallic_specular = 0.08
	material.emission_enabled = emission_enabled
	if emission_enabled:
		material.emission = Color(emission_color_hex)
		material.emission_energy_multiplier = emission_energy
	return material


func _make_material_from_color(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = _polished_albedo_color(color, roughness)
	material.roughness = roughness
	material.metallic_specular = 0.08
	return material


func _make_house_roof_material(color: Color) -> StandardMaterial3D:
	var material := _make_material_from_color(color, 0.78)
	# Preserve the broader color palette, but give the signature warm-roof houses
	# authored shingle detail in the first visual slice.
	if color.r > color.g * 1.12 and color.r > color.b * 1.12:
		material.albedo_texture = CEDAR_SHINGLES_ALBEDO
		material.albedo_color = Color(0.94, 0.88, 0.82)
		material.uv1_scale = Vector3(2.0, 2.0, 2.0)
		material.texture_repeat = true
		material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return material


func _configure_foliage_material(material: StandardMaterial3D, tint: Color) -> void:
	material.albedo_color = tint


func _make_transparent_material(color: Color, roughness: float, alpha: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.albedo_color.a = alpha
	material.roughness = roughness
	material.metallic_specular = 0.08
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material


func _animate_clouds(delta: float) -> void:
	for cloud in _clouds:
		var speed: float = float(cloud.get_meta("speed", 0.15))
		var base_z: float = float(cloud.get_meta("base_z", cloud.position.z))
		cloud.position.x += delta * speed
		cloud.position.z = base_z + sin(Time.get_ticks_msec() * 0.0004 + cloud.position.x) * 0.18
		if cloud.position.x > 12.0:
			cloud.position.x = -12.0


func _animate_water(delta: float) -> void:
	var time := Time.get_ticks_msec() * 0.001
	var i := 0
	while i < _water_ripples.size():
		var ripple := _water_ripples[i]
		if not is_instance_valid(ripple):
			_water_ripples.remove_at(i)
			continue
		var base_scale: Vector3 = ripple.get_meta("base_scale", ripple.scale)
		var phase: float = float(ripple.get_meta("phase", 0.0))
		var pulse := 1.0 + sin(time * 1.2 + phase) * 0.045
		ripple.scale = Vector3(base_scale.x * pulse, base_scale.y, base_scale.z * (1.0 + cos(time * 1.05 + phase) * 0.035))
		ripple.rotation_degrees.y += delta * 3.0
		i += 1


func _animate_windows() -> void:
	var time := Time.get_ticks_msec() * 0.001
	var i := 0
	while i < _window_bands.size():
		var window_band := _window_bands[i]
		if not is_instance_valid(window_band):
			_window_bands.remove_at(i)
			continue
		var material := window_band.material_override as StandardMaterial3D
		if material:
			material.emission_energy_multiplier = 0.82 + (sin(time * 0.92 + i * 0.72) * 0.5 + 0.5) * 0.62
		i += 1


func _animate_grass() -> void:
	var time := Time.get_ticks_msec() * 0.001
	for clump in _grass_clumps:
		var phase: float = float(clump.get_meta("phase", 0.0))
		var sway: float = float(clump.get_meta("sway", 1.0))
		clump.rotation_degrees.z = sin(time * 1.6 * sway + phase) * 4.5


func _update_camera(force := false) -> void:
	_camera_yaw = lerp_angle(_camera_yaw, _target_camera_yaw, 0.18 if not force else 1.0)
	if camera_controller and camera_controller.has_method("apply_view"):
		camera_controller.call("apply_view", _focus, _zoom, _camera_yaw)
		return
	var orbit := Vector3(_zoom * 0.92, _zoom * 0.74, _zoom * 0.86).rotated(Vector3.UP, _camera_yaw)
	camera_controller.position = _focus
	camera.position = orbit
	camera.look_at(_focus + Vector3(0.0, 0.8, 0.0), Vector3.UP)
