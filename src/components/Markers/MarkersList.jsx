import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Col, Row, Table } from 'react-bootstrap';
import { MapContext } from '../MultiComponents/EcoMap';

const MarkerList = ({ editorMode, autoSubmit }) => {
    const { mapmarkers, handleSubmitFormPoints, handleSinglePointSingleValueChange } = useContext(MapContext);
    const [formData, setFormData] = useState([]);
    const [isButtonVisible, setIsButtonVisible] = useState(true);

    useEffect(() => {
        if (mapmarkers.features.length > 0) {
            const initialData = mapmarkers.features.map(marker => ({
                lng: marker.geometry.coordinates[0],
                lat: marker.geometry.coordinates[1],
                navmode: marker.extra.navmode,
                pointype: marker.extra.pointype,
                mon: marker.extra.mon,
                amode: marker.extra.amode,
                wrad: marker.extra.wrad,
            }));
            setFormData(initialData);
        } else if (editorMode) {
            setFormData([]); // Tabella vuota in modalità editor
        }
    }, [mapmarkers, editorMode]);

    useEffect(() => {
        if (autoSubmit) {
            setIsButtonVisible(false); // Simula il click su Submit
        }
    }, [autoSubmit]);

    const handleInputChange = (e, index) => {
        const { name, value } = e.target;
        const updatedData = [...formData];
        var data = [];
        if (name.toString() === "lng" || name.toString() === "lat") {
            let lngelement = document.getElementById("lng-" + index + "-marker")
            let latelement = document.getElementById("lat-" + index + "-marker")
            var val_lng = lngelement.value
            var val_lat = latelement.value;
            data = [val_lng, val_lat]
        } else {
            data = [value];
        }
        updatedData[index][name] = value;
        setFormData(updatedData);
        handleSinglePointSingleValueChange(index, name, data)
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSubmitFormPoints(formData);
        setIsButtonVisible(false);
    };

    // Mostra la tabella solo se editorMode è attivo
    if (!editorMode) {
        return null;
    } else {
        return (
            <div style={{ width: '100%', marginTop: 0, padding: 0 }}>
                <h2>Waypoints</h2>
                <Form id="form-map-points" onSubmit={handleSubmit}>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Longitude</th>
                                <th>Latitude</th>
                                <th>Nav Mode</th>
                                <th>Point Type</th>
                                <th>Monitoring Op</th>
                                <th>Arrive Mode</th>
                                <th>Radius</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: '#888' }}>
                                        Nessun waypoint. Clicca sulla mappa per aggiungere un punto.
                                    </td>
                                </tr>
                            ) : (
                                formData.map((data, index) => (
                                    <tr key={index}>
                                        <td>{index}</td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="lng"
                                                id={`lng-${index}-marker`}
                                                value={data.lng}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Longitude"
                                                step="0.000001"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="lat"
                                                id={`lat-${index}-marker`}
                                                value={data.lat}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Latitude"
                                                step="0.000001"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="navmode"
                                                value={data.navmode}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Mode"
                                                step="1"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="pointype"
                                                value={data.pointype}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Type"
                                                step="1"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="mon"
                                                value={data.mon}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Monit"
                                                step="1"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="amode"
                                                value={data.amode}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="ModeA"
                                                step="1"
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                name="wrad"
                                                value={data.wrad}
                                                onChange={(e) => handleInputChange(e, index)}
                                                placeholder="Rad"
                                                step="0.000001"
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                    {isButtonVisible && (
                        <Button variant="primary" id="sub-points" type="submit">
                            Submit
                        </Button>
                    )}
                </Form>
            </div>
        );
    }
};

MarkerList.propTypes = {
    editorMode: PropTypes.bool,
    autoSubmit: PropTypes.bool
};

export default MarkerList;
