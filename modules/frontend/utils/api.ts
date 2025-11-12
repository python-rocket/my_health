// API functions to fetch data from backend

export async function fetchAllChannels(): Promise<string[]> {
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

export async function fetchAllSolutions(): Promise<string[]> {
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

export async function fetchPublicationTypes(): Promise<string[]> {
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

export async function fetchChannelRecommendations(): Promise<Array<{name: string, visitCount: number}>> {
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

export async function askQuestion(prompt: string, preferences?: any, maxIterations?: number): Promise<string> {
    try {
        const requestBody: any = { prompt };
        if (preferences) {
            requestBody.preferences = preferences;
        }
        if (maxIterations !== undefined) {
            requestBody.max_iterations = maxIterations;
        }
        
        const response = await fetch('http://localhost:3002/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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

export async function uploadTestingResults(file: File): Promise<{success: boolean, file_id?: string, file_path?: string, filename?: string}> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:3002/upload-testing-results', {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error uploading testing results:', error);
        throw error;
    }
}

export async function processTestingResults(fileId: string): Promise<{success: boolean, message: string, rows_inserted?: number}> {
    try {
        const response = await fetch('http://localhost:3002/process-testing-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: fileId }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error processing testing results:', error);
        throw error;
    }
}

export interface TestingResult {
    id: number;
    test_object: string | null;
    result_value: number | null;
    result_unit: string | null;
    reference_value: number | null;
    comments: string | null;
    flag: string | null;
    updated_at: string | null;
    updated_at_date: string | null;
}

export async function fetchTestingResults(): Promise<TestingResult[]> {
    try {
        const response = await fetch('http://localhost:3001/api/testing-results');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const results = await response.json();
        return results;
    } catch (error) {
        console.error('Error fetching testing results:', error);
        throw error;
    }
}

