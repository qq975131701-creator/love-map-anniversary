export function optimizedPhotoUrl(url: string, width: number, height?: number) {
  if (!url.startsWith('/api/photos?')) return url;

  const params = new URLSearchParams({
    url,
    w: String(width),
    q: '78',
  });
  if (height) {
    params.set('h', String(height));
    params.set('fit', 'cover');
  }
  return `/.netlify/images?${params.toString()}`;
}
