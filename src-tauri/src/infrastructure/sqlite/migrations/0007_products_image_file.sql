ALTER TABLE products ADD COLUMN image_file TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_image_file ON products(image_file) WHERE image_file IS NOT NULL;
