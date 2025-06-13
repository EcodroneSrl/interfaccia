import React, { useState, useEffect, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Container } from 'react-bootstrap';
import { WebSocketContext } from '../Websockets';

const MapContext = React.createContext();
const MapContextConsumer = MapContext.Consumer;

export const EcoMap = ({ children, appst, uuid }) => {
    const [mapmarkers, setMapMarkers] = useState({
        type: 'FeatureCollection',
        features: []
    });

    const missionlist = useRef([]);
    const { skMessage, sendMessage } = useContext(WebSocketContext);

    const [headerData, setHeaderData] = useState({
        IdMission: 'NNN',
        MissionNumber: 0,
        TotalWayPoint: 0,
        WpStart: 0,
        Cycles: 0,
        WpEnd: 0,
        NMmode: -1,
        NMnum: -1,
        NMstart: 0,
        IdMissionNext: 'NNN',
        StandRadius: 0,
    });

    const createNewFeature = (
        coordinates = [],
        title = -1,
        description = '',
        inavmode = 0,
        ipointtype = 0,
        imoni = 0,
        iamode = 0,
        iwrad = 0
    ) => {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates,
            },
            properties: {
                id: title,
                description: description
            },
            extra: {
                navmode: inavmode,
                pointype: ipointtype,
                mon: imoni,
                amode: iamode,
                wrad: iwrad,
            },
            header: {
                startWaypoint: false,
                endwaypoint: false,
            }
        };
    };

    // Reset the map markers and mission points
    const ResetMarkers = () => {
        setMapMarkers({
            type: 'FeatureCollection',
            features: []
        });
        missionlist.current = [];
    };

    const handleAddMarker = (latLng, eventline = false, id = -1) => {
        const lngLat = [latLng.lng, latLng.lat];
        const counter = mapmarkers.features.length;
        const featureInstance = createNewFeature(lngLat, counter.toString(), "world");

        setMapMarkers(prevState => {
            const newFeatures = [...prevState.features];
            if (eventline) {
                newFeatures.splice(id + 1, 0, featureInstance);
            } else {
                newFeatures.push(featureInstance);
            }
            newFeatures.forEach((el, indx) => {
                el.properties.id = indx.toString();
            });
            return { ...prevState, features: newFeatures };
        });

        if (headerData.WpStart <= id && id <= headerData.WpEnd) {
            const newEnd = parseInt(headerData.WpEnd) + 1;
            setHeaderData({ ...headerData, WpEnd: newEnd.toString() });
        }
    };

    const handleSubmitFormPoints = (formdata) => {
        missionlist.current = formdata;
        const standard_rad = 0.000002;
        missionlist.current.forEach(way => {
            if (way.wrad === 0) {
                way.wrad = standard_rad.toString();
            }
        });
    };

    const handleChangeInHeader = (allformdata) => {
        // Reset start and end waypoint flags on all markers.
        mapmarkers.features.forEach(mm => {
            mm.header.startWaypoint = false;
            mm.header.endwaypoint = false;
        });

        const indexs = mapmarkers.features.findIndex(
            marker => marker.properties.id === allformdata.WpStart
        );
        if (indexs !== -1) {
            mapmarkers.features[indexs].header.startWaypoint = true;
        }

        const indexe = mapmarkers.features.findIndex(
            marker => marker.properties.id === allformdata.WpEnd
        );
        if (indexe !== -1) {
            mapmarkers.features[indexe].header.endwaypoint = true;
        }

        setMapMarkers({
            type: 'FeatureCollection',
            features: [...mapmarkers.features]
        });
        setHeaderData(allformdata);
    };

    // Modified downloadCSV function to produce the desired CSV format:
    const downloadCSV = (fdata) => {
        // fdata contains the mission parameters.
        // missionlist.current contains the points array.
        const missionparam = fdata;
        const pointslistData = missionlist.current;

        // Build the first row with 11 mission parameters.
        const missionParamRow = [
            missionparam.IdMission,
            missionparam.MissionNumber,
            missionparam.TotalWayPoint,
            missionparam.WpStart,
            missionparam.Cycles,
            missionparam.WpEnd,
            missionparam.NMmode,
            missionparam.NMnum,
            missionparam.NMstart,
            missionparam.IdMissionNext,
            missionparam.StandRadius
        ];

        const csvRows = [];
        csvRows.push(missionParamRow.join(','));

        // For each point, output a row with 9 columns:
        // Mission index ("0"), the point's index, latitude, longitude, navmode, pointype, mon, amode, and wrad.
        pointslistData.forEach((point, index) => {
            const pointRow = [
                '0', // Fixed mission index
                index,
                point.lat,
                point.lng,
                point.navmode,
                point.pointype,
                point.mon,
                point.amode,
                point.wrad
            ];
            csvRows.push(pointRow.join(','));
        });

        // Create CSV content and trigger file download.
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mission_data_with_points.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmitHeaderMission = (fdata) => {
        downloadCSV(fdata);
        const obj = {
            missionparam: fdata,
            pointslist: missionlist.current
        };
        const jsonString = JSON.stringify(obj);
        const msgData = {
            scope: "W",
            type: 0,
            id_message: "UPH", // UpMission
            data_command: jsonString
        };

        //  console.log("HEY I AM SENDING " + jsonString);
        sendMessage(msgData);

        // Reset the map and header.
        ResetMarkers();
        setHeaderData({
            IdMission: 'NNN',
            MissionNumber: 0,
            TotalWayPoint: 0,
            WpStart: 0,
            Cycles: 0,
            WpEnd: 0,
            NMmode: -1,
            NMnum: -1,
            NMstart: 0,
            IdMissionNext: 'NNN',
            StandRadius: 0,
        });
    };

    const handleRemoveMarker = (oldMarkerid) => {
        if (headerData.WpStart <= oldMarkerid && oldMarkerid <= headerData.WpEnd) {
            const newEnd = parseInt(headerData.WpEnd) - 1;
            setHeaderData({ ...headerData, WpEnd: newEnd.toString() });
        }
        setMapMarkers(prevState => {
            const newFeatures = mapmarkers.features
                .filter(marker => marker.properties.id !== oldMarkerid)
                .map((el, indx) => {
                    el.properties.id = indx.toString();
                    return el;
                });
            return { ...prevState, features: newFeatures };
        });
    };

    const handlePositionChangeMarker = (oldMarkerid, eventcoordinates) => {
        const index = mapmarkers.features.findIndex(
            marker => marker.properties.id === oldMarkerid
        );
        if (index !== -1) {
            const lng = parseFloat(eventcoordinates.lng);
            const lat = parseFloat(eventcoordinates.lat);
            setMapMarkers(prevState => {
                const newFeatures = [...prevState.features];
                newFeatures[index] = {
                    ...newFeatures[index],
                    geometry: {
                        ...newFeatures[index].geometry,
                        coordinates: [lng, lat]
                    }
                };
                return { ...prevState, features: newFeatures };
            });
        }
    };

    const handleSinglePointSingleValueChange = (idmarker, typeevent, dataevent) => {
        const index = mapmarkers.features.findIndex(marker => marker.properties.id == idmarker);
        if (index !== -1) {
            switch (typeevent) {
                case "lng":
                case "lat":
                    const lng = parseFloat(dataevent[0]);
                    const lat = parseFloat(dataevent[1]);
                    mapmarkers.features[index].geometry.coordinates = [lng, lat];
                    break;
                case "wrad":
                    mapmarkers.features[index].extra[typeevent] = parseFloat(dataevent[0]);
                    break;
                default:
                    mapmarkers.features[index].extra[typeevent] = parseInt(dataevent[0]);
                    break;
            }
            setMapMarkers({
                type: 'FeatureCollection',
                features: [...mapmarkers.features]
            });
        }
    };

    useEffect(() => {
        setHeaderData(prevHead => ({
            ...prevHead,
            TotalWayPoint: mapmarkers.features.length
        }));
    }, [mapmarkers]);

    return (
        <MapContext.Provider value={{ handleAddMarker, mapmarkers, clearMap: ResetMarkers }}>
            <div style={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {children}
            </div>
        </MapContext.Provider>
    );
};

EcoMap.propTypes = {
    children: PropTypes.node,
    appst: PropTypes.string,
    uuid: PropTypes.string.isRequired
};

export { MapContext, MapContextConsumer };
