/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
/**
 * Contains all data needed to render at a specific viewport.
 */
export class ViewportData {
    constructor(selections, partialData, whitespaceViewportData, model) {
        this.selections = selections;
        this.startLineNumber = partialData.startLineNumber | 0;
        this.endLineNumber = partialData.endLineNumber | 0;
        this.relativeVerticalOffset = partialData.relativeVerticalOffset;
        this.bigNumbersDelta = partialData.bigNumbersDelta | 0;
        this.lineHeight = partialData.lineHeight | 0;
        this.whitespaceViewportData = whitespaceViewportData;
        this._model = model;
        this.visibleRange = new Range(partialData.startLineNumber, this._model.getLineMinColumn(partialData.startLineNumber), partialData.endLineNumber, this._model.getLineMaxColumn(partialData.endLineNumber));
    }
    getViewLineRenderingData(lineNumber) {
        return this._model.getViewportViewLineRenderingData(this.visibleRange, lineNumber);
    }
    getDecorationsInViewport() {
        return this._model.getDecorationsInViewport(this.visibleRange);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzVmlld3BvcnREYXRhLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L3ZpZXdMaW5lc1ZpZXdwb3J0RGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFVeEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBWTtJQXFDeEIsWUFDQyxVQUF1QixFQUN2QixXQUEwQyxFQUMxQyxzQkFBcUQsRUFDckQsS0FBaUI7UUFFakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxXQUFXLENBQUMsc0JBQXNCLENBQUE7UUFDaEUsSUFBSSxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUVuQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksS0FBSyxDQUM1QixXQUFXLENBQUMsZUFBZSxFQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFDekQsV0FBVyxDQUFDLGFBQWEsRUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQ3ZELENBQUE7SUFDRixDQUFDO0lBRU0sd0JBQXdCLENBQUMsVUFBa0I7UUFDakQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRCJ9