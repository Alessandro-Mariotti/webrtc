(function() {
    'use strict';

    const video = document.querySelector('video#local-video');
    video.addEventListener('canplay', () => {
        video.play();
    }, false);

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    }).then(stream => {
        video.srcObject = stream;
    }).catch(error => console.log(error));

    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel('my-channel', )
})();