import { ajax } from "discourse/lib/ajax";
import getURL from "discourse-common/lib/get-url";

export default Ember.Component.extend({
    videoElement: null,
    error: null,
    recording: false,
    recordedChunks: [],

    didInsertElement(){
        this.videoElement = this.element.querySelector("video");
        this.set("recording", false);
    },

    updateFileSize(){
        if(this.recording && this.recorder){
            const blob = this.recorder.getBlob();
            if(blob){
                console.log("UPDATING", blob.size);
            }else{
                console.log("UPDATING blob is null");
            }
            this.timer = Ember.run.later(this, this.updateFileSize, 500);
        }
    },

    dataAvailable(e){
        this.recordedChunks.push(e.data);
    },

    recordStopped(e){
        var blob = new Blob(this.recordedChunks, { 'type' : this.recorder.mimeType });
        this.set("recordedChunks", [])

        this.videoElement.src = this.videoElement.srcObject = null;
        this.set("recordedBlob", blob);
        this.videoElement.src = URL.createObjectURL(this.recordedBlob);
        this.stream.getTracks().forEach( track => track.stop() );
        this.set("recorder", null);
        this.set("recording", false);
    },

    actions:{
        start(){
            this.set("recording", true);
            this.set("recordedChunks", []);
            navigator.mediaDevices.getDisplayMedia({video: true}).then((stream) => {
                this.set("stream", stream);
                this.videoElement.srcObject = stream;
                this.set("recorder", new MediaRecorder(stream, {mimeType: "video/webm;codecs=vp8"}));
                this.recorder.ondataavailable = (e) => this.dataAvailable(e);
                this.recorder.onstop = (e) => this.recordStopped(e);
                this.recorder.start();
            });
        },

        stop(){
            this.recorder.stop();
        },
        upload(){
            const data = new FormData();
            data.append('authenticity_token', Discourse.Session.currentProp("csrfToken"))
            data.append('files[]', this.recordedBlob, "screen.webm");
            data.append('type', "composer");

            fetch(getURL("/uploads.json"), {
                method: 'POST',
                body: data
            }).then(response => response.json()).then(upload=> {
                const url = window.location.origin + upload.short_url.replace("upload://", getURL('/uploads/short-url/'));
                this.appEvents.trigger(
                    "composer:insert-text",
                    `\n${url}\n`
                  );
                  this.sendAction("closeModal");
            });
        }
    }
});
