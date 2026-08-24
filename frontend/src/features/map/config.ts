// Map configuration
export const MAP_CONFIG = {
  // Default map style URLs (can be overridden via environment variables)
  styleUrl: import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
  darkStyleUrl: import.meta.env.VITE_MAP_DARK_STYLE_URL || 'https://demotiles.maplibre.org/style.json',

  // Map defaults
  defaultCenter: [27.5618, 53.9022] as [number, number], // Minsk center
  defaultZoom: 10,

  // Clustering settings
  clusterRadius: 60,
  clusterMaxZoom: 16,
  superclusterOptions: {
    radius: 60,
    maxZoom: 16,
    minZoom: 0,
    extent: 512,
    nodeSize: 64,
    log: false,
  },

  // Marker settings
  priceMarkerSize: 48,
  userLocationMarkerSize: 20,
} as const;

export type MapConfig = typeof MAP_CONFIG;