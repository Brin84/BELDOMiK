import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster from 'supercluster';
import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyShort } from '@/shared/api/types';
import { MAP_CONFIG } from '../config';

interface MapViewProps {
  properties: PropertyShort[];
  onPropertySelect: (property: PropertyShort) => void;
  userLocation: [number, number] | null;
  center: [number, number];
  zoom: number;
  onCenterChange: (center: [number, number]) => void;
  onZoomChange: (zoom: number) => void;
  darkMode: boolean;
  viewportStableHeight: number;
  onRetry?: () => void;
}

export function MapView({
  properties,
  onPropertySelect,
  userLocation,
  center,
  zoom,
  onCenterChange,
  onZoomChange,
  darkMode,
  viewportStableHeight,
  onRetry,
}: MapViewProps) {
  const { trigger } = useHaptics();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Create cluster index
  const clusterIndex = useMemo(() => {
    const index = new Supercluster(MAP_CONFIG.superclusterOptions);

    const points = properties
      .filter((p) => p.latitude !== undefined && p.longitude !== undefined)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude!, p.latitude!] as [number, number],
        },
        properties: {
          property: p,
          cluster: false,
        },
      }));

    index.load(points);
    return index;
  }, [properties]);

  
  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: darkMode ? MAP_CONFIG.darkStyleUrl : MAP_CONFIG.styleUrl,
        center,
        zoom,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right'
      );

      map.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);

        // Add source for markers
        map.addSource('properties', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
          cluster: true,
          clusterMaxZoom: MAP_CONFIG.clusterMaxZoom,
          clusterRadius: MAP_CONFIG.clusterRadius,
        });

        // Cluster circles
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'properties',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#4CAF50',
              10,
              '#FF9800',
              50,
              '#F44336',
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              10,
              28,
              50,
              36,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });

        // Cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'properties',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#fff',
            'text-halo-color': '#000',
            'text-halo-width': 1,
          },
        });

        // Unclustered markers (price markers)
        map.addLayer({
          id: 'unclustered-point',
          type: 'symbol',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': 'price-marker',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 1,
            'icon-anchor': 'bottom',
          },
        });

        // Handle clicks on clusters
        map.on('click', 'clusters', (e: maplibregl.MapLayerMouseEvent) => {
          const clusterId = e.features?.[0]?.properties?.cluster_id;
          if (clusterId === undefined) return;

          const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);
          if (!mapRef.current) return;
          mapRef.current.easeTo({
            center: e.lngLat,
            zoom: expansionZoom,
            duration: 300,
          });
          trigger('light');
        });

        // Handle clicks on unclustered markers
        map.on('click', 'unclustered-point', (e: maplibregl.MapLayerMouseEvent) => {
          const property = e.features?.[0]?.properties?.property as PropertyShort | undefined;
          if (property) {
            trigger('selection');
            onPropertySelect(property);
          }
        });

        // Change cursor on hover
        map.on('mouseenter', 'clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'unclustered-point', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
        });

        // Sync center and zoom
        map.on('moveend', () => {
          if (mapRef.current) {
            const newCenter = mapRef.current.getCenter();
            const newZoom = mapRef.current.getZoom();
            onCenterChange([newCenter.lng, newCenter.lat]);
            onZoomChange(newZoom);
          }
        });

        // Update map data
        updateMapData(map);
      });

      map.on('error', (e: maplibregl.ErrorEvent) => {
        console.error('Map error:', e.error);
        setMapError('Ошибка загрузки карты');
      });

      // Cleanup
      return () => {
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.remove();
        }
        if (popupRef.current) {
          popupRef.current.remove();
        }
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Не удалось инициализировать карту');
    }
  }, []); // Only run once on mount

  // Update map style when dark mode changes
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Note: MapLibre doesn't have built-in dark/light style switching without reload
    // For now, we'll use the same style. A proper implementation would use different styles.
  }, [darkMode, isMapLoaded]);

  // Update map data when properties change
  const updateMapData = useCallback(
    (map: maplibregl.Map) => {
      if (!map.getSource('properties')) return;

      const source = map.getSource('properties') as maplibregl.GeoJSONSource;

      // Generate price marker icons for each property
      const features = properties
        .filter((p) => p.latitude !== undefined && p.longitude !== undefined)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude!, p.latitude!] as [number, number],
          },
          properties: {
            property: p,
            cluster: false,
          },
        }));

      // Add price marker icons dynamically
      features.forEach((feature) => {
        const property = feature.properties.property;
        const price = property.price_byn ?? 0;
        const priceText = price >= 1000000
          ? `${(price / 1000000).toFixed(1)}М`
          : price >= 1000
            ? `${(price / 1000).toFixed(0)}К`
            : `${price}`;

        const markerId = `price-marker-${property.id}`;
        if (!map.hasImage(markerId)) {
          const canvas = document.createElement('canvas');
          const size = MAP_CONFIG.priceMarkerSize;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;

          // Draw marker background
          ctx.fillStyle = '#1E88E5';
          ctx.beginPath();
          ctx.roundRect(4, 4, size - 8, size - 8, 8);
          ctx.fill();

          // Draw price text
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(priceText, size / 2, size / 2 - 2);

          // Draw triangle pointer at bottom
          ctx.fillStyle = '#1E88E5';
          ctx.beginPath();
          ctx.moveTo(size / 2, size - 4);
          ctx.lineTo(size / 2 - 8, size - 16);
          ctx.lineTo(size / 2 + 8, size - 16);
          ctx.closePath();
          ctx.fill();

          const imageData = ctx.getImageData(0, 0, size, size);
          map.addImage(markerId, imageData);
        }
      });

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    },
    [properties]
  );

  // Update map data when properties change
  useEffect(() => {
    if (mapRef.current && isMapLoaded) {
      updateMapData(mapRef.current);
    }
  }, [properties, isMapLoaded, updateMapData]);

  // Sync center and zoom from props
  useEffect(() => {
    if (mapRef.current && isMapLoaded) {
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();

      const centerChanged =
        Math.abs(currentCenter.lng - center[0]) > 0.0001 ||
        Math.abs(currentCenter.lat - center[1]) > 0.0001;
      const zoomChanged = Math.abs(currentZoom - zoom) > 0.01;

      if (centerChanged || zoomChanged) {
        mapRef.current.jumpTo({ center, zoom });
      }
    }
  }, [center, zoom, isMapLoaded]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #1E88E5;
        border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      `;

      // Add pulse animation if not exists
      if (!document.getElementById('user-location-styles')) {
        const style = document.createElement('style');
        style.id = 'user-location-styles';
        style.textContent = `
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(30, 136, 229, 0.7); }
            70% { box-shadow: 0 0 0 12px rgba(30, 136, 229, 0); }
            100% { box-shadow: 0 0 0 0 rgba(30, 136, 229, 0); }
          }
        `;
        document.head.appendChild(style);
      }

      userLocationMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(mapRef.current);
    }
  }, [userLocation, isMapLoaded]);

  // Handle map load error
  if (mapError) {
    return (
      <div
        ref={mapContainerRef}
        className="w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          minHeight: `${viewportStableHeight}px`,
        }}
      >
        <div className="text-center p-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3" style={{ color: 'var(--tg-theme-hint-color)', opacity: 0.5 }}>
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <p className="text-tg-text font-medium mb-1">{mapError}</p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              Повторить загрузку
            </button>
          ) : (
            <p className="text-tg-hint text-sm">Попробуйте обновить страницу</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{
        minHeight: `${viewportStableHeight}px`,
        zIndex: 1,
      }}
    />
  );
}