import React, { useRef } from "react";
import ReactHlsPlayer from "react-hls-player";

const LiveStreamPlayer = ({url}) => {
  const playerRef = useRef();  // Create a reference for the player

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
      <ReactHlsPlayer
        playerRef={playerRef}
        src={url}  
        autoPlay={true} 
        controls={true}  
        width="100%"  
        height="auto"  
      />
    </div>
  );
};

export default LiveStreamPlayer;

