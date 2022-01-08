import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import AddIcon from '@material-ui/icons/Add';
import { DeviceCard } from './DeviceCard.jsx';

// required props:
// onOk(text)
// onCancel()
function UriDialog(props) {
  const [text_val, setTextVal] = useState('10.10.1.1')
  return (
    <div>
      <Dialog open={props.visible} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Add Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To add a new device, enter its URI.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="uri"
            label="URI of the device"
            type="email"
			defaultValue={text_val}
            fullWidth
			onChange={e => setTextVal(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={e => props.onCancel()} color="primary">
            Cancel
          </Button>
          <Button onClick={e => props.onOk(text_val)} color="primary">
			 Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// props 
// -setDevices
// -devices
export function AppDevices(props) {

	// define all states
	const initialState = {
		mouseX: null,
		mouseY: null,
	};
	const [visible, setVisible] = React.useState(false);
	const onRemoveDevice = (id) => {
		console.log("remove device ",props.devices[id].uri)
		props.setDevices(devs => {
			var arr = [... devs]
			arr.splice(id, 1);
			return arr;
		});
	}

	const handleNewDevice = (device) => {
		setVisible(false)
		console.log("add device", device)
		props.setDevices(prev=> [...prev, {uri: device}]);
	};
	const handleAddDevice = (device) => {
		setVisible(true)
	};

	return (<div>
		<UriDialog visible={visible} onOk={handleNewDevice} onCancel={() => setVisible(false)} />
		{ 
			props.devices.map((device, index) =>(
				<React.Fragment key={index}>
					<DeviceCard device={device} onRemoveDevice={onRemoveDevice} index={index} />
				</React.Fragment>))
		}
		<div style={{ width: "100%", textAlign: "center"}}>
			<IconButton color="primary" aria-label="add an alarm" onClick={handleAddDevice} >
				<Tooltip title="Add new device" aria-label="add">
					<AddIcon style={{fontSize:"50px"}}/>
				</Tooltip>
			</IconButton>
		</div>
	</div>
	);
}