(() => {
    const maxAsteroids = 20
    const animDurationRange = [5, 30]

    const mainElem = document.getElementById('space')
    const shipElem = document.getElementById('ship')
    const styleElem = document.documentElement.appendChild(document.createElement('style'))
    const asteroids = []
    let addAsteroidHandle = null

    mainElem.addEventListener('crash', function() {
        clearTimeout(addAsteroidHandle)
        asteroids.forEach((asteroid) => {
            asteroid.style.animationPlayState = 'paused'
        })
    })

    function addAsteroid() {
        const asteroid = document.createElement('aside')
        asteroids.push(asteroid)
        asteroid.style.animationDuration = (Math.floor(Math.random() * animDurationRange[1]) + animDurationRange[0]) + 's'
        asteroid.style.animationName = 'asteroid-' + asteroids.length
        
        const scale = (Math.random() * 1.3) + 0.3
        const rotation = (Math.random() * 360) + 180
        const skew = { x: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 30) }
        const startPos = Math.floor(Math.random() * 100)
        const endPos = Math.floor(Math.random() * 50) + ((startPos < 50) ? 50 : -50)

        let start = null
        let end = null
        if (rotation < 270) {
            start = `top: -15%; left: ${startPos}%;`
            end = `top: 110%; left: ${endPos}%;`
        } else if (rotation < 360) {
            start = `top: ${startPos}%; left: -15%;`
            end = `top: ${endPos}%; left: 110%;`
        } else if (rotation < 450) {
            start = `bottom: 10%; right: ${startPos}%;`
            end = `bottom: 110%; right: ${endPos}%;`
        } else {
            start = `bottom: ${startPos}%; right: -15%;`
            end = `bottom: ${endPos}%; right: 110%;`
        }

        const rule = `${asteroid.style.animationName} {
    0% {
        ${start}
        transform: rotate(0deg) skew(${skew.x}deg, ${skew.y}deg) scale(${scale}, ${scale});
    }
    100% {
        ${end}
        transform: rotate(${rotation}deg) skew(${skew.x}deg, ${skew.y}deg) scale(${scale}, ${scale});
    }
}`

        styleElem.sheet.insertRule(`@keyframes ${rule}`, 0)

        mainElem.appendChild(asteroid)

        if (asteroids.length <= maxAsteroids) {
            addAsteroidHandle = setTimeout(
                addAsteroid, 
                (maxAsteroids * 1000) - Math.floor(Math.random() * (asteroids.length * 1000))
            )
        }

        shipElem.dispatchEvent(new CustomEvent('asteroidDetected', { detail: asteroid }))
    }

    addAsteroid()

})();
