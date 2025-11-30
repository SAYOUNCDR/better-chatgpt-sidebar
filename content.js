/* content.js */

// --- Constants & State ---
const STORAGE_KEY = 'favorites';
const FOLDERS_KEY = 'folders';
let favorites = [];
let folders = []; // { id, name, icon, color, isCollapsed, order }
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
  loadData().then(() => {
    injectSidebarSection();
    observeMenu();
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        if (changes[STORAGE_KEY]) {
          favorites = changes[STORAGE_KEY].newValue || [];
        }
        if (changes[FOLDERS_KEY]) {
          folders = changes[FOLDERS_KEY].newValue || [];
        }
        renderFavorites();
      }
    });
  });
}

// --- Storage Logic ---
function loadData() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY, FOLDERS_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('ChatGPT Favorites: Storage error', chrome.runtime.lastError);
        favorites = [];
        folders = [];
      } else {
        favorites = result[STORAGE_KEY] || [];
        folders = result[FOLDERS_KEY] || [];
        
        // Migration: Ensure all favorites have IDs and folderId
        let modified = false;
        favorites = favorites.map(f => {
          if (!f.id || f.folderId === undefined) {
            modified = true;
            return {
              ...f,
              id: f.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
              folderId: f.folderId || null, // null means root
              order: f.order || 0
            };
          }
          return f;
        });
        
        if (modified) saveData();
      }
      resolve();
    });
  });
}

function saveData() {
  chrome.storage.sync.set({ 
    [STORAGE_KEY]: favorites,
    [FOLDERS_KEY]: folders
  }, () => {
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

function toggleFavorite(title, url, targetFolderId = null) {
  if (isFavorite(url)) {
    favorites = favorites.filter(f => f.url !== url);
    showToast('Removed from Favorites');
  } else {
    favorites.push({ 
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title, 
      url,
      folderId: targetFolderId, // Use provided folderId or null (root)
      order: favorites.length
    });
    showToast('⭐ Added to Favorites!');
  }
  saveData();
}

// --- Sidebar Injection ---
function injectSidebarSection() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  let container = document.getElementById('chatgpt-favorites-section');
  if (container) return; // Already injected

  container = document.createElement('div');
  container.id = 'chatgpt-favorites-section';
  container.className = 'favorites-section';
  container.innerHTML = `
    <div class="favorites-header">
      <div class="favorites-header-left" role="button">
        <span class="favorites-icon">✨</span>
        <span class="favorites-title">Important Chats</span>
        <svg class="favorites-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="favorites-actions">
        <button class="icon-btn" id="add-folder-btn" title="New Folder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
        </button>
      </div>
    </div>
    <ul class="favorites-list"></ul>
  `;

  // Toggle logic
  const headerLeft = container.querySelector('.favorites-header-left');
  const list = container.querySelector('.favorites-list');
  const chevron = container.querySelector('.favorites-chevron');
  const addFolderBtn = container.querySelector('#add-folder-btn');

  headerLeft.addEventListener('click', () => {
    const isCollapsed = list.style.display === 'none';
    list.style.display = isCollapsed ? 'block' : 'none';
    chevron.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
    localStorage.setItem('chatgpt-favorites-collapsed', !isCollapsed);
  });
  
  addFolderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showFolderModal();
  });

  // Restore state
  const isCollapsed = localStorage.getItem('chatgpt-favorites-collapsed') === 'true';
  if (isCollapsed) {
    list.style.display = 'none';
    chevron.style.transform = 'rotate(-90deg)';
  }

  const scrollArea = nav.querySelector('.overflow-y-auto') || nav;
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

  if (favorites.length === 0 && folders.length === 0) {
    list.innerHTML = '<li class="empty-msg">No favorites yet</li>';
    return;
  }

  // Render Folders
  folders.sort((a, b) => a.order - b.order).forEach(folder => {
    const li = document.createElement('li');
    li.className = 'folder-item';
    li.dataset.id = folder.id;
    li.draggable = true;
    
    // DnD for Folder Reordering (Drag Source)
    li.addEventListener('dragstart', handleDragStart);
    // Note: We don't attach drop listeners to the LI anymore for folder content dropping.
    // We only attach them for folder reordering if needed, but we handle that in handleDrop
    // by checking if target is folder-item.
    // Actually, to catch drops "on the folder" generally, we might need it, 
    // but let's be specific with header and list.
    
    // Folder Header
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    folderHeader.style.setProperty('--folder-color', folder.color || '#8e8ea0');
    folderHeader.dataset.dropTarget = 'folder-header';
    folderHeader.dataset.folderId = folder.id;
    
    // Attach DnD listeners to Header
    folderHeader.addEventListener('dragover', handleDragOver);
    folderHeader.addEventListener('drop', handleDrop);
    folderHeader.addEventListener('dragenter', handleDragEnter);
    folderHeader.addEventListener('dragleave', handleDragLeave);
    
    folderHeader.innerHTML = `
      <div class="folder-title" role="button">
        <span class="folder-icon">${folder.icon || '📁'}</span>
        <span class="folder-name">${folder.name}</span>
        <svg class="folder-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: ${folder.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="folder-actions">
        <button class="icon-btn edit-folder-btn" title="Edit Folder">✎</button>
        <button class="icon-btn delete-folder-btn" title="Delete Folder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>
    `;
    
    // Folder Content (List)
    const folderList = document.createElement('ul');
    folderList.className = 'folder-content';
    folderList.style.display = folder.isCollapsed ? 'none' : 'block';
    folderList.dataset.dropTarget = 'folder-list';
    folderList.dataset.folderId = folder.id;
    
    // Attach DnD listeners to List
    folderList.addEventListener('dragover', handleDragOver);
    folderList.addEventListener('drop', handleDrop);
    folderList.addEventListener('dragenter', handleDragEnter);
    folderList.addEventListener('dragleave', handleDragLeave);
    
    // Folder Items
    const folderItems = favorites.filter(f => f.folderId === folder.id).sort((a, b) => a.order - b.order);
    folderItems.forEach(fav => {
      folderList.appendChild(createFavoriteItem(fav));
    });
    
    // Events
    const titleBtn = folderHeader.querySelector('.folder-title');
    titleBtn.addEventListener('click', () => {
      folder.isCollapsed = !folder.isCollapsed;
      folderList.style.display = folder.isCollapsed ? 'none' : 'block';
      folderHeader.querySelector('.folder-chevron').style.transform = folder.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
      saveData();
    });
    
    folderHeader.querySelector('.edit-folder-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showFolderModal(folder);
    });
    
    folderHeader.querySelector('.delete-folder-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete folder "${folder.name}"? Items will be moved to root.`)) {
            deleteFolder(folder.id);
        }
    });

    li.appendChild(folderHeader);
    li.appendChild(folderList);
    
    // We also need to handle dropping a folder ONTO another folder to reorder.
    // The LI is the target for that.
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    
    list.appendChild(li);
  });

  // Render Root Favorites
  const rootFavorites = favorites.filter(f => !f.folderId).sort((a, b) => a.order - b.order);
  rootFavorites.forEach(fav => {
    list.appendChild(createFavoriteItem(fav));
  });
  
  // Allow dropping on the main list (to move to root)
  list.dataset.dropTarget = 'root-list';
  list.addEventListener('dragover', handleDragOver);
  list.addEventListener('drop', handleDrop);
  list.addEventListener('dragenter', handleDragEnter);
  list.addEventListener('dragleave', handleDragLeave);
}

function createFavoriteItem(fav) {
  const li = document.createElement('li');
  li.className = 'favorite-item-container';
  li.dataset.id = fav.id;
  li.draggable = true;
  
  // DnD
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('drop', handleDrop);
  li.addEventListener('dragenter', handleDragEnter);
  li.addEventListener('dragleave', handleDragLeave);
  
  li.innerHTML = `
    <a href="${fav.url}" class="favorite-item" target="_self">
      <span class="fav-link-text">${fav.title}</span>
    </a>
    <button class="delete-fav-btn" title="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
  `;
  
  li.querySelector('.delete-fav-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteFavorite(fav.id);
  });
  
  return li;
}

// --- Drag and Drop Handlers ---

let draggedItem = null;
let draggedType = null; // 'folder' or 'favorite'

function handleDragStart(e) {
    e.stopPropagation();
    draggedItem = this;
    draggedType = this.classList.contains('folder-item') ? 'folder' : 'favorite';
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    e.dataTransfer.setData('type', draggedType);
    
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual cue
    const target = e.currentTarget;
    if (canDrop(target)) {
        target.classList.add('drag-over');
    }
}

function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    if (canDrop(target)) {
        target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    
    if (!draggedItem) return;
    
    const draggedId = draggedItem.dataset.id;
    
    // Logic for Folder Reordering
    if (draggedType === 'folder' && target.classList.contains('folder-item')) {
        const targetId = target.dataset.id;
        if (draggedId === targetId) return;
        
        // Reorder folders
        const draggedIndex = folders.findIndex(f => f.id === draggedId);
        const targetIndex = folders.findIndex(f => f.id === targetId);
        
        // Remove and insert
        const [moved] = folders.splice(draggedIndex, 1);
        folders.splice(targetIndex, 0, moved);
        
        // Update order
        folders.forEach((f, i) => f.order = i);
        saveData();
        return;
    }
    
    // Logic for Favorite Moving/Reordering
    if (draggedType === 'favorite') {
        // Determine destination folder
        let destFolderId = null;
        
        if (target.dataset.dropTarget === 'folder-header') {
            destFolderId = target.dataset.folderId;
        } else if (target.dataset.dropTarget === 'folder-list') {
            destFolderId = target.dataset.folderId;
        } else if (target.classList.contains('favorite-item-container')) {
            // Dropped on another favorite
            // Check if that favorite is in a folder
            const targetFav = favorites.find(f => f.id === target.dataset.id);
            destFolderId = targetFav ? targetFav.folderId : null;
        } else if (target.dataset.dropTarget === 'root-list') {
            destFolderId = null;
        } else {
            return; // Invalid drop
        }
        
        // Update folderId
        const fav = favorites.find(f => f.id === draggedId);
        if (fav) {
            fav.folderId = destFolderId;
            
            // Reordering logic if dropped on another item
            if (target.classList.contains('favorite-item-container')) {
                const targetId = target.dataset.id;
                if (draggedId !== targetId) {
                    // Reorder within the same scope (folder or root)
                    // We need to filter items in that scope to find indices
                    const scopeItems = favorites.filter(f => f.folderId === destFolderId).sort((a, b) => a.order - b.order);
                    const draggedIndex = scopeItems.findIndex(f => f.id === draggedId);
                    const targetIndex = scopeItems.findIndex(f => f.id === targetId);
                    
                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        // We need to adjust 'order' values.
                        // Simplest way: re-assign order based on new array position
                        // But we are working with a subset.
                        
                        // Let's just swap orders or insert?
                        // Insert is better.
                        
                        // Remove from scope array
                        // Note: draggedIndex might be -1 if we just moved it from another folder.
                        // If it's a move between folders, we just append to end or insert at target index?
                        
                        // If we moved folders, draggedIndex in *new* scope is technically undefined/last.
                        // Let's handle reorder globally by sorting everything? No.
                        
                        // Let's get all items in the destination scope *excluding* the dragged one (if it was already there)
                        let newScopeItems = favorites.filter(f => f.folderId === destFolderId && f.id !== draggedId).sort((a, b) => a.order - b.order);
                        
                        // Find where to insert
                        const insertIndex = newScopeItems.findIndex(f => f.id === targetId);
                        
                        // Insert
                        if (insertIndex !== -1) {
                            newScopeItems.splice(insertIndex, 0, fav);
                        } else {
                            newScopeItems.push(fav);
                        }
                        
                        // Update orders for these items
                        newScopeItems.forEach((f, i) => f.order = i);
                    }
                }
            } else {
                // Dropped on folder header or empty list -> append to end
                const scopeItems = favorites.filter(f => f.folderId === destFolderId && f.id !== draggedId).sort((a, b) => a.order - b.order);
                scopeItems.push(fav);
                scopeItems.forEach((f, i) => f.order = i);
            }
            
            saveData();
        }
    }
    
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    draggedType = null;
}

function canDrop(target) {
    if (!draggedItem) return false;
    
    if (draggedType === 'folder') {
        // Folders can only be reordered among other folders
        return target.classList.contains('folder-item');
    }
    
    if (draggedType === 'favorite') {
        // Favorites can be dropped on:
        // - Folder Header (move to folder)
        // - Folder List (move to folder)
        // - Root List (move to root)
        // - Other Favorite (reorder)
        
        if (target.dataset.dropTarget === 'folder-header') return true;
        if (target.dataset.dropTarget === 'folder-list') return true;
        if (target.dataset.dropTarget === 'root-list') return true;
        if (target.classList.contains('favorite-item-container')) return true;
    }
    
    return false;
}

// --- Management Logic ---

function showFolderModal(existingFolder = null) {
    // Simple modal implementation
    let modal = document.getElementById('fav-folder-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'fav-folder-modal';
    modal.className = 'fav-modal-overlay';
    
    const isEdit = !!existingFolder;
    
    modal.innerHTML = `
        <div class="fav-modal">
            <h3>${isEdit ? 'Edit Folder' : 'New Folder'}</h3>
            <div class="fav-form-group">
                <label>Name</label>
                <input type="text" id="folder-name" value="${existingFolder ? existingFolder.name : ''}" placeholder="Folder Name" autofocus>
            </div>
            <div class="fav-form-group">
                <label>Icon (Emoji)</label>
                <input type="text" id="folder-icon" value="${existingFolder ? existingFolder.icon : '📁'}" placeholder="📁">
            </div>
            <div class="fav-form-group">
                <label>Color</label>
                <div class="color-options">
                    ${['#8e8ea0', '#ef4444', '#f59e0b', '#10a37f', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => `
                        <div class="color-option ${existingFolder && existingFolder.color === c ? 'selected' : ''}" style="background-color: ${c}" data-color="${c}"></div>
                    `).join('')}
                </div>
                <input type="hidden" id="folder-color" value="${existingFolder ? existingFolder.color : '#8e8ea0'}">
            </div>
            <div class="fav-modal-actions">
                <button id="cancel-folder-btn" class="secondary-btn">Cancel</button>
                <button id="save-folder-btn" class="primary-btn">${isEdit ? 'Save' : 'Create'}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event Listeners
    const nameInput = modal.querySelector('#folder-name');
    const iconInput = modal.querySelector('#folder-icon');
    const colorInput = modal.querySelector('#folder-color');
    
    modal.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            modal.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            colorInput.value = opt.dataset.color;
        });
    });
    
    modal.querySelector('#cancel-folder-btn').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#save-folder-btn').addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) return;
        
        const icon = iconInput.value.trim() || '📁';
        const color = colorInput.value;
        
        if (isEdit) {
            const folder = folders.find(f => f.id === existingFolder.id);
            if (folder) {
                folder.name = name;
                folder.icon = icon;
                folder.color = color;
                saveData();
            }
        } else {
            folders.push({
                id: Date.now().toString(36),
                name,
                icon,
                color,
                isCollapsed: false,
                order: folders.length
            });
            saveData();
        }
        modal.remove();
    });
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function deleteFolder(folderId) {
    // Move items to root
    favorites = favorites.map(f => {
        if (f.folderId === folderId) {
            return { ...f, folderId: null };
        }
        return f;
    });
    
    folders = folders.filter(f => f.id !== folderId);
    saveData();
    showToast('Folder deleted');
}

function deleteFavorite(favId) {
    favorites = favorites.filter(f => f.id !== favId);
    saveData();
    showToast('Removed from Favorites');
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
    
    if (isFav) {
        // If already favorite, just remove it
        toggleFavorite(chatTitle, chatUrl);
    } else {
        // If adding, and we have folders, show selection modal
        if (folders.length > 0) {
            showAddToFolderModal(chatTitle, chatUrl);
        } else {
            // No folders, just add to root
            toggleFavorite(chatTitle, chatUrl);
        }
    }
    
    // Close the menu
    if (trigger) {
        trigger.click();
    } else {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  };
  
  // Insert at the top
  menuItems.insertBefore(btn, menuItems.firstChild);
}

function showAddToFolderModal(title, url) {
    let modal = document.getElementById('fav-folder-select-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'fav-folder-select-modal';
    modal.className = 'fav-modal-overlay';
    
    modal.innerHTML = `
        <div class="fav-modal" style="width: 280px;">
            <h3>Add to Folder</h3>
            <div class="folder-select-list">
                <div class="folder-select-item" data-id="root">
                    <span class="folder-icon">🏠</span>
                    <span class="folder-name">Root (No Folder)</span>
                </div>
                ${folders.sort((a, b) => a.order - b.order).map(f => `
                    <div class="folder-select-item" data-id="${f.id}" style="--folder-color: ${f.color}">
                        <span class="folder-icon">${f.icon}</span>
                        <span class="folder-name">${f.name}</span>
                    </div>
                `).join('')}
            </div>
            <div class="fav-modal-actions">
                <button id="cancel-select-btn" class="secondary-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.folder-select-item').forEach(item => {
        item.addEventListener('click', () => {
            const folderId = item.dataset.id === 'root' ? null : item.dataset.id;
            toggleFavorite(title, url, folderId);
            modal.remove();
        });
    });
    
    modal.querySelector('#cancel-select-btn').addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}
