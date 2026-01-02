// Configuration for your Wikibase instance
const WIKIBASE_SPARQL_ENDPOINT = 'https://masssly.wikibase.cloud/query/sparql';
const WIKIBASE_BASE_URL = 'https://masssly.wikibase.cloud/wiki/Item:';

// Property IDs from your Wikibase
const PROP_IDS = {
    INSTANCE_OF: 'P3',
    FATHER: 'P4',
    MOTHER: 'P5', 
    BIRTH_DATE: 'P21',
    DEATH_DATE: 'P23',
    OCCUPATION: 'P20',
    RESIDENCE: 'P19',
    IMAGE: 'P1',
    WALL_PHOTO: 'P22',
    BIRTH_ORDER: 'P18'
};

// Image cache
const imageCache = new Map();

class GenealogyApp {
    constructor() {
        this.people = [];
        this.selectedPerson = null;
        this.searchQuery = '';
        this.isLoading = false;
        this.isConnected = false;
        
        // Make app instance available globally
        window.genealogyApp = this;
        
        this.init();
    }
    
    async init() {
        await this.testConnection();
        
        if (this.isConnected) {
            await this.loadData();
            this.render();
            this.setupEventListeners();
        } else {
            this.showConnectionError();
        }
    }
    
    async testConnection() {
        try {
            const testQuery = `
                PREFIX mwd: <https://masssly.wikibase.cloud/entity/>
                PREFIX mwdt: <https://masssly.wikibase.cloud/prop/direct/>
                
                SELECT ?person ?personLabel WHERE {
                    ?person mwdt:P3 mwd:Q4 .
                    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                } LIMIT 1
            `;
            
            const url = `${WIKIBASE_SPARQL_ENDPOINT}?query=${encodeURIComponent(testQuery)}&format=json`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/sparql-results+json' }
            });
            
            this.isConnected = response.ok;
            this.updateConnectionStatus();
            
        } catch (error) {
            console.error('Connection test failed:', error);
            this.isConnected = false;
        }
    }
    
    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (this.isConnected) {
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
    
    async loadData() {
        this.isLoading = true;
        this.showLoading();
        
        try {
            const query = `
                PREFIX mwd: <https://masssly.wikibase.cloud/entity/>
                PREFIX mwdt: <https://masssly.wikibase.cloud/prop/direct/>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX schema: <http://schema.org/>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX wikibase: <http://wikiba.se/ontology#>
                PREFIX bd: <http://www.bigdata.com/rdf#>
                
                SELECT DISTINCT ?person ?personLabel ?personDescription 
                       ?father ?mother ?birthDate ?deathDate ?birthOrder 
                       ?residenceLabel ?occupationLabel ?image ?wallPhoto
                       ?alias
                WHERE {
                    ?person mwdt:P3 mwd:Q4 .
                    
                    OPTIONAL { ?person mwdt:P4 ?father }
                    OPTIONAL { ?person mwdt:P5 ?mother }
                    OPTIONAL { ?person mwdt:P21 ?birthDate }
                    OPTIONAL { ?person mwdt:P23 ?deathDate }
                    OPTIONAL { ?person mwdt:P18 ?birthOrder }
                    OPTIONAL { 
                        ?person mwdt:P19 ?residence . 
                        ?residence rdfs:label ?residenceLabel . 
                        FILTER(LANG(?residenceLabel) = "en") 
                    }
                    OPTIONAL { 
                        ?person mwdt:P20 ?occupation . 
                        ?occupation rdfs:label ?occupationLabel . 
                        FILTER(LANG(?occupationLabel) = "en") 
                    }
                    OPTIONAL { ?person mwdt:P1 ?image }
                    OPTIONAL { ?person mwdt:P22 ?wallPhoto }
                    OPTIONAL { 
                        ?person schema:description ?personDescription . 
                        FILTER(LANG(?personDescription) = "en") 
                    }
                    OPTIONAL {
                        ?person skos:altLabel ?alias .
                        FILTER(LANG(?alias) = "en")
                    }
                    
                    SERVICE wikibase:label { 
                        bd:serviceParam wikibase:language "en". 
                    }
                }
                ORDER BY ?personLabel
                LIMIT 200
            `;
            
            const url = `${WIKIBASE_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                headers: { 'Accept': 'application/sparql-results+json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            this.processSparqlResults(data);
            
        } catch (error) {
            console.error('Error loading data:', error);
            
            if (error.name === 'AbortError') {
                this.showError('Request timed out.');
            } else {
                this.showError('Failed to load data from Wikibase.');
            }
            
            this.loadSampleData();
        } finally {
            this.isLoading = false;
        }
    }
    
    processSparqlResults(data) {
        if (!data.results || !data.results.bindings) {
            console.warn('No data returned from SPARQL query');
            this.loadSampleData();
            return;
        }
        
        const peopleMap = {};
        
        data.results.bindings.forEach(row => {
            const id = row.person?.value.split('/').pop();
            if (!id) return;
            
            if (!peopleMap[id]) {
                peopleMap[id] = {
                    id: id,
                    name: row.personLabel?.value || `Person ${id}`,
                    fatherId: row.father?.value.split('/').pop(),
                    motherId: row.mother?.value.split('/').pop(),
                    birthDate: row.birthDate?.value,
                    deathDate: row.deathDate?.value,
                    birthOrder: row.birthOrder?.value,
                    residence: row.residenceLabel?.value,
                    occupation: row.occupationLabel?.value,
                    imageValue: row.image?.value,
                    wallPhotoValue: row.wallPhoto?.value,
                    description: row.personDescription?.value,
                    wikibaseUrl: `${WIKIBASE_BASE_URL}${id}`,
                    aliases: []
                };
            }
            
            if (row.alias?.value && !peopleMap[id].aliases.includes(row.alias.value)) {
                peopleMap[id].aliases.push(row.alias.value);
            }
        });
        
        this.people = Object.values(peopleMap);
        
        if (this.people.length > 0) {
            this.selectedPerson = this.people[0];
        }
        
        console.log(`Loaded ${this.people.length} people from Wikibase`);
    }
    
    // Image loading with debugging
    async testImageLoad(url, personId) {
        console.log(`Testing image for ${personId}: ${url}`);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log(`✓ Image loaded: ${url}`);
                resolve(true);
            };
            img.onerror = (e) => {
                console.log(`✗ Image failed: ${url}`, e);
                resolve(false);
            };
            
            const testUrl = url.startsWith('assets/') ? `${url}?t=${Date.now()}` : url;
            img.src = testUrl;
            
            setTimeout(() => {
                if (!img.complete) {
                    console.log(`⏱️ Timeout: ${url}`);
                    img.src = '';
                    resolve(false);
                }
            }, 3000);
        });
    }
    
    async getBestImageUrl(imageValue, personId, size = '400') {
        console.group(`Getting image for ${personId}`);
        const cacheKey = `${personId}_${size}`;
        
        if (imageCache.has(cacheKey)) {
            const cached = imageCache.get(cacheKey);
            console.log(`Using cached image: ${cached}`);
            console.groupEnd();
            return cached;
        }
        
        // Priority 1: Commons image
        if (imageValue) {
            let commonsUrl = null;
            
            if (imageValue.includes('File:')) {
                const filename = encodeURIComponent(imageValue.replace('File:', '').trim());
                commonsUrl = `https://masssly.wikibase.cloud/wiki/Special:FilePath/${filename}?width=${size}`;
            }
            else if (imageValue.includes('commons.wikimedia.org')) {
                const filename = imageValue.split('/').pop();
                commonsUrl = `https://masssly.wikibase.cloud/wiki/Special:FilePath/${filename}?width=${size}`;
            }
            else if (imageValue.startsWith('http')) {
                commonsUrl = imageValue;
            }
            
            if (commonsUrl) {
                console.log(`Trying Commons URL: ${commonsUrl}`);
                const isAvailable = await this.testImageLoad(commonsUrl, personId);
                if (isAvailable) {
                    imageCache.set(cacheKey, commonsUrl);
                    console.groupEnd();
                    return commonsUrl;
                }
            }
        }
        
        // Priority 2: Local assets
        const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        for (const ext of extensions) {
            const localUrl = `assets/${personId}${ext}`;
            console.log(`Trying local asset: ${localUrl}`);
            const isAvailable = await this.testImageLoad(localUrl, personId);
            if (isAvailable) {
                imageCache.set(cacheKey, localUrl);
                console.groupEnd();
                return localUrl;
            }
        }
        
        // No image available
        console.log(`No image found for ${personId}`);
        console.groupEnd();
        imageCache.set(cacheKey, null);
        return null;
    }
    
    // Format birth order (1st, 2nd, 3rd born)
    formatBirthOrder(order) {
        if (!order) return '';
        
        const num = parseInt(order);
        if (isNaN(num)) return order;
        
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
        return `${num}${suffix} born`;
    }
    
    loadSampleData() {
        this.people = [
            {
                id: 'Q1',
                name: 'John Smith',
                birthDate: '+1950-05-15T00:00:00Z',
                deathDate: '+2020-03-10T00:00:00Z',
                occupation: 'Engineer',
                residence: 'London, England',
                description: 'Family patriarch',
                imageValue: null,
                wikibaseUrl: `${WIKIBASE_BASE_URL}Q1`,
                aliases: ['Johnny Smith'],
                fatherId: null,
                motherId: null,
                birthOrder: '1'
            },
            {
                id: 'Q2',
                name: 'Jane Smith',
                birthDate: '+1955-08-20T00:00:00Z',
                occupation: 'Teacher',
                residence: 'London, England',
                description: 'Family matriarch',
                imageValue: null,
                wikibaseUrl: `${WIKIBASE_BASE_URL}Q2`,
                aliases: [],
                fatherId: null,
                motherId: null,
                birthOrder: '2'
            }
        ];
        
        if (this.people.length > 0) {
            this.selectedPerson = this.people[0];
        }
    }
    
    showLoading() {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="h-screen w-screen flex flex-col items-center justify-center gap-4">
                    <div class="spinner"></div>
                    <p class="serif text-xl font-bold text-gray-700">Loading family data from Wikibase...</p>
                </div>
            `;
        }
    }
    
    showConnectionError() {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="h-screen w-screen flex flex-col items-center justify-center gap-4 p-8">
                    <div class="text-center max-w-md">
                        <div class="text-6xl mb-4">🔌</div>
                        <h3 class="text-xl font-bold text-red-600 mb-2">Connection Failed</h3>
                        <p class="text-gray-700 mb-4">Unable to connect to your Wikibase instance.</p>
                        <div class="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                            <p class="text-sm text-gray-600 mb-2">Trying to connect to:</p>
                            <code class="text-sm bg-gray-100 p-2 rounded block">${WIKIBASE_SPARQL_ENDPOINT}</code>
                        </div>
                        <div class="flex gap-4">
                            <button id="retry-btn" class="px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition">
                                Retry Connection
                            </button>
                            <button id="offline-btn" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                                Use Offline Demo
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const retryBtn = document.getElementById('retry-btn');
                const offlineBtn = document.getElementById('offline-btn');
                
                if (retryBtn) {
                    retryBtn.addEventListener('click', async () => {
                        retryBtn.textContent = 'Testing...';
                        retryBtn.disabled = true;
                        await this.testConnection();
                        if (this.isConnected) {
                            await this.loadData();
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
                        this.loadSampleData();
                        this.render();
                        this.setupEventListeners();
                        this.isConnected = true;
                        this.updateConnectionStatus();
                    });
                }
            }, 100);
        }
    }
    
    showError(message) {
        const root = document.getElementById('root');
        if (root && !root.querySelector('.error-message')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message fixed top-4 right-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-sm z-50';
            errorDiv.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <span class="text-red-500">⚠️</span>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">${message}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <button onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700">
                            ×
                        </button>
                    </div>
                </div>
            `;
            root.appendChild(errorDiv);
            
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 5000);
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
        this.updateConnectionStatus();
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
        
        this.filteredPeople = this.people.filter(person => {
            const searchLower = this.searchQuery.toLowerCase();
            return (
                person.name.toLowerCase().includes(searchLower) ||
                person.id.toLowerCase().includes(searchLower) ||
                person.aliases.some(alias => alias.toLowerCase().includes(searchLower))
            );
        });
        
        const totalPeople = this.people.length;
        const filteredCount = this.filteredPeople.length;
        stats.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium">${totalPeople} people</span>
                ${this.searchQuery && filteredCount !== totalPeople ? 
                    `<span class="text-amber-600 font-medium">${filteredCount} filtered</span>` : 
                    ''
                }
            </div>
        `;
        
        list.innerHTML = '';
        
        if (this.filteredPeople.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center py-12 text-gray-500';
            empty.innerHTML = `
                <div class="text-4xl mb-3">🔍</div>
                <p class="font-medium">No matching people</p>
                ${this.searchQuery ? '<p class="text-sm mt-1">Try a different search</p>' : ''}
            `;
            list.appendChild(empty);
            return;
        }
        
        for (const person of this.filteredPeople) {
            const personEl = document.createElement('button');
            personEl.className = `w-full text-left p-4 border-b border-gray-50 flex items-center gap-4 transition-all ${
                this.selectedPerson?.id === person.id 
                    ? 'bg-amber-50 border-l-4 border-l-amber-700' 
                    : 'hover:bg-gray-50'
            }`;
            
            const birthYear = this.extractYear(person.birthDate);
            const deathYear = this.extractYear(person.deathDate);
            const age = this.calculateAge(person.birthDate, person.deathDate);
            
            const imageUrl = await this.getBestImageUrl(person.imageValue, person.id, '100');
            
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
                this.selectedPerson = person;
                await this.renderSelectedPerson();
                this.renderPeopleList();
            });
            
            list.appendChild(personEl);
        }
    }
    
    async renderSelectedPerson() {
        const content = document.getElementById('main-content');
        if (!content || !this.selectedPerson) return;
        
        const age = this.calculateAge(this.selectedPerson.birthDate, this.selectedPerson.deathDate);
        
        const profileImageUrl = await this.getBestImageUrl(this.selectedPerson.imageValue, this.selectedPerson.id, '400');
        const wallImageUrl = await this.getBestImageUrl(this.selectedPerson.wallPhotoValue, `${this.selectedPerson.id}_wall`, '800');
        
        content.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                    <div class="h-48 bg-gradient-to-r from-amber-800 to-amber-600 relative">
                        ${wallImageUrl 
                            ? `<img src="${wallImageUrl}" class="w-full h-full object-cover opacity-40" crossorigin="anonymous" loading="lazy" onerror="this.style.display='none'">`
                            : ''
                        }
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
                                    <h2 class="text-4xl font-bold serif text-white mb-2">${this.selectedPerson.name}</h2>
                                    <div class="flex items-center gap-4">
                                        <span class="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                                            ${this.selectedPerson.id}
                                        </span>
                                        ${age !== null && `<span class="text-amber-200 font-bold">${age} years</span>`}
                                        ${this.selectedPerson.birthOrder && `<span class="bg-amber-800 text-white px-3 py-1 rounded-full text-sm font-bold">${this.formatBirthOrder(this.selectedPerson.birthOrder)}</span>`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-8">
                        ${this.selectedPerson.description 
                            ? `<div class="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                                <p class="text-gray-700 italic">"${this.selectedPerson.description}"</p>
                              </div>`
                            : ''
                        }
                        
                        ${this.selectedPerson.aliases.length > 0 ? `
                            <div class="mb-6">
                                <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Also Known As</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${this.selectedPerson.aliases.map(alias => `
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
                                        ${this.selectedPerson.birthDate 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-amber-600 text-xl mt-1">🎂</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Born</p>
                                                    <p class="text-gray-900">${this.formatDate(this.selectedPerson.birthDate)}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                        ${this.selectedPerson.deathDate 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-gray-600 text-xl mt-1">🕊️</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Died</p>
                                                    <p class="text-gray-900">${this.formatDate(this.selectedPerson.deathDate)}</p>
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
                                        ${this.selectedPerson.occupation 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-blue-600 text-xl mt-1">💼</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Occupation</p>
                                                    <p class="text-gray-900">${this.selectedPerson.occupation}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                        ${this.selectedPerson.residence 
                                            ? `<div class="flex items-start gap-3">
                                                <span class="text-green-600 text-xl mt-1">🏠</span>
                                                <div>
                                                    <p class="font-medium text-gray-700">Residence</p>
                                                    <p class="text-gray-900">${this.selectedPerson.residence}</p>
                                                </div>
                                            </div>`
                                            : ''
                                        }
                                    </div>
                                </div>
                                
                                ${(this.selectedPerson.fatherId || this.selectedPerson.motherId) 
                                    ? `<div>
                                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Immediate Family</h3>
                                        <div class="flex flex-wrap gap-3" id="family-buttons-${this.selectedPerson.id}">
                                            ${this.selectedPerson.fatherId 
                                                ? `<button class="family-member relative px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
                                                           data-id="${this.selectedPerson.fatherId}"
                                                           onmouseenter="showFamilyPreview(event, '${this.selectedPerson.fatherId}')"
                                                           onmouseleave="hideFamilyPreview()"
                                                           onclick="navigateToPerson('${this.selectedPerson.fatherId}')">
                                                    <span class="text-blue-600">👨</span> Father
                                                  </button>`
                                                : ''
                                            }
                                            ${this.selectedPerson.motherId 
                                                ? `<button class="family-member relative px-3 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition flex items-center gap-2"
                                                           data-id="${this.selectedPerson.motherId}"
                                                           onmouseenter="showFamilyPreview(event, '${this.selectedPerson.motherId}')"
                                                           onmouseleave="hideFamilyPreview()"
                                                           onclick="navigateToPerson('${this.selectedPerson.motherId}')">
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
                            <a href="${this.selectedPerson.wikibaseUrl}" 
                               target="_blank"
                               class="px-5 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium flex items-center gap-2">
                                <span>✏️</span>
                                View/Edit in Wikibase
                            </a>
                            <button class="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2" onclick="showFamilyTree()">
                                <span>🌳</span>
                                View Family Tree
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.people.length}</div>
                        <div class="text-sm text-gray-600">Total People</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.people.filter(p => p.birthDate).length}</div>
                        <div class="text-sm text-gray-600">With Birth Dates</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.people.filter(p => p.imageValue).length}</div>
                        <div class="text-sm text-gray-600">With Image Property</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-amber-700">${this.people.filter(p => p.aliases.length > 0).length}</div>
                        <div class="text-sm text-gray-600">With Aliases</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners for family buttons
        setTimeout(() => {
            document.querySelectorAll('.family-member').forEach(button => {
                button.addEventListener('click', (e) => {
                    // Don't navigate if preview is being shown
                    if (e.target.closest('.family-preview')) return;
                    
                    const personId = e.currentTarget.dataset.id;
                    const person = this.people.find(p => p.id === personId);
                    if (person) {
                        this.selectedPerson = person;
                        this.renderSelectedPerson();
                        this.renderPeopleList();
                    }
                });
            });
        }, 100);
    }
    
    extractYear(dateString) {
        if (!dateString) return null;
        
        if (dateString.startsWith('+')) {
            const yearMatch = dateString.match(/^\+(\d{4})/);
            return yearMatch ? yearMatch[1] : null;
        }
        
        const yearMatch = dateString.match(/\b(\d{4})\b/);
        return yearMatch ? yearMatch[1] : null;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            if (dateString.startsWith('+')) {
                dateString = dateString.substring(1);
            }
            
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
            
            return dateString;
        } catch (e) {
            return dateString;
        }
    }
    
    calculateAge(birth, death) {
        const birthYear = this.extractYear(birth);
        if (!birthYear) return null;
        
        const currentYear = new Date().getFullYear();
        const deathYear = this.extractYear(death);
        
        const endYear = deathYear || currentYear;
        const age = parseInt(endYear) - parseInt(birthYear);
        
        return age >= 0 ? age : null;
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
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
                
                imageCache.clear();
                await this.loadData();
                
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            });
        }
    }
}

// Family preview functionality
let previewTimeout;

function showFamilyPreview(event, personId) {
    clearTimeout(previewTimeout);
    
    const existingPreview = document.getElementById('family-preview');
    if (existingPreview) existingPreview.remove();
    
    const app = window.genealogyApp;
    const person = app.people.find(p => p.id === personId);
    if (!person) return;
    
    const preview = document.createElement('div');
    preview.id = 'family-preview';
    preview.className = 'family-preview';
    
    const rect = event.target.getBoundingClientRect();
    preview.style.left = (rect.left + window.scrollX) + 'px';
    preview.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    
    preview.innerHTML = `
        <h4 class="font-bold text-gray-800">${person.name}</h4>
        <div class="quick-info text-sm space-y-1 mt-2">
            <div class="text-gray-600"><span class="font-medium">ID:</span> ${person.id}</div>
            ${person.birthDate ? `<div class="text-gray-600"><span class="font-medium">Born:</span> ${app.extractYear(person.birthDate)}</div>` : ''}
            ${person.deathDate ? `<div class="text-gray-600"><span class="font-medium">Died:</span> ${app.extractYear(person.deathDate)}</div>` : ''}
            ${person.occupation ? `<div class="text-gray-600"><span class="font-medium">Occupation:</span> ${person.occupation}</div>` : ''}
        </div>
        <button onclick="navigateToPerson('${person.id}')" 
                class="mt-3 w-full px-3 py-2 bg-amber-100 text-amber-800 rounded text-sm font-medium hover:bg-amber-200 transition">
            View Full Profile
        </button>
    `;
    
    document.body.appendChild(preview);
    
    previewTimeout = setTimeout(() => {
        preview.classList.add('show');
    }, 300);
}

function hideFamilyPreview() {
    clearTimeout(previewTimeout);
    const preview = document.getElementById('family-preview');
    if (preview) {
        preview.classList.remove('show');
        setTimeout(() => {
            if (preview.parentElement) preview.remove();
        }, 200);
    }
}

function navigateToPerson(personId) {
    hideFamilyPreview();
    
    const app = window.genealogyApp;
    const person = app.people.find(p => p.id === personId);
    if (person) {
        app.selectedPerson = person;
        app.renderSelectedPerson();
        app.renderPeopleList();
        
        // Scroll to top of main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }
}

function showFamilyTree() {
    alert('Family tree visualization coming soon!');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new GenealogyApp();
});
