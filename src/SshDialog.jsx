import React, { useState, useEffect,useRef,MouseEvent } from 'react';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

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
// - settings  # {:title,:action,:ip,:visible}        
// - onAction # callback 
// - onCancel # callback
export function SshDialog(props) {
	const classes = useStyles();
	const user = useRef(null);
	const password = useRef(null);

	return (
		<div className={classes.root} style={{maxHeight:"calc(100vh - 95px)"}}>
			<Dialog
				open={props.settings.visible}
				onClose={props.onCancel}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">{props.settings.title}</DialogTitle>
				<DialogContent>
					<TextField required id="standard-required" ref={user} label="Username" defaultValue="pi" />
					<TextField
						id="standard-password-input"
						label="Password"
						type="password"
						autoComplete="current-password"
						defaultValue="raspberry"
						ref={password}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={props.onCancel} color="primary" autoFocus variant="outlined">
						Cancel
					</Button>
					<Button onClick={() => {props.onAction({...props.settings,username:user.current.childNodes[1].firstChild.value,
						                                    password:password.current.childNodes[1].firstChild.value,
															port:22})}} color="primary" autoFocus variant="contained">
						{props.settings.action}
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
