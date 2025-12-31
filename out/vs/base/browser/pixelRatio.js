/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindowId, onDidUnregisterWindow } from './dom.js';
import { Emitter, Event } from '../common/event.js';
import { Disposable, markAsSingleton } from '../common/lifecycle.js';
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes
 */
class DevicePixelRatioMonitor extends Disposable {
    constructor(targetWindow) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._listener = () => this._handleChange(targetWindow, true);
        this._mediaQueryList = null;
        this._handleChange(targetWindow, false);
    }
    _handleChange(targetWindow, fireEvent) {
        this._mediaQueryList?.removeEventListener('change', this._listener);
        this._mediaQueryList = targetWindow.matchMedia(`(resolution: ${targetWindow.devicePixelRatio}dppx)`);
        this._mediaQueryList.addEventListener('change', this._listener);
        if (fireEvent) {
            this._onDidChange.fire();
        }
    }
}
class PixelRatioMonitorImpl extends Disposable {
    get value() {
        return this._value;
    }
    constructor(targetWindow) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._value = this._getPixelRatio(targetWindow);
        const dprMonitor = this._register(new DevicePixelRatioMonitor(targetWindow));
        this._register(dprMonitor.onDidChange(() => {
            this._value = this._getPixelRatio(targetWindow);
            this._onDidChange.fire(this._value);
        }));
    }
    _getPixelRatio(targetWindow) {
        const ctx = document.createElement('canvas').getContext('2d');
        const dpr = targetWindow.devicePixelRatio || 1;
        const bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio ||
            1;
        return dpr / bsr;
    }
}
class PixelRatioMonitorFacade {
    constructor() {
        this.mapWindowIdToPixelRatioMonitor = new Map();
    }
    _getOrCreatePixelRatioMonitor(targetWindow) {
        const targetWindowId = getWindowId(targetWindow);
        let pixelRatioMonitor = this.mapWindowIdToPixelRatioMonitor.get(targetWindowId);
        if (!pixelRatioMonitor) {
            pixelRatioMonitor = markAsSingleton(new PixelRatioMonitorImpl(targetWindow));
            this.mapWindowIdToPixelRatioMonitor.set(targetWindowId, pixelRatioMonitor);
            markAsSingleton(Event.once(onDidUnregisterWindow)(({ vscodeWindowId }) => {
                if (vscodeWindowId === targetWindowId) {
                    pixelRatioMonitor?.dispose();
                    this.mapWindowIdToPixelRatioMonitor.delete(targetWindowId);
                }
            }));
        }
        return pixelRatioMonitor;
    }
    getInstance(targetWindow) {
        return this._getOrCreatePixelRatioMonitor(targetWindow);
    }
}
/**
 * Returns the pixel ratio.
 *
 * This is useful for rendering <canvas> elements at native screen resolution or for being used as
 * a cache key when storing font measurements. Fonts might render differently depending on resolution
 * and any measurements need to be discarded for example when a window is moved from a monitor to another.
 */
export const PixelRatio = new PixelRatioMonitorFacade();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGl4ZWxSYXRpby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9waXhlbFJhdGlvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBFOztHQUVHO0FBQ0gsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTy9DLFlBQVksWUFBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUE7UUFQUyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFRN0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUMzQixJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQW9CLEVBQUUsU0FBa0I7UUFDN0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRW5FLElBQUksQ0FBQyxlQUFlLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FDN0MsZ0JBQWdCLFlBQVksQ0FBQyxnQkFBZ0IsT0FBTyxDQUNwRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRS9ELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFPRCxNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFNN0MsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxZQUFZLFlBQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBVlMsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUM1RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBVzdDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUUvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsU0FBUyxDQUNiLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsWUFBb0I7UUFDMUMsTUFBTSxHQUFHLEdBQVEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEUsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEdBQUcsR0FDUixHQUFHLENBQUMsNEJBQTRCO1lBQ2hDLEdBQUcsQ0FBQyx5QkFBeUI7WUFDN0IsR0FBRyxDQUFDLHdCQUF3QjtZQUM1QixHQUFHLENBQUMsdUJBQXVCO1lBQzNCLEdBQUcsQ0FBQyxzQkFBc0I7WUFDMUIsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxHQUFHLEdBQUcsR0FBRyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sdUJBQXVCO0lBQTdCO1FBQ2tCLG1DQUE4QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFBO0lBd0IzRixDQUFDO0lBdEJRLDZCQUE2QixDQUFDLFlBQW9CO1FBQ3pELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNoRCxJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsaUJBQWlCLEdBQUcsZUFBZSxDQUFDLElBQUkscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtZQUM1RSxJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1lBRTFFLGVBQWUsQ0FDZCxLQUFLLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUU7Z0JBQ3hELElBQUksY0FBYyxLQUFLLGNBQWMsRUFBRSxDQUFDO29CQUN2QyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDNUIsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDM0QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRUQsV0FBVyxDQUFDLFlBQW9CO1FBQy9CLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3hELENBQUM7Q0FDRDtBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUEifQ==