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
var CustomEditorLabelService_1;
import { Emitter } from '../../../../base/common/event.js';
import { parse as parseGlob } from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isAbsolute, parse as parsePath, dirname, } from '../../../../base/common/path.js';
import { dirname as resourceDirname, relativePath as getRelativePath, } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MRUCache } from '../../../../base/common/map.js';
let CustomEditorLabelService = class CustomEditorLabelService extends Disposable {
    static { CustomEditorLabelService_1 = this; }
    static { this.SETTING_ID_PATTERNS = 'workbench.editor.customLabels.patterns'; }
    static { this.SETTING_ID_ENABLED = 'workbench.editor.customLabels.enabled'; }
    constructor(configurationService, workspaceContextService) {
        super();
        this.configurationService = configurationService;
        this.workspaceContextService = workspaceContextService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.patterns = [];
        this.enabled = true;
        this.cache = new MRUCache(1000);
        this._templateRegexValidation = /[a-zA-Z0-9]/;
        this._parsedTemplateExpression = /\$\{(dirname|filename|extname|extname\((?<extnameN>[-+]?\d+)\)|dirname\((?<dirnameN>[-+]?\d+)\))\}/g;
        this._filenameCaptureExpression = /(?<filename>^\.*[^.]*)/;
        this.storeEnablementState();
        this.storeCustomPatterns();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            // Cache the enabled state
            if (e.affectsConfiguration(CustomEditorLabelService_1.SETTING_ID_ENABLED)) {
                const oldEnablement = this.enabled;
                this.storeEnablementState();
                if (oldEnablement !== this.enabled && this.patterns.length > 0) {
                    this._onDidChange.fire();
                }
            }
            // Cache the patterns
            else if (e.affectsConfiguration(CustomEditorLabelService_1.SETTING_ID_PATTERNS)) {
                this.cache.clear();
                this.storeCustomPatterns();
                this._onDidChange.fire();
            }
        }));
    }
    storeEnablementState() {
        this.enabled = this.configurationService.getValue(CustomEditorLabelService_1.SETTING_ID_ENABLED);
    }
    storeCustomPatterns() {
        this.patterns = [];
        const customLabelPatterns = this.configurationService.getValue(CustomEditorLabelService_1.SETTING_ID_PATTERNS);
        for (const pattern in customLabelPatterns) {
            const template = customLabelPatterns[pattern];
            if (!this._templateRegexValidation.test(template)) {
                continue;
            }
            const isAbsolutePath = isAbsolute(pattern);
            const parsedPattern = parseGlob(pattern);
            this.patterns.push({ pattern, template, isAbsolutePath, parsedPattern });
        }
        this.patterns.sort((a, b) => this.patternWeight(b.pattern) - this.patternWeight(a.pattern));
    }
    patternWeight(pattern) {
        let weight = 0;
        for (const fragment of pattern.split('/')) {
            if (fragment === '**') {
                weight += 1;
            }
            else if (fragment === '*') {
                weight += 10;
            }
            else if (fragment.includes('*') || fragment.includes('?')) {
                weight += 50;
            }
            else if (fragment !== '') {
                weight += 100;
            }
        }
        return weight;
    }
    getName(resource) {
        if (!this.enabled || this.patterns.length === 0) {
            return undefined;
        }
        const key = resource.toString();
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            return cached ?? undefined;
        }
        const result = this.applyPatterns(resource);
        this.cache.set(key, result ?? null);
        return result;
    }
    applyPatterns(resource) {
        const root = this.workspaceContextService.getWorkspaceFolder(resource);
        let relativePath;
        for (const pattern of this.patterns) {
            let relevantPath;
            if (root && !pattern.isAbsolutePath) {
                if (!relativePath) {
                    relativePath = getRelativePath(resourceDirname(root.uri), resource) ?? resource.path;
                }
                relevantPath = relativePath;
            }
            else {
                relevantPath = resource.path;
            }
            if (pattern.parsedPattern(relevantPath)) {
                return this.applyTemplate(pattern.template, resource, relevantPath);
            }
        }
        return undefined;
    }
    applyTemplate(template, resource, relevantPath) {
        let parsedPath;
        return template.replace(this._parsedTemplateExpression, (match, variable, ...args) => {
            parsedPath = parsedPath ?? parsePath(resource.path);
            // named group matches
            const { dirnameN = '0', extnameN = '0' } = args.pop();
            if (variable === 'filename') {
                const { filename } = this._filenameCaptureExpression.exec(parsedPath.base)?.groups ?? {};
                if (filename) {
                    return filename;
                }
            }
            else if (variable === 'extname') {
                const extension = this.getExtnames(parsedPath.base);
                if (extension) {
                    return extension;
                }
            }
            else if (variable.startsWith('extname')) {
                const n = parseInt(extnameN);
                const nthExtname = this.getNthExtname(parsedPath.base, n);
                if (nthExtname) {
                    return nthExtname;
                }
            }
            else if (variable.startsWith('dirname')) {
                const n = parseInt(dirnameN);
                const nthDir = this.getNthDirname(dirname(relevantPath), n);
                if (nthDir) {
                    return nthDir;
                }
            }
            return match;
        });
    }
    removeLeadingDot(path) {
        let withoutLeadingDot = path;
        while (withoutLeadingDot.startsWith('.')) {
            withoutLeadingDot = withoutLeadingDot.slice(1);
        }
        return withoutLeadingDot;
    }
    getNthDirname(path, n) {
        // grand-parent/parent/filename.ext1.ext2 -> [grand-parent, parent]
        path = path.startsWith('/') ? path.slice(1) : path;
        const pathFragments = path.split('/');
        return this.getNthFragment(pathFragments, n);
    }
    getExtnames(fullFileName) {
        return this.removeLeadingDot(fullFileName).split('.').slice(1).join('.');
    }
    getNthExtname(fullFileName, n) {
        // file.ext1.ext2.ext3 -> [file, ext1, ext2, ext3]
        const extensionNameFragments = this.removeLeadingDot(fullFileName).split('.');
        extensionNameFragments.shift(); // remove the first element which is the file name
        return this.getNthFragment(extensionNameFragments, n);
    }
    getNthFragment(fragments, n) {
        const length = fragments.length;
        let nth;
        if (n < 0) {
            nth = Math.abs(n) - 1;
        }
        else {
            nth = length - n - 1;
        }
        const nthFragment = fragments[nth];
        if (nthFragment === undefined || nthFragment === '') {
            return undefined;
        }
        return nthFragment;
    }
};
CustomEditorLabelService = CustomEditorLabelService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService)
], CustomEditorLabelService);
export { CustomEditorLabelService };
export const ICustomEditorLabelService = createDecorator('ICustomEditorLabelService');
registerSingleton(ICustomEditorLabelService, CustomEditorLabelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFpQixLQUFLLElBQUksU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsS0FBSyxJQUFJLFNBQVMsRUFFbEIsT0FBTyxHQUNQLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUNOLE9BQU8sSUFBSSxlQUFlLEVBQzFCLFlBQVksSUFBSSxlQUFlLEdBQy9CLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFjbEQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOzthQUd2Qyx3QkFBbUIsR0FBRyx3Q0FBd0MsQUFBM0MsQ0FBMkM7YUFDOUQsdUJBQWtCLEdBQUcsdUNBQXVDLEFBQTFDLENBQTBDO0lBVTVFLFlBQ3dCLG9CQUE0RCxFQUN6RCx1QkFBa0U7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