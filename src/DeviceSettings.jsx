import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Switch from '@material-ui/core/Switch';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { SnackbarProvider, useSnackbar } from 'notistack';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContentText from '@material-ui/core/DialogContentText';
import CircularProgress from '@material-ui/core/CircularProgress';

import {SshDialog} from './SshDialog.jsx';
import {makeStyles } from '@material-ui/core/styles';

import pi4SnapInstall from '../assets/pi4_snap_install.sh';


const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    margin: 'auto',
    maxWidth: 500,
  },
}));

// component responsible for camera calibration
// required props
// - stub
// - device_state (see DeviceCard)
// - onRemove
// - advanced [true,false]
export function DeviceSettings(props) {
	const {enqueueSnackbar,closeSnackbar} = useSnackbar();
	const [laser_serials, setLaserSerials] = React.useState([]);
	const [laser_serial, setLaserSerial] = React.useState([]);		// selected laser serials
	const [step_angle, setStepAngle] = React.useState(1.8);		    // selected laser serials
	const [invert_dir, setInvertDir] = React.useState(false);		// selected laser serials
	const [lasers_on, setLasersOn] = React.useState(false);		    // selected laser serials
	const [servo_serial, setServoSerial] = React.useState(0);		// selected laser serials
	const [ssh_settings, setSshSettings] = React.useState({title:"", action:"",host:"",visible:false});
	const [ask, setAsk] = React.useState({id:0,open:false,title:"",question:"",payload:""});
	const [progress_open, setProgressOpen] = React.useState(false);

	const button_dismiss= key => (
		<React.Fragment>
			<Button onClick={() => { closeSnackbar(key) }}>
				Dismiss
			</Button>
		</React.Fragment>
	);

	const handleAskClose= () => {
		setAsk((prev) => ({...prev,open:false}))
	}

	const handleAskAction= () => {
		handleAskClose()

		// perform action depending od action
		if(ask.id == 1){
			sshCommand(ask.payload, `echo "${ask.payload.password}" | sudo -S snap start lilscan`, (data) => {
				enqueueSnackbar("The snap lilscan was activated. If it is not reachabled after several seconds check the device logs.", { variant: 'success', persist: false })
			},
			(err) => {
				enqueueSnackbar("The snap lilscan could not be activated: " +err, { variant: 'warning', persist: true, action: button_dismiss })
			})
		}
	}

	const handleSshAction= (action) => {
	    console.log(action)	
		setSshSettings( prev => ({...prev,visible:false}));

		// call command
		if(action.action == "Reboot Device")
		{
			console.log("reboot device ", action.host)
			sshCommand(action,`echo "${action.password}" | sudo -S reboot`,(data) => {
				enqueueSnackbar("Succesfully rebooted the device. It can take up to 2 minutes until the system becomes reachable again", { variant: 'success', persist: false})
			},
			(err) => {
				enqueueSnackbar("Failed to reboot the device: " + err, { variant: 'warning', persist: true, action: button_dismiss})
			})
		}
		else if(action.action == "Download Logs")
		{
			console.log("download device logs", action.host)
			sshCommand(action,`echo "${action.password}" | sudo -S snap logs -n 200 lilscan`,(data) => {
				saveDeviceLogs(data)
			},
			(err) => {
				enqueueSnackbar("Failed to download device logs: " + err, { variant: 'warning', persist: true, action: button_dismiss})
			})
		}
		else if(action.action == "Update Device Firmware")
		{
			console.log("updating device firmware on", action.host)
			setProgressOpen(true)
			sshCommand(action, `echo "${action.password}" | sudo -S snap refresh lilscan --amend --devmode`, (data) => {
				setProgressOpen(false)
				enqueueSnackbar("Updating Firmware Finished. It can take several seconds until the device gets reachable.", { variant: 'success', persist: false })
			},
			(err) => {
				setProgressOpen(false)
				enqueueSnackbar("Failed installing LilScan on the device: " + err, { variant: 'error', persist: true, action: button_dismiss })
			})
		}
		else if(action.action == "Remove Device Firmware")
		{
			console.log("remove device firmware on", action.host)
			setProgressOpen(true)
			sshCommand(action, `echo "${action.password}" | sudo -S snap remove lilscan --purge`, (data) => {
				setProgressOpen(false)
				enqueueSnackbar("Updating Firmware Finished. It can take several seconds until the device gets reachable.", { variant: 'success', persist: false })
			},
			(err) => {
				setProgressOpen(false)
				enqueueSnackbar("Failed installing LilScan on the device: " + err, { variant: 'error', persist: true, action: button_dismiss })
			})
		}
		else if(action.action == "Install Device Firmware")
		{
			console.log("install device firmware on", action.host)
			setProgressOpen(true)
			// check if lilscan is already installed/running
			sshCommand(action,`snap services lilscan.lilscan | tail -n1`,(data) => {
				var state = data.split('  ')
				console.log(state)
				if(state[2] == "inactive"){
					let request = {
						id: 1,
						open: true,
						payload: action,
						title: "Activate the Snap LilScan?",
						question: "The Snap LilScan is already installed on the device but not active. Either it was manually stopped or an error occured - please check the device logs. Do you want to activate it anyway?",
					}
					setAsk(request)
				}
				else{
					enqueueSnackbar("The snap lilscan is already running.", { variant: 'warning', persist: true, action: button_dismiss})
				}
			},
			(err) => {
				// snap or the service is not installed --> copy install script
				console.log("copy install script")
				sshCpData(action, pi4SnapInstall, "/tmp/pi4_install_snap.sh", () => {
					// call install script and finish up
					// the /tmp data are deleted with the next reboot
					console.log("call install script")
					sshCommand(action, `echo "${action.password}" | sudo -S bash /tmp/pi4_install_snap.sh`, (data) => {
						setProgressOpen(false)
						enqueueSnackbar("Installing Firmware Finished. It can take up to 2 minutes untile the device rebooted.", { variant: 'success', persist: false })
					},
					(err) => {
						setProgressOpen(false)
						enqueueSnackbar("Failed installing LilScan on the device: " + err, { variant: 'error', persist: true, action: button_dismiss })
					})
				})
			})
		}
	}

	const handleSshCancel= () => {
		setSshSettings( prev => ({...prev,visible:false}));
	}

	const commitParams = (params) => {
		props.stub.setParams(params, function (err, p) {
			if (err) {
				console.log("error" + err)
			} else {
			}
		});
	};

	const handleScan= () => {
		if(props.device_state.bussy === true) {
			props.stub.cancelCapture({}, function (err, params) {
				if (err) {
					console.log("error" + err)
				} else {
				}
			});
		}
		else{
			let request = { mode: "SCAN", laser_serial: [laser_serial[0]], laser_power: [], scan_speed: 4}
			props.stub.startCapture(request, function (err, params) {
				if (err) {
					console.log("error" + err)
				} else {
				}
			});
		}
	}

	const handleLasers= () => {
		console.log(lasers_on)
		if(lasers_on)
		{
			laser_serial.forEach(serial => commitParams({ params: [{ type: "LASER_POWER", arg1: 0,serial: serial}] }))
			setLasersOn(false)
		}
		else
		{
			laser_serial.forEach(serial => commitParams({ params: [{ type: "LASER_POWER", arg1: 100,serial: serial}] }))
			setLasersOn(true)
		}
	}

	const handleStepAngle= (serial,angle) => {
		console.log("set new angle ",angle)
		let request = { params: [{ type: "SCAN_DEVICE_STEP_ANGLE", serial: serial, arg1: angle}] }
		props.stub.setParams(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				setStepAngle(angle)
			}
		})
	}

	const handleInvertDir= (serial,val) => {
		console.log("set invert dir ",val)
		let request = { params: [{ type: "SCAN_DEVICE_INVERT_DIR", serial: serial, arg1: val}] }
		props.stub.setParams(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				setInvertDir(val != 0)
			}
		})
	}

	const handleLaserSerial= (serial) => {
		// check for each serial if it is already active
		serial.forEach(function (element) {
			if (!laser_serial.includes(element)) {
				// activate laser
				console.log("enable laser " + element)
				let request = { params: [{ type: "LASER_ENABLED", serial: element, arg1: 1, }] }
				props.stub.setParams(request, function (err, params) {
					if (err) {
						console.log("error" + err)
					} else {
					}
				})
			}
		})
		// check if a laser was deactivated
		laser_serial.forEach(function (element) {
			if (!serial.includes(element)) {
				// activate laser
				console.log("disable laser" + element)
				let request = { params: [{ type: "LASER_ENABLED", serial: element, arg1: 0, }] }
				props.stub.setParams(request, function (err, params) {
					if (err) {
						console.log("error" + err)
					} else {
					}
				})
			}
		})
		setLaserSerial(serial)
	}

	useEffect(() => {
		// do nothing if disconnected
		if(!props.stub) return

		// get all knwon laser and servo  serials
		props.stub.getInfo({}, function (err, device_info) {
			if (err) {
				console.log(err)
			} else {
				// get all laser serial
				console.log(device_info)
				let devs = device_info.devices.filter(device => device.type === "LASER")
				let serials = devs.map(dev => dev.serial)
				setLaserSerials(serials)

				//  get all laser serials which are enabled
				devs = device_info.devices.filter(device => device.type === "LASER" && device.status != "DISABLED")
				let lserials = devs.map(dev => dev.serial)
				setLaserSerial(lserials)

				// get servo serials to enable different scan modes
				devs = device_info.devices.filter(device => device.type === "SERVO")
				serials = devs.map(dev => dev.serial)
				let bon = false
				if (serials.length > 0) {
					let request = {
						params: [{ type: "SCAN_DEVICE_STEP_ANGLE", serial: serials[0], arg1: 0, },
						{ type: "SCAN_DEVICE_INVERT_DIR", serial: serials[0], arg1: 0, },
						{ type: "LASER_POWER", serial: lserials, arg1: 0, }]
					}
					props.stub.getParams(request, function (err, params) {
						if (err) {
							console.log("error" + err)
						} else {
							setServoSerial(params.params[0].serial)
							setStepAngle(params.params[0].arg1)
							setInvertDir(params.params[1].arg1 != 0)
							setLasersOn(params.params[2].arg1 != 0)
						}
					})
				}
			}
		});
	}, [props.stub]);
	const classes = useStyles();
	let button_firmware = props.device_state.server_running ? "Update Device Firmware" : "Install Device Firmware"
	return (
		<div className={classes.root} style={{maxHeight:"calc(100vh - 95px)"}}>
			 {/* SSH Dialog. */}
			 <SshDialog onCancel={handleSshCancel} onAction={handleSshAction} settings={ssh_settings}/>
			 {/* Progress Box Firmware. */}
			<Dialog
				open={progress_open}
				aria-labelledby="wait-dialog-title"
				aria-describedby="wait-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">Updating Firmware ...</DialogTitle>
				<DialogContent style={{ textAlign: "center" }}>
					<CircularProgress />
				</DialogContent>
			</Dialog>
			 {/* Ask Dialog. */}
			<Dialog
				open={ask.open}
				onClose={handleAskClose}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					{ask.title}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						{ask.question}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleAskClose}>No</Button>
					<Button onClick={handleAskAction} autoFocus>Yes</Button>
				</DialogActions>
			</Dialog>
			<Paper className={classes.paper} style={{ marginTop: "20px" }}>
				<Typography variant="h5" component="h2">
					General:
				</Typography>
				<FormControl style={{ "width": "100%", "paddingTop": "20px" }}>
					<Button disabled={!props.device_state.host_reachable} variant="outlined" size="medium" color="primary" style={{ marginTop: "10px", width: "100%" }} 
						onClick={() => { setSshSettings({action:"Download Logs",
														 title: "SSH-Client",
											             visible:true,
											             host:props.device_state.uri}
											             )}}>
						Download Device Logs
					</Button>
					<Button onClick={() => {props.onRemove()}} variant="outlined" size="medium" color="primary" style={{ marginTop: "10px", width: "100%" }}>
						Forget this Device 
					</Button>
					<Button disabled={!props.device_state.host_reachable} variant="outlined" size="medium" color="primary" style={{ marginTop: "30px", width: "100%" }} 
						onClick={() => { setSshSettings({action:button_firmware,
														 title: "SSH-Client",
											             visible:true,
											             host:props.device_state.uri}
											             )}}>
						{button_firmware}
					</Button>
					{props.device_state.server_running &&
						<React.Fragment>
							<Button variant="outlined" size="medium" color="primary" style={{ marginTop: "10px", width: "100%" }} 
								onClick={() => { setSshSettings({action:"Remove Device Firmware",
																title: "SSH-Client",
																visible:true,
																host:props.device_state.uri}
																)}}>
							    Remove Device Firmware
							</Button>
						</React.Fragment>
					}
					<Button disabled={!props.device_state.host_reachable} variant="outlined" size="medium" color="primary" style={{ marginTop: "10px", width: "100%" }} 
						onClick={() => { setSshSettings({action:"Reboot Device",
														 title: "SSH-Client",
											             visible:true,
											             host:props.device_state.uri}
											             )}}>
			            Reboot Device
					</Button>
				</FormControl>
			</Paper>
			<Paper className={classes.paper} style={{marginTop:"20px"}}>
				<Typography variant="h5" component="h2">
					Hardware:
				</Typography>
				<FormControl style={{ "width": "100%", marginTop:"20px",paddingBottom: "10px" }} disabled={!props.device_state.server_running}>
					<InputLabel id="select-laser-label">Enabled Lasers:</InputLabel>
					<Select
						labelId="select-laser-label"
						id="select-laser"
						multiple
						value={laser_serial}
						renderValue={(selected) => selected.join(', ')}
						onChange={(e) => handleLaserSerial(e.target.value)}
					>
						{laser_serials.map((serial, index) => (
							<MenuItem key={index} value={serial}>
								<Checkbox checked={laser_serial.indexOf(serial) > -1} />
								<ListItemText primary={serial} />
							</MenuItem>
						))
						}
					</Select>
				</FormControl>
				{props.advaced && 
					<React.Fragment>
						<FormControl style={{ "width": "100%", "paddingBottom": "20px" }} disabled={!props.device_state.server_running}>
							<InputLabel id="select-label" margin="dense" shrink={true}>Servo Step Angle:</InputLabel>
							<Select
								labelId="demo-simple-select-label"
								id="demo-simple-select"
								value={step_angle}
								onChange={(e) => handleStepAngle(servo_serial, e.target.value)}
							>
								<MenuItem value={0.9}>0.9°</MenuItem>
								<MenuItem value={1.8}>1.8°</MenuItem>
							</Select>
						</FormControl>
					</React.Fragment>
				}
				<FormControl style={{ "width": "100%", "paddingBottom": "10px" }} disabled={!props.device_state.server_running}>
					<InputLabel id="invert_dir" margin="dense" shrink={true}>Invert Servo Dir:</InputLabel>
					<FormControlLabel control={<Switch checked={invert_dir} onChange={(e) => handleInvertDir(servo_serial,e.target.checked)}/>} style={{ "justifyContent": "center", "width": "100%" }} />
				</FormControl>
				<FormControl style={{ "width": "100%", "paddingBottom": "10px" }} disabled={!props.device_state.server_running}>
					<Button onClick={handleScan} variant="outlined" size="medium" color="primary" style={{ marginTop: "0px", width: "100%" }} disabled={!props.device_state.server_running}>
						{props.device_state.bussy === true && props.device_state.server_running ? "Stop Servo" : "Test Servo"}
					</Button>
				</FormControl>
				<FormControl style={{ "width": "100%", "paddingBottom": "10px" }} disabled={!props.device_state.server_running}>
					<Button onClick={handleLasers} variant="outlined" size="medium" color="primary" style={{ marginTop: "0px", width: "100%" }} disabled={!props.device_state.server_running}>
						{lasers_on === true ? "Stop Lasers" : "Test Lasers"}
					</Button>
				</FormControl>
			</Paper>
		</div>
	);
}
