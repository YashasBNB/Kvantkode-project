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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvZ3B1VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBb0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVsRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFFbEYsTUFBTSxVQUFVLGlCQUFpQixDQUFJLEtBQWU7SUFDbkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssa0JBQWtCLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsb0RBQW9EO0FBQ3BELE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsT0FBb0IsRUFDcEIsWUFBd0MsRUFDeEMsUUFBNkQ7SUFFN0QsNkZBQTZGO0lBQzdGLDBGQUEwRjtJQUMxRiw0RkFBNEY7SUFDNUYscUNBQXFDO0lBQ3JDLElBQUksUUFBUSxHQUErQixJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUN0RixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBRUQseUVBQXlFO1FBQ3pFLElBQUksQ0FBQyxDQUFDLDJCQUEyQixJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0MsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFBO1lBQ3RCLFFBQVEsR0FBRyxTQUFTLENBQUE7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFFRCwrRkFBK0Y7UUFDL0YsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQTtRQUMzRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQzNELElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUM7UUFDSixRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQVMsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDckIsUUFBUSxHQUFHLFNBQVMsQ0FBQTtRQUNwQixNQUFNLElBQUksa0JBQWtCLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBQ0QsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7QUFDbEQsQ0FBQyJ9