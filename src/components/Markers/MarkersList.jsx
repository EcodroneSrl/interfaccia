import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Col, Row } from 'react-bootstrap';
import { MapContext } from '../MultiComponents/EcoMap';




const MarkerList = () => {


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
        }
        

    }, [mapmarkers]);

    const handleInputChange = (e, index) => {


        //(idmarker, typeevent, dataevent)
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

    if (mapmarkers.features.length === 0) {
        return null;
    } else {
        return (
            <div>
                <h2>Markers List</h2>
               
                <Form id="form-map-points" onSubmit={handleSubmit}>
                    {formData.map((data, index) => (
                        <div key={index} style={{ border: '1px solid rgba(0, 0, 0, 0.4)', marginBottom: '10px', padding: '10px' }}>
                            <Row key={index} >
                                <Col>
                                    <Form.Label>Marker {index}</Form.Label>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`lng-${index}-marker`}>
                                        <Form.Label>Longitude</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="lng"
                                            value={data.lng}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Longitude"
                                            step="0.000001"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`lat-${index}-marker`}>
                                        <Form.Label>Latitude</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="lat"
                                            value={data.lat}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Latitude"
                                            step="0.000001"
                                        />
                                    </Form.Group>
                                </Col>
                                </Row>
                                <Row>
                                <Col>
                                    <Form.Group controlId={`navmode-${index}-marker`}>
                                        <Form.Label>Nav Mode</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="navmode"
                                            value={data.navmode}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Mode"
                                            step="1"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`ptype-${index}-marker`}>
                                        <Form.Label>Point Type</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="pointype"
                                            value={data.pointype}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Type"
                                            step="1"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`mon-${index}-marker`}>
                                        <Form.Label>Monitoring Op</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="mon"
                                            defaultValue={data.mon}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Monit"
                                            step="1"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`amode-${index}-marker`}>
                                        <Form.Label>Arrive Mode</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="amode"
                                            defaultValue={data.amode}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="ModeA"
                                            step="1"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={`wrad-${index}-marker`}>
                                        <Form.Label>Radius</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="wrad"
                                            defaultValue={data.wrad}
                                            onChange={(e) => handleInputChange(e, index)}
                                            placeholder="Rad"
                                            step="0.000001"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    ))}
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

export default MarkerList;
