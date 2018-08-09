let localVideo;
let remoteVideo;
let peerConnection;
let peerConnectionConfig = {
    iceServers: [{ 'url': 'stun:stun.services.mozilla.com' }, { 'url': 'stun:stun.l.google.com:19302' }]
};
let serverConnection;
let localStream;

function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    if (isCaller) {
        peerConnection.createOffer(gotDescription, createOfferError);
    }
}

function gotDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description, function() {
        serverConnection.send(JSON.stringify({ 'sdp': description }));
    }, function() { console.log('set description error') });
}

function gotIceCandidate(event) {
    if (event.candidate != null) {
        serverConnection.send(JSON.stringify({ 'ice': event.candidate }));
    }
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.srcObject = event.stream;
}

function createOfferError(error) {
    console.log(error);
}

function gotMessageFromServer(message) {
    if (!peerConnection) start(false);

    var signal = JSON.parse(message.data);
    if (signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
            if (signal.sdp.type == 'offer') {
                peerConnection.createAnswer(gotDescription, createAnswerError);
            }
        });
    } else if (signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    }
}

function pageReady() {
    localVideo = document.getElementById('local-video');
    remoteVideo = document.getElementById('remote-video');

    serverConnection = new WebSocket('ws://192.168.10.56:8080');
    serverConnection.onmessage = gotMessageFromServer;

    var constraints = {
        video: true,
        audio: true,
    };

    navigator.mediaDevices.getUserMedia(constraints, stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    }, error => console.warn(error));
}

pageReady();