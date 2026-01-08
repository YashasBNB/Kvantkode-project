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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclNhc2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvclNhc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUlOLElBQUksR0FFSixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBSU4sT0FBTyxFQUNQLGlCQUFpQixFQUNqQixlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdqRCxNQUFNLE9BQU8sVUFBVTtJQWVmLFNBQVM7UUFDZixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELFlBQ2tCLFFBQTJCLEVBQzVCLFVBQXVFO1FBRHRFLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQzVCLGVBQVUsR0FBVixVQUFVLENBQTZEO1FBcEJ4RSxhQUFRLEdBQUcsaUJBQWlCLENBQzNDLElBQUksRUFDSixDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUYsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLENBQUMsRUFDRCxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUNiLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcs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