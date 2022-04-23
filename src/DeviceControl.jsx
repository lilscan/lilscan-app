import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';

import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import LinearProgress from '@material-ui/core/LinearProgress';

// required props:
//	- sub
//  - device_state
// optional props 
// - rotation       camera rotation [true,false]
// - scan     		scan control and download [true,false]
// - laser 	  		laser control [true,false]
// - sphere 		sphere settings [true,false]
// - board          board settings [true,false]
export function DeviceControl(props) {
	const [board, setBoard] = React.useState(0);
	const [camera_gain, setCameraGain] = React.useState(5);
	const [camera_exposure, setCameraExposure] = React.useState(8);
	const [rotation, setRotation] = React.useState(0);
	const [scan_mode, setScanMode] = React.useState("SCAN");
	const [scan_speed, setScanSpeed] = React.useState(4);
	const [laser_serials, setLaserSerials] = React.useState([]);
	const [servo_serials, setServoSerials] = React.useState([]);
	const [laser_on, setLaserOn] = React.useState(false);
	const [sphere_diameter, setSphereDiameter] = React.useState(0);
	const [sphere_offset, setSphereOffset] = React.useState(0);
	const [progress, setProgress] = React.useState(0);
	const [progress_open, setProgressOpen] = React.useState(false);
	const [download_streamer, setDownloadStreamer] = React.useState(undefined);

	const valuetext = (value, index) => {
		return `${value / 1000}ms`;
	}
	const commitParams = (params) => {
		props.stub.setParams(params, function (err, p) {
			if (err) {
				console.log("error" + err)
			} else {
			}
		});
	};
	const updateParam = (param) => {
		switch (param.type) {
			case "CAMERA_GAIN":
				setCameraGain(param.arg1)
				break;
			case "CAMERA_EXPOSURE":
				setCameraExposure(param.arg1)
				break;
			case "CAMERA_ORIENTATION":
				setRotation(param.arg1)
				break;
			case "LASER_POWER":
				setLaserOn(param.arg1 > 0)
				break;
			case "SPHERE":
				setSphereDiameter(param.arg1*2000)	// returns radius in m
				setSphereOffset((param.arg2*1000).toFixed(2))
				break;
		}
	};
	const handleBoard= (val) => {
		setBoard(val)
		// we only have one board at the moment
	}
	const handleRotation = (val) => {
		setRotation(val)
		commitParams({ params: [{ type: "CAMERA_ORIENTATION", arg1: val }] })
	}
	const handleLasers= (val) => {
		setLaserOn(val)
		laser_serials.forEach(serial => commitParams({ params: [{ type: "LASER_POWER", arg1: val ,serial: serial}] }))
	}

	const handleSphere = () => {
		// convert diameter in mm to radius in m
		commitParams({ params: [{ type: "SPHERE", arg1: sphere_diameter/2000 ,arg2:sphere_offset/1000,serial: laser_serials}]})
	}
	const cancelDownload = () => {
		if(download_streamer){
			download_streamer.cancel()
		}
	}

	const handleDownload= () => {
		let request = { id: -1, ply: true, file_chunks: true }
		downloadPly("last_scan", props.stub, request, (stream,prog, e = null) => {
			setProgress(prog)
			if (prog === 100) {
				setProgressOpen(false)
				setDownloadStreamer(undefined)
			}
			else {
				setProgressOpen(true)
				setDownloadStreamer(stream)
			}
		})
	}

	const handleScan= (mode,speed) => {
		if(props.device_state.bussy === true) {
			props.stub.cancelCapture({}, function (err, params) {
				if (err) {
					console.log("error" + err)
				} else {
				}
			});
		}
		else{
			let request = { mode: mode, laser_serial: laser_serials, laser_power: new Array(laser_serials.length).fill(100),scan_speed: speed}
			props.stub.startCapture(request, function (err, params) {
				if (err) {
					console.log("error" + err)
				} else {
				}
			});
		}
	}
	useEffect(() => {
		if(!props.device_state.server_running) { 
			return
		}

		// get laser serial
		let devs = props.device_state.subdevices.filter(device => device.type === "LASER" && device.status != "DISABLED")
		let serials = devs.map(dev => dev.serial)
		setLaserSerials(serials)

		// get servo serials to enable different scan modes
		devs = props.device_state.subdevices.filter(device => device.type === "SERVO")
		serials = devs.map(dev => dev.serial)
		setServoSerials(serials)

		// update params
		let request = {params: [{ type: 'CAMERA_GAIN' }, { type: 'CAMERA_EXPOSURE' },{ type: 'SPHERE' },{ type: 'CAMERA_ORIENTATION' },{type:'LASER_POWER'}]}
		props.stub.getParams(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				params.params.forEach(param => updateParam(param))
			}
		});

		// send some updates if not bussy
		if (!props.device_state.bussy) {
			// just send default board for now to ensure the settings are correct even if some ohter client was overwriting it
			let request2 = { params: [{ type: "CHECKERBOARD_SIZE", arg1: 14, arg2: 9 }, { type: "CHECKERBOARD_FIELD_WIDTH", arg1: 0.01249, arg2: 0 }] }
			props.stub.setParams(request2, function (err, params) {
				if (err) {
					console.log("error" + err)
				} else {
				}
			});
		}
	},[props.device_state]);
	return (
		<div>
			 {/* Download Progress Box. */}
			<Dialog
				open={progress_open}
				aria-labelledby="wait-dialog-title"
				aria-describedby="wait-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">Downloading ...</DialogTitle>
				<DialogContent style={{textAlign: "center"}}>
 					<LinearProgress variant="determinate" value={progress} />
					<Button onClick={cancelDownload} variant="contained" size="medium" color="primary" style={{ marginTop: "20px", width: "100%" }}>
						Cancel
					</Button>
				</DialogContent>
			</Dialog>
			{props.board &&
				<React.Fragment>
					<FormControl style={{ "width": "100%", "paddingBottom": "40px" }}>
						<InputLabel id="select-label" margin="dense" shrink={true}>Checkerboard:</InputLabel>
						<Select
							labelId="demo-simple-select-label"
							id="demo-simple-select"
							value={board}
							onChange={(e) => handleBoard(e.target.vale)}
						>
							<MenuItem value={0}>Target v2.0 (14x9 - 12.49mm)</MenuItem>
						</Select>
					</FormControl>
				</React.Fragment>
			}
			{props.sphere &&
				<React.Fragment>
					<InputLabel id="sphere_diameter_label" margin="dense" shrink={true}>Sphere Diameter:</InputLabel>
					<Tooltip title="Diameter of the calibration sphere in mm." aria-label="add">
						<Input
							id="sphere_diameter"
							value={sphere_diameter}
							onChange={(e) => setSphereDiameter(e.target.value)}
							onBlur={handleSphere}
							endAdornment={<InputAdornment position="end">mm</InputAdornment>}
							aria-describedby="sphere-diameter-helper-text"
							style={{ marginBottom: "10px", width: "100%" }}
							type="number"
						/>
					</Tooltip>
					<InputLabel id="sphere_offset_label" margin="dense" shrink={true}>Sphere Offset:</InputLabel>
					<Tooltip title="Offset of the sphere center to the ground plane in mm." aria-label="add">
						<Input
							id="sphere_offset"
							value={sphere_offset}
							onChange={(e) => setSphereOffset(e.target.value)}
							onBlur={handleSphere}
							endAdornment={<InputAdornment position="end">mm</InputAdornment>}
							aria-describedby="sphere-offset-helper-text"
							style={{ marginBottom: "40px", width: "100%" }}
							type="number"
						/>
					</Tooltip>
				</React.Fragment>
			}
			{props.rotation &&
				<FormControl style={{ "width": "100%", "paddingBottom": "20px" }}>
					<InputLabel id="select-label" margin="dense" shrink={true}>Camera Rotation:</InputLabel>
					<Select
						labelId="demo-simple-select-label"
						id="demo-simple-select"
						value={rotation}
						onChange={(e) => handleRotation(e.target.value)}
					>
						<MenuItem value={0}>0°</MenuItem>
						<MenuItem value={90}>90°</MenuItem>
						<MenuItem value={180}>180°</MenuItem>
						<MenuItem value={270}>270°</MenuItem>
					</Select>
				</FormControl>
			}
			<InputLabel id="camera_exposure_label" margin="dense" shrink={true}>Camera Exposure:</InputLabel>
			<Slider
				onChangeCommitted={(e, value) => commitParams({ params: [{ type: 'CAMERA_EXPOSURE', arg1: value }] })}
				onChange={(e, val) => setCameraExposure(val)}
				value={camera_exposure}
				valueLabelFormat={valuetext}
				aria-labelledby="discrete-slider-always"
				step={1000}
				valueLabelDisplay="auto"
				min={4000}
				max={32000}
			/>
			<InputLabel id="camera_gain_label" style={{ "paddingTop": "10px" }} margin="dense" shrink={true}>Camera Gain:</InputLabel>
			<Slider
				onChangeCommitted={(e, value) => commitParams({ params: [{ type: 'CAMERA_GAIN', arg1: value }] })}
				onChange={(e, val) => setCameraGain(val)}
				value={camera_gain}
				getAriaValueText={valuetext}
				aria-labelledby="discrete-slider-always"
				valueLabelDisplay="auto"
				min={1}
				max={12}
				step={1}
				style={{ "paddingBottom": "40px" }}
			/>
			{props.laser &&
				<React.Fragment>
					<InputLabel id="laser_test" margin="dense" shrink={true}>Test Laser:</InputLabel>
					<FormControlLabel control={<Switch checked={laser_on} onChange={(e) => handleLasers(e.target.checked)}/>} style={{ "justifyContent": "center", "width": "100%", "paddingBottom": "20px" }} />
				</React.Fragment>
			}
			{props.scan &&
				<React.Fragment>
					<FormControl style={{ "width": "100%" }}>
						<InputLabel id="select-scan-mode-label">Scan-Mode</InputLabel>
						<Select
							labelId="select-scan-mode-label"
							id="select-scan-mode"
							value={scan_mode}
							onChange={(e) => setScanMode(e.target.value)}
						>
							<MenuItem value={"PROFILE_SINGLE"}>Single Line</MenuItem>
							<MenuItem value={"SCAN"} disabled={servo_serials.length === 0}>3D Scan</MenuItem>
							<MenuItem value={"SCAN_DENSE"} disabled={servo_serials.length === 0}>3D Scan</MenuItem>
						</Select>
					</FormControl>
				</React.Fragment>
			}
			{props.scan && scan_mode != 9 &&
				<React.Fragment>
					<InputLabel id="scan_speed" margin="dense" shrink={true} style={{paddingTop:"10px"}}>Scan Speed:</InputLabel>
					<Slider
						value={scan_speed}
						onChange={(e,val) => setScanSpeed(val)}
						aria-labelledby="discrete-slider-always"
						step={1}
						valueLabelDisplay="auto"
						min={1}
						max={10}
					/>
				</React.Fragment>
			}
			{props.children}
			{props.scan &&
				<React.Fragment>
					<Button onClick={() => handleScan(scan_mode,scan_speed)} disabled={laser_serials.length == 0} variant="contained" size="medium" color="primary" style={{ marginTop: "40px", width: "100%" }}>
						{props.device_state.bussy === true ? <div>Abort Scan</div> : <div>Start Scan</div>}
					</Button>
					<Button onClick={handleDownload} disabled={props.device_state.bussy === true } variant="outlined" size="medium" color="primary" style={{ "width": "100%", "marginTop": "10px" }}>
						Download Last Scan
					</Button>
				</React.Fragment>
			}
			{props.calibrate &&
				<React.Fragment>
					<Button onClick={() => handleScan("SCAN_CALIBRATION",4)} variant="contained" size="medium" color="primary" style={{ marginTop: "40px", width: "100%" }}>
						{props.device_state.bussy === true ? <div>Abort Calibration</div> : <div>Start Calibration</div>}
					</Button>
					<Button onClick={() => handleScan("SCAN_REFINEMENT",4)} disabled={!props.device_state.calibrated} variant="contained" size="medium" color="primary" style={{ marginTop: "10px", width: "100%" }}>
						{props.device_state.bussy === true ? <div>Abort Scan</div> : <div>Start Refinement</div>}
					</Button>
				</React.Fragment>
			}
		</div>
	);
}
