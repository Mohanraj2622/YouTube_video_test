// script.js - VS Code Mobile Editor (Fixed Version)

// Configuration constants
const CONFIG = {
  LINE_HEIGHT: 21,
  MAX_TEXTAREA_HEIGHT: 300,
  TYPING_SPEED_MIN: 8,
  TYPING_SPEED_MAX: 15,
  SCROLL_DEBOUNCE: 16, // ~60fps
  DEFAULT_CONTENT: "// Welcome to VSCode Mobile!\n// Press Ctrl+K to add your code"
};

// Global state management
class EditorState {
  constructor() {
    this.currentCode = CONFIG.DEFAULT_CONTENT;
    this.currentFile = "main.js";
    this.files = { "main.js": CONFIG.DEFAULT_CONTENT };
    this.isTypingEffectRunning = false;
    this.typingTimeout = null;
    this.typingAbortController = null;
    this.cachedElements = new Map();
    this.scrollTimeout = null;
  }

  // Cached DOM element access
  getElement(id) {
    if (!this.cachedElements.has(id)) {
      const element = document.getElementById(id);
      if (element) {
        this.cachedElements.set(id, element);
      }
    }
    return this.cachedElements.get(id);
  }

  // Clear cached elements when DOM changes
  clearElementCache() {
    this.cachedElements.clear();
  }

  // Cleanup typing effect
  stopTypingEffect() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    if (this.typingAbortController) {
      this.typingAbortController.abort();
      this.typingAbortController = null;
    }
    this.isTypingEffectRunning = false;
    
    // Remove any existing cursors
    const cursors = document.querySelectorAll('.cursor');
    cursors.forEach(cursor => cursor.remove());
  }

  // Update file content and maintain consistency
  updateFile(filename, content) {
    this.files[filename] = content;
    if (filename === this.currentFile) {
      this.currentCode = content;
    }
  }
}

// Initialize global state
const editorState = new EditorState();

// Utility Functions
const utils = {
  // Enhanced filename validation
  isValidFilename(filename) {
    if (!filename || typeof filename !== 'string') return false;
    
    // Check for valid filename pattern (no spaces, special chars except . - _)
    const validPattern = /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,10}$/;
    if (!validPattern.test(filename)) return false;
    
    // Check for reserved names
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reserved.includes(nameWithoutExt)) return false;
    
    return true;
  },

  // Error handling wrapper
  safeExecute(fn, fallback = null, context = 'Unknown') {
    try {
      return fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      if (fallback) return fallback;
      return null;
    }
  },

  // Debounced function creator
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Safe DOM manipulation
  safeSetTextContent(element, content) {
    if (element && typeof content === 'string') {
      element.textContent = content;
      return true;
    }
    return false;
  },

  // Check if Prism.js is available
  isPrismAvailable() {
    return typeof Prism !== 'undefined' && Prism.highlightElement;
  }
};

// File icon and language detection
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const icons = {
    'js': '📄', 'html': '🌐', 'css': '🎨', 'json': '📋', 'md': '📝',
    'py': '🐍', 'java': '☕', 'cpp': '⚡', 'c': '⚡', 'php': '🐘',
    'rb': '💎', 'go': '🔷', 'rs': '🦀', 'ts': '📘', 'jsx': '⚛️',
    'tsx': '⚛️', 'vue': '💚', 'xml': '📄', 'yml': '📄', 'yaml': '📄'
  };
  return icons[ext] || '📄';
}

function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languages = {
    'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
    'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
    'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
    'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust',
    'xml': 'xml', 'yml': 'yaml', 'yaml': 'yaml'
  };
  return languages[ext] || 'javascript';
}

// Enhanced tab management
function switchTab(filename) {
  return utils.safeExecute(() => {
    if (!editorState.files[filename]) {
      console.warn(`File ${filename} not found`);
      return false;
    }

    // Stop any running typing effect
    editorState.stopTypingEffect();
    
    // Update tab UI
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const targetTab = document.querySelector(`[data-file="${filename}"]`);
    if (targetTab) {
      targetTab.classList.add('active');
      editorState.currentFile = filename;
      
      const filenameDisplay = editorState.getElement('filenameDisplay');
      if (filenameDisplay) {
        filenameDisplay.textContent = filename;
      }
      
      updateEditorContent(filename);
      updateStatusBarLanguage(filename);
      
      return true;
    }
    return false;
  }, false, 'switchTab');
}

function updateEditorContent(filename) {
  const editor = editorState.getElement('editor');
  const lineNumbers = editorState.getElement('lineNumbers');
  
  if (!editor) return;
  
  const content = editorState.files[filename] || '';
  editorState.currentCode = content;
  
  utils.safeSetTextContent(editor, content);
  
  const language = getLanguageFromExtension(filename);
  editor.className = `language-${language}`;
  
  const editorContainer = editor.parentElement;
  if (editorContainer) {
    editorContainer.className = `editor-container language-${language}`;
  }
  
  const lines = content.split('\n');
  updateLineNumbers(lines.length);
  
  // Safe syntax highlighting
  if (utils.isPrismAvailable()) {
    utils.safeExecute(() => Prism.highlightElement(editor), null, 'Prism highlighting');
  }
  
  // Reset scroll position
  const editorWrapper = document.querySelector('.editor-wrapper');
  if (editorWrapper) {
    editorWrapper.scrollTop = 0;
    if (lineNumbers) {
      lineNumbers.style.transform = 'translateY(0px)';
    }
  }
  
  const lineCount = editorState.getElement('lineCount');
  if (lineCount) {
    lineCount.textContent = lines.length.toString();
  }
}

function updateStatusBarLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap = {
    'js': 'JavaScript', 'jsx': 'JavaScript (JSX)', 'ts': 'TypeScript',
    'tsx': 'TypeScript (TSX)', 'html': 'HTML', 'css': 'CSS',
    'json': 'JSON', 'md': 'Markdown', 'py': 'Python', 'java': 'Java',
    'cpp': 'C++', 'c': 'C', 'php': 'PHP', 'rb': 'Ruby', 'go': 'Go', 'rs': 'Rust'
  };
  
  const statusElement = document.querySelector('.status-bar span:first-child');
  if (statusElement) {
    statusElement.textContent = languageMap[ext] || ext.toUpperCase();
  }
}

// Enhanced tab creation and management
function closeTab(event, filename) {
  event?.stopPropagation();
  
  return utils.safeExecute(() => {
    if (Object.keys(editorState.files).length === 1) {
      alert("Cannot close the last tab!");
      return false;
    }
    
    delete editorState.files[filename];
    
    const tab = document.querySelector(`[data-file="${filename}"]`);
    if (tab) {
      tab.remove();
    }
    
    if (editorState.currentFile === filename) {
      const remainingFiles = Object.keys(editorState.files);
      if (remainingFiles.length > 0) {
        switchTab(remainingFiles[0]);
      }
    }
    
    editorState.clearElementCache();
    return true;
  }, false, 'closeTab');
}

function createNewTab() {
  const filename = prompt("Enter filename (e.g., script.js, index.html):", "untitled.js");
  
  if (!filename) return false;
  
  if (!utils.isValidFilename(filename)) {
    alert("Please enter a valid filename:\n• Only letters, numbers, dots, hyphens, and underscores\n• Must have a file extension\n• No spaces or special characters");
    return false;
  }
  
  if (editorState.files[filename]) {
    switchTab(filename);
    return true;
  }
  
  editorState.files[filename] = `// New file: ${filename}\n`;
  createTabElement(filename);
  switchTab(filename);
  
  // Scroll new tab into view
  const newTab = document.querySelector(`[data-file="${filename}"]`);
  if (newTab) {
    newTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  
  return true;
}

function createTabElement(filename) {
  const tabsContainer = editorState.getElement('fileTabs');
  if (!tabsContainer) return null;
  
  const newTab = document.createElement('div');
  newTab.className = 'tab';
  newTab.setAttribute('data-file', filename);
  newTab.onclick = () => switchTab(filename);
  
  newTab.innerHTML = `
    <span>${getFileIcon(filename)}</span>
    <span class="tab-name">${filename}</span>
    <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
  `;
  
  tabsContainer.appendChild(newTab);
  editorState.clearElementCache();
  return newTab;
}

// Enhanced popup management
function togglePopup() {
  const popup = editorState.getElement('popup');
  if (!popup) return;
  
  const isVisible = popup.style.display === 'flex';
  popup.style.display = isVisible ? 'none' : 'flex';
  
  if (!isVisible) {
    const fileNameInput = editorState.getElement('fileNameInput');
    if (fileNameInput) {
      fileNameInput.focus();
    }
  }
}

function toggleExportPopup() {
  const exportPopup = editorState.getElement('exportPopup');
  if (!exportPopup) return;
  
  const isVisible = exportPopup.style.display === 'flex';
  exportPopup.style.display = isVisible ? 'none' : 'flex';
  
  if (!isVisible) {
    const exportFilename = editorState.getElement('exportFilename');
    if (exportFilename) {
      exportFilename.value = editorState.currentFile;
      exportFilename.focus();
    }
  }
}

// Enhanced line number management
function updateLineNumbers(lineCount) {
  const lineNumbers = editorState.getElement('lineNumbers');
  const lineCountElement = editorState.getElement('lineCount');
  
  if (!lineNumbers) return;
  
  lineCount = Math.max(1, parseInt(lineCount) || 1);
  
  const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  utils.safeSetTextContent(lineNumbers, numbers);
  
  if (lineCountElement) {
    lineCountElement.textContent = lineCount.toString();
  }
}

// Enhanced code submission
function submitCode() {
  return utils.safeExecute(() => {
    const codeInput = editorState.getElement('codeInput');
    const fileNameInput = editorState.getElement('fileNameInput');
    
    if (!codeInput) {
      alert("Code input not found!");
      return false;
    }
    
    const input = codeInput.value.trim();
    let filename = fileNameInput?.value.trim() || editorState.currentFile;
    
    if (!input) {
      alert("Please enter some code first!");
      return false;
    }
    
    if (!utils.isValidFilename(filename)) {
      alert("Please enter a valid filename with extension (e.g., script.js, index.html)");
      return false;
    }
    
    editorState.updateFile(filename, input);
    
    // Create tab if it doesn't exist
    if (!document.querySelector(`[data-file="${filename}"]`)) {
      createTabElement(filename);
    }
    
    switchTab(filename);
    
    // Clear popup
    const popup = editorState.getElement('popup');
    if (popup) popup.style.display = 'none';
    
    codeInput.value = '';
    if (fileNameInput) fileNameInput.value = '';
    
    // Start typing effect
    const editor = editorState.getElement('editor');
    if (editor) {
      utils.safeSetTextContent(editor, '');
      typeAndHighlight(input, editor);
    }
    
    return true;
  }, false, 'submitCode');
}

function clearEditor() {
  if (!confirm("Are you sure you want to clear the current file?")) {
    return false;
  }
  
  return utils.safeExecute(() => {
    const editor = editorState.getElement('editor');
    const defaultContent = `// Empty file: ${editorState.currentFile}\n`;
    
    editorState.updateFile(editorState.currentFile, defaultContent);
    
    if (editor) {
      utils.safeSetTextContent(editor, defaultContent);
      updateLineNumbers(2);
      
      if (utils.isPrismAvailable()) {
        Prism.highlightElement(editor);
      }
    }
    
    // Clear popup
    const popup = editorState.getElement('popup');
    if (popup) popup.style.display = 'none';
    
    const codeInput = editorState.getElement('codeInput');
    const fileNameInput = editorState.getElement('fileNameInput');
    
    if (codeInput) codeInput.value = '';
    if (fileNameInput) fileNameInput.value = '';
    
    return true;
  }, false, 'clearEditor');
}

// Enhanced typing effect with proper cleanup
function typeAndHighlight(code, container) {
  return utils.safeExecute(() => {
    if (!container || !code) return false;
    
    // Stop any existing typing effect
    editorState.stopTypingEffect();
    
    // Create new abort controller for this typing session
    editorState.typingAbortController = new AbortController();
    const { signal } = editorState.typingAbortController;
    
    let i = 0;
    let buffer = '';
    const lines = code.split('\n');
    let currentLine = 1;
    const editorWrapper = container.closest('.editor-wrapper');
    const lineNumbers = editorState.getElement('lineNumbers');
    
    editorState.isTypingEffectRunning = true;
    
    // Create cursor element
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.style.cssText = `
      display: inline-block;
      width: 2px;
      height: 1.2em;
      background-color: #007ACC;
      animation: blink 1s infinite;
      position: relative;
      margin-left: 1px;
    `;
    
    function updateDisplay() {
      if (signal.aborted) return;
      
      utils.safeSetTextContent(container, buffer);
      container.appendChild(cursor);
      
      updateLineNumbers(Math.max(currentLine, lines.length));
      
      if (utils.isPrismAvailable()) {
        utils.safeExecute(() => Prism.highlightElement(container), null, 'Prism in typing');
        container.appendChild(cursor); // Re-append cursor after highlighting
      }
      
      // Auto-scroll management
      if (editorWrapper && lineNumbers) {
        const containerHeight = container.getBoundingClientRect().height;
        const wrapperHeight = editorWrapper.getBoundingClientRect().height;
        
        if (containerHeight > wrapperHeight) {
          const scrollTop = Math.max(0, container.scrollHeight - wrapperHeight);
          editorWrapper.scrollTop = scrollTop;
          
          // Sync line numbers
          const visibleLines = Math.floor(wrapperHeight / CONFIG.LINE_HEIGHT);
          const totalLines = Math.max(currentLine, 1);
          
          if (totalLines > visibleLines) {
            const lineNumberScrollTop = Math.max(0, (totalLines - visibleLines) * CONFIG.LINE_HEIGHT);
            lineNumbers.style.transform = `translateY(-${lineNumberScrollTop}px)`;
          }
        }
      }
    }
    
    function typing() {
      if (signal.aborted) {
        cursor.remove();
        return;
      }
      
      if (i < code.length) {
        const char = code.charAt(i);
        buffer += char;
        
        if (char === '\n') {
          currentLine++;
        }
        
        updateDisplay();
        
        i++;
        const delay = Math.random() * (CONFIG.TYPING_SPEED_MAX - CONFIG.TYPING_SPEED_MIN) + CONFIG.TYPING_SPEED_MIN;
        editorState.typingTimeout = setTimeout(typing, delay);
      } else {
        // Typing complete
        finishTyping();
      }
    }
    
    function finishTyping() {
      editorState.isTypingEffectRunning = false;
      editorState.updateFile(editorState.currentFile, code);
      
      cursor.remove();
      updateLineNumbers(lines.length);
      
      // Final scroll adjustment
      setTimeout(() => {
        if (signal.aborted) return;
        
        if (editorWrapper && lineNumbers) {
          const wrapperHeight = editorWrapper.getBoundingClientRect().height;
          const visibleLines = Math.floor(wrapperHeight / CONFIG.LINE_HEIGHT);
          const totalLines = lines.length;
          
          if (totalLines > visibleLines) {
            const lineNumberScrollTop = Math.max(0, (totalLines - visibleLines) * CONFIG.LINE_HEIGHT);
            lineNumbers.style.transform = `translateY(-${lineNumberScrollTop}px)`;
          } else {
            lineNumbers.style.transform = 'translateY(0px)';
          }
        }
      }, 100);
    }
    
    typing();
    return true;
  }, false, 'typeAndHighlight');
}

// Enhanced export functions
function exportFile(method) {
  return utils.safeExecute(() => {
    const exportFilename = editorState.getElement('exportFilename');
    let filename = exportFilename?.value.trim() || '';
    
    if (!filename) {
      alert("Please enter a filename!");
      return false;
    }
    
    // Auto-add extension if missing
    if (!filename.includes('.')) {
      const ext = editorState.currentFile.split('.').pop();
      filename += `.${ext}`;
      if (exportFilename) exportFilename.value = filename;
    }
    
    if (!utils.isValidFilename(filename)) {
      alert("Please enter a valid filename!");
      return false;
    }
    
    const content = editorState.files[editorState.currentFile] || editorState.currentCode;
    
    if (method === 'download') {
      return downloadFile(filename, content);
    } else if (method === 'copy') {
      return copyToClipboard(content);
    }
    
    return false;
  }, false, 'exportFile');
}

function downloadFile(filename, content) {
  return utils.safeExecute(() => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toggleExportPopup();
    return true;
  }, false, 'downloadFile');
}

function copyToClipboard(content) {
  return utils.safeExecute(async () => {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        alert("Code copied to clipboard!");
        return true;
      } catch (err) {
        alert("Failed to copy to clipboard. Please select and copy manually.");
        return false;
      } finally {
        document.body.removeChild(textArea);
        toggleExportPopup();
      }
    } else {
      try {
        await navigator.clipboard.writeText(content);
        alert("Code copied to clipboard!");
        toggleExportPopup();
        return true;
      } catch (err) {
        alert("Failed to copy to clipboard. Please try again.");
        return false;
      }
    }
  }, false, 'copyToClipboard');
}

// Enhanced file explorer
function showFileExplorer() {
  const fileList = Object.keys(editorState.files)
    .map(file => `📄 ${file}`)
    .join('\n');
  
  const message = `Current Files:\n\n${fileList}\n\nEnter filename to open (existing) or create (new):`;
  const newFile = prompt(message, '');
  
  if (!newFile) return false;
  
  if (!utils.isValidFilename(newFile)) {
    alert("Please enter a valid filename with extension!");
    return false;
  }
  
  return utils.safeExecute(() => {
    if (editorState.files[newFile]) {
      // Open existing file
      switchTab(newFile);
    } else {
      // Create new file
      editorState.files[newFile] = `// New file: ${newFile}\n`;
      createTabElement(newFile);
      switchTab(newFile);
    }
    return true;
  }, false, 'showFileExplorer');
}

// Enhanced scroll handling with debouncing
const debouncedScrollHandler = utils.debounce(function() {
  const editorWrapper = document.querySelector('.editor-wrapper');
  const lineNumbers = editorState.getElement('lineNumbers');
  
  if (editorWrapper && lineNumbers) {
    const scrollTop = editorWrapper.scrollTop;
    lineNumbers.style.transform = `translateY(-${scrollTop}px)`;
  }
}, CONFIG.SCROLL_DEBOUNCE);

// Enhanced initialization
function initializeEditor() {
  return utils.safeExecute(() => {
    const editor = editorState.getElement('editor');
    const editorWrapper = document.querySelector('.editor-wrapper');
    
    if (!editor) {
      console.error('Editor element not found!');
      return false;
    }
    
    // Initialize editor content
    updateLineNumbers(2);
    if (utils.isPrismAvailable()) {
      Prism.highlightElement(editor);
    }
    
    // Set up scroll synchronization
    if (editorWrapper) {
      editorWrapper.removeEventListener('scroll', debouncedScrollHandler);
      editorWrapper.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    }
    
    updateStatusBarLanguage(editorState.currentFile);
    
    // Enhanced textarea auto-resize
    const codeInput = editorState.getElement('codeInput');
    if (codeInput) {
      codeInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, CONFIG.MAX_TEXTAREA_HEIGHT) + 'px';
        
        // Auto-suggest filename based on content
        autoSuggestFilename(this.value);
      });
    }
    
    setupKeyboardShortcuts();
    
    // Add CSS for cursor animation if not present
    if (!document.querySelector('#cursor-animation-style')) {
      const style = document.createElement('style');
      style.id = 'cursor-animation-style';
      style.textContent = `
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .cursor {
          animation: blink 1s infinite;
        }
      `;
      document.head.appendChild(style);
    }
    
    return true;
  }, false, 'initializeEditor');
}

function autoSuggestFilename(code) {
  const fileNameInput = editorState.getElement('fileNameInput');
  if (!fileNameInput || fileNameInput.value.trim()) return;
  
  const lowerCode = code.toLowerCase();
  
  if (lowerCode.includes('<!doctype html') || lowerCode.includes('<html')) {
    fileNameInput.placeholder = 'index.html';
  } else if (lowerCode.includes('function') || lowerCode.includes('const') || lowerCode.includes('let')) {
    fileNameInput.placeholder = 'script.js';
  } else if (lowerCode.includes('body {') || lowerCode.includes('color:') || lowerCode.includes('margin:')) {
    fileNameInput.placeholder = 'style.css';
  } else if (lowerCode.includes('def ') || lowerCode.includes('import ')) {
    fileNameInput.placeholder = 'main.py';
  } else if (lowerCode.includes('class ') && lowerCode.includes('public ')) {
    fileNameInput.placeholder = 'Main.java';
  } else {
    fileNameInput.placeholder = 'untitled.txt';
  }
}

function setupKeyboardShortcuts() {
  // Remove existing listener to prevent duplicates
  document.removeEventListener('keydown', keyboardHandler);
  document.addEventListener('keydown', keyboardHandler);
}

function keyboardHandler(e) {
  // Ctrl/Cmd + K - Open add code popup
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    togglePopup();
    return;
  }
  
  // Escape - Close popups
  if (e.key === 'Escape') {
    const popup = editorState.getElement('popup');
    const exportPopup = editorState.getElement('exportPopup');
    
    if (popup) popup.style.display = 'none';
    if (exportPopup) exportPopup.style.display = 'none';
    return;
  }
  
  // Ctrl/Cmd + N - New tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNewTab();
    return;
  }
  
  // Ctrl/Cmd + O - File explorer
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    showFileExplorer();
    return;
  }
  
  // Ctrl/Cmd + S - Export
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    toggleExportPopup();
    return;
  }
  
  // Ctrl/Cmd + W - Close current tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault();
    const event = { stopPropagation: () => {} };
    closeTab(event, editorState.currentFile);
    return;
  }
}

// Cleanup function for page unload
function cleanup() {
  editorState.stopTypingEffect();
  editorState.clearElementCache();
  
  // Clear any remaining timeouts
  if (editorState.scrollTimeout) {
    clearTimeout(editorState.scrollTimeout);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEditor);
} else {
  initializeEditor();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    editorState,
    utils,
    switchTab,
    createNewTab,
    closeTab,
    submitCode,
    clearEditor,
    exportFile,
    showFileExplorer,
    initializeEditor,
    cleanup
  };
}
