(function ($) {
  var game = this;
  var now = 0;
  var last = timestamp();
  var dt = 0;
  var accumulator = 0;
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var stop = false;
  var debug = false; //draw bounding boxes
   /**
   * Asset pre-loader object. Loads all images
   */
  var assetLoader = (function() {
    // images dictionary
    this.imgs        = {
      "bg1"            : "img/bglayer1.png",
      "bg2"            : "img/bglayer2.png",
      "bg3"            : "img/bglayer3.png",
      "playership"     : "img/playership.png",
      "playerbullet"   : "img/playerbullet.png",
      "asteroid1"      : "img/asteroid1.png",
      "asteroid2"      : "img/asteroid2.png",
      "asteroid3"      : "img/asteroid3.png",
      "asteroid4"      : "img/asteroid4.png",
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
    var layer2   = {};
    var layer3   = {};
    
    this.move = function(dt){
      // Pan background
      layer1.x -= layer1.speed * dt * 60/1000;
      layer2.x -= layer2.speed * dt * 60/1000;
      layer3.x -= layer3.speed * dt * 60/1000;
      // If the image scrolled off the screen, reset
      if (layer1.x + assetLoader.imgs.bg1.width <= 0){
        layer1.x = 0;
      }
      if (layer2.x + assetLoader.imgs.bg2.width <= 0){
       layer2.x = 0;
      }
      if (layer3.x + assetLoader.imgs.bg3.width <= 0){
       layer3.x = 0;
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
      ctx.drawImage(assetLoader.imgs.bg3, layer3.x, layer3.y);
      ctx.drawImage(assetLoader.imgs.bg3, layer3.x + canvas.width, layer3.y);
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
      layer2.speed = 3;
      layer3.x = 0;
      layer3.y = 0;
      layer3.speed = 5;
    }
    return {
      draw: this.draw,
      reset: this.reset,
      move: this.move
    };
  })(); // end background

  function GameElement() {
    
  }
   GameElement.prototype.spawn = function spawn(x, y, speed) {
    this.load();
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.visible = true;
    this.box = {x: this.x, y: this.y, width: this.width, height: this.height};
  };


  GameElement.prototype.draw = function draw() {
    if(this.visible=true){
      if(this.rspeed){
        // save the context's co-ordinate system before 
        // we screw with it
        ctx.save(); 
 
        // move the origin to where we want to draw   
        ctx.translate(this.x, this.y); 
         
        // now move across and down half the 
        // width and height of the image
        ctx.translate(this.width/2, this.height/2); 
         
        // rotate around this point
        ctx.rotate(this.rot); 
         
        // then draw the image back and up
        ctx.drawImage(this.img, -this.width/2, -this.height/2); 
         
        // and restore the co-ordinate system to its default
        // top left origin with no rotation
        ctx.restore();
      } else {
        ctx.drawImage(this.img, this.x, this.y);
      }
      if(debug){
        ctx.beginPath();
        ctx.rect(this.box.x,this.box.y,this.box.width,this.box.height);
        ctx.strokeStyle="red";
        ctx.stroke();      
      }
    }
  };

  GameElement.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.visible = false;
  };

  function PlayerBullet(){
  }
  PlayerBullet.prototype = Object.create(GameElement.prototype);
  PlayerBullet.prototype.move = function move(dt) {
    this.x += this.speed * dt * 60/1000;
    this.box = {x: this.x, y: this.y, width: this.width, height: this.height};
    if (this.x >= canvas.width) {
      return true;
    } else if (this.detectCollisions()) {
      return true;
    }
  }
  PlayerBullet.prototype.load = function load(){
    this.img = assetLoader.imgs.playerbullet;
    this.width = this.img.width;
    this.height = this.img.height;
  }
  PlayerBullet.prototype.detectCollisions = function detectCollisions(){
    for (var i = 0; i < asteroidPool.pool.length; i+=1){
      var asteroid = asteroidPool.pool[i];
      if(asteroid.hasOwnProperty('visible') && asteroid.visible == true){
        if (this.box.x  < asteroid.x + asteroid.width && this.box.x + this.box.width  > asteroid.x &&
          this.box.y < asteroid.y + asteroid.height && this.box.y + this.box.height > asteroid.y){
          return true;
        }
      }
    }
  }

  function Asteroid(){}

  Asteroid.prototype = Object.create(GameElement.prototype);
  Asteroid.prototype.load = function load(){
    this.img = asteroidPool.images[Math.floor(Math.random() * asteroidPool.images.length)];
    this.width = this.img.width;
    this.height = this.img.height;
    this.rspeed = (Math.random() - 0.5)/20;
    this.yspeed = (Math.random() - 0.5) * 3;
    this.rot = 0;
  }
  Asteroid.prototype.move = function move(dt) {
    this.x -= this.speed * dt * 60/1000;
    this.y += this.yspeed * dt * 60/1000;
    this.rot += this.rspeed * dt * 60/1000;
    if (this.rot >= Math.PI * 2){ //made a complete rotation
      this.rot = 0;
    } 
    if (this.x <= 0 - this.width) {
      return true;
    }
    this.box = {x: this.x + this.width * 1/8, y: this.y + this.height * 1/8, width: this.width * 3/4, height: this.height * 3/4};
  }
  
  Asteroid.prototype.detectCollisions = function detectCollisions(){
    if (this.box.x  < ship.box.x + ship.box.width && this.box.x + this.box.width  > ship.box.x &&
    this.box.y < ship.box.y + ship.box.height && this.box.y + this.box.height > ship.box.y){
      gameOver();
    }
  }

  function Pool(){
  }

  Pool.prototype.init = function init(size, type){
      this.pool = [];
      this.size = size;
      for (var i = 0; i < size; i++) {
        // Initalize the object
        var item = Object.create(type.prototype);
        this.pool[i] = item;
    }
  };

  Pool.prototype.get = function get(x, y, speed){
    if(!this.pool[this.size - 1].visible) {
      this.pool[this.size - 1].spawn(x, y, speed);
      this.pool.unshift(this.pool.pop());
    }
  };
  Pool.prototype.animate = function animate(dt) {
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

  Pool.prototype.draw = function draw() {
    for (var i = 0; i<this.size; i++){
      if(this.pool[i].visible){
        this.pool[i].draw();
        this.pool[i].detectCollisions();
      }
    }
  }

  //use module pattern to create ship singleton
  var ship = (function ship (ship){
      var fireRate = 10;
      var counter = 0;

      ship.init = function init(x, y, speed){
        ship.img = assetLoader.imgs.playership;
        ship.width = ship.img.width;
        ship.height = ship.img.height;
        ship.x = x;
        ship.y = y; 
        ship.speed = speed;
        setBoundingBox();
        ship.visible = false;
      }

      function setBoundingBox(){
        ship.box = {x: ship.x, y: ship.y + ship.height*1/4, width: ship.width, height: ship.height * 1/2};
      }

      ship.makeBullets = function (){
        ship.bulletPool = Object.create(Pool.prototype);
        ship.bulletPool.init(30, PlayerBullet);
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
        setBoundingBox();
      };
     
      ship.fire = function() {
        ship.bulletPool.get(ship.x+ship.width - 8, ship.y + ship.height * 5/8 + -1 , 7);
      }


      return ship;
  })(Object.create(GameElement.prototype));

  var asteroidPool = (function(pool){
    pool.generate = function generate(){ 
      var asteroidChance = Math.floor(Math.random()*101);
      if (asteroidChance/100 < 0.005) {
        pool.get(canvas.width, Math.floor(Math.random() * canvas.height), Math.floor(Math.random() * 9));
      }
    }
    return pool;
  })(Object.create(Pool.prototype))
  /**
   * Game loop
   */
  function animate() {
    if(!stop){
      requestAnimFrame( animate );
      now = timestamp();
      dt = now - last;
      last = now;
  
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      accumulator += dt;
      asteroidPool.generate();
  
     while (accumulator >= dt) {
          ship.move(dt);
          background.move(dt);
          ship.bulletPool.animate(dt);
          asteroidPool.animate(dt);
          accumulator -= dt;
      }
      background.draw();
      asteroidPool.draw();
      ship.draw();
      ship.bulletPool.draw();
    } 
  }

  function startGame() {
    stop = false;
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    background.reset();
    ship.init(
      0, 
      Math.floor(canvas.height/2 - assetLoader.imgs.playership.height/2), 
      6    
    )
    asteroidPool.init(8, Asteroid);
    asteroidPool.images = [assetLoader.imgs.asteroid1, assetLoader.imgs.asteroid2, assetLoader.imgs.asteroid3, assetLoader.imgs.asteroid4]
    ship.makeBullets();
    animate();
  }

  function gameOver(){
    stop = true;
    var gameOver = document.getElementById("game-over");
    gameOver.style.display = 'block';
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


  $(document).ready(function(){
    $("#game-over").click(function(){
      $(this).hide();
      startGame();
    })
  })

  assetLoader.downloadAll();

})(jQuery);