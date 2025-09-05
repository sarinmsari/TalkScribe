const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const transcriptTextarea = document.getElementById('transcript');

let recognition;

if (!('webkitSpeechRecognition' in window)) {
  alert('Your browser does not support Speech Recognition. Please use Chrome.');
} else {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    transcriptTextarea.value = finalTranscript + interimTranscript;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
  };
}

startBtn.addEventListener('click', () => {
  recognition.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener('click', () => {
  recognition.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
