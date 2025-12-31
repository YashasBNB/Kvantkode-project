/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append } from '../../dom.js';
import { format } from '../../../common/strings.js';
import './countBadge.css';
import { Disposable, MutableDisposable, toDisposable, } from '../../../common/lifecycle.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
export const unthemedCountStyles = {
    badgeBackground: '#4D4D4D',
    badgeForeground: '#FFFFFF',
    badgeBorder: undefined,
};
export class CountBadge extends Disposable {
    constructor(container, options, styles) {
        super();
        this.options = options;
        this.styles = styles;
        this.count = 0;
        this.hover = this._register(new MutableDisposable());
        this.element = append(container, $('.monaco-count-badge'));
        this._register(toDisposable(() => container.removeChild(this.element)));
        this.countFormat = this.options.countFormat || '{0}';
        this.titleFormat = this.options.titleFormat || '';
        this.setCount(this.options.count || 0);
        this.updateHover();
    }
    setCount(count) {
        this.count = count;
        this.render();
    }
    setCountFormat(countFormat) {
        this.countFormat = countFormat;
        this.render();
    }
    setTitleFormat(titleFormat) {
        this.titleFormat = titleFormat;
        this.updateHover();
        this.render();
    }
    updateHover() {
        if (this.titleFormat !== '' && !this.hover.value) {
            this.hover.value = getBaseLayerHoverDelegate().setupDelayedHoverAtMouse(this.element, () => ({
                content: format(this.titleFormat, this.count),
                appearance: { compact: true },
            }));
        }
        else if (this.titleFormat === '' && this.hover.value) {
            this.hover.value = undefined;
        }
    }
    render() {
        this.element.textContent = format(this.countFormat, this.count);
        this.element.style.backgroundColor = this.styles.badgeBackground ?? '';
        this.element.style.color = this.styles.badgeForeground ?? '';
        if (this.styles.badgeBorder) {
            this.element.style.border = `1px solid ${this.styles.badgeBorder}`;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY291bnRCYWRnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9jb3VudEJhZGdlL2NvdW50QmFkZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDeEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ25ELE9BQU8sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUNOLFVBQVUsRUFFVixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFjdEUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQXNCO0lBQ3JELGVBQWUsRUFBRSxTQUFTO0lBQzFCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLFdBQVcsRUFBRSxTQUFTO0NBQ3RCLENBQUE7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLFVBQVU7SUFPekMsWUFDQyxTQUFzQixFQUNMLE9BQTJCLEVBQzNCLE1BQXlCO1FBRTFDLEtBQUssRUFBRSxDQUFBO1FBSFUsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7UUFDM0IsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7UUFSbkMsVUFBSyxHQUFXLENBQUMsQ0FBQTtRQUdSLFVBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQWUsQ0FBQyxDQUFBO1FBUTVFLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxX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