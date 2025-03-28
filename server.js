const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let flippedCards = [];
let matchedPairs = 0;

// Lista de imágenes (coloca las imágenes en la carpeta /public/img/)
let images = [
    'img/img1.jpg', 'img/img1.jpg', 'img/img2.png', 'img/img2.png',
    'img/img3.jpg', 'img/img3.jpg', 'img/img4.jpg', 'img/img4.jpg',
    'img/img5.jpg', 'img/img5.jpg', 'img/img6.jpg', 'img/img6.jpg',
    'img/img7.jpg', 'img/img7.jpg', 'img/img8.jpg', 'img/img8.jpg'
];

images = shuffle(images);

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

wss.on('connection', function connection(ws) {
    let playerId = `Jugador-${Math.floor(Math.random() * 1000)}`;
    players[playerId] = { ws, score: 0 };

    ws.send(JSON.stringify({ type: 'init', playerId, images }));

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        if (data.type === 'flip') {
            if (flippedCards.length < 2) {
                flippedCards.push({ index: data.index, playerId });
                broadcast({ type: 'flip', index: data.index, image: images[data.index] });
                if (flippedCards.length === 2) {
                    setTimeout(checkMatch, 1000);
                }
            }
        }
    });

    ws.on('close', () => {
        delete players[playerId];
    });
});

function checkMatch() {
    if (flippedCards[0].index !== flippedCards[1].index &&
        images[flippedCards[0].index] === images[flippedCards[1].index]) {
        players[flippedCards[0].playerId].score += 1;
        broadcast({
            type: 'match',
            playerId: flippedCards[0].playerId,
            score: players[flippedCards[0].playerId].score,
            indexes: [flippedCards[0].index, flippedCards[1].index]
        });
        matchedPairs++;
        if (matchedPairs === images.length / 2) {
            broadcast({ type: 'gameOver' });
        }
    } else {
        broadcast({ type: 'unflip', indexes: [flippedCards[0].index, flippedCards[1].index] });
    }
    flippedCards = [];
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(8080, () => {
    console.log('Servidor ejecutándose en http://localhost:8080');
});
