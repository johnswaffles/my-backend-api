const fetch = require('node-fetch');

async function testChat() {
    console.log('Testing /chat endpoint...');
    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Hello, I want to start a new adventure.",
                history: []
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Success! Response:', data);
        } else {
            console.error('Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Body:', text);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testChat();
