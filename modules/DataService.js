// modules/DataService.js - Handles all data fetching and processing

class DataService {
    constructor() {
        this.WIKIBASE_SPARQL_ENDPOINT = 'https://masssly.wikibase.cloud/query/sparql';
        this.WIKIBASE_BASE_URL = 'https://masssly.wikibase.cloud/wiki/Item:';
        
        this.PROP_IDS = {
            INSTANCE_OF: 'P3',
            FATHER: 'P4',
            MOTHER: 'P5', 
            BIRTH_DATE: 'P21',
            DEATH_DATE: 'P23',
            OCCUPATION: 'P20',
            RESIDENCE: 'P19',
            BIRTH_ORDER: 'P18'
        };
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
            
            const url = `${this.WIKIBASE_SPARQL_ENDPOINT}?query=${encodeURIComponent(testQuery)}&format=json`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/sparql-results+json' }
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
    
    async fetchFromWikibase() {
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
                       ?residenceLabel ?occupationLabel ?alias
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
            
            const url = `${this.WIKIBASE_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
            
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
            
            return await response.json();
            
        } catch (error) {
            console.error('Error loading data:', error);
            
            if (error.name === 'AbortError') {
                showError('Request timed out.');
            } else {
                showError('Failed to load data from Wikibase.');
            }
            
            return null;
        }
    }
    
    processSparqlResults(data) {
        if (!data.results || !data.results.bindings) {
            console.warn('No data returned from SPARQL query');
            return this.loadSampleData();
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
                    description: row.personDescription?.value,
                    wikibaseUrl: `${this.WIKIBASE_BASE_URL}${id}`,
                    aliases: []
                };
            }
            
            if (row.alias?.value && !peopleMap[id].aliases.includes(row.alias.value)) {
                peopleMap[id].aliases.push(row.alias.value);
            }
        });
        
        const people = Object.values(peopleMap);
        console.log(`Loaded ${people.length} people from Wikibase`);
        return people;
    }
    
    loadSampleData() {
        return [
            {
                id: 'Q1',
                name: 'John Smith',
                birthDate: '+1950-05-15T00:00:00Z',
                deathDate: '+2020-03-10T00:00:00Z',
                occupation: 'Engineer',
                residence: 'London, England',
                description: 'Family patriarch',
                wikibaseUrl: `${this.WIKIBASE_BASE_URL}Q1`,
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
                wikibaseUrl: `${this.WIKIBASE_BASE_URL}Q2`,
                aliases: [],
                fatherId: null,
                motherId: null,
                birthOrder: '2'
            }
        ];
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
                            <code class="text-sm bg-gray-100 p-2 rounded block">${this.WIKIBASE_SPARQL_ENDPOINT}</code>
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
        }
    }
}
