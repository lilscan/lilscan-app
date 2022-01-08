import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import Tooltip from '@material-ui/core/Tooltip';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import DeleteIcon from '@material-ui/icons/Delete';

import { DeviceControl } from './DeviceControl.jsx';
import { SnackbarProvider, useSnackbar } from 'notistack';

// component responsible for camera calibration
// required props
// - stub
// - device_state (see DeviceCard)
export function CameraCalib(props) {
	const [poses, setPoses] = React.useState([]);

	// delete a specific pose image
	const deleteItem = (id) => {
		console.log("remove image",id)
		let request = { calib: true, pose_id: id}
		props.stub.deleteData(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				console.log("deleted data item")
				updatePoseIds(props.stub)
			}
		});
	};

	// calibrate camera
	const calibrateCamera = () => {
		let request = {mode:"CAMERA_CALIBRATION"}
		props.stub.startCapture(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				console.log("calibrating")
			}
		});
	}

	const handleFactoryReset = () => {
		let params = { params: [{ type: 'CAMERA_FACTORY', }]}
		props.stub.setParams(params, function (err, p) {
			if (err) {
				console.log("error" + err)
			} else {
			}
		});
	}

	const updatePoseIds = (stub) => {
		let request = { calib: true, preview: true }
		let streamer = stub.getCaptureInfo(request)
		let ids = []
		streamer.on('data', function (info) {
			ids.push(info.config.pose_id)
		});
		streamer.on('end', function () {
			console.log("end stream")
			setPoses(ids)
		});
		streamer.on('error', function (e) {
			// An error has occurred and the stream has been closed.
			console.log("error stream")
		});
		streamer.on('status', function (status) {
			// process status
			// console.log('Image - data to read ' + rv.readableLength.toString() + ' ' + rv.readable)
		});
	}
	
	const capturePose = () => {
		// find a free id
		let id = 0
		for (let i = 1; i < 100; i++) {
			if (!poses.includes(i)) {
				id = i
				break
			}
		}
		let request = {mode:"PHOTO_CALIBRATION",pose_id:id}
		console.log(request)
		props.stub.startCapture(request, function (err, params) {
			if (err) {
				console.log("error" + err)
			} else {
				console.log("caputre image")
			}
		});
	}

	useEffect(() => {
		// update pose ids everytime the system goes into none bussy mode
		if (props.device_state.bussy === false) {
			updatePoseIds(props.stub);
		}
	}, [props.device_state]);

	return (
			<div className="row">
				<div className="column1" >
				    <img className="mjpeg_calib" src={"grpc://"+props.device_state.uri}></img>
				</div>
				<div className="column2">
					<Chip label={props.device_state.state} color="secondary"  variant="outlined" style={{ marginBottom: "10px",width:"100%" }} />
					<DeviceControl stub={props.stub} device_state={props.device_state} board={true} rotation={true}>
						<Tooltip title="Reset camera calibration to factory defaults. Better scan results can be achieved with a custom calibration." aria-label="add" placement="top">
							<span>
								<Button onClick={handleFactoryReset} variant="contained" color="secondary" autoFocus style={{ marginTop: "10px", width: "100%" }}>
									Reset to Factory
								</Button>
							</span>
						</Tooltip>
						<Tooltip title="Position the calibration target first (see help)." aria-label="add" placement="top">
							<span>
								<Button onClick={capturePose} disabled={props.device_state.bussy || poses.length >= 4} variant="contained" color="primary" autoFocus style={{ marginTop:"10px",width: "100%" }}>
									{`Capture Pose ${Math.min(4,poses.length+1)}/4`}
								</Button>
							</span>
						</Tooltip>
						<Tooltip title="Performs a custom camera calbration after four poses of the calibration target are captured." aria-label="add">
							<span>
								<Button onClick={calibrateCamera} disabled={poses.length < 4 || props.device_state.bussy} variant="contained" color="primary" autoFocus style={{ marginTop: "10px", width: "100%" }}>
									Calibrate Camera
								</Button>
							</span>
						</Tooltip>
						<Button color="primary" autoFocus style={{ marginTop: "10px", width: "100%" }}>
							Help
						</Button>
						<Divider style={{ marginTop: "20px" }} />
						<List dense={true} style={{ marginTop: "10px" }}>
							{poses.map((pose, index) => (
								<React.Fragment key={index}>
									<ListItem>
										<ListItemText
											primary={`Pose ${pose}`}
										/>
										<ListItemSecondaryAction>
											<Tooltip title="Delete Pose." aria-label="add">
												<IconButton edge="end" aria-label="delete" onClick={(e) => deleteItem(pose)}>
													<DeleteIcon />
												</IconButton>
											</Tooltip>
										</ListItemSecondaryAction>
									</ListItem>
								</React.Fragment>))
							}
						</List>
					</DeviceControl>
				</div>
			</div>
	);
}
