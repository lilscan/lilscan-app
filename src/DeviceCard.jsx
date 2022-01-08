import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import AppBar from '@material-ui/core/AppBar';
import Tooltip from '@material-ui/core/Tooltip';
import Toolbar from '@material-ui/core/Toolbar';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Dialog from '@material-ui/core/Dialog';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import { SnackbarProvider, useSnackbar } from 'notistack';
import ThreeDRotationOutlinedIcon from '@material-ui/icons/ThreeDRotationOutlined';
import CameraEnhanceOutlinedIcon from '@material-ui/icons/CameraEnhanceOutlined';
import VerticalAlignCenterOutlinedIcon from '@material-ui/icons/VerticalAlignCenterOutlined';

import BorderVerticalOutlinedIcon from '@material-ui/icons/BorderVerticalOutlined';
import SettingsOutlinedIcon from '@material-ui/icons/SettingsOutlined';
import {DeviceSettings} from './DeviceSettings.jsx';
import {DeviceCalib} from './DeviceCalib.jsx';
import {CameraCalib} from './CameraCalib.jsx';
import {DeviceScan} from './DeviceScan.jsx';
import LilScanPiCiclop from '../assets/lilscan_pi_ciclop.png'

const advanced = true
function camelize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}	

// props:
// uri 
export function DeviceCard(props){
	const {enqueueSnackbar,closeSnackbar} = useSnackbar();
	const [stub, setStub] = React.useState("");
	const [reconnect_count, setReconnectCount] = React.useState(-1)
	const [device_image, setDeviceImage] = React.useState("")
	const [device_state, setDeviceState] = React.useState({state:"Connecting to Device ...",
														   uri:"",
												           type:0, 
												           host_reachable:false, 
												           server_running:false, 
	                                                       bussy:true,
														   calibrated:false,
														   calib_timestamp:0,
												           subdevices: [],
												           software_version:0,
												           hardware:0});

	const [device_calib_open, setDeviceCalibOpen] = React.useState(false);
	const [cam_calib_open, setCamCalibOpen] = React.useState(false);
	const [device_scan_open, setDeviceScanOpen] = React.useState(false);
	const [device_settings_open, setDeviceSettingsOpen] = React.useState(false);

	const action = key => (
		<React.Fragment>
			<Button onClick={() => { closeSnackbar(key) }}>
				Dismiss
			</Button>
		</React.Fragment>
	);

	const updateDevice = (stub,fbussy) => {
		if(!stub) {
			return;
		}
		stub.getInfo({},{deadline: Date.now()+2000}, function (err, device_info) {
			if (err) {
				// console.log("error while getting device info: ",err)

				// An error has occurred and the stream has been closed.
				// console.log("error while streaming events ", err)
				ping(props.device.uri, function (alive) {
					if (alive) {
						setDeviceState(prev => ({
							...prev,
							uri: props.device.uri,
							host_reachable: true,
							server_running: false,
							state: "LilScan is not started on the device"
						}))
					}
					else {
						setDeviceState(prev => ({
							...prev,
							uri: props.device.uri,
							host_reachable: false,
							server_running: false,
							state: "Device Unreachable"
						}))
					}
					setReconnectCount(prev => (Math.max(prev,0)+1))
				})
			} else {
				console.log("got device info:", device_info)
				let type = device_info.type
				if(type == "LILSCAN_PI_CICLOP"){
					type = "LilScan-Pi"
				}
				else if(type == "UNKNOWN"){
					type = "Unknown System"
				}
				const major = ~~(device_info.sw_version / 1000000)
				const minor = ~~((device_info.sw_version % 1000000) / 10000)
				const release = ~~((device_info.sw_version % 10000) / 100)
				const build = device_info.sw_version % 100
				const software = `${major}.${minor}.${release} Build ${build}`
				const hardware = device_info.hw_version
				let processing = device_info.status === "PROCESSING";
				let calibrated = true;
				let calib_timestamp = 0;

				let tservo_serials = [];
				device_info.devices.forEach(function (device) {
					switch (device.status) {
						case "UNCALIBRATED":
							calibrated = false
							break;
						case "READY":
						case "CALIBRATED":
						case "DISABLED":
							if(device.calib_timestamp && device.calib_timestamp.seconds > calib_timestamp){
								calib_timestamp = device.calib_timestamp.seconds
							}
							break;
						default:
							processing = true
					}
				})
				let state = device_state.state
				let bussy = false;
				if(processing === true) {
					state = "Processing"
					bussy = true
				}
				else if(calibrated) {
					state = "Ready"
					bussy = false
				}
				else{
					state = "Uncalibrated"
					bussy = false
				}

				// overwrite bussy state as some of the events are fired just before
				// the system will leave bussy
				if(fbussy != undefined){
					state = "Ready"
					bussy = fbussy
				}

				if(device_info.status == "ERROR") {
					calibrated = false;
					processing = false;
					state = "Error"
				}

				// detect a reconnect
				if(device_state.server_running == false){
					setReconnectCount(0);
					setDeviceImage(LilScanPiCiclop)
				}

				// update state object
				setDeviceState(prev => ({
					...prev,
					uri: props.device.uri,
					state: state,
					type: type,
					host_reachable: true,
					server_running: true,
					bussy: bussy,
					calibrated: calibrated,
					calib_timestamp: calib_timestamp,
					subdevices: device_info.devices,
					software_version: software,
					hardware: hardware
				}))
			}
		});
	}

	// connect to the real device and get some info 
	useEffect(() => {
		if (props.device.uri.length == 0){
			return
		}
		if(!stub) {
			console.log("connecting ", props.device.uri)
			let tstub = connectToClient(props.device.uri)
			setStub(tstub)
			updateDevice(tstub)
		}
		else
		{
			console.log("reconnect count",reconnect_count)
			if (reconnect_count > 0) {
				if(reconnect_count == 1){
					enqueueSnackbar("Disconnected from device "+ props.device.uri, { variant: 'info', persist: false})
				}
				// trigger update 
				let timer = setTimeout(function () { updateDevice(stub) }, 5000)
				return function cleanup() {
					clearTimeout(timer)
				}
			}
			else
			{
				console.log("start event handler")
				enqueueSnackbar("Connected to device "+ props.device.uri, { variant: 'info', persist: false})
				// cannot be called with deadline as it is long lasting
				let event_streamer = stub.streamEvents({})
				event_streamer.on('data', function (event) {
					console.log("got event ",event)
					switch (event.type) {
						case "ERROR":
							updateDevice(stub,false)
							if (event.message.length > 0) {
								enqueueSnackbar(event.message, { variant: 'error', persist: true, action, preventDuplicate: true })
							}
							break;
						case "MESSAGE":
							if (event.message.length > 0) {
								enqueueSnackbar(event.message, { variant: 'info' })
							}
							break;
						case "CAPTURE_STARTED":
							updateDevice(stub,true)
							break;
						case "CATPURE_CANCELLED":
							updateDevice(stub,false)
							if (event.message.length > 0) {
								enqueueSnackbar(event.message, { variant: 'warning', persist: true, action })
							}
							break;
						case "CAPTURE_FINISHED":
							updateDevice(stub,false)
							if (event.message.length > 0) {
								enqueueSnackbar(event.message, { variant: 'success' })
							}
							break;
						case "KEEP_ALIVE":
							break;
						default:
							console.log("got unknown event", event)
							break
					}
				});
				event_streamer.on('end', function () {
					updateDevice(stub)
				});
				event_streamer.on('error', function (err) {
					updateDevice(stub)
				});
				event_streamer.on('status', function (status) {
					// process status
					// console.log('Image - data to read ' + rv.readableLength.toString() + ' ' + rv.readable)
				});
			return function cleanup() {
				setStub(undefined) // clear stub to prevent re-connect
				event_streamer.cancel()
				event_streamer.destroy()
			}
		}
	};
	}, [props.uri,reconnect_count]);
    let color = device_state.server_running ? "black" : "gray"
	return (
		<Grid container>
			 {/* Camera Calibration Dialog */}
			<Dialog fullScreen open={cam_calib_open}>
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setCamCalibOpen(false);updateDevice(stub)}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`Camera Calibration: ${props.device.uri}`} 
					</Toolbar>
				</AppBar>
				<div style={{ height: "75px" }}></div>
				{<CameraCalib stub={stub} device_state={device_state}/>}
			</Dialog>
			 {/* Laser Calibration Dialog */}
			<Dialog fullScreen open={device_calib_open}>
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setDeviceCalibOpen(false);updateDevice(stub)}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`Laser Calibration: ${props.device.uri}`} 
					</Toolbar>
				</AppBar>
				<div style={{ height: "75px" }}></div>
				{<DeviceCalib stub={stub} device_state={device_state} advanced={advanced} onClose={() => {setDeviceCalibOpen(false)}}/>}
			</Dialog>
			 {/* Settings Dialog */}
			<Dialog fullScreen open={device_settings_open}>
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setDeviceSettingsOpen(false);updateDevice(stub)}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`Device Settings: ${props.device.uri}`} 
					</Toolbar>
				</AppBar>
				<div style={{ height: "75px" }}></div>
				{<DeviceSettings stub={stub} device_state={device_state} advanced={advanced} onUpdate={() => updateDevice(stub)} onRemove={() => {setDeviceSettingsOpen(false);props.onRemoveDevice(props.index)}}/>}
			</Dialog>
			 {/* Scan Device Dialog */}
			<Dialog fullScreen open={device_scan_open} >
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setDeviceScanOpen(false)}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`3D Scan: ${props.device.uri}`} 
					</Toolbar>
				</AppBar>
				<div style={{height: "75px"}}></div>
				{<DeviceScan device_state={device_state} stub={stub}/>}
			</Dialog>
			<Card style={{ backgroundColor: "#00F0F0", width:"100%",margin:"20px"}} >
				<CardContent style={{maring:"0px",padding:"0px"}} >
					<Grid container item xs={12} spacing={1}>
						<Grid item xs={false}>
							<img src={device_image} className="device_image" />
						</Grid>
						<Grid item xs={false}>
							<Card style={{ backgroundColor: "#00F0F0",boxShadow:"none" }}>
								<CardContent>
									<Typography variant="h5" component="h2" style={{color:color}}>
										{device_state.server_running ? device_state.type + " (" +device_state.state+")": device_state.state}
									</Typography>
										<ul style={{fontSize:"12px", paddingLeft:"20px",color:color}} >
											<li> <b>URI:</b> {props.device.uri} </li>
											<li> <b>Software Version:</b> {device_state.software_version} </li>
											<li> <b>Hardware Version:</b> {device_state.hardware_version}
												<ul>
												{device_state.subdevices.map((subdevice, index) => (
													<React.Fragment key={index}>
														{subdevice.type == "CAMERA" && <li> <b>{camelize(subdevice.type)}:</b> {camelize(subdevice.status)} - Calib Error {subdevice.calib_error.toFixed(2)}px - Timestamp {(new Date(subdevice.calib_timestamp.seconds*1000)).toISOString()}</li>}
														{subdevice.type == "SERVO" && <li>  <b>{camelize(subdevice.type)}:</b> {camelize(subdevice.status)}</li>}
														{subdevice.type == "LASER" && <li>  <b>{camelize(subdevice.type)} {subdevice.serial}:</b> {camelize(subdevice.status)} - Calib Error {(subdevice.calib_error*1000.0).toFixed(2)}mm - Timestamp {(new Date(subdevice.calib_timestamp.seconds*1000)).toISOString()}</li>}
													</React.Fragment>))
												}
											    </ul> </li>
										</ul>
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</CardContent>
				<CardActions disableSpacing={true} style={{padding:"0px",margin:"0px",display: "block", textAlign: "right" }}>
					<IconButton color="secondary" aria-label="add an alarm" onClick={() => setDeviceSettingsOpen(true)}>
						<Tooltip title="Settings" aria-label="add">
							<SettingsOutlinedIcon/>
						</Tooltip>
					</IconButton>

					{advanced &&
						<React.Fragment>
							<IconButton color="secondary" aria-label="add an alarm" onClick={() => setCamCalibOpen(true)} disabled={!device_state.server_running}>
								<Tooltip title="Camera Calibration" aria-label="add">
									<CameraEnhanceOutlinedIcon />
								</Tooltip>
							</IconButton>
						</React.Fragment>}
					<IconButton color="secondary" aria-label="add an alarm" onClick={() => setDeviceCalibOpen(true)} disabled={!device_state.server_running}>
						<Tooltip title="Laser Calibration" aria-label="add">
							<BorderVerticalOutlinedIcon/>
						</Tooltip>
					</IconButton>
					<IconButton color="secondary" aria-label="add an alarm" onClick={() => setDeviceScanOpen(true)} disabled={!device_state.server_running || !device_state.calibrated} >
						<Tooltip title="3D Scan" aria-label="add">
							<ThreeDRotationOutlinedIcon/>
						</Tooltip>
					</IconButton>
				</CardActions>
			</Card>
		</Grid>
	)
};
