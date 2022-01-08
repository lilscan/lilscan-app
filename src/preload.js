console.log('loading grpc');

import {URL} from 'url'
import fs from 'fs'
import path from 'path' 
import pi4SnapInstall from '../assets/pi4_snap_install.sh';

var ping = require('ping')
var grpc = require("@grpc/grpc-js");
var protoLoader = require('@grpc/proto-loader');

const { Client } = require('ssh2');
const dialog = require('electron').remote.dialog

var PROTO_PATH = path.join(__dirname,'../../main/proto/lilscan.proto');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// credentials {host,port,username,password}
global.sshCommand = function(credentials,command,onData,onError){
    console.log("ssh - connect")
    const client = new Client();
    let total_data = ""
    let total_error = ""
    client.on('ready', () => {
        client.exec(command, (err, stream) => {
            if (err){
                onError(err)
            }
            else
            {
                stream.on('close', (code, signal) => {
                    console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                    client.end();
                    if(total_data.length > 0) onData(total_data)
                    if(total_error.length > 0) onError(total_error)
                }).on('data', (data) => {
                    total_data += data
                }).stderr.on('data', (data) => {
                    total_error += data
                });
            }
        });
    }).connect(credentials);
    client.on('error', (err) => {
        onError(err)
    })
}
 
global.ping = async function(host,fct){
    ping.sys.probe(host,fct,{timeout:1})
}

// credentials {host,port,username,password}
global.sshCp= function(credentials,src,dst,onFinished,onError){
    const client = new Client();
    client.on('ready', () => {
        client.sftp(function (err, sftp) {
            if (err) {
                console.log("Error, starting SFTP: %s", err);
                onError(err)
            }
            else {
                console.log("- SFTP started for "+src);
                var readStream = fs.createReadStream(src);
                var writeStream = sftp.createWriteStream(dst);
                writeStream.on('close', function () {
                    sftp.end();
                    onFinished()
                });
                readStream.pipe(writeStream);
            }
        });
    }).connect(credentials);
}

// credentials {host,port,username,password}
global.sshCpData= function(credentials,data,dst,onFinished,onError){
    const client = new Client();
    client.on('ready', () => {
        client.sftp(function (err, sftp) {
            if (err) {
                console.log("Error, problem starting SFTP: %s", err);
                onError(err)
            }
            else {
                var writeStream = sftp.createWriteStream(dst);
                writeStream.on('close', function () {
                    sftp.end();
                    onFinished();
                });
                writeStream.end(data)
            }
        });
    }).connect(credentials);
}

global.connectToClient = function(uri){
    try {
        const murl = new URL("grpc://"+uri)
        const host = murl.port.length ? murl.host : murl.host + ":54322"
        return new protoDescriptor.lilscan.grpc.Interface(host, grpc.credentials.createInsecure());
    } catch (e) {
        console.log("error uri: ",e)
        return new protoDescriptor.lilscan.grpc.Interface("localhost:54322", grpc.credentials.createInsecure());
    }
}

global.downloadPly = function (file,stub,request,callback) {
    var options = {
        title: "Download scan and save to",
        defaultPath: file,
        buttonLabel: "Save",
        filters: [
            { name: 'ply', extensions: ['ply'] },
        ]
    };
    dialog.showSaveDialog(null, options).then(({ filePath }) => {
        if (filePath && callback) {
            if (path.extname(filePath) != ".ply") {
                filePath += ".ply"
            }
            console.log("download file and save to ", filePath)
            let stream = fs.createWriteStream(filePath);
            stream.once('open', function (fd) {
                let streamer = stub.streamData(request)
                streamer.on('data', function (data) {
                    stream.write(data.file.data)
                    callback(streamer,Math.round(100*data.file.part_id/data.file.part_count))
                });
                streamer.on('end', function () {
                    stream.end();
                    callback(streamer,100)
                });
                streamer.on('error', function (e) {
                    stream.end();
                    callback(streamer,100,e)
                });
                streamer.on('status', function (status) {
                });
            });
        }
    });
}

global.selectFirmware = function (callback) {
    var options = {
        title: "Select Firmware",
        buttonLabel: "Select Firmware",
        filters: [
            { name: 'snap', extensions: ['snap'] },
        ]
    };
    dialog.showOpenDialog(null, options).then( result => {
        if (result.filePaths.length > 0) {
            callback(result.filePaths[0])
        }
    });
}

global.saveDeviceLogs= function (data) {
    var options = {
        title: "Save Device Logs",
        defaultPath: "logs.txt",
        buttonLabel: "Save",
        filters: [
            { name: 'txt', extensions: ['txt'] },
        ]
    };
    dialog.showSaveDialog(null, options).then(({ filePath }) => {
        if (filePath) {
            let stream = fs.createWriteStream(filePath);
            stream.once('open', function (fd) {
                stream.write(data)
                stream.end();
            });
        }
    });
}