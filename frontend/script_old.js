const categories = [
    { key: 'possible causes', label: 'Possible Causes' },
    { key: 'natural remedies', label: 'Natural Remedies' },
    { key: 'accupressure points', label: 'Accupressure Points' },
    { key: 'mudras', label: 'Mudras' },
    { key: 'doctor suggestions', label: 'Doctor Suggestions' }
];

let parsedSections = {};
let activeCategory = categories[0].key;

const uploadInput = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const analyzeBtn = document.getElementById('analyzeBtn');
const categoryButtons = document.getElementById('categoryButtons');
const resultPanel = document.getElementById('resultPanel');
const resultTitle = document.getElementById('resultTitle');
const resultList = document.getElementById('resultList');

uploadBtn.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', () => {
    if (uploadInput.files.length > 0) {
        uploadStatus.textContent = uploadInput.files[0].name;
    } else {
        uploadStatus.textContent = 'No image selected';
    }
});

analyzeBtn.addEventListener('click', analyzeSymptoms);

function normalizeHeading(text) {
    const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (normalized.includes('possible cause')) return 'possible causes';
    if (normalized.includes('natural remedy')) return 'natural remedies';
    if (normalized.includes('accupressure')) return 'accupressure points';
    if (normalized.includes('mudra')) return 'mudras';
    if (normalized.includes('doctor') || normalized.includes('specialist')) return 'doctor suggestions';
    return 'possible causes';
}

function parseResponse(answer) {
    const sections = {};
    categories.forEach(cat => sections[cat.key] = []);
    let currentKey = 'possible causes';

    const lines = (answer || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    lines.forEach(line => {
        const headingMatch = line.match(/^(possible causes|natural remedies|accupressure points|mudras|doctor suggestions|specialist|specialist recommendation)\s*[:\-]*$/i);
        if (headingMatch) {
            currentKey = normalizeHeading(headingMatch[1]);
            return;
        }

        const listMatch = line.match(/^[-*\d\.\s]+(.+)$/);
        const itemText = listMatch ? listMatch[1].trim() : line;

        if (itemText.length > 0) {
            sections[currentKey].push(itemText);
        }
    });

    // If the API did not produce any structured headings, keep all text items under possible causes
    if (Object.values(sections).every(items => items.length === 0)) {
        sections['possible causes'] = lines.map(line => line.replace(/^[-*\d\.\s]+/, '').trim());
    }

    return sections;
}

function renderCategoryButtons() {
    categoryButtons.innerHTML = categories.map(cat => {
        const activeClass = cat.key === activeCategory ? 'active' : '';
        return `<button type="button" class="category-button ${activeClass}" data-key="${cat.key}">${cat.label}</button>`;
    }).join('');

    categoryButtons.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => {
            const selected = button.dataset.key;
            activeCategory = selected;
            renderCategoryButtons();
            renderResults();
        });
    });
}

function formatItemText(text) {
    const important = /important|key|priority|best|recommended/i.test(text);
    const words = text.split(' ');
    if (words.length > 4) {
        const firstPart = words.slice(0, 3).join(' ');
        const rest = words.slice(3).join(' ');
        return `<strong>${firstPart}</strong> ${rest}${important ? '' : ''}`;
    }
    return `<strong>${text}</strong>`;
}

function renderResults() {
    const items = parsedSections[activeCategory] || [];
    const label = categories.find(cat => cat.key === activeCategory)?.label || 'Result';

    resultTitle.textContent = label;
    resultList.innerHTML = items.length
        ? items.map((item, idx) => {
            const highlightClass = idx === 0 || /important|best|priority|recommended/i.test(item) ? 'highlight' : '';
            return `<li class="${highlightClass}">${formatItemText(item)}</li>`;
        }).join('')
        : '<li>No details available for this category yet.</li>';

    resultPanel.classList.remove('hidden');
}

async function analyzeSymptoms() {
    const input = document.getElementById('symptomInput').value.trim();
    if (!input) {
        alert('Please enter your symptoms.');
        return;
    }

    analyzeBtn.textContent = 'Loading...';
    analyzeBtn.disabled = true;
    resultPanel.classList.add('hidden');

    try {
        const body = { symptoms: input };
        if (uploadInput.files.length > 0) {
            body.imageName = uploadInput.files[0].name;
        }

        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        parsedSections = parseResponse(data.answer || data.error || '');
        activeCategory = categories[0].key;
        renderCategoryButtons();
        renderResults();
    } catch (error) {
        parsedSections = {
            'possible causes': ['Unable to connect to the server. Please try again later.'],
            'natural remedies': [],
            'accupressure points': [],
            'mudras': [],
            'doctor suggestions': []
        };
        activeCategory = 'possible causes';
        renderCategoryButtons();
        renderResults();
    } finally {
        analyzeBtn.textContent = 'UPLOAD';
        analyzeBtn.disabled = false;
    }
}

renderCategoryButtons();
resultPanel.classList.add('hidden');