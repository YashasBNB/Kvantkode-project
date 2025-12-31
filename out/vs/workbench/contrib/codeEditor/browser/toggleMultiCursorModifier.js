/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
export class ToggleMultiCursorModifierAction extends Action2 {
    static { this.ID = 'workbench.action.toggleMultiCursorModifier'; }
    static { this.multiCursorModifierConfigurationKey = 'editor.multiCursorModifier'; }
    constructor() {
        super({
            id: ToggleMultiCursorModifierAction.ID,
            title: localize2('toggleLocation', 'Toggle Multi-Cursor Modifier'),
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const editorConf = configurationService.getValue('editor');
        const newValue = editorConf.multiCursorModifier === 'ctrlCmd' ? 'alt' : 'ctrlCmd';
        return configurationService.updateValue(ToggleMultiCursorModifierAction.multiCursorModifierConfigurationKey, newValue);
    }
}
const multiCursorModifier = new RawContextKey('multiCursorModifier', 'altKey');
let MultiCursorModifierContextKeyController = class MultiCursorModifierContextKeyController extends Disposable {
    constructor(configurationService, contextKeyService) {
        super();
        this.configurationService = configurationService;
        this._multiCursorModifier = multiCursorModifier.bindTo(contextKeyService);
        this._update();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.multiCursorModifier')) {
                this._update();
            }
        }));
    }
    _update() {
        const editorConf = this.configurationService.getValue('editor');
        const value = editorConf.multiCursorModifier === 'ctrlCmd' ? 'ctrlCmd' : 'altKey';
        this._multiCursorModifier.set(value);
    }
};
MultiCursorModifierContextKeyController = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextKeyService)
], MultiCursorModifierContextKeyController);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(MultiCursorModifierContextKeyController, 3 /* LifecyclePhase.Restored */);
registerAction2(ToggleMultiCursorModifierAction);
MenuRegistry.appendMenuItem(MenuId.MenubarSelectionMenu, {
    group: '4_config',
    command: {
        id: ToggleMultiCursorModifierAction.ID,
        title: localize('miMultiCursorAlt', 'Switch to Alt+Click for Multi-Cursor'),
    },
    when: multiCursorModifier.isEqualTo('ctrlCmd'),
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSelectionMenu, {
    group: '4_config',
    command: {
        id: ToggleMultiCursorModifierAction.ID,
        title: isMacintosh
            ? localize('miMultiCursorCmd', 'Switch to Cmd+Click for Multi-Cursor')
            : localize('miMultiCursorCtrl', 'Switch to Ctrl+Click for Multi-Cursor'),
    },
    when: multiCursorModifier.isEqualTo('altKey'),
    order: 1,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlTXVsdGlDdXJzb3JNb2RpZmllci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVNdWx0aUN1cnNvck1vZGlmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd6QyxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsT0FBTzthQUMzQyxPQUFFLEdBQUcsNENBQTRDLENBQUE7YUFFekMsd0NBQW1DLEdBQUcsNEJBQTRCLENBQUE7SUFFMUY7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCLENBQUMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLDhCQUE4QixDQUFDO1lBQ2xFLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEdB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