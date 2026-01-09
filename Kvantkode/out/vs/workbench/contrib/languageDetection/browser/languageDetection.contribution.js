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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sYW5ndWFnZURldGVjdGlvbi9icm93c2VyL2xhbmd1YWdlRGV0ZWN0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixPQUFPLEVBR04saUJBQWlCLEdBRWpCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUNOLHlCQUF5QixFQUV6QixvQ0FBb0MsR0FDcEMsTUFBTSw4RUFBOEUsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFB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