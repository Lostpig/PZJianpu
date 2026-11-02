declare module 'webaudio-instruments' {
  export default class Player {
    public setQuality(q: number): void
    public getCurrentTime(): number
    /**
     * 
     * @param inst instrument: 24 is "Acoustic Guitar (nylon)"
     * @param note note: midi number or frequency in Hz (if > 127)
     * @param vel velocity: 0..1
     * @param delay delay in seconds
     * @param duration duration in seconds
     * @param channel (optional - specify channel for tinysynth to use)
     * @param attack (optional - override envelope "attack" parameter)
     */
    public play(inst: number, note: number, vel: number, delay: number, duration: number, channel?: number, attack?: number)
  }
}