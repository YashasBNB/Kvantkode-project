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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { CHANGE_CELL_LANGUAGE, DETECT_CELL_LANGUAGE } from '../../notebookBrowser.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
import { CellKind, } from '../../../common/notebookCommon.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { ILanguageDetectionService, } from '../../../../../services/languageDetection/common/languageDetectionWorkerService.js';
let CellStatusBarLanguagePickerProvider = class CellStatusBarLanguagePickerProvider {
    constructor(_notebookService, _languageService) {
        this._notebookService = _notebookService;
        this._languageService = _languageService;
        this.viewType = '*';
    }
    async provideCellStatusBarItems(uri, index, _token) {
        const doc = this._notebookService.getNotebookTextModel(uri);
        const cell = doc?.cells[index];
        if (!cell) {
            return;
        }
        const statusBarItems = [];
        let displayLanguage = cell.language;
        if (cell.cellKind === CellKind.Markup) {
            displayLanguage = 'markdown';
        }
        else {
            const registeredId = this._languageService.getLanguageIdByLanguageName(cell.language);
            if (registeredId) {
                displayLanguage = this._languageService.getLanguageName(displayLanguage) ?? displayLanguage;
            }
            else {
                // add unregistered lanugage warning item
                const searchTooltip = localize('notebook.cell.status.searchLanguageExtensions', "Unknown cell language. Click to search for '{0}' extensions", cell.language);
                statusBarItems.push({
                    text: `$(dialog-warning)`,
                    command: {
                        id: 'workbench.extensions.search',
                        arguments: [`@tag:${cell.language}`],
                        title: 'Search Extensions',
                    },
                    tooltip: searchTooltip,
                    alignment: 2 /* CellStatusbarAlignment.Right */,
                    priority: -Number.MAX_SAFE_INTEGER + 1,
                });
            }
        }
        statusBarItems.push({
            text: displayLanguage,
            command: CHANGE_CELL_LANGUAGE,
            tooltip: localize('notebook.cell.status.language', 'Select Cell Language Mode'),
            alignment: 2 /* CellStatusbarAlignment.Right */,
            priority: -Number.MAX_SAFE_INTEGER,
        });
        return {
            items: statusBarItems,
        };
    }
};
CellStatusBarLanguagePickerProvider = __decorate([
    __param(0, INotebookService),
    __param(1, ILanguageService)
], CellStatusBarLanguagePickerProvider);
let CellStatusBarLanguageDetectionProvider = class CellStatusBarLanguageDetectionProvider {
    constructor(_notebookService, _notebookKernelService, _languageService, _configurationService, _languageDetectionService, _keybindingService) {
        this._notebookService = _notebookService;
        this._notebookKernelService = _notebookKernelService;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._languageDetectionService = _languageDetectionService;
        this._keybindingService = _keybindingService;
        this.viewType = '*';
        this.cache = new ResourceMap();
    }
    async provideCellStatusBarItems(uri, index, token) {
        const doc = this._notebookService.getNotebookTextModel(uri);
        const cell = doc?.cells[index];
        if (!cell) {
            return;
        }
        const enablementConfig = this._configurationService.getValue('workbench.editor.languageDetectionHints');
        const enabled = typeof enablementConfig === 'object' && enablementConfig?.notebookEditors;
        if (!enabled) {
            return;
        }
        const cellUri = cell.uri;
        const contentVersion = cell.textModel?.getVersionId();
        if (!contentVersion) {
            return;
        }
        const currentLanguageId = cell.cellKind === CellKind.Markup
            ? 'markdown'
            : this._languageService.getLanguageIdByLanguageName(cell.language) || cell.language;
        if (!this.cache.has(cellUri)) {
            this.cache.set(cellUri, {
                cellLanguage: currentLanguageId, // force a re-compute upon a change in configured language
                updateTimestamp: 0, // facilitates a disposable-free debounce operation
                contentVersion: 1, // dont run for the initial contents, only on update
            });
        }
        const cached = this.cache.get(cellUri);
        if (cached.cellLanguage !== currentLanguageId ||
            (cached.updateTimestamp < Date.now() - 1000 && cached.contentVersion !== contentVersion)) {
            cached.updateTimestamp = Date.now();
            cached.cellLanguage = currentLanguageId;
            cached.contentVersion = contentVersion;
            const kernel = this._notebookKernelService.getSelectedOrSuggestedKernel(doc);
            if (kernel) {
                const supportedLangs = [...kernel.supportedLanguages, 'markdown'];
                cached.guess = await this._languageDetectionService.detectLanguage(cell.uri, supportedLangs);
            }
        }
        const items = [];
        if (cached.guess && currentLanguageId !== cached.guess) {
            const detectedName = this._languageService.getLanguageName(cached.guess) || cached.guess;
            let tooltip = localize('notebook.cell.status.autoDetectLanguage', 'Accept Detected Language: {0}', detectedName);
            const keybinding = this._keybindingService.lookupKeybinding(DETECT_CELL_LANGUAGE);
            const label = keybinding?.getLabel();
            if (label) {
                tooltip += ` (${label})`;
            }
            items.push({
                text: '$(lightbulb-autofix)',
                command: DETECT_CELL_LANGUAGE,
                tooltip,
                alignment: 2 /* CellStatusbarAlignment.Right */,
                priority: -Number.MAX_SAFE_INTEGER + 1,
            });
        }
        return { items };
    }
};
CellStatusBarLanguageDetectionProvider = __decorate([
    __param(0, INotebookService),
    __param(1, INotebookKernelService),
    __param(2, ILanguageService),
    __param(3, IConfigurationService),
    __param(4, ILanguageDetectionService),
    __param(5, IKeybindingService)
], CellStatusBarLanguageDetectionProvider);
let BuiltinCellStatusBarProviders = class BuiltinCellStatusBarProviders extends Disposable {
    constructor(instantiationService, notebookCellStatusBarService) {
        super();
        const builtinProviders = [
            CellStatusBarLanguagePickerProvider,
            CellStatusBarLanguageDetectionProvider,
        ];
        builtinProviders.forEach((p) => {
            this._register(notebookCellStatusBarService.registerCellStatusBarItemProvider(instantiationService.createInstance(p)));
        });
    }
};
BuiltinCellStatusBarProviders = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookCellStatusBarService)
], BuiltinCellStatusBarProviders);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BuiltinCellStatusBarProviders, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2VsbFN0YXR1c0Jhci9zdGF0dXNCYXJQcm92aWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0YsT0FBTyxFQUNOLFFBQVEsR0FLUixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFN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