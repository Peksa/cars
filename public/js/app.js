function Camera(left, top) {
  this.top = top;
  this.left = left;
}

Camera.prototype.getCenter = function() {
  var ret = {};
  var halfWidth = window.innerWidth/2;
  var halfHeight = window.innerHeight/2;
  ret.left = this.left + halfWidth;
  ret.top = this.top + halfHeight;
  return ret;
};

function Car(top, left, color, id) {
  this.top = top;
  this.left = left;
  this.speed = 0;
  this.rotation = 0;
  this.color = color;
  this.id = id;
}

Car.prototype.tick = function() {
  var dtop = this.speed*Math.sin(this.rotation);
  var dleft = this.speed*Math.cos(this.rotation);

  this.top += dtop;
  this.left += dleft;
};

Car.prototype.changeSpeed = function(factor) {

  var speed = (this.speed == 0) ? 0.7 : Math.max(0.7, 3.5-this.speed);
  if (factor < 0) {
    speed = -1;
  }

  var acc = 0.1*factor*Math.abs(speed);

  var newSpeed = this.speed += acc;
  if (newSpeed > 3.5) newSpeed = 3.5;
  if (newSpeed < 0) newSpeed = 0;

  this.speed = newSpeed;
};

Car.prototype.turn = function(direction) {
  this.rotation += 0.1*direction;
};


function Game(canvas) {
  this.canvas = canvas;
  this.context = canvas.getContext("2d");
  this.camera = new Camera(0, 0);
  this.player = undefined;
  this.cars = {};
  this.pressedKeys = {};
  this.network = new Network();
}

Game.prototype.init = function() {
  this.resizeToFullScreen();
  this.setCamera(0, 0);
  this.renderLoop();
  this.drawBackground();
  this.setupKeyboardListeners();
  this.gameLoop();
  this.network.connect();
};

Game.prototype.setupKeyboardListeners = function() {
  var self = this;
  document.onkeydown = function(e) {
    e = e || window.event;
    self.pressedKeys[e.keyCode] = true;
  };
  document.onkeyup = function(e) {
    e = e || window.event;
    delete self.pressedKeys[e.keyCode];
  };
};

Game.prototype.renderLoop = function() {
  var self = this;
  (function renderGame() {
    self.drawBackground();
    self.renderCar(self.player);
    self.renderNetworkCars();
    if (self.player) {
      self.moveCameraTowards(self.player.left, self.player.top);
    }
    window.requestAnimationFrame(renderGame);
  }());
};

Game.prototype.gameLoop = function() {
  var self = this;
  var tickGame = function() {
    self.updatePlayer();
    self.updateNetworkCars();
    if (self.player) {
      self.checkPlayerControls();
      self.tickCar(self.player);
      self.sendPlayerCar();
    }
    self.tickNetworkCars();
  };
  setInterval(tickGame, 16);
};

Game.prototype.updatePlayer = function() {
  if (!this.network.player) {
    return;
  }
  var car = this.player;
  if (!car) {
    car = new Car();
    this.updateCar(car, this.network.player);
    this.player = car;
  }
};

Game.prototype.updateNetworkCars = function() {
  if (!this.network.cars || this.network.cars.length == 0) {
    return;
  }
  for (var i in this.network.cars) {
    var networkCar = this.network.cars[i];
    var car = this.cars[networkCar.id];
    if (!car) {
      car = new Car();
      this.cars[networkCar.id] = car;
    }
    this.updateCar(car, networkCar);
  }
};

Game.prototype.updateCar = function(oldCar, newCar) {
  oldCar.left = newCar.left;
  oldCar.top = newCar.top;
  oldCar.rotation = newCar.rotation;
  oldCar.speed = newCar.speed;
  oldCar.id = newCar.id;
  oldCar.color = newCar.color;
};

Game.prototype.sendPlayerCar = function() {
  this.network.send(this.player);
};

Game.prototype.tickCar = function(car) {
  car.tick();
};

Game.prototype.tickNetworkCars = function() {
  for (var i in this.cars) {
    this.tickCar(this.cars[i]);
  }
};

Game.prototype.moveCameraTowards = function(left, top) {
  var center = this.camera.getCenter();
  var dtop = center.top - top;
  var dleft = center.left - left;
  var newTop = center.top - Math.round(dtop/20);
  var newLeft = center.left - Math.round(dleft/20);
  this.centerCameraAround(newLeft, newTop);
};

Game.prototype.checkPlayerControls = function() {
  if (this.pressedKeys[87]) {
    this.player.changeSpeed(1);
  } else if (this.pressedKeys[83]) {
    this.player.changeSpeed(-2);
  } else {
    this.player.changeSpeed(-0.8);
  }

  if (this.pressedKeys[65] && !this.pressedKeys[68]) {
    this.player.turn(-1);
  } else if (this.pressedKeys[68] && !this.pressedKeys[65]) {
    this.player.turn(1);
  }
};

Game.prototype.resizeToFullScreen = function() {
  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;
};

Game.prototype.centerCameraAround = function(left, top) {
  var halfWidth = window.innerWidth/2;
  var halfHeight = window.innerHeight/2;
  this.setCamera(left-halfWidth, top-halfHeight);
};

Game.prototype.setCamera = function(left, top) {
  var maxTop = 1200 - window.innerHeight;
  var maxLeft = 1600 - window.innerWidth;
  var newTop = (top > 0 && top > maxTop) ? maxTop : top;
  var newLeft = (left > 0 && left > maxLeft) ? maxLeft : left;
  newTop = newTop < 0 ? 0 : newTop;
  newLeft = newLeft < 0 ? 0 : newLeft;
  this.camera.top = newTop;
  this.camera.left = newLeft;
};

Game.prototype.renderCar = function(car) {
  if (!car) {
    return;
  }
  var self = this;
  var img = new Image();
  img.onload = function() {
    self.context.save();
    self.context.translate(car.left-self.camera.left, car.top-self.camera.top);
    self.context.rotate(car.rotation);
    self.context.translate(-25/2,-15/2);
    self.context.drawImage(img,0,0);
    self.context.restore();
  };
  img.src = "img/car1.png";

};

Game.prototype.renderNetworkCars = function() {
  for (var i in this.cars) {
    var car = this.cars[i];
    this.renderCar(car);
  }
};

Game.prototype.drawCircleCamera = function(color, radius, left, top) {
  var cameraTop = this.camera.top;
  var cameraLeft = this.camera.left;
  this.drawCircleRaw(color, radius, left-cameraLeft, top-cameraTop);
};

Game.prototype.drawCircleRaw = function(color, radius, left, top) {
  this.context.beginPath();
  this.context.arc(left, top, radius, 0, 2 * Math.PI, false);
  this.context.fillStyle = color;
  this.context.fill();
  this.context.lineWidth = 1;
  this.context.strokeStyle = 'black';
  this.context.stroke();
};

Game.prototype.drawBackground = function() {
  this.drawImageCamera("img/bg.jpg", 0, -0);
  this.drawImageCamera("img/bg2.jpg", 0, 600);
  this.drawImageCamera("img/bg3.jpg", 800, 0);
  this.drawImageCamera("img/bg4.jpg", 800, 600);
};

Game.prototype.drawImageCamera = function(url, left, top) {
  var cameraTop = this.camera.top;
  var cameraLeft = this.camera.left;
  this.drawImageRaw(url, left-cameraLeft, top-cameraTop);
};

Game.prototype.drawImageRaw = function(url, left, top) {
  var self = this;
  var img = new Image();
  img.onload = function() {
    self.context.drawImage(img, left, top);
  };
  img.src = url;
};

function Network() {
  this.socket = undefined;
  this.lastTick = undefined;
  this.player = undefined;
}

Network.prototype.connect = function() {
  this.socket = new WebSocket("ws://" + window.location.hostname + ":9009/api/socket");
  this.socket.onmessage = this.messageHandler.bind(this);
};

Network.prototype.messageHandler = function(event) {
  var data = JSON.parse(event.data);
  switch(data.type) {
    case "tick":
      this.lastTick = data;
      this.cars = data.cars;
      this.player = data.player;
      break;

    case "join":
      this.player = data.player;
      break;
  }
};

Network.prototype.send = function(obj) {
  this.socket.send(JSON.stringify(obj));
};

