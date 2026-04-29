const categories = [
    { key: 'possible causes', label: 'Possible Causes' },
    { key: 'natural remedies', label: 'Natural Remedies' },
    { key: 'accupressure points', label: 'Accupressure Points' },
    { key: 'mudras', label: 'Mudras' },
    { key: 'doctor suggestion', label: 'Doctor Suggestion' }
];

let parsedSections = {};

const showResultsBtn = document.getElementById('showResultsBtn');
const categoryButtons = document.getElementById('categoryButtons');
const imageInput = document.getElementById('imageInput');
const imageName = document.getElementById('imageName');
const removeImageBtn = document.getElementById('removeImageBtn');

showResultsBtn.addEventListener('click', showResults);
imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    imageName.textContent = file ? file.name : 'No image selected';
    removeImageBtn.style.display = file ? 'inline-flex' : 'none';
});

removeImageBtn.addEventListener('click', () => {
    imageInput.value = '';
    imageName.textContent = 'No image selected';
    removeImageBtn.style.display = 'none';
});

function normalizeHeading(text) {
    const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (normalized.includes('possible cause')) return 'possible causes';
    if (normalized.includes('natural remedy')) return 'natural remedies';
    if (normalized.includes('accupressure')) return 'accupressure points';
    if (normalized.includes('mudra')) return 'mudras';
    if (normalized.includes('doctor suggestion') || normalized.includes('doctor recommendations') || normalized.includes('doctor advice')) return 'doctor suggestion';
    return 'possible causes';
}

function parseResponse(answer) {
    const sections = {};
    categories.forEach(cat => sections[cat.key] = []);

    const cleanText = (answer || '').replace(/\r\n/g, '\n');
    const lines = cleanText.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);

    let currentKey = 'possible causes';

    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('possible cause') && (lowerLine.includes(':') || lowerLine.includes('**') || lowerLine.length < 50)) {
            currentKey = 'possible causes';
            return;
        }
        if ((lowerLine.includes('natural remedy') || lowerLine.includes('home care') || lowerLine.includes('remedies')) && (lowerLine.includes(':') || lowerLine.includes('**') || lowerLine.length < 50)) {
            currentKey = 'natural remedies';
            return;
        }
        if ((lowerLine.includes('accupressure') || lowerLine.includes('acupressure')) && (lowerLine.includes(':') || lowerLine.includes('**') || lowerLine.length < 50)) {
            currentKey = 'accupressure points';
            return;
        }
     if ((lowerLine.includes('mudras') || lowerLine.includes('mudra')) && (lowerLine.includes(':') || lowerLine.includes('**') || lowerLine.length < 50)) {

            currentKey = 'mudras';
            return;
        }
        if (lowerLine.includes('doctor suggestion') || lowerLine.includes('doctor suggestions') || lowerLine.includes('doctor advice') || lowerLine.includes('doctor recommendation')) {
            currentKey = 'doctor suggestion';
            return;
        }
        

        if (line.length > 0) {
            sections[currentKey].push(line.replace(/^[\u2022•\-\*\d\.\s]+/, '').trim());
        }
    });

    return sections;
}

function renderCategoryButtons() {
    categoryButtons.innerHTML = categories.map(cat => {
        const id = `results-${cat.key.replace(/\s+/g, '-')}`;
        return `
        <div class="category-container">
            <button type="button" class="category-button" data-key="${cat.key}">
                ${cat.label}
            </button>
            <div class="category-results" id="${id}">
                <ul></ul>
            </div>
        </div>
    `;
    }).join('');

    categoryButtons.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => {
            const categoryKey = button.dataset.key;
            const resultsDiv = document.getElementById(`results-${categoryKey.replace(/\s+/g, '-')}`);

            const isActive = resultsDiv.style.display === 'block';
            document.querySelectorAll('.category-results').forEach(div => div.style.display = 'none');
            document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active'));

            if (!isActive) {
                resultsDiv.style.display = 'block';
                button.classList.add('active');
                const resultList = resultsDiv.querySelector('ul');
                renderResults(categoryKey, resultList);
            }
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

function renderResults(categoryKey, resultListElement) {
    const items = parsedSections[categoryKey] || [];
    
    resultListElement.innerHTML = items.length
        ? items.map((item, idx) => {
            const highlightClass = idx === 0 || /important|best|priority|recommended/i.test(item) ? 'highlight' : '';
            return `<li class="${highlightClass}">${formatItemText(item)}</li>`;
        }).join('')
        : '<li>No details available for this category yet.</li>';
}

async function showResults() {
    const input = document.getElementById('symptomInput').value.trim();
    const hasImage = imageInput.files[0];
    if (!input && !hasImage) {
        alert('Please enter your symptoms or upload an image.');
        return;
    }

    showResultsBtn.textContent = 'Loading...';
    showResultsBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('symptoms', input);
        if (hasImage) {
            formData.append('image', imageInput.files[0]);
        }

        const response = await fetch('https://health-assistant-backend.onrender.com/analyze', {
            method: 'POST',
           // headers: { 'Content-Type': 'application/json' },
           // body: JSON.stringify(data)
            body:formData
        });

        const data = await response.json();
        parsedSections = parseResponse(data.answer || data.error || '');
        categoryButtons.classList.remove('hidden');
        renderCategoryButtons();
    } catch (error) {
        parsedSections = {
            'possible causes': ['Unable to connect to the server. Please try again later.'],
            'natural remedies': [],
            'accupressure points': [],
            'mudras': [],
            'doctor suggestion': []
        };
        categoryButtons.classList.remove('hidden');
        renderCategoryButtons();
    } finally {
        showResultsBtn.textContent = 'SHOW RESULTS';
        showResultsBtn.disabled = false;
    }
}

// Initially hide category buttons
categoryButtons.classList.add('hidden');
