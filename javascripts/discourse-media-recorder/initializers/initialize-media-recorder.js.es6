import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";

export default {
  name: "media-recorder",
  initialize(){
    withPluginApi("0.8.7", api => {
        if(! (window.hasOwnProperty("MediaRecorder") && navigator.mediaDevices.getDisplayMedia)) return;
        api.onToolbarCreate(toolbar => {
            toolbar.addButton({
                id: 'record-media',
                group: 'extras',
                icon: 'video',
                title: 'open_record_media.title',
                perform: () => showModal("media-recorder-modal")
            });
        });
    });
  }
}