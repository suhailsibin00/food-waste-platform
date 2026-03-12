// Generate some initial mock data
const INITIAL_FOOD_ITEMS = [
    {
        id: 'f1',
        title: '50 South Indian Meals (Sambar, Rasam, Rice)',
        quantity: '50 Servings',
        restaurantName: 'RS Puram Grand Hotel',
        expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        status: 'available',
        lat: 11.0076,
        lng: 76.9498,
        locationArea: 'RSPuram',
        createdAt: new Date().toISOString()
    },
    {
        id: 'f2',
        title: 'Mixed Sweets and Snacks',
        quantity: '10 kg',
        restaurantName: 'Gandhipuram Sweets & Bakers',
        expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        status: 'available',
        lat: 11.0183,
        lng: 76.9664,
        locationArea: 'Gandhipuram',
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'f3',
        title: 'Vegetable Biryani Packets',
        quantity: '25 Servings',
        restaurantName: 'Peelamedu Biryani Hub',
        expiry: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        status: 'claimed',
        claimedBy: 'Kovai Food Trust',
        lat: 11.0289,
        lng: 77.0025,
        locationArea: 'Peelamedu',
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'f4',
        title: '30 Parottas with Salna',
        quantity: '30 Servings',
        restaurantName: 'Madurai Mess RS Puram',
        expiry: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        status: 'available',
        lat: 11.0065,
        lng: 76.9530,
        locationArea: 'RSPuram',
        createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
        id: 'f5',
        title: 'Assorted Fresh Fruits',
        quantity: '5 kg',
        restaurantName: 'Fresh Farms Sai Baba Colony',
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'available',
        lat: 11.0264,
        lng: 76.9452,
        locationArea: 'SaiBabaColony',
        createdAt: new Date().toISOString()
    },
    {
        id: 'f6',
        title: 'Leftover Buffet Items (Curd Rice & Pickle)',
        quantity: '20 Servings',
        restaurantName: 'Corporate Park Cafeteria',
        expiry: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'available',
        lat: 11.0280,
        lng: 77.0000,
        locationArea: 'Peelamedu',
        createdAt: new Date(Date.now() - 7200000).toISOString()
    }
];

// Provide helper to get/set data
window.DataStore = {
    getItems: () => {
        const items = localStorage.getItem('foodItemsV2');
        if (!items) {
            localStorage.setItem('foodItemsV2', JSON.stringify(INITIAL_FOOD_ITEMS));
            return INITIAL_FOOD_ITEMS;
        }
        return JSON.parse(items);
    },
    
    addItem: (item) => {
        const items = window.DataStore.getItems();
        items.unshift(item); // Add to beginning
        localStorage.setItem('foodItemsV2', JSON.stringify(items));
    },
    
    updateItemStatus: (id, status, ngoName = 'Your NGO') => {
        const items = window.DataStore.getItems();
        const itemIndex = items.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            items[itemIndex].status = status;
            if (status === 'claimed') {
                items[itemIndex].claimedBy = ngoName;
            }
            localStorage.setItem('foodItemsV2', JSON.stringify(items));
            return true;
        }
        return false;
    }
};
