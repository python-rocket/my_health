// Preferences storage using file-based storage via API

export interface Preferences {
    favoriteChannels: string[];
    favoriteSolutions: string[];
    pubmedPreferences?: {
        startDate: string | null;
        endDate: string | null;
        publicationTypes: string[];
    };
}

export async function getPreferences(): Promise<Preferences> {
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

export async function savePreferences(preferences: Preferences): Promise<void> {
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

