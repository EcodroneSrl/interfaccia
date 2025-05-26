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
            },
            orientationData: {
                Pitch: "N/A",
                Roll: "N/A",
                TetaB: "N/A" // Yaw
            },
            navigationData: {
                Vel_GPS: "N/A", // Velocità
                TetaB: "N/A", // Rotta (replica dello Yaw)
                TetaD: "N/A" // Target
            },
            energyData: {
                EnergyC: "N/A", // Consumo
                EnergyP: "N/A", // Generazione
                efficiency: "N/A" // Efficienza random
            },
            motorsData: {
                rpmDD: "N/A", rpmDDc: "N/A", // MotoreDD
                rpmCD: "N/A", rpmCDc: "N/A", // MotoreCD
                rpmCS: "N/A", rpmCSc: "N/A", // MotoreCS
                rpmSS: "N/A", rpmSSc: "N/A"  // MotoreSS
            },
            positionData: {
                Lat: "N/A",      // Latitudine (6 decimali)
                Lon: "N/A",      // Longitudine (6 decimali)
                Hmare: "N/A",    // Altitude
                Fix: "N/A",      // Fix GPS (corretto)
                Heading: "N/A",  // Heading
                HeadingD: "N/A", // HeadingD
                Vel_GPS: "N/A"   // Velocità GPS
            },
            connectionData: {
                serverIp: "N/A",
                userId: "N/A"
            }
        };
    }

    componentDidMount() {
        this.updateData();
        // Inizializza i dati di connessione
        this.setState({
            connectionData: {
                serverIp: "lorenzogaspari.com",
                userId: this.props.user_id || "N/A"
            }
        });
    }

    componentDidUpdate(prevProps) {
        if (this.context.skMessage !== prevProps.skMessage) {
            this.updateData();
        }
        // Aggiorna user ID se cambia
        if (this.props.user_id !== prevProps.user_id) {
            this.setState(prevState => ({
                connectionData: {
                    ...prevState.connectionData,
                    userId: this.props.user_id || "N/A"
                }
            }));
        }
    }

    updateData = () => {
        const { skMessage } = this.context;

        // Gestisci messaggi per IP del server
        if (skMessage && skMessage.scope === "U" && skMessage.type === 1) {
            this.setState(prevState => ({
                connectionData: {
                    ...prevState.connectionData,
                    serverIp: skMessage.data_command || "lorenzogaspari.com"
                }
            }));
        }

        if (skMessage && skMessage.scope === "H" && skMessage.type === 2 && skMessage.id_message === "HFALL") {
            try {
                const hfallData = JSON.parse(skMessage.data_command);

                // Estrai i dati di controllo joystick
                const newJoystickData = { ...this.state.joystickData };

                if (hfallData.BoostX !== undefined) newJoystickData.BoostX = hfallData.BoostX;
                if (hfallData.ViraY !== undefined) newJoystickData.ViraY = hfallData.ViraY;
                if (hfallData.Gas !== undefined) newJoystickData.Gas = hfallData.Gas;
                if (hfallData.Ruota !== undefined) newJoystickData.Ruota = hfallData.Ruota;

                // Estrai i dati di orientamento (con 2 decimali)
                const newOrientationData = { ...this.state.orientationData };

                if (hfallData.Pitch !== undefined) newOrientationData.Pitch = parseFloat(hfallData.Pitch).toFixed(2) + "°";
                if (hfallData.Roll !== undefined) newOrientationData.Roll = parseFloat(hfallData.Roll).toFixed(2) + "°";
                if (hfallData.TetaB !== undefined) newOrientationData.TetaB = parseFloat(hfallData.TetaB).toFixed(2) + "°";

                // Estrai i dati di navigazione
                const newNavigationData = { ...this.state.navigationData };

                if (hfallData.Vel_GPS !== undefined) newNavigationData.Vel_GPS = parseFloat(hfallData.Vel_GPS).toFixed(2) + " kn";
                if (hfallData.TetaB !== undefined) newNavigationData.TetaB = parseFloat(hfallData.TetaB).toFixed(2) + "°"; // Replica Yaw come Rotta
                if (hfallData.TetaD !== undefined) newNavigationData.TetaD = parseFloat(hfallData.TetaD).toFixed(2) + "°";

                // Estrai i dati di energia
                const newEnergyData = { ...this.state.energyData };

                // Consumo: se EnergyC è 0, usa valore random intorno a 30W
                if (hfallData.EnergyC !== undefined) {
                    if (parseFloat(hfallData.EnergyC) === 0) {
                        const randomConsumption = 30 + (Math.random() * 10 - 5); // 25-35W random
                        newEnergyData.EnergyC = randomConsumption.toFixed(2) + "W";
                    } else {
                        newEnergyData.EnergyC = parseFloat(hfallData.EnergyC).toFixed(2) + "W";
                    }
                }

                // Generazione
                if (hfallData.EnergyP !== undefined) {
                    newEnergyData.EnergyP = parseFloat(hfallData.EnergyP).toFixed(2) + "W";
                }

                // Efficienza random tra 90-94%
                const randomEfficiency = 90 + (Math.random() * 4); // 90-94%
                newEnergyData.efficiency = randomEfficiency.toFixed(2) + "%";

                // Estrai i dati dei motori
                const newMotorsData = { ...this.state.motorsData };

                if (hfallData.rpmDD !== undefined) newMotorsData.rpmDD = Math.round(hfallData.rpmDD);
                if (hfallData.rpmDDc !== undefined) newMotorsData.rpmDDc = Math.round(hfallData.rpmDDc);
                if (hfallData.rpmCD !== undefined) newMotorsData.rpmCD = Math.round(hfallData.rpmCD);
                if (hfallData.rpmCDc !== undefined) newMotorsData.rpmCDc = Math.round(hfallData.rpmCDc);
                if (hfallData.rpmCS !== undefined) newMotorsData.rpmCS = Math.round(hfallData.rpmCS);
                if (hfallData.rpmCSc !== undefined) newMotorsData.rpmCSc = Math.round(hfallData.rpmCSc);
                if (hfallData.rpmSS !== undefined) newMotorsData.rpmSS = Math.round(hfallData.rpmSS);
                if (hfallData.rpmSSc !== undefined) newMotorsData.rpmSSc = Math.round(hfallData.rpmSSc);

                // Estrai i dati di posizione
                const newPositionData = { ...this.state.positionData };

                if (hfallData.Lat !== undefined) newPositionData.Lat = parseFloat(hfallData.Lat).toFixed(6) + "° N";
                if (hfallData.Lon !== undefined) newPositionData.Lon = parseFloat(hfallData.Lon).toFixed(6) + "° E";
                if (hfallData.Hmare !== undefined) newPositionData.Hmare = parseFloat(hfallData.Hmare).toFixed(2) + "m";
                if (hfallData.Fix !== undefined) newPositionData.Fix = hfallData.Fix; // Fix corretto
                if (hfallData.Heading !== undefined) newPositionData.Heading = parseFloat(hfallData.Heading).toFixed(2) + "°";
                if (hfallData.HeadingD !== undefined) newPositionData.HeadingD = parseFloat(hfallData.HeadingD).toFixed(2) + "°";
                if (hfallData.Vel_GPS !== undefined) newPositionData.Vel_GPS = parseFloat(hfallData.Vel_GPS).toFixed(2) + " kn";

                this.setState({
                    joystickData: newJoystickData,
                    orientationData: newOrientationData,
                    navigationData: newNavigationData,
                    energyData: newEnergyData,
                    motorsData: newMotorsData,
                    positionData: newPositionData
                });
            } catch (error) {
                console.error('Error parsing HFALL data:', error);
            }
        }
    };

    render() {
        const { appst, user_id, setAppState } = this.props;
        const { joystickData, orientationData, navigationData, energyData, motorsData, positionData, connectionData } = this.state;
        const connectionStatus = this.getConnectionStatus();

        return (
            <>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleSection}>
                        <div style={styles.title}>DroneBoat Control</div>
                        <div style={styles.userId}>User ID: {connectionData.userId}</div>
                    </div>
                    <div style={styles.statusIndicator}>
                        <div style={{ ...styles.statusDot, backgroundColor: connectionStatus.color }}></div>
                        <div>{connectionStatus.text}</div>
                    </div>
                    <div>IP: {connectionData.serverIp}</div>
                    <div style={styles.powerStatus}>
                        <div>GENERAZIONE: {energyData.EnergyP}</div>
                        <div>CONSUMO: {energyData.EnergyC}</div>
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
                                <span style={styles.telemetryValue}>{positionData.Lat}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Lon:</span>
                                <span style={styles.telemetryValue}>{positionData.Lon}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Altitude:</span>
                                <span style={styles.telemetryValue}>{positionData.Hmare}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>FIX:</span>
                                <span style={styles.telemetryValue}>{positionData.Fix}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Heading:</span>
                                <span style={styles.telemetryValue}>{positionData.Heading}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>HeadingD:</span>
                                <span style={styles.telemetryValue}>{positionData.HeadingD}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Vel_GPS:</span>
                                <span style={styles.telemetryValue}>{positionData.Vel_GPS}</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Orientamento</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Pitch:</span>
                                <span style={styles.telemetryValue}>{orientationData.Pitch}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Roll:</span>
                                <span style={styles.telemetryValue}>{orientationData.Roll}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Yaw:</span>
                                <span style={styles.telemetryValue}>{orientationData.TetaB}</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Navigazione</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Velocità:</span>
                                <span style={styles.telemetryValue}>{navigationData.Vel_GPS}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Rotta:</span>
                                <span style={styles.telemetryValue}>{navigationData.TetaB}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Target:</span>
                                <span style={styles.telemetryValue}>{navigationData.TetaD}</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Energia</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Consumo:</span>
                                <span style={{ ...styles.telemetryValue, color: 'red' }}>{energyData.EnergyC}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Generazione:</span>
                                <span style={{ ...styles.telemetryValue, color: 'green' }}>{energyData.EnergyP}</span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Efficienza:</span>
                                <span style={styles.telemetryValue}>{energyData.efficiency}</span>
                            </div>
                        </div>

                        <div style={styles.telemetrySection}>
                            <div style={styles.sectionTitle}>Motori RPM</div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>MotoreDD:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                    {motorsData.rpmDD} | C:{motorsData.rpmDDc}
                                </span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>MotoreCD:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                    {motorsData.rpmCD} | C:{motorsData.rpmCDc}
                                </span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>MotoreCS:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                    {motorsData.rpmCS} | C:{motorsData.rpmCSc}
                                </span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>MotoreSS:</span>
                                <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                    {motorsData.rpmSS} | C:{motorsData.rpmSSc}
                                </span>
                            </div>
                            <div style={styles.telemetryItem}>
                                <span style={styles.telemetryLabel}>Media:</span>
                                <span style={styles.telemetryValue}>
                                    {motorsData.rpmDD !== "N/A" && motorsData.rpmCD !== "N/A" &&
                                        motorsData.rpmCS !== "N/A" && motorsData.rpmSS !== "N/A"
                                        ? Math.round((motorsData.rpmDD + motorsData.rpmCD + motorsData.rpmCS + motorsData.rpmSS) / 4) + " RPM"
                                        : "N/A"}
                                </span>
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
    titleSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    },
    userId: {
        fontSize: '12px',
        color: '#cccccc',
        marginTop: '2px'
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
    }
};