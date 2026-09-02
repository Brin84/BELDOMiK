import type { StyleSpecification } from 'maplibre-gl';

// Default raster style built from OpenStreetMap tiles (no API key needed and
// has real street data for Belarus/Minsk). The previous default
// (demotiles.maplibre.org) is an empty demo tileset — it rendered a blank
// white map. Override with VITE_MAP_STYLE_URL / VITE_MAP_DARK_STYLE_URL for a
// production vector provider (e.g. MapTiler) if desired.
const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

// Map configuration
export const MAP_CONFIG = {
  // Default map style URLs (can be overridden via environment variables)
  styleUrl: import.meta.env.VITE_MAP_STYLE_URL || osmStyle,
  darkStyleUrl: import.meta.env.VITE_MAP_DARK_STYLE_URL || osmStyle,

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
