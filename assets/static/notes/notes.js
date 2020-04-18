
(() => {
    const bin = window.location.hash || 'misc';
    document.querySelector('.notes-title .bin').innerText = bin;

    const data = localStorage.getItem(bin);

    const field = document.querySelector('.edit-notes');

    field.value = data;

    field.addEventListener('keydown', (e) => {
        // The tab would normally take us off of the textarea, we don't want that!
        if (e.keyCode === 9) {
            e.preventDefault();
        }
    });

    field.addEventListener('keyup', (e) => {
        // Insert 2-space tabs, including indenting list items
        if (e.keyCode === 9) {
            let insert = '  ';
            let replace = false;
            const current = getCurrentLine();
            if (/^\s*(?:\*|\-)\s/.test(current.content)) {
                insert += current.content;
                replace = true;
            }
            insertElem(insert, replace);
        }

        // Handle automatic list continuation for * or -
        if (e.keyCode === 13) {
            const listElem = getListElem(1);
            if (listElem) {
                insertElem(listElem[1]);
            }
        }

        localStorage.setItem(bin, field.value);
    });

    field.focus();

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