var isNode = require('is-node');
var queue;
var socket;
var isOpen;

module.exports = {
  send: send,
  subscribe: subscribe,
  close: close,
  reset: reset
};

function reset () {
  if (isNode) return;
  if (socket) close();

  console.log('creating socket');

  queue = [];
  socket = new WebSocket("ws://localhost:8080");
  socket.onopen = open;
  isOpen = false;
}

function open () {
  isOpen = true;

  var i = -1;
  var len = queue.length;
  while (++i < len) {
    socket.send(queue[i]);
  }

  queue = undefined;
}

function close (callback) {
  if (callback) {
    socket.onclose = callback;
    return;
  }

  console.log('closing the socket');
  socket.close();
}

function send (msg) {
  if (!isOpen) {
    queue.push(msg);
    return;
  }

  socket.send(msg);
}

function subscribe (fn) {
  socket.onmessage = fn;
}
