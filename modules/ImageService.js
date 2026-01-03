// modules/ImageService.js - FIXED VERSION

class ImageService {
    constructor() {
        this.imageCache = new Map();
        this.imageTests = new Map(); // Track which images exist
    }
    
    // Get ALL images for a person - FIXED
    async getAllPersonImages(personId) {
        // Check cache first
        if (this.imageCache.has(personId)) {
            return this.imageCache.get(personId);
        }
        
        const images = [];
        const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
        
        // Function to test if an image exists - FIXED
        const testImage = async (filename) => {
            const cacheKey = `test_${filename}`;
            
            // Check if we already tested this file
            if (this.imageTests.has(cacheKey)) {
                const result = this.imageTests.get(cacheKey);
                return result.exists ? result.url : null;
            }
            
            for (const ext of extensions) {
                const localUrl = `assets/${filename}${ext}`;
                
                const exists = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        console.log(`✅ Image found: ${localUrl}`);
                        resolve({ exists: true, url: localUrl });
                    };
                    img.onerror = () => {
                        console.log(`❌ Image not found: ${localUrl}`);
                        resolve({ exists: false, url: null });
                    };
                    
                    // REMOVED cache-busting for the test - it was causing issues
                    img.src = localUrl;
                    
                    setTimeout(() => {
                        if (!img.complete) {
                            resolve({ exists: false, url: null });
                        }
                    }, 500);
                });
                
                if (exists.exists) {
                    // Cache the test result
                    this.imageTests.set(cacheKey, exists);
                    return exists.url;
                }
            }
            
            // Cache negative result
            this.imageTests.set(cacheKey, { exists: false, url: null });
            return null;
        };
        
        // Check for main image (Q1.jpg)
        const mainImage = await testImage(personId);
        if (mainImage) {
            images.push(mainImage);
            console.log(`Main image for ${personId}: ${mainImage}`);
        } else {
            console.log(`No main image for ${personId}`);
        }
        
        // Check for additional images (Q1_1.jpg, Q1_2.jpg, etc.)
        for (let i = 1; i <= 10; i++) {
            const additionalImage = await testImage(`${personId}_${i}`);
            if (additionalImage) {
                images.push(additionalImage);
                console.log(`Additional image ${i} for ${personId}: ${additionalImage}`);
            } else {
                // Stop if no image found at this index
                break;
            }
        }
        
        // Cache the result
        this.imageCache.set(personId, images);
        console.log(`Cached ${images.length} images for ${personId}`);
        return images;
    }
    
    // Simplified image loading for single image - FIXED
    async getBestImageUrl(personId) {
        const images = await this.getAllPersonImages(personId);
        const result = images.length > 0 ? images[0] : null;
        console.log(`getBestImageUrl for ${personId}: ${result}`);
        return result;
    }
    
    // Show image gallery modal (unchanged)
    showImageGallery(personId, personName, images, startIndex = 0, app) {
        // ... (keep the existing gallery code)
        // Remove any existing gallery
        const existingGallery = document.getElementById('image-gallery-modal');
        if (existingGallery) {
            existingGallery.remove();
        }
        
        // Create gallery modal
        const gallery = document.createElement('div');
        gallery.id = 'image-gallery-modal';
        gallery.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4';
        gallery.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${personName}</h3>
                        <p class="text-gray-600">${images.length} image${images.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button id="close-gallery" class="text-gray-500 hover:text-gray-700 text-2xl">
                        &times;
                    </button>
                </div>
                
                <!-- Main Image -->
                <div class="flex-1 p-6 flex items-center justify-center overflow-hidden">
                    <img id="gallery-main-image" 
                         src="${images[startIndex]}" 
                         class="max-h-[60vh] max-w-full object-contain rounded-lg"
                         alt="${personName}">
                </div>
                
                <!-- Thumbnails -->
                ${images.length > 1 ? `
                    <div class="p-4 border-t border-gray-200">
                        <div class="flex gap-2 overflow-x-auto pb-2">
                            ${images.map((img, index) => `
                                <button class="gallery-thumbnail flex-shrink-0 ${index === startIndex ? 'ring-2 ring-amber-500' : ''}" 
                                        data-index="${index}">
                                    <img src="${img}" 
                                         class="w-20 h-20 object-cover rounded-lg hover:opacity-90"
                                         alt="Thumbnail ${index + 1}">
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Navigation -->
                ${images.length > 1 ? `
                    <div class="p-4 border-t border-gray-200 flex justify-between">
                        <button id="prev-image" 
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
                            ← Previous
                        </button>
                        <div class="text-gray-600">
                            <span id="current-index">${startIndex + 1}</span> / ${images.length}
                        </div>
                        <button id="next-image" 
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
                            Next →
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(gallery);
        
        // Add event listeners
        document.getElementById('close-gallery').addEventListener('click', () => {
            gallery.remove();
        });
        
        gallery.addEventListener('click', (e) => {
            if (e.target === gallery) {
                gallery.remove();
            }
        });
        
        // Thumbnail click events
        if (images.length > 1) {
            document.querySelectorAll('.gallery-thumbnail').forEach((thumb, index) => {
                thumb.addEventListener('click', () => {
                    this.changeGalleryImage(index, images);
                });
            });
        }
        
        // Keyboard navigation
        if (images.length > 1) {
            let currentIndex = startIndex;
            
            document.getElementById('prev-image').addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                this.changeGalleryImage(currentIndex, images);
            });
            
            document.getElementById('next-image').addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % images.length;
                this.changeGalleryImage(currentIndex, images);
            });
            
            // Keyboard shortcuts
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') gallery.remove();
                if (e.key === 'ArrowLeft') document.getElementById('prev-image').click();
                if (e.key === 'ArrowRight') document.getElementById('next-image').click();
            };
            
            document.addEventListener('keydown', handleKeyDown);
            
            // Clean up event listener when gallery closes
            const originalRemove = gallery.remove;
            gallery.remove = function() {
                document.removeEventListener('keydown', handleKeyDown);
                originalRemove.call(this);
            };
        }
    }
    
    // Change gallery image (unchanged)
    changeGalleryImage(index, images) {
        const gallery = document.getElementById('image-gallery-modal');
        if (!gallery) return;
        
        const mainImg = document.getElementById('gallery-main-image');
        const currentIndexSpan = document.getElementById('current-index');
        const thumbnails = document.querySelectorAll('.gallery-thumbnail');
        
        if (images[index]) {
            mainImg.src = images[index];
            if (currentIndexSpan) currentIndexSpan.textContent = index + 1;
            
            // Update active thumbnail
            thumbnails.forEach(thumb => {
                const thumbIndex = parseInt(thumb.dataset.index);
                if (thumbIndex === index) {
                    thumb.classList.add('ring-2', 'ring-amber-500');
                } else {
                    thumb.classList.remove('ring-2', 'ring-amber-500');
                }
            });
        }
    }
    
    // Clear image cache
    clearCache() {
        this.imageCache.clear();
        this.imageTests.clear();
        console.log('Image cache cleared');
    }
}
