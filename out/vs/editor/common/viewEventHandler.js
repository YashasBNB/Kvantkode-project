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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0V2ZW50SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3RXZlbnRIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUczRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQUcvQztRQUNDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7SUFDMUIsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7SUFDMUIsQ0FBQztJQUVTLGVBQWU7UUFDeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7SUFDMUIsQ0FBQztJQUVNLFdBQVc7UUFDakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVELDJCQUEyQjtJQUVwQixrQkFBa0IsQ0FBQyxDQUF1QztRQUNoRSxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDTSxnQkFBZ0IsQ0FBQyxDQUFxQztRQUM1RCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDTSxzQkFBc0IsQ0FBQyxDQUEyQztRQUN4RSxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDTSxvQkFBb0IsQ0FBQyxDQUF5QztRQUNwRSxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDTSxvQkFBb0IsQ0FBQyxDQUF5QztRQUNwRSxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDTSxTQUFTLENBQUMsQ0FBOEI7UUFDOUMsT0FB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