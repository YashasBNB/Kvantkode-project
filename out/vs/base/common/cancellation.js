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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsbGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jYW5jZWxsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUF3QjNDLE1BQU0sYUFBYSxHQUFlLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxRQUFRLEVBQUUsT0FBUTtJQUMzRSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNwRCxPQUFPO1FBQ04sT0FBTztZQUNOLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxLQUFXLGlCQUFpQixDQTBCakM7QUExQkQsV0FBaUIsaUJBQWlCO0lBQ2pDLFNBQWdCLG1CQUFtQixDQUFDLEtBQWM7UUFDakQsSUFBSSxLQUFLLEtBQUssaUJBQWlCLENBQUMsSUFBSSxJQUFJLEtBQUssS0FBSyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMvRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLEtBQUssWUFBWSxZQUFZLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sQ0FDTixPQUFRLEtBQTJCLENBQUMsdUJBQXVCLEtBQUssU0FBUztZQUN6RSxPQUFRLEtBQTJCLENBQUMs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