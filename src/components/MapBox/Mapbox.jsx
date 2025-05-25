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

const MapboxMap = ({ stateapp, mapStyle = "satellite" }) => {

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

                {boatPosition && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                        <div><strong>Posizione Barca:</strong></div>
                        <div>Lat: {boatPosition[1].toFixed(4)}°N</div>
                        <div>Lon: {boatPosition[0].toFixed(4)}°E</div>
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
    mapStyle: PropTypes.string
}
/*MarkerList.propTypes = {
    markers: PropTypes.arrayOf(PropTypes.object).isRequired,
    onSubmitForm: PropTypes.func.isRequired,
    onSingleChange: PropTypes.func.isRequired
};*/

export default MapboxMap;