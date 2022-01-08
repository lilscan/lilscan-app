import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Chip from '@material-ui/core/Chip';
import { DeviceControl } from './DeviceControl.jsx';
import TurntableOverlay from '../assets/turntable-overlay.png'

import InputLabel from '@material-ui/core/InputLabel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

// component responsible for laser/servo calibration
// required props
// - stub
// - device_state
// - advanced [true,false]
// - onClose
export function DeviceCalib(props) {
	const [table_on, setTableOn] = React.useState(true);
	const [calib_timestamp, setCalibTimestamp] = React.useState(0);
	const handleTable= (val) => {
		setTableOn(val)
	}

	useEffect(() => {
		if(calib_timestamp != 0 && calib_timestamp != props.device_state.calib_timestamp){
			props.onClose()
		}
		setCalibTimestamp(props.device_state.calib_timestamp)
	}, [props.device_state]);
	return (
		<div className="row">
			<div className="column1" >
				<img className="mjpeg_calib" src={"grpc://" + props.device_state.uri}></img>
				{/* table overaly. */}
				{table_on & props.device_state.server_running & !props.device_state.bussy ?  <img className="overlay_calib" src={TurntableOverlay}></img> : null }
			</div>
			<div className="column2">
				{/* elements before device control . */}
				<Chip label={props.device_state.state} color="secondary" variant="outlined" style={{ marginBottom: "10px", width: "100%" }} />
				<DeviceControl stub={props.stub} device_state={props.device_state} laser={true} sphere={props.advanced} calibrate={true}>
					<InputLabel id="Show Turntable Overlay" margin="dense" shrink={true} style={{marginTop:"10px"}}>Turntable Overlay:</InputLabel>
					<FormControlLabel control={<Switch checked={table_on} onChange={(e) => handleTable(e.target.checked)} />} style={{ "justifyContent": "center", "width": "100%", "paddingBottom": "20px" }} />
				</DeviceControl>
			</div>
		</div>
	);
}
