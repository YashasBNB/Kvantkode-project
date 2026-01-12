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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTGFiZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9jdXN0b21FZGl0b3JMYWJlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWlCLEtBQUssSUFBSSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixLQUFLLElBQUksU0FBUyxFQUVsQixPQUFPLEdBQ1AsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sT0FBTyxJQUFJLGVBQWUsRUFDMUIsWUFBWSxJQUFJLGVBQWUsR0FDL0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQWNsRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O2FBR3ZDLHdCQUFtQixHQUFHLHdDQUF3QyxBQUEzQyxDQUEyQzthQUM5RCx1QkFBa0IsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMEM7SUFVNUUsWUFDd0Isb0JBQTRELEVBQ3pELHVC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