import React, { useEffect, useRef, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapContext } from '../MultiComponents/EcoMap';

const MissionMarker = ({ map }) => {
  const { mapmarkers, handleRemoveMarker, handlePositionChangeMarker } = useContext(MapContext);

  // Ref per memorizzare i marker creati da mapboxgl.Marker
  const temp_points = useRef([]);
  // Ref per memorizzare i layer e le sorgenti aggiunte dinamicamente (linee, cerchi, etc)
  const tempLayers = useRef([]);

  const startIndex = useRef(0);
  const endIndex = useRef(0);

  // Funzione per rimuovere un layer e la relativa source dalla mappa.
  const removeLayerAndSource = (layerId, sourceId) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  };

  // Funzione per pulire la mappa:
  // Rimuove tutti i layer/sorgenti salvati in tempLayers e tutti i marker salvati in temp_points.
  const clearMap = useCallback(() => {
    // Rimozione di tutti i layer aggiunti (linee, cerchi, etc.)
    tempLayers.current.forEach(({ layerId, sourceId }) => {
      removeLayerAndSource(layerId, sourceId);
    });
    tempLayers.current = [];

    // Rimozione di tutti i marker (oggetti mapboxgl.Marker)
    if (temp_points.current.length > 0) {
      temp_points.current.forEach(marker => {
        marker.remove();
      });
      temp_points.current = [];
    }
  }, [map]);

  useEffect(() => {
    // Pulisce i layer e i marker precedenti prima di disegnare quelli nuovi
    clearMap();

    // Ciclo sui marker memorizzati nello state "mapmarkers"
    mapmarkers.features.forEach((marker, i) => {
      // Creazione dell'elemento HTML del marker
      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = `<span><b>${i}</b></span>`;

      const mark_new = new mapboxgl.Marker(el)
        .setLngLat(marker.geometry.coordinates)
        .addTo(map)
        .setDraggable(true)
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <h3>Marker ${marker.properties.id} e ${marker.properties.description}</h3>
            <button id="removeMarkerBtn-${marker.properties.id}">X</button>
          `)
        );

      mark_new.getPopup().on('open', () => {
        const customId = `removeMarkerBtn-${marker.properties.id}`;
        const btn = document.getElementById(customId);
        if (btn) {
          btn.addEventListener('click', () => {
            mark_new.getPopup().remove();
            mark_new.remove();
            handleRemoveMarker(marker.properties.id);
          });
        }
      });

      mark_new.on('dragend', (e) => {
        handlePositionChangeMarker(marker.properties.id, e.target.getLngLat());
      });

      // Aggiungo il marker al ref per poterlo rimuovere in seguito
      temp_points.current.push(mark_new);

      // Aggiungo un layer per il marker di base (cerchio fisso)
      const markerbaseLayerId = `markerbase-${marker.properties.id}`;
      const markerbaseSourceId = markerbaseLayerId;
      map.addLayer({
        id: markerbaseLayerId,
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: marker.geometry.coordinates,
            },
          },
        },
        paint: {
          'circle-radius': 14,
          'circle-color': '#F0E100',
          'circle-opacity': 1,
        },
      });
      tempLayers.current.push({ layerId: markerbaseLayerId, sourceId: markerbaseSourceId });

      // Calcolo del raggio scalato per il cerchio (ad es. per il raggio d'influenza)
      let rad = parseFloat(marker.extra.wrad);
      const valueScale = 10000;
      const scaledValue = rad * valueScale;
      const zoom = map.getZoom();
      const zoomScale = 0.01;
      const scaledZoom = Math.pow(2, zoom) * zoomScale;
      rad = scaledValue * scaledZoom;

      // Aggiungo il layer del cerchio (per visualizzare il raggio)
      const circleLayerId = `circle-${marker.properties.id}`;
      const circleSourceId = circleLayerId;
      map.addLayer({
        id: circleLayerId,
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: marker.geometry.coordinates,
            },
          },
        },
        paint: {
          'circle-radius': rad,
          'circle-color': '#731963',
          'circle-opacity': 1,
        },
      });
      tempLayers.current.push({ layerId: circleLayerId, sourceId: circleSourceId });
    });

    // Se sono presenti più marker, aggiungo le linee di connessione.
    if (temp_points.current.length > 1) {
      const lineCoordinates = [];

      // Genera linee per collegare ogni marker al successivo.
      for (let i = 0; i < mapmarkers.features.length - 1; i++) {
        const nextIndex = (i + 1) % mapmarkers.features.length;
        const coord1 = mapmarkers.features[i].geometry.coordinates;
        const coord2 = mapmarkers.features[nextIndex].geometry.coordinates;
        lineCoordinates.push({ coords: [coord1, coord2], id: i });
      }

      // Determina gli indici dei marker che fungono da start ed end waypoint.
      for (let i = 0; i < mapmarkers.features.length; i++) {
        if (mapmarkers.features[i].header.startWaypoint) {
          startIndex.current = i;
        }
        if (mapmarkers.features[i].header.endwaypoint) {
          endIndex.current = i;
        }
      }

      let valid_points = [];
      if (startIndex.current !== 0 || endIndex.current !== 0) {
        for (let i = startIndex.current; i <= endIndex.current; i++) {
          valid_points.push(i);
        }
        if (valid_points.length > 0) {
          // Collega il primo e l'ultimo marker del segmento valido.
          const coord_start = mapmarkers.features[valid_points[0]].geometry.coordinates;
          const coord_end = mapmarkers.features[valid_points[valid_points.length - 1]].geometry.coordinates;
          lineCoordinates.push({ coords: [coord_start, coord_end], id: 'circleline' });
        }

        // Aggiorno lo stile dei marker validi cambiando il colore
        mapmarkers.features.forEach((mm) => {
          const id = parseInt(mm.properties.id, 10);
          if (valid_points.includes(id)) {
            removeLayerAndSource(`markerbase-${mm.properties.id}`, `markerbase-${mm.properties.id}`);
            map.addLayer({
              id: `markerbase-${mm.properties.id}`,
              type: 'circle',
              source: {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: mm.geometry.coordinates,
                  },
                },
              },
              paint: {
                'circle-radius': 14,
                'circle-color': '#000FFF',
                'circle-opacity': 1,
              },
            });
            tempLayers.current.push({ layerId: `markerbase-${mm.properties.id}`, sourceId: `markerbase-${mm.properties.id}` });
          }
        });
      }

      // Aggiungo un layer per ogni linea generata.
      lineCoordinates.forEach((line, k) => {
        const sourceId = `line-source-${k}`;
        const layerId = `line-layer-${k}`;
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: { id: line.id },
              geometry: {
                type: 'LineString',
                coordinates: line.coords,
              },
            }],
          },
        });
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': (valid_points.includes(parseInt(line.id, 10)) || line.id === 'circleline')
              ? '#c4c4fc'
              : '#888',
            'line-width': 8,
          },
        });
        tempLayers.current.push({ layerId, sourceId });
      });
    }

    // Cleanup: al termine dell'effetto (o quando i dependency cambiano) rimuovo eventuali marker/layer precedenti.
    return () => {
      clearMap();
    };
  }, [
    mapmarkers,
    map,
    handleRemoveMarker,
    handlePositionChangeMarker,
    clearMap,
  ]);

  return null;
};

MissionMarker.propTypes = {
  stateapp: PropTypes.string.isRequired,
  map: PropTypes.instanceOf(mapboxgl.Map),
};

export default MissionMarker;
