/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derivedWithStore } from '../../../../../../../base/common/observable.js';
export function setVisualization(data, visualization) {
    ;
    data['$$visualization'] = visualization;
}
export function debugLogRects(rects, elem) {
    setVisualization(rects, new ManyRectVisualizer(rects, elem));
    return rects;
}
export function debugLogRect(rect, elem, name) {
    setVisualization(rect, new HtmlRectVisualizer(rect, elem, name));
    return rect;
}
class ManyRectVisualizer {
    constructor(_rects, _elem) {
        this._rects = _rects;
        this._elem = _elem;
    }
    visualize() {
        const d = [];
        for (const key in this._rects) {
            const v = new HtmlRectVisualizer(this._rects[key], this._elem, key);
            d.push(v.visualize());
        }
        return {
            dispose: () => {
                d.forEach((d) => d.dispose());
            },
        };
    }
}
class HtmlRectVisualizer {
    constructor(_rect, _elem, _name) {
        this._rect = _rect;
        this._elem = _elem;
        this._name = _name;
    }
    visualize() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.border = '1px solid red';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '100000';
        const label = document.createElement('div');
        label.textContent = this._name;
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '0';
        label.style.color = 'red';
        label.style.fontSize = '12px';
        label.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        div.appendChild(label);
        const updatePosition = () => {
            const elemRect = this._elem.getBoundingClientRect();
            console.log(elemRect);
            div.style.left = elemRect.left + this._rect.left + 'px';
            div.style.top = elemRect.top + this._rect.top + 'px';
            div.style.width = this._rect.width + 'px';
            div.style.height = this._rect.height + 'px';
        };
        // This is for debugging only
        // eslint-disable-next-line no-restricted-syntax
        document.body.appendChild(div);
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        observer.observe(this._elem);
        return {
            dispose: () => {
                observer.disconnect();
                div.remove();
            },
        };
    }
}
export function debugView(value, reader) {
    if (typeof value === 'object' && value && '$$visualization' in value) {
        const vis = value['$$visualization'];
        debugReadDisposable(vis.visualize(), reader);
    }
}
function debugReadDisposable(d, reader) {
    derivedWithStore((_reader, store) => {
        store.add(d);
        return undefined;
    }).read(reader);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvZGVidWdWaXN1YWxpemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBVyxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBTzFGLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsYUFBbUM7SUFDakYsQ0FBQztJQUFDLElBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQTtBQUNsRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUEyQixFQUFFLElBQWlCO0lBQzNFLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLGtCQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsSUFBVSxFQUFFLElBQWlCLEVBQUUsSUFBWTtJQUN2RSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDaEUsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsTUFBTSxrQkFBa0I7SUFDdkIsWUFDa0IsTUFBNEIsRUFDNUIsS0FBa0I7UUFEbEIsV0FBTSxHQUFOLE1BQU0sQ0FBc0I7UUFDNUIsVUFBSyxHQUFMLEtBQUssQ0FBYTtJQUNqQyxDQUFDO0lBRUosU0FBUztRQUNSLE1BQU0sQ0FBQyxHQUFrQixFQUFFLENBQUE7UUFDM0IsS0FBSyxNQUFNLEdBQUcsSUFB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