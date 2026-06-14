-- Repurpose cart_button_color as the universal primary button color
UPDATE site_content
SET key         = 'primary_button_color',
    label       = 'Primary Button Color',
    description = 'Background color for all buttons across the shop (checkout, login, register, cart, etc.)'
WHERE key = 'cart_button_color';

INSERT INTO site_content (key, value, label, description, content_type, section, is_public) VALUES
('site_title_color', '#4f46e5', 'Shop Title Color', 'Color of the shop name/logo in the navigation bar', 'color', 'shop', true)
ON CONFLICT (key) DO NOTHING;
