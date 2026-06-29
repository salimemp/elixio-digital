-- Seed canonical licenses + starter category tree.
--
-- Without these rows, creators cannot create assets:
--   - assets.licenseId references licenses.id (NOT NULL)
--   - assets.categoryId references categories.id (NOT NULL)
--
-- The platform was bootstrapped without a seed file — categories
-- returned [] from GET /v1/categories, blocking any creator from
-- publishing. This migration fixes that.

-- ── Licenses ──────────────────────────────────────────────────────
-- Three standard licenses for digital assets. Matches the
-- `LicenseCode` enum in schema.prisma.
INSERT INTO licenses (id, code, name, summary) VALUES
  (gen_random_uuid(), 'personal',   'Personal use only',       'Use for personal, non-commercial projects.'),
  (gen_random_uuid(), 'commercial', 'Commercial use allowed',  'Use in commercial projects and products.'),
  (gen_random_uuid(), 'extended',   'Extended commercial',     'Use in unlimited commercial products, including resale.')
ON CONFLICT (code) DO NOTHING;

-- ── Starter categories ────────────────────────────────────────────
-- A flat list covering the main digital-asset verticals. Tree depth
-- can be added later via parentId. Slugs are stable — used in URLs
-- (/explore?category=3d-models).
INSERT INTO categories (id, name, slug, "parentId") VALUES
  (gen_random_uuid(), 'Templates',     'templates',     NULL),
  (gen_random_uuid(), 'Presets',       'presets',       NULL),
  (gen_random_uuid(), '3D Models',     '3d-models',     NULL),
  (gen_random_uuid(), 'Brushes',       'brushes',       NULL),
  (gen_random_uuid(), 'Courses',       'courses',       NULL),
  (gen_random_uuid(), 'Code',          'code',          NULL),
  (gen_random_uuid(), 'Design assets', 'design-assets', NULL),
  (gen_random_uuid(), 'Fonts',         'fonts',         NULL),
  (gen_random_uuid(), 'Icons',         'icons',         NULL),
  (gen_random_uuid(), 'Illustrations', 'illustrations', NULL),
  (gen_random_uuid(), 'Music',         'music',         NULL),
  (gen_random_uuid(), 'Photos',        'photos',        NULL),
  (gen_random_uuid(), 'Sound effects', 'sound-effects', NULL),
  (gen_random_uuid(), 'Textures',      'textures',      NULL),
  (gen_random_uuid(), 'Video',         'video',         NULL),
  (gen_random_uuid(), 'Other',         'other',         NULL)
ON CONFLICT (slug) DO NOTHING;