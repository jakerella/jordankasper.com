
(() => {
    let currentBin = window.location.hash.substr(1) || 'misc';
    const field = document.querySelector('.edit-notes');

    

    setupEditor();
    addBinToggle();

    field.focus();


    /* *******************************************************************
                                    HELPERS
       *******************************************************************/

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
                if (/^\s*(?:\*|\-)\s/.test(current.content)) {
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
                const listElem = getListElem(1);
                if (listElem) {
                    insertElem(listElem[1]);
                }
            }
    
            localStorage.setItem(currentBin, field.value);
        });
    }

    function addBinToggle() {
        const list = document.querySelector('.notes-list');
        list.innerHTML += buildBinList();

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
                toggleList();
                
            } else if (e.target.className === 'notes-title' || e.target.parentNode.className === 'notes-title') {
                toggleList();

            } else {
                list.style.display = 'none';
            }
        });

        function toggleList() {
            list.style.display = (list.style.display === 'block') ? 'none' : 'block';
        }
    }

    function buildBinList() {
        const bins = Object.keys(localStorage);
        return (bins.map((bin) => {
            return `<li class='note-link'><button class='delete' title='Delete this note'>X</button><span class='bin'>${bin}</span></li>`;
        })).join('');
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

    function getListElem(linesBack=0) {
        const split = field.selectionStart;
        const lines = field.value.substr(0, split).split(/\n/);
        const listElem = lines[lines.length-1-linesBack].match(/^(\s*(?:\*|\-)\s)[^\s\*\-]+/);
        return listElem;
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
    window.getCurrentLine = getCurrentLine;
})();