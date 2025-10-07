// Text editor functionality

class TextEditor {
    constructor() {
        this.editor = document.getElementById('textEditor');
        this.currentFileName = 'Untitled';
        this.isModified = false;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoStack = 50;
        this.isWordWrapEnabled = true;
        
        this.init();
    }
    
    init() {
        this.loadFile();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.updateStats();
        this.saveState();
    }
    
    loadFile() {
        const savedContent = localStorage.getItem('currentFileContent');
        const savedFileName = localStorage.getItem('currentFileName');
        
        if (savedContent !== null) {
            this.editor.value = savedContent;
            localStorage.removeItem('currentFileContent');
        }
        
        if (savedFileName) {
            this.currentFileName = savedFileName;
            localStorage.removeItem('currentFileName');
        }
        
        this.updateFileName();
        this.updateStats();
    }
    
    setupEventListeners() {
        this.editor.addEventListener('input', () => {
            this.isModified = true;
            this.updateStats();
            this.saveState();
        });
        
        this.editor.addEventListener('scroll', () => {
            this.syncLineNumbers();
        });
        
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.isModified) {
                this.autoSave();
            }
        }, 30000);
        
        // Warn before leaving if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.isModified) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }
    
    setupKeyboardShortcuts() {
        this.editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.saveAsFile();
                        } else {
                            this.saveFile();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openFile();
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.redo();
                        } else {
                            e.preventDefault();
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.findReplace();
                        break;
                    case 'a':
                        // Allow default Ctrl+A behavior
                        break;
                }
            }
            
            // Tab handling
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });
    }
    
    newFile() {
        if (this.isModified) {
            if (confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
                this.editor.value = '';
                this.currentFileName = 'Untitled';
                this.isModified = false;
                this.undoStack = [];
                this.redoStack = [];
                this.updateFileName();
                this.updateStats();
                this.saveState();
            }
        } else {
            this.editor.value = '';
            this.currentFileName = 'Untitled';
            this.isModified = false;
            this.undoStack = [];
            this.redoStack = [];
            this.updateFileName();
            this.updateStats();
            this.saveState();
        }
    }
    
    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.md,.js,.html,.css,.json,.py,.java,.cpp,.c';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.editor.value = e.target.result;
                    this.currentFileName = file.name;
                    this.isModified = false;
                    this.updateFileName();
                    this.updateStats();
                    this.saveState();
                    this.addToRecentFiles(file.name);
                    showNotification(`Opened ${file.name}`, 'success');
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    saveFile() {
        const content = this.editor.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFileName;
        a.click();
        
        URL.revokeObjectURL(url);
        this.isModified = false;
        this.addToRecentFiles(this.currentFileName);
        showNotification(`Saved ${this.currentFileName}`, 'success');
    }
    
    saveAsFile() {
        const fileName = prompt('Enter filename:', this.currentFileName);
        if (fileName) {
            this.currentFileName = fileName;
            this.updateFileName();
            this.saveFile();
        }
    }
    
    autoSave() {
        localStorage.setItem('autoSave_content', this.editor.value);
        localStorage.setItem('autoSave_fileName', this.currentFileName);
        localStorage.setItem('autoSave_timestamp', Date.now().toString());
    }
    
    cut() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
                this.insertTextAtCursor('');
                showNotification('Text cut to clipboard', 'success');
            });
        }
    }
    
    copy() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
                showNotification('Text copied to clipboard', 'success');
            });
        }
    }
    
    paste() {
        navigator.clipboard.readText().then(text => {
            this.insertTextAtCursor(text);
            showNotification('Text pasted from clipboard', 'success');
        }).catch(() => {
            showNotification('Failed to paste from clipboard', 'error');
        });
    }
    
    undo() {
        if (this.undoStack.length > 1) {
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.editor.value = previousState.content;
            this.editor.setSelectionRange(previousState.cursorPos, previousState.cursorPos);
            this.updateStats();
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);
            this.editor.value = nextState.content;
            this.editor.setSelectionRange(nextState.cursorPos, nextState.cursorPos);
            this.updateStats();
        }
    }
    
    findReplace() {
        this.showFindReplaceModal();
    }
    
    toggleWordWrap() {
        this.isWordWrapEnabled = !this.isWordWrapEnabled;
        this.editor.style.whiteSpace = this.isWordWrapEnabled ? 'pre-wrap' : 'pre';
        this.editor.style.overflowX = this.isWordWrapEnabled ? 'hidden' : 'auto';
        showNotification(`Word wrap ${this.isWordWrapEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    // Helper methods
    getSelectedText() {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        return this.editor.value.substring(start, end);
    }
    
    insertTextAtCursor(text) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const before = this.editor.value.substring(0, start);
        const after = this.editor.value.substring(end);
        
        this.editor.value = before + text + after;
        this.editor.setSelectionRange(start + text.length, start + text.length);
        this.editor.focus();
        this.isModified = true;
        this.updateStats();
        this.saveState();
    }
    
    insertTab() {
        this.insertTextAtCursor('    '); // 4 spaces
    }
    
    saveState() {
        const state = {
            content: this.editor.value,
            cursorPos: this.editor.selectionStart
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoStack) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack when new action is performed
    }
    
    updateFileName() {
        const fileNameElement = document.getElementById('currentFileName');
        if (fileNameElement) {
            fileNameElement.textContent = this.currentFileName + (this.isModified ? ' *' : '');
        }
        document.title = `${this.currentFileName}${this.isModified ? ' *' : ''} - Text Editor`;
    }
    
    updateStats() {
        const content = this.editor.value;
        const lines = content.split('\n').length;
        const characters = content.length;
        const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
        
        const lineCountElement = document.getElementById('lineCount');
        const charCountElement = document.getElementById('charCount');
        const wordCountElement = document.getElementById('wordCount');
        
        if (lineCountElement) lineCountElement.textContent = lines;
        if (charCountElement) charCountElement.textContent = characters;
        if (wordCountElement) wordCountElement.textContent = words;
    }
    
    addToRecentFiles(filename) {
        let recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
        recentFiles = recentFiles.filter(file => file !== filename);
        recentFiles.unshift(filename);
        recentFiles = recentFiles.slice(0, 5);
        localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
    }
    
    showFindReplaceModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeFindReplace()"></div>
            <div class="find-replace-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Find & Replace</h3>
                    <button class="close-btn" onclick="closeFindReplace()">×</button>
                </div>
                <div class="form-group">
                    <label for="findInput">Find:</label>
                    <input type="text" id="findInput" placeholder="Enter text to find">
                </div>
                <div class="form-group">
                    <label for="replaceInput">Replace with:</label>
                    <input type="text" id="replaceInput" placeholder="Enter replacement text">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary btn-small" onclick="findNext()">Find Next</button>
                    <button class="btn btn-secondary btn-small" onclick="replaceNext()">Replace</button>
                    <button class="btn btn-primary btn-small" onclick="replaceAll()">Replace All</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('findInput').focus();
    }
    
    syncLineNumbers() {
        // This method can be used for future line number implementation
    }
}

// Global functions for toolbar and modal actions
function newFile() {
    window.textEditor.newFile();
}

function openFile() {
    window.textEditor.openFile();
}

function saveFile() {
    window.textEditor.saveFile();
}

function saveAsFile() {
    window.textEditor.saveAsFile();
}

function cut() {
    window.textEditor.cut();
}

function copy() {
    window.textEditor.copy();
}

function paste() {
    window.textEditor.paste();
}

function undo() {
    window.textEditor.undo();
}

function redo() {
    window.textEditor.redo();
}

function findReplace() {
    window.textEditor.findReplace();
}

function toggleWordWrap() {
    window.textEditor.toggleWordWrap();
}

function closeFindReplace() {
    const modal = document.querySelector('.modal-overlay').parentElement;
    document.body.removeChild(modal);
}

function findNext() {
    const findText = document.getElementById('findInput').value;
    if (findText) {
        const content = window.textEditor.editor.value;
        const currentPos = window.textEditor.editor.selectionStart;
        const index = content.indexOf(findText, currentPos);
        
        if (index !== -1) {
            window.textEditor.editor.setSelectionRange(index, index + findText.length);
            window.textEditor.editor.focus();
        } else {
            // Search from beginning if not found after cursor
            const indexFromStart = content.indexOf(findText, 0);
            if (indexFromStart !== -1 && indexFromStart < currentPos) {
                window.textEditor.editor.setSelectionRange(indexFromStart, indexFromStart + findText.length);
                window.textEditor.editor.focus();
            } else {
                showNotification('Text not found', 'info');
            }
        }
    }
}

function replaceNext() {
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    
    if (findText && window.textEditor.getSelectedText() === findText) {
        window.textEditor.insertTextAtCursor(replaceText);
        findNext();
    } else {
        findNext();
    }
}

function replaceAll() {
    const findText = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    
    if (findText) {
        const content = window.textEditor.editor.value;
        const newContent = content.split(findText).join(replaceText);
        const replacements = content.split(findText).length - 1;
        
        window.textEditor.editor.value = newContent;
        window.textEditor.isModified = true;
        window.textEditor.updateStats();
        window.textEditor.saveState();
        
        showNotification(`Replaced ${replacements} occurrences`, 'success');
        closeFindReplace();
    }
}

// Initialize the text editor when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.textEditor = new TextEditor();
});

// Utility function for notifications (if not already defined)
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