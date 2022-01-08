import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Dialog from '@material-ui/core/Dialog';
import SettingsIcon from '@material-ui/icons/Settings';
import FilterCenterFocusIcon from '@material-ui/icons/FilterCenterFocus';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';

import { CameraCalib} from './CameraCalib.jsx';
import { LaserSettings} from './LaserSettings.jsx';
import { ServoCalib} from './ServoCalib.jsx';

const useCardStyles = makeStyles({
  root: {
    width: 200,
    margin: 10,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
});

// props
// - name
// - settings -> elements
// - calib -> elements 
// - device 
// - onUpdate
// - onRemove
// - plugin_name
export function SubCard(props) {
	const [calib_open, setCalibOpen] = React.useState(false);
	const [settings_open, setSettingsOpen] = React.useState(false);
	const card_classes = useCardStyles();
	useEffect(() => {
		setCalibOpen(false)
		setSettingsOpen(false)
		},[props.trigger])
	return (
		<Grid item xs={false}>
			 {/* Calibration Dialog */}
			<Dialog fullScreen open={calib_open} onClose={() => setCalibOpen(false)}>
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setCalibOpen(false);props.onUpdate();}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`${props.name} SN ${props.device.serial} - Calibration`} 
					</Toolbar>
				</AppBar>
				<div style={{ height: "75px" }}></div>
				{props.calib}
			</Dialog>
			 {/* Settings Dialog */}
			<Dialog fullScreen open={settings_open} onClose={() => setSettingsOpen(false)}>
				<AppBar>
					<Toolbar>
						<IconButton edge="start" color="inherit" onClick={() => {setSettingsOpen(false);props.onUpdate();}} aria-label="close">
							<ArrowBackIosIcon/>
						</IconButton>
						{`${props.name} SN ${props.device.serial} - Settings`} 
					</Toolbar>
				</AppBar>
				<div style={{ height: "75px" }}></div>
				{props.settings}
			</Dialog>
			 {/* Sub-Device Card */}
			<Card className={card_classes.root}>
				<CardContent>
					<Typography variant="h5" component="h2">
						{props.name} {props.device.serial}
					</Typography>
					<Typography variant="body2" component="p">
						Status: {props.device.status}
						<br/>
						<br/>
						Device: {props.plugin_name}
						<br/>
						Version: {props.device.version}
					</Typography>
				</CardContent>
				<CardActions disableSpacing={true} style={{ display: "block", textAlign: "right" }}>
					{
						props.onRemove &&
						<IconButton color="secondary" aria-label="add an alarm" onClick={(e) => props.onRemove(props.device)} >
							<Tooltip title="Remove Plugin" aria-label="add">
								<DeleteOutlineIcon />
							</Tooltip>
						</IconButton>
					}
					{
						props.calib &&
						<IconButton color="secondary" aria-label="calibrate device" onClick={() => setCalibOpen(true)} >
							<Tooltip title="Calibrate" aria-label="add">
								<FilterCenterFocusIcon />
							</Tooltip>
						</IconButton>
					}
					{
						props.settings &&
						<IconButton color="secondary" aria-label="add an alarm" onClick={() => setSettingsOpen(true)} >
							<Tooltip title="Settings" aria-label="add">
								<SettingsIcon />
							</Tooltip>
						</IconButton>
					}
				</CardActions>
			</Card>
		</Grid>
	)
};

export function CameraCard(props) {
	const [trigger, setTrigger] = React.useState(0);
	const handleTrigger = () => {
		setTrigger(t => {setTrigger(t+1)})
		props.onUpdate()
	}
	return (
		<SubCard name="Camera"
		device={props.subdevice}								                                // sub device (version,serial,status)
		calib={<CameraCalib uri={props.device.uri} serial={props.subdevice.serial} onCalibrated={handleTrigger}/>}			// elements embeded in calib panel
		plugin_name ={props.plugin_name}							  							
		onRemove={props.onRemove}								                                // callback remove subdevice
		trigger = {trigger}
		onUpdate={handleTrigger}></SubCard>							     						// calback after changes
	)
};

export function LaserCard(props) {
	const [trigger, setTrigger] = React.useState(0);
	const handleTrigger = () => {
		setTrigger(t => {return t+1})
		props.onUpdate()
	}
	return (
		<SubCard name="Laser"
		device={props.subdevice}							  // sub device (version,serial,status)
		trigger = {trigger}
		laser_serial={props.subdevice.serial}
		settings={<LaserSettings serial={props.subdevice.serial} uri={props.device.uri}/>}
		plugin_name ={props.plugin_name}							  							
		onUpdate={handleTrigger}></SubCard>							     						// calback after changes
	)
};

export function ServoCard(props) {
	const [trigger, setTrigger] = React.useState(0);
	const handleTrigger = () => {
		setTrigger(t => {return t+1})
		props.onUpdate()
	}
	return (
		<SubCard name="Servo"
		device={props.subdevice}							  									// sub device (version,serial,status)
		plugin_name ={props.plugin_name}							  							
		trigger = {trigger}
		settings={<ServoCalib uri={props.device.uri} onCalibrated={handleTrigger}/>}			// elements embeded in calib panel
		onUpdate={handleTrigger}></SubCard>							     						// calback after changes
	)
};
