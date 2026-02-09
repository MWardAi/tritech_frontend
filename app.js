/**
 * app.js - Main application logic for SmartTourist
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('SmartTourist app loading...');
  
  // Get DOM elements
  const elements = {
    tabSignup: document.getElementById('tab-signup'),
    tabLogin: document.getElementById('tab-login'),
    signupForm: document.getElementById('signup-form'),
    loginForm: document.getElementById('login-form'),
    profileView: document.getElementById('profile-view'),
    suEmail: document.getElementById('su-email'),
    suPassword: document.getElementById('su-password'),
    suUsername: document.getElementById('su-username'),
    suCountry: document.getElementById('su-country'),
    suSalary: document.getElementById('su-salary'),
    liEmail: document.getElementById('li-email'),
    liPassword: document.getElementById('li-password'),
    toLogin: document.getElementById('to-login'),
    toSignup: document.getElementById('to-signup'),
    prefsContainer: document.getElementById('prefs-container'),
    statusIndicator: document.getElementById('status-indicator'),
    messageArea: document.getElementById('message-area'),
    logoutBtn: document.getElementById('logout-btn'),
    goToApp: document.getElementById('go-to-app'),
    profileUsername: document.getElementById('profile-username'),
    profileEmail: document.getElementById('profile-email'),
    profileCountry: document.getElementById('profile-country'),
    profilePrefs: document.getElementById('profile-prefs')
  };
  
  // State
  let selectedPrefs = new Set();
  const MAX_PREFS = 5;
  const TOKEN_KEY = 'st_token';
  
  // Show message utility
  function showMessage(text, type = 'error', timeout = 5000) {
    if (!elements.messageArea) return;
    
    // Clear existing messages
    elements.messageArea.innerHTML = '';
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    elements.messageArea.appendChild(messageEl);
    
    if (timeout) {
      setTimeout(() => {
        if (elements.messageArea.contains(messageEl)) {
          elements.messageArea.removeChild(messageEl);
        }
      }, timeout);
    }
  }
  
  // Tab switching
  function setActiveTab(tab) {
    console.log('Switching to tab:', tab);
    
    // Reset all tabs
    if (elements.tabSignup) elements.tabSignup.classList.remove('active');
    if (elements.tabLogin) elements.tabLogin.classList.remove('active');
    
    // Hide all forms
    if (elements.signupForm) elements.signupForm.style.display = 'none';
    if (elements.loginForm) elements.loginForm.style.display = 'none';
    if (elements.profileView) elements.profileView.style.display = 'none';
    
    // Show selected tab
    if (tab === 'signup') {
      if (elements.tabSignup) elements.tabSignup.classList.add('active');
      if (elements.signupForm) elements.signupForm.style.display = 'flex';
    } else if (tab === 'login') {
      if (elements.tabLogin) elements.tabLogin.classList.add('active');
      if (elements.loginForm) elements.loginForm.style.display = 'flex';
    } 
  }
  
  // Load countries and preferences from backend
  async function loadMeta() {
    try {
      const response = await fetch(window.BASE_URL + '/meta');
      if (response.ok) {
        const data = await response.json();
        
        // Load countries
        if (elements.suCountry) {
          elements.suCountry.innerHTML = '<option value="">Select country</option>';
          data.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            elements.suCountry.appendChild(option);
          });
        }
        
        // Load preferences
        if (elements.prefsContainer) {
          elements.prefsContainer.innerHTML = '';
          selectedPrefs.clear();
          
          data.preferences.forEach(pref => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'pref';
            button.textContent = pref;
            button.dataset.pref = pref;
            
            button.addEventListener('click', () => {
              if (selectedPrefs.has(pref)) {
                selectedPrefs.delete(pref);
                button.classList.remove('selected');
              } else {
                if (selectedPrefs.size >= MAX_PREFS) {
                  showMessage(`Maximum ${MAX_PREFS} preferences allowed`, 'error', 2000);
                  return;
                }
                selectedPrefs.add(pref);
                button.classList.add('selected');
              }
            });
            
            elements.prefsContainer.appendChild(button);
          });
        }
        
        if (elements.statusIndicator) {
          elements.statusIndicator.textContent = 'Connected';
        }
      } else {
        throw new Error('Failed to load meta');
      }
    } catch (error) {
      console.error('Error loading meta:', error);
      
      // Use fallback data
      const fallbackCountries = ['Syria', 'Lebanon', 'Jordan', 'Iraq', 'Egypt', 'Turkey', 'Other'];
      const fallbackPrefs = ['ancient/historical', 'meditation/nature', 'cultural food/restaurants', 'cultural places', 'gaming/fun'];
      
      if (elements.suCountry) {
        elements.suCountry.innerHTML = '<option value="">Select country</option>';
        fallbackCountries.forEach(country => {
          const option = document.createElement('option');
          option.value = country;
          option.textContent = country;
          elements.suCountry.appendChild(option);
        });
      }
      
      if (elements.prefsContainer) {
        elements.prefsContainer.innerHTML = '';
        fallbackPrefs.forEach(pref => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'pref';
          button.textContent = pref;
          button.dataset.pref = pref;
          
          button.addEventListener('click', () => {
            if (selectedPrefs.has(pref)) {
              selectedPrefs.delete(pref);
              button.classList.remove('selected');
            } else {
              if (selectedPrefs.size >= MAX_PREFS) {
                showMessage(`Maximum ${MAX_PREFS} preferences allowed`, 'error', 2000);
                return;
              }
              selectedPrefs.add(pref);
              button.classList.add('selected');
            }
          });
          
          elements.prefsContainer.appendChild(button);
        });
      }
      
      if (elements.statusIndicator) {
        elements.statusIndicator.textContent = 'Using fallback data';
      }
    }
  }
  
  // Handle signup form submission
  async function handleSignup(event) {
    event.preventDefault();
    console.log('Signup form submitted');
    
    const email = elements.suEmail.value.trim();
    const password = elements.suPassword.value;
    const username = elements.suUsername.value.trim();
    const country = elements.suCountry.value;
    const salary = elements.suSalary.value;
    
    // Validation
    if (!email || !password || !username || !country || selectedPrefs.size === 0) {
      showMessage('Please fill all fields and select at least one preference', 'error');
      return;
    }
    
    if (password.length < 8) {
      showMessage('Password must be at least 8 characters', 'error');
      return;
    }
    
    try {
      // Use the global api object if available, otherwise use fetch
      const api = window.api || {
        post: async (path, body) => {
          const res = await fetch(window.BASE_URL + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          return res.json();
        }
      };
      
      const response = await api.post('/signup', {
        email,
        password,
        username,
        country,
        salary: salary ? parseInt(salary) : 0,
        preferences: Array.from(selectedPrefs)
      });
      
      console.log('Signup response:', response);
      
      if (response.token) {
        // Save token
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem('st_user', JSON.stringify(response.user));
        
        // Show success message
        showMessage('Account created successfully! Please log in.', 'success', 3000);
        
        // Clear form
        elements.signupForm.reset();
        selectedPrefs.clear();
        document.querySelectorAll('#prefs-container .pref.selected').forEach(btn => {
          btn.classList.remove('selected');
        });
        
        // Show success hint
        const successHint = document.getElementById('signup-success-hint');
        if (successHint) {
          successHint.style.display = 'block';
          setTimeout(() => {
            successHint.style.display = 'none';
          }, 5000);
        }
        
        // Switch to login tab
        setActiveTab('login');
      } else {
        showMessage(response.error || 'Signup failed', 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showMessage('Network error during signup', 'error');
    }
  }
  
  // Handle login form submission
  async function handleLogin(event) {
    event.preventDefault();
    console.log('Login form submitted');
    
    const email = elements.liEmail.value.trim();
    const password = elements.liPassword.value;
    
    if (!email || !password) {
      showMessage('Please enter email and password', 'error');
      return;
    }
    
    try {
      // Use the global api object if available, otherwise use fetch
      const api = window.api || {
        post: async (path, body) => {
          const res = await fetch(window.BASE_URL + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          return res.json();
        }
      };
      
      const response = await api.post('/login', { email, password });
      
      console.log('Login response:', response);
      
      if (response.token) {
        // Save token
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem('st_user', JSON.stringify(response.user));
        
        // Show success message
        showMessage('Login successful!', 'success', 2000);

        // Request GPS permission if consented
        setTimeout(() => {
          const locationConsent = localStorage.getItem('location_consent') !== 'false';
          if (locationConsent && window.gpsTracker && navigator.geolocation) {
            window.gpsTracker.startTracking().catch(err => {
              console.log('GPS tracking not started:', err.message);
            });
          }
        }, 1000);
        
        // Update profile view
        if (elements.profileUsername && response.user) {
          elements.profileUsername.textContent = response.user.username;
          elements.profileEmail.textContent = response.user.email;
          elements.profileCountry.textContent = response.user.country;
          
          // Update preferences
          if (elements.profilePrefs) {
            elements.profilePrefs.innerHTML = '';
            (response.user.preferences || []).forEach(pref => {
              const prefEl = document.createElement('div');
              prefEl.className = 'pref selected';
              prefEl.textContent = pref;
              elements.profilePrefs.appendChild(prefEl);
            });
          }
        }
        
        // Check if first time user
        if (response.user && response.user.first_time) {
          // Show preference showcase
          setTimeout(() => {
            if (window.showPreferencesShowcase) {
              window.showPreferencesShowcase(response.user.preferences || []);
            }
          }, 500);
        } else {
          // Redirect to map
          setTimeout(() => {
            window.location.href = 'map.html';
          }, 1000);
        }
        
        // Update status
        if (elements.statusIndicator) {
          elements.statusIndicator.textContent = 'Authenticated';
        }
        
        // Show profile view
        //setActiveTab('profile');
      } else {
        showMessage(response.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showMessage('Network error during login', 'error');
    }
  }
  
  // Handle logout
  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setActiveTab('login');
    if (elements.statusIndicator) {
      elements.statusIndicator.textContent = 'Offline';
    }
    showMessage('Logged out', 'success', 1500);
  }
  
  // Initialize event listeners
  function initEventListeners() {
    console.log('Initializing event listeners');
    
    // Tab switching
    if (elements.tabSignup) {
      elements.tabSignup.addEventListener('click', () => setActiveTab('signup'));
    }
    
    if (elements.tabLogin) {
      elements.tabLogin.addEventListener('click', () => setActiveTab('login'));
    }
    
    // Form submissions
    if (elements.signupForm) {
      elements.signupForm.addEventListener('submit', handleSignup);
    }
    
    if (elements.loginForm) {
      elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Button switching
    if (elements.toLogin) {
      elements.toLogin.addEventListener('click', () => setActiveTab('login'));
    }
    
    if (elements.toSignup) {
      elements.toSignup.addEventListener('click', () => setActiveTab('signup'));
    }
    
    // Other buttons
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (elements.goToApp) {
      elements.goToApp.addEventListener('click', () => {
        showMessage('App page coming soon...', 'success', 2000);
      });
    }
  }
  
  // Initialize app
  function init() {
    console.log('Initializing SmartTourist app');
    
    initEventListeners();
    loadMeta();
    
    // Check if user is already logged in
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log('User is already logged in');
      setActiveTab('profile');
      if (elements.statusIndicator) {
        elements.statusIndicator.textContent = 'Authenticated';
      }
    } else {
      setActiveTab('signup');
    }
  }
  
  // Start the app
  init();

});
