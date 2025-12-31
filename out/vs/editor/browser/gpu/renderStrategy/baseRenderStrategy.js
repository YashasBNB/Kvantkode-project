/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewEventHandler } from '../../../common/viewEventHandler.js';
export class BaseRenderStrategy extends ViewEventHandler {
    get glyphRasterizer() {
        return this._glyphRasterizer.value;
    }
    constructor(_context, _viewGpuContext, _device, _glyphRasterizer) {
        super();
        this._context = _context;
        this._viewGpuContext = _viewGpuContext;
        this._device = _device;
        this._glyphRasterizer = _glyphRasterizer;
        this._context.addEventHandler(this);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVJlbmRlclN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L3JlbmRlclN0cmF0ZWd5L2Jhc2VSZW5kZXJTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVF0RSxNQUFNLE9BQWdCLGtCQUFtQixTQUFRLGdCQUFnQjtJQUNoRSxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0lBQ25DLENBQUM7SUFNRCxZQUNvQixRQUFxQixFQUNyQixlQUErQixFQUMvQixPQUFrQixFQUNsQixnQkFBNEM7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFMWSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLG9CQUFlLEdBQWYsZUFBZSxDQUFnQjtRQUMvQixZQUFPLEdBQVAsT0FBTyxDQUFXO1FBQ2xCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBNEI7UUFJL0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUtEIn0=