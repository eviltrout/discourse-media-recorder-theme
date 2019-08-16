import RecordRTC from "vendor/record-rtc";
import {ajax} from "discourse/lib/ajax";

export default Ember.Component.extend({
    videoElement: null,
    error: null,
    recording: false,

    didInsertElement(){
        if(!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
            this.error = 'Your browser does NOT support the getDisplayMedia API.';
            return;
        }

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

    actions:{
        start(){
            this.set("recording", true);
            navigator.mediaDevices.getDisplayMedia({video: true}).then((stream) => {
                this.set("stream", stream);
                this.videoElement.srcObject = stream;
                this.set("recorder", new RecordRTC(stream, {
                    type: 'video',
                }));
                this.recorder.startRecording();
                this.timer = Ember.run.later(this, this.updateFileSize, 500);
            });
        },
        stop(){
            this.recorder.stopRecording(() => {
                console.log(this.recorder.toURL())
                this.videoElement.src = this.videoElement.srcObject = null;
                this.set("recordedBlob", this.recorder.getBlob());
                this.videoElement.src = URL.createObjectURL(this.recordedBlob);
                this.stream.stop();
                this.recorder.destroy();
                this.set("recorder", null);
                this.set("recording", false);
                if(this.timer){
                    Ember.run.cancel(timer);
                }
            });   
        },
        upload(){
            const data = new FormData();
            data.append('authenticity_token', Discourse.Session.currentProp("csrfToken"))
            data.append('files[]', this.recordedBlob, "screen.webm");
            data.append('type', "composer");

            fetch(Discourse.getURL("/uploads.json"), {
                method: 'POST',
                body: data
            }).then(response => response.json()).then(upload=> {
                const url = window.location.origin + upload.short_url.replace("upload://", Discourse.getURL('/uploads/short-url/'));
                this.appEvents.trigger(
                    "composer:insert-text",
                    `\n${url}\n`
                  );
                  this.sendAction("closeModal");
            });
        }
    }
});