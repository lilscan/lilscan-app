// import resources

const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
const {app, BrowserWindow,globalShortcut } = require('electron');
const {protocol} = require('electron')
const {PassThrough} = require('stream')
const path = require('path');
const fs = require('fs')
const {url} = require('url')
const {readFileSync} = require('fs');

// TODO
// it seems import jpg is not using the loaders in this file
// workaround is currently to use relative files + fs

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var PROTO_PATH = path.join(__dirname,'../proto/lilscan.proto');
var IMG_NOT_CONNECTED= path.join(__dirname,'../assets/not_connected.jpg');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
var lilscan_grpc = protoDescriptor.lilscan.grpc;


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 600,
    minHeight: 760,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        webSecurity: false
    }
  });
  globalShortcut.register('f5', function () {
    console.log('f5 is pressed')
    mainWindow.reload()
  })
  globalShortcut.register('CommandOrControl+R', function () {
    console.log('CommandOrControl+R is pressed')
    mainWindow.reload()
  })

  // hide menu bar
  mainWindow.setMenuBarVisibility(false)

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
var image_streamer;
app.on('ready', () => {
 // installExtension(REACT_DEVELOPER_TOOLS)
  //     .then((name) => console.log(`Added Extension:  ${name}`))
  //     .catch((err) => console.log('An error occurred: ', err));
  protocol.registerStreamProtocol('grpc', (request, callback) => {
    const murl = new URL(request.url)
    if(image_streamer){
      image_streamer.cancel()
      image_streamer.destroy()
    }
    // send single no connection image if no host is given
    if (murl.host.length === 0) {
      const rv = fs.createReadStream(IMG_NOT_CONNECTED)
      callback({
        statusCode: 200,
        headers: {
          Pragma: 'no-cache',
          Connection: 'close',
          'Content-Type': 'image/jpeg',
          'Content-Length': rv.readableLength.toString()
        },
        data: rv
      })
    }
    else {
      const host = murl.port.length ? murl.host : murl.host + ":54322"
      console.log("requesting mpjeg from ", host)

      // send image stream from grpc
      let rv = new PassThrough()
      const lilscan_stub = new lilscan_grpc.Interface(host, grpc.credentials.createInsecure());
      image_streamer = lilscan_stub.streamPreview({})
      image_streamer.on('data', function (image) {
        rv.push(`--myboundary\nContent-Type: image/jpg\nContent-length: ${image.data.length}\n\n`);
        rv.push(image.data);
        if (rv.readable === false) {
          console.log('image stream not readable')
          image_streamer.cancel()
        }
      });
      image_streamer.on('end', function () {
        console.log("end stream")
        data = fs.readFileSync(IMG_NOT_CONNECTED)
        // write two times as there might be a broken image in the pipe
        rv.push(`--myboundary\nContent-Type: image/jpg\nContent-length: ${data.length}\n\n`);
        rv.push(data)
        rv.push(`--myboundary\nContent-Type: image/jpg\nContent-length: ${data.length}\n\n`);
        rv.push(data)
      });
      image_streamer.on('error', function (e) {
        // An error has occurred and the stream has been closed.
        console.log("error stream")
        data = fs.readFileSync(IMG_NOT_CONNECTED)
        // write two times as there might be a broken image in the pipe
        rv.push(`--myboundary\nContent-Type: image/jpg\nContent-length: ${data.length}\n\n`);
        rv.push(data)
        rv.push(`--myboundary\nContent-Type: image/jpg\nContent-length: ${data.length}\n\n`);
        rv.push(data)
      });
      image_streamer.on('status', function (status) {
        // process status
        // console.log('Image - data to read ' + rv.readableLength.toString() + ' ' + rv.readable)
      });
      callback({
        statusCode: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
          Pragma: 'no-cache',
          Connection: 'close',
          'Content-Type': 'multipart/x-mixed-replace; boundary=--myboundary'
        },
        data: rv
      })
    }
  })
  createWindow();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
