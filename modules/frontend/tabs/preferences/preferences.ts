import { fetchAllChannels, fetchAllSolutions, fetchPublicationTypes } from '../../utils/api.js';
import { getPreferences, savePreferences, Preferences } from '../../utils/preferences.js';

export async function init() {
    await displayPreferencesChannels();
    await displayPreferencesSolutions();
    await displayPubMedPreferences();
    initPubMedPreferences();
}

export async function onActivate() {
    // Refresh when tab becomes active
    await displayPreferencesChannels();
    await displayPreferencesSolutions();
    await displayPubMedPreferences();
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
    
    const updatedPrefs: Preferences = {
        ...prefs,
        pubmedPreferences: pubmedPrefs
    };
    
    await savePreferences(updatedPrefs);
    await updatePubMedPreferencesUI();
}

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
    
    const updatedPrefs: Preferences = {
        ...prefs,
        pubmedPreferences: pubmedPrefs
    };
    
    await savePreferences(updatedPrefs);
}

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
    
    // Dispatch event to notify other tabs (like cockpit) to refresh
    window.dispatchEvent(new CustomEvent('preferencesUpdated'));
}

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

