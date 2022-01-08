import React, { useState, useRef,MouseEvent } from 'react';
import * as ReactDOM from 'react-dom';
import {LilScanApp} from './App.jsx';
import './index.css';

function render() {
  ReactDOM.render(
      <LilScanApp/>, document.getElementById('root')
  );
}
render()