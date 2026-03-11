class App {
    constructor() {
        this.map = null;
        this.markers = [];
        this.init();
    }

    init() {
        // Run initial setup when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.navigate('home');
            this.renderRestaurantListings();
            this.renderNGOFeed();
        });
    }

    // --- Navigation & Routing ---
    navigate(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-section').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show target page
        document.getElementById(`page-${pageId}`).classList.add('active');

        // Update nav styling
        document.querySelectorAll('.nav-links a').forEach(el => {
            el.classList.remove('active');
        });
        const navEl = document.getElementById(`nav-${pageId}`);
        if(navEl) navEl.classList.add('active');

        // Page specific logic
        if (pageId === 'ngo') {
            // Leaflet map needs to know when container is visible to render correctly
            setTimeout(() => {
                this.initMap();
                this.renderNGOFeed();
            }, 100);
        } else if (pageId === 'restaurant') {
            this.renderRestaurantListings();
        }
    }

    // --- Map Logic ---
    initMap() {
        if (this.map) {
            this.map.invalidateSize();
            this.updateMapMarkers();
            return;
        }

        // Initialize map centered roughly on New York (from mock data)
        const mapEl = document.getElementById('food-map');
        if (!mapEl) return;

        // Default coordinate (Coimbatore, Tamil Nadu)
        this.map = L.map('food-map').setView([11.0168, 76.9558], 12);

        // Add Dark Mode CartoDB tiles to match modern aesthetic
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.updateMapMarkers();
    }

    updateMapMarkers() {
        if (!this.map) return;
        
        // Clear old markers
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        const items = window.DataStore.getItems().filter(i => i.status === 'available');

        items.forEach(item => {
            if (item.lat && item.lng) {
                // Create custom icon
                const myIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background:var(--primary);width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px var(--primary);"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });

                const marker = L.marker([item.lat, item.lng], {icon: myIcon})
                    .bindPopup(`
                        <div style="color:black;padding:5px;">
                            <strong>${item.title}</strong><br>
                            ${item.restaurantName}<br>
                            <em>${item.quantity}</em>
                        </div>
                    `)
                    .addTo(this.map);
                this.markers.push(marker);
            }
        });
    }

    // --- Formatters ---
    formatDate(dateString) {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
        });
    }

    // --- Restaurant Logic ---
    async handlePredictSubmit(e) {
        e.preventDefault();
        
        const btn = document.getElementById('btn-predict');
        const resultDiv = document.getElementById('prediction-result');
        const amountEl = document.getElementById('pred-amount');
        const helperEl = document.getElementById('pred-helper-text');
        
        // Form Data
        const foodType = document.getElementById('pred-food-type').value;
        const guests = parseInt(document.getElementById('pred-guests').value);
        const quantity = parseFloat(document.getElementById('pred-quantity').value);
        const eventType = document.getElementById('pred-event').value;
        const season = document.getElementById('pred-season').value;

        // UI Loading State
        btn.textContent = 'Analyzing...';
        btn.disabled = true;
        resultDiv.style.display = 'none';

        // Prepare Payload exactly matching training columns (Type of Food, Number of Guests, Quantity of Food, etc)
        const payload = {
            "Number of Guests": guests,
            "Quantity of Food": quantity,
            "Pricing": 0, // Mock missing numeric feature
            // Categorical - python gets_dummies will handle these
            "Type of Food": foodType,
            "Event Type": eventType,
            "Seasonality": season,
            "Storage Conditions": "Refrigerated", // Default for prediction
            "Purchase History": "Regular",
            "Preparation Method": "Buffet",
            "Geographical Location": "Urban"
        };

        try {
            const response = await fetch('http://localhost:8001/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            
            if (data.status === 'success') {
                const wastage = data.predicted_wastage.toFixed(1);
                amountEl.textContent = `${wastage} ${quantity > 50 ? 'Servings/Kg' : 'Units'}`;
                helperEl.textContent = `Based on our AI model, you might over-prepare by roughly ${wastage} units. Consider reducing prep or listing this surplus immediately on the platform!`;
                this.showToast('AI Prediction Complete', 'success');
            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            console.warn("ML API Error, falling back to heuristic:", error);
            // Fallback Heuristic
            // Roughly 10-15% of quantity + a penalty for buffet/meat
            let fallbackWastage = quantity * 0.12;
            if (foodType === 'Meat') fallbackWastage += (quantity * 0.05);
            if (season === 'Summer') fallbackWastage += (quantity * 0.03);
            
            const wastage = fallbackWastage.toFixed(1);
            amountEl.textContent = `~${wastage} ${quantity > 50 ? 'Servings/Kg' : 'Units'}`;
            helperEl.textContent = `(Fallback Estimation) You might over-prepare by roughly ${wastage} units. Consider reducing prep!`;
            this.showToast('Used heuristic estimation (ML API offline)', 'info');
        } finally {
            btn.textContent = 'Run AI Prediction';
            btn.disabled = false;
            resultDiv.style.display = 'block';
            resultDiv.style.animation = 'fadeIn 0.4s ease-out';
        }
    }

    handleFoodSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('food-title').value;
        const quantity = document.getElementById('food-quantity').value;
        const expiry = document.getElementById('food-expiry').value;
        const restaurantName = document.getElementById('food-restaurant-name').value;
        const locationArea = document.getElementById('food-location').value;

        // Base coordinates for selected areas
        const areaCoords = {
            'RSPuram': { lat: 11.0076, lng: 76.9498 },
            'Gandhipuram': { lat: 11.0183, lng: 76.9664 },
            'Peelamedu': { lat: 11.0289, lng: 77.0025 },
            'SaiBabaColony': { lat: 11.0264, lng: 76.9452 }
        };

        const base = areaCoords[locationArea] || areaCoords['RSPuram'];
        
        // Add small random offset to scatter markers in the selected area
        const randomLat = base.lat + (Math.random() * 0.005 - 0.0025);
        const randomLng = base.lng + (Math.random() * 0.005 - 0.0025);

        const newItem = {
            id: 'f' + Date.now(),
            title,
            quantity,
            expiry,
            restaurantName,
            status: 'available',
            lat: randomLat,
            lng: randomLng,
            createdAt: new Date().toISOString()
        };

        window.DataStore.addItem(newItem);
        this.showToast('Food listed successfully!', 'success');
        document.getElementById('add-food-form').reset();
        this.renderRestaurantListings();
        this.updateMapMarkers(); // update map if initialized
    }

    renderRestaurantListings() {
        const container = document.getElementById('restaurant-listings');
        if (!container) return;

        const items = window.DataStore.getItems();
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No listings yet.</p>';
            return;
        }

        // Show all items, sorting newest first
        items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';
            
            const isAvailable = item.status === 'available';
            
            el.innerHTML = `
                <div class="item-header">
                    <div class="item-title">${item.title}</div>
                    <div class="item-status ${isAvailable ? 'status-available' : 'status-claimed'}">
                        ${isAvailable ? 'Available' : 'Claimed'}
                    </div>
                </div>
                <div class="item-details">
                    <span><strong>Quantity:</strong> ${item.quantity}</span>
                    <span><strong>Deadline:</strong> ${this.formatDate(item.expiry)}</span>
                    ${!isAvailable ? `<span><strong>Claimed by:</strong> ${item.claimedBy}</span>` : ''}
                </div>
            `;
            container.appendChild(el);
        });
    }

    // --- NGO Logic ---
    renderNGOFeed() {
        const container = document.getElementById('ngo-feed');
        if (!container) return;

        const searchTerm = document.getElementById('food-search').value.toLowerCase();
        const locationFilter = document.getElementById('ngo-location-filter').value;

        let items = window.DataStore.getItems().filter(i => i.status === 'available');

        // Text Search
        if (searchTerm) {
            items = items.filter(i => 
                i.title.toLowerCase().includes(searchTerm) || 
                i.restaurantName.toLowerCase().includes(searchTerm)
            );
        }

        // Location Filter
        if (locationFilter !== 'All') {
            const areaCoords = {
                'RSPuram': { lat: 11.0076, lng: 76.9498 },
                'Gandhipuram': { lat: 11.0183, lng: 76.9664 },
                'Peelamedu': { lat: 11.0289, lng: 77.0025 },
                'SaiBabaColony': { lat: 11.0264, lng: 76.9452 }
            };
            const base = areaCoords[locationFilter];
            
            items = items.filter(i => {
                // If it's within roughly ~3-5 miles of the base coordinate
                const latDiff = Math.abs(i.lat - base.lat);
                const lngDiff = Math.abs(i.lng - base.lng);
                return (latDiff < 0.04 && lngDiff < 0.04);
            });
        }

        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No available food found.</p>';
            return;
        }

        items.sort((a,b) => new Date(a.expiry) - new Date(b.expiry)).forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';
            
            el.innerHTML = `
                <div class="item-header">
                    <div class="item-title">${item.title}</div>
                    <div class="item-status status-available">Available</div>
                </div>
                <div class="item-details">
                    <span><strong>From:</strong> ${item.restaurantName}</span>
                    <span><strong>Quantity:</strong> ${item.quantity}</span>
                    <span><strong>Pick up by:</strong> ${this.formatDate(item.expiry)}</span>
                </div>
                <div style="margin-top: 0.5rem">
                    <button class="btn btn-primary btn-sm" onclick="app.claimFood('${item.id}')">Claim Food</button>
                </div>
            `;
            container.appendChild(el);
        });
    }

    filterFeed() {
        this.renderNGOFeed();
    }

    changeMapLocation() {
        const locationFilter = document.getElementById('ngo-location-filter').value;
        const areaCoords = {
            'RSPuram': { lat: 11.0076, lng: 76.9498 },
            'Gandhipuram': { lat: 11.0183, lng: 76.9664 },
            'Peelamedu': { lat: 11.0289, lng: 77.0025 },
            'SaiBabaColony': { lat: 11.0264, lng: 76.9452 },
            'All': { lat: 11.0168, lng: 76.9558 } // Default Coimbatore Center
        };

        const target = areaCoords[locationFilter] || areaCoords['All'];
        
        // Pan the map smoothly, zoom differently if 'All' vs specific area
        const zoom = locationFilter === 'All' ? 12 : 14;
        if (this.map) {
            this.map.flyTo([target.lat, target.lng], zoom, {
                animate: true,
                duration: 1.5
            });
        }
        
        this.renderNGOFeed();
    }

    claimFood(id) {
        const success = window.DataStore.updateItemStatus(id, 'claimed', 'City Food Rescue');
        if (success) {
            this.showToast('Food claimed successfully!', 'success');
            this.renderNGOFeed();
            this.updateMapMarkers();
        }
    }

    // --- UI Helpers ---
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            ${type === 'success' ? '✅' : 'ℹ️'} 
            <span>${message}</span>
        `;
        
        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize global app instance
window.app = new App();
