import React, { createContext, useEffect, useRef, useState } from 'react';
import { BaseConfig } from '../config/BaseConfig';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children, uidcallback }) => {
  const wsRef = useRef(null);
  const [skMessage, setSkMessage] = useState(null);
  const [wsState, setWsState] = useState(BaseConfig.webSocketState.NOTCONNECTED);

  // Function to close the WebSocket connection
  const closeWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  useEffect(() => {

    const wsUrl = BaseConfig.wsUrl ;

    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (error) {
      console.error('WebSocket creation error:', error);
    }

    wsRef.current.onopen = () => {
      //  console.log('WebSocket connected to', wsUrl);
      setWsState(BaseConfig.webSocketState.OPEN);
      
      const fmessage = {
        scope: "U",
        type: 0,
        id_message: "boat_id",
        data_command: "NNN"
      };

      sendMessage(fmessage)
    };

    wsRef.current.onmessage = (event) => {
      //  console.log('WebSocket message received:', event.data);
      try {
        console.log("EVENT DATA: " + event.data);
        const message = JSON.parse(event.data);
        setSkMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsState(BaseConfig.webSocketState.CLOSED);
    };

    wsRef.current.onclose = (event) => {
      //  console.log('WebSocket closed:', event);
      setWsState(BaseConfig.webSocketState.CLOSED);
    };

    // Clean up on unmount
    return () => {
      if (wsRef.current) {
        //  console.log('Closing WebSocket connection on unmount');
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      //  console.log('WebSocket sent message:', msg);
    } else {
      console.warn('WebSocket is not ready. Message not sent:', msg);
    }
  };

  return (
    <WebSocketContext.Provider value={{ skMessage, sendMessage, wsState, closeWs }}>
      {children}
    </WebSocketContext.Provider>
  );
};