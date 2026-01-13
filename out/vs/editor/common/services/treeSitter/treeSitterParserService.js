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
import { FileAccess } from '../../../../base/common/network.js';
import { EDITOR_EXPERIMENTAL_PREFER_TREESITTER, ITreeSitterImporter, TREESITTER_ALLOWED_SUPPORT, } from '../treeSitterParserService.js';
import { IModelService } from '../model.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Emitter } from '../../../../base/common/event.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { TextModelTreeSitter } from './textModelTreeSitter.js';
import { getModuleLocation, TreeSitterLanguages } from './treeSitterLanguages.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const EDITOR_TREESITTER_TELEMETRY = 'editor.experimental.treeSitterTelemetry';
const FILENAME_TREESITTER_WASM = `tree-sitter.wasm`;
let TreeSitterTextModelService = class TreeSitterTextModelService extends Disposable {
    constructor(_modelService, fileService, _configurationService, _environmentService, _treeSitterImporter, _instantiationService) {
        super();
        this._modelService = _modelService;
        this._configurationService = _configurationService;
        this._environmentService = _environmentService;
        this._treeSitterImporter = _treeSitterImporter;
        this._instantiationService = _instantiationService;
        this._textModelTreeSitters = this._register(new DisposableMap());
        this._registeredLanguages = new Map();
        this._onDidUpdateTree = this._register(new Emitter());
        this.onDidUpdateTree = this._onDidUpdateTree.event;
        this.isTest = false;
        this._hasInit = false;
        this._treeSitterLanguages = this._register(new TreeSitterLanguages(this._treeSitterImporter, fileService, this._environmentService, this._registeredLanguages));
        this.onDidAddLanguage = this._treeSitterLanguages.onDidAddLanguage;
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(EDITOR_EXPERIMENTAL_PREFER_TREESITTER)) {
                this._supportedLanguagesChanged();
            }
        }));
        this._supportedLanguagesChanged();
    }
    getOrInitLanguage(languageId) {
        return this._treeSitterLanguages.getOrInitLanguage(languageId);
    }
    getParseResult(textModel) {
        const textModelTreeSitter = this._textModelTreeSitters.get(textModel);
        return textModelTreeSitter?.textModelTreeSitter;
    }
    /**
     * For testing
     */
    async getTree(content, languageId) {
        const language = await this.getLanguage(languageId);
        const Parser = await this._treeSitterImporter.getParserClass();
        if (language) {
            const parser = new Parser();
            parser.setLanguage(language);
            return parser.parse(content) ?? undefined;
        }
        return undefined;
    }
    getTreeSync(content, languageId) {
        const language = this.getOrInitLanguage(languageId);
        const Parser = this._treeSitterImporter.parserClass;
        if (language && Parser) {
            const parser = new Parser();
            parser.setLanguage(language);
            return parser.parse(content) ?? undefined;
        }
        return undefined;
    }
    async getLanguage(languageId) {
        await this._init;
        return this._treeSitterLanguages.getLanguage(languageId);
    }
    async _doInitParser() {
        const Parser = await this._treeSitterImporter.getParserClass();
        const environmentService = this._environmentService;
        const isTest = this.isTest;
        await Parser.init({
            locateFile(_file, _folder) {
                const location = `${getModuleLocation(environmentService)}/${FILENAME_TREESITTER_WASM}`;
                if (isTest) {
                    return FileAccess.asFileUri(location).toString(true);
                }
                else {
                    return FileAccess.asBrowserUri(location).toString(true);
                }
            },
        });
        return true;
    }
    async _initParser(hasLanguages) {
        if (this._hasInit) {
            return this._init;
        }
        if (hasLanguages) {
            this._hasInit = true;
            this._init = this._doInitParser();
            // New init, we need to deal with all the existing text models and set up listeners
            this._init.then(() => this._registerModelServiceListeners());
        }
        else {
            this._init = Promise.resolve(false);
        }
        return this._init;
    }
    async _supportedLanguagesChanged() {
        let hasLanguages = false;
        const handleLanguage = (languageId) => {
            if (this._getSetting(languageId)) {
                hasLanguages = true;
                this._addGrammar(languageId, `tree-sitter-${languageId}`);
            }
            else {
                this._removeGrammar(languageId);
            }
        };
        // Eventually, this should actually use an extension point to add tree sitter grammars, but for now they are hard coded in core
        for (const languageId of TREESITTER_ALLOWED_SUPPORT) {
            handleLanguage(languageId);
        }
        return this._initParser(hasLanguages);
    }
    _getSetting(languageId) {
        const setting = this._configurationService.getValue(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${languageId}`);
        if (!setting && TREESITTER_ALLOWED_SUPPORT.includes(languageId)) {
            return this._configurationService.getValue(EDITOR_TREESITTER_TELEMETRY);
        }
        return setting;
    }
    async _registerModelServiceListeners() {
        this._register(this._modelService.onModelAdded((model) => {
            this._createTextModelTreeSitter(model);
        }));
        this._register(this._modelService.onModelRemoved((model) => {
            this._textModelTreeSitters.deleteAndDispose(model);
        }));
        this._modelService.getModels().forEach((model) => this._createTextModelTreeSitter(model));
    }
    async getTextModelTreeSitter(model, parseImmediately = false) {
        await this.getLanguage(model.getLanguageId());
        return this._createTextModelTreeSitter(model, parseImmediately);
    }
    _createTextModelTreeSitter(model, parseImmediately = true) {
        const textModelTreeSitter = this._instantiationService.createInstance(TextModelTreeSitter, model, this._treeSitterLanguages, parseImmediately);
        const disposables = new DisposableStore();
        disposables.add(textModelTreeSitter);
        disposables.add(textModelTreeSitter.onDidChangeParseResult((e) => this._handleOnDidChangeParseResult(e, model)));
        this._textModelTreeSitters.set(model, {
            textModelTreeSitter,
            disposables,
            dispose: disposables.dispose.bind(disposables),
        });
        return textModelTreeSitter;
    }
    _handleOnDidChangeParseResult(change, model) {
        this._onDidUpdateTree.fire({
            textModel: model,
            ranges: change.ranges,
            versionId: change.versionId,
            tree: change.tree,
            languageId: change.languageId,
            hasInjections: change.hasInjections,
        });
    }
    _addGrammar(languageId, grammarName) {
        if (!this._registeredLanguages.has(languageId)) {
            this._registeredLanguages.set(languageId, grammarName);
        }
    }
    _removeGrammar(languageId) {
        if (this._registeredLanguages.has(languageId)) {
            this._registeredLanguages.delete(languageId);
        }
    }
};
TreeSitterTextModelService = __decorate([
    __param(0, IModelService),
    __param(1, IFileService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService),
    __param(4, ITreeSitterImporter),
    __param(5, IInstantiationService)
], TreeSitterTextModelService);
export { TreeSitterTextModelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlci90cmVlU2l0dGVyUGFyc2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixxQ0FBcUMsRUFJckMsbUJBQW1CLEVBQ25CLDBCQUEwQixHQUUxQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDM0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQTJCLE1BQU0sMEJBQTBCLENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsTUFBTSwyQkFBMkIsR0FBRyx5Q0FBeUMsQ0FBQTtBQUM3RSxNQUFNLHdCQUF3QixHQUFHLGtCQUFrQixDQUFBO0FBRTVDLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0s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