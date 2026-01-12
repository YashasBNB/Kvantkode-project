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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRTZXR0aW5nc1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0Ms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