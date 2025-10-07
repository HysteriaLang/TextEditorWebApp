// Main application functionality

document.addEventListener('DOMContentLoaded', function() {
    loadRecentFiles();
    setupKeyboardShortcuts();
});

function createNew() {
    window.location.href = '/.netlify/functions/server/editor';
}

function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.js,.html,.css,.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                localStorage.setItem('currentFileContent', e.target.result);
                localStorage.setItem('currentFileName', file.name);
                addToRecentFiles(file.name);
                window.location.href = '/.netlify/functions/server/editor';
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

function loadRecentFiles() {
    const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    const recentFilesList = document.getElementById('recentFilesList');
    
    if (recentFilesList) {
        if (recentFiles.length === 0) {
            recentFilesList.innerHTML = '<li>No recent files</li>';
        } else {
            recentFilesList.innerHTML = recentFiles.map(file => 
                `<li onclick="openRecentFile('${file}')">${file}</li>`
            ).join('');
        }
    }
}

function addToRecentFiles(filename) {
    let recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    recentFiles = recentFiles.filter(file => file !== filename);
    recentFiles.unshift(filename);
    recentFiles = recentFiles.slice(0, 5); // Keep only 5 recent files
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
}

function openRecentFile(filename) {
    // In a real application, you would load the file content from a server
    localStorage.setItem('currentFileName', filename);
    window.location.href = '/.netlify/functions/server/editor';
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    createNew();
                    break;
                case 'o':
                    e.preventDefault();
                    openFile();
                    break;
            }
        }
    });
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-primary);
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.borderColor = 'var(--success-color)';
        notification.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    } else if (type === 'error') {
        notification.style.borderColor = 'var(--error-color)';
        notification.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}