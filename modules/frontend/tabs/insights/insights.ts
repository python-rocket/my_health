import { fetchAvailableTestingObjects, fetchInsightsData } from '../../utils/api.js';

// Chart.js will be loaded dynamically from CDN
let Chart: any = null;
let chartInstance: any = null;
let chartLoaded = false;

async function loadChartJS() {
    if (chartLoaded) return;
    
    try {
        // Dynamic import from CDN - TypeScript doesn't support CDN URLs, so we use any
        // @ts-ignore
        const chartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm');
        Chart = chartModule.Chart;
        chartModule.Chart.register(...chartModule.registerables);
        chartLoaded = true;
        console.log('Chart.js loaded successfully');
    } catch (error) {
        console.error('Failed to load Chart.js:', error);
        throw error;
    }
}

export async function init() {
    console.log('Insights tab init() called');
    // Setup dropdown listener first (it will retry if element not found)
    setupDropdownListener();
    // Load testing objects - this function has retry logic built in
    await loadTestingObjects();
}

export async function onActivate() {
    console.log('Insights tab onActivate() called');
    // Refresh available testing objects when tab becomes active
    await loadTestingObjects();
}

async function loadTestingObjects() {
    console.log('loadTestingObjects() called');
    
    // Try multiple times to find the element (in case DOM isn't ready)
    let select: HTMLSelectElement | null = null;
    for (let i = 0; i < 5; i++) {
        select = document.getElementById('testing-object-select') as HTMLSelectElement;
        if (select) {
            console.log(`Select element found on attempt ${i + 1}`);
            break;
        }
        console.log(`Select element not found, attempt ${i + 1}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!select) {
        console.error('Select element not found after multiple attempts!');
        console.log('Available elements with "testing" in id:', 
            Array.from(document.querySelectorAll('[id*="testing"]')).map(el => el.id));
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="error">Error: Could not find testing object select element. Check console for details.</div>`;
        }
        return;
    }
    
    console.log('Select element found:', select);
    
    try {
        select.disabled = true;
        console.log('Fetching available testing objects...');
        const testObjects = await fetchAvailableTestingObjects();
        
        console.log('Fetched testing objects:', testObjects);
        console.log('Type:', typeof testObjects, 'Is Array:', Array.isArray(testObjects), 'Length:', testObjects?.length);
        
        // Clear existing options except the first placeholder
        select.innerHTML = '<option value="">-- Select a testing object --</option>';
        
        // Add available testing objects
        if (Array.isArray(testObjects) && testObjects.length > 0) {
            console.log(`Adding ${testObjects.length} options to dropdown`);
            testObjects.forEach((obj, index) => {
                const option = document.createElement('option');
                option.value = obj;
                option.textContent = obj;
                select!.appendChild(option);
                if (index < 3) {
                    console.log(`Added option: ${obj}`);
                }
            });
            console.log(`Successfully added ${testObjects.length} options to dropdown`);
        } else {
            console.warn('No testing objects returned or invalid format:', testObjects);
            const chartContainer = document.getElementById('chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `<div class="error">No testing objects available. Response: ${JSON.stringify(testObjects).substring(0, 200)}</div>`;
            }
        }
        
        select.disabled = false;
        console.log('Dropdown population complete');
    } catch (error) {
        console.error('Error loading testing objects:', error);
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="error">Error loading testing objects: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
        }
        if (select) {
            select.disabled = false;
        }
    }
}

function setupDropdownListener() {
    // Try to find the select element, with retries
    let select: HTMLSelectElement | null = null;
    const maxAttempts = 10;
    let attempts = 0;
    
    const trySetup = () => {
        select = document.getElementById('testing-object-select') as HTMLSelectElement;
        if (select) {
            console.log('Setting up dropdown listener');
            setupListener(select);
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(trySetup, 100);
        } else {
            console.warn('Could not find select element for dropdown listener setup');
        }
    };
    
    trySetup();
}

function setupListener(select: HTMLSelectElement) {
    
    select.addEventListener('change', async (e) => {
        const target = e.target as HTMLSelectElement;
        const selectedObject = target.value;
        
        if (!selectedObject) {
            clearChart();
            return;
        }
        
        await loadChartData(selectedObject);
    });
}

async function loadChartData(testingObject: string) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    
    try {
        chartContainer.innerHTML = '<div class="loading">Loading chart data...</div>';
        
        // Load Chart.js if not already loaded
        await loadChartJS();
        
        const data = await fetchInsightsData(testingObject);
        
        if (!data.success || data.x_values.length === 0) {
            chartContainer.innerHTML = `
                <div class="chart-placeholder">
                    <p class="placeholder-text">${data.message || 'No data available for this testing object'}</p>
                </div>
            `;
            return;
        }
        
        // Create canvas for chart
        chartContainer.innerHTML = '<canvas id="insights-chart"></canvas>';
        const canvas = document.getElementById('insights-chart') as HTMLCanvasElement;
        
        if (!canvas) return;
        
        // Destroy existing chart if it exists
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        
        // Prepare data for Chart.js
        const datasets: any[] = [{
            label: `${testingObject}${data.unit_label ? ` (${data.unit_label})` : ''}`,
            data: data.y_values,
            borderColor: 'rgb(0, 122, 255)',
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(0, 122, 255)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }];
        
        // Add reference value line if available
        if (data.reference_value !== null && data.reference_value !== undefined) {
            datasets.push({
                label: `Reference Value${data.unit_label ? ` (${data.unit_label})` : ''}`,
                data: data.x_values.map(() => data.reference_value),
                borderColor: 'rgb(255, 0, 0)',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5], // Dashed line (strichelt)
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0
            });
        }
        
        const chartData = {
            labels: data.x_values,
            datasets: datasets
        };
        
        // Create chart
        chartInstance = new Chart(canvas, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context: any) {
                                const value = context.parsed.y;
                                if (value === null || value === undefined) {
                                    return '';
                                }
                                const unit = data.unit_label ? ` ${data.unit_label}` : '';
                                return `${value.toFixed(2)}${unit}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: { top: 10, bottom: 10 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: data.unit_label ? `Value (${data.unit_label})` : 'Value',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: { top: 10, bottom: 10 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart data:', error);
        chartContainer.innerHTML = `<div class="error">Error loading chart: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
}

function clearChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <p class="placeholder-text">Select a testing object to view its trend over time</p>
            </div>
        `;
    }
}

