// modules/utils.js - Helper functions and global utilities

// Family preview functionality (moved from app.js)
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
            ${person.birthDate ? `<div class="text-gray-600"><span class="font-medium">Born:</span> ${extractYear(person.birthDate)}</div>` : ''}
            ${person.deathDate ? `<div class="text-gray-600"><span class="font-medium">Died:</span> ${extractYear(person.deathDate)}</div>` : ''}
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
        app.uiRenderer.renderSelectedPerson();
        app.uiRenderer.renderPeopleList();
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }
}

function showFamilyTree() {
    if (
        window.genealogyApp &&
        typeof window.genealogyApp.showFamilyTreeVisualization === 'function'
    ) {
        window.genealogyApp.showFamilyTreeVisualization();
    } else {
        console.error('GenealogyApp not ready yet');
    }
}


// Date helper functions
function extractYear(dateString) {
    if (!dateString) return null;
    
    if (dateString.startsWith('+')) {
        const yearMatch = dateString.match(/^\+(\d{4})/);
        return yearMatch ? yearMatch[1] : null;
    }
    
    const yearMatch = dateString.match(/\b(\d{4})\b/);
    return yearMatch ? yearMatch[1] : null;
}

function formatDate(dateString) {
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

function calculateAge(birth, death) {
    const birthYear = extractYear(birth);
    if (!birthYear) return null;
    
    const currentYear = new Date().getFullYear();
    const deathYear = extractYear(death);
    
    const endYear = deathYear || currentYear;
    const age = parseInt(endYear) - parseInt(birthYear);
    
    return age >= 0 ? age : null;
}

function formatBirthOrder(order) {
    if (!order) return '';
    
    const num = parseInt(order);
    if (isNaN(num)) return order;
    
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} born`;
}

// Error and loading display
function showError(message) {
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

function showLoading() {
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
