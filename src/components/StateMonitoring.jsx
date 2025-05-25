import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Col, Form, Button, Row } from 'react-bootstrap';
import { MapContext } from '../components/MultiComponents/EcoMap';
import { WebSocketContext } from './Websockets';

export function ChangeAppState({ changeState }) {

    const [selectedOption, setSelectedOption] = useState('');
   
    const handleSelectChange = (event) => {

        let mode = event.target.value;
        setSelectedOption(mode);
    };

    useEffect(() => { 
        //  console.log('Selected option:', selectedOption) 
    }, [selectedOption]);

    const handleSubmit = () => {

        changeState(selectedOption);
    };

    return (
            <Row>
                <Col xs={10}>
                    <Form.Select value={selectedOption} onChange={handleSelectChange}>
                        <option value="STD">Standard</option> 
                        <option value="WPY">Waypoints</option>
                        <option value="MSS">Missions</option>
                        {/* <option value="NAV">Navigation</option> */}
                    </Form.Select>
                </Col>
                <Col xs={2}>
                    <Button onClick={handleSubmit}>Submit</Button>
                </Col>
            </Row>
    
    );
}

ChangeAppState.propTypes = {
    changeState: PropTypes.func.isRequired
};