ALTER TABLE sale_items ADD COLUMN base_unit TEXT;
ALTER TABLE sale_items ADD COLUMN input_mode TEXT CHECK(input_mode IN ('base', 'sub', 'amount'));
ALTER TABLE sale_items ADD COLUMN input_value REAL;
ALTER TABLE sale_items ADD COLUMN input_unit TEXT;
