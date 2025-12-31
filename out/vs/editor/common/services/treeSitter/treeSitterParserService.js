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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RyZWVTaXR0ZXIvdHJlZVNpdHRlclBhcnNlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRixPQUFPLEVBQ04scUNBQXFDLEVBSXJDLG1CQUFtQixFQUNuQiwwQkFBMEIsR0FFMUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUEyQixNQUFNLDBCQUEwQixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE1BQU0sMkJBQTJCLEdBQUcseUNBQXlDLENBQUE7QUFDN0UsTUFBTSx3QkFBd0IsR0FBRyxrQkFBa0IsQ0FBQTtBQUU1QyxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFjekQs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