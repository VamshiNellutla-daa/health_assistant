function renderResponse(answer) {
    const normalized = answer || '';
    const lines = normalized
        .split(/\r?\n/)          
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const blocks = [];
    let currentTitle = 'Response';
    let currentItems = [];

    lines.forEach(line => {
        const titleMatch = line.match(/^\s*(?:\d+\.|[A-Za-z ]+:)\s*(.*)$/);
        if (titleMatch && line.endsWith(':')) {
            if (currentItems.length) {
                blocks.push({ title: currentTitle, items: currentItems });
                currentItems = [];
            }
            currentTitle = line.replace(/:$/, '').trim();
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\./)) {
            currentItems.push(line.replace(/^[-*\d\.\s]+/, '').trim());
        } else {
            currentItems.push(line);
        }
    });

    if (currentItems.length) {
        blocks.push({ title: currentTitle, items: currentItems });
    }

    const html = blocks.map((block, index) => {
        const title = block.title || `Section ${index + 1}`;
        const listItems = block.items.map(item => {
            const words = item.split(' ');
            if (words.length <= 4) {
                return `<li><strong>${item}</strong></li>`;
            }
            const firstPart = words.slice(0, 3).join(' ');
            const rest = words.slice(3).join(' ');
            return `<li><strong>${firstPart}</strong> ${rest}</li>`;
        }).join('');

        return `
            <div class="block">
                <h2>${title}</h2>
                <ul>${listItems}</ul>
            </div>
        `;
    }).join('');

    return html || '<div class="block"><h2>Result</h2><p>No response received.</p></div>';
}

async function analyzeSymptoms() {
    const input = document.getElementById('symptomInput').value.trim();
    const resultDiv = document.getElementById('result');
    const loading = document.getElementById('loading');

    if (!input) {
        alert('Please enter symptoms.');
        return;
    }

    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    resultDiv.innerHTML = '';

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms: input })
        });

        const data = await response.json();
        resultDiv.innerHTML = renderResponse(data.answer || data.error || 'No response available.');
        resultDiv.classList.remove('hidden');
    } catch (error) {
        resultDiv.innerHTML = '<div class="block"><h2>Error</h2><ul><li>Unable to connect to the server. Please try again later.</li></ul></div>';
        resultDiv.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
}