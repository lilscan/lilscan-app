import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import NotConnectedImg from '../assets/not_connected.jpg'
import { DeviceControl } from './DeviceControl.jsx';

// required props:
// - stub
// - device_state 
export function DeviceScan(props) {
	return (
		<div className="row">
			<div className="column1" >
				<img className="image" src={props.device_state.server_running ? ("grpc://"+props.device_state.uri) : NotConnectedImg}></img>
			</div>
			<div className="column2">
				<DeviceControl stub={props.stub} device_state={props.device_state} laser={true} scan={true} />
			</div>
		</div>);
}