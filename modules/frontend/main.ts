// Tab registry and initialization system

interface SubtabConfig {
    id: string;
    name: string;
    init: () => Promise<void>;
    onActivate?: () => Promise<void>;
}

interface TabConfig {
    id: string;
    name: string;
    enabled: boolean;
    subtabs?: SubtabConfig[];
    init: () => Promise<void>;
    onActivate?: () => Promise<void>;
    onDeactivate?: () => Promise<void>;
}

// Tab registry - easily add/remove tabs here
const tabs: TabConfig[] = [
    {
        id: 'cockpit',
        name: 'Cockpit',
        enabled: true,
        init: async () => {
            const module = await import('./tabs/cockpit/cockpit.js');
            await module.init();
        },
        onActivate: async () => {
            const module = await import('./tabs/cockpit/cockpit.js');
            if (module.onActivate) {
                await module.onActivate();
            }
        }
    },
    {
        id: 'preferences',
        name: 'Preferences',
        enabled: true,
        init: async () => {
            const module = await import('./tabs/preferences/preferences.js');
            await module.init();
        },
        onActivate: async () => {
            const module = await import('./tabs/preferences/preferences.js');
            if (module.onActivate) {
                await module.onActivate();
            }
        }
    },
    {
        id: 'ask',
        name: 'Ask',
        enabled: true,
        init: async () => {
            const module = await import('./tabs/ask/ask.js');
            await module.init();
        },
        onActivate: async () => {
            const module = await import('./tabs/ask/ask.js');
            if (module.onActivate) {
                await module.onActivate();
            }
        }
    },
    {
        id: 'testing_results',
        name: 'Testing Results',
        enabled: true,
        init: async () => {
            const module = await import('./tabs/testing_results/testing_results.js');
            await module.init();
        },
        onActivate: async () => {
            const module = await import('./tabs/testing_results/testing_results.js');
            if (module.onActivate) {
                await module.onActivate();
            }
        }
    },
    {
        id: 'solutions',
        name: 'Solutions',
        enabled: true,
        subtabs: [
            {
                id: 'solution-a',
                name: 'Solution A',
                init: async () => {
                    // Placeholder initialization
                },
                onActivate: async () => {
                    // Placeholder activation
                }
            },
            {
                id: 'solution-b',
                name: 'Solution B',
                init: async () => {
                    // Placeholder initialization
                },
                onActivate: async () => {
                    // Placeholder activation
                }
            },
            {
                id: 'solution-c',
                name: 'Solution C',
                init: async () => {
                    // Placeholder initialization
                },
                onActivate: async () => {
                    // Placeholder activation
                }
            }
        ],
        init: async () => {
            const module = await import('./tabs/solutions/solutions.js');
            await module.init();
        },
        onActivate: async () => {
            const module = await import('./tabs/solutions/solutions.js');
            if (module.onActivate) {
                await module.onActivate();
            }
        }
    }
];

async function initTabs() {
    const tabsContainer = document.querySelector('.tabs');
    const tabsContentContainer = document.getElementById('tabs-content');
    
    if (!tabsContainer || !tabsContentContainer) {
        console.error('Tab containers not found');
        return;
    }
    
    // Filter enabled tabs
    const enabledTabs = tabs.filter(tab => tab.enabled);
    
    // Create tab buttons with subtab support
    enabledTabs.forEach((tab, index) => {
        const button = document.createElement('button');
        button.className = `tab ${index === 0 ? 'active' : ''}`;
        button.setAttribute('data-tab', tab.id);
        
        // Add tab name
        const tabName = document.createTextNode(tab.name);
        button.appendChild(tabName);
        
        // Add chevron if tab has subtabs
        if (tab.subtabs && tab.subtabs.length > 0) {
            button.classList.add('has-subtabs');
            const chevron = document.createElement('span');
            chevron.className = 'tab-chevron';
            chevron.textContent = '▼';
            button.appendChild(chevron);
            
            // Create wrapper for tab with dropdown
            const tabWrapper = document.createElement('div');
            
            // Create dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'tab-dropdown';
            dropdown.setAttribute('data-tab-dropdown', tab.id);
            
            tab.subtabs.forEach(subtab => {
                const subtabButton = document.createElement('button');
                subtabButton.className = 'subtab';
                subtabButton.setAttribute('data-subtab', `${tab.id}-${subtab.id}`);
                subtabButton.textContent = subtab.name;
                dropdown.appendChild(subtabButton);
            });
            
            tabWrapper.appendChild(button);
            tabWrapper.appendChild(dropdown);
            tabsContainer.appendChild(tabWrapper);
        } else {
            // No subtabs, just add button directly
            tabsContainer.appendChild(button);
        }
    });
    
    // Load tab content and initialize
    for (let i = 0; i < enabledTabs.length; i++) {
        const tab = enabledTabs[i];
        
        try {
            // Load HTML content
            const response = await fetch(`tabs/${tab.id}/${tab.id}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${tab.id}.html: ${response.statusText}`);
            }
            const html = await response.text();
            
            const contentDiv = document.createElement('div');
            contentDiv.id = tab.id;
            contentDiv.className = `tab-content ${i === 0 ? 'active' : ''}`;
            contentDiv.innerHTML = html;
            tabsContentContainer.appendChild(contentDiv);
            
            // Initialize tab
            await tab.init();
        } catch (error) {
            console.error(`Error loading tab ${tab.id}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.id = tab.id;
            errorDiv.className = `tab-content ${i === 0 ? 'active' : ''}`;
            errorDiv.innerHTML = `<div class="error">Error loading ${tab.name} tab: ${error}</div>`;
            tabsContentContainer.appendChild(errorDiv);
        }
    }
    
    // Add click handlers for tab switching and dropdowns
    document.querySelectorAll('.tab').forEach(tabButton => {
        tabButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const targetTabId = tabButton.getAttribute('data-tab');
            if (!targetTabId) return;
            
            const tabConfig = tabs.find(t => t.id === targetTabId);
            if (!tabConfig || !tabConfig.enabled) return;
            
            // If tab has subtabs, toggle dropdown instead of navigating
            if (tabConfig.subtabs && tabConfig.subtabs.length > 0) {
                const dropdown = document.querySelector(`[data-tab-dropdown="${targetTabId}"]`) as HTMLElement;
                const isOpen = dropdown?.classList.contains('open');
                
                // Close all dropdowns
                document.querySelectorAll('.tab-dropdown').forEach(d => d.classList.remove('open'));
                document.querySelectorAll('.tab.has-subtabs').forEach(t => t.classList.remove('open'));
                
                // Toggle this dropdown
                if (!isOpen && dropdown) {
                    dropdown.classList.add('open');
                    tabButton.classList.add('open');
                }
            } else {
                // No subtabs - direct navigation
                // Close all dropdowns first
                document.querySelectorAll('.tab-dropdown').forEach(d => d.classList.remove('open'));
                document.querySelectorAll('.tab.has-subtabs').forEach(t => t.classList.remove('open'));
                
                // Deactivate current tab
                document.querySelectorAll('.tab.active').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));
                
                // Call onDeactivate on previous tab if needed
                const previousActiveTab = document.querySelector('.tab-content.active');
                if (previousActiveTab) {
                    const prevTabId = previousActiveTab.id;
                    const prevTabConfig = tabs.find(t => t.id === prevTabId);
                    if (prevTabConfig?.onDeactivate) {
                        await prevTabConfig.onDeactivate();
                    }
                }
                
                // Activate clicked tab
                tabButton.classList.add('active');
                const content = document.getElementById(targetTabId);
                if (content) {
                    content.classList.add('active');
                }
                
                // Call onActivate if defined
                if (tabConfig.onActivate) {
                    await tabConfig.onActivate();
                }
            }
        });
    });
    
    // Add click handlers for subtabs
    document.querySelectorAll('.subtab').forEach(subtabButton => {
        subtabButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const subtabId = subtabButton.getAttribute('data-subtab');
            if (!subtabId) return;
            
            const [tabId, subtabName] = subtabId.split('-', 2);
            const tabConfig = tabs.find(t => t.id === tabId);
            if (!tabConfig || !tabConfig.subtabs) return;
            
            const subtabConfig = tabConfig.subtabs.find(st => st.id === subtabName);
            if (!subtabConfig) return;
            
            // Close dropdown
            document.querySelectorAll('.tab-dropdown').forEach(d => d.classList.remove('open'));
            document.querySelectorAll('.tab.has-subtabs').forEach(t => t.classList.remove('open'));
            
            // Deactivate current tab
            document.querySelectorAll('.tab.active').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));
            
            // Create or activate subtab content
            const subtabContentId = `${tabId}-${subtabConfig.id}`;
            let content = document.getElementById(subtabContentId);
            if (!content) {
                content = document.createElement('div');
                content.id = subtabContentId;
                content.className = 'tab-content';
                
                // Add placeholder content for subtab
                content.innerHTML = `
                    <div class="card">
                        <h2>${subtabConfig.name}</h2>
                        <p class="info-text">This is a placeholder page for ${subtabConfig.name}.</p>
                    </div>
                `;
                
                tabsContentContainer.appendChild(content);
                
                // Initialize subtab
                await subtabConfig.init();
            }
            
            content.classList.add('active');
            
            // Activate parent tab button
            const parentTab = document.querySelector(`[data-tab="${tabId}"]`);
            if (parentTab) {
                parentTab.classList.add('active');
            }
            
            // Call onActivate if defined
            if (subtabConfig.onActivate) {
                await subtabConfig.onActivate();
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.tab') && !target.closest('.tab-dropdown')) {
            document.querySelectorAll('.tab-dropdown').forEach(d => d.classList.remove('open'));
            document.querySelectorAll('.tab.has-subtabs').forEach(t => t.classList.remove('open'));
        }
    });
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
});
