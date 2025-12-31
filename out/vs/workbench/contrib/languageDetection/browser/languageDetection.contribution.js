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
var LanguageDetectionStatusContribution_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { ILanguageDetectionService, LanguageDetectionLanguageEventSource, } from '../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { NOTEBOOK_EDITOR_EDITABLE } from '../../notebook/common/notebookContextKeys.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const detectLanguageCommandId = 'editor.detectLanguage';
let LanguageDetectionStatusContribution = class LanguageDetectionStatusContribution {
    static { LanguageDetectionStatusContribution_1 = this; }
    static { this._id = 'status.languageDetectionStatus'; }
    constructor(_languageDetectionService, _statusBarService, _configurationService, _editorService, _languageService, _keybindingService) {
        this._languageDetectionService = _languageDetectionService;
        this._statusBarService = _statusBarService;
        this._configurationService = _configurationService;
        this._editorService = _editorService;
        this._languageService = _languageService;
        this._keybindingService = _keybindingService;
        this._disposables = new DisposableStore();
        this._delayer = new ThrottledDelayer(1000);
        this._renderDisposables = new DisposableStore();
        _editorService.onDidActiveEditorChange(() => this._update(true), this, this._disposables);
        this._update(false);
    }
    dispose() {
        this._disposables.dispose();
        this._delayer.dispose();
        this._combinedEntry?.dispose();
        this._renderDisposables.dispose();
    }
    _update(clear) {
        if (clear) {
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        this._delayer.trigger(() => this._doUpdate());
    }
    async _doUpdate() {
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        this._renderDisposables.clear();
        // update when editor language changes
        editor?.onDidChangeModelLanguage(() => this._update(true), this, this._renderDisposables);
        editor?.onDidChangeModelContent(() => this._update(false), this, this._renderDisposables);
        const editorModel = editor?.getModel();
        const editorUri = editorModel?.uri;
        const existingId = editorModel?.getLanguageId();
        const enablementConfig = this._configurationService.getValue('workbench.editor.languageDetectionHints');
        const enabled = typeof enablementConfig === 'object' && enablementConfig?.untitledEditors;
        const disableLightbulb = !enabled || editorUri?.scheme !== Schemas.untitled || !existingId;
        if (disableLightbulb || !editorUri) {
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        else {
            const lang = await this._languageDetectionService.detectLanguage(editorUri);
            const skip = { jsonc: 'json' };
            const existing = editorModel.getLanguageId();
            if (lang && lang !== existing && skip[existing] !== lang) {
                const detectedName = this._languageService.getLanguageName(lang) || lang;
                let tooltip = localize('status.autoDetectLanguage', 'Accept Detected Language: {0}', detectedName);
                const keybinding = this._keybindingService.lookupKeybinding(detectLanguageCommandId);
                const label = keybinding?.getLabel();
                if (label) {
                    tooltip += ` (${label})`;
                }
                const props = {
                    name: localize('langDetection.name', 'Language Detection'),
                    ariaLabel: localize('langDetection.aria', 'Change to Detected Language: {0}', lang),
                    tooltip,
                    command: detectLanguageCommandId,
                    text: '$(lightbulb-autofix)',
                };
                if (!this._combinedEntry) {
                    this._combinedEntry = this._statusBarService.addEntry(props, LanguageDetectionStatusContribution_1._id, 1 /* StatusbarAlignment.RIGHT */, {
                        location: { id: 'status.editor.mode', priority: 100.1 },
                        alignment: 1 /* StatusbarAlignment.RIGHT */,
                        compact: true,
                    });
                }
                else {
                    this._combinedEntry.update(props);
                }
            }
            else {
                this._combinedEntry?.dispose();
                this._combinedEntry = undefined;
            }
        }
    }
};
LanguageDetectionStatusContribution = LanguageDetectionStatusContribution_1 = __decorate([
    __param(0, ILanguageDetectionService),
    __param(1, IStatusbarService),
    __param(2, IConfigurationService),
    __param(3, IEditorService),
    __param(4, ILanguageService),
    __param(5, IKeybindingService)
], LanguageDetectionStatusContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LanguageDetectionStatusContribution, 3 /* LifecyclePhase.Restored */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: detectLanguageCommandId,
            title: localize2('detectlang', 'Detect Language from Content'),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.toNegated(), EditorContextKeys.editorTextFocus),
            keybinding: {
                primary: 34 /* KeyCode.KeyD */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        const notificationService = accessor.get(INotificationService);
        const editorUri = editor?.getModel()?.uri;
        if (editorUri) {
            const lang = await languageDetectionService.detectLanguage(editorUri);
            if (lang) {
                editor.getModel()?.setLanguage(lang, LanguageDetectionLanguageEventSource);
            }
            else {
                notificationService.warn(localize('noDetection', 'Unable to detect editor language'));
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGFuZ3VhZ2VEZXRlY3Rpb24vYnJvd3Nlci9sYW5ndWFnZURldGVjdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUdOLGlCQUFpQixHQUVqQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTix5QkFBeUIsRUFFekIsb0NBQW9DLEdBQ3BDLE1BQU0sOEVBQThFLENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxF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