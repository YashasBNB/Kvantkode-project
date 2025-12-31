/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VoidSettingsPane_1;
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import * as nls from '../../../../nls.js';
import { EditorExtensions } from '../../../common/editor.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { mountVoidSettings } from './react/out/void-settings-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
// refer to preferences.contribution.ts keybindings editor
class VoidSettingsInput extends EditorInput {
    static { this.ID = 'workbench.input.void.settings'; }
    static { this.RESOURCE = URI.from({
        // I think this scheme is invalid, it just shuts up TS
        scheme: 'void', // Custom scheme for our editor (try Schemas.https)
        path: 'settings',
    }); }
    constructor() {
        super();
        this.resource = VoidSettingsInput.RESOURCE;
    }
    get typeId() {
        return VoidSettingsInput.ID;
    }
    getName() {
        return nls.localize('voidSettingsInputsName', "KvantKode's Settings");
    }
    getIcon() {
        return Codicon.checklist; // symbol for the actual editor pane
    }
}
let VoidSettingsPane = class VoidSettingsPane extends EditorPane {
    static { VoidSettingsPane_1 = this; }
    static { this.ID = 'workbench.test.myCustomPane'; }
    // private _scrollbar: DomScrollableElement | undefined;
    constructor(group, telemetryService, themeService, storageService, instantiationService) {
        super(VoidSettingsPane_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
    }
    createEditor(parent) {
        parent.style.height = '100%';
        parent.style.width = '100%';
        const settingsElt = document.createElement('div');
        settingsElt.style.height = '100%';
        settingsElt.style.width = '100%';
        parent.appendChild(settingsElt);
        // this._scrollbar = this._register(new DomScrollableElement(scrollableContent, {}));
        // parent.appendChild(this._scrollbar.getDomNode());
        // this._scrollbar.scanDomNode();
        // Mount React into the scrollable content
        this.instantiationService.invokeFunction((accessor) => {
            const disposeFn = mountVoidSettings(settingsElt, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
            // setTimeout(() => { // this is a complete hack and I don't really understand how scrollbar works here
            // 	this._scrollbar?.scanDomNode();
            // }, 1000)
        });
    }
    layout(dimension) {
        // if (!settingsElt) return
        // settingsElt.style.height = `${dimension.height}px`;
        // settingsElt.style.width = `${dimension.width}px`;
    }
    get minimumWidth() {
        return 700;
    }
};
VoidSettingsPane = VoidSettingsPane_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService)
], VoidSettingsPane);
// register Settings pane
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(VoidSettingsPane, VoidSettingsPane.ID, nls.localize('VoidSettingsPane', "KvantKode\'s Settings Pane")), [new SyncDescriptor(VoidSettingsInput)]);
// register the gear on the top right
export const VOID_TOGGLE_SETTINGS_ACTION_ID = 'workbench.action.toggleVoidSettings';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_TOGGLE_SETTINGS_ACTION_ID,
            title: nls.localize2('voidSettings', 'KvantKode: Toggle Settings'),
            icon: Codicon.settingsGear,
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: 'z_end',
                },
                {
                    id: MenuId.LayoutControlMenu,
                    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both'),
                    group: 'z_end',
                },
            ],
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const instantiationService = accessor.get(IInstantiationService);
        // if is open, close it
        const openEditors = editorService.findEditors(VoidSettingsInput.RESOURCE); // should only have 0 or 1 elements...
        if (openEditors.length !== 0) {
            const openEditor = openEditors[0].editor;
            const isCurrentlyOpen = editorService.activeEditor?.resource?.fsPath === openEditor.resource?.fsPath;
            if (isCurrentlyOpen)
                await editorService.closeEditors(openEditors);
            else
                await editorGroupService.activeGroup.openEditor(openEditor);
            return;
        }
        // else open it
        const input = instantiationService.createInstance(VoidSettingsInput);
        await editorGroupService.activeGroup.openEditor(input);
    }
});
export const VOID_OPEN_SETTINGS_ACTION_ID = 'workbench.action.openVoidSettings';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_OPEN_SETTINGS_ACTION_ID,
            title: nls.localize2('voidSettingsAction2', 'KvantKode: Open Settings'),
            f1: true,
            icon: Codicon.settingsGear,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        // close all instances if found
        const openEditors = editorService.findEditors(VoidSettingsInput.RESOURCE);
        if (openEditors.length > 0) {
            await editorService.closeEditors(openEditors);
        }
        // then, open one single editor
        const input = instantiationService.createInstance(VoidSettingsInput);
        await editorService.openEditor(input);
    }
});
// add to settings gear on bottom left
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    group: '0_command',
    command: {
        id: VOID_TOGGLE_SETTINGS_ACTION_ID,
        title: nls.localize('voidSettingsActionGear', "KvantKode's Settings"),
    },
    order: 1,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkU2V0dGluZ3NQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEUsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFaEYsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbkUsMERBQTBEO0FBRTFELE1BQU0saUJBQWtCLFNBQVEsV0FBVzthQUMxQixPQUFFLEdBQVcsK0JBQStCLEFBQTFDLENBQTBDO2FBRTVDLGFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ25DLHNEQUFzRDtRQUN0RCxNQUFNLEVBQUUsTUFBTSxFQUFFLG1EQUFtRDtRQUNuRSxJQUFJLEVBQUUsVUFBVTtLQUNoQixDQUFDLEFBSnNCLENBSXRCO0lBR0Y7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUhDLGFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUE7SUFJOUMsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLGlCQUFpQixDQUFDLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFBLENBQUMsb0NBQW9DO0lBQzlELENBQUM7O0FBR0YsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVOzthQUN4QixPQUFFLEdBQUcsNkJBQTZCLEFBQWhDLENBQWdDO0lBRWxELHdEQUF3RDtJQUV4RCxZQUNDLEtBQW1CLEVBQ0EsZ0JBQW1DLEVBQ3ZDLFlBQTJCLEVBQ3pCLGNBQStCLEVBQ1Isb0JBQTJDO1FBRW5GLEtBQUssQ0FBQyxrQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUZ6Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBR3BGLENBQUM7SUFFUyxZQUFZLENBQUMsTUFBbUI7UUFDekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQTtRQUUzQixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pELFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNqQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUE7UUFFaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUUvQixxRkFBcUY7UUFDckYsb0RBQW9EO1FBQ3BELGlDQUFpQztRQUVqQywwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3JELE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUE7WUFDbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFakQsdUdBQXVHO1lBQ3ZHLG1DQUFtQztZQUNuQyxXQUFXO1FBQ1osQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQW9CO1FBQzFCLDJCQUEyQjtRQUMzQixzREFBc0Q7UUFDdEQsb0RBQW9EO0lBQ3JELENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDOztBQWhESSxnQkFBZ0I7SUFPbkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQVZsQixnQkFBZ0IsQ0FpRHJCO0FBRUQseUJBQXlCO0FBQ3pCLFFBQVEsQ0FBQyxFQUFFLENBQXNCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxNQUFNLENBQzFCLGdCQUFnQixFQUNoQixnQkFBZ0IsQ0FBQyxFQUFFLEVBQ25CLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsNEJBQTRCLENBQUMsQ0FDOUQsRUFDRCxDQUFDLElBQUksY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FDdkMsQ0FBQTtBQUVELHFDQUFxQztBQUNyQyxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxxQ0FBcUMsQ0FBQTtBQUNuRixlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOEJBQThCO1lBQ2xDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSw0QkFBNEIsQ0FBQztZQUNsRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDMUIsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsd0JBQXdCO29CQUNuQyxLQUFLLEVBQUUsT0FBTztpQkFDZDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtvQkFDNUIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMscUNBQXFDLEVBQUUsTUFBTSxDQUFDO29CQUMxRSxLQUFLLEVBQUUsT0FBTztpQkFDZDthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUU3RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUVoRSx1QkFBdUI7UUFDdkIsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQSxDQUFDLHNDQUFzQztRQUNoSCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUN4QyxNQUFNLGVBQWUsR0FDcEIsYUFBYSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxLQUFLLFVBQVUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFBO1lBQzdFLElBQUksZUFBZTtnQkFBRSxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUE7O2dCQUM3RCxNQUFNLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDaEUsT0FBTTtRQUNQLENBQUM7UUFFRCxlQUFlO1FBQ2YsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFcEUsTUFBTSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxtQ0FBbUMsQ0FBQTtBQUMvRSxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDO1lBQ3ZFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1NBQzFCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsK0JBQStCO1FBQy9CLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekUsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsc0NBQXNDO0FBQ3RDLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxLQUFLLEVBQUUsV0FBVztJQUNsQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsOEJBQThCO1FBQ2xDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHNCQUFzQixDQUFDO0tBQ3JFO0lBQ0QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUEifQ==