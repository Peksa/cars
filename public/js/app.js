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
  this.rotation = (Math.PI*2 + this.rotation) % (Math.PI*2);

  var dtop = this.speed*Math.sin(this.rotation);
  var dleft = this.speed*Math.cos(this.rotation);

  this.top += dtop;
  this.left += dleft;
};

Car.prototype.untick = function() {
  var dtop = this.speed*Math.sin(this.rotation);
  var dleft = this.speed*Math.cos(this.rotation);

  this.top -= dtop;
  this.left -= dleft;
};


Car.prototype.accelerate = function() {

  // If going backwards, brake instead.
  if (this.speed < 0) {
    this.speed += 0.2;
    return;
  }

  // AccelerationSpeed (how quickly the car accelerates)
  // depends on current speed. (Base 0.7, then slower and slower the
  // closer to max speed you are.
  var accelerationSpeed = (this.speed == 0) ? 0.7 : Math.max(0.7, 3.5-this.speed);

  var acc = Math.abs(0.2*accelerationSpeed);
  var newSpeed = this.speed += acc;

  // Capped speed
  if (newSpeed > 3.5) newSpeed = 3.5;

  this.speed = newSpeed;
};

Car.prototype.brakeOrReverse = function() {
  this.speed -= 0.4;
  if (this.speed < -2) {
    this.speed = -2;
  }
};

Car.prototype.idle = function() {
  if (this.speed > 0) {
    this.speed -= 0.12;
    if (this.speed < 0) {
      this.speed = 0;
    }
  } else if (this.speed < 0) {
    this.speed += 0.12;
    if (this.speed > 0) {
      this.speed = 0;
    }
  }
};

Car.prototype.turn = function(direction) {
  if (this.speed == 0) {
    return;
  }
  this.rotation += 0.11*direction*(this.speed/3.5);
};


function Game(canvas) {
  this.canvas = canvas;
  this.context = canvas.getContext("2d");
  this.camera = new Camera(0, 0);
  this.player = undefined;
  this.cars = {};
  this.pressedKeys = {};
  this.network = new Network();
  this.boundingBoxes = [];
  this.topLeftBoundingBoxes = [
    [91, 88, 31, 161],
    [216, 143, 54, 92],
    [270, 143, 75, 49],
    [357, 143, 176, 49],
    [533, 94, 32, 98],
    [575, 94, 119, 98],
    [158, 335, 107, 56],
    [223, 382, 102, 63],

  ];

  var w = 1600;
  var h = 1200;
  for (var i = 0; i < this.topLeftBoundingBoxes.length; i++) {
    var box = this.topLeftBoundingBoxes[i];
    this.boundingBoxes.push([box[0], box[1], box[2], box[3]]);
    this.boundingBoxes.push([box[0], h-box[3]-box[1], box[2], box[3]]);
    this.boundingBoxes.push([w-box[2]-box[0], box[1], box[2], box[3]]);
    this.boundingBoxes.push([w-box[2]-box[0], h-box[3]-box[1], box[2], box[3]]);
  }
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
    if (self.player) {
      self.moveCameraTowards(self.player.left, self.player.top);
    }
    self.drawBackground();
    self.renderCar(self.player);
    self.renderNetworkCars();
    self.drawTunnels();

    self.drawBoundingBoxes();

    window.requestAnimationFrame(renderGame);
  }());
};

Game.prototype.drawBoundingBoxes = function() {
  for (var i = 0; i < this.boundingBoxes.length; i++) {
    var box = this.boundingBoxes[i];
    this.drawRectangleCamera("yellow", box[0], box[1], box[2], box[3]);
  }
};

counter = 0;

setInterval(function() {
  //.log("Ticks in the last second: " + counter);
  counter = 0;
}, 1000);

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
    counter++;
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


Game.prototype.isCollidingWith = function(boxLeft, boxTop, boxWidth, boxHeight) {
  if (this.player) {
    var y = this.player.top;
    var x = this.player.left;
    var r = this.player.rotation;

    var optRadius = 15;
    var optMaxx = x+optRadius;
    var optMinx = x-optRadius;
    var optMaxy = y+optRadius;
    var optMiny = y-optRadius;

    if (boxLeft > optMaxx) {
      return false;
    } else if (boxLeft+boxWidth < optMinx) {
      return false;
    } else if (boxTop > optMaxy) {
      return false;
    } else if (boxTop+boxHeight < optMiny) {
      return false;
    }

    var ry = y+5*Math.sin(r+Math.PI/2);
    var rx = x+5*Math.cos(r+Math.PI/2);

    var ly = y+5*Math.sin(r-Math.PI/2);
    var lx = x+5*Math.cos(r-Math.PI/2);

    var sin = Math.sin(r);
    var cos = Math.cos(r);

    var ax = lx+10*cos;
    var ay = ly+10*sin;
    var bx = lx-9*cos;
    var by = ly-9*sin;
    var cx = rx+10*cos;
    var cy = ry+10*sin;
    var dx = rx-9*cos;
    var dy = ry-9*sin;

    var minx = Math.min(ax, bx, cx, dx);
    var miny = Math.min(ay, by, cy, dy);

    var maxx = Math.max(ax, bx, cx, dx);
    var maxy = Math.max(ay, by, cy, dy);

    if (boxLeft > maxx) {
      return false;
    } else if (boxLeft+boxWidth < minx) {
      return false;
    } else if (boxTop > maxy) {
      return false;
    } else if (boxTop+boxHeight < miny) {
      return false;
    }
    return true;

  }
  return false;
};

Game.prototype.tickCar = function(car) {
  car.tick();

  for (var i = 0; i < this.boundingBoxes.length; i++) {
    var box = this.boundingBoxes[i];
    if (this.isCollidingWith(box[0], box[1], box[2], box[3])) {

      car.untick();

      var quarter = (Math.PI*2 + car.rotation) % (Math.PI/2);
      if (quarter < Math.PI/4) {
        car.rotation -= quarter;
      } else {
        car.rotation += Math.PI/2-quarter;
      }
      car.rotation = (Math.PI*2 + car.rotation) % (Math.PI*2);

      car.tick();
      if (this.isCollidingWith(box[0], box[1], box[2], box[3])) {
        car.untick();

        car.speed = -car.speed;
      } else {
        car.speed -= 2;
        if (car.speed < 0) {
          car.speed = 0;
        }
      }
    }
  }
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
    this.player.accelerate()
  } else if (this.pressedKeys[83]) {
    this.player.brakeOrReverse();
  } else {
    this.player.idle();
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
  this.drawImageCamera("img/bg.jpg", 0, 0);
  this.drawImageCamera("img/bg2.jpg", 0, 600);
  this.drawImageCamera("img/bg3.jpg", 800, 0);
  this.drawImageCamera("img/bg4.jpg", 800, 600);
};

Game.prototype.drawTunnels = function() {
  this.drawImageCamera("img/tunnel1.gif", 271, 439);
  this.drawImageCamera("img/tunnel2.gif", 271, 646);
  this.drawImageCamera("img/tunnel3.gif", 1160, 439);
  this.drawImageCamera("img/tunnel4.gif", 1160, 646);
};

Game.prototype.drawRectangleCamera = function(color, left, top, width, height) {
  var cameraTop = this.camera.top;
  var cameraLeft = this.camera.left;
  this.context.beginPath();
  this.context.rect(left-cameraLeft, top-cameraTop, width, height);
  this.context.fillStyle = color;
  this.context.fill();
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

