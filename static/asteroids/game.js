
(function gameSetup() {
    var body = document.querySelector('body');
    var main = document.querySelector('main');

    var ship = {
        node: document.getElementById('ship'),
        angle: 0,
        velocity: 0
    };

    var asteroids = [];
    ship.node.addEventListener('asteroidDetected', function (event) {
        asteroids.push(event.detail);
    });

    // starting position
    ship.node.style.top = ((window.innerHeight / 2) - 20) + 'px';
    ship.node.style.left = ((window.innerWidth / 2) - 20) + 'px';

    function handleKeys(e) {
        if (e.keyCode === 38) {
            ship.velocity += 2;
        } else if (e.keyCode === 40) {
            ship.velocity -= 2;
            ship.velocity = Math.max(ship.velocity, 0);
        } else if (e.keyCode === 39) {
            ship.angle += 10;
            ship.node.style.transform = 'rotate(' + ship.angle + 'deg)';
        } else if (e.keyCode === 37) {
            ship.angle -= 10;
            ship.node.style.transform = 'rotate(' + ship.angle + 'deg)';
        }
    }

    body.addEventListener('keyup', handleKeys);

    main.addEventListener('crash', function () {
        ship.velocity = 0;
    });


    function gameLoop() {
        var move = getShipMovement(ship.velocity, ship.angle);
        var newLeft = parseInt(ship.node.style.left, 10) + move.left;
        var newTop = parseInt(ship.node.style.top, 10) - move.top;

        // Wrap the ship around the window
        if (newTop < 0) {
            newTop += window.innerHeight;
        }
        if (newLeft < 0) {
            newLeft += window.innerWidth;
        }
        if (newTop > window.innerHeight) {
            newTop = move.top;
        }
        if (newLeft > window.innerWidth) {
            newLeft = move.left;
        }

        // Now move the ship
        ship.node.style.left = newLeft + 'px';
        ship.node.style.top = newTop + 'px';

        checkForCollisions();
    }
    var loopHandle = setInterval(gameLoop, 20);

    function checkForCollisions() {
        asteroids.forEach(function(asteroid) {
            var shipBox = ship.node.getBoundingClientRect();
            var asteroidBox = asteroid.getBoundingClientRect();

            if (shipBox.left < asteroidBox.left + asteroidBox.width &&
               shipBox.left + shipBox.width > asteroidBox.left &&
               shipBox.top < asteroidBox.top + asteroidBox.height &&
               shipBox.height + shipBox.top > asteroidBox.top) {
                crash(asteroid);
            }
        });
    }


    /** ************************************************************************
     *         These functions are given to you. DO NOT ALTER THEM.
     ** ************************************************************************/

     /**
      * Executes the code required when a crash has occurred. You should call
      * this function when a collision has been detected with the asteroid that
      * was hit as the only argument.
      *
      * @param  {HTMLElement} asteroidHit The HTML element of the hit asteroid
      * @return void
      */
    function crash(asteroidHit) {
        document.querySelector('body').removeEventListener('keyup', handleKeys);
        [].slice.call(document.querySelectorAll('aside')).forEach(function(asteroid) {
            asteroid.style.animationPlayState = 'paused';
        });
        asteroidHit.classList.add('hit');
        document.querySelector('#ship').classList.add('crash');

        var event = new CustomEvent('crash', { detail: asteroidHit });
        document.querySelector('main').dispatchEvent(event);
    }

    /**
     * Get the change in ship position (movement) given the current velocity
     * and angle the ship is pointing.
     *
     * @param  number velocity The current speed of the ship (no units)
     * @param  number angle    The angle the ship is pointing (no units)
     * @return object          The amount to move the ship by with regard to left and top position (object with two properties)
     */
    function getShipMovement(velocity, angle) {
        return {
            left: (velocity * Math.sin(angle * Math.PI / 180)),
            top: (velocity * Math.cos(angle * Math.PI / 180))
        };
    }

})();
