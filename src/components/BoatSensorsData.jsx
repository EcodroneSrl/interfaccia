import React, { useContext, useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { WebSocketContext } from './Websockets';

const newImuData = {
    Yaw: 0,
    Pitch: 0,
    Roll: 0,
    Ax: 0,
    Ay: 0,
    Az: 0,
};

const emptyHfallData = {};

const SetGpsHtml = ({ gpsdata }) => {
    // Removed GPS display as per request; no changes here for IMU
    return null;
};

const SetHfallHtml = ({ hfall }) => {
    if (!hfall) {
        return ;
    }

    // Render all keys dynamically
    const entries = Object.entries(hfall);
    const half = Math.ceil(entries.length / 2);
    const firstCol = entries.slice(0, half);
    const secondCol = entries.slice(half);

    return (
        <>
        <Row>
            <Col xs={6}>
                <ul className="list-unstyled">
                    {firstCol.map(([key, value]) => (
                        <li key={key}>
                            <span style={{ fontWeight: 'bold' }}>{key}: </span>{value}
                        </li>
                    ))}
                </ul>
            </Col>
            <Col xs={6}>
                <ul className="list-unstyled">
                    {secondCol.map(([key, value]) => (
                        <li key={key}>
                            <span style={{ fontWeight: 'bold' }}>{key}: </span>{value}
                        </li>
                    ))}
                </ul>
            </Col>
        </Row>
        </>
    );
};

const SetHtmlImuData = ({ imudata }) => {
    if (imudata) {
        return (
            <>
                <Col xs={12}>
                    <ul className="list-unstyled">
                        <li><span style={{ fontWeight: 'bold' }}>Yaw: </span>{imudata.Yaw}</li>
                        <li><span style={{ fontWeight: 'bold' }}>Pitch: </span>{imudata.Pitch}</li>
                        <li><span style={{ fontWeight: 'bold' }}>Roll: </span>{imudata.Roll}</li>
                        <li><span style={{ fontWeight: 'bold' }}>Ax: </span>{imudata.Ax}</li>
                        <li><span style={{ fontWeight: 'bold' }}>Ay: </span>{imudata.Ay}</li>
                        <li><span style={{ fontWeight: 'bold' }}>Az: </span>{imudata.Az}</li>
                    </ul>
                </Col>
            </>
        );
    }
};

export function BoatSensorsData() {
    const { skMessage } = useContext(WebSocketContext);
    const [imuData, setImuData] = useState(newImuData);
    const [hfallData, setHfallData] = useState(emptyHfallData);

    useEffect(() => {
        if (skMessage) {
            // IMU data unchanged
            // if (skMessage.scope === "S" && skMessage.type === "1") {
            //     if (skMessage.id_message === "ImuData") {
            //         setImuData(JSON.parse(skMessage.data_command));
            //     }
            // }
            // HFALL data handling
            if (skMessage.scope === "H" && skMessage.type === 2 && skMessage.id_message === "HFALL") {
                const payload = JSON.parse(skMessage.data_command);
                // Optionally convert numeric strings to numbers here if needed
                setHfallData(payload);
            }
        }
    }, [skMessage]);

    return (
        <Row>
            {/* <Col xs={3} className="mb-4">
                <SetHtmlImuData imudata={imuData} />
            </Col> */}
            <Col xs={12}>
                <SetHfallHtml hfall={hfallData} />
            </Col>
        </Row>
    );
}
