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
  } catch (error) {
    console.error('VERİ ÇEKME HATASI:', error);
    document.getElementById('result').innerHTML =
      '<p style="color: red;">VERİLER YÜKLENİRKEN HATA OLUŞTU. LÜTFEN SAYFAYI YENİLEYİN.</p>';
  }
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const suggestionsDiv = document.getElementById('suggestions');
  displaySearchHistory();

  searchInput.addEventListener('input', function () {
    const rawQuery = this.value.trim();
    const query = normalizeString(rawQuery);
    if (!query) {
      suggestionsDiv.innerHTML = '';
      if (lastSelectedWord) showResult(lastSelectedWord);
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

  searchInput.addEventListener('blur', () => {
    setTimeout(() => document.getElementById('suggestions').innerHTML = '', 100);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstSuggestion = suggestionsDiv.querySelector('.suggestion');
      if (firstSuggestion) firstSuggestion.click();
    }
  });
}

function displaySuggestions(matches, query) {
  const suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  if (matches.length === 0) {
    suggestionsDiv.innerHTML = '<div class="suggestion">Sonuç bulunamadı</div>';
    return;
  }

  matches.sort((a, b) => {
    const aWord = a.type === 'main' ? a.word : a.synonym;
    const bWord = b.type === 'main' ? b.word : b.synonym;
    return normalizeString(aWord).localeCompare(normalizeString(bWord));
  }).slice(0, 12).forEach(match => {
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion';

    if (match.type === 'main') {
      suggestion.innerHTML = `<span class="main-word">${match.word}</span>`;
    } else {
      suggestion.innerHTML = `
        <span class="main-word">${match.synonym}</span>
        <span class="synonym-hint">${match.main}</span>
      `;
    }

    suggestion.addEventListener('click', () => selectWord(match.data));
    suggestionsDiv.appendChild(suggestion);
  });
}

function selectWord(word) {
  lastSelectedWord = word;
  document.getElementById('searchInput').value = word.Sözcük;
  document.getElementById('suggestions').innerHTML = '';
  showResult(word);
  updateSearchHistory(word.Sözcük);
}

function showResult(word) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="word-title">${word.Sözcük}</div>
    <div class="synonyms-list">${word['Eş Anlamlılar'] || ''}</div>
    <div class="description">${word.Açıklama || 'Açıklama bulunmamaktadır.'}</div>
    <div class="etymology">${word.Öz || ''}</div>
  `;
}

function clearResult() {
  document.getElementById('result').innerHTML = '';
  document.getElementById('searchInput').value = '';
}

function updateSearchHistory(query) {
  if (!searchHistory.includes(query)) {
    searchHistory.unshift(query);
  }
  if (searchHistory.length > 12) {
    searchHistory.pop();
  }
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  displaySearchHistory();
}

function displaySearchHistory() {
  const suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput === document.activeElement && !searchInput.value.trim()) {
    searchHistory.slice(0, 12).forEach(history => {
      const suggestion = document.createElement('div');
      suggestion.className = 'suggestion';
      suggestion.innerHTML = `<span class="main-word">${history}</span>`;
      suggestion.addEventListener('click', () => {
        searchInput.value = history;
        const selectedWord = allWords.find(row => row.Sözcük === history);
        if (selectedWord) showResult(selectedWord);
      });
      suggestionsDiv.appendChild(suggestion);
    });
  }
}

function toggleFeedbackForm() {
  const feedbackForm = document.getElementById('feedbackForm');
  feedbackForm.style.display = feedbackForm.style.display === 'block' ? 'none' : 'block';
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
    document.getElementById('feedbackText').value = '';
    toggleFeedbackForm();
    alert('Geri bildiriminiz alındı, teşekkür ederiz!');
  })
  .catch(error => {
    console.error('Geri bildirim gönderilirken hata oluştu:', error);
    alert('Bir hata oluştu, lütfen tekrar deneyin.');
  });
}

fetchWords();
