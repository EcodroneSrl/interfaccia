import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Col } from 'react-bootstrap';

export const FolderMissionStruct = ({ dataTree, sendMessage, onFileSelect }) => {
  
    const RequestMissionWayPoints = (filePath) => {
        const corrected_path = encodeURIComponent(filePath.trim());
        sendMessage("M", 1, "NNN", corrected_path);
    };

    useEffect(() => {
        //  console.log('Data tree changed:', dataTree);
    }, [dataTree]);

    if (!dataTree) {
        return <h6>No data available</h6>;
    }

    const renderTree = (node, depth = 0, parentFolder = '') => {
        const isFileSelectable = node.Type === 'file' && node.Name.endsWith('.bin');

        const renderIndentation = () => {
            const spaces = Array(depth * 2).fill('\u00A0').join('');
            return <span className="indentation">{spaces}</span>;
        };

        const handleFileClick = () => {
            if (isFileSelectable) {
                const filePath = parentFolder + '/' + node.Name;
                RequestMissionWayPoints(filePath);
                onFileSelect(filePath); // Call the parent callback to pass back the selected file path
            }
        };

        if (node.Type === 'directory') {
            return (
                <div key={node.Name} className="directory">
                    {renderIndentation()}
                    <span className="icon">📁</span>
                    <span>{node.Name}</span>
                    <div className="children">
                        {node.Children.map((child) =>
                            renderTree(child, depth + 1, `${node.Name}`)
                        )}
                    </div>
                </div>
            );
        } else if (node.Type === 'file') {
            return (
                <div
                    key={node.Name}
                    className={`file${isFileSelectable ? ' selectable' : ''}`}
                    onClick={handleFileClick}
                >
                    {renderIndentation()}
                    <span className="icon">📄</span>
                    <span>{node.Name}</span>
                </div>
            );
        }
        return null;
    };

    return <div id="rootdirdata">{renderTree(dataTree)}</div>;
};

FolderMissionStruct.propTypes = {
    dataTree: PropTypes.object,
    sendMessage: PropTypes.func.isRequired,
    onFileSelect: PropTypes.func.isRequired, // Add the callback to prop types
};
