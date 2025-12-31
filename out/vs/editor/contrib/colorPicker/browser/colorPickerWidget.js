/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './colorPicker.css';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import * as dom from '../../../../base/browser/dom.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { ColorPickerBody } from './colorPickerParts/colorPickerBody.js';
import { ColorPickerHeader } from './colorPickerParts/colorPickerHeader.js';
const $ = dom.$;
export class ColorPickerWidget extends Widget {
    static { this.ID = 'editor.contrib.colorPickerWidget'; }
    constructor(container, model, pixelRatio, themeService, type) {
        super();
        this.model = model;
        this.pixelRatio = pixelRatio;
        this._register(PixelRatio.getInstance(dom.getWindow(container)).onDidChange(() => this.layout()));
        this._domNode = $('.colorpicker-widget');
        container.appendChild(this._domNode);
        this.header = this._register(new ColorPickerHeader(this._domNode, this.model, themeService, type));
        this.body = this._register(new ColorPickerBody(this._domNode, this.model, this.pixelRatio, type));
    }
    getId() {
        return ColorPickerWidget.ID;
    }
    layout() {
        this.body.layout();
    }
    get domNode() {
        return this._domNode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yUGlja2VyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUczRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRWYsTUFBTSxPQUFPLGlCQUFrQixTQUFRLE1BQU07YUFDcEIsT0FBRSxHQUFHLGtDQUFrQyxDQUFBO0lBTS9ELFlBQ0MsU0FBZSxFQUNOLEtBQXVCLEVBQ3hCLFVBQWtCLEVBQzFCLFlBQTJCLEVBQzNCLElBQTJCO1FBRTNCLEtBQUssRUFBRSxDQUFBO1FBTEUsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDeEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQU0xQixJQUFJLENBQUMsU0FBUyxDQUNiLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDakYsQ0FBQTtRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDeEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQ3BFLENBQUE7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3pCLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUNyRSxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLGlCQUFpQixDQUFDLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDIn0=