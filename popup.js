document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('favorites-list');
  const emptyState = document.getElementById('empty-state');
  const clearBtn = document.getElementById('clear-all');
  const countBadge = document.getElementById('count-badge');

  function renderFavorites() {
    chrome.storage.sync.get(['favorites'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Error retrieving favorites:', chrome.runtime.lastError);
        return;
      }

      const favorites = result.favorites || [];
      list.innerHTML = '';
      
      // Update badge
      if (countBadge) {
        countBadge.textContent = favorites.length;
      }

      if (favorites.length === 0) {
        emptyState.style.display = 'flex';
        clearBtn.style.display = 'none';
      } else {
        emptyState.style.display = 'none';
        clearBtn.style.display = 'block';

        favorites.forEach((fav, index) => {
          const li = document.createElement('li');
          
          const a = document.createElement('a');
          a.href = fav.url;
          a.textContent = fav.title;
          // Open in active tab
          a.onclick = (e) => {
            e.preventDefault();
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const activeTab = tabs[0];
              if (activeTab) {
                chrome.tabs.update(activeTab.id, { url: fav.url });
              }
            });
          };
          
          const delBtn = document.createElement('button');
          delBtn.className = 'delete-btn';
          delBtn.innerHTML = `
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          delBtn.title = 'Remove';
          delBtn.onclick = () => removeFavorite(fav.url);

          li.appendChild(a);
          li.appendChild(delBtn);
          list.appendChild(li);
        });
      }
    });
  }

  function removeFavorite(url) {
    chrome.storage.sync.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      const newFavorites = favorites.filter(f => f.url !== url);
      chrome.storage.sync.set({ favorites: newFavorites }, () => {
        renderFavorites();
      });
    });
  }

  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all favorites?')) {
      chrome.storage.sync.set({ favorites: [] }, () => {
        renderFavorites();
      });
    }
  });

  renderFavorites();
});
