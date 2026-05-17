-- Remove dead schema modules: cloakroom_items and notifications
-- These tables have zero API routes, pages, or components.
-- They can be re-added if the features are implemented in the future.
-- See review/findings.md D4 for context.

DROP TABLE IF EXISTS cloakroom_items CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
