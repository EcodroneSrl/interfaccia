import React, { useContext, useEffect, useState, useRef } from 'react';
import { Row, Col, Image, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

import { WebSocketContext } from '../Websockets';
import { FolderMissionStruct } from '../Missions/MissionDirectoryTree';
import { MissionHead } from '../Missions/MissionHeader';
import { WayPoints } from '../Missions/WayPoints';

export function Missions({ userid }) {
  const { skMessage, sendMessage } = useContext(WebSocketContext);
  const [tree, setTree] = useState(null);
  const [head, setHead] = useState("");
  const [waypoints, setWaypoints] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");

  // Ensure mission initialization only once
  const stateMission = useRef(false);

  // Unified function to send messages
  const sendSocketMessage = (scope, type, idMessage, dataCommand) => {
    const msgData = { scope, type, id_message: idMessage, data_command: dataCommand };
    sendMessage(msgData);
  };

  // Initialize mission on first render
  const handleClick = () => {
    sendSocketMessage('M', 0, 'DList', 'NNN');
    setWaypoints('');
  };

  // Send the START MISSION message
  const handleSendMessage = () => {
    if (selectedFilePath) {
      sendSocketMessage('M', 4, 'SM', selectedFilePath);
    }
  };

  // Send a custom message when Custom Action button is clicked
  const handleDeleteFile = () => {
    if (selectedFilePath) {
      sendSocketMessage('M', 5, 'DF', selectedFilePath);
    }
  };

  // Handle file selection from tree
  const handleFileSelection = (filePath) => {
    setSelectedFilePath(filePath);
  };

  useEffect(() => {
    if (!stateMission.current) {
      stateMission.current = true;
      handleClick();
    }

    if (skMessage && skMessage.scope === 'M') {
      const messageType = parseInt(skMessage.type, 10);
      if (messageType === 1) {
        setTree(JSON.parse(skMessage.data_command));
      } else if (messageType === 2) {
        setHead(JSON.parse(skMessage.data_command));
      } else if (messageType === 3) {
        setWaypoints(JSON.parse(skMessage.data_command));
      }
    }
  }, [skMessage]);

  return (
    <Col>
      <Row className="align-items-center">
        <Col xs={1} className="m-3 text-center">
          <Image
            className="img-fluid"
            src="/src/assets/flash.png"
            alt="FLASH Image"
            style={{ maxWidth: '40px', maxHeight: '40px', cursor: 'pointer' }}
            onClick={handleClick}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          />
        </Col>
        <Col xs={2}>
          <p>File: {selectedFilePath}</p>
        </Col>
      </Row>
      <Row>
        <Col xs={4}>
          <FolderMissionStruct
            dataTree={tree}
            sendMessage={sendSocketMessage}
            onFileSelect={handleFileSelection}
          />
        </Col>
        <Col xs={8}>
          <MissionHead headmission={head} />
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <WayPoints waypointData={waypoints} />
        </Col>
      </Row>

      {selectedFilePath && (
        <Row className="mt-3">
          <Col xs={6} className="text-center">
            <Button variant="primary" onClick={handleSendMessage}>
              START MISSION
            </Button>
          </Col>
          <Col xs={6} className="text-center">
            <Button variant="danger" onClick={handleDeleteFile}>
              DELETE FILE
            </Button>
          </Col>
        </Row>
      )}
    </Col>
  );
}

Missions.propTypes = {
  userid: PropTypes.string.isRequired,
};
