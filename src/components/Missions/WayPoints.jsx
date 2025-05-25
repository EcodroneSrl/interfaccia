import { Table } from 'react-bootstrap';

export const WayPoints = (waypointData) => {
    var parsedData = waypointData.waypointData;

    if (parsedData) {
        return (
            <div className="table-responsive">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Nmissione</th>
                            <th>IndexWP</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th>NavMode</th>
                            <th>PointType</th>
                            <th>MonitoringOp</th>
                            <th>ArriveMode</th>
                            <th>WaypointRadius</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parsedData.map((waypoint, index) => (
                            <tr key={index}>
                                <th scope="row">{waypoint.Nmissione}</th>
                                <td>{waypoint.IndexWP}</td>
                                <td>{waypoint.Latitude}</td>
                                <td>{waypoint.Longitude}</td>
                                <td>{waypoint.NavMode}</td>
                                <td>{waypoint.PointType}</td>
                                <td>{waypoint.MonitoringOp}</td>
                                <td>{waypoint.ArriveMode}</td>
                                <td>{waypoint.WaypointRadius}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        );
    } else {
        return <h5>no data available</h5>;
    }
};
