let speechRecognition = null;
let shouldRestart = true;
let lastResponseTime = Date.now();

// Create a stop button
const stopBtn = document.createElement('button');
stopBtn.className = 'stop-recording-button';
stopBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" style="margin-right:8px;" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12ZM8.25 9.5625C8.25 8.83763 8.83763 8.25 9.5625 8.25H14.4375C15.1624 8.25 15.75 8.83763 15.75 9.5625V14.4375C15.75 15.1624 15.1624 15.75 14.4375 15.75H9.5625C8.83763 15.75 8.25 15.1624 8.25 14.4375V9.5625Z" fill="#ffffff"/>
    </svg>
    Stop Dictation
`;

// create a live transcript div
const liveTranscriptDiv = document.createElement('div');
liveTranscriptDiv.className = 'live-transcript';

// Create a container for the button and live transcript
let dictationContainer = document.createElement('div');
dictationContainer.className = 'dictation-container';
dictationContainer.appendChild(stopBtn);
dictationContainer.appendChild(liveTranscriptDiv);


const endDictation = () => {
    shouldRestart = false;

    if (dictationContainer.parentNode) {
        dictationContainer.parentNode.removeChild(dictationContainer);
    }
    
    speechRecognition?.stop();

    // Trigger context menu title change
    chrome.runtime.sendMessage({
        action: "updateContextMenu",
        newTitle: "Start Dictation"
    });
};

stopBtn.addEventListener('click', () => {
    if (speechRecognition) {
        endDictation();
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Start dictation
    if (msg.action === "startDictation") {

        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech Recognition not supported');
            return;
        }

        document.body.appendChild(dictationContainer);

        speechRecognition = new webkitSpeechRecognition() || new SpeechRecognition();
        speechRecognition.lang = navigator.language || 'en-US';
        speechRecognition.interimResults = true;
        speechRecognition.continuous = true;
        //let lastInterimTranscript = '';
        speechRecognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            /* const delta = interimTranscript.slice(lastInterimTranscript.length);

            if (delta) {
                simulateTyping(delta);
            }
            lastInterimTranscript = interimTranscript;*/

            if(interimTranscript.length){
                liveTranscriptDiv.style.display = 'block';
                liveTranscriptDiv.textContent = interimTranscript;
                lastResponseTime = Date.now();
            }

            if (finalTranscript) {
                simulateTyping(finalTranscript);
                liveTranscriptDiv.textContent = '';
                liveTranscriptDiv.style.display = 'none';
            }
        }

        speechRecognition.onend = () => {
            const now = Date.now();
            // If no response for 30 seconds or end triggered, assume user stopped speaking and end dictation
            if (now - lastResponseTime > 30000 || !shouldRestart) {
                endDictation();
                return;
            }

            // Auto-restart to avoid unexpected stops
            speechRecognition.start();
        }
        
        speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            // Optionally stop speechRecognition on critical errors
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                endDictation();
            }
        };

        speechRecognition.start(); 
        // Trigger context menu title change
        chrome.runtime.sendMessage({
            action: "updateContextMenu",
            newTitle: "Stop Dictation"
        });
    }

    // Stop dictation
    if (msg.action === "stopDictation") {
        endDictation();
    }
});

function simulateTyping(text) {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    let existingText = '';
    if (activeElement.isContentEditable) {
        existingText = activeElement.innerText || '';
    } else if ('value' in activeElement) {
        existingText = activeElement.value || '';
    }

    // Add space if last character is not space
    const lastChar = existingText.slice(-1);
    let textToType = text;
    if (lastChar && lastChar !== ' ' && text[0] !== ' ') {
        textToType = ' ' + text;
    }

    // Focused element should be an input, textarea, contenteditable or similar
    if (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        // Insert each character as keyboard events
        for (const char of textToType) {
            const keyCode = char.charCodeAt(0);
            const eventOptions = { key: char, char, keyCode, which: keyCode, bubbles: true };

            activeElement.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
            activeElement.dispatchEvent(new KeyboardEvent('keypress', eventOptions));

            if (activeElement.isContentEditable) {
                // Insert text node for contenteditable
                document.execCommand('insertText', false, char);
            } else {
                // Insert into input/textarea value and update cursor position
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                const value = activeElement.value;

                activeElement.value = value.slice(0, start) + char + value.slice(end);
                activeElement.selectionStart = activeElement.selectionEnd = start + 1;
            }

            activeElement.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
        }
    } 
}
