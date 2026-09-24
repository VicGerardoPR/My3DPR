const PRODUCT_IMAGE_STORAGE_MARKER = '/storage/v1/object/public/product-images/';

function productImageStoragePath(url: string) {
  try {
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(PRODUCT_IMAGE_STORAGE_MARKER);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + PRODUCT_IMAGE_STORAGE_MARKER.length));
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

export function productImageStoragePaths(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const paths = new Set<string>();
  for (const image of images) {
    if (!image || typeof image !== 'object' || !('url' in image) || typeof image.url !== 'string') continue;
    const path = productImageStoragePath(image.url);
    if (path) paths.add(path);
  }
  return [...paths];
}
