const express = require('express');
const app = express();
const indexRouter = require('./routes/index');
const path = require('path');

const http = require('http');
const socketIO = require('socket.io');
const server = http.createServer(app);
const io = socketIO(server);

let waitingUser = [];

io.on("connection", function(socket) {
    socket.on("joinroom", function() {
        if (waitingUser.length > 0) {
            let partner = waitingUser.shift(); // Get the waiting user
            const roomName = `${socket.id}-${partner.id}`; // Generate a room name

            // Make both users join the room
            socket.join(roomName);
            partner.join(roomName);

            // Notify both clients that they've joined the room and send the room name
            io.to(roomName).emit("joined", roomName);

        } else {
            waitingUser.push(socket); // Add the current socket to the waiting list
        }
    });
    socket.on("signalingMessage", function(data) {
        socket.broadcast.to(data.room).emit("signalingMessage", data.message);
    })

    socket.on("sendMessage", function(message, room) {
        socket.broadcast.to(room).emit("message", message);
    });
    socket.on("startVideoCall", function({room}){
        socket.broadcast.to(room).emit("incomingCall");
    });
    socket.on("accept-call", function({room}){
        console.log("Hey");
        socket.broadcast.to(room).emit("callAccepted");
    });
    socket.on("reject-call", function({room}){
        socket.broadcast.to(room).emit("callRejected");
    });
    
    socket.on("disconnect", function() {
        let index = waitingUser.findIndex(
            (waitingUser) => waitingUser.id === socket.id
        );
        if (index !== -1) {
            waitingUser.splice(index, 1);
        }
    });
});

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
