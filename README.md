# Intercom Enhancer

A Chrome extension that lets you record and send voice messages to customers straight from the Intercom Help Desk.

I built this extension to solve a problem the support agents at Amplifique.me, the company I work for, were facing. They needed a way to reply with voice messages to customers who often reach out that way. Brazilians love voice messages because of WhatsApp, and Intercom still doesn't support them. The extension has been working very well.

*__Update:__ We no longer use Intercom at Amplifique.me, so I'm not sure the extension still works. It injects a button based on specific DOM elements, and those can change at any time. For the same reason, I can't tell whether Intercom has shipped native voice messages in the meantime, which would make the extension unnecessary.*

## Installation

There is no store listing, so it runs as an unpacked extension:

1. Clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Reload Intercom. A microphone button shows up in the composer toolbar.

The first recording asks for microphone permission on `app.intercom.com`.

## How It Works

Intercom has no public API for attaching a file to the composer, so the extension works entirely through the page itself. Everything runs in a single content script, with no background worker and no network requests.

**Recording:** Clicking the injected button starts a `MediaRecorder` on the microphone stream and shows a small elapsed time balloon anchored to the button.

**Encoding:** Chrome records WebM/Opus, which Intercom does not preview as audio. On stop, the blob is decoded through an `AudioContext` and re-encoded to MP3 in the browser with [lamejs](https://github.com/zhuker/lamejs).

**Attaching:** This is the part that makes it work without an API. The MP3 is wrapped in a `File`, put into a `DataTransfer`, and a sequence of synthetic `dragstart`, `dragenter`, `dragover` and `drop` events is dispatched on the composer element. As far as Intercom is concerned, the agent dropped a file into the conversation, and its normal upload flow takes over.

**Playback:** Intercom renders MP3 attachments as plain download links, so the extension also scans the composer for `.mp3` attachments and appends a native `<audio>` player next to each one.

## Credits and License

The extension code is released under the [MIT license](LICENSE).

It bundles [lamejs](https://github.com/zhuker/lamejs) in `vendor/lame.min.js` to do the MP3 encoding. That file is vendored as a pre built bundle with the version stripped by minification, and lamejs is distributed under the LGPL, so it keeps its own license terms.
