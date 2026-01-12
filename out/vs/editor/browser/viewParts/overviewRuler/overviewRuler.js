/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { OverviewZoneManager, } from '../../../common/viewModel/overviewZoneManager.js';
import { ViewEventHandler } from '../../../common/viewEventHandler.js';
/**
 * The overview ruler appears underneath the editor scroll bar and shows things
 * like the cursor, various decorations, etc.
 */
export class OverviewRuler extends ViewEventHandler {
    constructor(context, cssClassName) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setClassName(cssClassName);
        this._domNode.setPosition('absolute');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        this._zoneManager = new OverviewZoneManager((lineNumber) => this._context.viewLayout.getVerticalOffsetForLineNumber(lineNumber));
        this._zoneManager.setDOMWidth(0);
        this._zoneManager.setDOMHeight(0);
        this._zoneManager.setOuterHeight(this._context.viewLayout.getScrollHeight());
        this._zoneManager.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
        this._zoneManager.setPixelRatio(options.get(149 /* EditorOption.pixelRatio */));
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
            this._zoneManager.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
            this._render();
        }
        if (e.hasChanged(149 /* EditorOption.pixelRatio */)) {
            this._zoneManager.setPixelRatio(options.get(149 /* EditorOption.pixelRatio */));
            this._domNode.setWidth(this._zoneManager.getDOMWidth());
            this._domNode.setHeight(this._zoneManager.getDOMHeight());
            this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
            this._domNode.domNode.height = this._zoneManager.getCanvasHeight();
            this._render();
        }
        return true;
    }
    onFlushed(e) {
        this._render();
        return true;
    }
    onScrollChanged(e) {
        if (e.scrollHeightChanged) {
            this._zoneManager.setOuterHeight(e.scrollHeight);
            this._render();
        }
        return true;
    }
    onZonesChanged(e) {
        this._render();
        return true;
    }
    // ---- end view event handlers
    getDomNode() {
        return this._domNode.domNode;
    }
    setLayout(position) {
        this._domNode.setTop(position.top);
        this._domNode.setRight(position.right);
        let hasChanged = false;
        hasChanged = this._zoneManager.setDOMWidth(position.width) || hasChanged;
        hasChanged = this._zoneManager.setDOMHeight(position.height) || hasChanged;
        if (hasChanged) {
            this._domNode.setWidth(this._zoneManager.getDOMWidth());
            this._domNode.setHeight(this._zoneManager.getDOMHeight());
            this._domNode.domNode.width = this._zoneManager.getCanvasWidth();
            this._domNode.domNode.height = this._zoneManager.getCanvasHeight();
            this._render();
        }
    }
    setZones(zones) {
        this._zoneManager.setZones(zones);
        this._render();
    }
    _render() {
        if (this._zoneManager.getOuterHeight() === 0) {
            return false;
        }
        const width = this._zoneManager.getCanvasWidth();
        const height = this._zoneManager.getCanvasHeight();
        const colorZones = this._zoneManager.resolveColorZones();
        const id2Color = this._zoneManager.getId2Color();
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        if (colorZones.length > 0) {
            this._renderOneLane(ctx, colorZones, id2Color, width);
        }
        return true;
    }
    _renderOneLane(ctx, colorZones, id2Color, width) {
        let currentColorId = 0;
        let currentFrom = 0;
        let currentTo = 0;
        for (const zone of colorZones) {
            const zoneColorId = zone.colorId;
            const zoneFrom = zone.from;
            const zoneTo = zone.to;
            if (zoneColorId !== currentColorId) {
                ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
                currentColorId = zoneColorId;
                ctx.fillStyle = id2Color[currentColorId];
                currentFrom = zoneFrom;
                currentTo = zoneTo;
            }
            else {
                if (currentTo >= zoneFrom) {
                    currentTo = Math.max(currentTo, zoneTo);
                }
                else {
                    ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
                    currentFrom = zoneFrom;
                    currentTo = zoneTo;
                }
            }
        }
        ctx.fillRect(0, currentFrom, width, currentTo - currentFrom);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdSdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL292ZXJ2aWV3UnVsZXIvb3ZlcnZpZXdSdWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUd4RixPQUFPLEVBR04sbUJBQW1CLEdBQ25CLE1BQU0sa0RBQWtELENBQUE7QUFHekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxnQkFBZ0I7SUFLbEQsWUFBWSxPQUFvQixFQUFFLFlBQW9CO1FBQ3JELEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBRW5ELElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxDQUFDLFVBQWtCLEVBQUUsRUFBRSxDQUNsRSxJQUFJLENB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