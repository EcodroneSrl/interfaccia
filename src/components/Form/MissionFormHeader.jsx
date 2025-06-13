import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Col, Row } from 'react-bootstrap';
import { MapContext } from '../MultiComponents/EcoMap';

const MissionForm = () => {
    const { handleSubmitHeaderMission, handleChangeInHeader, headerData } = useContext(MapContext);
  
    const [formData, setFormData] = useState({
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

    const handleChange = (e) => {
        try {
            const { name, value } = e.target;
            const newValue = name === "NMmode" ? Number(value) : value;
            const allFormData = Object.fromEntries(new FormData(e.target.form).entries());
            allFormData[name] = newValue;
            handleChangeInHeader(allFormData);
        } catch (error) {
            console.error('Errore nel gestire il cambio di valore:', error);
        }
    };

    const handleSubmit = (e) => {
        try {
            e.preventDefault();
            handleSubmitHeaderMission(formData);
        } catch (error) {
            console.error('Errore nel submit del form:', error);
        }
    };

    useEffect(() => { 
        if (headerData) {
            setFormData(headerData);
        }
    }, [headerData]);

    return (
        <Form onSubmit={handleSubmit}>
            <Row>
                <Col xs={3}>
                    <Form.Group controlId="formIdMission">
                        <Form.Label>IdMission:</Form.Label>
                        <Form.Control
                            type="text"
                            name="IdMission"
                            value={formData?.IdMission || ''}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formMissionNumber">
                        <Form.Label>MissionNumber:</Form.Label>
                        <Form.Control
                            type="number"
                            name="MissionNumber"
                            value={formData?.MissionNumber || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formTotalWayPoint">
                        <Form.Label>TotalWayPoint:</Form.Label>
                        <Form.Control
                            type="number"
                            name="TotalWayPoint"
                            value={formData?.TotalWayPoint || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formWpStart">
                        <Form.Label>WpStart:</Form.Label>
                        <Form.Control
                            type="number"
                            name="WpStart"
                            value={formData?.WpStart || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formCycles">
                        <Form.Label>Cycles:</Form.Label>
                        <Form.Control
                            type="number"
                            name="Cycles"
                            value={formData?.Cycles || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formWpEnd">
                        <Form.Label>WpEnd:</Form.Label>
                        <Form.Control
                            type="number"
                            name="WpEnd"
                            value={formData?.WpEnd || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Form.Group controlId="formNMmode">
                    <Form.Label>NMmode:</Form.Label>
                    <Form.Control
                        as="select"
                        name="NMmode"
                        value={formData?.NMmode || -1}
                        onChange={handleChange}
                    >
                        <option value="0">mode one</option>
                        <option value="1">mode two</option>
                        <option value="2">mode three</option>
                    </Form.Control>
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formNMnum">
                        <Form.Label>NMnum:</Form.Label>
                        <Form.Control
                            type="number"
                            name="NMnum"
                            value={formData?.NMnum || -1}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formNMstart">
                        <Form.Label>NMstart:</Form.Label>
                        <Form.Control
                            type="number"
                            name="NMstart"
                            value={formData?.NMstart || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formIdMissionNext">
                        <Form.Label>IdMissionNext:</Form.Label>
                        <Form.Control
                            type="text"
                            name="IdMissionNext"
                            value={formData?.IdMissionNext || ''}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="formStandRadius">
                        <Form.Label>StandRadius:</Form.Label>
                        <Form.Control
                            type="number"
                            name="StandRadius"
                            value={formData?.StandRadius || 0}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Button variant="primary" id="sub-form" type="submit">
                Submit
            </Button>
        </Form>
    );
};

export default MissionForm;
