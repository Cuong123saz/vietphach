/** Buffers the first key only when an ultimate can be selected. No resource mutation. */
export class WaterSkillInput {
  private pending?:{key:'q'|'e';at:number};
  private ordinary:(key:'q'|'e')=>void;private combo:()=>void;private windowSeconds:number;
  constructor(ordinary:(key:'q'|'e')=>void,combo:()=>void,windowSeconds:number){this.ordinary=ordinary;this.combo=combo;this.windowSeconds=windowSeconds;}
  press(key:'q'|'e',now:number,eligible:boolean):void {
    this.flush(now);
    if(this.pending && this.pending.key!==key && eligible){this.pending=undefined;this.combo();return;}
    if(this.pending && !eligible){const pending=this.pending.key;this.pending=undefined;this.ordinary(pending);this.ordinary(key);return;}
    if(this.pending)return;
    if(eligible)this.pending={key,at:now};else this.ordinary(key);
  }
  flush(now:number):void {
    if(this.pending && now+1e-9>=this.pending.at+this.windowSeconds){const key=this.pending.key;this.pending=undefined;this.ordinary(key);}
  }
  clear():void{this.pending=undefined;}
  /** A click confirms the pending ordinary key before the combo window expires. */
  resolvePending():void{if(this.pending){const key=this.pending.key;this.pending=undefined;this.ordinary(key);}}
}
