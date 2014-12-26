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

function Car(top, left) {
  this.top = top;
  this.left = left;
  this.speed = 0;
  this.rotation = 0;
}

Car.prototype.tick = function() {
  var dtop = this.speed*Math.sin(this.rotation);
  var dleft = this.speed*Math.cos(this.rotation);

  this.top += dtop;
  this.left += dleft;
};

Car.prototype.changeSpeed = function(factor) {
  var newSpeed = this.speed += 0.2*factor;
  if (newSpeed > 3) newSpeed = 3;
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
  this.player = new Car(500, 670);
  this.pressedKeys = {};
}

Game.prototype.init = function() {
  this.resizeToFullScreen();
  this.setCamera(0, 0);
  this.renderLoop();
  this.drawBackground();
  this.setupKeyboardListeners();
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
    //self.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    self.drawBackground();
    self.checkPlayerControls();
    self.player.tick();
    self.renderCar(self.player);
    self.moveCameraTowards(self.player.left, self.player.top);
    window.requestAnimationFrame(renderGame);
  }());
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
    this.player.changeSpeed(-1);
  } else {
    this.player.changeSpeed(-0.5);
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
  var maxTop = 1200 - window.innerHeight
  var maxLeft = 1600 - window.innerWidth;
  var newTop = (top > 0 && top > maxTop) ? maxTop : top;
  var newLeft = (left > 0 && left > maxLeft) ? maxLeft : left;
  newTop = newTop < 0 ? 0 : newTop;
  newLeft = newLeft < 0 ? 0 : newLeft;
  this.camera.top = newTop;
  this.camera.left = newLeft;
};

Game.prototype.renderCar = function(car) {
  this.drawCircleCamera("#ff0000", 7, car.left, car.top);
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