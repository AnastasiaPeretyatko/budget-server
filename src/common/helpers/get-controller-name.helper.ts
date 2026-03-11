/**
 * Extracts controller name from request URL
 * Maps URL path to controller name based on route prefix
 */
export function getControllerName(req: {
  url?: string;
  routerPath?: string;
}): string {
  const url = req.url || req.routerPath || '';

  // Extract the first path segment (e.g., '/health' -> 'health')
  const pathMatch = url.match(/^\/([^/?]+)/);
  if (!pathMatch) {
    return 'UnknownController';
  }

  const pathSegment = pathMatch[1];

  // Convert path segment to controller name (e.g., 'health' -> 'HealthController')
  const controllerName = `${pathSegment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')}Controller`;

  return controllerName;
}
