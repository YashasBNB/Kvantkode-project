/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../base/browser/fastDomNode.js';
import { applyFontInfo } from '../config/domFontInfo.js';
import { VisibleLinesCollection } from './viewLayer.js';
import { ViewPart } from './viewPart.js';
export class ViewOverlays extends ViewPart {
    constructor(context) {
        super(context);
        this._dynamicOverlays = [];
        this._isFocused = false;
        this._visibleLines = new VisibleLinesCollection({
            createLine: () => new ViewOverlayLine(this._dynamicOverlays),
        });
        this.domNode = this._visibleLines.domNode;
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        applyFontInfo(this.domNode, fontInfo);
        this.domNode.setClassName('view-overlays');
    }
    shouldRender() {
        if (super.shouldRender()) {
            return true;
        }
        for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
            const dynamicOverlay = this._dynamicOverlays[i];
            if (dynamicOverlay.shouldRender()) {
                return true;
            }
        }
        return false;
    }
    dispose() {
        super.dispose();
        for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
            const dynamicOverlay = this._dynamicOverlays[i];
            dynamicOverlay.dispose();
        }
        this._dynamicOverlays = [];
    }
    getDomNode() {
        return this.domNode;
    }
    addDynamicOverlay(overlay) {
        this._dynamicOverlays.push(overlay);
    }
    // ----- event handlers
    onConfigurationChanged(e) {
        this._visibleLines.onConfigurationChanged(e);
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        applyFontInfo(this.domNode, fontInfo);
        return true;
    }
    onFlushed(e) {
        return this._visibleLines.onFlushed(e);
    }
    onFocusChanged(e) {
        this._isFocused = e.isFocused;
        return true;
    }
    onLinesChanged(e) {
        return this._visibleLines.onLinesChanged(e);
    }
    onLinesDeleted(e) {
        return this._visibleLines.onLinesDeleted(e);
    }
    onLinesInserted(e) {
        return this._visibleLines.onLinesInserted(e);
    }
    onScrollChanged(e) {
        return this._visibleLines.onScrollChanged(e) || true;
    }
    onTokensChanged(e) {
        return this._visibleLines.onTokensChanged(e);
    }
    onZonesChanged(e) {
        return this._visibleLines.onZonesChanged(e);
    }
    // ----- end event handlers
    prepareRender(ctx) {
        const toRender = this._dynamicOverlays.filter((overlay) => overlay.shouldRender());
        for (let i = 0, len = toRender.length; i < len; i++) {
            const dynamicOverlay = toRender[i];
            dynamicOverlay.prepareRender(ctx);
            dynamicOverlay.onDidRender();
        }
    }
    render(ctx) {
        // Overwriting to bypass `shouldRender` flag
        this._viewOverlaysRender(ctx);
        this.domNode.toggleClassName('focused', this._isFocused);
    }
    _viewOverlaysRender(ctx) {
        this._visibleLines.renderLines(ctx.viewportData);
    }
}
export class ViewOverlayLine {
    constructor(dynamicOverlays) {
        this._dynamicOverlays = dynamicOverlays;
        this._domNode = null;
        this._renderedContent = null;
    }
    getDomNode() {
        if (!this._domNode) {
            return null;
        }
        return this._domNode.domNode;
    }
    setDomNode(domNode) {
        this._domNode = createFastDomNode(domNode);
    }
    onContentChanged() {
        // Nothing
    }
    onTokensChanged() {
        // Nothing
    }
    renderLine(lineNumber, deltaTop, lineHeight, viewportData, sb) {
        let result = '';
        for (let i = 0, len = this._dynamicOverlays.length; i < len; i++) {
            const dynamicOverlay = this._dynamicOverlays[i];
            result += dynamicOverlay.render(viewportData.startLineNumber, lineNumber);
        }
        if (this._renderedContent === result) {
            // No rendering needed
            return false;
        }
        this._renderedContent = result;
        sb.appendString('<div style="top:');
        sb.appendString(String(deltaTop));
        sb.appendString('px;height:');
        sb.appendString(String(lineHeight));
        sb.appendString('px;">');
        sb.appendString(result);
        sb.appendString('</div>');
        return true;
    }
    layoutLine(lineNumber, deltaTop, lineHeight) {
        if (this._domNode) {
            this._domNode.setTop(deltaTop);
            this._domNode.setHeight(lineHeight);
        }
    }
}
export class ContentViewOverlays extends ViewOverlays {
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._contentWidth = layoutInfo.contentWidth;
        this.domNode.setHeight(0);
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._contentWidth = layoutInfo.contentWidth;
        return super.onConfigurationChanged(e) || true;
    }
    onScrollChanged(e) {
        return super.onScrollChanged(e) || e.scrollWidthChanged;
    }
    // --- end event handlers
    _viewOverlaysRender(ctx) {
        super._viewOverlaysRender(ctx);
        this.domNode.setWidth(Math.max(ctx.scrollWidth, this._contentWidth));
    }
}
export class MarginViewOverlays extends ViewOverlays {
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._contentLeft = layoutInfo.contentLeft;
        this.domNode.setClassName('margin-view-overlays');
        this.domNode.setWidth(1);
        applyFontInfo(this.domNode, options.get(52 /* EditorOption.fontInfo */));
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        applyFontInfo(this.domNode, options.get(52 /* EditorOption.fontInfo */));
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._contentLeft = layoutInfo.contentLeft;
        return super.onConfigurationChanged(e) || true;
    }
    onScrollChanged(e) {
        return super.onScrollChanged(e) || e.scrollHeightChanged;
    }
    _viewOverlaysRender(ctx) {
        super._viewOverlaysRender(ctx);
        const height = Math.min(ctx.scrollHeight, 1000000);
        this.domNode.setHeight(height);
        this.domNode.setWidth(this._contentLeft);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld092ZXJsYXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3T3ZlcmxheXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXhELE9BQU8sRUFBZ0Isc0JBQXNCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBUXhDLE1BQU0sT0FBTyxZQUFhLFNBQVEsUUFBUTtJQU16QyxZQUFZLE9BQW9CO1FBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUpQLHFCQUFnQixHQUF5QixFQUFFLENBQUE7UUFDM0MsZUFBVSxHQUFZLEtBQUssQ0FBQTtRQUtsQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksc0JBQXNCLENBQUM7WUFDL0MsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztTQUM1RCxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBRXpDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQTtRQUNuRCxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVyQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUMzQyxDQUFD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