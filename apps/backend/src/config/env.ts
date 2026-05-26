export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }

  if (fallback !== undefined) return fallback;
  throw new Error(`${name} is required`);
}
