/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../base/common/lifecycle.js';
export class ViewEventHandler extends Disposable {
    constructor() {
        super();
        this._shouldRender = true;
    }
    shouldRender() {
        return this._shouldRender;
    }
    forceShouldRender() {
        this._shouldRender = true;
    }
    setShouldRender() {
        this._shouldRender = true;
    }
    onDidRender() {
        this._shouldRender = false;
    }
    // --- begin event handlers
    onCompositionStart(e) {
        return false;
    }
    onCompositionEnd(e) {
        return false;
    }
    onConfigurationChanged(e) {
        return false;
    }
    onCursorStateChanged(e) {
        return false;
    }
    onDecorationsChanged(e) {
        return false;
    }
    onFlushed(e) {
        return false;
    }
    onFocusChanged(e) {
        return false;
    }
    onLanguageConfigurationChanged(e) {
        return false;
    }
    onLineMappingChanged(e) {
        return false;
    }
    onLinesChanged(e) {
        return false;
    }
    onLinesDeleted(e) {
        return false;
    }
    onLinesInserted(e) {
        return false;
    }
    onRevealRangeRequest(e) {
        return false;
    }
    onScrollChanged(e) {
        return false;
    }
    onThemeChanged(e) {
        return false;
    }
    onTokensChanged(e) {
        return false;
    }
    onTokensColorsChanged(e) {
        return false;
    }
    onZonesChanged(e) {
        return false;
    }
    // --- end event handlers
    handleEvents(events) {
        let shouldRender = false;
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case 0 /* viewEvents.ViewEventType.ViewCompositionStart */:
                    if (this.onCompositionStart(e)) {
                        shouldRender = true;
                    }
                    break;
                case 1 /* viewEvents.ViewEventType.ViewCompositionEnd */:
                    if (this.onCompositionEnd(e)) {
                        shouldRender = true;
                    }
                    break;
                case 2 /* viewEvents.ViewEventType.ViewConfigurationChanged */:
                    if (this.onConfigurationChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 3 /* viewEvents.ViewEventType.ViewCursorStateChanged */:
                    if (this.onCursorStateChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 4 /* viewEvents.ViewEventType.ViewDecorationsChanged */:
                    if (this.onDecorationsChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 5 /* viewEvents.ViewEventType.ViewFlushed */:
                    if (this.onFlushed(e)) {
                        shouldRender = true;
                    }
                    break;
                case 6 /* viewEvents.ViewEventType.ViewFocusChanged */:
                    if (this.onFocusChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 7 /* viewEvents.ViewEventType.ViewLanguageConfigurationChanged */:
                    if (this.onLanguageConfigurationChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 8 /* viewEvents.ViewEventType.ViewLineMappingChanged */:
                    if (this.onLineMappingChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 9 /* viewEvents.ViewEventType.ViewLinesChanged */:
                    if (this.onLinesChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 10 /* viewEvents.ViewEventType.ViewLinesDeleted */:
                    if (this.onLinesDeleted(e)) {
                        shouldRender = true;
                    }
                    break;
                case 11 /* viewEvents.ViewEventType.ViewLinesInserted */:
                    if (this.onLinesInserted(e)) {
                        shouldRender = true;
                    }
                    break;
                case 12 /* viewEvents.ViewEventType.ViewRevealRangeRequest */:
                    if (this.onRevealRangeRequest(e)) {
                        shouldRender = true;
                    }
                    break;
                case 13 /* viewEvents.ViewEventType.ViewScrollChanged */:
                    if (this.onScrollChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 15 /* viewEvents.ViewEventType.ViewTokensChanged */:
                    if (this.onTokensChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 14 /* viewEvents.ViewEventType.ViewThemeChanged */:
                    if (this.onThemeChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 16 /* viewEvents.ViewEventType.ViewTokensColorsChanged */:
                    if (this.onTokensColorsChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                case 17 /* viewEvents.ViewEventType.ViewZonesChanged */:
                    if (this.onZonesChanged(e)) {
                        shouldRender = true;
                    }
                    break;
                default:
                    console.info('View received unknown event: ');
                    console.info(e);
            }
        }
        if (shouldRender) {
            this._shouldRender = true;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0V2ZW50SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0V2ZW50SGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHM0QsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFHL0M7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFFTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFFUyxlQUFlO1FBQ3hCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFFTSxXQUFXO1FBQ2pCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFRCwyQkFBMkI7SUFFcEIsa0JBQWtCLENBQUMsQ0FBdUM7UUFDaEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ00sZ0JBQWdCLENBQUMsQ0FBcUM7UUFDNUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ00sc0JBQXNCLENBQUMsQ0FBMkM7UUFDeEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ00sb0JBQW9CLENBQUMsQ0FBeUM7UUFDcEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ00sb0JBQW9CLENBQUMsQ0FBeUM7UUFDcEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ00sU0FBUyxDQUFDLENBQThCO1FBQzlDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJ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