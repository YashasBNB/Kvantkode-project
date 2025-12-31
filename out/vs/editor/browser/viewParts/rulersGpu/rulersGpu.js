/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewPart } from '../../view/viewPart.js';
import { Color } from '../../../../base/common/color.js';
import { editorRuler } from '../../../common/core/editorColorRegistry.js';
import { autorun } from '../../../../base/common/observable.js';
/**
 * Rulers are vertical lines that appear at certain columns in the editor. There can be >= 0 rulers
 * at a time.
 */
export class RulersGpu extends ViewPart {
    constructor(context, _viewGpuContext) {
        super(context);
        this._viewGpuContext = _viewGpuContext;
        this._gpuShapes = [];
        this._register(autorun((reader) => this._updateEntries(reader)));
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        this._updateEntries(undefined);
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to read
    }
    render(ctx) {
        // Rendering is handled by RectangleRenderer
    }
    _updateEntries(reader) {
        const options = this._context.configuration.options;
        const rulers = options.get(107 /* EditorOption.rulers */);
        const typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        const devicePixelRatio = this._viewGpuContext.devicePixelRatio.read(reader);
        for (let i = 0, len = rulers.length; i < len; i++) {
            const ruler = rulers[i];
            const shape = this._gpuShapes[i];
            const color = ruler.color
                ? Color.fromHex(ruler.color)
                : (this._context.theme.getColor(editorRuler) ?? Color.white);
            const rulerData = [
                ruler.column * typicalHalfwidthCharacterWidth * devicePixelRatio,
                0,
                Math.max(1, Math.ceil(devicePixelRatio)),
                Number.MAX_SAFE_INTEGER,
                color.rgba.r / 255,
                color.rgba.g / 255,
                color.rgba.b / 255,
                color.rgba.a,
            ];
            if (!shape) {
                this._gpuShapes[i] = this._viewGpuContext.rectangleRenderer.register(...rulerData);
            }
            else {
                shape.setRaw(rulerData);
            }
        }
        while (this._gpuShapes.length > rulers.length) {
            this._gpuShapes.splice(-1, 1)[0].dispose();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZXJzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3J1bGVyc0dwdS9ydWxlcnNHcHUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBUWpELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU3RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sU0FBVSxTQUFRLFFBQVE7SUFHdEMsWUFDQyxPQUFvQixFQUNILGVBQStCO1FBRWhELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUZHLG9CQUFlLEdBQWYsZUFBZSxDQUFnQjtRQUpoQyxlQUFVLEdBQStELEVBQUUsQ0FBQTtRQU8zRixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELDJCQUEyQjtJQUVYLHNCQUFzQixDQUFDLENBQTJDO1FBQ2pGLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDOUIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQseUJBQXlCO0lBRWxCLGFBQWEsQ0FBQyxHQUFxQjtRQUN6QyxrQkFBa0I7SUFDbkIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUErQjtRQUM1Qyw0Q0FBNEM7SUFDN0MsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUEyQjtRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXFCLENBQUE7UUFDL0MsTUFBTSw4QkFBOEIsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FFakQsQ0FBQyw4QkFBOEIsQ0FBQTtRQUNoQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSztnQkFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3RCxNQUFNLFNBQVMsR0FBOEM7Z0JBQzVELEtBQUssQ0FBQyxNQUFNLEdBQUcsOEJBQThCLEdBQUcsZ0JBQWdCO2dCQUNoRSxDQUFDO2dCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLGdCQUFnQjtnQkFDdkIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ1osQ0FBQTtZQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUE7WUFDbkYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=