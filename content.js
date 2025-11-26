/* content.js */

// --- Constants & State ---
const STORAGE_KEY = 'favorites';
let favorites = [];
let sidebarObserver = null;
let menuObserver = null;

// --- Initialization ---
console.log('ChatGPT Favorites Extension: Loaded');

// Retry loop to find the sidebar and inject our section
const initInterval = setInterval(() => {
  const nav = document.querySelector('nav');
  if (nav) {
    clearInterval(initInterval);
    console.log('ChatGPT Favorites: Sidebar found, initializing...');
    initializeExtension();
  }
}, 1000);

function initializeExtension() {
  loadFavorites().then(() => {
    injectSidebarSection();
    observeMenu();
    
    // Listen for storage changes (e.g. from popup or other tabs)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.favorites) {
        favorites = changes.favorites.newValue || [];
        renderFavorites();
      }
    });
  });
}

// --- Storage Logic ---
function loadFavorites() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('ChatGPT Favorites: Storage error', chrome.runtime.lastError);
        favorites = [];
      } else {
        favorites = result[STORAGE_KEY] || [];
      }
      resolve();
    });
  });
}

function saveFavorites() {
  chrome.storage.sync.set({ [STORAGE_KEY]: favorites }, () => {
    if (chrome.runtime.lastError) {
      console.warn('ChatGPT Favorites: Save error', chrome.runtime.lastError);
    } else {
      renderFavorites();
    }
  });
}

function isFavorite(url) {
  return favorites.some(f => f.url === url);
}

function toggleFavorite(title, url) {
  if (isFavorite(url)) {
    favorites = favorites.filter(f => f.url !== url);
    showToast('Removed from Favorites');
  } else {
    favorites.push({ title, url });
    showToast('⭐ Added to Favorites!');
  }
  saveFavorites();
}

// --- Sidebar Injection ---
function injectSidebarSection() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Find where to insert. Usually above the history list.
  // The history list is often in a div that grows.
  // We'll try to insert after the "New Chat" / "GPTs" area, or just prepend to the scrollable area.
  // A safe bet is finding the main scrollable container in nav.
  
  // Strategy: Look for the container that holds the chat history.
  // It usually has 'flex-1' and 'overflow-y-auto'.
  // We want to insert our section *before* the "Your chats" (history) section if possible, 
  // or just at the top of that scrollable area.
  
  // Let's try to find the history container.
  // Current ChatGPT DOM is complex. 
  // We will create a container and prepend it to the nav's main content area.
  
  // Try to find the sticky header (New Chat) and insert after it?
  // Or just find the first child of the nav that allows scrolling.
  
  // Simplified approach: Find the `nav` and look for the `div` that contains the history.
  // Often `nav > div.overflow-y-auto` or similar.
  
  let container = document.getElementById('chatgpt-favorites-section');
  if (container) return; // Already injected

  container = document.createElement('div');
  container.id = 'chatgpt-favorites-section';
  container.className = 'favorites-section';
  container.innerHTML = `
    <div class="favorites-header" role="button">
      <div class="favorites-header-content">
        <span class="favorites-icon">✨</span>
        <span class="favorites-title">Important Chats</span>
      </div>
      <svg class="favorites-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <ul class="favorites-list"></ul>
  `;

  // Toggle logic
  const header = container.querySelector('.favorites-header');
  const list = container.querySelector('.favorites-list');
  const chevron = container.querySelector('.favorites-chevron');

  header.addEventListener('click', () => {
    const isCollapsed = list.style.display === 'none';
    list.style.display = isCollapsed ? 'block' : 'none';
    chevron.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
    
    // Save state
    localStorage.setItem('chatgpt-favorites-collapsed', !isCollapsed);
  });

  // Restore state
  const isCollapsed = localStorage.getItem('chatgpt-favorites-collapsed') === 'true';
  if (isCollapsed) {
    list.style.display = 'none';
    chevron.style.transform = 'rotate(-90deg)';
  }

  // Attempt to insert in a good spot
  // 1. Try to find the "Projects" section or "Your chats" header.
  // Since classes are obfuscated, we might need to rely on structure.
  // `nav` usually has a few direct children. One is the top bar (New Chat), one is the list.
  
  // Let's try to insert as the second child of nav (after New Chat button area)
  // or if there's a specific "Your chats" label, insert before that.
  
  // For now, we'll append to the top of the scrollable area if found, else just prepend to nav.
  const scrollArea = nav.querySelector('.overflow-y-auto') || nav;
  
  // If we can find "Previous 7 Days" or similar text, we can insert before its parent.
  // But that's fragile.
  
  // Let's just prepend to the scrollArea for visibility.
  if (scrollArea.firstChild) {
    scrollArea.insertBefore(container, scrollArea.firstChild);
  } else {
    scrollArea.appendChild(container);
  }

  renderFavorites();
}

function renderFavorites() {
  const list = document.querySelector('#chatgpt-favorites-section .favorites-list');
  if (!list) return;

  list.innerHTML = '';

  if (favorites.length === 0) {
    list.innerHTML = '<li class="empty-msg">No favorites yet</li>';
    return;
  }

  favorites.forEach(fav => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = fav.url;
    a.textContent = fav.title;
    a.className = 'favorite-item';
    // User requested to open in the same tab
    a.target = '_self';
    
    li.appendChild(a);
    list.appendChild(li);
  });
}

// --- Context Menu Integration ---
function observeMenu() {
  // Radix UI menus are often appended to the end of <body> in a portal.
  // We watch <body> for added nodes.
  
  menuObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element
          // Check if it's a menu
          if (node.getAttribute('role') === 'menu' || node.querySelector('[role="menu"]')) {
            handleMenuOpen(node);
          }
        }
      }
    }
  });

  menuObserver.observe(document.body, { childList: true, subtree: true });
}

function handleMenuOpen(menuNode) {
  // Check if we already injected
  if (menuNode.querySelector('.add-to-favorites-btn')) return;

  // We need to determine if this is a "Chat" context menu.
  // Usually these menus have "Rename", "Delete", "Archive".
  // We can check for the presence of those texts or icons.
  // Since classes are obfuscated, text content is a decent heuristic for English users.
  // Or we can just blindly add it if it looks like a dropdown.
  
  // Let's look for "Delete" or "Rename" or "Archive"
  const menuText = menuNode.textContent.toLowerCase();
  if (menuText.includes('delete') || menuText.includes('rename') || menuText.includes('archive') || menuText.includes('share')) {
    injectFavoriteButton(menuNode);
  }
}

function injectFavoriteButton(menuNode) {
  // Find the menu items container
  const menuItems = menuNode.querySelector('[role="menu"]') || menuNode;
  
  // Create our button
  const btn = document.createElement('div');
  btn.className = 'add-to-favorites-btn';
  btn.setAttribute('role', 'menuitem');
  btn.tabIndex = -1;
  
  // Logic to find the correct chat title and URL
  // The menu is open, so the trigger button in the sidebar should have data-state="open"
  // We look for the trigger within the nav element
  const trigger = document.querySelector('nav [data-state="open"]');
  
  let chatUrl = window.location.href;
  let chatTitle = document.title;
  
  if (trigger) {
    // The trigger is usually a button inside an <a> tag or a sibling of the title text.
    // Structure: 
    // <a>
    //   <div>Title</div>
    // </a>
    // <button>Options</button> (Trigger)
    // OR
    // <a>
    //   <div>Title</div>
    //   <button>Options</button>
    // </a>
    
    // Let's try to find the closest <a> tag first
    const link = trigger.closest('a');
    
    if (link) {
      // If the trigger is inside the link
      chatUrl = link.href;
      chatTitle = link.textContent || document.title;
    } else {
      // If the trigger is a sibling or nested differently
      // Often the sidebar item is a list item <li> or <div>
      // We can look for the nearest parent that contains an <a>
      // But in ChatGPT sidebar, the "row" usually contains the link.
      
      // Let's look for an <a> tag in the same container as the trigger
      // Go up to the list item container
      const listItem = trigger.closest('li') || trigger.closest('div.relative'); // 'relative' is a common class for the row container
      
      if (listItem) {
        const linkInRow = listItem.querySelector('a');
        if (linkInRow) {
          chatUrl = linkInRow.href;
          // The title is text inside the link. 
          // We need to be careful not to get the "Options" text if it's inside.
          // Usually the title is in a div with text-overflow.
          // Let's clone the node and remove the button to get clean text?
          // Or just take the first non-empty text node?
          chatTitle = linkInRow.innerText; 
          
          // Clean up title (remove newlines, "Options", etc if they leak in)
          // ChatGPT titles are usually just text.
        }
      }
    }
  }
  
  // Fallback: If we couldn't find it (maybe user is on the page and clicked top bar), use current.
  // But the user specifically complained about "only click three dot part without going".
  // So if we found a trigger but no link, that's an issue. 
  // If we didn't find a trigger, maybe it's the main chat menu?
  if (!trigger && window.location.href.includes('/c/')) {
     // We are likely in the main chat and clicked the top header menu
     chatUrl = window.location.href;
     chatTitle = document.title;
  }

  // Clean title
  chatTitle = chatTitle.replace(/ChatGPT/g, '').trim() || "Chat";
  if (chatTitle === "Chat") {
      // Try to get a better title if possible, but "Chat" is better than nothing.
      // If we are on the page, document.title usually is "ChatGPT". 
      // The actual chat title is in the sidebar active item.
  }
  
  // If we still have "ChatGPT" as title and we have a URL, maybe we can't do better easily without fetching.
  // But usually the sidebar link has the text.
  
  const isFav = isFavorite(chatUrl);
  
  btn.innerHTML = `
    <div class="fav-icon">${isFav ? '💔' : '✨'}</div>
    <div class="fav-text">${isFav ? 'Remove from Favorites' : 'Add to Favorites'}</div>
  `;
  
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(chatTitle, chatUrl);
    // Close the menu by clicking the trigger again or simulating Escape
    if (trigger) {
        trigger.click();
    } else {
        // Just remove the menu from DOM? No, that breaks React state.
        // Dispatch Escape key
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  };
  
  // Insert at the top
  menuItems.insertBefore(btn, menuItems.firstChild);
}

// --- UI Helpers ---
function showToast(message) {
  let toast = document.getElementById('fav-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fav-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'show';
  setTimeout(() => {
    toast.className = '';
  }, 2000);
}
