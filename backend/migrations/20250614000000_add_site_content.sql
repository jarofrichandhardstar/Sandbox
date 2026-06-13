CREATE TABLE IF NOT EXISTS site_content (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT         NOT NULL DEFAULT '',
    label       VARCHAR(200) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL DEFAULT 'text',
    section     VARCHAR(100) NOT NULL DEFAULT 'general',
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO site_content (key, value, label, description, content_type, section, is_public) VALUES
-- General site identity
('site_name',            'Shop',                             'Site Name',              'Shown in the browser tab and header', 'text',    'general',       true),
('site_tagline',         'Your favorite online store',       'Site Tagline',           'Short description of the store',      'text',    'general',       true),
('logo_url',             '',                                 'Logo Image',             'Upload or paste a URL for the logo',  'image',   'general',       true),

-- Homepage hero
('hero_title',           'Discover Amazing Products',        'Hero Title',             'Main headline on the homepage',       'text',    'homepage',      true),
('hero_subtitle',        'Shop the latest collection at unbeatable prices', 'Hero Subtitle', 'Supporting text below the headline', 'text', 'homepage',  true),
('hero_cta_text',        'Shop Now',                         'Hero Button Label',      'Label on the call-to-action button',  'text',    'homepage',      true),
('hero_cta_link',        '/',                                'Hero Button Link',       'URL the CTA button points to',        'url',     'homepage',      true),
('hero_image_url',       '',                                 'Hero Background Image',  'Background image for the hero banner','image',   'homepage',      true),
('hero_bg_color',        '#4f46e5',                          'Hero Background Color',  'Fallback color when no image is set', 'color',   'homepage',      true),

-- Announcement bar
('announcement_enabled', 'false',                            'Announcement Bar',       'Show or hide the top announcement bar','boolean','announcements',  true),
('announcement_text',    'Free shipping on orders over $50!','Announcement Message',   'Text shown in the announcement bar',  'text',    'announcements',  true),
('announcement_color',   '#4f46e5',                          'Announcement Color',     'Background color (hex) of the bar',   'color',   'announcements',  true),

-- About
('about_title',          'About Us',                         'About Title',            'Heading for the about section',       'text',    'about',         true),
('about_body',           'We are dedicated to bringing you the best products from around the world. Our mission is to make quality shopping accessible to everyone.', 'About Body', 'Main body text for the about page', 'richtext', 'about', true),

-- Contact
('contact_email',        '',                                 'Contact Email',          'Public-facing contact email',         'text',    'contact',       true),
('contact_phone',        '',                                 'Contact Phone',          'Public-facing phone number',          'text',    'contact',       true),
('contact_address',      '',                                 'Address',                'Physical store or office address',    'text',    'contact',       true),

-- Social links
('social_facebook',      '',                                 'Facebook URL',           'Link to Facebook page',               'url',     'social',        true),
('social_instagram',     '',                                 'Instagram URL',          'Link to Instagram profile',           'url',     'social',        true),
('social_twitter',       '',                                 'Twitter / X URL',        'Link to Twitter/X profile',           'url',     'social',        true),
('social_youtube',       '',                                 'YouTube URL',            'Link to YouTube channel',             'url',     'social',        true),

-- Footer
('footer_copyright',     '© 2025 Shop. All rights reserved.','Footer Copyright',      'Copyright line at the bottom',        'text',    'footer',        true),
('footer_tagline',       'Quality products, great prices.',  'Footer Tagline',         'Short tagline shown in the footer',   'text',    'footer',        true)

ON CONFLICT (key) DO NOTHING;
