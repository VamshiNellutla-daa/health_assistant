async function analyzeSymptoms() {
    const input = document.getElementById('symptomInput').value;
    const resultDiv = document.getElementById('result');
    const loading = document.getElementById('loading');

    if (!input) return alert("Please enter symptoms.");

    // UI Updates
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms: input })
        });

        const data = await response.json();
        resultDiv.innerText = data.answer;
        resultDiv.classList.remove('hidden');
    } catch (error) {
        resultDiv.innerText = "Error connecting to the server.";
        resultDiv.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
}