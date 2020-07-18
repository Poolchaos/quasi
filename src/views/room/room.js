import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';

import { Room } from './room-service';
import { VideoStream } from '../../resources/video-stream';

@inject(Router, EventAggregator, VideoStream, Room)
export class RoomVM {
  roomName;
  error;
  peers = [];
  localStream;
  roomId;

  constructor(router, eventAggregator, videoStream, service) {
    this.router = router;
    this.eventAggregator = eventAggregator;
    this.videoStream = videoStream;
    this.service = service;
  }

  activate(params) { 
    this.roomId = params.id;
    if (params.id) {
      window.clearInterval(this.interval);
      this.setupRoom();
    } else {
      this.getRooms();
    }
  }

  getRooms() {
    console.log(' ::>> getting rooms ');

    this.interval = setInterval(() => {
      this.service.getRooms().then(rooms => {
        this.rooms = rooms;
      })
    }, 500);
  }
  
  setupRoom() {
    console.log(' ::>> room page loaded ');
    if (!window.RTCPeerConnection || !navigator.mediaDevices.getUserMedia) {
      this.error = 'WebRTC is not supported by your browser. You can try the app with Chrome and Firefox.';
      return;
    }

    this.videoStream.get().then((s) => {
      console.log(' ::>> got stream ', s);
        this.localStream = s;
        document.querySelector('#localVideo').srcObject = s;
        this.service.init(s);

        if (!this.roomId) {
          console.log(' ::>> service = ', { service: this.service });
          this.service.createRoom()
            .then((_roomId) => {
              this.router.navigate('room/' + _roomId);
            });
        } else {
          this.service.joinRoom(this.roomId);
        }
      }).catch((e) => {
        this.error = 'No audio/video permissions. Please refresh your browser and allow the audio/video capturing.';
        console.error(e);
      });

    this.eventAggregator.subscribe('peer.stream', (peer) => {
      console.log('Client connected, adding new stream', peer);

      let wrapper = document.querySelector('#video-wrapper');
      let video = wrapper.querySelector('#video-' + peer.id);

      if (video) {
        video.srcObject = peer.stream;
      } else {
        let videoEl = document.createElement('video');
        videoEl.setAttribute('id', 'video-' + peer.id);
        videoEl.setAttribute('autoplay', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.srcObject = peer.stream;

        wrapper.appendChild(videoEl);
      }

      this.peers.push({
        id: peer.id,
        stream: peer.stream
      });
    });
    this.eventAggregator.subscribe('peer.disconnected', (peer) => {
      console.log('Client disconnected, removing stream');
      this.peers = this.peers.filter((p) => {
        return p.id !== peer.id;
      });
    });
  }

  joinRoom(id) {
    this.router.navigate('room/' + id);
  }
}
