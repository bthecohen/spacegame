(function () {
  var game = this;
  var now = 0;
  var last = timestamp();
  var dt = 0;
  var accumulator = 0;
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

   /**
   * Asset pre-loader object. Loads all images
   */
  var assetLoader = (function() {
    // images dictionary
    this.imgs        = {
      "bg1"            : "img/bglayer1.png",
      "bg2"            : "img/bglayer2.png",
      "playership"     : "img/playership.png",
      "playerbullet"   : "img/playerbullet.png"
    };
    var assetsLoaded = 0;                                // how many assets have been loaded
    var numImgs      = Object.keys(this.imgs).length;    // total number of image assets
    this.totalAssest = numImgs;                          // total number of assets
    /**
     * Ensure all assets are loaded before using them
     * @param {number} dic  – Dictionary name ('imgs')
     * @param {number} name – Asset name in the dictionary
     */
    function assetLoaded(dic, name) {
      // don’t count assets that have already loaded
      if (this[dic][name].status !== "loading" ) {
        return;
      }
      this[dic][name].status = "loaded";
      assetsLoaded++;
      // finished callback
      if (assetsLoaded === this.totalAssest && typeof this.finished === "function") {
        this.finished();
      }
    }
    /**
     * Create assets, set callback for asset loading, set asset source
     */
    this.downloadAll = function() {
      var self = this;
      var src;
      // load images
      for (var img in this.imgs) {
        if (this.imgs.hasOwnProperty(img)) {
          src = this.imgs[img];
          // create a closure for event binding
          (function(self, img) {
            self.imgs[img] = new Image();
            self.imgs[img].status = "loading";
            self.imgs[img].name = img;
            self.imgs[img].onload = function() { assetLoaded.call(self, "imgs", img) };
            self.imgs[img].src = src;
          })(self, img);
        }
      }
    }
    return {
      imgs: this.imgs,
      totalAssest: this.totalAssest,
      downloadAll: this.downloadAll
    };
  })();

  assetLoader.finished = function() {
    startGame();
  }

  var background = (function() {
    var layer1   = {};
    var layer2    = {};
    
    this.move = function(dt){
      // Pan background
      layer1.x -= layer1.speed * dt * 60/1000;
      layer2.x -= layer2.speed * dt * 60/1000;
      // If the image scrolled off the screen, reset
      if (layer1.x + assetLoader.imgs.bg1.width <= 0){
        layer1.x = 0;
      }
      if (layer2.x + assetLoader.imgs.bg2.width <= 0){
       layer2.x = 0;
      }
    }

    /**
     * Draw the backgrounds to the screen at different speeds
     */
    this.draw = function draw() {
      // draw images side by side to loop
      ctx.drawImage(assetLoader.imgs.bg1, layer1.x, layer1.y);
      ctx.drawImage(assetLoader.imgs.bg1, layer1.x + canvas.width, layer1.y);
      ctx.drawImage(assetLoader.imgs.bg2, layer2.x, layer2.y);
      ctx.drawImage(assetLoader.imgs.bg2, layer2.x + canvas.width, layer2.y);
    }
    /**
     * Reset background to zero
     */
    this.reset = function reset()  {
      layer1.x = 0;
      layer1.y = 0;
      layer1.speed = 2;
      layer2.x = 0;
      layer2.y = 0;
      layer2.speed = 5;
    }
    return {
      draw: this.draw,
      reset: this.reset,
      move: this.move
    };
  })(); // end background

  function GameElement() {
  }

  GameElement.prototype.init = function init (x, y, width, height, speed) {
    // Defualt variables
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
  }

  function Bullet(x, y, width, height, speed){
    this.visible = false;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;

  }
  Bullet.prototype = Object.create(GameElement.prototype);
  Bullet.prototype.draw = function draw() {
    if(this.visible=true){
      ctx.drawImage(assetLoader.imgs.playerbullet, this.x, this.y);
    }
  };
  Bullet.prototype.move = function move(dt) {
    this.x += this.speed * dt * 60/1000;
    if (this.x >= canvas.width) {
      return true;
    }
  }
  Bullet.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.visible = false;
  };
  Bullet.prototype.spawn = function spawn(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.visible = true;
  };


  function BulletPool(){
  }

  BulletPool.prototype.init = function init(size){
      this.pool = [];
      this.size = size;
      var bulletWidth = assetLoader.imgs.playerbullet.width;
      var bulletHeight = assetLoader.imgs.playerbullet.height;
      for (var i = 0; i < size; i++) {
        // Initalize the bullet object
        var bullet = new Bullet (0,0, bulletWidth,bulletHeight, 7);
        this.pool[i] = bullet;
    }
  };

  BulletPool.prototype.get = function get(x, y, speed){
    if(!this.pool[this.size - 1].visible) {
      this.pool[this.size - 1].spawn(x, y, speed);
      this.pool.unshift(this.pool.pop());
    }
  };
  BulletPool.prototype.animate = function animate(dt) {
    for (var i = 0; i < this.size; i++) {
      // Only draw until we find a bullet that is not alive
      if (this.pool[i].visible) {
        if (this.pool[i].move(dt)) {
          this.pool[i].clear();
          this.pool.push((this.pool.splice(i,1))[0]);
        }
      }
      else {
        break;
      }
    }
  };

  BulletPool.prototype.draw = function draw() {
    for (var i = 0; i<this.size; i++){
      if(this.pool[i].visible){
        this.pool[i].draw();
      }
    }
  }

  var ship = (function ship (ship){
      var fireRate = 10;
      var counter = 0;

      ship.makeBullets = function (){
        ship.bulletPool = Object.create(BulletPool.prototype);
        ship.bulletPool.init(30);
      };
      ship.draw = function() {
        ctx.drawImage(assetLoader.imgs.playership, ship.x, ship.y);
      };
      ship.move = function(dt) {
        counter++;
        // Determine if the action is move action
        if (KEY_STATUS.left || KEY_STATUS.right ||
          KEY_STATUS.down || KEY_STATUS.up) {
          // The ship moved, so erase its current image so it can
          // be redrawn in its new location
          // Update x and y according to the direction to move and
          // redraw the ship. Change the else ifs to if statements
          // to have diagonal movement.
          if (KEY_STATUS.left) {
            ship.x -= ship.speed * dt * 60/1000;
            if (ship.x <= 0){ // Keep player within the screen
              ship.x = 0;
            }
          } 
          if (KEY_STATUS.right) {
            ship.x += ship.speed * dt * 60/1000;
            if (ship.x >= canvas.width - ship.width){
              ship.x = canvas.width - ship.width;
            }
          } 
          if (KEY_STATUS.up) {
            ship.y -= ship.speed * dt * 60/1000;
            if (ship.y <= 0){
              ship.y = 0;
            }
          } 
          if (KEY_STATUS.down) {
            ship.y += ship.speed * dt * 60/1000;
            if (ship.y >= canvas.height - ship.height) {
              ship.y = canvas.height - ship.height;
            }
          }
        }
        if (KEY_STATUS.space && counter >= fireRate) {
          ship.fire();
          counter = 0;
        }
      };
     
      ship.fire = function() {
        ship.bulletPool.get(ship.x+ship.width, ship.y + ship.height * 5/8 + -1 , 7);
      };

      return ship;
  })(Object.create(GameElement.prototype));

  
  /**
   * Game loop
   */
  function animate() {
    requestAnimFrame( animate );
    now = timestamp();
    dt = now - last;
    last = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    accumulator += dt;
    while (accumulator >= dt) {
        ship.move(dt);
        background.move(dt);
        ship.bulletPool.animate(dt);
        accumulator -= dt;
    }
    background.draw();
    ship.draw();
    ship.bulletPool.draw();
  }

  function startGame() {
    background.reset();
    ship.init(
      0, 
      Math.floor(canvas.height/2 - assetLoader.imgs.playership.height/2), 
      assetLoader.imgs.playership.width, 
      assetLoader.imgs.playership.height,
      5
    )
    ship.makeBullets();
    ship.draw();
    animate();
  }

  
  /**
   * UTILITIES
   */
  // The keycodes that will be mapped when a user presses a button.
  // Original code by Doug McInnes https://github.com/dmcinnes/HTML5-Asteroids
  KEY_CODES = {
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
  }
  // Creates the array to hold the KEY_CODES and sets all their values
  // to false. Checking true/flase is the quickest way to check status
  // of a key press and which one was pressed when determining
  // when to move and which direction.
  KEY_STATUS = {};
  for (code in KEY_CODES) {
    KEY_STATUS[ KEY_CODES[ code ]] = false;
  }
  /**
   * Sets up the document to listen to onkeydown events (fired when
   * any key on the keyboard is pressed down). When a key is pressed,
   * it sets the appropriate direction to true to let us know which
   * key it was.
   */
  document.onkeydown = function(e) {
    // Firefox and opera use charCode instead of keyCode to
    // return which key was pressed.
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = true;
    }
  }
  /**
   * Sets up the document to listen to ownkeyup events (fired when
   * any key on the keyboard is released). When a key is released,
   * it sets teh appropriate direction to false to let us know which
   * key it was.
   */
  document.onkeyup = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
  }

  /**
   * Request Animation Polyfill
   */
  var requestAnimFrame = (function(){
    var fun = window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback, element){
                window.setTimeout(callback, 1000 / 60);
              };
      return fun;
  })();

  function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
  }

  assetLoader.downloadAll();

})();