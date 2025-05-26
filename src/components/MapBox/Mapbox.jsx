// Ecomap.jsx 11111
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapContext } from '../MultiComponents/EcoMap';
import { map } from 'jquery';
import MissionMarker from '../Markers/MissionMarkers'
import { WebSocketContext } from '../Websockets';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWNvZHJvbmUiLCJhIjoiY2xnZjYzZzRxMDFjMzNkbW43Z3BsbW1yNSJ9.S2dYTcn4i6myxzNVxWmxgQ';

const MapboxMap = ({
    stateapp,
    mapStyle = "satellite",
    missionWaypoints = null,
    selectedMission = null
}) => {

    const { handleAddMarker, mapmarkers, clearMap } = useContext(MapContext);

    const mapContainer = useRef(null);

    const { skMessage } = useContext(WebSocketContext);

    const map = useRef(null)

    const [lng, setLng] = useState(10.369610831036084);
    const [lat, setLat] = useState(42.937242433545975);
    const [zoom, setZoom] = useState(9);
    const [autoCenter, setAutoCenter] = useState(true); // Controllo centramento automatico
    const [boatPosition, setBoatPosition] = useState(null); // Posizione corrente della barca

    const markerRef = useRef(null);

    // Ref per gestire la missione visualizzata
    const missionMarkersRef = useRef([]);
    const missionSourceRef = useRef(null);
    const missionLayerRef = useRef(null);

    // Funzione per gestire diversi stili di mappa
    const getMapStyle = (style) => {
        const styles = {
            streets: 'mapbox://styles/mapbox/streets-v11',
            satellite: 'mapbox://styles/mapbox/satellite-v9',
            satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
            dark: 'mapbox://styles/mapbox/dark-v10',
            light: 'mapbox://styles/mapbox/light-v10'
        };
        return styles[style] || styles.satellite;
    };

    const mapStyleUrl = getMapStyle(mapStyle);

    // Funzione per pulire la missione visualizzata
    const clearMissionVisualization = useCallback(() => {
        if (!map.current) return;

        // Rimuovi tutti i marker della missione
        missionMarkersRef.current.forEach(marker => {
            marker.remove();
        });
        missionMarkersRef.current = [];

        // Rimuovi layer e source della linea missione
        if (missionLayerRef.current && map.current.getLayer('mission-route')) {
            map.current.removeLayer('mission-route');
            missionLayerRef.current = null;
        }

        if (missionSourceRef.current && map.current.getSource('mission-route')) {
            map.current.removeSource('mission-route');
            missionSourceRef.current = null;
        }
    }, []);

    // Funzione per visualizzare la missione sulla mappa
    const visualizeMission = useCallback((waypoints) => {
        if (!map.current || !waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
            return;
        }

        // Prima pulisci qualsiasi visualizzazione precedente
        clearMissionVisualization();

        console.log('Visualizing mission waypoints:', waypoints);

        const coordinates = [];
        const bounds = new mapboxgl.LngLatBounds();

        // Crea marker per ogni waypoint
        waypoints.forEach((waypoint, index) => {
            let lng, lat;

            // Gestisci diversi formati di waypoint
            if (waypoint.lng !== undefined && waypoint.lat !== undefined) {
                lng = parseFloat(waypoint.lng);
                lat = parseFloat(waypoint.lat);
            } else if (waypoint.longitude !== undefined && waypoint.latitude !== undefined) {
                lng = parseFloat(waypoint.longitude);
                lat = parseFloat(waypoint.latitude);
            } else if (waypoint.lon !== undefined && waypoint.lat !== undefined) {
                lng = parseFloat(waypoint.lon);
                lat = parseFloat(waypoint.lat);
            } else if (Array.isArray(waypoint) && waypoint.length >= 2) {
                lng = parseFloat(waypoint[0]);
                lat = parseFloat(waypoint[1]);
            } else if (waypoint.x !== undefined && waypoint.y !== undefined) {
                lng = parseFloat(waypoint.x);
                lat = parseFloat(waypoint.y);
            } else {
                console.warn('Waypoint format not recognized:', waypoint);
                return;
            }

            // Verifica che le coordinate siano valide
            if (isNaN(lng) || isNaN(lat)) {
                console.warn('Invalid coordinates for waypoint:', waypoint);
                return;
            }

            coordinates.push([lng, lat]);
            bounds.extend([lng, lat]);

            // Crea il marker per il waypoint
            const el = document.createElement('div');
            el.className = 'mission-waypoint-marker';
            el.style.cssText = `
                background-color: #FF6B35;
                border: 3px solid #ffffff;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
            `;
            el.textContent = (index + 1).toString();

            // Tooltip per il waypoint
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false
            }).setHTML(`
                <div style="font-size: 12px;">
                    <strong>Waypoint ${index + 1}</strong><br>
                    Lat: ${lat.toFixed(6)}°<br>
                    Lng: ${lng.toFixed(6)}°
                    ${waypoint.altitude ? `<br>Alt: ${waypoint.altitude}m` : ''}
                    ${waypoint.speed ? `<br>Speed: ${waypoint.speed} kn` : ''}
                </div>
            `);

            const marker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map.current);

            missionMarkersRef.current.push(marker);
        });

        // Disegna la linea che connette i waypoints se ci sono almeno 2 punti
        if (coordinates.length >= 2) {
            const geojson = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            };

            map.current.addSource('mission-route', {
                type: 'geojson',
                data: geojson
            });

            map.current.addLayer({
                id: 'mission-route',
                type: 'line',
                source: 'mission-route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#FF6B35',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });

            missionSourceRef.current = 'mission-route';
            missionLayerRef.current = 'mission-route';

            // Aggiungi anche una linea più spessa trasparente per migliore visibilità
            map.current.addLayer({
                id: 'mission-route-outline',
                type: 'line',
                source: 'mission-route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 6,
                    'line-opacity': 0.5
                }
            }, 'mission-route'); // Inserisci sotto la linea principale
        }

        // Centra la mappa sui waypoints della missione
        if (coordinates.length > 0) {
            if (coordinates.length === 1) {
                // Se c'è solo un waypoint, centra su quello
                map.current.flyTo({
                    center: coordinates[0],
                    zoom: Math.max(zoom, 14),
                    essential: true,
                });
            } else {
                // Se ci sono più waypoints, mostra tutti
                map.current.fitBounds(bounds, {
                    padding: { top: 50, bottom: 50, left: 50, right: 50 },
                    maxZoom: 16
                });
            }
        }

    }, [clearMissionVisualization, zoom]);

    // Effect per gestire la visualizzazione della missione
    useEffect(() => {
        if (missionWaypoints && selectedMission) {
            console.log('Mission waypoints received for visualization:', missionWaypoints);
            visualizeMission(missionWaypoints);
        } else {
            // Se non ci sono waypoints o missione selezionata, pulisci
            clearMissionVisualization();
        }
    }, [missionWaypoints, selectedMission, visualizeMission, clearMissionVisualization]);

    useEffect(() => {

        if (skMessage) {
            // //  console.log(skMessage);
            if (skMessage.scope === "H") {
                if (skMessage.type == 2) {
                    if (skMessage.id_message == "HFALL") {
                        let llon = JSON.parse(skMessage.data_command).Lon;
                        let llan = JSON.parse(skMessage.data_command).Lat;

                        // Salva sempre la posizione della barca
                        setBoatPosition([llon, llan]);

                        // Centra la mappa solo se autoCenter è attivo
                        if (autoCenter) {
                            map.current.flyTo({
                                center: [llon, llan],
                                zoom,
                                essential: true,
                            });
                        }

                        map.current.on('move', funcOnMove);

                        if (markerRef.current) {
                            markerRef.current.setLngLat([llon, llan]);
                        }

                    }
                }
            }
        }

    }, [skMessage, autoCenter, zoom]);


    const funcOnMove = () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
    }

    // Funzione per centrare manualmente sulla barca
    const centerOnBoat = () => {
        if (boatPosition && map.current) {
            map.current.flyTo({
                center: boatPosition,
                zoom: Math.max(zoom, 12), // Zoom minimo 12 per vedere bene la barca
                essential: true,
            });
        }
    };

    // Funzione per centrare sulla missione
    const centerOnMission = () => {
        if (missionWaypoints && missionWaypoints.length > 0 && map.current) {
            visualizeMission(missionWaypoints);
        }
    };

    // Toggle del centramento automatico
    const toggleAutoCenter = () => {
        setAutoCenter(!autoCenter);
    };

    const funcOnClick = useCallback((e) => {

        if (stateapp === 'WPY') {

            if (e.originalEvent.target.closest('.mapboxgl-marker')) {
                return;
            }

            const features = map.current.queryRenderedFeatures(e.point);

            // Per la vista satellitare, rimuoviamo il controllo sui waterFeatures
            // poiché i layer potrebbero avere nomi diversi
            // const waterFeatures = features.filter(feature => feature.layer.id === 'water');
            // if (waterFeatures.length == 0) {
            //     return;
            // }

            const { lngLat } = e;

            if (features.length > 0) {
                const clickedFeature = features[0];
                const featureType = clickedFeature.layer.type;

                if (featureType === 'line') {
                    const lineProperties = clickedFeature.properties;

                    if (lineProperties.id !== 'circleline') {
                        handleAddMarker(lngLat, true, lineProperties.id);
                    }
                } else {
                    handleAddMarker(lngLat);
                }
            } else {
                // Permetti di aggiungere marker anche se non ci sono features
                handleAddMarker(lngLat);
            }
        }
    }, [stateapp, handleAddMarker, map]);




    useEffect(() => {

        if (!map.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: mapStyleUrl, // Usa il nuovo stile
                center: [lng, lat],
                zoom: 9,
            });

            markerRef.current = new mapboxgl.Marker({ color: 'red' })
                .setLngLat([lng, lat])
                .addTo(map.current);

            map.current.on('move', funcOnMove);
        }

        if (stateapp === 'WPY') {

            map.current.on('click', funcOnClick);
        } else {
            map.current.off('click', funcOnClick);
        }

        return () => {
            map.current.off('click', funcOnClick);
        };

    }, [stateapp, handleAddMarker, funcOnClick, mapStyleUrl, clearMap, autoCenter]);

    // Cleanup quando il componente viene smontato
    useEffect(() => {
        return () => {
            clearMissionVisualization();
        };
    }, [clearMissionVisualization]);

    return (
        <div>
            <div className="sidebar">
                create new component for this Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
            </div>

            {/* Controlli mappa sovrapposti */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '180px'
            }}>
                <button
                    onClick={toggleAutoCenter}
                    style={{
                        backgroundColor: autoCenter ? '#2ecc71' : '#e74c3c',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    {autoCenter ? '🔒 Auto-Centra: ON' : '🔓 Auto-Centra: OFF'}
                </button>

                <button
                    onClick={centerOnBoat}
                    disabled={!boatPosition}
                    style={{
                        backgroundColor: boatPosition ? '#3498db' : '#bdc3c7',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: boatPosition ? 'pointer' : 'not-allowed'
                    }}
                >
                    🎯 Centra su Barca
                </button>

                {/* Pulsante per centrare sulla missione */}
                {missionWaypoints && selectedMission && (
                    <button
                        onClick={centerOnMission}
                        style={{
                            backgroundColor: '#FF6B35',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🎯 Centra su Missione
                    </button>
                )}

                {boatPosition && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                        <div><strong>Posizione Barca:</strong></div>
                        <div>Lat: {boatPosition[1].toFixed(4)}°N</div>
                        <div>Lon: {boatPosition[0].toFixed(4)}°E</div>
                    </div>
                )}

                {/* Info missione */}
                {missionWaypoints && selectedMission && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                        <div><strong>Missione Attiva:</strong></div>
                        <div style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                            {selectedMission.split('/').pop().replace('.bin', '')}
                        </div>
                        <div>Waypoints: {Array.isArray(missionWaypoints) ? missionWaypoints.length : 0}</div>
                    </div>
                )}
            </div>

            <div ref={mapContainer} className="map-container" style={{ minHeight: '1000px' }} />
            {stateapp == 'WPY' && <MissionMarker map={map.current} stateapp={stateapp} />}
        </div>
    );

};

MapboxMap.propTypes = {
    stateapp: PropTypes.string.isRequired,
    mapStyle: PropTypes.string,
    missionWaypoints: PropTypes.array,
    selectedMission: PropTypes.string
}

export default MapboxMap;