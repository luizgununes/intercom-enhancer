(function () {
  let isRecording = false;
  let mediaRecorder;
  let startTime;
  let elapsedInterval;
  let microphoneButton;

  setInterval(() => {
    ensureButtonIsInjected();
    injectAudioPlayers();
  }, 1000);

  function ensureButtonIsInjected() {
    const overlayOpeners = document.querySelectorAll(
      ".inbox2__composer__container .overlay__opener",
    );

    const anchorButton = Array.from(overlayOpeners).find((element) =>
      element.querySelector("button.inbox2__button"),
    );

    if (!anchorButton || document.querySelector("#amp-microphone")) return;

    const toolbar = anchorButton.parentElement;
    toolbar.style.display = "flex";
    microphoneButton = createMicrophoneButton();
    toolbar.insertBefore(microphoneButton, anchorButton);

    microphoneButton.addEventListener("click", handleButtonClick);
  }

  function createMicrophoneButton() {
    const button = document.createElement("button");
    button.id = "amp-microphone";
    button.className = `
      transition-colors duration-100 cursor-pointer font-semibold flex flex-row items-center gap-1 text-sm rounded-xl focus:outline-none whitespace-nowrap
      inbox2__button w-8 h-8 p-2 bg-transparent text-black dark:text-dm-white
      hover:text-blue dark:hover:text-dm-blue active:text-blue dark:active:text-dm-blue
      focus:text-blue focus:ring-2 focus:ring-color-blue/30 dark:focus:text-dm-blue dark:ring-color-dm-blue/30
    `;
    button.innerHTML = getMicIcon();
    return button;
  }

  function getMicIcon() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-mic-fill" viewBox="0 0 16 16">
        <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z"/>
        <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/>
      </svg>
    `;
  }

  function getStopIcon() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16">
        <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5"/>
      </svg>
    `;
  }

  function setButtonIcon(icon) {
    const button = document.getElementById("amp-microphone");
    if (button) {
      microphoneButton = button;
    }
    if (microphoneButton) {
      microphoneButton.innerHTML = icon;
    }
  }

  function handleButtonClick() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function createElapsedTimeBalloon() {
    const balloon = document.createElement("div");
    balloon.id = "amp-elapsed-time";
    balloon.textContent = "0.0s";
    Object.assign(balloon.style, {
      position: "absolute",
      padding: "5px 10px",
      backgroundColor: "#000",
      color: "#fff",
      borderRadius: "5px",
      zIndex: "9999",
    });
    document.body.appendChild(balloon);

    const button = document.getElementById("amp-microphone");
    if (button) {
      const rect = button.getBoundingClientRect();
      balloon.style.left = `${rect.left + window.scrollX}px`;
      balloon.style.top = `${
        rect.top + window.scrollY - balloon.offsetHeight - 10
      }px`;
    }
  }

  function updateElapsedTime() {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const balloon = document.getElementById("amp-elapsed-time");
    if (balloon) {
      balloon.textContent = `${elapsedTime}s`;
    }
  }

  async function startRecording() {
    let stream;

    try {
      isRecording = true;

      setButtonIcon(getStopIcon());

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      createElapsedTimeBalloon();

      startTime = Date.now();
      elapsedInterval = setInterval(updateElapsedTime, 100);

      mediaRecorder.ondataavailable = async function (event) {
        const mp3Blob = await convertBlobToMP3(event.data);
        dropFileIntoComposer(mp3Blob, `${getAgentName()}.mp3`);
      };

      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("Error accessing microphone:", error);
      isRecording = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setButtonIcon(getMicIcon());
    }
  }

  function stopRecording() {
    isRecording = false;
    clearInterval(elapsedInterval);
    const balloon = document.getElementById("amp-elapsed-time");
    if (balloon) {
      balloon.remove();
    }
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setButtonIcon(getMicIcon());
  }

  async function convertBlobToMP3(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return new Blob(encodeAudioBuffer(audioBuffer), { type: "audio/mpeg" });
    } finally {
      await audioContext.close();
    }
  }

  function dropFileIntoComposer(mp3Blob, fileName) {
    const file = new File([mp3Blob], fileName, {
      type: "audio/mpeg",
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const composer = document.querySelector(".embercom-prosemirror-composer");

    if (!composer) {
      console.error("Composer not found, the recording was not attached.");
      return;
    }

    ["dragstart", "dragenter", "dragover", "drop"].forEach((eventType) => {
      const dragEvent = new DragEvent(eventType, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer,
      });
      composer.dispatchEvent(dragEvent);
    });
  }

  function injectAudioPlayers() {
    const attachmentLinks = document.querySelectorAll(
      ".embercom-prosemirror-composer-attachment a",
    );

    attachmentLinks.forEach((link) => {
      const attachment = link.parentElement.parentElement.parentElement;

      if (link.href.includes(".mp3") && !attachment.querySelector("audio")) {
        attachment.appendChild(createAudioPlayer(link.href));
        attachment.style.flexDirection = "column";
      }
    });
  }

  function createAudioPlayer(url) {
    const audio = document.createElement("audio");
    audio.style.marginTop = "16px";
    audio.src = url;
    audio.controls = true;
    return audio;
  }

  function encodeAudioBuffer(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);

    const channelData = audioBuffer.getChannelData(0);
    const mp3Data = [];
    const samplesPerFrame = 1152;

    for (let i = 0; i < audioBuffer.length; i += samplesPerFrame) {
      const sampleChunk = channelData.subarray(i, i + samplesPerFrame);

      const pcmSamples = new Int16Array(sampleChunk.length * channels);
      for (let k = 0; k < sampleChunk.length; k++) {
        pcmSamples[k] = Math.max(
          -32768,
          Math.min(32767, sampleChunk[k] * 32768),
        );
      }

      const mp3Buffer = mp3Encoder.encodeBuffer(pcmSamples);
      if (mp3Buffer.length > 0) mp3Data.push(mp3Buffer);
    }

    const mp3EndBuffer = mp3Encoder.flush();
    if (mp3EndBuffer.length > 0) mp3Data.push(mp3EndBuffer);

    return mp3Data;
  }

  function getAgentName() {
    try {
      const keys = Object.keys(localStorage);
      const userKey = keys.find((key) =>
        key.includes("EMBER_MODEL_DATA_CACHE::admin::"),
      );
      return JSON.parse(localStorage[userKey]).data.name || "audio";
    } catch (error) {
      console.error("Could not read the current user name:", error);
      return "audio";
    }
  }
})();
