import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from current directory or parent directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try loading .env from current directory, then parent directories
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config(); // Also load from process.env (for shell-set variables)

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from parent directory
// Since dist/ is where compiled server.js is, we need to go up one level
app.use(express.static(path.join(__dirname, '..')));

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.PSQL_CONNECTION_STRING || process.env.DATABASE_URL,
});

// Preferences file path
const preferencesPath = path.join(__dirname, 'preferences.json');

// Endpoint to fetch channels
app.get('/api/channels', async (req, res) => {
    try {
        const query = 'SELECT name FROM channels WHERE name IS NOT NULL;';
        const result = await pool.query(query);
        const channels = result.rows.map(row => row.name);
        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

// Endpoint to fetch solutions
app.get('/api/solutions', async (req, res) => {
    try {
        const query = 'SELECT name FROM solutions WHERE name IS NOT NULL;';
        const result = await pool.query(query);
        const solutions = result.rows.map(row => row.name);
        res.json(solutions);
    } catch (error) {
        console.error('Error fetching solutions:', error);
        res.status(500).json({ error: 'Failed to fetch solutions' });
    }
});

// Endpoint to fetch unique publication types from pubmed_studies
app.get('/api/pubmed/publication-types', async (req, res) => {
    try {
        const query = 'SELECT DISTINCT publication_types FROM pubmed_studies WHERE publication_types IS NOT NULL ORDER BY publication_types;';
        const result = await pool.query(query);
        // Extract unique publication types, handling potential JSON arrays or strings
        const publicationTypesSet = new Set<string>();
        result.rows.forEach(row => {
            if (row.publication_types) {
                try {
                    // Try to parse as JSON array
                    let parsed = row.publication_types;
                    // If it's a string that looks like JSON, parse it
                    if (typeof parsed === 'string' && (parsed.trim().startsWith('{') || parsed.trim().startsWith('['))) {
                        parsed = JSON.parse(parsed);
                    }
                    
                    if (Array.isArray(parsed)) {
                        parsed.forEach((type: string) => {
                            if (type && typeof type === 'string') {
                                publicationTypesSet.add(type.trim());
                            }
                        });
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        // Handle object format like {"Journal Article", "Randomized Controlled Trial"}
                        // Extract values from object
                        Object.values(parsed).forEach((type: any) => {
                            if (type && typeof type === 'string') {
                                publicationTypesSet.add(type.trim());
                            }
                        });
                    } else if (typeof parsed === 'string') {
                        // If it's a plain string, try to extract individual types
                        // Handle format like {"Journal Article","Randomized Controlled Trial"}
                        const match = parsed.match(/"([^"]+)"/g);
                        if (match) {
                            match.forEach(m => {
                                const type = m.replace(/"/g, '').trim();
                                if (type) {
                                    publicationTypesSet.add(type);
                                }
                            });
                        } else {
                            publicationTypesSet.add(parsed.trim());
                        }
                    }
                } catch (e) {
                    // If parsing fails, try to extract types from string format
                    const parsed = row.publication_types;
                    if (typeof parsed === 'string') {
                        const match = parsed.match(/"([^"]+)"/g);
                        if (match) {
                            match.forEach(m => {
                                const type = m.replace(/"/g, '').trim();
                                if (type) {
                                    publicationTypesSet.add(type);
                                }
                            });
                        } else {
                            publicationTypesSet.add(parsed.trim());
                        }
                    }
                }
            }
        });
        const publicationTypes = Array.from(publicationTypesSet).sort();
        res.json(publicationTypes);
    } catch (error) {
        console.error('Error fetching publication types:', error);
        res.status(500).json({ error: 'Failed to fetch publication types' });
    }
});

// Endpoint to get preferences
app.get('/api/preferences', (req, res) => {
    try {
        if (fs.existsSync(preferencesPath)) {
            const data = fs.readFileSync(preferencesPath, 'utf8');
            const preferences = JSON.parse(data);
            res.json(preferences);
        } else {
            // Return default preferences if file doesn't exist
            const defaultPreferences = {
                favoriteChannels: [],
                favoriteSolutions: [],
                pubmedPreferences: {
                    startDate: null,
                    endDate: null,
                    publicationTypes: []
                }
            };
            res.json(defaultPreferences);
        }
    } catch (error) {
        console.error('Error reading preferences:', error);
        res.status(500).json({ error: 'Failed to read preferences' });
    }
});

// Endpoint to save preferences
app.post('/api/preferences', (req, res) => {
    try {
        const preferences = req.body;
        fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

// Endpoint to get channel recommendations based on favorite channels
app.get('/api/recommendations/channels', async (req, res) => {
    try {
        // Get user preferences
        let preferences;
        if (fs.existsSync(preferencesPath)) {
            const data = fs.readFileSync(preferencesPath, 'utf8');
            preferences = JSON.parse(data);
        } else {
            preferences = { favoriteChannels: [] };
        }

        const favoriteChannels = preferences.favoriteChannels || [];
        
        // If no favorite channels, return empty array
        if (favoriteChannels.length === 0) {
            return res.json([]);
        }

        // Map channel names to IDs
        const channelNamePlaceholders = favoriteChannels.map((_: string, i: number) => `$${i + 1}`).join(', ');
        const getChannelIdsQuery = `SELECT id FROM channels WHERE name IN (${channelNamePlaceholders})`;
        const channelIdsResult = await pool.query(getChannelIdsQuery, favoriteChannels);
        const channelIds = channelIdsResult.rows.map(row => row.id);

        if (channelIds.length === 0) {
            return res.json([]);
        }

        // Query for guest appearances across all favorite channels
        const channelIdPlaceholders = channelIds.map((_: string, i: number) => `$${i + 1}`).join(', ');
        const favoriteNamePlaceholders = favoriteChannels.map((_: string, i: number) => `$${channelIds.length + i + 1}`).join(', ');
        
        const recommendationsQuery = `
            WITH guest_appearances AS (
                SELECT 
                    cr.youtube_channel_id,
                    cr.expert_name,
                    COUNT(*) as visit_count
                FROM v_channel_relations cr
                WHERE cr.channel_id IN (${channelIdPlaceholders})
                    AND cr.youtube_channel_id IS NOT NULL
                    AND cr.youtube_channel_id != cr.channel_id
                    AND cr.youtube_channel_id NOT LIKE 'http%'
                    AND cr.youtube_channel_id NOT LIKE 'https%'
                GROUP BY cr.youtube_channel_id, cr.expert_name
            )
            SELECT 
                COALESCE(
                    (SELECT c.name FROM channels c WHERE c.id = ga.youtube_channel_id LIMIT 1),
                    (SELECT c.name FROM channels c WHERE c.name = ga.expert_name LIMIT 1),
                    ga.expert_name
                ) as name,
                SUM(ga.visit_count) as total_visits
            FROM guest_appearances ga
            WHERE COALESCE(
                (SELECT c.name FROM channels c WHERE c.id = ga.youtube_channel_id LIMIT 1),
                (SELECT c.name FROM channels c WHERE c.name = ga.expert_name LIMIT 1),
                ga.expert_name
            ) IS NOT NULL
                AND COALESCE(
                    (SELECT c.name FROM channels c WHERE c.id = ga.youtube_channel_id LIMIT 1),
                    (SELECT c.name FROM channels c WHERE c.name = ga.expert_name LIMIT 1),
                    ga.expert_name
                ) NOT IN (${favoriteNamePlaceholders})
            GROUP BY name
            ORDER BY total_visits DESC
            LIMIT 3;
        `;

        const params = [...channelIds, ...favoriteChannels];
        const result = await pool.query(recommendationsQuery, params);
        
        const recommendations = result.rows.map(row => ({
            name: row.name,
            visitCount: parseInt(row.total_visits) || 0
        }));

        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching channel recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch channel recommendations' });
    }
});

// Endpoint to fetch testing results
app.get('/api/testing-results', async (req, res) => {
    try {
        // Get sort parameters from query string
        const sortColumn = req.query.sort as string || 'updated_at';
        const sortDirection = req.query.direction as string || 'DESC';
        
        // Validate sort column to prevent SQL injection
        const allowedSortColumns = ['id', 'test_object', 'result_value', 'result_unit', 'reference_value', 'comments', 'flag', 'testing_date', 'testing_institution', 'testing_location', 'updated_at', 'updated_at_date'];
        const validSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'updated_at';
        
        // Validate sort direction
        const validSortDirection = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        // Check which optional columns exist
        let hasTestingDateColumn = false;
        let hasTestingInstitutionColumn = false;
        let hasTestingLocationColumn = false;
        try {
            const checkColumnQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'testing_results' 
                AND column_name IN ('testing_date', 'testing_institution', 'testing_location')
            `;
            const columnCheck = await pool.query(checkColumnQuery);
            const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
            hasTestingDateColumn = existingColumns.includes('testing_date');
            hasTestingInstitutionColumn = existingColumns.includes('testing_institution');
            hasTestingLocationColumn = existingColumns.includes('testing_location');
        } catch (err) {
            console.warn('Could not check for optional columns:', err);
        }
        
        // Build SELECT clause - include optional columns only if they exist
        const selectColumns = [
            'id',
            'test_object',
            'result_value',
            'result_unit',
            'reference_value',
            'comments',
            'flag',
            ...(hasTestingDateColumn ? ['testing_date'] : []),
            ...(hasTestingInstitutionColumn ? ['testing_institution'] : []),
            ...(hasTestingLocationColumn ? ['testing_location'] : []),
            'updated_at',
            'updated_at_date'
        ].join(',\n                ');
        
        // Adjust sort column if requested column doesn't exist
        let finalSortColumn = validSortColumn;
        if (validSortColumn === 'testing_date' && !hasTestingDateColumn) {
            finalSortColumn = 'updated_at';
        } else if (validSortColumn === 'testing_institution' && !hasTestingInstitutionColumn) {
            finalSortColumn = 'updated_at';
        } else if (validSortColumn === 'testing_location' && !hasTestingLocationColumn) {
            finalSortColumn = 'updated_at';
        }
        
        const query = `
            SELECT 
                ${selectColumns}
            FROM testing_results
            ORDER BY ${finalSortColumn} ${validSortDirection}
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching testing results:', error);
        res.status(500).json({ error: 'Failed to fetch testing results', details: error instanceof Error ? error.message : String(error) });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

