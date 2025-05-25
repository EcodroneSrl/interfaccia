

export const MissionHead = (headmission) => {

    var parsedData = headmission.headmission;

    if (parsedData) {
        
        return (
     
            <ul>
                <li> <span style={{ fontWeight: 'bold' }} >idMission: </span>  {parsedData.idMission}</li>
                <li> <span style={{ fontWeight: 'bold' }} >nMission: </span>  {parsedData.nMission}</li>
                <li> <span style={{ fontWeight: 'bold' }} >total_mission_nWP: </span>  {parsedData.total_mission_nWP}</li>
                <li> <span style={{ fontWeight: 'bold' }} >wpStart: </span>  {parsedData.wpStart}</li>
                <li> <span style={{ fontWeight: 'bold' }} >cycles: </span>  {parsedData.cycles}</li>
                <li> <span style={{ fontWeight: 'bold' }} >wpEnd: </span>  {parsedData.wpEnd}</li>
                <li> <span style={{ fontWeight: 'bold' }} >NMmode: </span>  {parsedData.NMmode}</li>
                <li> <span style={{ fontWeight: 'bold' }} >NMnum: </span>  {parsedData.NMnum}</li>
                <li> <span style={{ fontWeight: 'bold' }} >NMStartInd: </span>  {parsedData.NMStartInd}</li>
                <li> <span style={{ fontWeight: 'bold' }} >idMissionNext: </span>  {parsedData.idMissionNext}</li>
                <li> <span style={{ fontWeight: 'bold' }} >standRadius: </span>  {parsedData.standRadius}</li>
            </ul>
            
        );
    } else {
        return (
            <h2>no data available</h2>
        )
    }


};