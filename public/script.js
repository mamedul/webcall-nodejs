const PORT = 3000;
const HOST = 'localhost';
const SECURED = false;

const ws = new WebSocket( ( SECURED ? 'wss' : 'ws' ) + '://' + HOST + ':' + PORT );

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
localVideo.muted = true; // muted local video
remoteVideo.muted = false; // muted local video

const iceConfiguration = {
    iceServers: [
        //{ urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credentials: 'openrelayproject' },
        { urls: 'turns:freestun.tel:5350', username: 'free', credential: 'free' },
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
        },
        {
            url: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
        },
        { urls: 'stun:freestun.net:5350' },
        { urls: 'stun:stun.l.google.com:19302' }
    ]
}
let peerConnection = null;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;

        // Create an RTCPeerConnection
        peerConnection = new RTCPeerConnection(iceConfiguration);

        // Add the local stream to the RTCPeerConnection
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        // Handle incoming messages from the signaling server
        ws.addEventListener('message', event => {
            //console.log(event.data);
            //const message = JSON.parse(event.data);
            if (event.data instanceof Blob) {
                // Handle Blob data using FileReader
                const reader = new FileReader();
                reader.onload = function() {
                    // Handle the reader.result, which contains the Blob data as text or binary
                    const blobData = reader.result;
                    //console.log('Received Blob data:', blobData);
                    try {
                        const message = JSON.parse(blobData); console.log(message);
                        handleMessage(message);
                        // Handle JSON messages
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        // Handle other types of messages as needed
                    }
                };
                reader.readAsText(event.data); // Read the Blob data as text
                // Or use reader.readAsArrayBuffer(event.data); for binary data
            } else {
                // Handle other types of messages (JSON, text, etc.)
                try {
                    const message = JSON.parse(event.data); console.log(message);
                    handleMessage(message);
                    // Handle JSON messages
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    // Handle other types of messages as needed
                }
            }

        });

        // Create and send an offer to the remote peer
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                ws.send(JSON.stringify(peerConnection.localDescription));
            })
            .catch(error => {
                console.error('Error creating offer:', error);
            });

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                // Send the ICE candidate to the remote peer
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate
                }));
                console.log('Sent ICE candidate:', event.candidate);
            }
        };

        // Handle remote stream when it arrives
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

    })
    .catch(error => {
        console.error('Error accessing media devices:', error);
    });


function handleMessage(message) {
    if (message.type === 'offer') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        peerConnection.createAnswer()
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                ws.send(JSON.stringify(peerConnection.localDescription));
            });
    } else if (message.type === 'answer') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'ice-candidate') {
        //peerConnection.addIceCandidate(new RTCIceCandidate(message));
        try {
            const iceCandidate = new RTCIceCandidate({
                candidate: message.candidate.candidate,
                sdpMid: message.candidate.sdpMid,
                sdpMLineIndex: message.candidate.sdpMLineIndex,
                usernameFragment: message.candidate.usernameFragment
            });

            peerConnection.addIceCandidate(iceCandidate)
                .then(() => {
                    console.log('Added ICE candidate successfully.');
                })
                .catch(error => {
                    console.error('Error adding ICE candidate:', error);
                });
        } catch (error) {
            console.error('Error constructing ICE candidate:', error);
        }
    }
}