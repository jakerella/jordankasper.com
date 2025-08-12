
(() => {
    const VERSION_DELAY =  (1000 * 60 * 3);
    const MAX_VERSIONS = 15;
    const VERSION_SUFFIX = '__versions';
    let currentBin = window.location.hash.substr(1) || 'misc';
    const field = document.querySelector('.edit-notes');

    setupEditor();
    setupBinVersioning();
    setupTopMenus();
    field.focus();


    function setupEditor() {
        document.querySelector('.notes-title .bin').innerText = currentBin;
        field.value = localStorage.getItem(currentBin);

        field.addEventListener('keydown', (e) => {
            // The tab would normally take us off of the textarea, we don't want that!
            if (e.keyCode === 9) {
                e.preventDefault();
            }
        });
    
        field.addEventListener('keyup', (e) => {
            // Insert 2-space tabs, including indenting list items
            if (e.keyCode === 9 && !e.shiftKey) {
                let insert = '  ';
                let replace = false;
                const current = getCurrentLine();
                if (/^\s*(?:\*|\-|\(?([0-9]+)[\.\)]?)\s/.test(current.content)) {
                    insert += current.content;
                    replace = true;
                }
                insertElem(insert, replace);
            }
            // Handle outdents (removing an indentation level)
            if (e.keyCode === 9 && e.shiftKey) {
                const current = getCurrentLine();
                if (/^\s{2,}/.test(current.content)) {
                    insert = current.content.substr(2);
                    insertElem(insert, true);
                }
            }
    
            // Handle automatic list continuation for * or -
            if (e.keyCode === 13) {
                const listElem = getNextListBullet();
                if (listElem) {
                    insertElem(listElem);
                }
            }
    
            localStorage.setItem(currentBin, field.value);
        });
    }

    function getVersions() {
        let versions = localStorage.getItem(currentBin + VERSION_SUFFIX);
        if (versions) {
            try { versions = JSON.parse(versions); }
            catch(e) {
                versions = {};
                console.warn('Deleting versions, they appear corrupted:', localStorage.getItem(currentBin + VERSION_SUFFIX));
                localStorage.removeItem(currentBin + VERSION_SUFFIX);
                versions = addVersion(versions);
            }
        } else {
            versions = {};
            versions = addVersion(versions);
        }

        return versions;
    }

    function setupBinVersioning() {
        setInterval(() => {
            const versions = getVersions();
            const versionNumbers = Object.keys(versions);
            versionNumbers.sort();
            if (field.value.trim() !== versions[versionNumbers[versionNumbers.length-1]].trim()) {
                addVersion(versions);
            }
        }, VERSION_DELAY);
    }

    function addVersion(versions) {
        const ts = Date.now();
        versions[ts] = field.value;
        const versionNumbers = Object.keys(versions);
        if (versionNumbers.length > MAX_VERSIONS) {
            versionNumbers.sort();
            for (let i=0; i<(versionNumbers.length - MAX_VERSIONS); ++i) {
                delete versions[versionNumbers[i]];
            }
        }

        localStorage.setItem(currentBin + VERSION_SUFFIX, JSON.stringify(versions));
        document.querySelector('.version-list').innerHTML = buildVersionList();
        return versions;
    }

    function setupTopMenus() {
        const binList = document.querySelector('.notes-list');
        binList.innerHTML += buildBinList();

        const versionList = document.querySelector('.version-list');
        versionList.innerHTML = buildVersionList();

        document.body.addEventListener('click', (e) => {
            if (e.target.className === 'new-note') {
                createNote();

            } else if (e.target.className === 'note-link' || e.target.parentNode.className === 'note-link') {
                if (e.target.className === 'delete')  {
                    deleteNote(e.target.parentNode.querySelector('.bin').innerText);
                } else if (e.target.className === 'note-link')  {
                    switchNote(e.target.querySelector('.bin').innerText);
                } else if (e.target.className === 'bin')  {
                    switchNote(e.target.innerText);
                }
                toggleList(binList);
            
            } else if (e.target.className === 'version') {
                setToVersion(e.target.getAttribute('data-ts'));
                toggleList(versionList);

            } else if (e.target.className === 'versions') {
                toggleList(versionList);

            } else if (e.target.className === 'notes-title' || e.target.parentNode.className === 'notes-title') {
                toggleList(binList);

            } else {
                binList.style.display = 'none';
                versionList.style.display = 'none';
            }
        });

        function toggleList(list) {
            list.style.display = (list.style.display === 'block') ? 'none' : 'block';
        }
    }

    function buildBinList() {
        const bins = Object.keys(localStorage).filter((bin) => { return !/__versions$/.test(bin); });
        return (bins.map((bin) => {
            return `<li class='note-link'><button class='delete' title='Delete this note'>X</button><span class='bin'>${bin}</span></li>`;
        })).join('');
    }

    function buildVersionList() {
        const versions = getVersions();
        return (Object.keys(versions).sort().map((ts) => {
            return `<li class='version' data-ts='${ts}'>${(new Date(Number(ts))).toLocaleString()}</li>`;
        })).join('');
    }

    function setToVersion(version) {
        console.log('reverting to version:', version);
        const versions = getVersions();

        if (!versions[version] && versions[version] !== '') {
            return alert('That was not a valid version, it may have been removed. Maybe try again?');
        } else {
            field.value = versions[version];
            localStorage.setItem(currentBin, field.value);
            delete versions[version];
            addVersion(versions);
        }
    }

    function deleteNote(bin) {
        if (localStorage.getItem(bin) === null) {
            if (bin === currentBin) {
                window.location.replace(window.location.href.replace(/#.+/, ''));
            }
            return;
        }
        
        if (bin === currentBin) {
            field.value = '';
            localStorage.setItem(bin, '');
        } else {
            localStorage.removeItem(bin);
            localStorage.removeItem(bin + VERSION_SUFFIX);
            document.querySelectorAll('.note-link').forEach((link) => {
                if (link.querySelector('.bin').innerText === bin) {
                    link.parentNode.removeChild(link);
                }
            });
        }
    }

    function switchNote(bin) {
        currentBin = bin;
        window.location.hash = bin;
        field.value = localStorage.getItem(bin);
        document.querySelector('.notes-title .bin').innerText = bin;
    }

    function createNote() {
        const name = window.prompt('What will the name be?\n(Note: only letters, numbers, and hyphens!)');
        if (!name) { return; }
        const bin = name.replace(/[^a-zA-Z0-9\-]/g, '');
        currentBin = bin;
        window.location.hash = bin;
        localStorage.setItem(bin, '');
        window.location.reload();
    }

    function insertElem(insert, replace=false) {
        let start = field.selectionStart;
        let end = field.selectionEnd;
        if (replace) {
            const current = getCurrentLine();
            start = current.start;
            end = current.end;
        }
        field.value = `${field.value.substr(0, start)}${insert}${field.value.substr(end)}`;
        field.selectionStart = start + insert.length;
        field.selectionEnd = start + insert.length;
    }

    function getNextListBullet() {
        const split = field.selectionStart;
        const lines = field.value.substr(0, split).split(/\n/);
        // we go back 2 in the array because the last line is always empty due to splitting on newline cahrs
        let listElem = lines[lines.length-2].match(/^(\s*(?:\*|\-)\s)[^\s\*\-]+/);
        let bullet = null;
        if (listElem) {
            bullet = listElem[1];
        } else {
            listElem = lines[lines.length-2].match(/^(\s*(?:\(?([0-9]+)[\.\)]?)\s)[^\s\*\-]+/);
            if (listElem) {
                let num = Number(listElem[2]);
                bullet = listElem[1].replace(/[0-9]+/, ++num);
            }
        }
        return bullet;
    }

    function getCurrentLine() {
        const pos = field.selectionStart;
        const pastLines = field.value.substr(0, pos).split(/\n/);
        lineEnd = field.value.substr(pos).split(/\n/)[0];
        return {
            start: pos - pastLines[pastLines.length-1].length,
            end: pos + lineEnd.length,
            content: pastLines[pastLines.length-1] + lineEnd
        }
    }
    
})();