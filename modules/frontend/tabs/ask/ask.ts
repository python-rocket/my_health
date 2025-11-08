import { askQuestion as apiAskQuestion } from '../../utils/api.js';
import { getPreferences, savePreferences } from '../../utils/preferences.js';
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
    const modeSelect = document.getElementById('ask-mode') as HTMLSelectElement;
    const masterToggle = document.getElementById('preferences-master-toggle') as HTMLInputElement;
    const channelsToggle = document.getElementById('pref-channels') as HTMLInputElement;
    const solutionsToggle = document.getElementById('pref-solutions') as HTMLInputElement;
    const pubmedToggle = document.getElementById('pref-pubmed') as HTMLInputElement;
    const preferenceCategories = document.getElementById('preference-categories');
    
    if (!askInput || !askButton || !askResponse || !modeSelect || !masterToggle || 
        !channelsToggle || !solutionsToggle || !pubmedToggle || !preferenceCategories) return;
    
    // Load saved preference states
    loadPreferenceStates();
    
    // Master toggle handler
    masterToggle.addEventListener('change', () => {
        const enabled = masterToggle.checked;
        channelsToggle.checked = enabled;
        solutionsToggle.checked = enabled;
        pubmedToggle.checked = enabled;
        preferenceCategories.style.display = enabled ? 'flex' : 'none';
        savePreferenceStates();
    });
    
    // Category toggles handler
    [channelsToggle, solutionsToggle, pubmedToggle].forEach(toggle => {
        toggle.addEventListener('change', () => {
            // If all categories are unchecked, uncheck master
            if (!channelsToggle.checked && !solutionsToggle.checked && !pubmedToggle.checked) {
                masterToggle.checked = false;
                preferenceCategories.style.display = 'none';
            } else {
                // If any category is checked, show categories and check master
                preferenceCategories.style.display = 'flex';
                masterToggle.checked = true;
            }
            savePreferenceStates();
        });
    });
    
    // Show/hide categories based on master toggle
    masterToggle.addEventListener('change', () => {
        preferenceCategories.style.display = masterToggle.checked ? 'flex' : 'none';
    });
    
    const handleAsk = async () => {
        const prompt = askInput.value.trim();
        if (!prompt) {
            askResponse.innerHTML = '<div class="error">Please enter a question or prompt.</div>';
            return;
        }
        
        // Disable button and show loading
        askButton.disabled = true;
        askButton.textContent = 'Asking...';
        askResponse.innerHTML = '<div class="ask-loading"><div class="ask-spinner"></div><span>Processing your question...</span></div>';
        
        try {
            // Get mode and determine max_iterations
            const mode = modeSelect.value;
            let maxIterations: number | undefined;
            if (mode === 'fast') {
                maxIterations = 1;
            } else if (mode === 'normal') {
                maxIterations = 3;
            } else {
                // thinking mode - no limit (undefined)
                maxIterations = undefined;
            }
            
            // Get preferences if enabled
            let preferences: any = null;
            if (masterToggle.checked) {
                const prefs = await getPreferences();
                preferences = {};
                
                if (channelsToggle.checked && prefs.favoriteChannels && prefs.favoriteChannels.length > 0) {
                    preferences.favoriteChannels = prefs.favoriteChannels;
                }
                
                if (solutionsToggle.checked && prefs.favoriteSolutions && prefs.favoriteSolutions.length > 0) {
                    preferences.favoriteSolutions = prefs.favoriteSolutions;
                }
                
                if (pubmedToggle.checked && prefs.pubmedPreferences) {
                    preferences.pubmedPreferences = prefs.pubmedPreferences;
                }
            }
            
            const response = await apiAskQuestion(prompt, preferences, maxIterations);
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

async function loadPreferenceStates() {
    try {
        const prefs = await getPreferences();
        if (prefs.askPreferences) {
            const masterToggle = document.getElementById('preferences-master-toggle') as HTMLInputElement;
            const channelsToggle = document.getElementById('pref-channels') as HTMLInputElement;
            const solutionsToggle = document.getElementById('pref-solutions') as HTMLInputElement;
            const pubmedToggle = document.getElementById('pref-pubmed') as HTMLInputElement;
            const preferenceCategories = document.getElementById('preference-categories');
            
            if (masterToggle) masterToggle.checked = prefs.askPreferences.enabled;
            if (channelsToggle) channelsToggle.checked = prefs.askPreferences.channelsEnabled;
            if (solutionsToggle) solutionsToggle.checked = prefs.askPreferences.solutionsEnabled;
            if (pubmedToggle) pubmedToggle.checked = prefs.askPreferences.pubmedEnabled;
            if (preferenceCategories) {
                preferenceCategories.style.display = prefs.askPreferences.enabled ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading preference states:', error);
    }
}

async function savePreferenceStates() {
    try {
        const prefs = await getPreferences();
        const masterToggle = document.getElementById('preferences-master-toggle') as HTMLInputElement;
        const channelsToggle = document.getElementById('pref-channels') as HTMLInputElement;
        const solutionsToggle = document.getElementById('pref-solutions') as HTMLInputElement;
        const pubmedToggle = document.getElementById('pref-pubmed') as HTMLInputElement;
        
        prefs.askPreferences = {
            enabled: masterToggle?.checked || false,
            channelsEnabled: channelsToggle?.checked || false,
            solutionsEnabled: solutionsToggle?.checked || false,
            pubmedEnabled: pubmedToggle?.checked || false
        };
        
        await savePreferences(prefs);
    } catch (error) {
        console.error('Error saving preference states:', error);
    }
}
