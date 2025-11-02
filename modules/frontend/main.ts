// Preferences storage using file-based storage via API
interface Preferences {
    favoriteChannels: string[];
    favoriteSolutions: string[];
    pubmedPreferences?: {
        startDate: string | null;
        endDate: string | null;
        publicationTypes: string[];
    };
}

async function getPreferences(): Promise<Preferences> {
    try {
        const response = await fetch('http://localhost:3001/api/preferences');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const preferences = await response.json();
        return preferences;
    } catch (error) {
        console.error('Error fetching preferences:', error);
        return {
            favoriteChannels: [],
            favoriteSolutions: [],
            pubmedPreferences: {
                startDate: null,
                endDate: null,
                publicationTypes: []
            }
        };
    }
}

async function savePreferences(preferences: Preferences): Promise<void> {
    try {
        const response = await fetch('http://localhost:3001/api/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preferences),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        throw error;
    }
}

async function toggleFavoriteChannel(channel: string): Promise<void> {
    const prefs = await getPreferences();
    const index = prefs.favoriteChannels.indexOf(channel);
    if (index > -1) {
        prefs.favoriteChannels.splice(index, 1);
    } else {
        prefs.favoriteChannels.push(channel);
    }
    await savePreferences(prefs);
    await updatePreferencesUI();
}

async function toggleFavoriteSolution(solution: string): Promise<void> {
    const prefs = await getPreferences();
    const index = prefs.favoriteSolutions.indexOf(solution);
    if (index > -1) {
        prefs.favoriteSolutions.splice(index, 1);
    } else {
        prefs.favoriteSolutions.push(solution);
    }
    await savePreferences(prefs);
    await updatePreferencesUI();
}

// API functions to fetch data from backend
async function fetchAllChannels(): Promise<string[]> {
    // Query: SELECT name FROM channels WHERE name IS NOT NULL;
    try {
        const response = await fetch('http://localhost:3001/api/channels');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const channels = await response.json();
        return channels;
    } catch (error) {
        console.error('Error fetching channels:', error);
        throw error;
    }
}

async function fetchAllSolutions(): Promise<string[]> {
    // Query: SELECT name FROM solutions WHERE name IS NOT NULL;
    try {
        const response = await fetch('http://localhost:3001/api/solutions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const solutions = await response.json();
        return solutions;
    } catch (error) {
        console.error('Error fetching solutions:', error);
        throw error;
    }
}

// Fetch publication types from PubMed
async function fetchPublicationTypes(): Promise<string[]> {
    try {
        const response = await fetch('http://localhost:3001/api/pubmed/publication-types');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const types = await response.json();
        return types;
    } catch (error) {
        console.error('Error fetching publication types:', error);
        throw error;
    }
}

// Fetch channel recommendations
async function fetchChannelRecommendations(): Promise<Array<{name: string, visitCount: number}>> {
    try {
        const response = await fetch('http://localhost:3001/api/recommendations/channels');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const recommendations = await response.json();
        return recommendations;
    } catch (error) {
        console.error('Error fetching channel recommendations:', error);
        return [];
    }
}

// Display favorite channels in cockpit
async function displayChannels() {
    const channelsList = document.getElementById('channels-list');
    if (!channelsList) return;
    
    try {
        const allChannels = await fetchAllChannels();
        const prefs = await getPreferences();
        const favoriteChannels = allChannels.filter(ch => prefs.favoriteChannels.includes(ch));
        
        if (favoriteChannels.length === 0) {
            channelsList.innerHTML = '<li class="loading">No favorite channels selected. Go to Preferences to select some.</li>';
            return;
        }
        
        channelsList.innerHTML = favoriteChannels
            .map(channel => `<li class="channel-item">${channel}</li>`)
            .join('');
    } catch (error) {
        channelsList.innerHTML = `<li class="error">Error loading channels: ${error}</li>`;
    }
}

// Display favorite solutions in cockpit
async function displaySolutions() {
    const solutionsList = document.getElementById('solutions-list');
    if (!solutionsList) return;
    
    try {
        const allSolutions = await fetchAllSolutions();
        const prefs = await getPreferences();
        const favoriteSolutions = allSolutions.filter(sol => prefs.favoriteSolutions.includes(sol));
        
        if (favoriteSolutions.length === 0) {
            solutionsList.innerHTML = '<div class="loading">No favorite solutions selected. Go to Preferences to select some.</div>';
            return;
        }
        
        solutionsList.innerHTML = favoriteSolutions
            .map(solution => `<div class="solution-item">${solution}</div>`)
            .join('');
    } catch (error) {
        solutionsList.innerHTML = `<div class="error">Error loading solutions: ${error}</div>`;
    }
}

// Display channel recommendations in cockpit
async function displayChannelRecommendations() {
    const recommendationsList = document.getElementById('recommendations-list');
    if (!recommendationsList) return;
    
    try {
        const recommendations = await fetchChannelRecommendations();
        
        if (recommendations.length === 0) {
            recommendationsList.innerHTML = '<li class="loading">No recommendations available. Select favorite channels to get recommendations.</li>';
            return;
        }
        
        recommendationsList.innerHTML = recommendations
            .map(rec => `<li class="channel-item">${rec.name} <span style="color: #7f8c8d; font-size: 14px;">(${rec.visitCount} visits)</span></li>`)
            .join('');
    } catch (error) {
        recommendationsList.innerHTML = `<li class="error">Error loading recommendations: ${error}</li>`;
    }
}

// Display all channels in preferences with favorite status
async function displayPreferencesChannels() {
    const channelsList = document.getElementById('preferences-channels-list');
    if (!channelsList) return;
    
    try {
        const allChannels = await fetchAllChannels();
        const prefs = await getPreferences();
        
        channelsList.innerHTML = allChannels
            .map(channel => {
                const isFavorite = prefs.favoriteChannels.includes(channel);
                return `<li class="channel-item ${isFavorite ? 'favorite' : ''}" data-channel="${channel}">${channel}</li>`;
            })
            .join('');
        
        // Add click handlers
        channelsList.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', async () => {
                const channel = item.getAttribute('data-channel');
                if (channel) {
                    await toggleFavoriteChannel(channel);
                }
            });
        });
    } catch (error) {
        channelsList.innerHTML = `<li class="error">Error loading channels: ${error}</li>`;
    }
}

// Display all solutions in preferences with favorite status
async function displayPreferencesSolutions() {
    const solutionsList = document.getElementById('preferences-solutions-list');
    if (!solutionsList) return;
    
    try {
        const allSolutions = await fetchAllSolutions();
        const prefs = await getPreferences();
        
        solutionsList.innerHTML = allSolutions
            .map(solution => {
                const isFavorite = prefs.favoriteSolutions.includes(solution);
                return `<li class="solution-item ${isFavorite ? 'favorite' : ''}" data-solution="${solution}">${solution}</li>`;
            })
            .join('');
        
        // Add click handlers
        solutionsList.querySelectorAll('.solution-item').forEach(item => {
            item.addEventListener('click', async () => {
                const solution = item.getAttribute('data-solution');
                if (solution) {
                    await toggleFavoriteSolution(solution);
                }
            });
        });
    } catch (error) {
        solutionsList.innerHTML = `<li class="error">Error loading solutions: ${error}</li>`;
    }
}

// Display PubMed preferences
async function displayPubMedPreferences() {
    const pubmedContainer = document.getElementById('preferences-pubmed');
    if (!pubmedContainer) return;
    
    try {
        const prefs = await getPreferences();
        const pubmedPrefs = prefs.pubmedPreferences || {
            startDate: null,
            endDate: null,
            publicationTypes: []
        };
        
        // Set date inputs
        const startDateInput = document.getElementById('pubmed-start-date') as HTMLInputElement;
        const endDateInput = document.getElementById('pubmed-end-date') as HTMLInputElement;
        if (startDateInput) startDateInput.value = pubmedPrefs.startDate || '';
        if (endDateInput) endDateInput.value = pubmedPrefs.endDate || '';
        
        // Load and display publication types
        const publicationTypesList = document.getElementById('preferences-pubmed-types-list');
        if (!publicationTypesList) return;
        
        try {
            const allTypes = await fetchPublicationTypes();
            publicationTypesList.innerHTML = allTypes
                .map(type => {
                    const isSelected = pubmedPrefs.publicationTypes.includes(type);
                    // Escape HTML and quotes in the type for data attribute
                    const escapedType = type.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    return `<li class="solution-item ${isSelected ? 'favorite' : ''}" data-publication-type="${escapedType}">${type}</li>`;
                })
                .join('');
            
            // Add click handlers
            publicationTypesList.querySelectorAll('.solution-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    const type = item.getAttribute('data-publication-type');
                    if (type) {
                        await togglePublicationType(type);
                    }
                });
            });
        } catch (error) {
            publicationTypesList.innerHTML = `<li class="error">Error loading publication types: ${error}</li>`;
        }
    } catch (error) {
        console.error('Error displaying PubMed preferences:', error);
    }
}

// Toggle publication type selection
async function togglePublicationType(type: string): Promise<void> {
    const prefs = await getPreferences();
    const pubmedPrefs = prefs.pubmedPreferences || {
        startDate: null,
        endDate: null,
        publicationTypes: []
    };
    
    const index = pubmedPrefs.publicationTypes.indexOf(type);
    if (index > -1) {
        pubmedPrefs.publicationTypes.splice(index, 1);
    } else {
        pubmedPrefs.publicationTypes.push(type);
    }
    
    const updatedPrefs = {
        ...prefs,
        pubmedPreferences: pubmedPrefs
    };
    
    await savePreferences(updatedPrefs);
    await updatePubMedPreferencesUI();
}

// Update PubMed date preferences
async function updatePubMedDates(): Promise<void> {
    const startDateInput = document.getElementById('pubmed-start-date') as HTMLInputElement;
    const endDateInput = document.getElementById('pubmed-end-date') as HTMLInputElement;
    
    if (!startDateInput || !endDateInput) return;
    
    const prefs = await getPreferences();
    const pubmedPrefs = prefs.pubmedPreferences || {
        startDate: null,
        endDate: null,
        publicationTypes: []
    };
    
    pubmedPrefs.startDate = startDateInput.value || null;
    pubmedPrefs.endDate = endDateInput.value || null;
    
    const updatedPrefs = {
        ...prefs,
        pubmedPreferences: pubmedPrefs
    };
    
    await savePreferences(updatedPrefs);
}

// Update PubMed preferences UI after changes
async function updatePubMedPreferencesUI() {
    const publicationTypesList = document.getElementById('preferences-pubmed-types-list');
    if (!publicationTypesList) return;
    
    const prefs = await getPreferences();
    const pubmedPrefs = prefs.pubmedPreferences || {
        startDate: null,
        endDate: null,
        publicationTypes: []
    };
    
    publicationTypesList.querySelectorAll('.solution-item').forEach(item => {
        const type = item.getAttribute('data-publication-type');
        if (type) {
            if (pubmedPrefs.publicationTypes.includes(type)) {
                item.classList.add('favorite');
            } else {
                item.classList.remove('favorite');
            }
        }
    });
}

// Update preferences UI after toggling
async function updatePreferencesUI() {
    const channelsList = document.getElementById('preferences-channels-list');
    const solutionsList = document.getElementById('preferences-solutions-list');
    
    const prefs = await getPreferences();
    
    if (channelsList) {
        channelsList.querySelectorAll('.channel-item').forEach(item => {
            const channel = item.getAttribute('data-channel');
            if (channel) {
                if (prefs.favoriteChannels.includes(channel)) {
                    item.classList.add('favorite');
                } else {
                    item.classList.remove('favorite');
                }
            }
        });
    }
    
    if (solutionsList) {
        solutionsList.querySelectorAll('.solution-item').forEach(item => {
            const solution = item.getAttribute('data-solution');
            if (solution) {
                if (prefs.favoriteSolutions.includes(solution)) {
                    item.classList.add('favorite');
                } else {
                    item.classList.remove('favorite');
                }
            }
        });
    }
    
    // Refresh cockpit view
    await displayChannels();
    await displaySolutions();
    await displayChannelRecommendations();
}

// Tab switching functionality
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Load preferences data when switching to preferences tab
            if (targetTab === 'preferences') {
                displayPreferencesChannels();
                displayPreferencesSolutions();
                displayPubMedPreferences();
            }
            
            // Load cockpit data when switching to cockpit tab
            if (targetTab === 'cockpit') {
                displayChannels();
                displaySolutions();
                displayChannelRecommendations();
            }
        });
    });
}

// Ask functionality
async function askQuestion(prompt: string): Promise<string> {
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
        
        const response = await fetch('http://localhost:3002/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: enhancedPrompt }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // Handle nested response structure
        if (data.response && typeof data.response === 'object') {
            // If response is an object with a 'result' property, use that
            if (data.response.result) {
                return data.response.result;
            }
            // If response is an object with other properties, stringify it
            return JSON.stringify(data.response, null, 2);
        }
        // If response is a string, use it directly
        return data.response || data.error || 'No response received';
    } catch (error) {
        console.error('Error asking question:', error);
        throw error;
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
            const response = await askQuestion(prompt);
            // Escape HTML to prevent XSS, but preserve line breaks
            const escapedResponse = response
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
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

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAskTab();
    initPubMedPreferences();
    displayChannels();
    displaySolutions();
    displayChannelRecommendations();
});

// Initialize PubMed preferences event listeners
function initPubMedPreferences() {
    const startDateInput = document.getElementById('pubmed-start-date') as HTMLInputElement;
    const endDateInput = document.getElementById('pubmed-end-date') as HTMLInputElement;
    
    if (startDateInput) {
        startDateInput.addEventListener('change', updatePubMedDates);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', updatePubMedDates);
    }
}
