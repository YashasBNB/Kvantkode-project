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
import * as nls from '../../../../nls.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { parseKeyboardLayoutDescription, areKeyboardLayoutsEqual, getKeyboardLayoutId, IKeyboardLayoutService, } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { KEYBOARD_LAYOUT_OPEN_PICKER } from '../common/preferences.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
let KeyboardLayoutPickerContribution = class KeyboardLayoutPickerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.keyboardLayoutPicker'; }
    constructor(keyboardLayoutService, statusbarService) {
        super();
        this.keyboardLayoutService = keyboardLayoutService;
        this.statusbarService = statusbarService;
        this.pickerElement = this._register(new MutableDisposable());
        const name = nls.localize('status.workbench.keyboardLayout', 'Keyboard Layout');
        const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
        if (layout) {
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            const text = nls.localize('keyboardLayout', 'Layout: {0}', layoutInfo.label);
            this.pickerElement.value = this.statusbarService.addEntry({
                name,
                text,
                ariaLabel: text,
                command: KEYBOARD_LAYOUT_OPEN_PICKER,
            }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
        }
        this._register(this.keyboardLayoutService.onDidChangeKeyboardLayout(() => {
            const layout = this.keyboardLayoutService.getCurrentKeyboardLayout();
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            if (this.pickerElement.value) {
                const text = nls.localize('keyboardLayout', 'Layout: {0}', layoutInfo.label);
                this.pickerElement.value.update({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER,
                });
            }
            else {
                const text = nls.localize('keyboardLayout', 'Layout: {0}', layoutInfo.label);
                this.pickerElement.value = this.statusbarService.addEntry({
                    name,
                    text,
                    ariaLabel: text,
                    command: KEYBOARD_LAYOUT_OPEN_PICKER,
                }, 'status.workbench.keyboardLayout', 1 /* StatusbarAlignment.RIGHT */);
            }
        }));
    }
};
KeyboardLayoutPickerContribution = __decorate([
    __param(0, IKeyboardLayoutService),
    __param(1, IStatusbarService)
], KeyboardLayoutPickerContribution);
export { KeyboardLayoutPickerContribution };
registerWorkbenchContribution2(KeyboardLayoutPickerContribution.ID, KeyboardLayoutPickerContribution, 1 /* WorkbenchPhase.BlockStartup */);
const DEFAULT_CONTENT = [
    `// ${nls.localize('displayLanguage', 'Defines the keyboard layout used in VS Code in the browser environment.')}`,
    `// ${nls.localize('doc', 'Open VS Code and run "Developer: Inspect Key Mappings (JSON)" from Command Palette.')}`,
    ``,
    `// Once you have the keyboard layout info, please paste it below.`,
    '\n',
].join('\n');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: KEYBOARD_LAYOUT_OPEN_PICKER,
            title: nls.localize2('keyboard.chooseLayout', 'Change Keyboard Layout'),
            f1: true,
        });
    }
    async run(accessor) {
        const keyboardLayoutService = accessor.get(IKeyboardLayoutService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const environmentService = accessor.get(IEnvironmentService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const layouts = keyboardLayoutService.getAllKeyboardLayouts();
        const currentLayout = keyboardLayoutService.getCurrentKeyboardLayout();
        const layoutConfig = configurationService.getValue('keyboard.layout');
        const isAutoDetect = layoutConfig === 'autodetect';
        const picks = layouts
            .map((layout) => {
            const picked = !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout);
            const layoutInfo = parseKeyboardLayoutDescription(layout);
            return {
                layout: layout,
                label: [
                    layoutInfo.label,
                    layout && layout.isUserKeyboardLayout ? '(User configured layout)' : '',
                ].join(' '),
                id: layout.text ||
                    layout.lang ||
                    layout.layout,
                description: layoutInfo.description + (picked ? ' (Current layout)' : ''),
                picked: !isAutoDetect && areKeyboardLayoutsEqual(currentLayout, layout),
            };
        })
            .sort((a, b) => {
            return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
        });
        if (picks.length > 0) {
            const platform = isMacintosh ? 'Mac' : isWindows ? 'Win' : 'Linux';
            picks.unshift({
                type: 'separator',
                label: nls.localize('layoutPicks', 'Keyboard Layouts ({0})', platform),
            });
        }
        const configureKeyboardLayout = {
            label: nls.localize('configureKeyboardLayout', 'Configure Keyboard Layout'),
        };
        picks.unshift(configureKeyboardLayout);
        // Offer to "Auto Detect"
        const autoDetectMode = {
            label: nls.localize('autoDetect', 'Auto Detect'),
            description: isAutoDetect
                ? `Current: ${parseKeyboardLayoutDescription(currentLayout).label}`
                : undefined,
            picked: isAutoDetect ? true : undefined,
        };
        picks.unshift(autoDetectMode);
        const pick = await quickInputService.pick(picks, {
            placeHolder: nls.localize('pickKeyboardLayout', 'Select Keyboard Layout'),
            matchOnDescription: true,
        });
        if (!pick) {
            return;
        }
        if (pick === autoDetectMode) {
            // set keymap service to auto mode
            configurationService.updateValue('keyboard.layout', 'autodetect');
            return;
        }
        if (pick === configureKeyboardLayout) {
            const file = environmentService.keyboardLayoutResource;
            await fileService
                .stat(file)
                .then(undefined, () => {
                return fileService.createFile(file, VSBuffer.fromString(DEFAULT_CONTENT));
            })
                .then((stat) => {
                if (!stat) {
                    return undefined;
                }
                return editorService.openEditor({
                    resource: stat.resource,
                    languageId: 'jsonc',
                    options: { pinned: true },
                });
            }, (error) => {
                throw new Error(nls.localize('fail.createSettings', "Unable to create '{0}' ({1}).", file.toString(), error));
            });
            return Promise.resolve();
        }
        configurationService.updateValue('keyboard.layout', getKeyboardLayoutId(pick.layout));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJvYXJkTGF5b3V0UGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQ04sOEJBQThCLEVBQzlCLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBRXRCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUVOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFF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