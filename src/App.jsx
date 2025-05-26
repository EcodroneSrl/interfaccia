import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import 'jquery/dist/jquery.min.js';
import 'bootstrap/dist/js/bootstrap.min.js';
import { WebSocketMonitoring } from './components/WebSocketMonitoring';
import { UserIdMonitoring } from './components/UserIdMonitoring';
import { WebSocketProvider, WebSocketContext } from './components/Websockets';
import { BoatSensorsData } from './components/BoatSensorsData';
import { Missions } from './components/Missions/Missions';
import { EcoMap } from './components/MultiComponents/EcoMap';
import { ChangeAppState } from './components/StateMonitoring';
import MapboxMap from './components/MapBox/Mapbox';
import MissionForm from './components/Form/MissionFormHeader';
import MarkerList from './components/Markers/MarkersList';
import JoystickReader from './components/Navigation/joy';
import LiveStreamPlayer from './components/livestreamplayer';

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            user_id: "NNN",
            tocktock: "NNN",
            mapMode: "NNN",
            appst: "STD",
            selectedMode: "Teleguidata"
        };
    }

    handleLoginSuccess = (ticktock) => {
        this.setState({ tocktock: ticktock });
    };

    render() {
        const { tocktock, appst, user_id, selectedMode } = this.state;

        const setAppState = (newState) => {
            this.setState({ appst: newState });
        };

        const setUserId = (uid) => {
            this.setState({ user_id: uid });
        };

        return (
            <div style={styles.body}>
                <WebSocketProvider uidcallback={setUserId}>
                    <EcoMap stateapp={appst} uuid={user_id}>
                        <DroneBoatInterface
                            appst={appst}
                            user_id={user_id}
                            setAppState={setAppState}
                            setUserId={setUserId}
                        />
                    </EcoMap>
                </WebSocketProvider>
            </div>
        );
    }
}

// Componente che gestisce la separazione dei dati
class DroneBoatInterface extends React.Component {
    static contextType = WebSocketContext;

    constructor(props) {
        super(props);

        this.state = {
            joystickData: {
                BoostX: "N/A",
                ViraY: "N/A",
                Gas: "N/A",
                Ruota: "N/A"
            }
        };
    }

    componentDidMount() {
        this.updateData();
    }

    componentDidUpdate(prevProps) {
        if (this.context.skMessage !== prevProps.skMessage) {
            this.updateData();
        }
    }

    updateData = () => {
        const { skMessage } = this.context;

        if (skMessage && skMessage.scope === "H" && skMessage.type === 2 && skMessage.id_message === "HFALL") {
            try {
                const hfallData = JSON.parse(skMessage.data_command);

                // Estrai i dati di controllo joystick
                const newJoystickData = { ...this.state.joystickData };

                if (hfallData.BoostX !== undefined) newJoystickData.BoostX = hfallData.BoostX;
                if (hfallData.ViraY !== undefined) newJoystickData.ViraY = hfallData.ViraY;
                if (hfallData.Gas !== undefined) newJoystickData.Gas = hfallData.Gas;
                if (hfallData.Ruota !== undefined) newJoystickData.Ruota = hfallData.Ruota;

                this.setState({ joystickData: newJoystickData });
            } catch (error) {
                console.error('Error parsing HFALL data:', error);
            }
        }
    };

    render() {
        const { appst, user_id, setAppState } = this.props;
        const { joystickData } = this.state;

        return (
            <>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.title}>DroneBoat Control</div>
                    <div style={styles.statusIndicator}>
                        <div style={styles.statusDot}></div>
                        <div>Connesso</div>
                    </div>
                    <div>IP: 192.168.1.10</div>
                    <div style={styles.powerStatus}>
                        <div>GENERAZIONE: 180W</div>
                        <div>CONSUMO: 120W</div>
                        <div style={styles.powerBar}></div>
                    </div>
                    <div style={styles.batteryPercent}>85%</div>
                    <div style={styles.closeBtn}>X</div>
                </div>

                {/* Container */}
                <div style={styles.container}>
                    {/* Left Sidebar */}
                    <div style={styles.sidebar}>
                        <div style={styles.sectionTitle}>Albero Missioni</div>
                        <button style={styles.blueBtn}>Aggiorna</button>

                        <div style={styles.treeItem}>/ (Root)</div>
                        <div style={styles.treeItem}>Missioni</div>
                        <div style={styles.treeItem}>Costiere</div>
                        <div style={{ ...styles.treeItem, ...styles.selected }}>MB-3 | WP: 4</div>

                        <div style={styles.btnGroup}>
                            <button style={styles.greenBtn}>Avvia</button>
                            <button style={styles.blueBtn}>Visualizza</button>
                            <button style={styles.redBtn}>Elimina</button>
                        </div>

                        <div style={styles.sectionTitle}>Modalità di Guida:</div>

                        <div style={styles.dropdown}>
                            <button style={styles.blueBtn}>Teleguiadata ▼</button>
                        </div>

                        <div style={styles.dropdown}>
                            <button style={styles.greenBtn}>Autonoma ▼</button>
                        </div>

                        <button style={styles.redBtn}>INVIA</button>

                        <div style={{ ...styles.sectionTitle, marginTop: '20px' }}>Crea Nuova Missione</div>
                        <div style={styles.miniMap}>
                            <div style={{ ...styles.waypoint, top: '30%', left: '20%' }}>1</div>
                            <div style={{ ...styles.waypoint, top: '30%', left: '50%' }}>2</div>
                            <div style={{ ...styles.waypoint, top: '50%', left: '80%' }}>3</div>
                            <div style={{ ...styles.waypoint, top: '70%', left: '30%' }}>4</div>
                        </div>
                        <button style={styles.blueBtn}>Apri Editor</button>

                        {/* State Controller */}
                        <div style={{ marginTop: '20px' }}>
                            <ChangeAppState changeState={setAppState} uuid={user_id} />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={styles.mainContent}>
                        {/* Camera View */}
                        <div style={styles.cameraView}>
                            <h2>Camera Principale</h2>
                            <div style={styles.cameraOptions}>
                                <div style={styles.cameraOption}>
                                    <LiveStreamPlayer url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream0/video1_stream.m3u8" />
                                </div>
                                <div style={styles.cameraOption}>
                                    <LiveStreamPlayer url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream1/video1_stream.m3u8" />
                                </div>
                                <div style={styles.cameraOption}>
                                    <LiveStreamPlayer url="https://livestreaming.hightek.it/ecodrone/MGEC0001/stream2/video1_stream.m3u8" />
                                </div>
                            </div>
                            <button style={{ ...styles.blueBtn, marginTop: '20px' }}>Cambia Vista</button>
                        </div>

                        {/* Map View */}
                        <div style={styles.mapView}>
                            <h2 style={{ color: 'white', padding: '10px' }}>Mappa Satellitare</h2>

                            {/* MapboxMap component */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                                <MapboxMap stateapp={appst} />
                            </div>

                            {/* Mission/Waypoint Forms */}
                            {appst === "MSS" && (
                                <div style={styles.overlayPanel}>
                                    <Missions stateapp={appst} userid={user_id} />
                                </div>
                            )}
                            {appst === "WPY" && (
                                <div style={styles.overlayPanel}>
                                    <MissionForm stateapp={appst} userid={user_id} />
                                    <MarkerList stateapp={appst} userid={user_id} />
                                </div>
                            )}

                            <div style={styles.mapInfoBottom}>
                                <div>TEL_MODE_2 - Con mantenimento rotta</div>
                                <div>Autonomia: 4.5h</div>
                                <div>Distanza: 120m</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div style={styles.rightSidebar}>
                        <div style={styles.sectionTitle}>Telemetria</div>

                        {/* Boat Sensors Data */}
                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Dati Sensori</div>
                            <BoatSensorsData />
                        </div>

                        {/* Mock Telemetry Data */}
                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Posizione</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Lat:</span>
                                <span style={styles.telemetryValue}>41.8827° N</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Lon:</span>
                                <span style={styles.telemetryValue}>12.4964° E</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Alt:</span>
                                <span style={styles.telemetryValue}>0.5m</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Orientamento</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Pitch:</span>
                                <span style={styles.telemetryValue}>2.1°</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Roll:</span>
                                <span style={styles.telemetryValue}>0.5°</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Yaw:</span>
                                <span style={styles.telemetryValue}>182°</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Navigazione</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Velocità:</span>
                                <span style={styles.telemetryValue}>3.2 kn</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Rotta:</span>
                                <span style={styles.telemetryValue}>182°</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Target:</span>
                                <span style={styles.telemetryValue}>20°</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Energia</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Consumo:</span>
                                <span style={{ ...styles.telemetryValue, color: 'red' }}>120W</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Generazione:</span>
                                <span style={{ ...styles.telemetryValue, color: 'green' }}>180W</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Efficienza:</span>
                                <span style={styles.telemetryValue}>150%</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Motori RPM</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Motore 1:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>1250</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Motore 2:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>1280</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Motore 3:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>1255</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Motore 4:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>1265</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Media:</span>
                                <span style={styles.telemetryValue}>1262.5 RPM</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Stato Sistema</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Temperatura:</span>
                                <span style={styles.telemetryValue}>28°C</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Umidità:</span>
                                <span style={styles.telemetryValue}>65%</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Autonomia:</span>
                                <span style={styles.telemetryValue}>4.5h</span>
                            </div>
                        </div>

                        {/* Joystick Reader - Compact Version */}
                        <div style={styles.joystickSection}>
                            <div style={styles.sectionTitle}>Controllo Joystick</div>

                            {/* Dati Controllo Joystick */}
                            <div style={styles.joystickDataSection}>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>BoostX:</span>
                                    <span style={{ ...styles.telemetryValue, color: '#2196F3' }}>{joystickData.BoostX}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>ViraY:</span>
                                    <span style={{ ...styles.telemetryValue, color: '#2196F3' }}>{joystickData.ViraY}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Gas:</span>
                                    <span style={{ ...styles.telemetryValue, color: '#4CAF50' }}>{joystickData.Gas}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Ruota:</span>
                                    <span style={{ ...styles.telemetryValue, color: '#FF9800' }}>{joystickData.Ruota}</span>
                                </div>
                            </div>

                            <div style={{ fontSize: '12px', transform: 'scale(0.8)', transformOrigin: 'top left', marginTop: '10px' }}>
                                <JoystickReader stateapp={appst} userid={user_id} />
                            </div>
                        </div>

                        {/* Connection Monitoring */}
                        <div style={styles.monitoringSection}>
                            <WebSocketMonitoring />
                            <UserIdMonitoring userid={user_id} />
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

// Styles object replicating the HTML CSS
const styles = {
    body: {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f0f0f0'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a3a5a',
        color: 'white',
        padding: '10px 20px'
    },
    title: {
        fontSize: '18px',
        fontWeight: 'bold'
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    statusDot: {
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: '#2ecc71'
    },
    powerStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    powerBar: {
        width: '100px',
        height: '10px',
        backgroundColor: '#2ecc71',
        borderRadius: '5px'
    },
    batteryPercent: {
        backgroundColor: '#3498db',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px'
    },
    closeBtn: {
        backgroundColor: '#e74c3c',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px',
        cursor: 'pointer'
    },
    container: {
        display: 'flex',
        height: 'calc(100vh - 50px)'
    },
    sidebar: {
        width: '300px',
        backgroundColor: 'white',
        padding: '10px',
        borderRight: '1px solid #ddd',
        overflowY: 'auto'
    },
    mainContent: {
        flex: 1,
        padding: '10px',
        display: 'flex',
        flexDirection: 'column'
    },
    rightSidebar: {
        width: '300px',
        backgroundColor: 'white',
        padding: '10px',
        borderLeft: '1px solid #ddd',
        overflowY: 'auto'
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: '10px',
        paddingBottom: '5px',
        borderBottom: '1px solid #ddd'
    },
    treeItem: {
        padding: '5px 10px',
        margin: '2px 0',
        backgroundColor: '#f8f8f8',
        cursor: 'pointer'
    },
    selected: {
        backgroundColor: '#e0f0ff'
    },
    blueBtn: {
        backgroundColor: '#3498db',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '5px'
    },
    greenBtn: {
        backgroundColor: '#2ecc71',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '5px'
    },
    redBtn: {
        backgroundColor: '#e74c3c',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '5px'
    },
    btnGroup: {
        display: 'flex',
        margin: '10px 0'
    },
    dropdown: {
        position: 'relative',
        display: 'inline-block',
        margin: '5px'
    },
    cameraView: {
        flex: 2,
        backgroundColor: '#333',
        marginBottom: '10px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    mapView: {
        flex: 1,
        backgroundColor: '#1a3a5a',
        position: 'relative',
        minHeight: '400px'
    },
    telemetrySection: {
        backgroundColor: 'white',
        marginBottom: '10px',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #e0e0e0'
    },
    telemetryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '8px 0',
        padding: '4px 0',
        borderBottom: '1px solid #f0f0f0',
        minHeight: '24px'
    },
    telemetryLabel: {
        fontWeight: 'bold',
        color: '#555',
        fontSize: '13px',
        minWidth: '80px',
        textAlign: 'left'
    },
    telemetryValue: {
        fontSize: '13px',
        color: '#333',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1
    },
    waypoint: {
        position: 'absolute',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    miniMap: {
        width: '100%',
        height: '200px',
        backgroundColor: '#1a3a5a',
        marginTop: '10px',
        position: 'relative'
    },
    cameraOptions: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        marginTop: '10px'
    },
    cameraOption: {
        backgroundColor: '#555',
        padding: '20px',
        textAlign: 'center',
        flex: 1,
        margin: '0 5px'
    },
    overlayPanel: {
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '5px',
        maxWidth: '400px',
        maxHeight: '80%',
        overflowY: 'auto',
        zIndex: 20
    },
    mapInfoBottom: {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        display: 'flex',
        gap: '20px',
        color: 'white'
    },
    joystickSection: {
        backgroundColor: '#f8f9fa',
        padding: '8px',
        marginBottom: '10px',
        borderRadius: '5px',
        border: '1px solid #e0e0e0'
    },
    joystickDataSection: {
        backgroundColor: '#ffffff',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        marginBottom: '10px'
    },
    monitoringSection: {
        backgroundColor: '#f8f9fa',
        padding: '8px',
        borderRadius: '5px',
        fontSize: '11px',
        border: '1px solid #e0e0e0'
    }
};