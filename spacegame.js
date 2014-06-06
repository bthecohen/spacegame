var game = (function ($) {
  /**
   * Time-tracking variables to ensure correct game speed
   */
  var now = 0;
  var last = timestamp();
  var dt = 0;
  var accumulator = 0;
  
  /**
   * the main game canvas
   */
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  
  /**
   * game state
   */
  var score = 0; // the player's score
  var stop = false;
  var debug = false; //draw bounding boxes
  var hardMode = false; // enable nasty features
   
  /**
   * Singleton object to represent parallax-scrolling background
   */
  var background = (function() {
    var layer1   = {};
    var layer2   = {};
    var layer3   = {};
    
    this.move = function(dt){
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

    this.draw = function draw() {
      ctx.drawImage(assetLoader.imgs.bg1, layer1.x, layer1.y);
      ctx.drawImage(assetLoader.imgs.bg1, layer1.x + canvas.width, layer1.y);
      ctx.drawImage(assetLoader.imgs.bg2, layer2.x, layer2.y);
      ctx.drawImage(assetLoader.imgs.bg2, layer2.x + canvas.width, layer2.y);
      ctx.drawImage(assetLoader.imgs.bg3, layer3.x, layer3.y);
      ctx.drawImage(assetLoader.imgs.bg3, layer3.x + canvas.width, layer3.y);
    }
   
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
    return {            // export public methods
      draw: this.draw,
      reset: this.reset,
      move: this.move
    };
  })(); // end background

  /**
   * Generic prototype for animated objects in game
   */
  function GameElement() {}
  
    /**
      * Activate a new object from an object pool.
      */
    GameElement.prototype.spawn = function spawn(x, y, speed) {
      this.x = x;
      this.y = y;
      this.speed = speed;
      this.visible = true;
      this.box = {x: this.x, y: this.y, width: this.width, height: this.height}; //default bounding box
      if(typeof this.load == "function"){
        this.load(); // class-specific special behavior
      }
    };
  
  
    GameElement.prototype.draw = function draw() {
      if(this.visible=true){
        if(this.rspeed){ // if the object is rotating
          // save the state of the coordinate system
          ctx.save(); 
          // move the origin of the canvas coordinates to the center of the object
          // we want to rotate
          ctx.translate(this.x, this.y); 
          ctx.translate(this.width/2, this.height/2); 
          // rotate around this point
          ctx.rotate(this.rot); 
          ctx.drawImage(this.img, -this.width/2, -this.height/2); 
          //restore the previously stored state
          ctx.restore();
        } else { // the object is not rotating
          ctx.drawImage(this.img, this.x, this.y);
        }
        if(debug){  // draw the bounding box if debug mode is on
          ctx.beginPath();
          ctx.rect(this.box.x,this.box.y,this.box.width,this.box.height);
          ctx.strokeStyle="red";
          ctx.stroke();      
        }
      }
    };
  
    GameElement.prototype.clear = function clear() {
      this.visible = false;
    };
  
  // end GameElement

  /**
   * Class for the bullets fired by the player's ship
   */
  function PlayerBullet(){}
    
    PlayerBullet.prototype = Object.create(GameElement.prototype);
    
    //if returns true, the pool deactivates the current object
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
      // player bullets disappear on hitting an asteroid
      for (var i = 0; i < asteroidPool.pool.length; i+=1){
        var asteroid = asteroidPool.pool[i];
        if(asteroid.visible == true){
          if (this.box.x  < asteroid.x + asteroid.width && this.box.x + this.box.width  > asteroid.x &&
            this.box.y < asteroid.y + asteroid.height && this.box.y + this.box.height > asteroid.y){
            return true;
          }
        }
      }
      // on hitting an enemy, both the enemy and the bullet are destroyed
      for (var i = 0; i < enemyPool.pool.length; i+=1){
        var enemy = enemyPool.pool[i];
        if (enemy.visible == true && this.box.x  < enemy.x + enemy.width && this.box.x + this.box.width  > enemy.x &&
            this.box.y < enemy.y + enemy.height && this.box.y + this.box.height > enemy.y){
            addScore(1);
            enemy.clear();
            enemyPool.pool.push((enemyPool.pool.splice(i,1))[0]);
            return true;
          }
      }
    }

  /**
   * Class for the randomly-generated asteroid obstacles
   */
  function Asteroid(){}

    Asteroid.prototype = Object.create(GameElement.prototype);
    // called for each new spawn
    Asteroid.prototype.load = function load(){
      this.img = asteroidPool.images[Math.floor(Math.random() * asteroidPool.images.length)];
      this.width = this.img.width;
      this.height = this.img.height;
      this.rspeed = (Math.random() - 0.5)/20;
      this.yspeed = (Math.random() - 0.5) * 3;
      this.rot = 0;
    }
    //if returns true, the pool deactivates the current object
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
      //make the bounding box smaller than the image to prevent unrealistic collisions
      this.box = {x: this.x + this.width * 1/8, y: this.y + this.height * 1/8, width: this.width * 3/4, height: this.height * 3/4};
    }
    
    Asteroid.prototype.detectCollisions = function detectCollisions(){
      // game over if an asteroid hits a ship
      if (this.box.x  < ship.box.x + ship.box.width && this.box.x + this.box.width  > ship.box.x &&
      this.box.y < ship.box.y + ship.box.height && this.box.y + this.box.height > ship.box.y){
        gameOver();
      }
    }

  /**
   * Class for enemy ships
   */
  function Enemy(){}

    Enemy.prototype = Object.create(GameElement.prototype);
   
    Enemy.prototype.load = function load(){
      this.img = enemyPool.images[Math.floor(Math.random() * enemyPool.images.length)];
      this.width = this.img.width;
      this.height = this.img.height;
      this.yspeed = 5;
      this.xplane = Math.floor(Math.random()*(canvas.width - 100) + 50);
      this.direction = ["up", "down"][Math.floor(Math.random() * 2)];
      this.fireRate = 30;
      this.counter = 0;
    }
    
    Enemy.prototype.fire = function() {
      enemyBulletPool.get(this.x, this.y + this.height * 1/2, 7);
      this.counter = 0;
    }
    
    //if returns true, the pool deactivates the current object
    Enemy.prototype.move = function move(dt) {
      this.counter += dt * 60/1000;
      if(Math.floor(this.x) >= Math.floor(this.xplane)){
        this.x -= this.speed * dt * 60/1000;
      } 
      if (this.direction == "up") { 
        this.y -= this.yspeed * dt * 60/1000; 
      }
      if (this.direction == "down"){
        this.y += this.yspeed * dt * 60/1000;
      }
      
      if(this.y <= 0){
        this.direction = "down";
      }
      if(this.y + this.height >= canvas.height){
        this.direction = "up";
      }
      if(this.counter >= this.fireRate){
        this.fire();
      }
     
      this.box = {x: this.x + this.width * 1/8, y: this.y + this.height * 1/8, width: this.width * 3/4, height: this.height * 3/4};
    }
    
    Enemy.prototype.detectCollisions = function detectCollisions(){
      if (this.box.x  < ship.box.x + ship.box.width && this.box.x + this.box.width  > ship.box.x &&
      this.box.y < ship.box.y + ship.box.height && this.box.y + this.box.height > ship.box.y){
        gameOver();
      }
    }

  /**
   * Class for the bullets fired by the enemy ships
   */
  function EnemyBullet(){}
  
  EnemyBullet.prototype = Object.create(GameElement.prototype);
  
  //if returns true, the pool deactivates the current object
  EnemyBullet.prototype.move = function move(dt) {
    if(hardMode){
      this.x -= this.xspeed * dt * 60/1000;
      this.y += this.yspeed * dt * 60/1000;
    } else {
      this.x -= this.speed * dt * 60/1000;
    }
    this.rot -= this.rspeed * dt * 60/1000;
    if (this.rot >= Math.PI * 2){ //made a complete rotation
      this.rot = 0;
    } 
    this.box = {x: this.x, y: this.y, width: this.width, height: this.height};
    if (this.x <= 0 || this.y + this.height >= canvas.height || this.y <= 0) {
      return true;
    } else if (this.detectCollisions()) {
      return true;
    }
  }
 
  //called each time a new one is spawned
  EnemyBullet.prototype.load = function load(){
    this.img = assetLoader.imgs.enemybullet1;
    this.width = this.img.width;
    this.height = this.img.height;

    var dy = ship.y - this.y;
    var dx = Math.abs(ship.x - this.x);
    var distance = Math.sqrt(dy*dy + dx*dx);
    this.yspeed = this.speed * dy/distance;
    this.xspeed = this.speed * dx/distance;
    this.rspeed = this.yspeed >= 0 ? 0.3 : -0.3;
    this.rot = 0;
  }
  
  EnemyBullet.prototype.detectCollisions = function detectCollisions(){
    // enemy bullets destoryed on hitting an asteroid
    for (var i = 0; i < asteroidPool.pool.length; i+=1){
      var asteroid = asteroidPool.pool[i];
      if(asteroid.visible == true){
        if (this.box.x  < asteroid.x + asteroid.width && this.box.x + this.box.width  > asteroid.x &&
          this.box.y < asteroid.y + asteroid.height && this.box.y + this.box.height > asteroid.y){
          return true;
        }
      }
    }
    // Game over if they hit the player ship
    if (this.box.x  < ship.x + ship.width && this.box.x + this.box.width  > ship.x &&
        this.box.y < ship.y + ship.height && this.box.y + this.box.height > ship.y){
        gameOver();
        return true;
    }
  }

 
  //use IIFE (Immediately Invoked Funcion Expression) module pattern to create ship singleton
  var ship = (function ship (ship){
      var fireRate = 10; // the cooldown between firings (smaller number = faster firing rate)
      var counter = 0; // how much of the cooldown has elapsed

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
        counter += dt * 60/1000; // cooldown between firings
        if (KEY_STATUS.left) {
          ship.x -= ship.speed * dt * 60/1000;
          if (ship.x <= 0){ // Keep ship on the screen
            ship.x = 0;
          }
        } 
        if (KEY_STATUS.right) {
          ship.x += ship.speed * dt * 60/1000;
          if (ship.x >= canvas.width - ship.width){ // Keep ship on the screen
            ship.x = canvas.width - ship.width;
          }
        } 
        if (KEY_STATUS.up) {
          ship.y -= ship.speed * dt * 60/1000;
          if (ship.y <= 0){ // Keep ship on the screen
            ship.y = 0;
          }
        } 
        if (KEY_STATUS.down) {
          ship.y += ship.speed * dt * 60/1000;
          if (ship.y >= canvas.height - ship.height) { // Keep ship on the screen
            ship.y = canvas.height - ship.height;
          }
        }
        
        if (KEY_STATUS.space && counter >= fireRate) {
          ship.fire();
          counter = 0;
        }
        setBoundingBox();
      };
     
      ship.fire = function() {
        ship.bulletPool.get(ship.x+ship.width - 8, ship.y + ship.height * 5/8 + -1 , 8);
      }


      return ship;
  })(Object.create(GameElement.prototype));

   /**
   * Base class for object pools. Optimizes performance by reusing objects; keeps buckets of "visible"
   * and "invisble" objects instead of creating and destroying objects. This avoids the performance hits of
   * allocation and garbage collection. Based on an implementation by Steven Lambert.
   */
  function Pool(){}

  Pool.prototype.init = function init(size, type){
     // run any class-specific init code
      if (typeof this.preInit == "function"){
        this.preInit();
      }
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
      // Only draw until we find an item that is not alive
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

  /**
   * Singleton containing the pool of available asteroids
   */
  var asteroidPool = (function(pool){
    //randomly spawn a new asteroid based on a chance coeffiecient
    pool.generate = function generate(){ 
      var asteroidChance = Math.floor(Math.random()*101);
      if (asteroidChance/100 < 0.005) {
        pool.get(canvas.width, Math.floor(Math.random() * canvas.height), Math.floor(Math.random() * 9));
      }
    }
    //class-specific method called at top of init method
    pool.preInit = function setImages(){
      pool.images = [assetLoader.imgs.asteroid1, assetLoader.imgs.asteroid2, assetLoader.imgs.asteroid3, assetLoader.imgs.asteroid4]
    }
    return pool;
  })(Object.create(Pool.prototype))

  /**
   * Singleton containing the pool of enemy ships
   */
  var enemyPool = (function(pool){
    //randomly spawn a new enemy based on a chance coeffiecient
    pool.generate = function generate(){ 
      var chance = Math.floor(Math.random()*101);
      if (chance/100 < 0.005) {
        pool.get(canvas.width, Math.floor(Math.random() * canvas.height), 7);
      }
    }
    //class-specific method called at top of init method
    pool.preInit = function setImages(){
      pool.images = [assetLoader.imgs.enemyship1];
    }
    return pool;
  })(Object.create(Pool.prototype))
  
  /**
   * Singleton containing pool of enemy bullets
   */
  var enemyBulletPool = Object.create(Pool.prototype);
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
      enemyPool.generate();
  
     while (accumulator >= dt) {
          ship.move(dt);
          background.move(dt);
          ship.bulletPool.animate(dt);
          asteroidPool.animate(dt);
          enemyPool.animate(dt);
          enemyBulletPool.animate(dt);
          accumulator -= dt;
      }
      background.draw();
      asteroidPool.draw();
      enemyPool.draw();
      enemyBulletPool.draw();
      ship.draw();
      ship.bulletPool.draw();
    } 
  }
  
  /**
   * Initalize and start the game
   */
  function startGame() {
    score = 0;
    $("#score-counter span").html(0);
    stop = false;
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    background.reset();
    ship.init(
      0, 
      Math.floor(canvas.height/2 - assetLoader.imgs.playership.height/2), 
      7    
    )
    asteroidPool.init(8, Asteroid);
    enemyPool.init(7, Enemy);
    enemyBulletPool.init(50, EnemyBullet);
    ship.makeBullets();
    animate();
  }

  /**
   * Stop the game and display the Game Over screen
   */
  function gameOver(){
    stop = true;
    var gameOver = document.getElementById("game-over");
    gameOver.style.display = 'block';
  }

  /**
   * Add to the player score and update the score counter element
   */
  function addScore(n){
    score += n;
    $('#score-counter span').html(score);
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
  
  /**
   * Asynchronous asset pre-loader by Steven Lambert
   */
  var assetLoader = (function() {
    // images dictionary
    this.imgs        = {
      "bg1"           : "img/bglayer1.png",
      "bg2"           : "img/bglayer2.png",
      "bg3"           : "img/bglayer3.png",
      "playership"    : "img/playership.png",
      "enemyship1"    : "img/enemyship1.png",
      "playerbullet"  : "img/playerbullet.png",
      "enemybullet1"  : "img/enemybullet1.png",
      "asteroid1"     : "img/asteroid1.png",
      "asteroid2"     : "img/asteroid2.png",
      "asteroid3"     : "img/asteroid3.png",
      "asteroid4"     : "img/asteroid4.png",
    };
    var assetsLoaded = 0;                                // how many assets have been loaded
    var numImgs      = Object.keys(this.imgs).length;    // total number of image assets
    this.totalAssest = numImgs;                          // total number of assets
    /*
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
      $("#loading").show();
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
    //export public methods
    return {
      imgs: this.imgs,
      totalAssest: this.totalAssest,
      downloadAll: this.downloadAll
    };
  })();

  assetLoader.finished = function() {
    $("#loading").fadeOut({duration: 400, start: startGame});
  }


  //polyfill that either uses native DOM method or Date object
  function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
  }

  // use jQuery to bind "new game" functionality to Game Over Screen
  $(document).ready(function(){
    $("#game-over").click(function(){
      $(this).fadeOut({duration: 400, start: startGame});
    })
  })
  
  // export a single method to start the game
  return {
    start: function(){
      assetLoader.downloadAll();
    }
  }
  
})(jQuery);

//Show start screen, and initialize game on click
jQuery(document).ready(function($){
  var startscreen = $("#start-game");
  startscreen.show();
  startscreen.click(function(){
    $(this).fadeOut({duration: 200, done: game.start});
    $("#score-counter").show();
  })
})
