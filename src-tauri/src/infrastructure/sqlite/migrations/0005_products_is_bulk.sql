ALTER TABLE products ADD COLUMN is_bulk INTEGER NOT NULL DEFAULT 0;
UPDATE products SET is_bulk = 1 WHERE unit IN ('kg', 'litro', 'metro');
