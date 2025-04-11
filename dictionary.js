
const dictionary = {
    "yılkı": {
        main: "yılkı",
        meaning: "at"
    },
    "at": {
        main: "yılkı",
        meaning: "at"
    },
    "kır": {
        main: "kır",
        meaning: "köy"
    },
    "köy": {
        main: "kır",
        meaning: "köy"
    },
    "budak": {
        main: "budak",
        meaning: "dal"
    },
    "dal": {
        main: "budak",
        meaning: "dal"
    },
    "torun": {
        main: "torun",
        meaning: "yazmak"
    },
    "yazmak": {
        main: "torun",
        meaning: "yazmak"
    }
};

document.getElementById('searchInput').addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    const resultDiv = document.getElementById('result');

    if (dictionary[query]) {
        const entry = dictionary[query];
        resultDiv.textContent = `${entry.main} (${entry.meaning})`;
    } else if (query === "") {
        resultDiv.textContent = "";
    } else {
        resultDiv.textContent = `"${query}" sözlükte bulunamadı.`;
    }
});
