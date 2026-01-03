// app.js - dTree-enabled Genealogy App

console.log('app.js loading...');

document.addEventListener('DOMContentLoaded', () => {
    new GenealogyApp();
});

class GenealogyApp {
    constructor() {
        this.people = [];
        this.selectedPerson = null;
        this.searchQuery = '';
        this.isConnected = false;

        this.dataService = new DataService();
        this.imageService = new ImageService();
        this.uiRenderer = new UIRenderer(this);
        this.familyTreeService = new FamilyTreeService(this);

        window.genealogyApp = this;
        this.init();
    }

    async init() {
        this.isConnected = await this.dataService.testConnection();

        if (this.isConnected) {
            await this.loadData();
            this.uiRenderer.render();
            this.uiRenderer.setupEventListeners();
        } else {
            this.dataService.showConnectionError();
            this.uiRenderer.setupConnectionEventListeners();
        }
    }

    async loadData() {
        showLoading();
        const data = await this.dataService.fetchFromWikibase();
        this.people = data
            ? this.dataService.processSparqlResults(data)
            : this.dataService.loadSampleData();

        if (this.people.length > 0) {
            this.selectedPerson = this.people[0];
        }
    }

    // ===== FAMILY TREE VIEW =====

    showFamilyTreeVisualization() {
        const content = document.getElementById('main-content');
        if (!content || !this.selectedPerson) return;

        content.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold serif">Family Tree</h2>
                        <p class="text-gray-600">Ancestors of ${this.selectedPerson.name}</p>
                    </div>
                    <button
                        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        onclick="window.genealogyApp.hideFamilyTree()">
                        ← Back
                    </button>
                </div>

                <div class="bg-white border rounded shadow p-4">
                    <div id="family-tree" class="overflow-auto"></div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.familyTreeService.renderTree(
                'family-tree',
                this.selectedPerson.id
            );
        }, 50);
    }

    hideFamilyTree() {
        if (this.uiRenderer && this.selectedPerson) {
            this.uiRenderer.renderSelectedPerson();
        }
    }
}
