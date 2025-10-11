function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase();
}

let allWords = [];
let lastSelectedWord = null;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

async function fetchWords() {
    const sheetId = '1R01aIajx6dzHlO-KBiUXUmld2AEvxjCQkUTFGYB3EDM';
    const sheetName = 'Sözlük';
    const url = `https://opensheet.elk.sh/${sheetId}/${sheetName}`;

    try {
        const response = await fetch(url);
        allWords = await response.json();
        setupSearch();
        showPage('about'); // Sayfa yüklendiğinde "Hakkında" sayfasını göster
    } catch (error) {
        console.error('VERİ ÇEKME HATASI:', error);
        document.getElementById('result').innerHTML =
            '<p style="color: red;">VERİLER YÜKLENİRKEN HATA OLUŞTU. LÜTFEN SAYFAYI YENİLEYİN.</p>';
    }
}

function showPage(pageId) {
    const homeContent = document.getElementById('home-content');
    const aboutContent = document.getElementById('about-content');
    const searchInput = document.getElementById('searchInput');

    homeContent.classList.add('hidden');
    aboutContent.classList.add('hidden');

    if (pageId === 'home') {
        homeContent.classList.remove('hidden');
        searchInput.disabled = false;
        clearResult();
    } else if (pageId === 'about') {
        aboutContent.classList.remove('hidden');
        searchInput.disabled = true;
    }
}


function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultDiv = document.getElementById('result');

    // Sayfa yüklendiğinde geçmiş aramaları göster
    displaySearchHistory();

    searchInput.addEventListener('input', function () {
        const rawQuery = this.value.trim();
        const query = normalizeString(rawQuery);

        if (!query) {
            suggestionsDiv.innerHTML = '';
            // Arama kutusu boşken sonuç div'ini temizle
            resultDiv.innerHTML = '';
            displaySearchHistory();
            return;
        }

        const matches = [];
        allWords.forEach(row => {
            const mainWord = row.Sözcük || '';
            const mainNorm = normalizeString(mainWord);
            const synonyms = row['Eş Anlamlılar']
                ? row['Eş Anlamlılar'].split(',').map(s => s.trim())
                : [];

            if (mainNorm.startsWith(query)) {
                matches.push({ type: 'main', word: mainWord, data: row });
            } else {
                synonyms.forEach(syn => {
                    if (normalizeString(syn).startsWith(query)) {
                        matches.push({ type: 'synonym', synonym: syn, main: mainWord, data: row });
                    }
                });
            }
        });

        displaySuggestions(matches, query);
    });

    searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) displaySearchHistory();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstSuggestion = suggestionsDiv.querySelector('.suggestion');
            if (firstSuggestion) firstSuggestion.click();
        }
    });

    // Sayfa yüklendiğinde, eğer daha önce bir arama yapılmışsa, sonucu göster
    if (lastSelectedWord) {
        showResult(lastSelectedWord);
    }
}

function displaySuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    const suggestionsContainer = document.getElementById('suggestions-container');

    if (matches.length === 0) {
        suggestionsDiv.innerHTML = `<div class="p-4 text-muted-light dark:text-muted-dark">Sonuç bulunamadı</div>`;
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => {
        const aWord = a.type === 'main' ? a.word : a.synonym;
        const bWord = b.type === 'main' ? b.word : b.synonym;
        return normalizeString(aWord).localeCompare(normalizeString(bWord));
    }).slice(0, 12).forEach(match => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';

        if (match.type === 'main') {
            suggestion.innerHTML = `<span class="font-bold">${match.word}</span>`;
        } else {
            suggestion.innerHTML = `
                <span class="font-bold">${match.synonym}</span>
                <span class="text-muted-light dark:text-muted-dark ml-2 text-sm">${match.main}</span>
            `;
        }

        suggestion.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectWord(match.data);
            document.getElementById('searchInput').focus(); // Arama kutusunun odaklanmasını korur
        });
        suggestionsDiv.appendChild(suggestion);
    });

    suggestionsContainer.classList.remove('hidden');
}

function selectWord(word) {
    lastSelectedWord = word;
    document.getElementById('searchInput').value = word.Sözcük;
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(word);
    updateSearchHistory(word.Sözcük);
}

function showResult(word) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg sm:rounded-xl overflow-hidden p-4 sm:p-6">
            <h2 class="text-2xl font-bold mb-4">${word.Sözcük}</h2>
            <div class="mb-4">
                <span class="font-semibold text-lg">Eş Anlamlılar:</span>
                <span class="text-muted-light dark:text-muted-dark">${word['Eş Anlamlılar'] || 'Bulunmamaktadır.'}</span>
            </div>
            <div class="mb-4">
                <span class="font-semibold text-lg">Açıklama:</span>
                <p class="text-base">${word.Açıklama || 'Açıklama bulunmamaktadır.'}</p>
            </div>
            <div>
                <span class="font-semibold text-lg">Köken:</span>
                <p class="text-base">${word.Öz || 'Köken bilgisi bulunmamaktadır.'}</p>
            </div>
        </div>
    `;
}

function clearResult() {
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    displaySearchHistory();
}

function updateSearchHistory(query) {
    const historyIndex = searchHistory.indexOf(query);
    if (historyIndex > -1) {
        searchHistory.splice(historyIndex, 1);
    }
    searchHistory.unshift(query);

    if (searchHistory.length > 12) {
        searchHistory.pop();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function displaySearchHistory() {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const searchInput = document.getElementById('searchInput');

    if (searchInput === document.activeElement && !searchInput.value.trim() && searchHistory.length > 0) {
        suggestionsDiv.innerHTML = '';
        searchHistory.slice(0, 12).forEach(history => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
            suggestion.innerHTML = `<span class="font-bold">${history}</span>`;

            suggestion.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const selectedWord = allWords.find(row => row.Sözcük === history);
                if (selectedWord) selectWord(selectedWord);
            });
            suggestionsDiv.appendChild(suggestion);
        });
        suggestionsContainer.classList.remove('hidden');
    }
}

function toggleFeedbackForm() {
    const feedbackModal = document.getElementById('feedbackModal');
    feedbackModal.classList.toggle('hidden');
}

function submitFeedback() {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    if (!feedbackText) {
        alert('Lütfen geri bildirim yazın.');
        return;
    }

    const tarih = new Date().toLocaleString('tr-TR');

    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { "Tarih": tarih, "Mesaj": feedbackText } })
    })
        .then(response => response.json())
        .then(() => {
            alert('Geri bildiriminiz alındı, teşekkür ederiz!');
            toggleFeedbackForm();
        })
        .catch(error => {
            console.error('Geri bildirim gönderilirken hata oluştu:', error);
            alert('Bir hata oluştu, lütfen tekrar deneyin.');
        });
}

// Ana fonksiyonu başlat
fetchWords();
