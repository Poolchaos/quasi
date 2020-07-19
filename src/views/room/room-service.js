import { EventAggregator } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';

import ioClient from 'socket.io-client';

import { APP_CONFIG as config } from '../../resources/app-config.constants';

@inject(EventAggregator)
export class Room {

  iceConfig = {
    iceServers: [
      {
        urls: 'stun:' + config.TURN_SERVER_IP_ADDRESS + ':' + config.TURN_SERVER_PORT
      },
      {
        urls: 'turn:' + config.TURN_SERVER_IP_ADDRESS + ':' + config.TURN_SERVER_PORT,
        username: config.TURN_SERVER_USERNAME,
        credential: config.TURN_SERVER_PASSWORD
      }
    ]
  };
  peerConnections = {};
  currentId;
  roomId;
  stream;

  constructor(eventAggregator) {
    this.eventAggregator = eventAggregator;

    console.log(' ::>> connect ', { ioClient });
    // this.socket = ioClient(config.WEB_SOCKET_CONENCTION);
    this.socket = ioClient('http://localhost:5555');
    // this.socket = this.socket.connect(config.WEB_SOCKET_CONENCTION)
    this.socket.connect(),
    this.connected = false;
    this.addHandlers();
  }

  joinRoom(r) {
    console.log(' ::>> join room ', this.connected);
    if (!this.connected) {
      this.socket.emit('init', { room: r }, (roomid, id) => {
        this.currentId = id;
        this.roomId = roomid;
      });
      this.connected = true;
    }
  }

  createRoom(rn) {
    return new Promise(resolve => {
      console.log(' ::>> create room ', rn);
      this.socket.emit('init', null, (roomid, id) => {
        this.roomId = roomid;
        this.currentId = id;
        this.connected = true;
        resolve(roomid);
      });
    });
  }

  init(s) {
    this.stream = s;
  }

  addHandlers() {
    this.socket.on('connect', () => {
      console.log(' ::>> socket connected ');
    });
    this.socket.on('event', (data) => {
      console.log(' ::>> socket event ');
    });
    this.socket.on('disconnect', () => {
      console.log(' ::>> socket disconnected ');
    });

    this.socket.on('peer.connected', (params) => {
      console.log(' ::>> peer connected ', params.id);
      this.makeOffer(params.id);
    });
    this.socket.on('peer.disconnected', (data) => {
      console.log(' ::>> peer disconnected ');
      this.eventAggregator.publish('peer.disconnected', data);
    });
    this.socket.on('msg', (data) => {
      this.handleMessage(data);
    });
  }
  
  getPeerConnection(id) {
    if (this.peerConnections[id]) {
      return this.peerConnections[id];
    }
    var pc = new RTCPeerConnection(this.iceConfig);
    this.peerConnections[id] = pc;
    pc.addStream(this.stream);
    pc.onicecandidate = (evnt) => {
      this.socket.emit('msg', { by: this.currentId, to: id, ice: evnt.candidate, type: 'ice' });
    };
    pc.ontrack = (evnt) => {
      console.log('Received new stream', evnt.streams[0]);
      this.eventAggregator.publish('peer.stream', {
        id: id,
        stream: evnt.streams[0]
      });
    };
    return pc;
  }

  makeOffer(id) {
    console.log(' |||| make offer', id);
    var pc = this.getPeerConnection(id);
    pc.createOffer((sdp) => {
      pc.setLocalDescription(sdp);
      console.log('Creating an offer for', id);
      this.socket.emit('msg', { by: this.currentId, to: id, sdp: sdp, type: 'sdp-offer' });
    }, (e) => {
      console.log(e);
    },
    { mandatory: { OfferToReceiveVideo: true, OfferToReceiveAudio: true }});
  }

  handleMessage(data) {
    var pc = this.getPeerConnection(data.by);
    switch (data.type) {
      case 'sdp-offer':
        console.log(' |||| offer received ');
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
          console.log(' |||| remote description set. Creating answer ', { pc });
          console.log('Setting remote description by offer', { by: this.currentId, to: data.by, type: 'sdp-answer' });
          pc.createAnswer((sdp) => {
            console.log(' |||| answer created... sending ');
            pc.setLocalDescription(sdp);
            this.socket.emit('msg', { by: this.currentId, to: data.by, sdp: sdp, type: 'sdp-answer' });
          }, function(e) {
            console.error(e);
          });
        }, (e) => {
          console.error(e);
        });
        break;
      case 'sdp-answer':
        console.log(' |||| answer received ');
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
          console.log('Setting remote description by answer');
        }, (e) => {
          console.error(e);
        });
        break;
      case 'ice':
        if (data.ice) {
          console.log('Adding ice candidates');
          pc.addIceCandidate(new RTCIceCandidate(data.ice));
        }
        break;
    }
  }

  getRooms() {
    return new Promise(resolve => {
      this.socket.emit('connections', null, (rooms) => {
        resolve(rooms);
      });
    });
  }
}
