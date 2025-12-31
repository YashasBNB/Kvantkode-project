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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxTdGF0dXNCYXIvc3RhdHVzQmFyUHJvdmlkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3JGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9GLE9BQU8sRUFDTixRQUFRLEdBS1IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFP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