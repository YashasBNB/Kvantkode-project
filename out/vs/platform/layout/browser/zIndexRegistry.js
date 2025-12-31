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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiekluZGV4UmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sYXlvdXQvYnJvd3Nlci96SW5kZXhSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWhFLE1BQU0sQ0FBTixJQUFZLE1BVVg7QUFWRCxXQUFZLE1BQU07SUFDakIsbUNBQVEsQ0FBQTtJQUNSLG9DQUFTLENBQUE7SUFDVCxzREFBa0IsQ0FBQTtJQUNsQixzQ0FBVSxDQUFBO0lBQ1YsZ0RBQWdCLENBQUE7SUFDaEIsMEVBQTZCLENBQUE7SUFDN0Isb0RBQWtCLENBQUE7SUFDbEIsb0RBQWtCLENBQUE7SUFDbEIsNkRBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQVZXLE1BQU0sS0FBTixNQUFNLFFBVWpCO0FBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7S0FDdEMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNwQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN6QixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDdkIsU0FBUyxRQUFRLENBQUMsQ0FBUztJQUMxQixLQUFLLE1BQU0sRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLENBQUE7QUFDVixDQUFDO0FBRUQsTUFBTSxjQUFjO0lBSW5CO1FBQ0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDMUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxjQUFjLENBQUMsYUFBcUIsRUFBRSxDQUFTLEVBQUUsSUFBWTtRQUM1RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSwrQkFBK0IsQ0FBQyxDQUFBO1FBQzFFLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3hDLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQ2QsbUJBQW1CLGFBQWEsZUFBZSxDQUFDLHVCQUF1QixjQUFjLEdBQUcsQ0FDeEYsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN6QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sYUFBYSxJQUFJLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDMUIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3ZDLFdBQVcsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxLQUFLLENBQUE7UUFDeEQsQ0FBQyxDQUFDLENBQUE7UUFDRixhQUFhLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDckQsQ0FBQztDQUNEO0FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtBQUUzQyxNQUFNLFVBQVUsY0FBYyxDQUFDLGFBQXFCLEVBQUUsQ0FBUyxFQUFFLElBQVk7SUFDNUUsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDN0QsQ0FBQyJ9