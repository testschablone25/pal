-- Add tech and hospitality rider columns to artists table
-- These store structured rider data as JSONB for easy querying

ALTER TABLE artists
ADD COLUMN IF NOT EXISTS tech_rider JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hospitality_rider JSONB DEFAULT '{}';

-- Add index for efficient rider queries
CREATE INDEX IF NOT EXISTS idx_artists_tech_rider ON artists USING gin(tech_rider);
CREATE INDEX IF NOT EXISTS idx_artists_hospitality_rider ON artists USING gin(hospitality_rider);

-- Example structure for tech_rider:
-- {
--   "equipment": [
--     { "name": "Pioneer CDJ-3000", "quantity": 2, "required": true },
--     { "name": "Pioneer DJM-900NXS2", "quantity": 1, "required": true }
--   ],
--   "audio": {
--     "inputs_needed": 2,
--     "monitor_type": "booth",
--     "special_requirements": "Need direct booth monitor feed"
--   },
--   "transport": {
--     "flights_needed": true,
--     "priority_boarding": true,
--     "baggage_requirements": "2 large flight cases + 1 carry-on"
--   },
--   "technical_notes": "Run time: 3 hours. Needs USB backup."
-- }

-- Example structure for hospitality_rider:
-- {
--   "accommodation": {
--     "required": true,
--     "nights": 1,
--     "room_type": "double",
--     "location_preference": "city center"
--   },
--   "catering": {
--     "meals": ["dinner", "late_night_snack"],
--     "dietary": ["vegan"],
--     "drinks": {
--       "alcopops": true,
--       "spirits": ["vodka", "whiskey"],
--       "mixers": ["redbull", "ginger_ale"],
--       "water": true
--     }
--   },
--   "transport_ground": {
--     "car_service": true,
--     "pickup_time": "20:00",
--     "pickup_location": "hotel",
--     "return_required": true
--   },
--   "hospitality_notes": "No cucumber. Fresh towels after set."
-- }
