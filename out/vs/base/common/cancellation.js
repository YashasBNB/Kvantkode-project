/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from './event.js';
const shortcutEvent = Object.freeze(function (callback, context) {
    const handle = setTimeout(callback.bind(context), 0);
    return {
        dispose() {
            clearTimeout(handle);
        },
    };
});
export var CancellationToken;
(function (CancellationToken) {
    function isCancellationToken(thing) {
        if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
            return true;
        }
        if (thing instanceof MutableToken) {
            return true;
        }
        if (!thing || typeof thing !== 'object') {
            return false;
        }
        return (typeof thing.isCancellationRequested === 'boolean' &&
            typeof thing.onCancellationRequested === 'function');
    }
    CancellationToken.isCancellationToken = isCancellationToken;
    CancellationToken.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: Event.None,
    });
    CancellationToken.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: shortcutEvent,
    });
})(CancellationToken || (CancellationToken = {}));
class MutableToken {
    constructor() {
        this._isCancelled = false;
        this._emitter = null;
    }
    cancel() {
        if (!this._isCancelled) {
            this._isCancelled = true;
            if (this._emitter) {
                this._emitter.fire(undefined);
                this.dispose();
            }
        }
    }
    get isCancellationRequested() {
        return this._isCancelled;
    }
    get onCancellationRequested() {
        if (this._isCancelled) {
            return shortcutEvent;
        }
        if (!this._emitter) {
            this._emitter = new Emitter();
        }
        return this._emitter.event;
    }
    dispose() {
        if (this._emitter) {
            this._emitter.dispose();
            this._emitter = null;
        }
    }
}
export class CancellationTokenSource {
    constructor(parent) {
        this._token = undefined;
        this._parentListener = undefined;
        this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
    }
    get token() {
        if (!this._token) {
            // be lazy and create the token only when
            // actually needed
            this._token = new MutableToken();
        }
        return this._token;
    }
    cancel() {
        if (!this._token) {
            // save an object by returning the default
            // cancelled token when cancellation happens
            // before someone asks for the token
            this._token = CancellationToken.Cancelled;
        }
        else if (this._token instanceof MutableToken) {
            // actually cancel
            this._token.cancel();
        }
    }
    dispose(cancel = false) {
        if (cancel) {
            this.cancel();
        }
        this._parentListener?.dispose();
        if (!this._token) {
            // ensure to initialize with an empty token if we had none
            this._token = CancellationToken.None;
        }
        else if (this._token instanceof MutableToken) {
            // actually dispose
            this._token.dispose();
        }
    }
}
export function cancelOnDispose(store) {
    const source = new CancellationTokenSource();
    store.add({
        dispose() {
            source.cancel();
        },
    });
    return source.token;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsbGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY2FuY2VsbGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBd0IzQyxNQUFNLGFBQWEsR0FBZSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsUUFBUSxFQUFFLE9BQVE7SUFDM0UsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDcEQsT0FBTztRQUNOLE9BQU87WUFDTixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckIsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sS0FBVyxpQkFBaUIsQ0EwQmpDO0FBMUJELFdBQWlCLGlCQUFpQjtJQUNqQyxTQUFnQixtQkFBbUIsQ0FBQyxLQUFjO1FBQ2pELElBQUksS0FBSyxLQUFLLGlCQUFpQixDQUFDLElBQUksSUFBSSxLQUFLLEtBQUssaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0UsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDbkMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLENBQ04sT0FBUSxLQUEyQixDQUFDLHVCQUF1QixLQUFLLFNBQVM7WUFDekUsT0FBUSxLQUEyQixDQUFDLHVCQUF1QixLQUFLLFVBQVUsQ0FDMUUs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