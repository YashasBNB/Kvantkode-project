/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const hasPerformanceNow = globalThis.performance && typeof globalThis.performance.now === 'function';
export class StopWatch {
    static create(highResolution) {
        return new StopWatch(highResolution);
    }
    constructor(highResolution) {
        this._now =
            hasPerformanceNow && highResolution === false
                ? Date.now
                : globalThis.performance.now.bind(globalThis.performance);
        this._startTime = this._now();
        this._stopTime = -1;
    }
    stop() {
        this._stopTime = this._now();
    }
    reset() {
        this._startTime = this._now();
        this._stopTime = -1;
    }
    elapsed() {
        if (this._stopTime !== -1) {
            return this._stopTime - this._startTime;
        }
        return this._now() - this._startTime;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcHdhdGNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc3RvcHdhdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLFdBQVcsSUFBSSxPQUFPLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQTtBQUVwRyxNQUFNLE9BQU8sU0FBUztJQU1kLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBd0I7UUFDNUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsWUFBWSxjQUF3QjtRQUNuQyxJQUFJLENBQUMsSUFBSTtZQUNSLGlCQUFpQixJQUFJLGNBQWMsS0FBSyxLQUFLO2dCQUM1QyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUc7Z0JBQ1YsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNwQixDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNwQixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ3hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3JDLENBQUM7Q0FDRCJ9