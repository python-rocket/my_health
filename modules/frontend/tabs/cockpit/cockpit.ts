import { fetchAllChannels, fetchAllSolutions, fetchChannelRecommendations, fetchPopularSolutions, fetchSolutionDetails } from '../../utils/api.js';
import { getPreferences } from '../../utils/preferences.js';

export async function init() {
    // Initial load
    // Deactivated: YouTube Channels and My Solutions
    // await displayChannels();
    // await displaySolutions();
    await displayChannelRecommendations();
    await displayPopularSolutions();
    
    // Setup modal close handlers
    setupModalHandlers();
    
    // Listen for preference updates
    window.addEventListener('preferencesUpdated', async () => {
        // Only refresh if cockpit tab is currently active
        const cockpitTab = document.getElementById('cockpit');
        if (cockpitTab && cockpitTab.classList.contains('active')) {
            // Deactivated: YouTube Channels and My Solutions
            // await displayChannels();
            // await displaySolutions();
            await displayChannelRecommendations();
            await displayPopularSolutions();
        }
    });
}

export async function onActivate() {
    // Refresh when tab becomes active
    // Deactivated: YouTube Channels and My Solutions
    // await displayChannels();
    // await displaySolutions();
    await displayChannelRecommendations();
    await displayPopularSolutions();
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
            .map(rec => {
                const channelLink = rec.channelId 
                    ? `https://www.youtube.com/@${rec.channelId}`
                    : null;
                const escapedName = escapeHtml(rec.name);
                const content = `${escapedName} <span style="color: #86868b; font-size: 12px;">(${rec.visitCount} visits)</span>`;
                return channelLink
                    ? `<li class="channel-item"><a href="${channelLink}" target="_blank" class="channel-link">${content}</a></li>`
                    : `<li class="channel-item">${content}</li>`;
            })
            .join('');
    } catch (error) {
        recommendationsList.innerHTML = `<li class="error">Error loading recommendations: ${error}</li>`;
    }
}

async function displayPopularSolutions() {
    const popularSolutionsList = document.getElementById('popular-solutions-list');
    if (!popularSolutionsList) return;
    
    try {
        const response = await fetchPopularSolutions();
        
        if (!response.success || !response.solutions || response.solutions.length === 0) {
            popularSolutionsList.innerHTML = '<div class="loading">No popular solutions available.</div>';
            return;
        }
        
        popularSolutionsList.innerHTML = response.solutions
            .map(sol => `
                <div class="solution-item clickable-solution" data-solution="${escapeHtml(sol.solution)}">
                    ${escapeHtml(sol.solution)} 
                    <span style="color: #86868b; font-size: 12px;">(${sol.video_count} videos${sol.pubmed_count > 0 ? `, ${sol.pubmed_count} studies` : ''})</span>
                </div>
            `)
            .join('');
        
        // Add click handlers
        document.querySelectorAll('.clickable-solution').forEach(item => {
            item.addEventListener('click', async (e) => {
                const solutionName = (e.currentTarget as HTMLElement).getAttribute('data-solution');
                if (solutionName) {
                    await showSolutionDetails(solutionName);
                }
            });
        });
    } catch (error) {
        popularSolutionsList.innerHTML = `<div class="error">Error loading popular solutions: ${error}</div>`;
    }
}

function setupModalHandlers() {
    const modal = document.getElementById('solution-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (!modal || !closeBtn) return;
    
    // Close on X button click
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

async function showSolutionDetails(solutionName: string) {
    const modal = document.getElementById('solution-modal');
    const modalTitle = document.getElementById('modal-solution-title');
    const modalVideosList = document.getElementById('modal-videos-list');
    
    if (!modal || !modalTitle || !modalVideosList) return;
    
    // Show modal and set title
    modal.classList.add('active');
    modalTitle.textContent = solutionName;
    modalVideosList.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        const response = await fetchSolutionDetails(solutionName);
        
        const hasVideos = response.videos && response.videos.length > 0;
        const hasStudies = response.studies && response.studies.length > 0;
        
        if (!hasVideos && !hasStudies) {
            modalVideosList.innerHTML = '<div class="loading">No videos or studies found for this solution.</div>';
            return;
        }
        
        let html = '';
        
        // Videos section
        if (hasVideos) {
            html += `
                <div class="section">
                    <h3 class="section-title">YouTube Videos</h3>
                    <div class="videos-container">
                        ${response.videos.map((video, index) => `
                            <div class="video-item">
                                <div class="video-header">
                                    <a href="https://www.youtube.com/watch?v=${video.video_id}" target="_blank" class="video-link">
                                        <h3 class="video-title">${escapeHtml(video.video_title || 'Untitled')}</h3>
                                    </a>
                                    ${video.video_summary ? `
                                        <button class="summary-toggle" data-type="video" data-index="${index}" aria-label="Toggle summary">
                                            <span class="summary-icon"></span>
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="video-meta">
                                    <span class="video-channel">${escapeHtml(video.channel_name || video.channel_id || 'Unknown')}</span>
                                </div>
                                ${video.video_summary ? `
                                    <div class="video-summary-container" data-type="video" data-index="${index}" style="display: none;">
                                        <p class="video-summary">${escapeHtml(video.video_summary)}</p>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // PubMed Studies section
        if (hasStudies) {
            html += `
                <div class="section">
                    <h3 class="section-title">PubMed Studies</h3>
                    <div class="studies-container">
                        ${response.studies.map((study, index) => `
                            <div class="study-item">
                                <div class="study-header">
                                    <h4 class="study-title">${escapeHtml(study.title || 'Untitled Study')}</h4>
                                    ${study.abstract ? `
                                        <button class="summary-toggle" data-type="study" data-index="${index}" aria-label="Toggle abstract">
                                            <span class="summary-icon"></span>
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="study-meta">
                                    ${study.authors ? `<span class="study-authors">${escapeHtml(study.authors.replace(/[\[\]]/g, ''))}</span>` : ''}
                                    ${study.publish_date ? `<span class="study-date">${escapeHtml(study.publish_date)}</span>` : ''}
                                    ${study.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${study.pmid}" target="_blank" class="study-link">PMID: ${escapeHtml(study.pmid)}</a>` : ''}
                                </div>
                                ${study.abstract ? `
                                    <div class="study-abstract-container" data-type="study" data-index="${index}" style="display: none;">
                                        <p class="study-abstract">${escapeHtml(study.abstract)}</p>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        modalVideosList.innerHTML = html;
        
        // Add click handlers for expandable summaries (both videos and studies)
        document.querySelectorAll('.summary-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = (e.currentTarget as HTMLElement).getAttribute('data-type');
                const index = (e.currentTarget as HTMLElement).getAttribute('data-index');
                if (index !== null && type) {
                    const selector = type === 'video' 
                        ? `.video-summary-container[data-type="video"][data-index="${index}"]`
                        : `.study-abstract-container[data-type="study"][data-index="${index}"]`;
                    const summaryContainer = document.querySelector(selector) as HTMLElement;
                    const buttonElement = e.currentTarget as HTMLElement;
                    
                    if (summaryContainer) {
                        const isHidden = summaryContainer.style.display === 'none';
                        summaryContainer.style.display = isHidden ? 'block' : 'none';
                        buttonElement.classList.toggle('expanded', isHidden);
                    }
                }
            });
        });
    } catch (error) {
        modalVideosList.innerHTML = `<div class="error">Error loading solution details: ${error}</div>`;
    }
}

function escapeHtml(text: string | null): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

