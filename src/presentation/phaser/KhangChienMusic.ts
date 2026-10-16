/** Media playback is a Presentation concern; the director receives a combat cue. */
export class KhangChienMusic {
  private audio=new Audio('/assets/audio/khang-chien/map-1-am-vang-trong-sam.mp3');
  private started=false;private resuming=false;
  private continuation=false;
  private visibility=()=>{if(document.hidden)this.audio.pause();};
  constructor(){this.audio.preload='auto';this.audio.volume=.7;document.addEventListener('visibilitychange',this.visibility);}
  async start(offset=0){this.continuation=false;this.audio.src='/assets/audio/khang-chien/map-1-am-vang-trong-sam.mp3';this.audio.loop=false;this.audio.currentTime=offset;await this.audio.play();this.started=true;}
  get readyForCombat(){return this.started && !this.audio.paused && this.audio.currentTime>=24;}
  get remaining(){return Math.max(0,24-this.audio.currentTime);}
  get playbackTime(){return this.audio.currentTime;}
  sync(paused:boolean,mapIndex=1){
    if(!this.started)return;
    if(paused){this.audio.pause();return;}
    if(!this.continuation && (mapIndex>1 || this.audio.ended)){
      this.continuation=true;
      this.audio.src='/assets/audio/khang-chien/trong-tran-troi-nam.mp3';
      this.audio.loop=true;this.audio.currentTime=0;this.audio.load();
    }
    if(this.audio.paused && !this.audio.ended && !this.resuming){
      this.resuming=true;void this.audio.play().catch(()=>{}).finally(()=>{this.resuming=false;});
    }
  }
  destroy(){document.removeEventListener('visibilitychange',this.visibility);this.started=false;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}
}
