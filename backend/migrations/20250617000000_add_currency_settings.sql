INSERT INTO site_content (key, value, label, description, content_type, section, is_public) VALUES
('currency_code',               'IDR',   'Currency Code',          'ISO 4217 currency code shown in exports (e.g. IDR, USD, EUR)',          'text', 'currency', true),
('currency_symbol',             'Rp',    'Currency Symbol',        'Symbol displayed next to amounts (e.g. Rp, $, €)',                      'text', 'currency', true),
('currency_symbol_position',    'before','Symbol Position',        'Position of the symbol: "before" (Rp 10.000) or "after" (10.000 Rp)',  'text', 'currency', true),
('currency_decimal_places',     '0',     'Decimal Places',         'Number of decimal digits to show (0 for IDR, 2 for USD)',               'text', 'currency', true),
('currency_thousands_separator','.',     'Thousands Separator',    'Character between thousands groups (. for IDR: 1.000.000)',             'text', 'currency', true),
('currency_decimal_separator',  ',',     'Decimal Separator',      'Character before decimal digits (, for IDR; . for USD)',               'text', 'currency', true)
ON CONFLICT (key) DO NOTHING;
