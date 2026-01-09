/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ViewPart } from '../../view/viewPart.js';
import { Position } from '../../../common/core/position.js';
const invalidFunc = () => {
    throw new Error(`Invalid change accessor`);
};
/**
 * A view zone is a rectangle that is a section that is inserted into the editor
 * lines that can be used for various purposes such as showing a diffs, peeking
 * an implementation, etc.
 */
export class ViewZones extends ViewPart {
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._contentWidth = layoutInfo.contentWidth;
        this._contentLeft = layoutInfo.contentLeft;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('view-zones');
        this.domNode.setPosition('absolute');
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.marginDomNode = createFastDomNode(document.createElement('div'));
        this.marginDomNode.setClassName('margin-view-zones');
        this.marginDomNode.setPosition('absolute');
        this.marginDomNode.setAttribute('role', 'presentation');
        this.marginDomNode.setAttribute('aria-hidden', 'true');
        this._zones = {};
    }
    dispose() {
        super.dispose();
        this._zones = {};
    }
    // ---- begin view event handlers
    _recomputeWhitespacesProps() {
        const whitespaces = this._context.viewLayout.getWhitespaces();
        const oldWhitespaces = new Map();
        for (const whitespace of whitespaces) {
            oldWhitespaces.set(whitespace.id, whitespace);
        }
        let hadAChange = false;
        this._context.viewModel.changeWhitespace((whitespaceAccessor) => {
            const keys = Object.keys(this._zones);
            for (let i = 0, len = keys.length; i < len; i++) {
                const id = keys[i];
                const zone = this._zones[id];
                const props = this._computeWhitespaceProps(zone.delegate);
                zone.isInHiddenArea = props.isInHiddenArea;
                const oldWhitespace = oldWhitespaces.get(id);
                if (oldWhitespace &&
                    (oldWhitespace.afterLineNumber !== props.afterViewLineNumber ||
                        oldWhitespace.height !== props.heightInPx)) {
                    whitespaceAccessor.changeOneWhitespace(id, props.afterViewLineNumber, props.heightInPx);
                    this._safeCallOnComputedHeight(zone.delegate, props.heightInPx);
                    hadAChange = true;
                }
            }
        });
        return hadAChange;
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._contentWidth = layoutInfo.contentWidth;
        this._contentLeft = layoutInfo.contentLeft;
        if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
            this._recomputeWhitespacesProps();
        }
        return true;
    }
    onLineMappingChanged(e) {
        return this._recomputeWhitespacesProps();
    }
    onLinesDeleted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    // ---- end view event handlers
    _getZoneOrdinal(zone) {
        return zone.ordinal ?? zone.afterColumn ?? 10000;
    }
    _computeWhitespaceProps(zone) {
        if (zone.afterLineNumber === 0) {
            return {
                isInHiddenArea: false,
                afterViewLineNumber: 0,
                heightInPx: this._heightInPixels(zone),
                minWidthInPx: this._minWidthInPixels(zone),
            };
        }
        let zoneAfterModelPosition;
        if (typeof zone.afterColumn !== 'undefined') {
            zoneAfterModelPosition = this._context.viewModel.model.validatePosition({
                lineNumber: zone.afterLineNumber,
                column: zone.afterColumn,
            });
        }
        else {
            const validAfterLineNumber = this._context.viewModel.model.validatePosition({
                lineNumber: zone.afterLineNumber,
                column: 1,
            }).lineNumber;
            zoneAfterModelPosition = new Position(validAfterLineNumber, this._context.viewModel.model.getLineMaxColumn(validAfterLineNumber));
        }
        let zoneBeforeModelPosition;
        if (zoneAfterModelPosition.column ===
            this._context.viewModel.model.getLineMaxColumn(zoneAfterModelPosition.lineNumber)) {
            zoneBeforeModelPosition = this._context.viewModel.model.validatePosition({
                lineNumber: zoneAfterModelPosition.lineNumber + 1,
                column: 1,
            });
        }
        else {
            zoneBeforeModelPosition = this._context.viewModel.model.validatePosition({
                lineNumber: zoneAfterModelPosition.lineNumber,
                column: zoneAfterModelPosition.column + 1,
            });
        }
        const viewPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(zoneAfterModelPosition, zone.afterColumnAffinity, true);
        const isVisible = zone.showInHiddenAreas ||
            this._context.viewModel.coordinatesConverter.modelPositionIsVisible(zoneBeforeModelPosition);
        return {
            isInHiddenArea: !isVisible,
            afterViewLineNumber: viewPosition.lineNumber,
            heightInPx: isVisible ? this._heightInPixels(zone) : 0,
            minWidthInPx: this._minWidthInPixels(zone),
        };
    }
    changeViewZones(callback) {
        let zonesHaveChanged = false;
        this._context.viewModel.changeWhitespace((whitespaceAccessor) => {
            const changeAccessor = {
                addZone: (zone) => {
                    zonesHaveChanged = true;
                    return this._addZone(whitespaceAccessor, zone);
                },
                removeZone: (id) => {
                    if (!id) {
                        return;
                    }
                    zonesHaveChanged = this._removeZone(whitespaceAccessor, id) || zonesHaveChanged;
                },
                layoutZone: (id) => {
                    if (!id) {
                        return;
                    }
                    zonesHaveChanged = this._layoutZone(whitespaceAccessor, id) || zonesHaveChanged;
                },
            };
            safeInvoke1Arg(callback, changeAccessor);
            // Invalidate changeAccessor
            changeAccessor.addZone = invalidFunc;
            changeAccessor.removeZone = invalidFunc;
            changeAccessor.layoutZone = invalidFunc;
        });
        return zonesHaveChanged;
    }
    _addZone(whitespaceAccessor, zone) {
        const props = this._computeWhitespaceProps(zone);
        const whitespaceId = whitespaceAccessor.insertWhitespace(props.afterViewLineNumber, this._getZoneOrdinal(zone), props.heightInPx, props.minWidthInPx);
        const myZone = {
            whitespaceId: whitespaceId,
            delegate: zone,
            isInHiddenArea: props.isInHiddenArea,
            isVisible: false,
            domNode: createFastDomNode(zone.domNode),
            marginDomNode: zone.marginDomNode ? createFastDomNode(zone.marginDomNode) : null,
        };
        this._safeCallOnComputedHeight(myZone.delegate, props.heightInPx);
        myZone.domNode.setPosition('absolute');
        myZone.domNode.domNode.style.width = '100%';
        myZone.domNode.setDisplay('none');
        myZone.domNode.setAttribute('monaco-view-zone', myZone.whitespaceId);
        this.domNode.appendChild(myZone.domNode);
        if (myZone.marginDomNode) {
            myZone.marginDomNode.setPosition('absolute');
            myZone.marginDomNode.domNode.style.width = '100%';
            myZone.marginDomNode.setDisplay('none');
            myZone.marginDomNode.setAttribute('monaco-view-zone', myZone.whitespaceId);
            this.marginDomNode.appendChild(myZone.marginDomNode);
        }
        this._zones[myZone.whitespaceId] = myZone;
        this.setShouldRender();
        return myZone.whitespaceId;
    }
    _removeZone(whitespaceAccessor, id) {
        if (this._zones.hasOwnProperty(id)) {
            const zone = this._zones[id];
            delete this._zones[id];
            whitespaceAccessor.removeWhitespace(zone.whitespaceId);
            zone.domNode.removeAttribute('monaco-visible-view-zone');
            zone.domNode.removeAttribute('monaco-view-zone');
            zone.domNode.domNode.remove();
            if (zone.marginDomNode) {
                zone.marginDomNode.removeAttribute('monaco-visible-view-zone');
                zone.marginDomNode.removeAttribute('monaco-view-zone');
                zone.marginDomNode.domNode.remove();
            }
            this.setShouldRender();
            return true;
        }
        return false;
    }
    _layoutZone(whitespaceAccessor, id) {
        if (this._zones.hasOwnProperty(id)) {
            const zone = this._zones[id];
            const props = this._computeWhitespaceProps(zone.delegate);
            zone.isInHiddenArea = props.isInHiddenArea;
            // const newOrdinal = this._getZoneOrdinal(zone.delegate);
            whitespaceAccessor.changeOneWhitespace(zone.whitespaceId, props.afterViewLineNumber, props.heightInPx);
            // TODO@Alex: change `newOrdinal` too
            this._safeCallOnComputedHeight(zone.delegate, props.heightInPx);
            this.setShouldRender();
            return true;
        }
        return false;
    }
    shouldSuppressMouseDownOnViewZone(id) {
        if (this._zones.hasOwnProperty(id)) {
            const zone = this._zones[id];
            return Boolean(zone.delegate.suppressMouseDown);
        }
        return false;
    }
    _heightInPixels(zone) {
        if (typeof zone.heightInPx === 'number') {
            return zone.heightInPx;
        }
        if (typeof zone.heightInLines === 'number') {
            return this._lineHeight * zone.heightInLines;
        }
        return this._lineHeight;
    }
    _minWidthInPixels(zone) {
        if (typeof zone.minWidthInPx === 'number') {
            return zone.minWidthInPx;
        }
        return 0;
    }
    _safeCallOnComputedHeight(zone, height) {
        if (typeof zone.onComputedHeight === 'function') {
            try {
                zone.onComputedHeight(height);
            }
            catch (e) {
                onUnexpectedError(e);
            }
        }
    }
    _safeCallOnDomNodeTop(zone, top) {
        if (typeof zone.onDomNodeTop === 'function') {
            try {
                zone.onDomNodeTop(top);
            }
            catch (e) {
                onUnexpectedError(e);
            }
        }
    }
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        const visibleWhitespaces = ctx.viewportData.whitespaceViewportData;
        const visibleZones = {};
        let hasVisibleZone = false;
        for (const visibleWhitespace of visibleWhitespaces) {
            if (this._zones[visibleWhitespace.id].isInHiddenArea) {
                continue;
            }
            visibleZones[visibleWhitespace.id] = visibleWhitespace;
            hasVisibleZone = true;
        }
        const keys = Object.keys(this._zones);
        for (let i = 0, len = keys.length; i < len; i++) {
            const id = keys[i];
            const zone = this._zones[id];
            let newTop = 0;
            let newHeight = 0;
            let newDisplay = 'none';
            if (visibleZones.hasOwnProperty(id)) {
                newTop = visibleZones[id].verticalOffset - ctx.bigNumbersDelta;
                newHeight = visibleZones[id].height;
                newDisplay = 'block';
                // zone is visible
                if (!zone.isVisible) {
                    zone.domNode.setAttribute('monaco-visible-view-zone', 'true');
                    zone.isVisible = true;
                }
                this._safeCallOnDomNodeTop(zone.delegate, ctx.getScrolledTopFromAbsoluteTop(visibleZones[id].verticalOffset));
            }
            else {
                if (zone.isVisible) {
                    zone.domNode.removeAttribute('monaco-visible-view-zone');
                    zone.isVisible = false;
                }
                this._safeCallOnDomNodeTop(zone.delegate, ctx.getScrolledTopFromAbsoluteTop(-1000000));
            }
            zone.domNode.setTop(newTop);
            zone.domNode.setHeight(newHeight);
            zone.domNode.setDisplay(newDisplay);
            if (zone.marginDomNode) {
                zone.marginDomNode.setTop(newTop);
                zone.marginDomNode.setHeight(newHeight);
                zone.marginDomNode.setDisplay(newDisplay);
            }
        }
        if (hasVisibleZone) {
            this.domNode.setWidth(Math.max(ctx.scrollWidth, this._contentWidth));
            this.marginDomNode.setWidth(this._contentLeft);
        }
    }
}
function safeInvoke1Arg(func, arg1) {
    try {
        return func(arg1);
    }
    catch (e) {
        onUnexpectedError(e);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld1pvbmVzL3ZpZXdab25lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBMkIzRCxNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7SUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0FBQzNDLENBQUMsQ0FBQTtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sU0FBVSxTQUFRLFFBQVE7SUFVdEMsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUE7UUFFdkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsQ0FBQTtRQUN2RCxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUE7UUFDNUMsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBRTFDLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMs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