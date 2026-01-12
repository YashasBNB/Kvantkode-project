/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { clearNode } from '../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
export var ZIndex;
(function (ZIndex) {
    ZIndex[ZIndex["Base"] = 0] = "Base";
    ZIndex[ZIndex["Sash"] = 35] = "Sash";
    ZIndex[ZIndex["SuggestWidget"] = 40] = "SuggestWidget";
    ZIndex[ZIndex["Hover"] = 50] = "Hover";
    ZIndex[ZIndex["DragImage"] = 1000] = "DragImage";
    ZIndex[ZIndex["MenubarMenuItemsHolder"] = 2000] = "MenubarMenuItemsHolder";
    ZIndex[ZIndex["ContextView"] = 2500] = "ContextView";
    ZIndex[ZIndex["ModalDialog"] = 2600] = "ModalDialog";
    ZIndex[ZIndex["PaneDropOverlay"] = 10000] = "PaneDropOverlay";
})(ZIndex || (ZIndex = {}));
const ZIndexValues = Object.keys(ZIndex)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => Number(key))
    .sort((a, b) => b - a);
function findBase(z) {
    for (const zi of ZIndexValues) {
        if (z >= zi) {
            return zi;
        }
    }
    return -1;
}
class ZIndexRegistry {
    constructor() {
        this.styleSheet = createStyleSheet();
        this.zIndexMap = new Map();
        this.scheduler = new RunOnceScheduler(() => this.updateStyleElement(), 200);
    }
    registerZIndex(relativeLayer, z, name) {
        if (this.zIndexMap.get(name)) {
            throw new Error(`z-index with name ${name} has already been registered.`);
        }
        const proposedZValue = relativeLayer + z;
        if (findBase(proposedZValue) !== relativeLayer) {
            throw new Error(`Relative layer: ${relativeLayer} + z-index: ${z} exceeds next layer ${proposedZValue}.`);
        }
        this.zIndexMap.set(name, proposedZValue);
        this.scheduler.schedule();
        return this.getVarName(name);
    }
    getVarName(name) {
        return `--z-index-${name}`;
    }
    updateStyleElement() {
        clearNode(this.styleSheet);
        let ruleBuilder = '';
        this.zIndexMap.forEach((zIndex, name) => {
            ruleBuilder += `${this.getVarName(name)}: ${zIndex};\n`;
        });
        createCSSRule(':root', ruleBuilder, this.styleSheet);
    }
}
const zIndexRegistry = new ZIndexRegistry();
export function registerZIndex(relativeLayer, z, name) {
    return zIndexRegistry.registerZIndex(relativeLayer, z, name);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiekluZGV4UmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xheW91dC9icm93c2VyL3pJbmRleFJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFaEUsTUFBTSxDQUFOLElBQVksTUFVWDtBQVZELFdBQVksTUFBTTtJQUNqQixtQ0FBUSxDQUFBO0lBQ1Isb0NBQVMsQ0FBQTtJQUNULHNEQUFrQixDQUFBO0lBQ2xCLHNDQUFVLENBQUE7SUFDVixnREFBZ0IsQ0FBQTtJQUNoQiwwRUFBNkIsQ0FBQTtJQUM3QixvREFBa0IsQ0FBQTtJQUNsQixvREFBa0IsQ0FBQTtJQUNsQiw2REFBdUIsQ0FBQTtBQUN4QixDQUFDLEVBVlcsTUFBTSxLQUFOLE1BQU0sUUFVakI7QUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztLQUN0QyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3BDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUN2QixTQUFTLFFBQVEsQ0FBQyxDQUFTO0lBQzFCLEtBQUssTUFBTSxFQUFFLElBQUksWUFBWSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQTtBQUNWLENBQUM7QUFFRCxNQUFNLGNBQWM7SUFJbkI7UUFDQyxJQUFJLENBQUMsVUFBVSxHQUFHLGdCQUFnQixFQUFFLENBQUE7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUMxQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVELGNBQWMsQ0FBQyxhQUFxQixFQUFFLENBQVMsRUFBRSxJQUFZO1FBQzVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixJQUFJLCtCQUErQixDQUFDLENBQUE7UUFDMUUsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDeEMsSUFBSSxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FDZCxtQkFBbUIsYUFBYSxlQUFlLENBQUMsdUJBQXVCLGNBQWMsR0FBRyxDQUN4RixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQVk7UUFDOUIsT0FBTyxhQUFhLElBQUksRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMxQixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdkMsV0FBVyxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLEtBQUssQ0FBQTtRQUN4RCxDQUFDLENBQUMsQ0FBQTtRQUNGLGFBQWEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO0FBRTNDLE1BQU0sVUFBVSxjQUFjLENBQUMsYUFBcUIsRUFBRSxDQUFTLEVBQUUsSUFBWTtJQUM1RSxPQUFPLGNBQWMsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM3RCxDQUFDIn0=