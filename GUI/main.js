'use strict';

const {app, BrowserWindow, ipcMain} = require('electron') 
const url = require('url') 
const path = require('path')  
const dgram = require('dgram');

let win = null;

function createWindow() { 
   win = new BrowserWindow({width: 600, height: 600}) 
   
   win.loadURL(url.format ({ 
      pathname: path.join(__dirname, './app/index.html'), 
      protocol: 'file:', 
      slashes: true 
   })) ;

   win.on('closed', () => {
       win = null;
       if( client ) client.close();
   });
}  

app.on('ready', createWindow);

const client = dgram.createSocket('udp4');

client.on('error', (err) => {
  console.log(`client error:\n${err.stack}`);
  if( client ) client.close();
});

client.on('message', (msg, rinfo) => {
  var inputType = msg.toString("utf-8", 0, 4);
  if( inputType === "INP1"){
    let radarData = { 
      inputType : inputType
      , angle : msg.readInt32LE(5)
      , radius : msg.readInt32LE(9) 
    };

    if( win != null ) win.webContents.send('message', radarData);
  }
  else{
    let targetData = { 
      inputType : inputType
      , targetX : msg.readInt32LE(5)
      , targetY : msg.readInt32LE(9) 
      , angle : msg.readInt32LE(13)
      , index : msg.readInt32LE(17)
    };
    
    if( win != null ) win.webContents.send('message', targetData);
  }
  
});

client.on('listening', () => {
  console.log(`server listening `);
});

ipcMain.on('closewindow', (event, arg) => {    
    console.log('closewindow');
    if( client ) client.close();
});


client.bind(8888);
