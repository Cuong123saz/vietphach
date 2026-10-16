import type { KieuNgaoStage } from '../../run/KieuNgaoStage';

/** Small local synthesized soundscape; gameplay and story never depend on audio being available. */
export class KieuNgaoAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private water?: GainNode;
  private ambience?: AudioBufferSourceNode;
  private nodes: AudioNode[] = [];
  private enabled = true;
  private key = '';
  private nextHorn = 0;
  async start() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const ctx = new AudioContext(); this.ctx = ctx; this.master = ctx.createGain(); this.master.gain.value = .4; this.master.connect(ctx.destination);
        const source = ctx.createBufferSource(), buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = buffer.getChannelData(0);
        let smooth = 0; for (let i = 0; i < data.length; i++) { smooth = smooth * .96 + (Math.random() * 2 - 1) * .04; data[i] = smooth; }
        source.buffer = buffer; source.loop = true;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
        this.water = ctx.createGain(); this.water.gain.value = .035; source.connect(filter); filter.connect(this.water); this.water.connect(this.master); source.start(); this.ambience = source;
      }
      await this.ctx.resume();
    } catch { /* A blocked audio gesture still leaves the full stage playable. */ }
  }
  toggle() { this.enabled = !this.enabled; if (this.master) this.master.gain.value = this.enabled ? .4 : 0; if (this.enabled) void this.start(); return this.enabled; }
  private tone(frequency: number, duration: number, gain: number, pan: number, bell = false) {
    const ctx = this.ctx; if (!ctx || !this.master || !this.enabled) return;
    const osc = ctx.createOscillator(), amp = ctx.createGain(), stereo = ctx.createStereoPanner(), filter = ctx.createBiquadFilter();
    const now = ctx.currentTime; osc.type = bell ? 'sine' : 'sawtooth'; osc.frequency.value = frequency; stereo.pan.value = pan;
    filter.type = 'lowpass'; filter.frequency.value = bell ? 2500 : 600;
    amp.gain.setValueAtTime(.0001, now); amp.gain.exponentialRampToValueAtTime(gain, now + .09); amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(filter); filter.connect(amp); amp.connect(stereo); stereo.connect(this.master); osc.start(); osc.stop(now + duration);
    this.nodes.push(osc, amp, stereo, filter); osc.onended = () => { for (const n of [osc, amp, stereo, filter]) { n.disconnect(); this.nodes = this.nodes.filter(x => x !== n); } };
  }
  update(s: KieuNgaoStage, paused: boolean) {
    if (!this.ctx) return;
    if (paused) { if (this.ctx.state === 'running') void this.ctx.suspend(); return; }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const key = `${s.phase}:${s.mapIndex}`;
    if (this.water) this.water.gain.value = s.phase === 'ending' ? 0 : s.phase === 'return' ? .015 : s.mapIndex === 1 ? .14 : .035;
    if (key !== this.key) {
      this.key = key;
      if (s.phase === 'ending') { this.tone(620, 2.8, .16, -.75, true); this.tone(1240, 1.7, .045, -.75, true); }
      else if (s.phase === 'combat' && s.mapIndex > 0) { this.tone(145, 2, .09, .8); this.nextHorn = s.run.time + 16; }
      else if (s.phase === 'return') this.nextHorn = s.run.time + 1;
    }
    if (s.phase === 'return' && s.run.time >= this.nextHorn) { this.tone(135, 2.2, .08, -.8); this.nextHorn = s.run.time + 14; }
  }
  destroy() { try { this.ambience?.stop(); } catch {} for (const n of this.nodes) n.disconnect(); this.nodes = []; void this.ctx?.close(); }
}
