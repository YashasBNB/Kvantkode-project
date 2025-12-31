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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdab25lcy92aWV3Wm9uZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQTJCM0QsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMzQyxDQUFDLENBQUE7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLFNBQVUsU0FBUSxRQUFRO0lBVXRDLFlBQVksT0FBb0I7UUFDL0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBRXZELElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDdkQsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFBO1FBQzVDLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtRQUUxQyxJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENB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