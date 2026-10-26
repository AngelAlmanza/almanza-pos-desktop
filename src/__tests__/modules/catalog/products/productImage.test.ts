import { describe, expect, it } from 'vitest';
import {
  isValidProductImageFile,
  resolveProductImageSource,
} from '@modules/catalog/products/utils/productImage';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const convert = (path: string): string => `asset://${path}`;

describe('isValidProductImageFile', () => {
  it('accepts uuid v4 names with png, jpg and webp', () => {
    for (const ext of ['png', 'jpg', 'webp']) {
      expect(isValidProductImageFile(`${UUID}.${ext}`)).toBe(true);
    }
  });

  it('rejects paths, traversal, other extensions and non-v4 uuids', () => {
    const invalid = [
      '../x.png',
      `sub/${UUID}.png`,
      `sub\\${UUID}.png`,
      `C:\\${UUID}.png`,
      `/${UUID}.png`,
      `${UUID}.gif`,
      `${UUID}.png:stream`,
      '123e4567-e89b-12d3-a456-426614174000.png',
      UUID,
      '',
    ];
    for (const name of invalid) {
      expect(isValidProductImageFile(name)).toBe(false);
    }
  });
});

describe('resolveProductImageSource', () => {
  it('returns null when there is no image', () => {
    expect(resolveProductImageSource(null, 'C:\\data\\product-images', convert)).toBeNull();
    expect(resolveProductImageSource(undefined, 'C:\\data\\product-images', convert)).toBeNull();
  });

  it('returns null for an invalid file name without calling convert', () => {
    let calls = 0;
    const counting = (path: string): string => {
      calls += 1;
      return path;
    };
    expect(resolveProductImageSource('../secret.png', 'C:\\data\\product-images', counting)).toBeNull();
    expect(calls).toBe(0);
  });

  it('builds the path with a backslash for Windows folders', () => {
    expect(resolveProductImageSource(`${UUID}.png`, 'C:\\data\\product-images', convert)).toBe(
      `asset://C:\\data\\product-images\\${UUID}.png`,
    );
  });

  it('builds the path with a slash for POSIX folders and trims trailing separators', () => {
    expect(resolveProductImageSource(`${UUID}.webp`, '/home/u/product-images/', convert)).toBe(
      `asset:///home/u/product-images/${UUID}.webp`,
    );
  });

  it('returns null while the folder is not loaded yet', () => {
    expect(resolveProductImageSource(`${UUID}.png`, null, convert)).toBeNull();
    expect(resolveProductImageSource(`${UUID}.png`, '', convert)).toBeNull();
  });
});
