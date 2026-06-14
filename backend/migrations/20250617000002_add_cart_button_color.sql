INSERT INTO site_content (key, value, label, description, content_type, section, is_public) VALUES
('cart_button_color', '#4f46e5', 'Add to Cart Button Color', 'Background color of the Add to Cart button on product cards and product pages', 'color', 'shop', true)
ON CONFLICT (key) DO NOTHING;
