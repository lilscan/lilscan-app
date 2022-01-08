
import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import { DeviceControl } from './DeviceControl.jsx';

// component responsible for camera calibration
// required props
// - uri 
export function LaserSettings(props) {
	return (
		<div className="row">
			<div className="column1" >
				<img className="mjpeg_calib" src={props.uri}></img>
			</div>
			<div className="column2">
				<DeviceControl uri={props.uri} laser={true} laser_serial={props.serial}/>
			</div>
		</div>
	);
}
