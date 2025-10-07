class TextEditor {
    constructor() {
        this.editor = document.getElementById('textEditor');
        this.fileName = document.getElementById('fileName');
        this.wordCount = document.getElementById('wordCount');
        this.statusText = document.getElementById('statusText');
        this.cursorPosition = document.getElementById('cursorPosition');
        this.currentFileName = 'Untitled Document';
        this.undoStack = [];
        this.redoStack = [];
        this.isModified = false;
        
        this.initializeEditor();
    }

    initializeEditor() {
        this.editor.addEventListener('input', () => {
            this.updateWordCount();
            this.updateStatus();
            this.saveState();
            this.isModified = true;
        });

        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        this.editor.addEventListener('selectionchange', () => {
            this.updateCursorPosition();
        });

        this.editor.addEventListener('click', () => {
            this.updateCursorPosition();
        });

        // Initial setup
        this.updateWordCount();
        this.updateCursorPosition();
        this.saveState();
    }

    handleKeyDown(e) {
        if (e.ctrlKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    newFile();
                    break;
                case 'o':
                    e.preventDefault();
                    openFile();
                    break;
                case 's':
                    e.preventDefault();
                    saveFile();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redoAction();
                    } else {
                        undoAction();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    redoAction();
                    break;
            }
        }
    }

    updateWordCount() {
        const text = this.editor.value;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const characters = text.length;
        this.wordCount.textContent = `${words} words, ${characters} characters`;
    }

    updateCursorPosition() {
        const text = this.editor.value;
        const selectionStart = this.editor.selectionStart;
        const lines = text.substring(0, selectionStart).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        this.cursorPosition.textContent = `Line ${line}, Column ${column}`;
    }

    updateStatus(message = 'Ready') {
        this.statusText.textContent = message;
    }

    saveState() {
        const state = {
            content: this.editor.value,
            selectionStart: this.editor.selectionStart,
            selectionEnd: this.editor.selectionEnd
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    setFileName(name) {
        this.currentFileName = name;
        this.fileName.textContent = name;
        this.isModified = false;
    }

    setContent(content) {
        this.editor.value = content;
        this.updateWordCount();
        this.updateCursorPosition();
        this.saveState();
        this.isModified = false;
    }
}

const textEditor = new TextEditor();

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Update the backend URL for Netlify
const API_BASE_URL = window.location.origin; // This will be your Netlify domain

// File Operations - Updated to use backend API
function newFile() {
    if (textEditor.isModified) {
        const save = confirm('You have unsaved changes. Do you want to save before creating a new file?');
        if (save) {
            saveFile();
        }
    }
    
    textEditor.setContent('');
    textEditor.setFileName('Untitled Document');
    textEditor.updateStatus('New file created');
    showNotification('New file created');
}

async function openFile() {
    const fileInput = document.getElementById('fileInput');
    fileInput.onchange = async function(event) {
        const file = event.target.files[0];
        if (file && file.type === 'text/plain') {
            try {
                // Use backend API to load file
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`${API_BASE_URL}/api/load`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    textEditor.setContent(result.content);
                    textEditor.setFileName(result.filename);
                    textEditor.updateStatus(`Opened: ${result.filename}`);
                    showNotification(`File "${result.filename}" opened successfully`);
                } else {
                    showNotification(result.message || 'Failed to open file', 'error');
                }
            } catch (error) {
                console.error('Error opening file:', error);
                showNotification('Error opening file. Using fallback method.', 'warning');
                
                // Fallback to client-side FileReader if backend fails
                const reader = new FileReader();
                reader.onload = function(e) {
                    textEditor.setContent(e.target.result);
                    textEditor.setFileName(file.name);
                    textEditor.updateStatus(`Opened: ${file.name}`);
                    showNotification(`File "${file.name}" opened successfully`);
                };
                reader.readAsText(file);
            }
        } else {
            showNotification('Please select a valid .txt file', 'error');
        }
        // Reset file input
        fileInput.value = '';
    };
    fileInput.click();
}

async function saveFile() {
    const content = textEditor.editor.value;
    const fileName = textEditor.currentFileName === 'Untitled Document' ? 'document.txt' : textEditor.currentFileName;
    
    try {
        // Use backend API to save file
        const response = await fetch(`${API_BASE_URL}/api/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: fileName,
                content: content
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create download link for the file
            const downloadUrl = `${API_BASE_URL}/api/download/${result.file_id}`;
            
            // Trigger download
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = result.filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            textEditor.isModified = false;
            updateModifiedIndicator();
            textEditor.updateStatus(`Saved: ${result.filename}`);
            showNotification(`File "${result.filename}" saved successfully`);
        } else {
            throw new Error(result.message || 'Failed to save file');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        showNotification('Error saving to server. Using fallback method.', 'warning');
        
        // Fallback to client-side blob download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        textEditor.isModified = false;
        updateModifiedIndicator();
        textEditor.updateStatus(`Saved: ${fileName}`);
        showNotification(`File "${fileName}" saved successfully (offline)`);
    }
}

// Edit Operations
function cutText() {
    const selectedText = textEditor.editor.value.substring(
        textEditor.editor.selectionStart,
        textEditor.editor.selectionEnd
    );
    
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
            // Remove selected text
            const start = textEditor.editor.selectionStart;
            const end = textEditor.editor.selectionEnd;
            const newContent = textEditor.editor.value.substring(0, start) + 
                             textEditor.editor.value.substring(end);
            textEditor.setContent(newContent);
            textEditor.editor.setSelectionRange(start, start);
            showNotification('Text cut to clipboard');
        });
    }
}

function copyText() {
    const selectedText = textEditor.editor.value.substring(
        textEditor.editor.selectionStart,
        textEditor.editor.selectionEnd
    );
    
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
            showNotification('Text copied to clipboard');
        });
    } else {
        showNotification('No text selected', 'warning');
    }
}

function pasteText() {
    navigator.clipboard.readText().then(text => {
        const start = textEditor.editor.selectionStart;
        const end = textEditor.editor.selectionEnd;
        const currentContent = textEditor.editor.value;
        
        const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
        textEditor.setContent(newContent);
        textEditor.editor.setSelectionRange(start + text.length, start + text.length);
        showNotification('Text pasted from clipboard');
    }).catch(() => {
        showNotification('Unable to paste from clipboard', 'error');
    });
}

// Undo/Redo Operations
function undoAction() {
    if (textEditor.undoStack.length > 1) {
        const currentState = textEditor.undoStack.pop();
        textEditor.redoStack.push(currentState);
        
        const previousState = textEditor.undoStack[textEditor.undoStack.length - 1];
        textEditor.editor.value = previousState.content;
        textEditor.editor.setSelectionRange(previousState.selectionStart, previousState.selectionEnd);
        
        textEditor.updateWordCount();
        textEditor.updateCursorPosition();
        showNotification('Undo successful');
    } else {
        showNotification('Nothing to undo', 'warning');
    }
}

function redoAction() {
    if (textEditor.redoStack.length > 0) {
        const redoState = textEditor.redoStack.pop();
        textEditor.undoStack.push(redoState);
        
        textEditor.editor.value = redoState.content;
        textEditor.editor.setSelectionRange(redoState.selectionStart, redoState.selectionEnd);
        
        textEditor.updateWordCount();
        textEditor.updateCursorPosition();
        showNotification('Redo successful');
    } else {
        showNotification('Nothing to redo', 'warning');
    }
}

// Helper function to update modified indicator
function updateModifiedIndicator() {
    const indicator = document.getElementById('modifiedIndicator');
    if (textEditor.isModified) {
        indicator.textContent = '●';
        indicator.title = 'Document has unsaved changes';
    } else {
        indicator.textContent = '';
        indicator.title = '';
    }
}

// Update the TextEditor class to call updateModifiedIndicator
textEditor.editor.addEventListener('input', () => {
    textEditor.updateWordCount();
    textEditor.updateStatus();
    textEditor.saveState();
    textEditor.isModified = true;
    updateModifiedIndicator();
});

// Prevent accidental page close with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (textEditor.isModified) {
        e.preventDefault();
        return true;
    }
});

// Add a function to check if backend is available
async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/`);
        const result = await response.json();
        if (result.message) {
            console.log('Backend connected:', result.message);
            showNotification('Connected to server', 'success');
            return true;
        }
    } catch (error) {
        console.log('Backend not available, using offline mode');
        showNotification('Server not available - using offline mode', 'warning');
        return false;
    }
    return false;
}

// Check backend connection when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        checkBackendConnection();
    }, 1000); // Small delay to let Netlify functions wake up
});