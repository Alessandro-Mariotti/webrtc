(function() {
    'use strict';

    const WebSocket = require('ws');
    const ws = new WebSocket('ws://192.168.10.56:8080');

    let isChannelReady = false;
    let isInitiator = false;
    let isStarted = false;
    let localStream;
    let pc;
    let remoteStream;
    let turnReady;

    const pcConfig = {
        iceServers: [{
            urls: 'stun:stun.l.google.com:19302'
        }]
    };

    const sdpConstraints = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    };

    function sendMessage(message) {
        console.log('Client Sending message: ', message);
        ws.send(message);
    }

    function handleIceCandidate(event) {
        console.log('icecandidate event: ', event);
        if (event.candidate) {
            sendMessage(JSON.stringify({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }));
        } else {
            console.log('End of candidates.');
        }
    }

    function handleRemoteStreamAdded(event) {
        console.log('Remote stream added.');
        remoteStream = event.stream;
        remoteVideo.srcObject = remoteStream;
    }

    function handleRemoteStreamRemoved(event) {
        console.log('Remote stream removed. Event: ', event);
    }

    function createPeerConnection() {
        try {
            pc = new RTCPeerConnection(null);
            pc.onicecandidate = handleIceCandidate;
            pc.onaddstream = handleRemoteStreamAdded;
            pc.onremovestream = handleRemoteStreamRemoved;
            console.log('Created RTCPeerConnection');
        } catch (e) {
            console.log('Failed to create PeerConnection, exception: ', e.message);
            return;
        }
    }

    function setLocalAndSendMessage(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        sendMessage(JSON.stringify(sessionDescription));
    }

    function handleCreateOfferError(event) {
        console.log('createOffer() error: ', event);
    }

    function doCall() {
        console.log('Sending offer to peer');
        pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    }

    function maybeStart() {
        console.log('maybeStart() - ', isStarted, localStream, isChannelReady);
        if (!isStarted && typeof localStream !== undefined && isChannelReady) {
            console.log('Creating peer connection');
            createPeerConnection();
            pc.addStream(localStream);
            isStarted = true;
            console.log('isInitiator: ', isInitiator);
            if (isInitiator) {
                doCall();
            }
        }
    }

    function onCreateSessionDescriptionError(error) {
        console.warn('Failed to create session description: ', error.toString());
    }

    function doAnswer() {
        console.log('Sending answer to peer.');
        pc.createAnswer().then(setLocalAndSendMessage).catch(onCreateSessionDescriptionError);
    }

    function hangup() {
        console.log('Hanging up');
        stop();
        sendMessage('bye');
    }

    function stop() {
        isStarted = false;
        pc.close();
        pc = null;
    }

    function handleRemoteHangup() {
        console.log('Session terminated');
        stop();
        isInitiator = false;
    }

    ws.on('open', () => console.log('Connected to Server'));
    ws.on('message', message => {

        console.log('Client received message: ', message);

        if (message === 'initiator') {
            isInitiator = true;
            console.log(`Initiator: ${isInitiator ? 'Initiator' : 'Not initiator'}`);
        } else if (message === 'join') {
            isChannelReady = true;
            console.log(`channel ready: ${isChannelReady ? 'Channel Ready' : 'Channel not ready'}`);
        } else if (message === 'got user media') {
            console.log('Got User Media');
            maybeStart();
        } else if (message === 'bye') {
            console.log('Bye');
            if (!isStarted) {
                return;
            }
            handleRemoteHangup();
        } else {
            message = JSON.parse(message);
            console.log(message);
            if (message.type === 'offer') {
                if (!isInitiator && !isStarted) {
                    maybeStart();
                }
                pc.setRemoteDescription(new RTCSessionDescription(message));
                doAnswer();
                return;
            }
            if (message.type === 'answer' && isStarted) {
                pc.setRemoteDescription(new RTCSessionDescription(message));
                return;
            }
            if (message.type === 'candidate' && isStarted) {
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                pc.addIceCandidate(candidate);
                return;
            }
        }
    });

    let localVideo = document.querySelector('#local-video');
    let remoteVideo = document.querySelector('#remote-video');

    function gotStream(stream) {
        console.log('Adding local stream.');
        localStream = stream;
        localVideo.srcObject = stream;
        sendMessage('got user media');
        if (isInitiator) {
            maybeStart();
        }
    }

    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    }).then(gotStream).catch(e => console.warn('getUserMedia() error: ', e.name));

    const constraints = {
        video: true
    };

    console.log('Getting user media with constraints', constraints);

    function requestTurn(turnURL) {
        let turnExists = false;
        for (let i in pcConfig.iceServers) {
            if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
                turnExists = true;
                turnReady = true;
                break;
            }
        }
        if (!turnExists) {
            console.log('Getting TURN server from ', turnURL);
            let xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    let turnServer = JSON.parse(xhr.responseText);
                    console.log('Got TURN Server: ', turnServer);
                    pcConfig.iceServers.push({
                        urls: `turn:${turnServer.username}@${turnServer.turn}`,
                        credential: turnServer.password
                    });
                    turnReady = true;
                }
            };
            xhr.open('GET', turnURL, true);
            xhr.send();
        }
    }

    if (location.hostname !== 'localhost') {
        requestTurn('https://stun.l.google.com:19302');
    }

    window.onbeforeunload = function() {
        sendMessage('bye');
    };


})();