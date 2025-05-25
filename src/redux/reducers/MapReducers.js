// mapReducer.js
const mapReducer = (state = { mapStyle: 'mapbox://styles/mapbox/streets-v12' }, action) => {
    switch (action.type) {
        case 'UPDATE_MAP_STYLE':
            return { ...state, mapStyle: action.payload };
        default:
            return state;
    }
};

export default mapReducer;