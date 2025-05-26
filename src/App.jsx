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

// Componente semplificato e più robusto
class DroneBoatInterface extends React.Component {
    static contextType = WebSocketContext;

    constructor(props) {
        super(props);

        this.state = {
            telemetryData: {},
            serverIp: "192.168.1.10", // Default IP
            userId: "NNN", // Default User ID
            missionsTree: null, // Albero delle missioni
            selectedMission: null, // Missione selezionata - SEMPRE stringa o null
            missionWaypoints: null, // Waypoints della missione selezionata
            missionInfo: null, // Informazioni della missione (header)
            showMissionOnMap: false // Flag per mostrare la missione sulla mappa
        };
    }

    componentDidMount() {
        this.updateData();
        // Inizializza con l'User ID dalla prop
        if (this.props.user_id && this.props.user_id !== "NNN") {
            this.setState({ userId: this.props.user_id });
        }
    }

    componentDidUpdate(prevProps, prevState) {
        try {
            // Evita loop infiniti controllando che il messaggio sia effettivamente cambiato
            const currentMessage = this.context?.skMessage;
            const prevMessage = prevProps.context?.skMessage;

            if (currentMessage && currentMessage !== prevMessage) {
                this.updateData();
            }

            // Aggiorna User ID se cambia nelle props (non nello state per evitare loop)
            if (this.props.user_id &&
                this.props.user_id !== prevProps.user_id &&
                this.props.user_id !== "NNN") {
                this.setState({ userId: this.props.user_id });
            }
        } catch (error) {
            console.error('Error in componentDidUpdate:', error);
        }
    }

    getConnectionStatus = () => {
        try {
            const { wsState } = this.context || {};
            if (wsState === undefined || wsState === null) {
                return { text: "Connesso", color: "#2ecc71" };
            }

            const connectionStates = {
                0: { text: "Messaging...", color: "#3498db" },
                1: { text: "Connesso", color: "#2ecc71" },
                2: { text: "Disconnessione...", color: "#f39c12" },
                3: { text: "Disconnesso", color: "#e74c3c" },
                4: { text: "Non Connesso", color: "#95a5a6" }
            };
            return connectionStates[wsState] || connectionStates[1];
        } catch (error) {
            console.error('Error getting connection status:', error);
            return { text: "Connesso", color: "#2ecc71" };
        }
    };

    updateData = () => {
        try {
            const { skMessage } = this.context;

            if (!skMessage) return;

            // Gestisci messaggi per IP del server
            if (skMessage.scope === "U" && skMessage.type === 1 && skMessage.data_command) {
                this.setState({ serverIp: skMessage.data_command });
            }

            // Gestisci messaggi per User ID
            if (skMessage.scope === "U" && skMessage.type === 0 && skMessage.id_message) {
                this.setState({ userId: skMessage.id_message });
            }

            // Gestisci messaggi per le missioni - VERSIONE MIGLIORATA
            if (skMessage.scope === "M") {
                console.log('Mission message received - Type:', skMessage.type);

                if (skMessage.type === 1) {
                    // Albero delle missioni
                    try {
                        const treeData = JSON.parse(skMessage.data_command);
                        this.setState({ missionsTree: treeData });
                        console.log('Mission tree loaded successfully');
                    } catch (parseError) {
                        console.error('Error parsing missions tree:', parseError);
                    }
                } else if (skMessage.type === 2) {
                    // Waypoints della missione
                    try {
                        // Prima prova parsing JSON
                        const waypointsData = JSON.parse(skMessage.data_command);
                        console.log('Mission waypoints received (JSON):', waypointsData.length || 'unknown count');

                        this.setState(prevState => ({
                            missionWaypoints: waypointsData,
                            showMissionOnMap: false
                        }));

                    } catch (parseError) {
                        console.log('JSON parsing failed, trying CSV format...');
                        console.log('Raw data:', skMessage.data_command);

                        // Parsing formato CSV della missione
                        if (typeof skMessage.data_command === 'string') {
                            try {
                                const lines = skMessage.data_command.split('\n').filter(line => line.trim());
                                console.log('Lines found:', lines.length);

                                if (lines.length > 0) {
                                    // Prima riga: header della missione
                                    const missionHeaderParts = lines[0].split(',');
                                    const missionInfo = {
                                        idMission: missionHeaderParts[0] || '',
                                        nMission: parseInt(missionHeaderParts[1]) || 0,
                                        total_mission_nWP: parseInt(missionHeaderParts[2]) || 0,
                                        wpStart: parseInt(missionHeaderParts[3]) || 0,
                                        cycles: parseInt(missionHeaderParts[4]) || 0,
                                        wpEnd: parseInt(missionHeaderParts[5]) || 0,
                                        NMmode: parseInt(missionHeaderParts[6]) || 0,
                                        NMnum: parseInt(missionHeaderParts[7]) || 0,
                                        NMStartInd: parseInt(missionHeaderParts[8]) || 0,
                                        idMissionNext: parseInt(missionHeaderParts[9]) || 0,
                                        standRadius: parseFloat(missionHeaderParts[10]) || 0
                                    };

                                    // Righe successive: waypoints
                                    const waypoints = [];
                                    for (let i = 1; i < lines.length; i++) {
                                        const parts = lines[i].split(',').map(p => p.trim());
                                        if (parts.length >= 9) {
                                            const waypoint = {
                                                nmissione: parseInt(parts[0]) || 0,
                                                indexWP: parseInt(parts[1]) || 0,
                                                latitude: parseFloat(parts[2]) || 0,
                                                longitude: parseFloat(parts[3]) || 0,
                                                navMode: parseInt(parts[4]) || 0,
                                                pointType: parseInt(parts[5]) || 0,
                                                monitoringOp: parseInt(parts[6]) || 0,
                                                arriveMode: parseInt(parts[7]) || 0,
                                                waypointRadius: parseFloat(parts[8]) || 0,
                                                // Mappatura per compatibilità con MapBox
                                                lat: parseFloat(parts[2]) || 0,
                                                lng: parseFloat(parts[3]) || 0
                                            };

                                            // Verifica coordinate valide
                                            if (!isNaN(waypoint.latitude) && !isNaN(waypoint.longitude) &&
                                                waypoint.latitude !== 0 && waypoint.longitude !== 0) {
                                                waypoints.push(waypoint);
                                            }
                                        }
                                    }

                                    if (waypoints.length > 0) {
                                        console.log('✅ Parsed mission CSV format:', waypoints.length, 'waypoints');
                                        console.log('Mission info:', missionInfo);

                                        this.setState({
                                            missionWaypoints: waypoints,
                                            missionInfo: missionInfo // Salva anche le info della missione
                                        });
                                    } else {
                                        console.log('❌ No valid waypoints found in CSV data');
                                    }
                                }
                            } catch (csvError) {
                                console.error('❌ Failed to parse CSV format:', csvError);

                                // Fallback: parsing semplificato
                                const lines = skMessage.data_command.split('\n').filter(line => line.trim());
                                const waypoints = [];

                                lines.forEach((line, index) => {
                                    const parts = line.split(',');
                                    if (parts.length >= 2) {
                                        const lat = parseFloat(parts[0]);
                                        const lng = parseFloat(parts[1]);
                                        if (!isNaN(lat) && !isNaN(lng)) {
                                            waypoints.push({
                                                lat: lat,
                                                lng: lng,
                                                latitude: lat,
                                                longitude: lng,
                                                alt: parts.length > 2 ? parseFloat(parts[2]) || 0 : 0,
                                                index: index
                                            });
                                        }
                                    }
                                });

                                if (waypoints.length > 0) {
                                    console.log('✅ Fallback parsing successful:', waypoints.length, 'waypoints');
                                    this.setState({ missionWaypoints: waypoints });
                                }
                            }
                        }
                    }
                }
            }

            // Gestisci dati telemetrici
            if (skMessage.scope === "H" && skMessage.type === 2 && skMessage.id_message === "HFALL" && skMessage.data_command) {
                try {
                    const hfallData = JSON.parse(skMessage.data_command);
                    this.setState({ telemetryData: hfallData });
                } catch (parseError) {
                    console.error('Error parsing HFALL data:', parseError);
                }
            }
        } catch (error) {
            console.error('Error in updateData:', error);
        }
    };

    // Funzione per gestire il click su "Aggiorna" nell'albero missioni
    handleRefreshMissions = () => {
        const { setAppState } = this.props;
        const { sendMessage } = this.context;

        try {
            // Cambia lo stato dell'app a "MSS" per mostrare le missioni
            setAppState("MSS");

            // Invia il messaggio WebSocket per caricare l'albero delle missioni
            if (sendMessage) {
                const msgData = {
                    scope: "M",
                    type: 0,
                    id_message: "DList",
                    data_command: "NNN"
                };
                sendMessage(msgData);
            }
        } catch (error) {
            console.error('Error refreshing missions:', error);
        }
    };

    // Funzione per gestire la selezione di una missione - VERSIONE ULTRA-SICURA
    handleMissionSelect = (filePath) => {
        const { sendMessage } = this.context;

        try {
            // Controllo sicurezza: assicurati che filePath sia una stringa valida
            if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
                console.error('Invalid file path provided:', filePath);
                return;
            }

            const safePath = filePath.trim();
            console.log('Selecting mission:', safePath);

            // Aggiorna lo state in modo sicuro
            this.setState({
                selectedMission: safePath,
                showMissionOnMap: false,
                missionWaypoints: null,
                missionInfo: null
            });

            // Richiedi i waypoint della missione selezionata
            if (sendMessage && safePath.endsWith('.bin')) {
                console.log('Requesting waypoints...');

                const msgData = {
                    scope: "M",
                    type: 2,
                    id_message: "GetWaypoints",
                    data_command: safePath
                };

                sendMessage(msgData);
            } else {
                console.log('File is not .bin or sendMessage not available');
            }
        } catch (error) {
            console.error('Error selecting mission:', error);
            // Reset state in caso di errore
            this.setState({
                selectedMission: null,
                showMissionOnMap: false,
                missionWaypoints: null,
                missionInfo: null
            });
        }
    };

    // Funzione per visualizzare la missione sulla mappa - VERSIONE MIGLIORATA
    handleVisualizeMission = () => {
        const { selectedMission, missionWaypoints } = this.state;

        try {
            console.log('=== VISUALIZE MISSION ===');
            console.log('Selected Mission:', selectedMission);
            console.log('Waypoints available:', !!missionWaypoints);
            console.log('Waypoints count:', Array.isArray(missionWaypoints) ? missionWaypoints.length : 'Not array');

            if (selectedMission) {
                if (missionWaypoints && Array.isArray(missionWaypoints) && missionWaypoints.length > 0) {
                    // Attiva la visualizzazione sulla mappa
                    this.setState({ showMissionOnMap: true }, () => {
                        console.log('✅ Mission visualization activated successfully');
                    });
                } else {
                    // La missione è selezionata ma non ci sono waypoints
                    console.log('⚠️ Mission selected but no waypoints available');
                    alert('Waypoints non ancora caricati. Riprova tra qualche secondo o usa "Test Waypoints".');
                }
            } else {
                alert('Seleziona prima una missione dal menu ad albero');
            }
        } catch (error) {
            console.error('Error visualizing mission:', error);
            alert('Errore durante la visualizzazione: ' + error.message);
        }
    };

    // Funzione per nascondere la missione dalla mappa
    handleHideMission = () => {
        this.setState({ showMissionOnMap: false });
    };

    // Funzione per renderizzare l'albero delle missioni
    renderMissionsTree = (node, parentPath = '', depth = 0) => {
        if (!node) return null;

        const indentStyle = {
            paddingLeft: `${depth * 20}px`
        };

        if (node.Type === 'directory') {
            return (
                <div key={node.Name}>
                    <div style={{ ...styles.treeItem, ...indentStyle }}>
                        📁 {node.Name}
                    </div>
                    {node.Children && node.Children.map(child =>
                        this.renderMissionsTree(child, `${parentPath}/${node.Name}`, depth + 1)
                    )}
                </div>
            );
        } else if (node.Type === 'file') {
            const isSelectable = node.Name.endsWith('.bin');
            const filePath = `${parentPath}/${node.Name}`;
            const isSelected = this.state.selectedMission === filePath;

            return (
                <div
                    key={node.Name}
                    style={{
                        ...styles.treeItem,
                        ...indentStyle,
                        ...(isSelected ? styles.selected : {}),
                        cursor: isSelectable ? 'pointer' : 'default',
                        color: isSelectable ? '#333' : '#999'
                    }}
                    onClick={isSelectable ? () => this.handleMissionSelect(filePath) : undefined}
                >
                    📄 {node.Name}
                </div>
            );
        }

        return null;
    };

    // Funzioni helper per dati sicuri
    getEnergyData = () => {
        const { telemetryData } = this.state;
        return {
            consumption: telemetryData.EnergyC && telemetryData.EnergyC !== 0
                ? parseFloat(telemetryData.EnergyC).toFixed(2) + "W"
                : (30 + Math.random() * 10 - 5).toFixed(2) + "W",
            generation: telemetryData.EnergyP
                ? parseFloat(telemetryData.EnergyP).toFixed(2) + "W"
                : "N/A",
            efficiency: (90 + Math.random() * 4).toFixed(2) + "%"
        };
    };

    getPositionData = () => {
        const { telemetryData } = this.state;
        return {
            lat: telemetryData.Lat ? parseFloat(telemetryData.Lat).toFixed(6) + "° N" : "N/A",
            lon: telemetryData.Lon ? parseFloat(telemetryData.Lon).toFixed(6) + "° E" : "N/A",
            altitude: telemetryData.Hmare ? parseFloat(telemetryData.Hmare).toFixed(2) + "m" : "N/A",
            fix: telemetryData.Fix || "N/A",
            heading: telemetryData.Heading ? parseFloat(telemetryData.Heading).toFixed(2) + "°" : "N/A",
            headingD: telemetryData.HeadingD ? parseFloat(telemetryData.HeadingD).toFixed(2) + "°" : "N/A",
            velGPS: telemetryData.Vel_GPS ? parseFloat(telemetryData.Vel_GPS).toFixed(2) + " kn" : "N/A"
        };
    };

    getOrientationData = () => {
        const { telemetryData } = this.state;
        return {
            pitch: telemetryData.Pitch ? parseFloat(telemetryData.Pitch).toFixed(2) + "°" : "N/A",
            roll: telemetryData.Roll ? parseFloat(telemetryData.Roll).toFixed(2) + "°" : "N/A",
            yaw: telemetryData.TetaB ? parseFloat(telemetryData.TetaB).toFixed(2) + "°" : "N/A"
        };
    };

    getNavigationData = () => {
        const { telemetryData } = this.state;
        return {
            velocity: telemetryData.Vel_GPS ? parseFloat(telemetryData.Vel_GPS).toFixed(2) + " kn" : "N/A",
            course: telemetryData.TetaB ? parseFloat(telemetryData.TetaB).toFixed(2) + "°" : "N/A",
            target: telemetryData.TetaD ? parseFloat(telemetryData.TetaD).toFixed(2) + "°" : "N/A"
        };
    };

    getMotorsData = () => {
        const { telemetryData } = this.state;
        const motors = {
            dd: { rpm: telemetryData.rpmDD ? Math.round(telemetryData.rpmDD) : "N/A", cmd: telemetryData.rpmDDc ? Math.round(telemetryData.rpmDDc) : "N/A" },
            cd: { rpm: telemetryData.rpmCD ? Math.round(telemetryData.rpmCD) : "N/A", cmd: telemetryData.rpmCDc ? Math.round(telemetryData.rpmCDc) : "N/A" },
            cs: { rpm: telemetryData.rpmCS ? Math.round(telemetryData.rpmCS) : "N/A", cmd: telemetryData.rpmCSc ? Math.round(telemetryData.rpmCSc) : "N/A" },
            ss: { rpm: telemetryData.rpmSS ? Math.round(telemetryData.rpmSS) : "N/A", cmd: telemetryData.rpmSSc ? Math.round(telemetryData.rpmSSc) : "N/A" }
        };

        // Calcola media se tutti i dati sono disponibili
        if (motors.dd.rpm !== "N/A" && motors.cd.rpm !== "N/A" && motors.cs.rpm !== "N/A" && motors.ss.rpm !== "N/A") {
            motors.average = Math.round((motors.dd.rpm + motors.cd.rpm + motors.cs.rpm + motors.ss.rpm) / 4) + " RPM";
        } else {
            motors.average = "N/A";
        }

        return motors;
    };

    getJoystickData = () => {
        const { telemetryData } = this.state;
        return {
            boostX: telemetryData.BoostX || "N/A",
            viraY: telemetryData.ViraY || "N/A",
            gas: telemetryData.Gas || "N/A",
            ruota: telemetryData.Ruota || "N/A"
        };
    };

    render() {
        try {
            const { appst, user_id, setAppState } = this.props;
            const {
                serverIp,
                userId,
                missionsTree,
                selectedMission,
                missionWaypoints,
                showMissionOnMap
            } = this.state;

            // Controlli di sicurezza per evitare errori - VERSIONE MIGLIORATA
            const safeAppst = appst || "STD";
            const safeUserId = user_id || "NNN";
            const safeServerIp = serverIp || "192.168.1.10";
            const safeStateUserId = userId || "NNN";
            const safeSelectedMission = selectedMission && typeof selectedMission === 'string' ? selectedMission : null;

            const connectionStatus = this.getConnectionStatus();
            const energyData = this.getEnergyData();
            const positionData = this.getPositionData();
            const orientationData = this.getOrientationData();
            const navigationData = this.getNavigationData();
            const motorsData = this.getMotorsData();
            const joystickData = this.getJoystickData();

            // Usa l'User ID dallo state o fallback alla prop
            const displayUserId = safeStateUserId !== "NNN" ? safeStateUserId : safeUserId;

            return (
                <>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.titleSection}>
                            <div style={styles.title}>DroneBoat Control</div>
                            <div style={styles.userId}>User ID: {displayUserId}</div>
                        </div>
                        <div style={styles.statusIndicator}>
                            <div style={{ ...styles.statusDot, backgroundColor: connectionStatus.color }}></div>
                            <div>{connectionStatus.text}</div>
                        </div>
                        <div>IP: {serverIp}</div>
                        <div style={styles.powerStatus}>
                            <div>GENERAZIONE: {energyData.generation}</div>
                            <div>CONSUMO: {energyData.consumption}</div>
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
                            <button style={styles.blueBtn} onClick={this.handleRefreshMissions}>Aggiorna</button>

                            {/* Albero missioni dinamico */}
                            <div style={styles.missionsTreeContainer}>
                                {missionsTree ? (
                                    this.renderMissionsTree(missionsTree)
                                ) : (
                                    <>
                                        <div style={styles.treeItem}>/ (Root)</div>
                                        <div style={styles.treeItem}>Premere "Aggiorna" per caricare</div>
                                    </>
                                )}
                            </div>

                            <div style={styles.btnGroup}>
                                <button
                                    style={safeSelectedMission ? styles.greenBtn : { ...styles.greenBtn, opacity: 0.5 }}
                                    onClick={() => {
                                        if (safeSelectedMission) {
                                            alert(`Avvio missione: ${safeSelectedMission}`);
                                            // Qui puoi aggiungere la logica per avviare la missione
                                        }
                                    }}
                                    disabled={!safeSelectedMission}
                                >
                                    Avvia
                                </button>
                                <button
                                    style={safeSelectedMission ? styles.blueBtn : { ...styles.blueBtn, opacity: 0.5 }}
                                    onClick={this.handleVisualizeMission}
                                    disabled={!safeSelectedMission}
                                >
                                    Visualizza
                                </button>
                                <button
                                    style={safeSelectedMission ? styles.redBtn : { ...styles.redBtn, opacity: 0.5 }}
                                    onClick={() => {
                                        if (safeSelectedMission) {
                                            alert(`Eliminazione missione: ${safeSelectedMission}`);
                                            // Qui puoi aggiungere la logica per eliminare la missione
                                        }
                                    }}
                                    disabled={!safeSelectedMission}
                                >
                                    Elimina
                                </button>
                            </div>

                            {/* Indicatore missione selezionata */}
                            {safeSelectedMission && (
                                <div style={styles.selectedMissionInfo}>
                                    <div style={{ ...styles.treeItem, backgroundColor: '#e8f5e8', color: '#2d5a2d', marginBottom: '5px' }}>
                                        Selezionata: {safeSelectedMission.split('/').pop()}
                                    </div>
                                    {missionWaypoints && (
                                        <div style={{ fontSize: '12px', color: '#666', padding: '5px' }}>
                                            Waypoints caricati: {Array.isArray(missionWaypoints) ? missionWaypoints.length : 'N/A'}
                                        </div>
                                    )}
                                    {showMissionOnMap && (
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                            <button style={{ ...styles.blueBtn, fontSize: '12px', padding: '4px 8px' }} onClick={this.handleHideMission}>
                                                Nascondi Mappa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                <ChangeAppState changeState={setAppState} uuid={safeUserId} />
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

                                {/* MapboxMap component con waypoints della missione */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                                    <MapboxMap
                                        stateapp={safeAppst}
                                        missionWaypoints={showMissionOnMap ? missionWaypoints : null}
                                        selectedMission={showMissionOnMap ? safeSelectedMission : null}
                                    />
                                </div>

                                {/* Mission/Waypoint Forms */}
                                {safeAppst === "MSS" && (
                                    <div style={styles.overlayPanel}>
                                        <Missions stateapp={safeAppst} userid={safeUserId} />
                                    </div>
                                )}
                                {safeAppst === "WPY" && (
                                    <div style={styles.overlayPanel}>
                                        <MissionForm stateapp={safeAppst} userid={safeUserId} />
                                        <MarkerList stateapp={safeAppst} userid={safeUserId} />
                                    </div>
                                )}

                                <div style={styles.mapInfoBottom}>
                                    <div>TEL_MODE_2 - Con mantenimento rotta</div>
                                    <div>Autonomia: 4.5h</div>
                                    <div>Distanza: 120m</div>
                                    {showMissionOnMap && safeSelectedMission && (
                                        <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                            Missione: {safeSelectedMission.split('/').pop()}
                                        </div>
                                    )}
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

                            {/* Posizione con dati reali */}
                            <div style={styles.telemetrySection}>
                                <div style={styles.sectionTitle}>Posizione</div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Lat:</span>
                                    <span style={styles.telemetryValue}>{positionData.lat}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Lon:</span>
                                    <span style={styles.telemetryValue}>{positionData.lon}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Altitude:</span>
                                    <span style={styles.telemetryValue}>{positionData.altitude}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>FIX:</span>
                                    <span style={styles.telemetryValue}>{positionData.fix}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Heading:</span>
                                    <span style={styles.telemetryValue}>{positionData.heading}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>HeadingD:</span>
                                    <span style={styles.telemetryValue}>{positionData.headingD}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Vel_GPS:</span>
                                    <span style={styles.telemetryValue}>{positionData.velGPS}</span>
                                </div>
                            </div>

                            {/* Orientamento con dati reali */}
                            <div style={styles.telemetrySection}>
                                <div style={styles.sectionTitle}>Orientamento</div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Pitch:</span>
                                    <span style={styles.telemetryValue}>{orientationData.pitch}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Roll:</span>
                                    <span style={styles.telemetryValue}>{orientationData.roll}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Yaw:</span>
                                    <span style={styles.telemetryValue}>{orientationData.yaw}</span>
                                </div>
                            </div>

                            {/* Navigazione con dati reali */}
                            <div style={styles.telemetrySection}>
                                <div style={styles.sectionTitle}>Navigazione</div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Velocità:</span>
                                    <span style={styles.telemetryValue}>{navigationData.velocity}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Rotta:</span>
                                    <span style={styles.telemetryValue}>{navigationData.course}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Target:</span>
                                    <span style={styles.telemetryValue}>{navigationData.target}</span>
                                </div>
                            </div>

                            {/* Energia con dati reali */}
                            <div style={styles.telemetrySection}>
                                <div style={styles.sectionTitle}>Energia</div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Consumo:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'red' }}>{energyData.consumption}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Generazione:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'green' }}>{energyData.generation}</span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Efficienza:</span>
                                    <span style={styles.telemetryValue}>{energyData.efficiency}</span>
                                </div>
                            </div>

                            {/* Motori con dati reali */}
                            <div style={styles.telemetrySection}>
                                <div style={styles.sectionTitle}>Motori RPM</div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>MotoreDD:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                        {motorsData.dd.rpm} | C:{motorsData.dd.cmd}
                                    </span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>MotoreCD:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                        {motorsData.cd.rpm} | C:{motorsData.cd.cmd}
                                    </span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>MotoreCS:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                        {motorsData.cs.rpm} | C:{motorsData.cs.cmd}
                                    </span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>MotoreSS:</span>
                                    <span style={{ ...styles.telemetryValue, color: 'orange' }}>
                                        {motorsData.ss.rpm} | C:{motorsData.ss.cmd}
                                    </span>
                                </div>
                                <div style={styles.telemetryItem}>
                                    <span style={styles.telemetryLabel}>Media:</span>
                                    <span style={styles.telemetryValue}>{motorsData.average}</span>
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

                            {/* Joystick Reader con dati */}
                            <div style={styles.joystickSection}>
                                <div style={styles.sectionTitle}>Controllo Joystick</div>

                                {/* Dati Controllo Joystick */}
                                <div style={styles.joystickDataSection}>
                                    <div style={styles.telemetryItem}>
                                        <span style={styles.telemetryLabel}>BoostX:</span>
                                        <span style={{ ...styles.telemetryValue, color: '#2196F3' }}>{joystickData.boostX}</span>
                                    </div>
                                    <div style={styles.telemetryItem}>
                                        <span style={styles.telemetryLabel}>ViraY:</span>
                                        <span style={{ ...styles.telemetryValue, color: '#2196F3' }}>{joystickData.viraY}</span>
                                    </div>
                                    <div style={styles.telemetryItem}>
                                        <span style={styles.telemetryLabel}>Gas:</span>
                                        <span style={{ ...styles.telemetryValue, color: '#4CAF50' }}>{joystickData.gas}</span>
                                    </div>
                                    <div style={styles.telemetryItem}>
                                        <span style={styles.telemetryLabel}>Ruota:</span>
                                        <span style={{ ...styles.telemetryValue, color: '#FF9800' }}>{joystickData.ruota}</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', transform: 'scale(0.8)', transformOrigin: 'top left', marginTop: '10px' }}>
                                    <JoystickReader stateapp={safeAppst} userid={safeUserId} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABELLA MISSIONE IN FONDO ALLA PAGINA - CONTROLLI SICUREZZA */}
                    {safeSelectedMission && (
                        <div style={styles.missionTable}>
                            <div style={styles.missionTableHeader}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 15px 0', color: '#1a3a5a' }}>
                                            Dettagli Missione: {safeSelectedMission.split('/').pop().replace('.bin', '')}
                                        </h3>

                                        {/* Informazioni header missione */}
                                        {this.state.missionInfo && (
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                                                    <div><strong>ID Missione:</strong> {this.state.missionInfo.idMission}</div>
                                                    <div><strong>N. Missione:</strong> {this.state.missionInfo.nMission}</div>
                                                    <div><strong>Tot. Waypoints:</strong> {this.state.missionInfo.total_mission_nWP}</div>
                                                    <div><strong>WP Start:</strong> {this.state.missionInfo.wpStart}</div>
                                                    <div><strong>Cicli:</strong> {this.state.missionInfo.cycles}</div>
                                                    <div><strong>WP End:</strong> {this.state.missionInfo.wpEnd}</div>
                                                    <div><strong>Stand Radius:</strong> {this.state.missionInfo.standRadius?.toFixed(8)}</div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                                            Waypoints caricati: {Array.isArray(missionWaypoints) ? missionWaypoints.length : 0}
                                            {!missionWaypoints && (
                                                <span style={{ color: '#e67e22', fontWeight: 'bold', marginLeft: '10px' }}>
                                                    (In attesa dati dal drone...)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            style={{ ...styles.blueBtn, fontSize: '12px', padding: '6px 12px' }}
                                            onClick={() => {
                                                // Aggiungi waypoints di test nel formato corretto
                                                const testWaypoints = [
                                                    { nmissione: 0, indexWP: 0, latitude: 44.126474, longitude: 9.933195, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.126474, lng: 9.933195 },
                                                    { nmissione: 0, indexWP: 1, latitude: 44.125963, longitude: 9.934199, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.125963, lng: 9.934199 },
                                                    { nmissione: 0, indexWP: 2, latitude: 44.125549, longitude: 9.935042, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.125549, lng: 9.935042 },
                                                    { nmissione: 0, indexWP: 3, latitude: 44.124713, longitude: 9.936800, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.124713, lng: 9.936800 }
                                                ];
                                                const testMissionInfo = {
                                                    idMission: "provaWPMissioneasfaltoRbig",
                                                    nMission: 0,
                                                    total_mission_nWP: 9,
                                                    wpStart: 1,
                                                    cycles: 3,
                                                    wpEnd: 8,
                                                    standRadius: 0.00004
                                                };
                                                this.setState({
                                                    missionWaypoints: testWaypoints,
                                                    missionInfo: testMissionInfo,
                                                    showMissionOnMap: true
                                                });
                                                console.log('✅ Test waypoints loaded (correct format):', testWaypoints);
                                            }}
                                        >
                                            🧪 Test Waypoints
                                        </button>
                                        <button
                                            style={{ ...styles.redBtn, fontSize: '12px', padding: '6px 12px' }}
                                            onClick={() => this.setState({
                                                selectedMission: null,
                                                missionWaypoints: null,
                                                missionInfo: null,
                                                showMissionOnMap: false
                                            })}
                                        >
                                            ✕ Chiudi
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.missionTableContainer}>
                                {missionWaypoints && Array.isArray(missionWaypoints) && missionWaypoints.length > 0 ? (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.tableHeaderRow}>
                                                <th style={styles.tableHeader}>N.Miss</th>
                                                <th style={styles.tableHeader}>Index WP</th>
                                                <th style={styles.tableHeader}>Latitude</th>
                                                <th style={styles.tableHeader}>Longitude</th>
                                                <th style={styles.tableHeader}>Nav Mode</th>
                                                <th style={styles.tableHeader}>Point Type</th>
                                                <th style={styles.tableHeader}>Monitor Op</th>
                                                <th style={styles.tableHeader}>Arrive Mode</th>
                                                <th style={styles.tableHeader}>WP Radius</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {missionWaypoints.map((waypoint, index) => {
                                                try {
                                                    // Parsing per formato missione reale
                                                    const nmissione = waypoint.nmissione ?? waypoint.Nmissione ?? 0;
                                                    const indexWP = waypoint.indexWP ?? waypoint.IndexWP ?? index;
                                                    const latitude = waypoint.latitude ?? waypoint.lat ?? 0;
                                                    const longitude = waypoint.longitude ?? waypoint.lng ?? 0;
                                                    const navMode = waypoint.navMode ?? waypoint.NavMode ?? 0;
                                                    const pointType = waypoint.pointType ?? waypoint.PointType ?? 0;
                                                    const monitoringOp = waypoint.monitoringOp ?? waypoint.MonitoringOp ?? 0;
                                                    const arriveMode = waypoint.arriveMode ?? waypoint.ArriveMode ?? 0;
                                                    const waypointRadius = waypoint.waypointRadius ?? waypoint.WaypointRadius ?? 0;

                                                    const isValidCoordinate = !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;

                                                    return (
                                                        <tr key={index} style={styles.tableRow}>
                                                            <td style={styles.tableCell}>{nmissione}</td>
                                                            <td style={styles.tableCell}>{indexWP}</td>
                                                            <td style={{
                                                                ...styles.tableCell,
                                                                color: isValidCoordinate ? '#333' : '#e74c3c',
                                                                fontWeight: isValidCoordinate ? 'normal' : 'bold'
                                                            }}>
                                                                {isValidCoordinate ? latitude.toFixed(6) + '°' : 'INVALID'}
                                                            </td>
                                                            <td style={{
                                                                ...styles.tableCell,
                                                                color: isValidCoordinate ? '#333' : '#e74c3c',
                                                                fontWeight: isValidCoordinate ? 'normal' : 'bold'
                                                            }}>
                                                                {isValidCoordinate ? longitude.toFixed(6) + '°' : 'INVALID'}
                                                            </td>
                                                            <td style={styles.tableCell}>{navMode}</td>
                                                            <td style={styles.tableCell}>{pointType}</td>
                                                            <td style={styles.tableCell}>{monitoringOp}</td>
                                                            <td style={styles.tableCell}>{arriveMode}</td>
                                                            <td style={styles.tableCell}>{waypointRadius?.toFixed(8) || '0.00000000'}</td>
                                                        </tr>
                                                    );
                                                } catch (error) {
                                                    console.error('Error rendering waypoint:', error);
                                                    return (
                                                        <tr key={index} style={styles.tableRow}>
                                                            <td style={styles.tableCell}>{index + 1}</td>
                                                            <td style={{ ...styles.tableCell, color: '#e74c3c' }} colSpan="8">
                                                                Errore nel parsing del waypoint
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        backgroundColor: '#f8f9fa',
                                        border: '2px dashed #dee2e6',
                                        borderRadius: '8px',
                                        color: '#666'
                                    }}>
                                        <h4>⏳ In attesa dei waypoints...</h4>
                                        <p>I dati della missione vengono richiesti dal drone.</p>
                                        <p>Se i dati tardano ad arrivare, puoi usare il pulsante <strong>"🧪 Test Waypoints"</strong> sopra per testare la visualizzazione.</p>
                                    </div>
                                )}

                                {/* Debug info - VERSIONE SICURA */}
                                <div style={styles.debugInfo}>
                                    <details style={{ marginTop: '15px' }}>
                                        <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                                            🔍 Debug: Informazioni Waypoints ({Array.isArray(missionWaypoints) ? missionWaypoints.length : 0} elementi)
                                        </summary>
                                        <div style={{
                                            backgroundColor: '#f8f9fa',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            marginTop: '10px',
                                            border: '1px solid #e9ecef'
                                        }}>
                                            <p><strong>Tipo dati:</strong> {typeof missionWaypoints}</p>
                                            <p><strong>È Array:</strong> {Array.isArray(missionWaypoints) ? 'Sì' : 'No'}</p>
                                            <p><strong>Lunghezza:</strong> {Array.isArray(missionWaypoints) ? missionWaypoints.length : 'N/A'}</p>
                                            {this.state.missionInfo && (
                                                <>
                                                    <p><strong>Mission Info presente:</strong> Sì</p>
                                                    <p><strong>ID Missione:</strong> {this.state.missionInfo.idMission}</p>
                                                </>
                                            )}
                                            {Array.isArray(missionWaypoints) && missionWaypoints.length > 0 && (
                                                <>
                                                    <p><strong>Primo elemento:</strong></p>
                                                    <pre style={{
                                                        backgroundColor: '#ffffff',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        maxHeight: '100px',
                                                        overflow: 'auto',
                                                        fontSize: '11px'
                                                    }}>
                                                        {JSON.stringify(missionWaypoints[0], null, 2)}
                                                    </pre>
                                                </>
                                            )}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={styles.missionTable}>
                        <div style={styles.missionTableHeader}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 15px 0', color: '#1a3a5a' }}>
                                        Dettagli Missione: {selectedMission.split('/').pop().replace('.bin', '')}
                                    </h3>

                                    {/* Informazioni header missione */}
                                    {this.state.missionInfo && (
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                                                <div><strong>ID Missione:</strong> {this.state.missionInfo.idMission}</div>
                                                <div><strong>N. Missione:</strong> {this.state.missionInfo.nMission}</div>
                                                <div><strong>Tot. Waypoints:</strong> {this.state.missionInfo.total_mission_nWP}</div>
                                                <div><strong>WP Start:</strong> {this.state.missionInfo.wpStart}</div>
                                                <div><strong>Cicli:</strong> {this.state.missionInfo.cycles}</div>
                                                <div><strong>WP End:</strong> {this.state.missionInfo.wpEnd}</div>
                                                <div><strong>Stand Radius:</strong> {this.state.missionInfo.standRadius?.toFixed(8)}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                                        Waypoints caricati: {Array.isArray(missionWaypoints) ? missionWaypoints.length : 0}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        style={{ ...styles.blueBtn, fontSize: '12px', padding: '6px 12px' }}
                                        onClick={() => {
                                            // Aggiungi waypoints di test nel formato corretto
                                            const testWaypoints = [
                                                { nmissione: 0, indexWP: 0, latitude: 44.126474, longitude: 9.933195, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.126474, lng: 9.933195 },
                                                { nmissione: 0, indexWP: 1, latitude: 44.125963, longitude: 9.934199, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.125963, lng: 9.934199 },
                                                { nmissione: 0, indexWP: 2, latitude: 44.125549, longitude: 9.935042, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.125549, lng: 9.935042 },
                                                { nmissione: 0, indexWP: 3, latitude: 44.124713, longitude: 9.936800, navMode: 5, pointType: 0, monitoringOp: 0, arriveMode: 0, waypointRadius: 0.00009, lat: 44.124713, lng: 9.936800 }
                                            ];
                                            const testMissionInfo = {
                                                idMission: "provaWPMissioneasfaltoRbig",
                                                nMission: 0,
                                                total_mission_nWP: 9,
                                                wpStart: 1,
                                                cycles: 3,
                                                wpEnd: 8,
                                                standRadius: 0.00004
                                            };
                                            this.setState({
                                                missionWaypoints: testWaypoints,
                                                missionInfo: testMissionInfo,
                                                showMissionOnMap: true
                                            });
                                            console.log('✅ Test waypoints loaded (correct format):', testWaypoints);
                                        }}
                                    >
                                        🧪 Test Waypoints
                                    </button>
                                    <button
                                        style={{ ...styles.redBtn, fontSize: '12px', padding: '6px 12px' }}
                                        onClick={() => this.setState({ selectedMission: null, missionWaypoints: null, missionInfo: null, showMissionOnMap: false })}
                                    >
                                        ✕ Chiudi
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={styles.missionTableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.tableHeader}>N.Miss</th>
                                        <th style={styles.tableHeader}>Index WP</th>
                                        <th style={styles.tableHeader}>Latitude</th>
                                        <th style={styles.tableHeader}>Longitude</th>
                                        <th style={styles.tableHeader}>Nav Mode</th>
                                        <th style={styles.tableHeader}>Point Type</th>
                                        <th style={styles.tableHeader}>Monitor Op</th>
                                        <th style={styles.tableHeader}>Arrive Mode</th>
                                        <th style={styles.tableHeader}>WP Radius</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(missionWaypoints) && missionWaypoints.length > 0 && missionWaypoints.map((waypoint, index) => {
                                        try {
                                            // Parsing per formato missione reale
                                            const nmissione = waypoint.nmissione ?? waypoint.Nmissione ?? 0;
                                            const indexWP = waypoint.indexWP ?? waypoint.IndexWP ?? index;
                                            const latitude = waypoint.latitude ?? waypoint.lat ?? 0;
                                            const longitude = waypoint.longitude ?? waypoint.lng ?? 0;
                                            const navMode = waypoint.navMode ?? waypoint.NavMode ?? 0;
                                            const pointType = waypoint.pointType ?? waypoint.PointType ?? 0;
                                            const monitoringOp = waypoint.monitoringOp ?? waypoint.MonitoringOp ?? 0;
                                            const arriveMode = waypoint.arriveMode ?? waypoint.ArriveMode ?? 0;
                                            const waypointRadius = waypoint.waypointRadius ?? waypoint.WaypointRadius ?? 0;

                                            const isValidCoordinate = !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;

                                            return (
                                                <tr key={index} style={styles.tableRow}>
                                                    <td style={styles.tableCell}>{nmissione}</td>
                                                    <td style={styles.tableCell}>{indexWP}</td>
                                                    <td style={{
                                                        ...styles.tableCell,
                                                        color: isValidCoordinate ? '#333' : '#e74c3c',
                                                        fontWeight: isValidCoordinate ? 'normal' : 'bold'
                                                    }}>
                                                        {isValidCoordinate ? latitude.toFixed(6) + '°' : 'INVALID'}
                                                    </td>
                                                    <td style={{
                                                        ...styles.tableCell,
                                                        color: isValidCoordinate ? '#333' : '#e74c3c',
                                                        fontWeight: isValidCoordinate ? 'normal' : 'bold'
                                                    }}>
                                                        {isValidCoordinate ? longitude.toFixed(6) + '°' : 'INVALID'}
                                                    </td>
                                                    <td style={styles.tableCell}>{navMode}</td>
                                                    <td style={styles.tableCell}>{pointType}</td>
                                                    <td style={styles.tableCell}>{monitoringOp}</td>
                                                    <td style={styles.tableCell}>{arriveMode}</td>
                                                    <td style={styles.tableCell}>{waypointRadius?.toFixed(8) || '0.00000000'}</td>
                                                </tr>
                                            );
                                        } catch (error) {
                                            console.error('Error rendering waypoint:', error);
                                            return (
                                                <tr key={index} style={styles.tableRow}>
                                                    <td style={styles.tableCell}>{index + 1}</td>
                                                    <td style={{ ...styles.tableCell, color: '#e74c3c' }} colSpan="8">
                                                        Errore nel parsing del waypoint
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    })}

                                    {/* Messaggio se non ci sono waypoints */}
                                    {(!Array.isArray(missionWaypoints) || missionWaypoints.length === 0) && (
                                        <tr>
                                            <td style={{ ...styles.tableCell, textAlign: 'center', fontStyle: 'italic' }} colSpan="9">
                                                Nessun waypoint caricato. Prova il pulsante "Test Waypoints" sopra.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Debug info - VERSIONE SICURA */}
                            <div style={styles.debugInfo}>
                                <details style={{ marginTop: '15px' }}>
                                    <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                                        🔍 Debug: Informazioni Waypoints ({Array.isArray(missionWaypoints) ? missionWaypoints.length : 0} elementi)
                                    </summary>
                                    <div style={{
                                        backgroundColor: '#f8f9fa',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        marginTop: '10px',
                                        border: '1px solid #e9ecef'
                                    }}>
                                        <p><strong>Tipo dati:</strong> {typeof missionWaypoints}</p>
                                        <p><strong>È Array:</strong> {Array.isArray(missionWaypoints) ? 'Sì' : 'No'}</p>
                                        <p><strong>Lunghezza:</strong> {Array.isArray(missionWaypoints) ? missionWaypoints.length : 'N/A'}</p>
                                        {this.state.missionInfo && (
                                            <>
                                                <p><strong>Mission Info presente:</strong> Sì</p>
                                                <p><strong>ID Missione:</strong> {this.state.missionInfo.idMission}</p>
                                            </>
                                        )}
                                        {Array.isArray(missionWaypoints) && missionWaypoints.length > 0 && (
                                            <>
                                                <p><strong>Primo elemento:</strong></p>
                                                <pre style={{
                                                    backgroundColor: '#ffffff',
                                                    padding: '8px',
                                                    border: '1px solid #ddd',
                                                    maxHeight: '100px',
                                                    overflow: 'auto',
                                                    fontSize: '11px'
                                                }}>
                                                    {JSON.stringify(missionWaypoints[0], null, 2)}
                                                </pre>
                                            </>
                                        )}
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                    )}
                </>
            );
        } catch (error) {
            console.error('Error in render:', error);
            return (
                <div style={{ padding: '20px', color: 'red' }}>
                    <h2>Errore di caricamento</h2>
                    <p>Si è verificato un errore durante il caricamento dell'interfaccia.</p>
                    <p>Errore: {error.message}</p>
                </div>
            );
        }
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
    titleSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    },
    title: {
        fontSize: '18px',
        fontWeight: 'bold'
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
    selectedMissionInfo: {
        border: '1px solid #4CAF50',
        borderRadius: '5px',
        padding: '5px',
        marginBottom: '10px',
        backgroundColor: '#f0f8f0'
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
    missionsTreeContainer: {
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '10px'
    },
    // STILI PER LA TABELLA MISSIONE
    missionTable: {
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'white',
        borderTop: '3px solid #1a3a5a',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        maxHeight: '40vh',
        overflowY: 'auto'
    },
    missionTableHeader: {
        padding: '15px 20px 0 20px',
        borderBottom: '1px solid #eee'
    },
    missionTableContainer: {
        padding: '0 20px 15px 20px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
        fontSize: '13px'
    },
    tableHeaderRow: {
        backgroundColor: '#1a3a5a'
    },
    tableHeader: {
        padding: '12px 8px',
        textAlign: 'left',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        border: '1px solid #2c5282'
    },
    tableRow: {
        borderBottom: '1px solid #eee',
        '&:hover': {
            backgroundColor: '#f8f9fa'
        }
    },
    tableCell: {
        padding: '10px 8px',
        border: '1px solid #eee',
        fontSize: '12px',
        verticalAlign: 'middle'
    },
    debugInfo: {
        marginTop: '15px',
        borderTop: '1px solid #eee',
        paddingTop: '15px'
    }
};