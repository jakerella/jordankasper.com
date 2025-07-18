;(async function () {

    const resp = await fetch(`/.netlify/functions/retrieveStats`)
    if (resp.status > 299) {
        $('.site-analytics').append(`<p>
            Error (${resp.status}):<br>
            ${await resp.text()}
        </p>`)
    }

    const data = await resp.json()

    console.log('analytics:', data)

})();