
    // COMPLETELY REWRITTEN SYNCHRONIZED SOLUTION
    
    // Configuration
    const CONFIG = {
        LINE_HEIGHT: 21, // Must match CSS --line-height
        TYPING_SPEED: 50, // Slower for better sync
        DEFAULT_CONTENT: "// Welcome to VSCode Mobile!\n// Press Ctrl+K to add your code"
    };

    // Global state
    let editorState = {
        currentFile: "main.js",
        files: { "main.js": CONFIG.DEFAULT_CONTENT },
        isTyping: false,
        typingTimeout: null
    };

    // CRITICAL: Get elements with caching
    const elements = {
        editor: document.getElementById('editor'),
        lineNumbers: document.getElementById('lineNumbers'),
        editorWrapper: document.querySelector('.editor-wrapper'),
        editorContainer: null, // Will be set in init
        popup: document.getElementById('popup'),
        codeInput: document.getElementById('codeInput'),
        fileNameInput: document.getElementById('fileNameInput')
    };

    // CRITICAL: Synchronized line number update
    function updateLineNumbers(lineCountOrContent) {
        let lineCount;
        
        if (typeof lineCountOrContent === 'string') {
            // If content string is passed
            lineCount = lineCountOrContent.split('\n').length;
        } else {
            // If line count number is passed
            lineCount = lineCountOrContent;
        }
        
        // Create line numbers string
        let numberString = '';
        for (let i = 1; i <= lineCount; i++) {
            numberString += i + (i < lineCount ? '\n' : '');
        }
        
        elements.lineNumbers.textContent = numberString;
        document.getElementById('lineCount').textContent = lineCount;
        
        return lineCount;
    }

    // CRITICAL: Synchronized scroll function
    function syncScroll() {
        const editorContainer = document.querySelector('.editor-container');
        const scrollTop = editorContainer.scrollTop;
        
        // Direct pixel-perfect synchronization
        elements.lineNumbers.style.top = `${-scrollTop}px`;
    }

    // CRITICAL: Enhanced typing effect with perfect sync and auto-scroll
    function typeAndHighlight(code, callback) {
        if (editorState.isTyping) {
            clearTimeout(editorState.typingTimeout);
        }
        
        editorState.isTyping = true;
        elements.editor.textContent = '';
        
        let i = 0;
        const totalLength = code.length;
        const lines = code.split('\n');
        let currentLineCount = 1;
        
        function typeNextChar() {
            if (i < totalLength) {
                const currentContent = code.substring(0, i + 1);
                
                // Count current lines for real-time line numbers
                currentLineCount = currentContent.split('\n').length;
                
                elements.editor.textContent = currentContent;
                
                // Add blinking cursor
                const cursor = document.createElement('span');
                cursor.className = 'cursor';
                cursor.textContent = '|';
                elements.editor.appendChild(cursor);
                
                // CRITICAL: Update line numbers in real-time
                updateLineNumbers(currentLineCount);
                
                // CRITICAL: Smart auto-scroll management
                const editorContainer = document.querySelector('.editor-container');
                const containerHeight = editorContainer.clientHeight;
                const contentHeight = editorContainer.scrollHeight;
                const currentScroll = editorContainer.scrollTop;
                
                // Calculate if we need to scroll
                const lineHeight = CONFIG.LINE_HEIGHT;
                const visibleLines = Math.floor(containerHeight / lineHeight);
                
                if (currentLineCount > visibleLines) {
                    // Auto-scroll to keep cursor visible
                    const targetScrollTop = (currentLineCount - visibleLines + 2) * lineHeight;
                    editorContainer.scrollTop = Math.max(0, targetScrollTop);
                    syncScroll();
                }
                
                i++;
                editorState.typingTimeout = setTimeout(typeNextChar, CONFIG.TYPING_SPEED);
            } else {
                // Typing complete
                elements.editor.textContent = code;
                updateLineNumbers(lines.length);
                editorState.isTyping = false;
                
                // Final scroll to bottom if content exceeds container
                setTimeout(() => {
                    const editorContainer = document.querySelector('.editor-container');
                    if (editorContainer.scrollHeight > editorContainer.clientHeight) {
                        editorContainer.scrollTop = editorContainer.scrollHeight - editorContainer.clientHeight;
                        syncScroll();
                    }
                    if (callback) callback();
                }, 100);
            }
        }
        
        typeNextChar();
    }

    // File management functions
    function switchTab(filename) {
        if (editorState.isTyping) {
            clearTimeout(editorState.typingTimeout);
            editorState.isTyping = false;
        }
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-file="${filename}"]`)?.classList.add('active');
        
        editorState.currentFile = filename;
        document.getElementById('filenameDisplay').textContent = filename;
        
        const content = editorState.files[filename] || '';
        elements.editor.textContent = content;
        updateLineNumbers(content);
        
        // Reset scroll and sync line numbers
        const editorContainer = document.querySelector('.editor-container');
        editorContainer.scrollTop = 0;
        elements.lineNumbers.style.top = '0px';
    }

    function createNewTab() {
        const filename = prompt("Enter filename:", "untitled.js");
        if (!filename) return;
        
        if (editorState.files[filename]) {
            switchTab(filename);
            return;
        }
        
        editorState.files[filename] = `// New file: ${filename}\n`;
        
        // Create tab element
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-file', filename);
        tab.onclick = () => switchTab(filename);
        tab.innerHTML = `
            <span>📄</span>
            <span class="tab-name">${filename}</span>
            <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
        `;
        
        document.getElementById('fileTabs').appendChild(tab);
        switchTab(filename);
    }

    function closeTab(event, filename) {
        event.stopPropagation();
        
        if (Object.keys(editorState.files).length === 1) {
            alert("Cannot close the last tab!");
            return;
        }
        
        delete editorState.files[filename];
        document.querySelector(`[data-file="${filename}"]`)?.remove();
        
        if (editorState.currentFile === filename) {
            const remainingFiles = Object.keys(editorState.files);
            if (remainingFiles.length > 0) {
                switchTab(remainingFiles[0]);
            }
        }
    }

    function submitCode() {
        const code = elements.codeInput.value.trim();
        let filename = elements.fileNameInput.value.trim() || editorState.currentFile;
        
        if (!code) {
            alert("Please enter some code!");
            return;
        }
        
        // Store the code
        editorState.files[filename] = code;
        
        // Create tab if needed
        if (!document.querySelector(`[data-file="${filename}"]`)) {
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.setAttribute('data-file', filename);
            tab.onclick = () => switchTab(filename);
            tab.innerHTML = `
                <span>📄</span>
                <span class="tab-name">${filename}</span>
                <span class="close-btn" onclick="closeTab(event, '${filename}')">×</span>
            `;
            document.getElementById('fileTabs').appendChild(tab);
        }
        
        switchTab(filename);
        togglePopup();
        
        // Clear inputs
        elements.codeInput.value = '';
        elements.fileNameInput.value = '';
        
        // Start typing animation
        typeAndHighlight(code);
    }

    function clearEditor() {
        if (confirm("Clear the current file?")) {
            const defaultContent = `// Empty file: ${editorState.currentFile}\n`;
            editorState.files[editorState.currentFile] = defaultContent;
            elements.editor.textContent = defaultContent;
            updateLineNumbers(defaultContent);
            togglePopup();
        }
    }

    function togglePopup() {
        const isVisible = elements.popup.style.display === 'flex';
        elements.popup.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            elements.fileNameInput.focus();
        }
    }

    function toggleExportPopup() {
        const exportPopup = document.getElementById('exportPopup');
        const isVisible = exportPopup.style.display === 'flex';
        exportPopup.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible) {
            document.getElementById('exportFilename').value = editorState.currentFile;
            document.getElementById('exportFilename').focus();
        }
    }

    function exportFile(method) {
        const filename = document.getElementById('exportFilename').value.trim();
        const content = editorState.files[editorState.currentFile];
        
        if (!filename) {
            alert("Please enter a filename!");
            return;
        }
        
        if (method === 'download') {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } else if (method === 'copy') {
            navigator.clipboard.writeText(content).then(() => {
                alert("Code copied to clipboard!");
            });
        }
        
        toggleExportPopup();
    }

    function showFileExplorer() {
        const files = Object.keys(editorState.files).map(f => `📄 ${f}`).join('\n');
        const newFile = prompt(`Files:\n\n${files}\n\nEnter filename to open/create:`);
        
        if (newFile) {
            if (editorState.files[newFile]) {
                switchTab(newFile);
            } else {
                createNewTab();
            }
        }
    }

    // CRITICAL: Setup scroll synchronization with immediate response
    function setupScrollSync() {
        const editorContainer = document.querySelector('.editor-container');
        elements.editorContainer = editorContainer;
        
        // Use direct event listener for immediate response
        editorContainer.addEventListener('scroll', function() {
            syncScroll();
        }, { passive: true });
        
        // Also sync on any content changes
        const observer = new MutationObserver(function() {
            syncScroll();
        });
        
        observer.observe(elements.editor, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            togglePopup();
        }
        if (e.key === 'Escape') {
            elements.popup.style.display = 'none';
            document.getElementById('exportPopup').style.display = 'none';
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            toggleExportPopup();
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        setupScrollSync();
        updateLineNumbers(CONFIG.DEFAULT_CONTENT);
        
        // Auto-resize textarea
        elements.codeInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 300) + 'px';
        });
    });
