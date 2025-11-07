import { fetchAllChannels, fetchAllSolutions, fetchChannelRecommendations } from '../../utils/api.js';
import { getPreferences } from '../../utils/preferences.js';

export async function init() {
    // Initial load
    await displayChannels();
    await displaySolutions();
    await displayChannelRecommendations();
    
    // Listen for preference updates
    window.addEventListener('preferencesUpdated', async () => {
        // Only refresh if cockpit tab is currently active
        const cockpitTab = document.getElementById('cockpit');
        if (cockpitTab && cockpitTab.classList.contains('active')) {
            await displayChannels();
            await displaySolutions();
            await displayChannelRecommendations();
        }
    });
}

export async function onActivate() {
    // Refresh when tab becomes active
    await displayChannels();
    await displaySolutions();
    await displayChannelRecommendations();
}

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
            .map(rec => `<li class="channel-item">${rec.name} <span style="color: #86868b; font-size: 12px;">(${rec.visitCount} visits)</span></li>`)
            .join('');
    } catch (error) {
        recommendationsList.innerHTML = `<li class="error">Error loading recommendations: ${error}</li>`;
    }
}

