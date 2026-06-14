INSERT INTO site_content (key, value, label, description, content_type, section, is_public) VALUES
('carousel_enabled',  'true',              'Show Product Carousel',  'Display a scrolling product carousel below the hero banner', 'boolean', 'carousel', true),
('carousel_title',    'Featured Products', 'Carousel Heading',       'Title shown above the carousel (leave blank to hide)',       'text',    'carousel', true),
('carousel_count',    '8',                 'Max Products to Show',   'How many products to include in the carousel (1–20)',        'text',    'carousel', true),
('carousel_autoplay', 'true',              'Auto-advance Slides',    'Automatically move to the next slide every few seconds',     'boolean', 'carousel', true)
ON CONFLICT (key) DO NOTHING;
