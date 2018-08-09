const Peer = require('simple-peer');

function main(initiator) {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    }).then(stream => {
        const config = {
            initiator: initiator,
            trickle: false,
            stream: stream
        };
        console.log(config);
        const peer = new Peer(config);

        peer.on('signal', data => {
            document.getElementById('yourId').value = JSON.stringify(data);
        });

        peer.on('data', data => {
            document.getElementById('messages').textContent += data + '\n';
        });

        peer.on('stream', stream => {
            let video = document.createElement('video');
            document.body.appendChild(video);
            video.srcObject = stream;
            video.play();
        });

        document.getElementById('connect').addEventListener('click', () => {
            let otherId = document.getElementById('otherId').value;
            otherId = JSON.parse(otherId);
            peer.signal(otherId);
        });

        document.getElementById('send').addEventListener('click', () => {
            let yourMessage = document.getElementById('yourMessage').value;
            peer.send(yourMessage);
        });
    }).catch(error => console.log(error));
}

document.getElementById('start').addEventListener('click', () => {
    main(true);
});

document.getElementById('peer').addEventListener('click', () => {
    main(false);
});