export class VideoStream {

  async get(){
    console.log(' ::>> get called');
    // width: { ideal: 4096 },
    // height: { ideal: 2160 }
    let cameraMode = 'user';
    let constraints = {
      audio: true,
      video: true
    }

    return new Promise((resolve, reject) => {
      

      navigator.getWebcam = (navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
      if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
              resolve(stream);
            }).catch(e => {
              console.error(e.name + ": " + e.message);
              reject(); 
            });
      }
      else {
        navigator.getWebcam({ audio: true, video: true },
          (stream) => {
            resolve(stream);
          },
          () => {
            console.error("Web cam is not accessible.");
            reject();
          }
        );
      }
    });
  }
}
