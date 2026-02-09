/**
 * gps-tracker.js - GPS location tracking for SmartTourist
 */

class GPSTracker {
  constructor(options = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      updateInterval: 60000, // Update every minute
      minDistance: 10, // Minimum distance in meters to trigger update
      autoStart: false,
      ...options
    };
    
    this.watchId = null;
    this.lastPosition = null;
    this.isTracking = false;
    this.userConsent = false;
    this.initialized = false;
    
    // Bind methods
    this.startTracking = this.startTracking.bind(this);
    this.stopTracking = this.stopTracking.bind(this);
    this.handlePosition = this.handlePosition.bind(this);
    this.handleError = this.handleError.bind(this);
  }
  
  // Initialize and request permission
  async initialize() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      this.showWarning('GPS is not supported by your device/browser');
      return false;
    }
    
    try {
      // Test if we can get permission
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      this.permissionState = permission.state;
      
      permission.onchange = () => {
        this.permissionState = permission.state;
        console.log('GPS permission changed to:', this.permissionState);
        
        if (this.permissionState === 'granted' && this.options.autoStart) {
          this.startTracking();
        } else if (this.permissionState === 'denied') {
          this.stopTracking();
          this.showWarning('GPS permission denied. Please enable location services in your browser settings.');
        }
      };
      
      this.initialized = true;
      return true;
    } catch (err) {
      console.warn('Could not check geolocation permission:', err);
      this.initialized = true;
      return true; // Proceed anyway for browsers that don't support permissions API
    }
  }
  
  // Request permission and start tracking
  async startTracking() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.isTracking) {
      console.log('Already tracking GPS');
      return true;
    }
    
    return new Promise((resolve) => {
      // First get a single position to ensure permission
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userConsent = true;
          this.lastPosition = position;
          
          // Save initial position
          this.savePositionToBackend(position);
          
          // Start watching position
          this.watchId = navigator.geolocation.watchPosition(
            this.handlePosition,
            this.handleError,
            this.options
          );
          
          this.isTracking = true;
          console.log('GPS tracking started');
          
          // Also set up periodic updates
          this.intervalId = setInterval(() => {
            if (this.lastPosition) {
              navigator.geolocation.getCurrentPosition(
                this.handlePosition,
                this.handleError,
                this.options
              );
            }
          }, this.options.updateInterval);
          
          resolve(true);
        },
        (error) => {
          this.handleError(error);
          resolve(false);
        },
        this.options
      );
    });
  }
  
  // Stop tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isTracking = false;
    console.log('GPS tracking stopped');
  }
  
  // Handle new position
  handlePosition(position) {
    // Check if position changed significantly
    if (this.shouldSavePosition(position)) {
      this.lastPosition = position;
      this.savePositionToBackend(position);
      this.emitPositionUpdate(position);
    }
  }
  
  // Check if position changed enough to save
  shouldSavePosition(newPosition) {
    if (!this.lastPosition) return true;
    
    const oldCoords = this.lastPosition.coords;
    const newCoords = newPosition.coords;
    
    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      oldCoords.latitude,
      oldCoords.longitude,
      newCoords.latitude,
      newCoords.longitude
    );
    
    // Save if moved more than minDistance
    return distance >= this.options.minDistance;
  }
  
  // Calculate distance between two points in meters
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
  
  // Save position to backend
  async savePositionToBackend(position) {
    try {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
      };
      
      const response = await window.api.saveLocation(locationData);
      
      if (response.error) {
        console.warn('Failed to save location:', response.error);
        return false;
      }
      
      console.log('Location saved successfully:', response);
      return true;
    } catch (error) {
      console.error('Error saving location:', error);
      return false;
    }
  }
  
  // Handle GPS errors
  handleError(error) {
    console.warn('GPS Error:', error.code, error.message);
    
    let message = '';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location services.';
        this.userConsent = false;
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out.';
        break;
      default:
        message = 'Unknown location error.';
        break;
    }
    
    this.showWarning(message);
  }
  
  // Show warning message
  showWarning(message) {
    // You can customize this to show in your UI
    console.warn('GPS Warning:', message);
    
    // Optional: Show a non-intrusive notification
    if (window.showMessage) {
      window.showMessage(message, 'warning', 5000);
    }
  }
  
  // Emit custom event for position updates
  emitPositionUpdate(position) {
    const event = new CustomEvent('gps-position-update', {
      detail: {
        position: position,
        coords: position.coords,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
  }
  
  // Get current position (one-time)
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        this.options
      );
    });
  }
  
  // Check if tracking is available
  isAvailable() {
    return !!navigator.geolocation;
  }
  
  // Check if user has granted permission
  hasPermission() {
    return this.userConsent;
  }
}

// Create global instance
window.gpsTracker = new GPSTracker({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  updateInterval: 60000, // 1 minute
  minDistance: 10, // 10 meters
  autoStart: false
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  if (window.gpsTracker) {
    window.gpsTracker.initialize().then(initialized => {
      console.log('GPS Tracker initialized:', initialized);
      
      // Auto-start if user is logged in
      const token = localStorage.getItem('st_token');
      if (token && initialized) {
        window.gpsTracker.startTracking().then(success => {
          console.log('Auto-started GPS tracking:', success);
        });
      }
    });
  }
});
