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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZXJzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvcnVsZXJzR3B1L3J1bGVyc0dwdS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFRakQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFnQixNQUFNLHVDQUF1QyxDQUFBO0FBRTdFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxTQUFVLFNBQVEsUUFBUTtJQUd0QyxZQUNDLE9BQW9CLEVBQ0gsZUFBK0I7UUFFaEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRkcsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBSmhDLGVBQVUsR0FBK0QsRUFBRSxDQUFBO1FBTzNGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FBMkM7UUFDakYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM5QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCx5QkFBeUI7SUFFbEIsYUFBYSxDQUFDLEdBQXFCO1FBQ3pDLGtCQUFrQjtJQUNuQixDQUFDO0lBRU0sTUFBTSxDQUFDLEdBQStCO1FBQzVDLDRDQUE0QztJQUM3QyxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQTJCO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRywrQkFBcUIsQ0FBQTtRQUMvQyxNQUFNLDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUVqRCxDQUFDLDhCQUE4QixDQUFBO1FBQ2hDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0UsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLO2dCQUN4QixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdELE1BQU0sU0FBUyxHQUE4QztnQkFDNUQsS0FBSyxDQUFDLE1BQU0sR0FBRyw4QkFBOEIsR0FBRyxnQkFBZ0I7Z0JBQ2hFLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLENBQUMsZ0JBQWdCO2dCQUN2QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHO2dCQUNsQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHO2dCQUNsQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHO2dCQUNsQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDWixDQUFBO1lBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQTtZQUNuRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==