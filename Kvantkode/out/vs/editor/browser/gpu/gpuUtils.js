/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
export const quadVertices = new Float32Array([1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0]);
export function ensureNonNullable(value) {
    if (!value) {
        throw new Error(`Value "${value}" cannot be null`);
    }
    return value;
}
// TODO: Move capabilities into ElementSizeObserver?
export function observeDevicePixelDimensions(element, parentWindow, callback) {
    // Observe any resizes to the element and extract the actual pixel size of the element if the
    // devicePixelContentBoxSize API is supported. This allows correcting rounding errors when
    // converting between CSS pixels and device pixels which causes blurry rendering when device
    // pixel ratio is not a round number.
    let observer = new parentWindow.ResizeObserver((entries) => {
        const entry = entries.find((entry) => entry.target === element);
        if (!entry) {
            return;
        }
        // Disconnect if devicePixelContentBoxSize isn't supported by the browser
        if (!('devicePixelContentBoxSize' in entry)) {
            observer?.disconnect();
            observer = undefined;
            return;
        }
        // Fire the callback, ignore events where the dimensions are 0x0 as the canvas is likely hidden
        const width = entry.devicePixelContentBoxSize[0].inlineSize;
        const height = entry.devicePixelContentBoxSize[0].blockSize;
        if (width > 0 && height > 0) {
            callback(width, height);
        }
    });
    try {
        observer.observe(element, { box: ['device-pixel-content-box'] });
    }
    catch {
        observer.disconnect();
        observer = undefined;
        throw new BugIndicatingError('Could not observe device pixel dimensions');
    }
    return toDisposable(() => observer?.disconnect());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9ncHVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFvQixNQUFNLG1DQUFtQyxDQUFBO0FBRWxGLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUVsRixNQUFNLFVBQVUsaUJBQWlCLENBQUksS0FBZTtJQUNuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxvREFBb0Q7QUFDcEQsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxPQUFvQixFQUNwQixZQUF3QyxFQUN4QyxRQUE2RDtJQUU3RCw2RkFBNkY7SUFDN0YsMEZBQTBGO0lBQzFGLDRGQUE0RjtJQUM1RixxQ0FBcUM7SUFDckMsSUFBSSxRQUFRLEdBQStCLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3RGLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCx5RUFBeUU7UUFDekUsSUFBSSxDQUFDLENBQUMsMkJBQTJCLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUE7WUFDdEIsUUFBUSxHQUFHLFNBQVMsQ0FBQTtZQUNwQixPQUFNO1FBQ1AsQ0FBQztRQUVELCtGQUErRjtRQUMvRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBQzNELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDM0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3QixRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQztRQUNKLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBUyxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNyQixRQUFRLEdBQUcsU0FBUyxDQUFBO1FBQ3BCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFDRCxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtBQUNsRCxDQUFDIn0=