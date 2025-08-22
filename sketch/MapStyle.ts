// Centralized Leaflet map style configuration and helpers.
// Edit values in MapStyle.config to tweak the basemap appearance.

type TileLayerPair = { topo: any; labels: any };

(function () {
  const MapStyle = {
    config: {
      // CSS filter applied to raster tiles. Increase brightness and reduce saturation
      // to make streets and landforms more visible while staying grey.
      tileFilter: 'grayscale(1) brightness(0.70) contrast(1.10) saturate(0.20)',
      // Dark overlay above the map (below canvas). Lower for more visibility.
      darkOverlayOpacity: 0.18,
      // Base layer opacities
      topoOpacity: 0.45,
      labelOpacity: 0.1,
      // Tile URLs (LandsD)
      topoUrl: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png',
      labelsUrl: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/en/WGS84/{z}/{x}/{y}.png',
      // Performance switches
      updateWhenZooming: false,
      updateWhenIdle: true,
      maxZoom: 20,
    },

    // Injects/updates a style tag to apply tile filter, and adjusts dark overlay.
    applyCssFilters(): void {
      try {
        const id = 'map-style-override';
        let el = document.getElementById(id) as HTMLStyleElement | null;
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          document.head.appendChild(el);
        }
        el.textContent = `#map .leaflet-tile { filter: ${MapStyle.config.tileFilter} !important; }`;
      } catch {}
      try {
        const overlay = document.getElementById('dark-overlay');
        if (overlay) {
          (overlay as HTMLElement).style.background = `rgba(0,0,0,${MapStyle.config.darkOverlayOpacity})`;
        }
      } catch {}
    },

    // Creates base topo + labels layers using current config.
    createBaseLayers(): TileLayerPair {
      const Lref: any = (window as any).L;
      const optsBase = {
        maxZoom: MapStyle.config.maxZoom,
        crossOrigin: true,
        opacity: MapStyle.config.topoOpacity,
        updateWhenZooming: MapStyle.config.updateWhenZooming,
        updateWhenIdle: MapStyle.config.updateWhenIdle,
      } as any;
      const topo = Lref.tileLayer(MapStyle.config.topoUrl, optsBase);
      const labels = Lref.tileLayer(MapStyle.config.labelsUrl, {
        maxZoom: MapStyle.config.maxZoom,
        crossOrigin: true,
        opacity: MapStyle.config.labelOpacity,
      } as any);
      return { topo, labels };
    },

    // Allows dynamic opacity changes without recreating layers
    setLayerOpacities(layers: TileLayerPair): void {
      try { layers.topo.setOpacity(MapStyle.config.topoOpacity); } catch {}
      try { layers.labels.setOpacity(MapStyle.config.labelOpacity); } catch {}
    }
  };

  (window as any).MapStyle = MapStyle;
})();


