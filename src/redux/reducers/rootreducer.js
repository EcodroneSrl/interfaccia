import { combineReducers } from 'redux';
import mapReducer from '../reducers/MapReducers';

const rootReducer = combineReducers({
    map_redux: mapReducer
});

export default rootReducer;