import { uploadTestingResults, processTestingResults, fetchTestingResults } from '../../utils/api.js';

let currentFileId: string | null = null;

export async function init() {
    setupUploadArea();
    await displayTestingResults();
}

export async function onActivate() {
    // Reset state when tab becomes active
    resetUploadState();
    // Refresh table when tab becomes active
    await displayTestingResults();
}

function setupUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    
    if (!uploadArea || !fileInput) return;
    
    // Click to browse
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            handleFileSelect(target.files[0]);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
}

async function handleFileSelect(file: File) {
    // Validate file type
    const validExtensions = ['.pdf', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
        showError('Invalid file type. Please upload a PDF, CSV, or image file.');
        return;
    }
    
    // Show upload status
    showUploadStatus('Uploading file...', true);
    hideResult();
    
    try {
        // Upload file
        const uploadResponse = await uploadTestingResults(file);
        
        if (uploadResponse.success && uploadResponse.file_id) {
            currentFileId = uploadResponse.file_id;
            showUploadStatus('File uploaded successfully. Processing...', true);
            
            // Process file
            const processResponse = await processTestingResults(uploadResponse.file_id);
            
            if (processResponse.success) {
                showSuccess(`Successfully processed and inserted ${processResponse.rows_inserted} rows into the database.`);
                // Refresh the table after successful upload
                await displayTestingResults();
            } else {
                showError(`Processing failed: ${processResponse.message}`);
            }
        } else {
            showError('Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading/processing file:', error);
        showError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
        hideUploadStatus();
    }
}

function showUploadStatus(message: string, showSpinner: boolean = false) {
    const statusDiv = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');
    const statusSpinner = document.getElementById('status-spinner');
    
    if (statusDiv && statusText) {
        statusText.textContent = message;
        statusDiv.style.display = 'block';
        
        if (statusSpinner) {
            statusSpinner.style.display = showSpinner ? 'block' : 'none';
        }
    }
}

function hideUploadStatus() {
    const statusDiv = document.getElementById('upload-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

function showSuccess(message: string) {
    showResult(message, 'success');
}

function showError(message: string) {
    showResult(message, 'error');
}

function showResult(message: string, type: 'success' | 'error') {
    const resultDiv = document.getElementById('upload-result');
    const resultMessage = document.getElementById('result-message');
    
    if (resultDiv && resultMessage) {
        resultMessage.textContent = message;
        resultMessage.className = type;
        resultDiv.style.display = 'block';
    }
}

function hideResult() {
    const resultDiv = document.getElementById('upload-result');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
}

function resetUploadState() {
    currentFileId = null;
    hideUploadStatus();
    hideResult();
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
}

async function displayTestingResults() {
    const container = document.getElementById('testing-results-table-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Loading testing results...</div>';
        
        const results = await fetchTestingResults();
        
        if (results.length === 0) {
            container.innerHTML = '<p class="info-text">No testing results found. Upload a file to get started.</p>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'testing-results-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['ID', 'Test Object', 'Result Value', 'Unit', 'Reference Value', 'Flag', 'Comments', 'Updated At'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        results.forEach(result => {
            const row = document.createElement('tr');
            
            // Add CSS class for high/low flags
            if (result.flag && (result.flag.toLowerCase() === 'high' || result.flag.toLowerCase() === 'low')) {
                row.classList.add('flag-high-low');
            }
            
            // Format date
            const updatedAt = result.updated_at 
                ? new Date(result.updated_at).toLocaleString()
                : '-';
            
            // Format values
            const resultValue = result.result_value !== null && result.result_value !== undefined 
                ? result.result_value.toString() 
                : '-';
            const referenceValue = result.reference_value !== null && result.reference_value !== undefined 
                ? result.reference_value.toString() 
                : '-';
            
            // Create cells
            const cells = [
                result.id?.toString() || '-',
                result.test_object || '-',
                resultValue,
                result.result_unit || '-',
                referenceValue,
                result.flag || '-',
                result.comments || '-',
                updatedAt
            ];
            
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.innerHTML = '';
        container.appendChild(table);
    } catch (error) {
        console.error('Error displaying testing results:', error);
        container.innerHTML = `<div class="error">Error loading testing results: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
}

