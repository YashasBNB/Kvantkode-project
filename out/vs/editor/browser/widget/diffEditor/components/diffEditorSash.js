/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Sash, } from '../../../../../base/browser/ui/sash/sash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derivedWithSetter, observableValue, } from '../../../../../base/common/observable.js';
export class SashLayout {
    resetSash() {
        this._sashRatio.set(undefined, undefined);
    }
    constructor(_options, dimensions) {
        this._options = _options;
        this.dimensions = dimensions;
        this.sashLeft = derivedWithSetter(this, (reader) => {
            const ratio = this._sashRatio.read(reader) ?? this._options.splitViewDefaultRatio.read(reader);
            return this._computeSashLeft(ratio, reader);
        }, (value, tx) => {
            const contentWidth = this.dimensions.width.get();
            this._sashRatio.set(value / contentWidth, tx);
        });
        this._sashRatio = observableValue(this, undefined);
    }
    /** @pure */
    _computeSashLeft(desiredRatio, reader) {
        const contentWidth = this.dimensions.width.read(reader);
        const midPoint = Math.floor(this._options.splitViewDefaultRatio.read(reader) * contentWidth);
        const sashLeft = this._options.enableSplitViewResizing.read(reader)
            ? Math.floor(desiredRatio * contentWidth)
            : midPoint;
        const MINIMUM_EDITOR_WIDTH = 100;
        if (contentWidth <= MINIMUM_EDITOR_WIDTH * 2) {
            return midPoint;
        }
        if (sashLeft < MINIMUM_EDITOR_WIDTH) {
            return MINIMUM_EDITOR_WIDTH;
        }
        if (sashLeft > contentWidth - MINIMUM_EDITOR_WIDTH) {
            return contentWidth - MINIMUM_EDITOR_WIDTH;
        }
        return sashLeft;
    }
}
export class DiffEditorSash extends Disposable {
    constructor(_domNode, _dimensions, _enabled, _boundarySashes, sashLeft, _resetSash) {
        super();
        this._domNode = _domNode;
        this._dimensions = _dimensions;
        this._enabled = _enabled;
        this._boundarySashes = _boundarySashes;
        this.sashLeft = sashLeft;
        this._resetSash = _resetSash;
        this._sash = this._register(new Sash(this._domNode, {
            getVerticalSashTop: (_sash) => 0,
            getVerticalSashLeft: (_sash) => this.sashLeft.get(),
            getVerticalSashHeight: (_sash) => this._dimensions.height.get(),
        }, { orientation: 0 /* Orientation.VERTICAL */ }));
        this._startSashPosition = undefined;
        this._register(this._sash.onDidStart(() => {
            this._startSashPosition = this.sashLeft.get();
        }));
        this._register(this._sash.onDidChange((e) => {
            this.sashLeft.set(this._startSashPosition + (e.currentX - e.startX), undefined);
        }));
        this._register(this._sash.onDidEnd(() => this._sash.layout()));
        this._register(this._sash.onDidReset(() => this._resetSash()));
        this._register(autorun((reader) => {
            const sashes = this._boundarySashes.read(reader);
            if (sashes) {
                this._sash.orthogonalEndSash = sashes.bottom;
            }
        }));
        this._register(autorun((reader) => {
            /** @description DiffEditorSash.layoutSash */
            const enabled = this._enabled.read(reader);
            this._sash.state = enabled ? 3 /* SashState.Enabled */ : 0 /* SashState.Disabled */;
            this.sashLeft.read(reader);
            this._dimensions.height.read(reader);
            this._sash.layout();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclNhc2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JTYXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFJTixJQUFJLEdBRUosTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUlOLE9BQU8sRUFDUCxpQkFBaUIsRUFDakIsZUFBZSxHQUNmLE1BQU0sMENBQTBDLENBQUE7QUFHakQsTUFBTSxPQUFPLFVBQVU7SUFlZixTQUFTO1FBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxZQUNrQixRQUEyQixFQUM1QixVQUF1RTtRQUR0RSxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUM1QixlQUFVLEdBQVYsVUFBVSxDQUE2RDtRQXBCeEUsYUFBUSxHQUFHLGlCQUFpQixDQUMzQyxJQUFJLEVBQ0osQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzlGLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1QyxDQUFDLEVBQ0QsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDYixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUs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