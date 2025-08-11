let directionPointCounter = 1;
// Initialize the map with Esri World Imagery
const map = L.map('map').setView([20, 0], 3);

// Add Esri World Imagery base layer
const esriLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
}).addTo(map);

// Initialize the feature group to store editable layers
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// State for direction measurement
let mainPoint = null;
let directionMode = false;
let directionLines = new L.FeatureGroup();
map.addLayer(directionLines);

// DOM elements
const nameModal = document.getElementById('name-modal');
const featureTitleInput = document.getElementById('feature-title');
const featureDescriptionInput = document.getElementById('feature-description');
const featureColorInput = document.getElementById('feature-color');
const saveFeatureBtn = document.getElementById('save-feature-btn');
const closeModal = document.getElementsByClassName('close')[0];
const coordinateDisplay = document.getElementById('coordinate-display');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchSuggestions = document.getElementById('search-suggestions');
const searchContainer = document.querySelector('.search-container');
const setMainPointBtn = document.getElementById('set-main-point-btn');
const findDirectionBtn = document.getElementById('find-direction-btn');
const findLocationBtn = document.getElementById('find-location-btn');
const directionInfo = document.getElementById('direction-info');
const directionDetails = document.getElementById('direction-details');

// Initialize the draw control
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true
    },
    draw: {
        polyline: { shapeOptions: { color: '#FF0000' } },
        polygon: { shapeOptions: { color: '#FF0000' } },
        rectangle: { shapeOptions: { color: '#FF0000' } },
        circle: { shapeOptions: { color: '#FF0000' } },
        marker: true,
        circlemarker: false,
        toolbar: {
            actions: {
                title: 'Cancel drawing'
            },
            finish: {
                title: 'Finish drawing'
            }
        }
    }
});
map.addControl(drawControl);

// Event handler for when a new shape is finished drawing
map.on(L.Draw.Event.CREATED, (e) => {
    const { layer } = e;
    currentLayer = layer;
    nameModal.style.display = 'block';
    featureTitleInput.value = '';
    featureDescriptionInput.value = '';
    featureColorInput.value = '#FF0000';
});

// Event handler for saving a feature from the modal
saveFeatureBtn.addEventListener('click', () => {
    if (currentLayer) {
        const title = featureTitleInput.value || 'Untitled Feature';
        const description = featureDescriptionInput.value;
        const color = featureColorInput.value;

        if (currentLayer instanceof L.Marker) {
            currentLayer.options.color = color;
        } else {
            currentLayer.setStyle({ color: color });
        }

        currentLayer.feature = currentLayer.feature || {};
        currentLayer.feature.properties = currentLayer.feature.properties || {};
        currentLayer.feature.properties.title = title;
        currentLayer.feature.properties.description = description;
        currentLayer.feature.properties.color = color;

        drawnItems.addLayer(currentLayer);
        addFeatureToSidebar(currentLayer, title, description);
        
        nameModal.style.display = 'none';
        currentLayer = null;
    }
});

// Event handler for closing the modal
closeModal.addEventListener('click', () => {
    nameModal.style.display = 'none';
    if (currentLayer) {
        map.removeLayer(currentLayer);
        currentLayer = null;
    }
});

// Event handler for mouse movement to display coordinates
map.on('mousemove', (e) => {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    coordinateDisplay.innerHTML = `<strong>Coordinates</strong><br>Lat: ${lat}°<br>Long: ${lng}°`;
});

// Function to add a feature to the sidebar list
function addFeatureToSidebar(layer, title, description) {
    const featureList = document.getElementById('saved-features');
    const featureItem = document.createElement('div');
    featureItem.className = 'feature-item';

    let icon = '';
    let measurement = '';
    
    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        icon = '<i class="fas fa-route"></i>';
        const distance = layer.getLatLngs().reduce((total, point, index, array) => {
            if (index > 0) return total + array[index - 1].distanceTo(point);
            return total;
        }, 0);
        measurement = `Distance: ${distance.toFixed(0)} m`;
    } else if (layer instanceof L.Polygon) {
        icon = '<i class="fas fa-draw-polygon"></i>';
        const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 1000000;
        measurement = `Area: ${area.toFixed(3)} km²`;
    } else if (layer instanceof L.Marker) {
        icon = '<i class="fas fa-map-pin"></i>';
        const latLng = layer.getLatLng();
        measurement = `Coordinates: ${latLng.lat.toFixed(6)}°, ${latLng.lng.toFixed(6)}°`;
    } else if (layer instanceof L.Rectangle || layer instanceof L.Circle) {
        icon = '<i class="fas fa-vector-square"></i>';
        if (layer instanceof L.Circle) {
            const radius = layer.getRadius();
            const area = Math.PI * radius * radius / 1000000;
            measurement = `Area: ${area.toFixed(3)} km²`;
        } else {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 1000000;
            measurement = `Area: ${area.toFixed(3)} km²`;
        }
    }
    
    featureItem.innerHTML = `
        <div>${icon} <strong>${title}</strong><br>
            <small>${description || 'No description'}</small><br>
            <small>${measurement}</small>
        </div>
        <span class="delete-feature" title="Delete">×</span>
    `;
    
    featureItem.querySelector('.delete-feature').addEventListener('click', (e) => {
        e.stopPropagation();
        drawnItems.removeLayer(layer);
        featureItem.remove();
    });
    
    featureItem.addEventListener('click', () => {
        const popupContent = `
            <strong>${title}</strong><br>
            ${description || 'No description'}<br>
            <small>${measurement}</small>
        `;

        if (layer instanceof L.Marker) {
            layer.bindPopup(popupContent).openPopup();
            map.setView(layer.getLatLng(), 15);
        } else {
            layer.bindPopup(popupContent).openPopup();
            map.fitBounds(layer.getBounds());
        }
    });

    featureList.appendChild(featureItem);
}

// Event listener for clearing all features
document.getElementById('clear-all-btn').addEventListener('click', () => {
    drawnItems.clearLayers();
    document.getElementById('saved-features').innerHTML = '';
});

// Main Point and Direction Measurement
setMainPointBtn.addEventListener('click', () => {
    if (mainPoint) {
        map.removeLayer(mainPoint);
        directionLines.clearLayers();
        directionInfo.style.display = 'none';
        findDirectionBtn.disabled = true;
        findDirectionBtn.innerHTML = '<i class="fas fa-compass"></i> Find Direction';
        findDirectionBtn.classList.remove('active-btn');
        setMainPointBtn.classList.remove('active-btn');
        directionMode = false;
        mainPoint = null;
        directionPointCounter = 1; // Reset counter
        return;
    }
    
    // Create the main point at the current center
    mainPoint = L.marker(map.getCenter(), {
        icon: L.divIcon({
            className: 'main-point-icon',
            html: '<i class="fas fa-crosshairs" style="color: #FF0000; font-size: 24px;"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        }),
        draggable: true
    }).addTo(map);
    
    // Highlight the button
    setMainPointBtn.classList.add('active-btn');
    
    // Enable direction features
    findDirectionBtn.disabled = false;
    directionInfo.style.display = 'block';
    directionDetails.innerHTML = 'Main point set. Click "Find Direction" and then click on the map.';
    
    // Set up drag event
    mainPoint.on('dragend', function() {
        updateDirectionLines();
    });
});

findDirectionBtn.addEventListener('click', () => {
    if (!mainPoint) {
        showMessage("Please set a main point first");
        return;
    }

    directionMode = !directionMode;
    
    if (directionMode) {
        findDirectionBtn.innerHTML = '<i class="fas fa-compass"></i> Cancel Direction Mode';
        findDirectionBtn.style.backgroundColor = 'var(--primary-color)';
        directionDetails.innerHTML = 'Click on the map to measure direction from main point.';
        // Clear any existing direction lines when entering direction mode
        directionLines.clearLayers();
        directionDetails.innerHTML = '';
    } else {
        findDirectionBtn.innerHTML = '<i class="fas fa-compass"></i> Find Direction';
        findDirectionBtn.style.backgroundColor = '';
        directionDetails.innerHTML = 'Direction mode canceled.';
    }
});

map.on('click', (e) => {
    if (directionMode && mainPoint) {
        const point = e.latlng;
        
        // Don't allow clicking on the main point itself
        if (mainPoint.getLatLng().equals(point)) {
            return;
        }

        // Create the direction point marker
        const pointMarker = L.marker(point, {
            icon: L.divIcon({
                className: 'direction-point-icon',
                html: `<div style="background-color: #30b0ff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${directionPointCounter}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(directionLines);

        const line = L.polyline([mainPoint.getLatLng(), point], {
            color: '#30b0ff',
            dashArray: '5, 5',
            weight: 2
        }).addTo(directionLines);
        
        const distance = mainPoint.getLatLng().distanceTo(point);
        const bearing = calculateBearing(mainPoint.getLatLng(), point);
        const cardinal = getCardinalDirection(bearing);
        
        const directionItem = document.createElement('div');
        directionItem.className = 'direction-item';
        directionItem.dataset.id = L.stamp(line); // Store line ID
        
        directionItem.innerHTML = `
            <strong>Point ${directionPointCounter}:</strong> ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}<br>
            <strong>Direction:</strong> ${cardinal} (${bearing.toFixed(1)}°)<br>
            <strong>Distance:</strong> ${distance.toFixed(0)} meters
            <span class="delete-direction" title="Delete">×</span>
        `;
        
        directionItem.querySelector('.delete-direction').addEventListener('click', (e) => {
            e.stopPropagation();
            const lineId = directionItem.dataset.id;
            directionLines.eachLayer((layer) => {
                if (L.stamp(layer) == lineId) {
                    directionLines.removeLayer(layer);
                }
                // Also remove the point marker if it exists
                if (layer instanceof L.Marker && layer.getLatLng().equals(point)) {
                    directionLines.removeLayer(layer);
                }
            });
            directionItem.remove();
            // Renumber remaining points
            renumberDirectionPoints();
        });
        
        directionDetails.appendChild(directionItem);
        directionPointCounter++;
    }
});

// Function to renumber direction points when one is deleted
function renumberDirectionPoints() {
    directionPointCounter = 1;
    let markers = [];
    
    // Collect all direction point markers
    directionLines.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            markers.push(layer);
        }
    });
    
    // Sort markers by their creation order (approximated by their current number)
    markers.sort((a, b) => {
        const aNum = parseInt(a._icon.textContent);
        const bNum = parseInt(b._icon.textContent);
        return aNum - bNum;
    });
    
    // Renumber them sequentially
    markers.forEach((marker, index) => {
        marker._icon.innerHTML = `<div style="background-color: #30b0ff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${index + 1}</div>`;
    });
    
    // Update the counter
    directionPointCounter = markers.length + 1;
    
    // Also update the direction items in the sidebar
    const directionItems = document.querySelectorAll('.direction-item');
    directionItems.forEach((item, index) => {
        const html = item.innerHTML.replace(/Point \d+:/, `Point ${index + 1}:`);
        item.innerHTML = html;
    });
}
// Find My Location
findLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const accuracy = position.coords.accuracy;
                
                const locationMarker = L.circleMarker([latitude, longitude], {
                    radius: 8,
                    fillColor: "#30b0ff",
                    color: "#0066cc",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(drawnItems); // Add to drawnItems instead of directly to map
                
                locationMarker.bindPopup(`Your location (accuracy: ${Math.round(accuracy)} meters)`).openPopup();
                map.setView([latitude, longitude], 15);
                
                // Add to sidebar
                const title = "My Location";
                const description = `Accuracy: ${Math.round(accuracy)} meters`;
                locationMarker.feature = {
                    properties: { title, description }
                };
                addFeatureToSidebar(locationMarker, title, description);
            },
            (error) => {
                showMessage(`Error getting location: ${error.message}`);
            },
            { enableHighAccuracy: true }
        );
    } else {
        showMessage("Geolocation is not supported by your browser");
    }
});

// Helper functions for direction calculation
function calculateBearing(start, end) {
    const startLat = start.lat * Math.PI / 180;
    const startLng = start.lng * Math.PI / 180;
    const endLat = end.lat * Math.PI / 180;
    const endLng = end.lng * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - 
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
}

function getCardinalDirection(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}

function updateDirectionLines() {
    if (!mainPoint) return;
    
    directionLines.eachLayer((line) => {
        const latlngs = line.getLatLngs();
        if (latlngs.length === 2) {
            line.setLatLngs([mainPoint.getLatLng(), latlngs[1]]);
        }
    });
}

// Search functionality
let debounceTimeout;

function showLoading() {
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;
}

function hideLoading() {
    searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    searchBtn.disabled = false;
}

function showSuggestions() {
    searchSuggestions.classList.add('visible');
}

function hideSuggestions() {
    searchSuggestions.classList.remove('visible');
}

function fetchSuggestions(query) {
    if (query.length < 3) {
        hideSuggestions();
        return;
    }

    showLoading();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            searchSuggestions.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(item => {
                    const suggestionItem = document.createElement('li');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.textContent = item.display_name;
                    suggestionItem.addEventListener('click', () => {
                        performSearch(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
                        searchInput.value = item.display_name;
                        hideSuggestions();
                    });
                    searchSuggestions.appendChild(suggestionItem);
                });
                showSuggestions();
            } else {
                const noResultItem = document.createElement('li');
                noResultItem.className = 'suggestion-item';
                noResultItem.textContent = 'No results found';
                searchSuggestions.appendChild(noResultItem);
                showSuggestions();
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error fetching search suggestions:', error);
            const errorItem = document.createElement('li');
            errorItem.className = 'suggestion-item';
            errorItem.textContent = 'Error loading suggestions';
            searchSuggestions.innerHTML = '';
            searchSuggestions.appendChild(errorItem);
            showSuggestions();
        });
}

function performSearch(lat, lon, name) {
    showLoading();
    
    if (lat && lon) {
        map.setView([lat, lon], 13);
        if (name) {
            showMessage(`Location found: ${name}`);
        }
        hideLoading();
        hideSuggestions();
        return;
    }

    const query = searchInput.value.trim();
    if (!query) {
        showMessage("Please enter a location to search");
        hideLoading();
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            if (data && data.length > 0) {
                const result = data[0];
                map.setView([parseFloat(result.lat), parseFloat(result.lon)], 13);
                showMessage(`Location found: ${result.display_name}`);
            } else {
                showMessage("Sorry, we couldn't find that location.");
            }
            hideSuggestions();
        })
        .catch(error => {
            hideLoading();
            console.error('Error performing search:', error);
            showMessage("An error occurred while searching for the location.");
            hideSuggestions();
        });
}

function showMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--primary-color);
        color: white;
        padding: 15px 25px;
        border-radius: var(--border-radius);
        z-index: 3000;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        font-family: 'Poppins', sans-serif;
    `;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    setTimeout(() => {
        messageBox.remove();
    }, 3000);
}

// Initialize search event listeners
searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        fetchSuggestions(searchInput.value);
    }, 300);
});

searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    performSearch();
});

searchInput.addEventListener('focus', () => {
    if (searchSuggestions.children.length > 0) {
        showSuggestions();
    }
});

document.addEventListener('click', (event) => {
    if (!searchContainer.contains(event.target)) {
        hideSuggestions();
    }
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === nameModal) {
        nameModal.style.display = 'none';
        if (currentLayer) {
            map.removeLayer(currentLayer);
            currentLayer = null;
        }
    }
});