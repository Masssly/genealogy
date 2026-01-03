// modules/UIRenderer.js - Handles all UI rendering and event listeners

class UIRenderer {
    constructor(app) {
        this.app = app;
        this.dataService = app.dataService;
        this.imageService = app.imageService;
    }
    
    updateConnectionStatus(isConnected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (isConnected) {
                statusElement.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span class="text-gray-600">Connected</span>
                `;
            } else {
                statusElement.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-red-500"></span>
                    <span class="text-gray-600">Disconnected</span>
                `;
            }
        }
    }
    
    render() {
        const root = document.getElementById('root');
        if (!root) return;
        
        root.innerHTML = '';
        
        const app = document.createElement('div');
        app.className = 'h-screen flex';
        
        const sidebar = this.createSidebar();
        const mainContent = this.createMainContent();
        
        app.appendChild(sidebar);
        app.appendChild(mainContent);
        root.appendChild(app);
        
        this.renderPeopleList();
        this.renderSelectedPerson();
        this.updateConnectionStatus(this.app.isConnected);
    }
    
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm';
        
        const header = document.createElement('div');
        header.className = 'p-5 border-b border-gray-100 bg-gray-50/50';
        header.innerHTML = `
            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4 serif">
                <span>👥</span>
                <span>Family Registry</span>
            </h2>
            <p class="text-xs text-gray-500 mb-3">
                Connected to: <strong>masssly.wikibase.cloud</strong>
            </p>
            <div class="relative">
                <input 
                    type="text" 
                    id="search-input"
                    placeholder="Search by name, ID, or alias..." 
                    class="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    autocomplete="off"
                >
                <div class="absolute right-3 top-2.5 text-gray-400">
                    🔍
                </div>
            </div>
        `;
        
        const stats = document.createElement('div');
        stats.className = 'px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-600';
        stats.id = 'stats-bar';
        
        const peopleList = document.createElement('div');
        peopleList.className = 'flex-1 overflow-y-auto custom-scrollbar';
        peopleList.id = 'people-list';
        
        sidebar.appendChild(header);
        sidebar.appendChild(stats);
        sidebar.appendChild(peopleList);
        
        return sidebar;
    }
    
    createMainContent() {
        const main = document.createElement('main');
        main.className = 'flex-1 flex flex-col';
        
        const header = document.createElement('header');
        header.className = 'h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm';
        header.innerHTML = `
            <div>
                <h1 class="text-2xl font-black serif text-gray-900">Genealogy Explorer</h1>
                <p class="text-xs text-gray-500">Masssly Family Tree</p>
            </div>
            <div class="flex items-center gap-4">
                <div id="connection-status" class="flex items-center gap-2 text-sm">
                    <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                    <span class="text-gray-600">Testing...</span>
                </div>
                <button id="refresh-btn" class="px-4 py-2 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition text-sm font-medium flex items-center gap-2">
                    <span>↻</span>
                    <span>Refresh Data</span>
                </button>
                <a href="https://github.com/Masssly/genealogy" target="_blank" class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm font-medium">
                    GitHub
                </a>
            </div>
        `;
        
        const content = document.createElement('div');
        content.className = 'flex-1 p-8 overflow-auto bg-gradient-to-br from-amber-50/30 to-stone-100/30';
        content.id = 'main-content';
        
        const footer = document.createElement('footer');
        footer.className = 'py-4 border-t border-gray-200 text-center text-gray-600 text-sm bg-white';
        footer.innerHTML = `
            <div class="max-w-3xl mx-auto px-4">
                <p class="mb-2">
                    Powered by <strong class="text-amber-700">Wikibase Cloud</strong> • 
                    <a href="https://masssly.wikibase.cloud/wiki/Main_Page" target="_blank" class="text-amber-700 hover:underline ml-1">
                        Visit your Wikibase instance
                    </a>
                </p>
                <p class="text-xs text-gray-500">
                    Data from: <code class="bg-gray-100 px-1 rounded">masssly.wikibase.cloud</code>
                </p>
            </div>
        `;
        
        main.appendChild(header);
        main.appendChild(content);
        main.appendChild(footer);
        
        return main;
    }
    
    async renderPeopleList() {
        const list = document.getElementById('people-list');
        const stats = document.getElementById('stats-bar');
        
        if (!list || !stats) return;
        
        const filteredPeople = this.app.people.filter(person => {
            const searchLower = this.app.searchQuery.toLowerCase();
            return (
                person.name.toLowerCase().includes(searchLower) ||
                person.id.toLowerCase().includes(searchLower) ||
                person.aliases.some(alias => alias.toLowerCase().includes(searchLower))
            );
        });
        
        const totalPeople = this.app.people.length;
        const filteredCount = filteredPeople.length;
        stats.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium">${totalPeople} people</span>
                ${this.app.searchQuery && filteredCount !== totalPeople ? 
                    `<span class="text-amber-600 font-medium">${filteredCount} filtered</span>` : 
                    ''
                }
            </div>
        `;
        
        list.innerHTML = '';
        
        if (filteredPeople.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center py-12 text-gray-500';
            empty.innerHTML = `
                <div class="text-4xl mb-3">🔍</div>
                <p class="font-medium">No matching people</p>
                ${this.app.searchQuery ? '<p class="text-sm mt-1">Try a different search</p>' : ''}
            `;
            list.appendChild(empty);
            return;
        }
        
        for (const person of filteredPeople) {
            const personEl = document.createElement('button');
            personEl.className = `w-full text-left p-4 border-b border-gray-50 flex items-center gap-4 transition-all ${
                this.app.selectedPerson?.id === person.id 
                    ? 'bg-amber-50 border-l-4 border-l-amber-700' 
                    : 'hover:bg-gray-50'
            }`;
            
            const birthYear = extractYear(person.birthDate);
            const deathYear = extractYear(person.deathDate);
            const age = calculateAge(person.birthDate, person.deathDate);
            
            const imageUrl = await this.imageService.getBestImageUrl(person.id);
            
            personEl.innerHTML = `
                <div class="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" class="w-full h-full object-cover" crossorigin="anonymous" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : ''
                    }
                    <div class="${imageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full">
                        <span class="text-gray-400 text-lg">👤</span>
                    </div>
                </div>
                <div class="truncate flex-1">
                    <p class="font-bold text-sm text-gray-900 truncate">${person.name}</p>
                    ${person.aliases.length > 0 ? 
                        `<p class="text-xs text-gray-500 truncate mt-0.5">${person.aliases.slice(0, 2).join(', ')}${person.aliases.length > 2 ? '...' : ''}</p>` 
                        : ''
                    }
                    <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">${person.id}</span>
                        ${birthYear ? `<span class="text-gray-600">${birthYear}${deathYear ? `–${deathYear}` : ''}</span>` : ''}
                        ${age !== null ? `<span class="text-gray-700 font-bold">${age}y</span>` : ''}
                    </div>
                </div>
            `;
            
            personEl.addEventListener('click', async () => {
                this.app.selectedPerson = person;
                await this.renderSelectedPerson();
                this.renderPeopleList();
            });
            
            list.appendChild(personEl);
        }
    }
    
    async renderSelectedPerson() {
        const content = document.getElementById('main-content');
        if (!content || !this.app.selectedPerson) return;
        
        const age = calculateAge(this.app.selectedPerson.birthDate, this.app.selectedPerson.deathDate);
        
        // Get ALL images for this person
        const allImages = await this.imageService.getAllPersonImages(this.app.selectedPerson.id);
        const profileImageUrl = allImages.length > 0 ? allImages[0] : null;
        const additionalImageCount = allImages.length - 1;
        
        content.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                    <div class="h-48 bg-gradient-to-r from-amber-800 to-amber-600 relative">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                        
                        <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <div class="flex items-end gap-6">
                                <div class="w-32 h-32 rounded-2xl bg-white p-1 shadow-2xl">
                                    <div class="w-full h-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center relative">
                                        ${profileImageUrl 
                                            ? `<img src="${profileImageUrl}" class="w-full h-full object-cover" crossorigin="anonymous" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                                            : ''
                                        }
                                        <div class="${profileImageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full">
                                            <span class="text-6xl text-gray-300">👤</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-4xl font-bold serif text-white mb-2">${this.app.selectedPerson.name}</h2>
                                    <div class="flex items-center gap-4">
                                        <span class="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                                            ${this.app.selectedPerson.id}
                                        </span>
                                        ${age !== null && `<span class="text-amber-200 font-bold">${age} years</span>`}
                                        ${this.app.selectedPerson.birthOrder && `<span class="bg-amber-800 text-white px-3 py-1 rounded-full text-sm font-bold">${formatBirthOrder(this.app.selectedPerson.birthOrder)}</span>`}
                                        ${additionalImageCount > 0 && `<span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">${additionalImageCount}+ photos</span>`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-8">
                        ${this.app.selectedPerson.description 
                            ? `<div class="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                                <p class="text-gray-700 italic">"${this.app.selectedPerson.description}"</p>
                              </div>`
                            : ''
                        }
                        
                        ${this.app.selectedPerson.aliases.length > 0 ? `
                            <div class="mb-6">
                                <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Also Known As</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${this.app.selectedPerson.aliases.map(alias => `
                                        <span class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm">
                                            ${alias}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-6">
                                <div>
                                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Life Information</h3>
                                    <div class="space-y-4">
                                        ${this.app.selectedPerson.birthDate 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-amber-600 text-xl mt-1">🎂</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Born</p>
                                                    <p class="text-gray-900">${formatDate(this.app.selectedPerson.birthDate)}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                        ${this.app.selectedPerson.deathDate 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-gray-600 text-xl mt-1">🕊️</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Died</p>
                                                    <p class="text-gray-900">${formatDate(this.app.selectedPerson.deathDate)}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                        ${age !== null 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-green-600 text-xl mt-1">⏳</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Lifespan</p>
                                                    <p class="text-gray-900">${age} years</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                    </div>
                                </div>
                            </div>
                            
                            <div class="space-y-6">
                                <div>
                                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Details</h3>
                                    <div class="space-y-4">
                                        ${this.app.selectedPerson.occupation 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-blue-600 text-xl mt-1">💼</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Occupation</p>
                                                    <p class="text-gray-900">${this.app.selectedPerson.occupation}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                        ${this.app.selectedPerson.residence 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-green-600 text-xl mt-1">🏠</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Residence</p>
                                                    <p class="text-gray-900">${this.app.selectedPerson.residence}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                    </div>
                                </div>
                                
                                ${(this.app.selectedPerson.fatherId || this.app.selectedPerson.motherId) 
                                    ? `<div>
                                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Immediate Family</h3>
                                        <div class="flex flex-wrap gap-3" id="family-buttons-${this.app.selectedPerson.id}">
                                            ${this.app.selectedPerson.fatherId 
                                                ? `<button class="family-member relative px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
                                                           data-id="${this.app.selectedPerson.fatherId}">
                                                    <span class="text-blue-600">👨</span> Father
                                                  </button>`
                                                : ''
                                            }
                                            ${this.app.selectedPerson.motherId 
                                                ? `<button class="family-member relative px-3 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition flex items-center gap-2"
                                                           data-id="${this.app.selectedPerson.motherId}">
                                                    <span class="text-pink-600">👩</span> Mother
                                                  </button>`
                                                : ''
                                            }
                                        </div>
                                    </div>`
                                    : ''
                                }
                            </div>
                        </div>
                        
                        <div class="mt-8 pt-8 border-t border-gray-200 flex flex-wrap gap-4">
                            <a href="${this.app.selectedPerson.wikibaseUrl}" 
                               target="_blank"
                               class="px-5 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium flex items-center gap-2">
                                <span>✏️</span>
                                View/Edit in Wikibase
                            </a>
                            <button class="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2" onclick="showFamilyTree()">
                                <span>🌳</span>
                                View Family Tree
                            </button>
                            ${additionalImageCount > 0 ? `
                                <button id="gallery-btn-${this.app.selectedPerson.id}" 
                                        class="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 gallery-button">
                                    <span>🖼️</span>
                                    More Images (${additionalImageCount})
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.app.people.length}</div>
                        <div class="text-sm text-gray-600">Total People</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.app.people.filter(p => p.birthDate).length}</div>
                        <div class="text-sm text-gray-600">With Birth Dates</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.app.people.filter(p => p.aliases.length > 0).length}</div>
                        <div class="text-sm text-gray-600">With Aliases</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.app.people.filter(p => this.imageService.getAllPersonImages(p.id).then(imgs => imgs.length > 0)).length}</div>
                        <div class="text-sm text-gray-600">With Images</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners for family buttons
        setTimeout(() => {
            document.querySelectorAll('.family-member').forEach(button => {
                button.addEventListener('click', (e) => {
                    if (e.target.closest('.family-preview')) return;
                    
                    const personId = e.currentTarget.dataset.id;
                    const person = this.app.people.find(p => p.id === personId);
                    if (person) {
                        this.app.selectedPerson = person;
                        this.renderSelectedPerson();
                        this.renderPeopleList();
                    }
                });
                
                // Add hover events for preview
                button.addEventListener('mouseenter', (e) => {
                    showFamilyPreview(e, button.dataset.id);
                });
                
                button.addEventListener('mouseleave', () => {
                    hideFamilyPreview();
                });
            });
        }, 100);
        
        // Add event listener for gallery button
        setTimeout(() => {
            const galleryBtn = document.getElementById(`gallery-btn-${this.app.selectedPerson.id}`);
            if (galleryBtn) {
                galleryBtn.addEventListener('click', async () => {
                    // Get fresh images in case cache is stale
                    const freshImages = await this.imageService.getAllPersonImages(this.app.selectedPerson.id);
                    this.imageService.showImageGallery(this.app.selectedPerson.id, this.app.selectedPerson.name, freshImages, 0, this.app);
                });
            }
        }, 100);
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.app.searchQuery = e.target.value;
                    this.renderPeopleList();
                }, 300);
            });
        }
        
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const originalText = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<span>⏳</span><span>Loading...</span>';
                refreshBtn.disabled = true;
                
                this.imageService.clearCache();
                await this.app.loadData();
                
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            });
        }
    }
    
    setupConnectionEventListeners() {
        setTimeout(() => {
            const retryBtn = document.getElementById('retry-btn');
            const offlineBtn = document.getElementById('offline-btn');
            
            if (retryBtn) {
                retryBtn.addEventListener('click', async () => {
                    retryBtn.textContent = 'Testing...';
                    retryBtn.disabled = true;
                    const isConnected = await this.dataService.testConnection();
                    if (isConnected) {
                        await this.app.loadData();
                        this.render();
                        this.setupEventListeners();
                    } else {
                        retryBtn.textContent = 'Retry Connection';
                        retryBtn.disabled = false;
                    }
                });
            }
            
            if (offlineBtn) {
                offlineBtn.addEventListener('click', () => {
                    this.app.people = this.dataService.loadSampleData();
                    if (this.app.people.length > 0) {
                        this.app.selectedPerson = this.app.people[0];
                    }
                    this.render();
                    this.setupEventListeners();
                    this.app.isConnected = true;
                    this.updateConnectionStatus(true);
                });
            }
        }, 100);
    }
}
