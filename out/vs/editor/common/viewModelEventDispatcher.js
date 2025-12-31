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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWxFdmVudERpc3BhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXBELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQVczRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQVd2RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBWFMsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUNqRSxZQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFXNUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDM0IsSUFBSSxDQUFDLDBCQUEwQixHQUFHLEtBQUssQ0FBQTtRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUN0QixJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRU0saUJBQWlCLENBQUMsQ0FBeUI7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxDQUF5QjtRQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FB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