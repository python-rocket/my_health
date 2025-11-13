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

export async function fetchChannelRecommendations(): Promise<Array<{name: string, channelId: string | null, visitCount: number}>> {
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
    normalized_test_object?: string | null;
    result_value: number | null;
    result_unit: string | null;
    reference_value: number | null;
    comments: string | null;
    flag: string | null;
    testing_date: string | null;
    testing_institution: string | null;
    testing_location: string | null;
    updated_at: string | null;
    updated_at_date: string | null;
}

export async function fetchTestingResults(sortColumn?: string, sortDirection?: 'ASC' | 'DESC'): Promise<TestingResult[]> {
    try {
        // Use FastAPI backend endpoint which normalizes test objects
        const url = `http://localhost:3002/testing-results`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // FastAPI returns { success: true, results: [...] }
        let results = data.results || data;
        
        // Apply client-side sorting if needed (FastAPI endpoint doesn't support sorting yet)
        if (sortColumn && results.length > 0) {
            const sortKey = sortColumn as keyof TestingResult;
            results = [...results].sort((a, b) => {
                const aVal = a[sortKey];
                const bVal = b[sortKey];
                
                // Handle null/undefined values
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                
                // Compare values
                if (aVal < bVal) return sortDirection === 'ASC' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'ASC' ? 1 : -1;
                return 0;
            });
        }
        
        return results;
    } catch (error) {
        console.error('Error fetching testing results:', error);
        throw error;
    }
}

export interface InsightsData {
    success: boolean;
    x_values: string[];
    y_values: number[];
    unit_label: string | null;
    reference_value: number | null;
    message?: string;
}

export async function fetchAvailableTestingObjects(): Promise<string[]> {
    try {
        const response = await fetch('http://localhost:3002/insights/testing-results/available-objects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Raw response from available-objects endpoint:', data);
        
        if (data.success && Array.isArray(data.test_objects)) {
            console.log('Successfully parsed test_objects array with', data.test_objects.length, 'items');
            return data.test_objects;
        }
        
        // If response format is unexpected, log it for debugging
        console.error('Unexpected response format:', data);
        throw new Error(`Invalid response format. Expected {success: true, test_objects: string[]}, got: ${JSON.stringify(data).substring(0, 200)}`);
    } catch (error) {
        console.error('Error fetching available testing objects:', error);
        throw error;
    }
}

export async function fetchInsightsData(testingObject: string): Promise<InsightsData> {
    try {
        const params = new URLSearchParams();
        params.append('testing_object', testingObject);
        
        const url = `http://localhost:3002/insights/testing-results/?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching insights data:', error);
        throw error;
    }
}

export interface PopularSolution {
    solution: string;
    video_count: number;
    pubmed_count: number;
}

export interface PopularSolutionsResponse {
    success: boolean;
    solutions: PopularSolution[];
}

export async function fetchPopularSolutions(): Promise<PopularSolutionsResponse> {
    try {
        const response = await fetch('http://localhost:3002/popular-solutions');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching popular solutions:', error);
        throw error;
    }
}

export interface SolutionVideo {
    channel_id: string;
    channel_name: string;
    video_id: string;
    video_title: string;
    video_summary: string | null;
}

export interface PubMedStudy {
    pmid: string;
    title: string | null;
    authors: string | null;
    publish_date: string | null;
    pmcid: string | null;
    abstract: string | null;
    publication_types: string | null;
    keywords: string | null;
}

export interface SolutionDetailsResponse {
    success: boolean;
    solution: string;
    videos: SolutionVideo[];
    studies: PubMedStudy[];
}

export async function fetchSolutionDetails(solutionName: string): Promise<SolutionDetailsResponse> {
    try {
        // URL encode the solution name to handle special characters
        const encodedSolutionName = encodeURIComponent(solutionName);
        const response = await fetch(`http://localhost:3002/solution-details/${encodedSolutionName}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching solution details:', error);
        throw error;
    }
}

