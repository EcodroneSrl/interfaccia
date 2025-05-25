import React, { useContext, useEffect, useState } from 'react';
import { Col } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { WebSocketContext } from './Websockets';

export function UserIdMonitoring({ userid }) {
  const [currentUserId, setCurrentUserId] = useState(userid);
  const [ipAdd, setIPAddr] = useState("x.x.x.x");
  const { skMessage } = useContext(WebSocketContext);

  // Effect to update the local state if the userid prop changes
  useEffect(() => {
    setCurrentUserId(userid);
  }, [userid]); // Re-run when `userid` prop changes

  useEffect(() => {
    console.log("WebSocket message received:", skMessage);
    if (skMessage && skMessage.scope === "U" && skMessage.id_message) {
      console.log("CALLED ID: " + skMessage.id_message);
      if (skMessage.type === 1) {
        setIPAddr(skMessage.data_command);
      } else {
        setCurrentUserId(skMessage.id_message);
      }
    }
  }, [skMessage]); // Re-run when WebSocket message changes

  return (
    <>
      {currentUserId ? (
        <Col>
          <p>Your user id is: {currentUserId}</p>
        </Col>
      ) : (
        <h2>Your user id is: NNN</h2>
      )}
      <Col>
        <p>Server ip is: {ipAdd}</p>
      </Col>
    </>
  );
}

UserIdMonitoring.propTypes = {
  userid: PropTypes.string,
};
