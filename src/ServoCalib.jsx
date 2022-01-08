import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Tooltip from '@material-ui/core/Tooltip';

import { DeviceControl } from './DeviceControl.jsx';
import { SnackbarProvider, useSnackbar } from 'notistack';

// component responsible for laser/servo calibration
// required props
// - uri 
export function ServoCalib(props) {
	const [state, setState] = React.useState("Connecting");
	const [stub, setStub] = React.useState(8);
	const [bussy, setBussy] = React.useState(false);
	const [servo_serials, setServoSerials] = React.useState([]);
	const { enqueueSnackbar } = useSnackbar();

	const updateState = (stub) => {
		stub.getInfo({}, function (err, device_info) {
			if (err) {
				console.log(err)
			} else {
				console.log("got device info:", device_info)
				let calibrated = true;
				let processing = device_info.status === "PROCESSING";
				let tservo_serials = [];
				device_info.devices.forEach(function (device) {
					if (device.type === "LASER") {
						switch (device.status) {
							case "UNCALIBRATED":
								calibrated = false
								break;
							case "READY":
							case "CALIBRATED":
								break;
							default:
								processing = true
						}
					}
					else if(device.type === "SERVO" ){
						tservo_serials.push(device.serial)
					}
				})
				if (processing) {
					setBussy(true)
					setState("State: Processing")
				}
				else if (calibrated) {
					setBussy(false)
					setState("State: Calibrated")
				}
				else {
					setBussy(false)
					setState("State: Uncalibrated")
				}
				setServoSerials(tservo_serials);
			}
		});
	}

	useEffect(() => {
		console.log("connecting ",props.uri)
		let tstub = connectToClient(props.uri)
		setStub(tstub)
		let event_streamer = tstub.streamEvents({})
		event_streamer.on('data', function (event) {
			switch(event.type)
			{
				case "ERROR":
					updateState(tstub);
					break;
				case "MESSAGE":
					break;
				case "CAPTURE_STARTED":
					setBussy(true)
					setState("State: Processing")
					break;
				case "CATPURE_CANCELLED":
					setBussy(false)
					setState("State: Canceled")
					updateState(tstub);
					break;
				case "CAPTURE_FINISHED":
					updateState(tstub);
					break;
				case "KEEP_ALIVE":
					break;
				default:
					break
			}
		});
		event_streamer.on('error', function (error) {
		});
		updateState(tstub)
		return function cleanup() {
			event_streamer.cancel()
			event_streamer.destroy()
		};
	}, [props.uri]);
	return (
		<div className="row">
			<div className="column1" >
				<img className="mjpeg_calib" src={props.uri}></img>
			</div>
			<div className="column2">
				{/* top elements before device control . */}
				<Chip label={state} color="secondary" variant="outlined" style={{ marginBottom: "10px", width: "100%" }} />
				<DeviceControl uri={props.uri} laser={true} sphere={true} calibrate={true} bussy={bussy}>
				</DeviceControl>
			</div>
		</div>
	);
}
