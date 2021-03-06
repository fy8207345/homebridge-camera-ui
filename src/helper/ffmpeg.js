'use strict';

const debug = require('debug')('CameraUIffmpeg');
const spawn = require('child_process').spawn;

class FfmpegProcess {
  constructor (api, name, sessionId, videoProcessor, command, log, debugg, delegate, callback) {

    debug('%s: Stream command: ' + videoProcessor + ' ' + command, name, debugg);
    
    let started = false;

    this.process = spawn(videoProcessor, command.split(/\s+/), { env: process.env });

    if (this.process.stdin) {
      this.process.stdin.on('error', error => {
        if (!error.message.includes('EPIPE')) {
          log(error.message, name);
        }
      });
    }
    
    if (this.process.stderr) {
      this.process.stderr.on('data', data => {
      
        if (!started) {
          started = true;
          if (callback) {
            callback();
          }
        }

        if (debugg) {
          data.toString().split(/\n/).forEach(line => {
            debug(line, name, debug);
          });
        }
        
      });
    }
    
    this.process.on('error', error => {
      log('%s: Failed to start stream: ' + error.message, name);
      if (callback) {
        callback(new Error('FFmpeg process creation failed'));
      }
      delegate.stopStream(sessionId);
    });
    
    this.process.on('exit', (code, signal) => {
      const message = 'ffmpeg exited with code: ' + code + ' and signal: ' + signal;

      if (code == null || code === 255) {
      
        if (this.process.killed) {
          debug(message + ' (Expected)', name);
        } else {
          log(message + ' (Unexpected)', name);
        }
        
      } else {
      
        log(message + ' (Error)', name);
        
        delegate.stopStream(sessionId);
        
        if (!started && callback) {
          callback(new Error(message));
        } else {
          delegate.controller.forceStopStreamingSession(sessionId);
        }
        
      }
      
    });

  }
  
  getStdin(){
  
    return this.process.stdin;
  
  }

  stop(){
     
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.socket.close();
    }
             
    this.process.kill('SIGKILL');
  
  }

}

module.exports = FfmpegProcess;