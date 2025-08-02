// script.js - VS Code Mobile Editor
let currentCode = "// Welcome to VSCode Mobile!\n// Click the chat button to add your code";
let currentFile = "main.js";
let files = {
  "main.js": "// Welcome to VSCode Mobile!\n// Click the chat button to add your code"
};
let isTypingEffectRunning = false;
let typingTimeout = null;

// Helper Functions
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'js': '📄',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'md': '📝',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚡',
    'c': '⚡',
    'php': '🐘',
    'rb': '💎',
    'go': '🔷',
    'rs': '🦀',
    'ts': '📘',
    'jsx': '⚛️',
    'tsx': '⚛️',
    'vue': '💚',
    'xml': '📄',
    'yml': '📄',
    'yaml': '📄'
  };
  return icons[ext] || '📄';
}

function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const languages = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'xml': 'xml',
    'yml': 'yaml',
    'yaml': 'yaml'
  };
  return languages[ext] || 'javascript';
}

// Editor Functions
function switchTab(filename) {
  if (isTypingEffectRunning) {
    clearTimeout(typingTimeout);
    isTypingEffectRunning = false;
  }
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const targetTab = document.querySelector(`[data-file="${filename}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
    currentFile = filename;
    document.getElementById('filenameDisplay').textContent = filename;
    
    const editor = document.getElementById("editor");
    const lineNumbers = document.getElementById("lineNumbers");
    const content = files[filename] || '';
    currentCode = content;
    editor.textContent = content;
    
    const language = getLanguageFromExtension(filename);
    editor.className = `language-${language}`;
    editor.parentElement.className = `editor-container language-${language}`;
    
    const lines = content.split('\n');
    updateLineNumbers(lines.length);
    Prism.highlightElement(editor);
    
    const editorWrapper = document.querySelector(".editor-wrapper");
    editorWrapper.scrollTop = 0;
    lineNumbers.style.transform = 'translateY(0px)';
    
    document.getElementById("lineCount").textContent = lines.length;
    updateStatusBarLanguage(filename);
  }
}

function updateStatusBarLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'JavaScript',
    'jsx': 'JavaScript (JSX)',
    'ts': 'TypeScript',
    'tsx': 'TypeScript (TSX)',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'md': 'Markdown',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust'
  };
  
  document.querySelector('.status-bar span:first-child').textContent = languageMap[ext] || ext.toUpperCase();
}

function closeTab(event, filename) {
  event.stopPropagation();
  
  if (Object.keys(files).length === 1) {
    alert("Cannot close the last tab!");
    return;
  }
  
  delete files[filename];
  
  const tab = document.querySelector(`[data-file="${filename}"]`);
  if (tab) {
    tab.remove();
  }
  
  if (currentFile === filename) {
    const remainingFiles = Object.keys(files);
    if (remainingFiles.length > 0) {
      switchTab(remainingFiles[0]);
    }
  }
}

function createNewTab() {
  const filename = prompt("Enter filename:", "untitled.js");
  if (filename) {
    if (!filename.match(/^[\w,\s-]+\.[A-Za-z]{2,}$/)) {
      alert("Please enter a valid filename with extension (e.g., script.js, index.html)");
      return;
    }
    
    if (files[filename]) {
      switchTab(filename);
      return;
    }
    
    files[filename] = `// New file: ${filename}\n`;
    
    const tabsContainer = document.getElementById("fileTabs");
    const newTab = document.createElement("div");
    newTab.className = "tab";
    newTab.setAttribute("data-file", filename);
    newTab.onclick = () => switchTab(filename);
    
    newTab.innerHTML = `
      <span>${getFileIcon(filename)}</span>
      <span class="tab-name">${filename}</span>
      <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
    `;
    
    tabsContainer.appendChild(newTab);
    switchTab(filename);
    newTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// Popup Functions
function togglePopup() {
  const popup = document.getElementById("popup");
  const isVisible = popup.style.display === "flex";
  popup.style.display = isVisible ? "none" : "flex";
  
  if (!isVisible) {
    document.getElementById("fileNameInput").focus();
  }
}

function toggleExportPopup() {
  const exportPopup = document.getElementById("exportPopup");
  const isVisible = exportPopup.style.display === "flex";
  exportPopup.style.display = isVisible ? "none" : "flex";
  
  if (!isVisible) {
    const exportFilename = document.getElementById("exportFilename");
    exportFilename.value = currentFile;
    exportFilename.focus();
  }
}

function updateLineNumbers(lineCount) {
  const lineNumbers = document.getElementById("lineNumbers");
  let numbers = "";
  for (let i = 1; i <= lineCount; i++) {
    numbers += i + (i < lineCount ? "\n" : "");
  }
  lineNumbers.textContent = numbers;
  document.getElementById("lineCount").textContent = lineCount;
}

function submitCode() {
  const input = document.getElementById("codeInput").value.trim();
  let filename = document.getElementById("fileNameInput").value.trim();
  
  if (!input) {
    alert("Please enter some code first!");
    return;
  }

  if (!filename) {
    filename = currentFile;
  }
  
  if (!filename.match(/^[\w,\s-]+\.[A-Za-z]{2,}$/)) {
    alert("Please enter a valid filename with extension (e.g., script.js, index.html)");
    return;
  }

  files[filename] = input;
  
  if (!document.querySelector(`[data-file="${filename}"]`)) {
    const tabsContainer = document.getElementById("fileTabs");
    const newTab = document.createElement("div");
    newTab.className = "tab";
    newTab.setAttribute("data-file", filename);
    newTab.onclick = () => switchTab(filename);
    
    newTab.innerHTML = `
      <span>${getFileIcon(filename)}</span>
      <span class="tab-name">${filename}</span>
      <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
    `;
    
    tabsContainer.appendChild(newTab);
  }
  
  switchTab(filename);
  
  const editor = document.getElementById("editor");
  document.getElementById("popup").style.display = "none";
  document.getElementById("codeInput").value = "";
  document.getElementById("fileNameInput").value = "";
  
  editor.textContent = "";
  
  const lines = input.split('\n');
  updateLineNumbers(lines.length);
  
  typeAndHighlight(input, editor);
}

function clearEditor() {
  if (confirm("Are you sure you want to clear the current file?")) {
    const editor = document.getElementById("editor");
    const defaultContent = `// Empty file: ${currentFile}\n`;
    files[currentFile] = defaultContent;
    currentCode = defaultContent;
    editor.textContent = defaultContent;
    updateLineNumbers(2);
    Prism.highlightElement(editor);
    document.getElementById("popup").style.display = "none";
    document.getElementById("codeInput").value = "";
    document.getElementById("fileNameInput").value = "";
  }
}

// Typing Effect with Cursor
function typeAndHighlight(code, container) {
  if (isTypingEffectRunning) {
    clearTimeout(typingTimeout);
    isTypingEffectRunning = false;
  }
  
  // Clear existing cursor if any
  const existingCursor = document.querySelector('.cursor');
  if (existingCursor) existingCursor.remove();
  
  let i = 0;
  let buffer = "";
  const lines = code.split('\n');
  let currentLine = 1;
  const editorWrapper = container.parentElement.parentElement;
  const lineNumbers = document.getElementById("lineNumbers");
  isTypingEffectRunning = true;
  
  // Create blinking cursor
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  container.appendChild(cursor);
  
  function updateCursorPosition() {
    // Create a temporary span to measure position
    const tempSpan = document.createElement('span');
    tempSpan.textContent = buffer;
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre';
    container.appendChild(tempSpan);
    
    // Get position
    const rect = tempSpan.getBoundingClientRect();
    const editorRect = container.getBoundingClientRect();
    
    // Position cursor
    cursor.style.left = `${rect.right - editorRect.left}px`;
    cursor.style.top = `${rect.top - editorRect.top}px`;
    
    // Remove temp span
    container.removeChild(tempSpan);
  }

  function typing() {
    if (i < code.length) {
      const char = code.charAt(i);
      buffer += char;
      
      if (char === '\n') {
        currentLine++;
      }
      
      container.textContent = buffer;
      updateCursorPosition();
      container.appendChild(cursor);
      
      updateLineNumbers(Math.max(currentLine, lines.length));
      Prism.highlightElement(container);
      
      // Auto-scroll to cursor position
      const containerHeight = container.getBoundingClientRect().height;
      const wrapperHeight = editorWrapper.getBoundingClientRect().height;
      
      if (containerHeight > wrapperHeight) {
        const scrollTop = container.scrollHeight - wrapperHeight;
        editorWrapper.scrollTop = scrollTop;
        
        // Sync line numbers scroll
        const lineHeight = 21;
        const visibleLines = Math.floor(wrapperHeight / lineHeight);
        const totalLines = Math.max(currentLine, 1);
        
        if (totalLines > visibleLines) {
          const lineNumberScrollTop = (totalLines - visibleLines) * lineHeight;
          lineNumbers.style.transform = `translateY(-${lineNumberScrollTop}px)`;
        }
      }
      
      i++;
      typingTimeout = setTimeout(typing, Math.random() * 10 + 10);
    } else {
      isTypingEffectRunning = false;
      updateLineNumbers(lines.length);
      files[currentFile] = code;
      currentCode = code;
      
      // Remove cursor when done
      container.removeChild(cursor);
      
      // Final scroll adjustment
      setTimeout(() => {
        editorWrapper.scrollTop = editorWrapper.scrollHeight;
        const lineHeight = 21;
        const wrapperHeight = editorWrapper.getBoundingClientRect().height;
        const visibleLines = Math.floor(wrapperHeight / lineHeight);
        const totalLines = lines.length;
        
        if (totalLines > visibleLines) {
          const lineNumberScrollTop = Math.max(0, (totalLines - visibleLines) * lineHeight);
          lineNumbers.style.transform = `translateY(-${lineNumberScrollTop}px)`;
        } else {
          lineNumbers.style.transform = 'translateY(0px)';
        }
      }, 100);
    }
  }

  typing();
}

// Export Functions
function exportFile(method) {
  const filenameInput = document.getElementById("exportFilename");
  let filename = filenameInput.value.trim();
  
  if (!filename) {
    alert("Please enter a filename!");
    return;
  }
  
  if (!filename.includes('.')) {
    const ext = currentFile.split('.').pop();
    filename += `.${ext}`;
    filenameInput.value = filename;
  }
  
  const content = files[currentFile] || currentCode;
  
  if (method === 'download') {
    downloadFile(filename, content);
  } else if (method === 'copy') {
    copyToClipboard(content);
  }
  
  toggleExportPopup();
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyToClipboard(content) {
  navigator.clipboard.writeText(content)
    .then(() => {
      alert("Code copied to clipboard!");
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      alert("Failed to copy to clipboard. Please try again.");
    });
}

// File Explorer
function showFileExplorer() {
  let fileList = "Files:\n\n";
  for (const file in files) {
    fileList += `📄 ${file}\n`;
  }
  
  const newFile = prompt(`${fileList}\nEnter filename to open or create:`);
  if (newFile) {
    if (files[newFile]) {
      switchTab(newFile);
    } else {
      files[newFile] = `// New file: ${newFile}\n`;
      createNewTabUI(newFile);
      switchTab(newFile);
    }
  }
}

function createNewTabUI(filename) {
  const tabsContainer = document.getElementById("fileTabs");
  const newTab = document.createElement("div");
  newTab.className = "tab";
  newTab.setAttribute("data-file", filename);
  newTab.onclick = () => switchTab(filename);
  
  newTab.innerHTML = `
    <span>${getFileIcon(filename)}</span>
    <span class="tab-name">${filename}</span>
    <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
  `;
  
  tabsContainer.appendChild(newTab);
}

// Initialize Editor
function initializeEditor() {
  const editor = document.getElementById("editor");
  const editorWrapper = document.querySelector(".editor-wrapper");
  const lineNumbers = document.getElementById("lineNumbers");
  
  updateLineNumbers(2);
  Prism.highlightElement(editor);
  
  editorWrapper.addEventListener('scroll', function() {
    const scrollTop = this.scrollTop;
    lineNumbers.style.transform = `translateY(-${scrollTop}px)`;
  });
  
  updateStatusBarLanguage(currentFile);
  
  // Auto-resize textarea
  document.getElementById('codeInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 300) + 'px';
  });
  
  // Auto-suggest filename
  document.getElementById('codeInput').addEventListener('input', function() {
    const code = this.value.toLowerCase();
    const filenameInput = document.getElementById('fileNameInput');
    
    if (!filenameInput.value) {
      if (code.includes('<!doctype html') || code.includes('<html')) {
        filenameInput.placeholder = 'index.html';
      } else if (code.includes('function') || code.includes('const') || code.includes('let')) {
        filenameInput.placeholder = 'script.js';
      } else if (code.includes('body {') || code.includes('color:') || code.includes('margin:')) {
        filenameInput.placeholder = 'style.css';
      } else if (code.includes('def ') || code.includes('import ')) {
        filenameInput.placeholder = 'main.py';
      }
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      togglePopup();
    }
    
    if (e.key === 'Escape') {
      document.getElementById("popup").style.display = "none";
      document.getElementById("exportPopup").style.display = "none";
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createNewTab();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      showFileExplorer();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      toggleExportPopup();
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);
