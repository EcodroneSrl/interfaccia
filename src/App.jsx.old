import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import 'jquery/dist/jquery.min.js';
import 'bootstrap/dist/js/bootstrap.min.js';
import { WebSocketMonitoring } from './components/WebSocketMonitoring';
import { UserIdMonitoring } from './components/UserIdMonitoring';
import { WebSocketProvider } from './components/Websockets';
import { Row, Col, Container } from 'react-bootstrap';
import { BoatSensorsData } from './components/BoatSensorsData';
import { Missions } from './components/Missions/Missions';
import { EcoMap } from './components/MultiComponents/EcoMap';
import { ChangeAppState } from './components/StateMonitoring';
import MapboxMap from './components/MapBox/Mapbox';
import MissionForm from './components/Form/MissionFormHeader';
import MarkerList from './components/Markers/MarkersList';
// import { ClientWebRtcComponent } from './components/ClientWebRtcComponent';
import JoystickReader from './components/Navigation/joy';
import LiveStreamPlayer from './components/livestreamplayer'

//Define state cannot be done so here is my list
// STD (STANDARD MDOE) -> display blocks for data continously
// MEM (MEMORY MODE) -> ACCESS FLASH MEMORY
// WPY (WAYPOINT) -> CREATE WAYPOINT MODE
// MAP (MAPMODE) -> BOH
// VID

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            user_id: "NNN",
            tocktock: "NNN",
            mapMode: "NNN",
            appst: "STD",
        };
    }


    handleLoginSuccess = (ticktock) => {
        // Perform actions after successful login
        this.setState({ tocktock: ticktock });
    };

    render() {

        const { tocktock, appst, user_id } = this.state;

        const setAppState = (newState) => {
            this.setState({ appst: newState }, () => {
                //  console.log("STATE: " + this.state.appst);
            });
        };

        const setUserId = (uid) => {
            this.setState({ user_id: uid }, () => {
            });
        };


        return (
            <Container fluid>
                    <div>
                        <WebSocketProvider uidcallback={setUserId}>
                            <EcoMap stateapp={appst} uuid={user_id}>
                                <Row>
                                    <WebSocketMonitoring />
                                    <UserIdMonitoring  userid={user_id} ></UserIdMonitoring>
                                </Row>
                                <Row >
                                    <Col xs={8} >
                                    </Col>
                                    <Col xs={4}>
                                        <ChangeAppState changeState={setAppState} uuid={user_id} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={3}>
                                           <LiveStreamPlayer
                                                url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream0/video1_stream.m3u8"
                                            />
                                    </Col>
                                    <Col xs={3}>
                                        <LiveStreamPlayer
                                                url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream1/video1_stream.m3u8"
                                            />
                                    </Col>
                                    <Col xs={3}>
                                        <LiveStreamPlayer
                                                url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream2/video1_stream.m3u8"
                                            />
                                    </Col>
                                    <Col xs={3}>
                                    <LiveStreamPlayer
                                                url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream3/video1_stream.m3u8"
                                            />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>
                                        <BoatSensorsData />
                                    </Col>
                                    <Col xs={8}>
                                        <JoystickReader stateapp={appst} userid={user_id} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={8}>
                                        <MapboxMap stateapp={appst} />
                                    </Col>
                                    {this.state.appst === "MSS" ? (
                                        <Col xs={4}>
                                        <Missions stateapp={appst} userid={user_id} />
                                        </Col>
                                    ) : null}
                                    {this.state.appst === "WPY" ? (
                                        <>
                                        <Col xs={4}>
                                            <Row>
                                                <Col>
                                                <MissionForm stateapp={appst} userid={user_id} />
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col>
                                                <MarkerList stateapp={appst} userid={user_id} />
                                                </Col>
                                            </Row>
                                        </Col>
                                        </>
                                    ) : null}
                                    </Row>
                            </EcoMap>
                        </WebSocketProvider>
                    </div>
                {/* )} */}
            </Container>
        );
    }
}
