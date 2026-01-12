/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
export class ViewModelEventDispatcher extends Disposable {
    constructor() {
        super();
        this._onEvent = this._register(new Emitter());
        this.onEvent = this._onEvent.event;
        this._eventHandlers = [];
        this._viewEventQueue = null;
        this._isConsumingViewEventQueue = false;
        this._collector = null;
        this._collectorCnt = 0;
        this._outgoingEvents = [];
    }
    emitOutgoingEvent(e) {
        this._addOutgoingEvent(e);
        this._emitOutgoingEvents();
    }
    _addOutgoingEvent(e) {
        for (let i = 0, len = this._outgoingEvents.length; i < len; i++) {
            const mergeResult = this._outgoingEvents[i].kind === e.kind ? this._outgoingEvents[i].attemptToMerge(e) : null;
            if (mergeResult) {
                this._outgoingEvents[i] = mergeResult;
                return;
            }
        }
        // not merged
        this._outgoingEvents.push(e);
    }
    _emitOutgoingEvents() {
        while (this._outgoingEvents.length > 0) {
            if (this._collector || this._isConsumingViewEventQueue) {
                // right now collecting or emitting view events, so let's postpone emitting
                return;
            }
            const event = this._outgoingEvents.shift();
            if (event.isNoOp()) {
                continue;
            }
            this._onEvent.fire(event);
        }
    }
    addViewEventHandler(eventHandler) {
        for (let i = 0, len = this._eventHandlers.length; i < len; i++) {
            if (this._eventHandlers[i] === eventHandler) {
                console.warn('Detected duplicate listener in ViewEventDispatcher', eventHandler);
            }
        }
        this._eventHandlers.push(eventHandler);
    }
    removeViewEventHandler(eventHandler) {
        for (let i = 0; i < this._eventHandlers.length; i++) {
            if (this._eventHandlers[i] === eventHandler) {
                this._eventHandlers.splice(i, 1);
                break;
            }
        }
    }
    beginEmitViewEvents() {
        this._collectorCnt++;
        if (this._collectorCnt === 1) {
            this._collector = new ViewModelEventsCollector();
        }
        return this._collector;
    }
    endEmitViewEvents() {
        this._collectorCnt--;
        if (this._collectorCnt === 0) {
            const outgoingEvents = this._collector.outgoingEvents;
            const viewEvents = this._collector.viewEvents;
            this._collector = null;
            for (const outgoingEvent of outgoingEvents) {
                this._addOutgoingEvent(outgoingEvent);
            }
            if (viewEvents.length > 0) {
                this._emitMany(viewEvents);
            }
        }
        this._emitOutgoingEvents();
    }
    emitSingleViewEvent(event) {
        try {
            const eventsCollector = this.beginEmitViewEvents();
            eventsCollector.emitViewEvent(event);
        }
        finally {
            this.endEmitViewEvents();
        }
    }
    _emitMany(events) {
        if (this._viewEventQueue) {
            this._viewEventQueue = this._viewEventQueue.concat(events);
        }
        else {
            this._viewEventQueue = events;
        }
        if (!this._isConsumingViewEventQueue) {
            this._consumeViewEventQueue();
        }
    }
    _consumeViewEventQueue() {
        try {
            this._isConsumingViewEventQueue = true;
            this._doConsumeQueue();
        }
        finally {
            this._isConsumingViewEventQueue = false;
        }
    }
    _doConsumeQueue() {
        while (this._viewEventQueue) {
            // Empty event queue, as events might come in while sending these off
            const events = this._viewEventQueue;
            this._viewEventQueue = null;
            // Use a clone of the event handlers list, as they might remove themselves
            const eventHandlers = this._eventHandlers.slice(0);
            for (const eventHandler of eventHandlers) {
                eventHandler.handleEvents(events);
            }
        }
    }
}
export class ViewModelEventsCollector {
    constructor() {
        this.viewEvents = [];
        this.outgoingEvents = [];
    }
    emitViewEvent(event) {
        this.viewEvents.push(event);
    }
    emitOutgoingEvent(e) {
        this.outgoingEvents.push(e);
    }
}
export var OutgoingViewModelEventKind;
(function (OutgoingViewModelEventKind) {
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ContentSizeChanged"] = 0] = "ContentSizeChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["FocusChanged"] = 1] = "FocusChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["WidgetFocusChanged"] = 2] = "WidgetFocusChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ScrollChanged"] = 3] = "ScrollChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ViewZonesChanged"] = 4] = "ViewZonesChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["HiddenAreasChanged"] = 5] = "HiddenAreasChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ReadOnlyEditAttempt"] = 6] = "ReadOnlyEditAttempt";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["CursorStateChanged"] = 7] = "CursorStateChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelDecorationsChanged"] = 8] = "ModelDecorationsChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelLanguageChanged"] = 9] = "ModelLanguageChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelLanguageConfigurationChanged"] = 10] = "ModelLanguageConfigurationChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelContentChanged"] = 11] = "ModelContentChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelOptionsChanged"] = 12] = "ModelOptionsChanged";
    OutgoingViewModelEventKind[OutgoingViewModelEventKind["ModelTokensChanged"] = 13] = "ModelTokensChanged";
})(OutgoingViewModelEventKind || (OutgoingViewModelEventKind = {}));
export class ContentSizeChangedEvent {
    constructor(oldContentWidth, oldContentHeight, contentWidth, contentHeight) {
        this.kind = 0 /* OutgoingViewModelEventKind.ContentSizeChanged */;
        this._oldContentWidth = oldContentWidth;
        this._oldContentHeight = oldContentHeight;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        this.contentWidthChanged = this._oldContentWidth !== this.contentWidth;
        this.contentHeightChanged = this._oldContentHeight !== this.contentHeight;
    }
    isNoOp() {
        return !this.contentWidthChanged && !this.contentHeightChanged;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return new ContentSizeChangedEvent(this._oldContentWidth, this._oldContentHeight, other.contentWidth, other.contentHeight);
    }
}
export class FocusChangedEvent {
    constructor(oldHasFocus, hasFocus) {
        this.kind = 1 /* OutgoingViewModelEventKind.FocusChanged */;
        this.oldHasFocus = oldHasFocus;
        this.hasFocus = hasFocus;
    }
    isNoOp() {
        return this.oldHasFocus === this.hasFocus;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return new FocusChangedEvent(this.oldHasFocus, other.hasFocus);
    }
}
export class WidgetFocusChangedEvent {
    constructor(oldHasFocus, hasFocus) {
        this.kind = 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */;
        this.oldHasFocus = oldHasFocus;
        this.hasFocus = hasFocus;
    }
    isNoOp() {
        return this.oldHasFocus === this.hasFocus;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return new FocusChangedEvent(this.oldHasFocus, other.hasFocus);
    }
}
export class ScrollChangedEvent {
    constructor(oldScrollWidth, oldScrollLeft, oldScrollHeight, oldScrollTop, scrollWidth, scrollLeft, scrollHeight, scrollTop) {
        this.kind = 3 /* OutgoingViewModelEventKind.ScrollChanged */;
        this._oldScrollWidth = oldScrollWidth;
        this._oldScrollLeft = oldScrollLeft;
        this._oldScrollHeight = oldScrollHeight;
        this._oldScrollTop = oldScrollTop;
        this.scrollWidth = scrollWidth;
        this.scrollLeft = scrollLeft;
        this.scrollHeight = scrollHeight;
        this.scrollTop = scrollTop;
        this.scrollWidthChanged = this._oldScrollWidth !== this.scrollWidth;
        this.scrollLeftChanged = this._oldScrollLeft !== this.scrollLeft;
        this.scrollHeightChanged = this._oldScrollHeight !== this.scrollHeight;
        this.scrollTopChanged = this._oldScrollTop !== this.scrollTop;
    }
    isNoOp() {
        return (!this.scrollWidthChanged &&
            !this.scrollLeftChanged &&
            !this.scrollHeightChanged &&
            !this.scrollTopChanged);
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return new ScrollChangedEvent(this._oldScrollWidth, this._oldScrollLeft, this._oldScrollHeight, this._oldScrollTop, other.scrollWidth, other.scrollLeft, other.scrollHeight, other.scrollTop);
    }
}
export class ViewZonesChangedEvent {
    constructor() {
        this.kind = 4 /* OutgoingViewModelEventKind.ViewZonesChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return this;
    }
}
export class HiddenAreasChangedEvent {
    constructor() {
        this.kind = 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return this;
    }
}
export class CursorStateChangedEvent {
    constructor(oldSelections, selections, oldModelVersionId, modelVersionId, source, reason, reachedMaxCursorCount) {
        this.kind = 7 /* OutgoingViewModelEventKind.CursorStateChanged */;
        this.oldSelections = oldSelections;
        this.selections = selections;
        this.oldModelVersionId = oldModelVersionId;
        this.modelVersionId = modelVersionId;
        this.source = source;
        this.reason = reason;
        this.reachedMaxCursorCount = reachedMaxCursorCount;
    }
    static _selectionsAreEqual(a, b) {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) {
            return false;
        }
        for (let i = 0; i < aLen; i++) {
            if (!a[i].equalsSelection(b[i])) {
                return false;
            }
        }
        return true;
    }
    isNoOp() {
        return (CursorStateChangedEvent._selectionsAreEqual(this.oldSelections, this.selections) &&
            this.oldModelVersionId === this.modelVersionId);
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return new CursorStateChangedEvent(this.oldSelections, other.selections, this.oldModelVersionId, other.modelVersionId, other.source, other.reason, this.reachedMaxCursorCount || other.reachedMaxCursorCount);
    }
}
export class ReadOnlyEditAttemptEvent {
    constructor() {
        this.kind = 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        if (other.kind !== this.kind) {
            return null;
        }
        return this;
    }
}
export class ModelDecorationsChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
export class ModelLanguageChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
export class ModelLanguageConfigurationChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
export class ModelContentChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 11 /* OutgoingViewModelEventKind.ModelContentChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
export class ModelOptionsChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
export class ModelTokensChangedEvent {
    constructor(event) {
        this.event = event;
        this.kind = 13 /* OutgoingViewModelEventKind.ModelTokensChanged */;
    }
    isNoOp() {
        return false;
    }
    attemptToMerge(other) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbEV2ZW50RGlzcGF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBVzNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUFVO0lBV3ZEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFYUyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMEIsQ0FBQyxDQUFBO1FBQ2pFLFlBQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQVc1QyxJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUMzQixJQUFJLENBQUMsMEJBQTBCLEdBQUcsS0FBSyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxDQUF5QjtRQUNqRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLENBQXlCO1FBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFB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