// gps-check.js - Check if GPS tracker is already loaded
if (!window.gpsTracker) {
  // Load the GPS tracker script
  const script = document.createElement('script');
  script.src = 'gps-tracker.js';
  document.head.appendChild(script);
}
