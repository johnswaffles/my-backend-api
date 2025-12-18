const fetch = require('node-fetch');
require('dotenv').config();

async function getModels() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/models', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Available Models:");
        data.forEach(model => {
            console.log(`- ${model.name} (ID: ${model.model_id})`);
            console.log(`  Description: ${model.description}`);
        });
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

getModels();
