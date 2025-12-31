/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Emitter } from '../../../../../../base/common/event.js';
import { assert } from '../../../../../../base/common/assert.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { FailedToResolveContentsStream, ResolveError } from '../../promptFileReferenceErrors.js';
import { cancelPreviousCalls } from '../../../../../../base/common/decorators/cancelPreviousCalls.js';
/**
 * Base class for prompt contents providers. Classes that extend this one are responsible to:
 *
 * - implement the {@linkcode getContentsStream} method to provide the contents stream
 *   of a prompt; this method should throw a `ResolveError` or its derivative if the contents
 *   cannot be parsed for any reason
 * - fire a {@linkcode TChangeEvent} event on the {@linkcode onChangeEmitter} event when
 * 	 prompt contents change
 * - misc:
 *   - provide the {@linkcode uri} property that represents the URI of a prompt that
 *     the contents are for
 *   - implement the {@linkcode toString} method to return a string representation of this
 *     provider type to aid with debugging/tracing
 */
export class PromptContentsProviderBase extends ObservableDisposable {
    constructor() {
        super();
        /**
         * Internal event emitter for the prompt contents change event. Classes that extend
         * this abstract class are responsible to use this emitter to fire the contents change
         * event when the prompt contents get modified.
         */
        this.onChangeEmitter = this._register(new Emitter());
        /**
         * Event emitter for the prompt contents change event.
         * See {@linkcode onContentChanged} for more details.
         */
        this.onContentChangedEmitter = this._register(new Emitter());
        /**
         * Event that fires when the prompt contents change. The event is either
         * a `VSBufferReadableStream` stream with changed contents or an instance of
         * the `ResolveError` class representing a parsing failure case.
         *
         * `Note!` this field is meant to be used by the external consumers of the prompt
         *         contents provider that the classes that extend this abstract class.
         *         Please use the {@linkcode onChangeEmitter} event to provide a change
         *         event in your prompt contents implementation instead.
         */
        this.onContentChanged = this.onContentChangedEmitter.event;
        // ensure that the `onChangeEmitter` always fires with the correct context
        this.onChangeEmitter.fire = this.onChangeEmitter.fire.bind(this.onChangeEmitter);
        // subscribe to the change event emitted by an extending class
        this._register(this.onChangeEmitter.event(this.onContentsChanged, this));
    }
    /**
     * Internal common implementation of the event that should be fired when
     * prompt contents change.
     */
    onContentsChanged(event, cancellationToken) {
        const promise = cancellationToken?.isCancellationRequested
            ? Promise.reject(new CancellationError())
            : this.getContentsStream(event, cancellationToken);
        promise
            .then((stream) => {
            if (cancellationToken?.isCancellationRequested || this.disposed) {
                stream.destroy();
                throw new CancellationError();
            }
            this.onContentChangedEmitter.fire(stream);
        })
            .catch((error) => {
            if (error instanceof ResolveError) {
                this.onContentChangedEmitter.fire(error);
                return;
            }
            this.onContentChangedEmitter.fire(new FailedToResolveContentsStream(this.uri, error));
        });
        return this;
    }
    /**
     * Start producing the prompt contents data.
     */
    start() {
        assert(!this.disposed, 'Cannot start contents provider that was already disposed.');
        // `'full'` means "everything has changed"
        this.onContentsChanged('full');
        return this;
    }
}
__decorate([
    cancelPreviousCalls
], PromptContentsProviderBase.prototype, "onContentsChanged", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29udGVudHNQcm92aWRlckJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy9wcm9tcHRDb250ZW50c1Byb3ZpZGVyQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUVyRzs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxPQUFnQiwwQkFDckIsU0FBUSxvQkFBb0I7SUEyQjVCO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFSUjs7OztXQUlHO1FBQ2dCLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQyxDQUFBO1FBVXpGOzs7V0FHRztRQUNjLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hELElBQUksT0FBTyxFQUF5QyxDQUNwRCxDQUFBO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ2EscUJBQWdCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtRQXhCcEUsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDaEYsOERBQThEO1FBQzlELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQXNCRDs7O09BR0c7SUFFSyxpQkFBaUIsQ0FDeEIsS0FBNEIsRUFDNUIsaUJBQXFDO1FBRXJDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixFQUFFLHVCQUF1QjtZQUN6RCxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUVuRCxPQUFPO2FBQ0wsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEIsSUFBSSxpQkFBaUIsRUFBRSx1QkFBdUIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDaEIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7WUFDOUIsQ0FBQztZQUVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUMsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDaEIsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBRXhDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN0RixDQUFDLENBQUMsQ0FBQTtRQUVILE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSztRQUNYLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsMkRBQTJELENBQUMsQ0FBQTtRQUVuRiwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEO0FBekNRO0lBRFAsbUJBQW1CO21FQTZCbkIifQ==