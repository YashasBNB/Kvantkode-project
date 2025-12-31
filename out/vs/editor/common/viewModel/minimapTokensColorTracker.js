/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable, markAsSingleton } from '../../../base/common/lifecycle.js';
import { RGBA8 } from '../core/rgba.js';
import { TokenizationRegistry } from '../languages.js';
export class MinimapTokensColorTracker extends Disposable {
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!this._INSTANCE) {
            this._INSTANCE = markAsSingleton(new MinimapTokensColorTracker());
        }
        return this._INSTANCE;
    }
    constructor() {
        super();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._updateColorMap();
        this._register(TokenizationRegistry.onDidChange((e) => {
            if (e.changedColorMap) {
                this._updateColorMap();
            }
        }));
    }
    _updateColorMap() {
        const colorMap = TokenizationRegistry.getColorMap();
        if (!colorMap) {
            this._colors = [RGBA8.Empty];
            this._backgroundIsLight = true;
            return;
        }
        this._colors = [RGBA8.Empty];
        for (let colorId = 1; colorId < colorMap.length; colorId++) {
            const source = colorMap[colorId].rgba;
            // Use a VM friendly data-type
            this._colors[colorId] = new RGBA8(source.r, source.g, source.b, Math.round(source.a * 255));
        }
        const backgroundLuminosity = colorMap[2 /* ColorId.DefaultBackground */].getRelativeLuminance();
        this._backgroundIsLight = backgroundLuminosity >= 0.5;
        this._onDidChange.fire(undefined);
    }
    getColor(colorId) {
        if (colorId < 1 || colorId >= this._colors.length) {
            // background color (basically invisible)
            colorId = 2 /* ColorId.DefaultBackground */;
        }
        return this._colors[colorId];
    }
    backgroundIsLight() {
        return this._backgroundIsLight;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcFRva2Vuc0NvbG9yVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL21pbmltYXBUb2tlbnNDb2xvclRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBR3RELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO2FBQ3pDLGNBQVMsR0FBcUMsSUFBSSxBQUF6QyxDQUF5QztJQUMxRCxNQUFNLENBQUMsV0FBVztRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUkseUJBQXlCLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQVFEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFKUyxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDbkMsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFJakUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25ELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsS0FBSyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUM1RCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQ3JDLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVGLENBQUM7UUFDRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsbUNBQTJCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUN2RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsb0JBQW9CLElBQUksR0FBRyxDQUFBO1FBQ3JELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFTSxRQUFRLENBQUMsT0FBZ0I7UUFDL0IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25ELHlDQUF5QztZQUN6QyxPQUFPLG9DQUE0QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtJQUMvQixDQUFDIn0=