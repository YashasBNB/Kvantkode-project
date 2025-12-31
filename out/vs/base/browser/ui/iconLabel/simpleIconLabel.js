/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { reset } from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from './iconLabels.js';
export class SimpleIconLabel {
    constructor(_container) {
        this._container = _container;
    }
    set text(text) {
        reset(this._container, ...renderLabelWithIcons(text ?? ''));
    }
    set title(title) {
        if (!this.hover && title) {
            this.hover = getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this._container, title);
        }
        else if (this.hover) {
            this.hover.update(title);
        }
    }
    dispose() {
        this.hover?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlSWNvbkxhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ljb25MYWJlbC9zaW1wbGVJY29uTGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVwQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUd0RCxNQUFNLE9BQU8sZUFBZTtJQUczQixZQUE2QixVQUF1QjtRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO0lBQUcsQ0FBQztJQUV4RCxJQUFJLElBQUksQ0FBQyxJQUFZO1FBQ3BCLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyx5QkFBeUIsRUFBRSxDQUFDLGlCQUFpQixDQUN6RCx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFDaEMsSUFBSSxDQUFDLFVBQVUsRUFDZixLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7Q0FDRCJ9