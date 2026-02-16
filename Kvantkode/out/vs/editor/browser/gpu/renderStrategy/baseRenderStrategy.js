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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVJlbmRlclN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVuZGVyU3RyYXRlZ3kvYmFzZVJlbmRlclN0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBUXRFLE1BQU0sT0FBZ0Isa0JBQW1CLFNBQVEsZ0JBQWdCO0lBQ2hFLElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQU1ELFlBQ29CLFFBQXFCLEVBQ3JCLGVBQStCLEVBQy9CLE9BQWtCLEVBQ2xCLGdCQUE0QztRQUUvRCxLQUFLLEVBQUUsQ0FBQTtRQUxZLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQy9CLFlBQU8sR0FBUCxPQUFPLENBQVc7UUFDbEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUE0QjtRQUkvRCxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0NBS0QifQ==