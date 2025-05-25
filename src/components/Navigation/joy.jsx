import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { WebSocketContext } from '../Websockets';
import { Row, Col, Table, Form } from 'react-bootstrap';

const JoystickReader = ({ stateapp, userid }) => {
  const [gamepad, setGamepad] = useState(null);
  const [axisValues, setAxisValues] = useState(new Array(5).fill(0));
  const [buttonsValues, setButtonValues] = useState(new Array(17).fill(0));
  const [isChecked, setIsChecked] = useState(false); // State for checkbox
  const { sendMessage } = useContext(WebSocketContext);

  useEffect(() => {
    const handleGamepadConnected = (event) => {
      setGamepad(event.gamepad);
      setAxisValues(new Array(event.gamepad.axes.length).fill(0));
      // const message = {
      //   scope: "J",
      //   type: 0,
      //   id_message: "JON",
      //   data_command: JSON.stringify("NNN")
      // };
      // sendMessage(message);
    };

    const handleGamepadDisconnected = (event) => {
      setGamepad(null);
      setAxisValues([]);
    };

    const updateGamepadState = () => {
      if (!navigator.getGamepads) {
        console.error('Gamepad API not supported');
        return;
      }

      const gamepads = navigator.getGamepads();
      if (!gamepads) return;

      const filteredGamepad = gamepads[0]; // adjust selector if needed
      if (!filteredGamepad) return;

      const currentGamepad = filteredGamepad;
      setGamepad(currentGamepad);

      const updatedAxisValues = new Array(5).fill(0);
      const raw_pov = parseFloat(currentGamepad.axes[9]).toFixed(2);
      let angle = 0;

      if (raw_pov === '-0.71') {
        angle = 45;
      } else if (raw_pov === '-0.43') {
        angle = 90;
      } else if (raw_pov === '-0.14') {
        angle = 135;
      } else if (raw_pov === '0.14') {
        angle = 180;
      } else if (raw_pov === '0.43') {
        angle = 225;
      } else if (raw_pov === '0.71') {
        angle = 270;
      } else if (raw_pov === '1.00' || raw_pov === '1') {
        angle = 315;
      } else {
        angle = 0;
      }

      updatedAxisValues[0] = angle; // pov
      updatedAxisValues[1] = parseFloat(currentGamepad.axes[0]); // axis x
      updatedAxisValues[2] = parseFloat(currentGamepad.axes[1]); // axis y
      updatedAxisValues[3] = parseFloat(currentGamepad.axes[5]); // wheel
      updatedAxisValues[4] = parseFloat(currentGamepad.axes[6]); // throttle

      const updatedButtonsValues = new Array(17).fill(0);
      currentGamepad.buttons.forEach((button, index) => {
        updatedButtonsValues[index] = button.pressed ? 1 : 0;
      });


      // updatedAxisValues = [
      //   Math.floor(Math.random() * 360), // Random pov angle between 0 and 360
      //   Math.random() * 2 - 1, // Random value between -1 and 1 for axisX
      //   Math.random() * 2 - 1, // Random value between -1 and 1 for axisY
      //   Math.random() * 2 - 1, // Random value between -1 and 1 for wheel
      //   Math.random() * 2 - 1, // Random value between -1 and 1 for throttle
      // ];

      // updatedButtonsValues = new Array(17).fill(0).map(() => Math.round(Math.random())); // Random button values (0 or 1)


      const message_data = {
        buttons: updatedButtonsValues,
        pov: updatedAxisValues[0],
        axisX: updatedAxisValues[1],
        axisY: updatedAxisValues[2],
        wheel: updatedAxisValues[3],
        throttle: updatedAxisValues[4]
      };

      setButtonValues(updatedButtonsValues);
      setAxisValues(updatedAxisValues);

      // Only send message if checkbox is checked
      if (isChecked) {
        const message = {
          scope: "J",
          type: 2,
          id_message: "JD",
          data_command: JSON.stringify(message_data)
        };
        
        sendMessage(message);
      }
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    const interval = setInterval(updateGamepadState, 300); // Update every 300ms

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      clearInterval(interval);
    };

  }, [axisValues, stateapp, buttonsValues, sendMessage, userid, isChecked]); // Added isChecked to dependency array

  // Handler for checkbox change
  const handleCheckboxChange = (e) => {
    //  console.log("DATA SENDING");
    setIsChecked(e.target.checked);
    const message = {
      scope: "J",
      type: e.target.checked ? 1 : 0, 
      id_message: e.target.checked ? "JON" : "JOFF",
      data_command: "NNN"
    };
    sendMessage(message);
  };

  return (
    <div className="joystick-reader">
      <Row>
        <Col>
            <h2>Gamepad Data</h2>
        </Col>
        <Col>
              <Form.Check
              type="checkbox"
              label="Joystick is active when Checked"
              checked={isChecked}
              onChange={handleCheckboxChange}
            />
        </Col>
      </Row>
      
      {gamepad ? (
        <Row>
          <Col md={4}>
            <p>Index: {gamepad.index}</p>
            <p>Mapping: {gamepad.mapping}</p>
            <p>Axes:</p>
            <ul>
              {axisValues.map((axisValue, index) => (
                <li key={`axis-${index}`}>{`Axis ${index}: ${axisValue}`}</li>
              ))}
            </ul>
          </Col>
          <Col md={8}>
            <Row>
              <Col>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Button</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamepad.buttons.slice(0, 8).map((button, index) => {
                      const valueStr = button.value.toFixed(2);
                      return (
                        <tr key={`button-${index}`}>
                          <td>{`Button ${index}`}</td>
                          {valueStr === '1.00' ? (
                            <td style={{ backgroundColor: 'green' }}>
                              <span>{valueStr}</span>
                            </td>
                          ) : (
                            <td style={{ backgroundColor: 'red' }}>
                              <span>{valueStr}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Col>
              <Col>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Button</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamepad.buttons.slice(8, 16).map((button, index) => {
                      const actualIndex = index + 8;
                      const valueStr = button.value.toFixed(2);
                      return (
                        <tr key={`button-${actualIndex}`}>
                          <td>{`Button ${actualIndex}`}</td>
                          {valueStr === '1.00' ? (
                            <td style={{ backgroundColor: 'green' }}>
                              <span>{valueStr}</span>
                            </td>
                          ) : (
                            <td style={{ backgroundColor: 'red' }}>
                              <span>{valueStr}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Col>
        </Row>
      ) : (
        <p>No gamepad connected.</p>
      )}

      
    </div>
  );
};

JoystickReader.propTypes = {
  stateapp: PropTypes.string.isRequired,
  userid: PropTypes.string.isRequired,
};

export default JoystickReader;
