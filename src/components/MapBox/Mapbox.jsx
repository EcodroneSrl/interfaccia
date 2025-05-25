// Ecomap.jsx
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapContext } from '../MultiComponents/EcoMap';
import { map } from 'jquery';
import MissionMarker from '../Markers/MissionMarkers'
import { WebSocketContext } from '../Websockets';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWNvZHJvbmUiLCJhIjoiY2xnZjYzZzRxMDFjMzNkbW43Z3BsbW1yNSJ9.S2dYTcn4i6myxzNVxWmxgQ';

const MapboxMap = ({ stateapp }) => {

    const { handleAddMarker, mapmarkers, clearMap } = useContext(MapContext);

    const mapContainer = useRef(null);

    const { skMessage } = useContext(WebSocketContext);

    const map = useRef(null)

    const [lng, setLng] = useState(10.369610831036084);
    const [lat, setLat] = useState(42.937242433545975);
    const [zoom, setZoom] = useState(9);

    const markerRef = useRef(null);
   

    var mapStyle = 'mapbox://styles/mapbox/streets-v11';

    useEffect(() => {

        if (skMessage) {
            // //  console.log(skMessage);
            if(skMessage.scope === "H")
            {
                if(skMessage.type == 2)
                {
                    if(skMessage.id_message == "HFALL")
                    {
                        let llon = JSON.parse(skMessage.data_command).Lon;
                        let llan = JSON.parse(skMessage.data_command).Lat;

                        map.current.flyTo({
                            center: [llon, llan],
                            zoom,
                            essential: true,
                          });

                        map.current.on('move', funcOnMove);
                      
                        if (markerRef.current) {
                            markerRef.current.setLngLat([llon, llan]);
                        }

                    }
                }
            }
        }
        
    }, [skMessage]);


    const funcOnMove = () => {

        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));

    }

    const funcOnClick = useCallback((e) => {

        if (stateapp === 'WPY') {

            if (e.originalEvent.target.closest('.mapboxgl-marker')) {
                return;
            }

            const features = map.current.queryRenderedFeatures(e.point);
            const waterFeatures = features.filter(feature => feature.layer.id === 'water');

            if (waterFeatures.length == 0) {
                return;
            }


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
            }
        }
    }, [stateapp, handleAddMarker, map]);




    useEffect(() => {

        if (!map.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: mapStyle,
                center: [lng,lat],
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

    }, [stateapp, handleAddMarker, funcOnClick, mapStyle, clearMap]);

    return (
        <div>
            <div className="sidebar">
                create new component for this Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
            </div>

            <div ref={mapContainer} className="map-container" style={{ minHeight: '1000px' }} />
            {stateapp == 'WPY' && <MissionMarker map={map.current} stateapp={stateapp} />}
        </div>
    );

};

MapboxMap.propTypes = {
    stateapp: PropTypes.string.isRequired
}
/*MarkerList.propTypes = {
    markers: PropTypes.arrayOf(PropTypes.object).isRequired,
    onSubmitForm: PropTypes.func.isRequired,
    onSingleChange: PropTypes.func.isRequired
};*/

export default MapboxMap;
