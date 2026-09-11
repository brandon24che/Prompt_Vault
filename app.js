/**
 * app.js
 * 
 * Vanilla JS Route & UI Guarding for PromptVault Admin Panel.
 * Enforces frontend protection for admin features:
 * - checkAdminAccess(user): checks role and reveals/hides #admin-dashboard elements.
 * - Guard navigation transitions: redirects unauthorized users to home feed with access-denied alert.
 */

import { authState, listenToAuthChanges, getUserRole } from './auth.js';

// DOM Selectors
const SELECTORS = {
  adminNavItem: '#nav-admin-link, [data-role="admin-nav"]',
  adminDashboard: '#admin-dashboard',
  homeFeed: '#home-feed, #community-feed',
  accessDeniedModal: '#access-denied-modal',
  statusBanner: '#admin-status-banner'
};

/**
 * Checks whether the current user has verified Admin access.
 * If user is logged in and role === "admin":
 *  - Reveals the #admin-dashboard section and admin nav buttons.
 * If user is NOT an admin:
 *  - Hides all admin elements.
 *  - If currently on the admin route, redirects to home feed and shows access denied message.
 * 
 * @param {object|null} user - Firebase user object or authState object
 * @returns {Promise<boolean>} - True if verified admin, false otherwise
 */
export async function checkAdminAccess(user = authState.currentUser) {
  // If no user passed or logged out
  if (!user) {
    applyNonAdminUI();
    return false;
  }

  const uid = user.uid || (authState.currentUser ? authState.currentUser.uid : null);
  if (!uid) {
    applyNonAdminUI();
    return false;
  }

  // Fetch or confirm role directly from Firestore
  let role = authState.role;
  if (!role || role === 'user') {
    role = await getUserRole(uid);
  }

  const isAdmin = role === 'admin';

  if (isAdmin) {
    applyAdminUI();
    return true;
  } else {
    applyNonAdminUI();
    return false;
  }
}

/**
 * Reveal admin navigation button and admin dashboard capability
 */
function applyAdminUI() {
  console.log('[app] Admin access granted: revealing admin controls.');

  // 1. Reveal navigation button / link
  const adminNavElements = document.querySelectorAll(SELECTORS.adminNavItem);
  adminNavElements.forEach((el) => {
    el.classList.remove('hidden');
    el.style.display = '';
    el.removeAttribute('aria-hidden');
  });

  // 2. Ensure #admin-dashboard can be displayed
  const adminDashboard = document.querySelector(SELECTORS.adminDashboard);
  if (adminDashboard) {
    adminDashboard.classList.remove('unauthorized-locked');
    adminDashboard.dataset.access = 'granted';
  }

  // 3. Show badge if present
  const banner = document.querySelector(SELECTORS.statusBanner);
  if (banner) {
    banner.classList.remove('hidden');
  }
}

/**
 * Hide all admin elements and lock down administrative controls
 */
function applyNonAdminUI() {
  console.log('[app] Standard user access: hiding admin controls.');

  // 1. Hide navigation links
  const adminNavElements = document.querySelectorAll(SELECTORS.adminNavItem);
  adminNavElements.forEach((el) => {
    el.classList.add('hidden');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  });

  // 2. Hide admin dashboard
  const adminDashboard = document.querySelector(SELECTORS.adminDashboard);
  if (adminDashboard) {
    adminDashboard.classList.add('hidden');
    adminDashboard.style.display = 'none';
    adminDashboard.dataset.access = 'denied';
  }

  // 3. Hide badge if present
  const banner = document.querySelector(SELECTORS.statusBanner);
  if (banner) {
    banner.classList.add('hidden');
  }
}

/**
 * Route guard for navigating to admin section.
 * Call this when user clicks a link, changes hash, or attempts direct route access.
 * 
 * @param {string} targetRoute - The target route e.g. '#admin-dashboard' or 'admin'
 */
export async function navigateToRoute(targetRoute) {
  if (targetRoute === '#admin-dashboard' || targetRoute === 'admin') {
    const hasAccess = await checkAdminAccess(authState.currentUser);

    if (!hasAccess) {
      console.warn('[app] Access Denied: Attempted unauthorized navigation to Admin Dashboard.');
      
      // Redirect to home / community feed
      redirectToHome();

      // Display access denied notification / alert
      showAccessDeniedMessage('Access Denied: You must have administrator privileges to view this page.');
      return false;
    }
  }

  // If authorized or public route, show target section
  const targetElement = document.querySelector(targetRoute);
  if (targetElement) {
    document.querySelectorAll('main > section, .route-view').forEach((sec) => {
      sec.classList.add('hidden');
    });
    targetElement.classList.remove('hidden');
    targetElement.style.display = '';
  }
  return true;
}

/**
 * Redirect user to home feed
 */
export function redirectToHome() {
  window.location.hash = '#home-feed';
  const homeFeed = document.querySelector(SELECTORS.homeFeed);
  if (homeFeed) {
    homeFeed.scrollIntoView({ behavior: 'smooth' });
    homeFeed.classList.remove('hidden');
    homeFeed.style.display = '';
  }
}

/**
 * Shows an access denied dialog, toast, or alert
 * @param {string} message 
 */
export function showAccessDeniedMessage(message = 'Access Denied: Admin privileges required.') {
  const modal = document.querySelector(SELECTORS.accessDeniedModal);
  if (modal) {
    const textEl = modal.querySelector('.error-message-text');
    if (textEl) textEl.textContent = message;
    modal.classList.remove('hidden');
  } else {
    // Fallback notification
    alert(`🔒 ${message}`);
  }
}

/**
 * Initialize app listeners and sync UI with auth state
 */
export function initializeAppGuards() {
  console.log('[app] Initializing Route & UI Guards...');

  listenToAuthChanges(async (state) => {
    await checkAdminAccess(state.currentUser);

    // If on admin hash and lost access, redirect immediately
    if (window.location.hash === '#admin-dashboard' && !state.isAdmin) {
      redirectToHome();
      showAccessDeniedMessage();
    }
  });

  // Intercept hash changes for SPA route guarding
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin-dashboard') {
      navigateToRoute('#admin-dashboard');
    }
  });
}

// Auto-run if running in a browser document environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppGuards);
  } else {
    initializeAppGuards();
  }
}
