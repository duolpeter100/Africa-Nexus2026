export const categories = ['Politics', 'Business', 'Tech & Innovation', 'Climate', 'Culture'];
export const regions = ['West', 'East', 'Southern', 'North', 'Central'];

export class RequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function text(value: unknown, label: string, maximum: number, minimum = 1): string {
  if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > maximum) {
    throw new RequestError(`${label} must contain ${minimum}–${maximum} characters.`);
  }
  return value.trim();
}

export function username(value: unknown): string {
  const result = text(value, 'Username', 32, 3).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(result)) {
    throw new RequestError('Use letters, numbers, dots, underscores, or hyphens for the username.');
  }
  return result;
}

export function email(value: unknown): string {
  const result = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new RequestError('Enter a valid email address.');
  return result;
}

export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new RequestError('Use a password between 12 and 128 characters.');
  }
  return value;
}

export function articleInput(input: Record<string, unknown>) {
  const category = text(input.category, 'Category', 40);
  const region = text(input.region, 'Region', 20);
  const status = text(input.status, 'Status', 12);
  if (!categories.includes(category) || !regions.includes(region) || !['draft', 'published'].includes(status)) {
    throw new RequestError('Choose a valid category, region, and publication status.');
  }
  const image = text(input.image ?? '', 'Image URL', 2000, 0);
  if (image) {
    let url: URL;
    try { url = new URL(image); } catch { throw new RequestError('Enter a valid HTTPS image URL.'); }
    if (url.protocol !== 'https:') throw new RequestError('Image URLs must use HTTPS.');
  }
  return {
    title: text(input.title, 'Headline', 200),
    excerpt: text(input.excerpt, 'Summary', 600),
    content: text(input.content, 'Article body', 80000),
    author: text(input.author, 'Author', 100),
    category, region, status, image,
  };
}
