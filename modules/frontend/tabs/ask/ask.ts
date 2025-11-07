import { askQuestion as apiAskQuestion } from '../../utils/api.js';
import { getPreferences } from '../../utils/preferences.js';
import { escapeHtml } from '../../utils/html-escape.js';

export async function init() {
    initAskTab();
}

export async function onActivate() {
    // Focus input when tab becomes active
    const askInput = document.getElementById('ask-input') as HTMLInputElement;
    if (askInput) {
        askInput.focus();
    }
}

function initAskTab() {
    const askInput = document.getElementById('ask-input') as HTMLInputElement;
    const askButton = document.getElementById('ask-button') as HTMLButtonElement;
    const askResponse = document.getElementById('ask-response');
    
    if (!askInput || !askButton || !askResponse) return;
    
    const handleAsk = async () => {
        const prompt = askInput.value.trim();
        if (!prompt) {
            askResponse.innerHTML = '<div class="error">Please enter a question or prompt.</div>';
            return;
        }
        
        // Disable button and show loading
        askButton.disabled = true;
        askButton.textContent = 'Asking...';
        askResponse.innerHTML = '<div class="loading">Processing your question...</div>';
        
        try {
            // Get user preferences to filter channels
            const prefs = await getPreferences();
            let enhancedPrompt = prompt;
            
            // If user has favorite channels, add instruction to only consider those
            if (prefs.favoriteChannels && prefs.favoriteChannels.length > 0) {
                const channelsList = prefs.favoriteChannels.join(', ');
                enhancedPrompt = `${prompt}\n\nIMPORTANT: Only consider YouTube channels from the following list in your answer: ${channelsList}. Ignore any information from other channels.`;
            }
            
            // Add PubMed preferences if they exist
            if (prefs.pubmedPreferences) {
                const { startDate, endDate, publicationTypes } = prefs.pubmedPreferences;
                let pubmedContext = '';
                
                if (startDate || endDate || (publicationTypes && publicationTypes.length > 0)) {
                    pubmedContext = '\n\nPubMed Filter Requirements:';
                    
                    if (startDate || endDate) {
                        const start = startDate || 'any';
                        const end = endDate || 'any';
                        pubmedContext += ` Only consider studies published between ${start} and ${end}.`;
                    }
                    
                    if (publicationTypes && publicationTypes.length > 0) {
                        pubmedContext += ` Only consider studies with publication types: ${publicationTypes.join(', ')}.`;
                    }
                    
                    enhancedPrompt += pubmedContext;
                }
            }
            
            const response = await apiAskQuestion(enhancedPrompt);
            // Escape HTML to prevent XSS, but preserve line breaks
            const escapedResponse = escapeHtml(response);
            askResponse.innerHTML = `<div>${escapedResponse}</div>`;
        } catch (error) {
            console.error('Ask error:', error);
            askResponse.innerHTML = `<div class="error">Error: ${error}</div>`;
        } finally {
            askButton.disabled = false;
            askButton.textContent = 'Ask';
        }
    };
    
    askButton.addEventListener('click', handleAsk);
    askInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAsk();
        }
    });
}

