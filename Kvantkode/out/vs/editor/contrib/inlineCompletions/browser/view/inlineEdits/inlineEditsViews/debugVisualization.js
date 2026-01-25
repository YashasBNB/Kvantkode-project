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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9kZWJ1Z1Zpc3VhbGl6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFXLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFPMUYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQVksRUFBRSxhQUFtQztJQUNqRixDQUFDO0lBQUMsSUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsYUFBYSxDQUFBO0FBQ2xELENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQTJCLEVBQUUsSUFBaUI7SUFDM0UsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDNUQsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFVLEVBQUUsSUFBaUIsRUFBRSxJQUFZO0lBQ3ZFLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNoRSxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFFRCxNQUFNLGtCQUFrQjtJQUN2QixZQUNrQixNQUE0QixFQUM1QixLQUFrQjtRQURsQixXQUFNLEdBQU4sTUFBTSxDQUFzQjtRQUM1QixVQUFLLEdBQUwsS0FBSyxDQUFhO0lBQ2pDLENBQUM7SUFFSixTQUFTO1FBQ1IsTUFBTSxDQUFDLEdBQWtCLEVBQUUsQ0FBQTtRQUMzQixLQUFLLE1BQU0sR0FB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