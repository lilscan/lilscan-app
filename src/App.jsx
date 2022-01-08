import React, { useState, useRef,MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import { SnackbarProvider, useSnackbar } from 'notistack';

// custom stuff
import Tooltip from '@material-ui/core/Tooltip';
import UsbIcon from '@material-ui/icons/Usb';
import InfoIcon from '@material-ui/icons/Info';
import SettingsApplicationsIcon from '@material-ui/icons/SettingsApplications';

// own components
import {AppDevices} from './AppDevices.jsx'

function useStickyState(defaultValue, key) {
	const [value, setValue] = React.useState(() => {
		const stickyValue = window.localStorage.getItem(key);
		return stickyValue !== null
			? JSON.parse(stickyValue)
			: defaultValue;
	});
	React.useEffect(() => {
		window.localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);
	return [value, setValue];
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{width:"100%"}}
      {...other}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}
const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
    height: "100vh",
    display: 'flex',
    padding: 0,
  },
  tabs: {
    borderRight: `1px solid ${theme.palette.divider}`,
    padding: 0,
    backgroundColor: "#F0F0F0",
  },
  icons: {
    width:  "60px",
    minWidth: "60px"
  },
}));

export function LilScanApp(props) {
  // define all states
	const classes = useStyles();
  const [tab_value, setTabValue] = React.useState(0);
  const [devices, setDevices] = useStickyState([],"Devices");
	const handleTabValue = (event, newValue) => {
		setTabValue(newValue);
	};
  return (
    <div>
      <SnackbarProvider autoHideDuration={6000} maxSnack={3}>
        {
          //<AppBar position="static">
          //  <Toolbar>
          //    <Typography variant="h6" className={classes.title}>
          //     LilScan App 
          //    </Typography>
          //  </Toolbar>
          //</AppBar> 
        }
        <div className={classes.root}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={tab_value}
            onChange={handleTabValue}
            aria-label="Vertical tabs example"
            className={classes.tabs}
          >
            <Tooltip title="Devices" interactive key="0" placement="left" arrow>
              <Tab className={classes.icons} icon={<UsbIcon />} {...a11yProps(0)} />
            </Tooltip>
            <Tooltip title="Info" interactive key="1" placement="left" arrow>
              <Tab className={classes.icons} icon={<InfoIcon />} {...a11yProps(0)} />
            </Tooltip>
          </Tabs>
          <TabPanel value={tab_value} index={0}>
            <AppDevices devices={devices} setDevices={setDevices}/>
          </TabPanel>
          <TabPanel value={tab_value} index={2}>
            Item Four
          </TabPanel>
        </div>
      </SnackbarProvider>
    </div>
  );
}
