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
import * as aria from '../../../base/browser/ui/aria/aria.js';
import { Disposable, toDisposable, DisposableStore, } from '../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../browser/widget/codeEditor/codeEditorWidget.js';
import { InternalEditorAction } from '../../common/editorAction.js';
import { StandaloneKeybindingService, updateConfigurationService } from './standaloneServices.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { MenuId, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService, } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { StandaloneCodeEditorNLS } from '../../common/standaloneStrings.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IEditorProgressService } from '../../../platform/progress/common/progress.js';
import { IModelService } from '../../common/services/model.js';
import { ILanguageService } from '../../common/languages/language.js';
import { StandaloneCodeEditorService } from './standaloneCodeEditorService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { DiffEditorWidget } from '../../browser/widget/diffEditor/diffEditorWidget.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { mainWindow } from '../../../base/browser/window.js';
import { setHoverDelegateFactory } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../platform/hover/browser/hover.js';
import { setBaseLayerHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegate2.js';
let LAST_GENERATED_COMMAND_ID = 0;
let ariaDomNodeCreated = false;
/**
 * Create ARIA dom node inside parent,
 * or only for the first editor instantiation inside document.body.
 * @param parent container element for ARIA dom node
 */
function createAriaDomNode(parent) {
    if (!parent) {
        if (ariaDomNodeCreated) {
            return;
        }
        ariaDomNodeCreated = true;
    }
    aria.setARIAContainer(parent || mainWindow.document.body);
}
/**
 * A code editor to be used both by the standalone editor and the standalone diff editor.
 */
let StandaloneCodeEditor = class StandaloneCodeEditor extends CodeEditorWidget {
    constructor(domElement, _options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        const options = { ..._options };
        options.ariaLabel = options.ariaLabel || StandaloneCodeEditorNLS.editorViewAccessibleLabel;
        super(domElement, options, {}, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        if (keybindingService instanceof StandaloneKeybindingService) {
            this._standaloneKeybindingService = keybindingService;
        }
        else {
            this._standaloneKeybindingService = null;
        }
        createAriaDomNode(options.ariaContainerElement);
        setHoverDelegateFactory((placement, enableInstantHover) => instantiationService.createInstance(WorkbenchHoverDelegate, placement, { instantHover: enableInstantHover }, {}));
        setBaseLayerHoverDelegate(hoverService);
    }
    addCommand(keybinding, handler, context) {
        if (!this._standaloneKeybindingService) {
            console.warn('Cannot add command because the editor is configured with an unrecognized KeybindingService');
            return null;
        }
        const commandId = 'DYNAMIC_' + ++LAST_GENERATED_COMMAND_ID;
        const whenExpression = ContextKeyExpr.deserialize(context);
        this._standaloneKeybindingService.addDynamicKeybinding(commandId, keybinding, handler, whenExpression);
        return commandId;
    }
    createContextKey(key, defaultValue) {
        return this._contextKeyService.createKey(key, defaultValue);
    }
    addAction(_descriptor) {
        if (typeof _descriptor.id !== 'string' ||
            typeof _descriptor.label !== 'string' ||
            typeof _descriptor.run !== 'function') {
            throw new Error('Invalid action descriptor, `id`, `label` and `run` are required properties!');
        }
        if (!this._standaloneKeybindingService) {
            console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
            return Disposable.None;
        }
        // Read descriptor options
        const id = _descriptor.id;
        const label = _descriptor.label;
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals('editorId', this.getId()), ContextKeyExpr.deserialize(_descriptor.precondition));
        const keybindings = _descriptor.keybindings;
        const keybindingsWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(_descriptor.keybindingContext));
        const contextMenuGroupId = _descriptor.contextMenuGroupId || null;
        const contextMenuOrder = _descriptor.contextMenuOrder || 0;
        const run = (_accessor, ...args) => {
            return Promise.resolve(_descriptor.run(this, ...args));
        };
        const toDispose = new DisposableStore();
        // Generate a unique id to allow the same descriptor.id across multiple editor instances
        const uniqueId = this.getId() + ':' + id;
        // Register the command
        toDispose.add(CommandsRegistry.registerCommand(uniqueId, run));
        // Register the context menu item
        if (contextMenuGroupId) {
            const menuItem = {
                command: {
                    id: uniqueId,
                    title: label,
                },
                when: precondition,
                group: contextMenuGroupId,
                order: contextMenuOrder,
            };
            toDispose.add(MenuRegistry.appendMenuItem(MenuId.EditorContext, menuItem));
        }
        // Register the keybindings
        if (Array.isArray(keybindings)) {
            for (const kb of keybindings) {
                toDispose.add(this._standaloneKeybindingService.addDynamicKeybinding(uniqueId, kb, run, keybindingsWhen));
            }
        }
        // Finally, register an internal editor action
        const internalAction = new InternalEditorAction(uniqueId, label, label, undefined, precondition, (...args) => Promise.resolve(_descriptor.run(this, ...args)), this._contextKeyService);
        // Store it under the original id, such that trigger with the original id will work
        this._actions.set(id, internalAction);
        toDispose.add(toDisposable(() => {
            this._actions.delete(id);
        }));
        return toDispose;
    }
    _triggerCommand(handlerId, payload) {
        if (this._codeEditorService instanceof StandaloneCodeEditorService) {
            // Help commands find this editor as the active editor
            try {
                this._codeEditorService.setActiveCodeEditor(this);
                super._triggerCommand(handlerId, payload);
            }
            finally {
                this._codeEditorService.setActiveCodeEditor(null);
            }
        }
        else {
            super._triggerCommand(handlerId, payload);
        }
    }
};
StandaloneCodeEditor = __decorate([
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageConfigurationService),
    __param(12, ILanguageFeaturesService)
], StandaloneCodeEditor);
export { StandaloneCodeEditor };
let StandaloneEditor = class StandaloneEditor extends StandaloneCodeEditor {
    constructor(domElement, _options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, configurationService, accessibilityService, modelService, languageService, languageConfigurationService, languageFeaturesService) {
        const options = { ..._options };
        updateConfigurationService(configurationService, options, false);
        const themeDomRegistration = themeService.registerEditorContainer(domElement);
        if (typeof options.theme === 'string') {
            themeService.setTheme(options.theme);
        }
        if (typeof options.autoDetectHighContrast !== 'undefined') {
            themeService.setAutoDetectHighContrast(Boolean(options.autoDetectHighContrast));
        }
        const _model = options.model;
        delete options.model;
        super(domElement, options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        this._configurationService = configurationService;
        this._standaloneThemeService = themeService;
        this._register(themeDomRegistration);
        let model;
        if (typeof _model === 'undefined') {
            const languageId = languageService.getLanguageIdByMimeType(options.language) ||
                options.language ||
                PLAINTEXT_LANGUAGE_ID;
            model = createTextModel(modelService, languageService, options.value || '', languageId, undefined);
            this._ownsModel = true;
        }
        else {
            model = _model;
            this._ownsModel = false;
        }
        this._attachModel(model);
        if (model) {
            const e = {
                oldModelUrl: null,
                newModelUrl: model.uri,
            };
            this._onDidChangeModel.fire(e);
        }
    }
    dispose() {
        super.dispose();
    }
    updateOptions(newOptions) {
        updateConfigurationService(this._configurationService, newOptions, false);
        if (typeof newOptions.theme === 'string') {
            this._standaloneThemeService.setTheme(newOptions.theme);
        }
        if (typeof newOptions.autoDetectHighContrast !== 'undefined') {
            this._standaloneThemeService.setAutoDetectHighContrast(Boolean(newOptions.autoDetectHighContrast));
        }
        super.updateOptions(newOptions);
    }
    _postDetachModelCleanup(detachedModel) {
        super._postDetachModelCleanup(detachedModel);
        if (detachedModel && this._ownsModel) {
            detachedModel.dispose();
            this._ownsModel = false;
        }
    }
};
StandaloneEditor = __decorate([
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IStandaloneThemeService),
    __param(9, INotificationService),
    __param(10, IConfigurationService),
    __param(11, IAccessibilityService),
    __param(12, IModelService),
    __param(13, ILanguageService),
    __param(14, ILanguageConfigurationService),
    __param(15, ILanguageFeaturesService)
], StandaloneEditor);
export { StandaloneEditor };
let StandaloneDiffEditor2 = class StandaloneDiffEditor2 extends DiffEditorWidget {
    constructor(domElement, _options, instantiationService, contextKeyService, codeEditorService, themeService, notificationService, configurationService, contextMenuService, editorProgressService, clipboardService, accessibilitySignalService) {
        const options = { ..._options };
        updateConfigurationService(configurationService, options, true);
        const themeDomRegistration = themeService.registerEditorContainer(domElement);
        if (typeof options.theme === 'string') {
            themeService.setTheme(options.theme);
        }
        if (typeof options.autoDetectHighContrast !== 'undefined') {
            themeService.setAutoDetectHighContrast(Boolean(options.autoDetectHighContrast));
        }
        super(domElement, options, {}, contextKeyService, instantiationService, codeEditorService, accessibilitySignalService, editorProgressService);
        this._configurationService = configurationService;
        this._standaloneThemeService = themeService;
        this._register(themeDomRegistration);
    }
    dispose() {
        super.dispose();
    }
    updateOptions(newOptions) {
        updateConfigurationService(this._configurationService, newOptions, true);
        if (typeof newOptions.theme === 'string') {
            this._standaloneThemeService.setTheme(newOptions.theme);
        }
        if (typeof newOptions.autoDetectHighContrast !== 'undefined') {
            this._standaloneThemeService.setAutoDetectHighContrast(Boolean(newOptions.autoDetectHighContrast));
        }
        super.updateOptions(newOptions);
    }
    _createInnerEditor(instantiationService, container, options) {
        return instantiationService.createInstance(StandaloneCodeEditor, container, options);
    }
    getOriginalEditor() {
        return super.getOriginalEditor();
    }
    getModifiedEditor() {
        return super.getModifiedEditor();
    }
    addCommand(keybinding, handler, context) {
        return this.getModifiedEditor().addCommand(keybinding, handler, context);
    }
    createContextKey(key, defaultValue) {
        return this.getModifiedEditor().createContextKey(key, defaultValue);
    }
    addAction(descriptor) {
        return this.getModifiedEditor().addAction(descriptor);
    }
};
StandaloneDiffEditor2 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, ICodeEditorService),
    __param(5, IStandaloneThemeService),
    __param(6, INotificationService),
    __param(7, IConfigurationService),
    __param(8, IContextMenuService),
    __param(9, IEditorProgressService),
    __param(10, IClipboardService),
    __param(11, IAccessibilitySignalService)
], StandaloneDiffEditor2);
export { StandaloneDiffEditor2 };
/**
 * @internal
 */
export function createTextModel(modelService, languageService, value, languageId, uri) {
    value = value || '';
    if (!languageId) {
        const firstLF = value.indexOf('\n');
        let firstLine = value;
        if (firstLF !== -1) {
            firstLine = value.substring(0, firstLF);
        }
        return doCreateModel(modelService, value, languageService.createByFilepathOrFirstLine(uri || null, firstLine), uri);
    }
    return doCreateModel(modelService, value, languageService.createById(languageId), uri);
}
/**
 * @internal
 */
function doCreateModel(modelService, value, languageSelection, uri) {
    return modelService.createModel(value, languageSelection, uri);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVDb2RlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUNOLFVBQVUsRUFFVixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sbUNBQW1DLENBQUE7QUFNMUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHbkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDBCQUEwQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDakcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFhLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGVBQWUsR0FDZixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixjQUFjLEVBR2Qsa0JBQWtCLEdBQ2xCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxD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