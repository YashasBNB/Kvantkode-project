/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
/**
 * A content part is a non-floating element that is rendered inside a cell.
 * The rendering of the content part is synchronous to avoid flickering.
 */
export class CellContentPart extends Disposable {
    constructor() {
        super();
        this.cellDisposables = this._register(new DisposableStore());
    }
    /**
     * Prepare model for cell part rendering
     * No DOM operations recommended within this operation
     */
    prepareRenderCell(element) { }
    /**
     * Update the DOM for the cell `element`
     */
    renderCell(element) {
        this.currentCell = element;
        safeInvokeNoArg(() => this.didRenderCell(element));
    }
    didRenderCell(element) { }
    /**
     * Dispose any disposables generated from `didRenderCell`
     */
    unrenderCell(element) {
        this.currentCell = undefined;
        this.cellDisposables.clear();
    }
    /**
     * Perform DOM read operations to prepare for the list/cell layout update.
     */
    prepareLayout() { }
    /**
     * Update internal DOM (top positions) per cell layout info change
     * Note that a cell part doesn't need to call `DOM.scheduleNextFrame`,
     * the list view will ensure that layout call is invoked in the right frame
     */
    updateInternalLayoutNow(element) { }
    /**
     * Update per cell state change
     */
    updateState(element, e) { }
    /**
     * Update per execution state change.
     */
    updateForExecutionState(element, e) { }
}
/**
 * An overlay part renders on top of other components.
 * The rendering of the overlay part might be postponed to the next animation frame to avoid forced reflow.
 */
export class CellOverlayPart extends Disposable {
    constructor() {
        super();
        this.cellDisposables = this._register(new DisposableStore());
    }
    /**
     * Prepare model for cell part rendering
     * No DOM operations recommended within this operation
     */
    prepareRenderCell(element) { }
    /**
     * Update the DOM for the cell `element`
     */
    renderCell(element) {
        this.currentCell = element;
        this.didRenderCell(element);
    }
    didRenderCell(element) { }
    /**
     * Dispose any disposables generated from `didRenderCell`
     */
    unrenderCell(element) {
        this.currentCell = undefined;
        this.cellDisposables.clear();
    }
    /**
     * Update internal DOM (top positions) per cell layout info change
     * Note that a cell part doesn't need to call `DOM.scheduleNextFrame`,
     * the list view will ensure that layout call is invoked in the right frame
     */
    updateInternalLayoutNow(element) { }
    /**
     * Update per cell state change
     */
    updateState(element, e) { }
    /**
     * Update per execution state change.
     */
    updateForExecutionState(element, e) { }
}
function safeInvokeNoArg(func) {
    try {
        return func();
    }
    catch (e) {
        onUnexpectedError(e);
        return null;
    }
}
export class CellPartsCollection extends Disposable {
    constructor(targetWindow, contentParts, overlayParts) {
        super();
        this.targetWindow = targetWindow;
        this.contentParts = contentParts;
        this.overlayParts = overlayParts;
        this._scheduledOverlayRendering = this._register(new MutableDisposable());
        this._scheduledOverlayUpdateState = this._register(new MutableDisposable());
        this._scheduledOverlayUpdateExecutionState = this._register(new MutableDisposable());
    }
    concatContentPart(other, targetWindow) {
        return new CellPartsCollection(targetWindow, this.contentParts.concat(other), this.overlayParts);
    }
    concatOverlayPart(other, targetWindow) {
        return new CellPartsCollection(targetWindow, this.contentParts, this.overlayParts.concat(other));
    }
    scheduleRenderCell(element) {
        // prepare model
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.prepareRenderCell(element));
        }
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.prepareRenderCell(element));
        }
        // render content parts
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.renderCell(element));
        }
        this._scheduledOverlayRendering.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.renderCell(element));
            }
        });
    }
    unrenderCell(element) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.unrenderCell(element));
        }
        this._scheduledOverlayRendering.value = undefined;
        this._scheduledOverlayUpdateState.value = undefined;
        this._scheduledOverlayUpdateExecutionState.value = undefined;
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.unrenderCell(element));
        }
    }
    updateInternalLayoutNow(viewCell) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateInternalLayoutNow(viewCell));
        }
        for (const part of this.overlayParts) {
            safeInvokeNoArg(() => part.updateInternalLayoutNow(viewCell));
        }
    }
    prepareLayout() {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.prepareLayout());
        }
    }
    updateState(viewCell, e) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateState(viewCell, e));
        }
        this._scheduledOverlayUpdateState.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.updateState(viewCell, e));
            }
        });
    }
    updateForExecutionState(viewCell, e) {
        for (const part of this.contentParts) {
            safeInvokeNoArg(() => part.updateForExecutionState(viewCell, e));
        }
        this._scheduledOverlayUpdateExecutionState.value = DOM.modify(this.targetWindow, () => {
            for (const part of this.overlayParts) {
                safeInvokeNoArg(() => part.updateForExecutionState(viewCell, e));
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUtoRDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLGVBQWdCLFNBQVEsVUFBVTtJQUl2RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBSFcsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtJQUkxRSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsaUJBQWlCLENBQUMsT0FBdUIsSUFBUyxDQUFDO0lBRW5EOztPQUVHO0lBQ0gsVUFBVSxDQUFDLE9BQXVCO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFBO1FBQzFCLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUF1QixJQUFTLENBQUM7SUFFL0M7O09BRUc7SUFDSCxZQUFZLENBQUMsT0FBdUI7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhLEtBQVUsQ0FBQztJQUV4Qjs7OztPQUlHO0lBQ0gsdUJBQXVCLENB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