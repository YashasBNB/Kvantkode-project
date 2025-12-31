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
import * as dom from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { matchesScheme, matchesSomeScheme, Schemas } from '../../../base/common/network.js';
import { normalizePath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from './codeEditorService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { EditorOpenSource } from '../../../platform/editor/common/editor.js';
import { extractSelection, } from '../../../platform/opener/common/opener.js';
let CommandOpener = class CommandOpener {
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async open(target, options) {
        if (!matchesScheme(target, Schemas.command)) {
            return false;
        }
        if (!options?.allowCommands) {
            // silently ignore commands when command-links are disabled, also
            // suppress other openers by returning TRUE
            return true;
        }
        if (typeof target === 'string') {
            target = URI.parse(target);
        }
        if (Array.isArray(options.allowCommands)) {
            // Only allow specific commands
            if (!options.allowCommands.includes(target.path)) {
                // Suppress other openers by returning TRUE
                return true;
            }
        }
        // execute as command
        let args = [];
        try {
            args = parse(decodeURIComponent(target.query));
        }
        catch {
            // ignore and retry
            try {
                args = parse(target.query);
            }
            catch {
                // ignore error
            }
        }
        if (!Array.isArray(args)) {
            args = [args];
        }
        await this._commandService.executeCommand(target.path, ...args);
        return true;
    }
};
CommandOpener = __decorate([
    __param(0, ICommandService)
], CommandOpener);
let EditorOpener = class EditorOpener {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    async open(target, options) {
        if (typeof target === 'string') {
            target = URI.parse(target);
        }
        const { selection, uri } = extractSelection(target);
        target = uri;
        if (target.scheme === Schemas.file) {
            target = normalizePath(target); // workaround for non-normalized paths (https://github.com/microsoft/vscode/issues/12954)
        }
        await this._editorService.openCodeEditor({
            resource: target,
            options: {
                selection,
                source: options?.fromUserGesture ? EditorOpenSource.USER : EditorOpenSource.API,
                ...options?.editorOptions,
            },
        }, this._editorService.getFocusedCodeEditor(), options?.openToSide);
        return true;
    }
};
EditorOpener = __decorate([
    __param(0, ICodeEditorService)
], EditorOpener);
let OpenerService = class OpenerService {
    constructor(editorService, commandService) {
        this._openers = new LinkedList();
        this._validators = new LinkedList();
        this._resolvers = new LinkedList();
        this._resolvedUriTargets = new ResourceMap((uri) => uri.with({ path: null, fragment: null, query: null }).toString());
        this._externalOpeners = new LinkedList();
        // Default external opener is going through window.open()
        this._defaultExternalOpener = {
            openExternal: async (href) => {
                // ensure to open HTTP/HTTPS links into new windows
                // to not trigger a navigation. Any other link is
                // safe to be set as HREF to prevent a blank window
                // from opening.
                if (matchesSomeScheme(href, Schemas.http, Schemas.https)) {
                    dom.windowOpenNoOpener(href);
                }
                else {
                    mainWindow.location.href = href;
                }
                return true;
            },
        };
        // Default opener: any external, maito, http(s), command, and catch-all-editors
        this._openers.push({
            open: async (target, options) => {
                if (options?.openExternal ||
                    matchesSomeScheme(target, Schemas.mailto, Schemas.http, Schemas.https, Schemas.vsls)) {
                    // open externally
                    await this._doOpenExternal(target, options);
                    return true;
                }
                return false;
            },
        });
        this._openers.push(new CommandOpener(commandService));
        this._openers.push(new EditorOpener(editorService));
    }
    registerOpener(opener) {
        const remove = this._openers.unshift(opener);
        return { dispose: remove };
    }
    registerValidator(validator) {
        const remove = this._validators.push(validator);
        return { dispose: remove };
    }
    registerExternalUriResolver(resolver) {
        const remove = this._resolvers.push(resolver);
        return { dispose: remove };
    }
    setDefaultExternalOpener(externalOpener) {
        this._defaultExternalOpener = externalOpener;
    }
    registerExternalOpener(opener) {
        const remove = this._externalOpeners.push(opener);
        return { dispose: remove };
    }
    async open(target, options) {
        // check with contributed validators
        if (!options?.skipValidation) {
            const targetURI = typeof target === 'string' ? URI.parse(target) : target;
            const validationTarget = this._resolvedUriTargets.get(targetURI) ?? target; // validate against the original URI that this URI resolves to, if one exists
            for (const validator of this._validators) {
                if (!(await validator.shouldOpen(validationTarget, options))) {
                    return false;
                }
            }
        }
        // check with contributed openers
        for (const opener of this._openers) {
            const handled = await opener.open(target, options);
            if (handled) {
                return true;
            }
        }
        return false;
    }
    async resolveExternalUri(resource, options) {
        for (const resolver of this._resolvers) {
            try {
                const result = await resolver.resolveExternalUri(resource, options);
                if (result) {
                    if (!this._resolvedUriTargets.has(result.resolved)) {
                        this._resolvedUriTargets.set(result.resolved, resource);
                    }
                    return result;
                }
            }
            catch {
                // noop
            }
        }
        throw new Error('Could not resolve external URI: ' + resource.toString());
    }
    async _doOpenExternal(resource, options) {
        //todo@jrieken IExternalUriResolver should support `uri: URI | string`
        const uri = typeof resource === 'string' ? URI.parse(resource) : resource;
        let externalUri;
        try {
            externalUri = (await this.resolveExternalUri(uri, options)).resolved;
        }
        catch {
            externalUri = uri;
        }
        let href;
        if (typeof resource === 'string' && uri.toString() === externalUri.toString()) {
            // open the url-string AS IS
            href = resource;
        }
        else {
            // open URI using the toString(noEncode)+encodeURI-trick
            href = encodeURI(externalUri.toString(true));
        }
        if (options?.allowContributedOpeners) {
            const preferredOpenerId = typeof options?.allowContributedOpeners === 'string'
                ? options?.allowContributedOpeners
                : undefined;
            for (const opener of this._externalOpeners) {
                const didOpen = await opener.openExternal(href, {
                    sourceUri: uri,
                    preferredOpenerId,
                }, CancellationToken.None);
                if (didOpen) {
                    return true;
                }
            }
        }
        return this._defaultExternalOpener.openExternal(href, { sourceUri: uri }, CancellationToken.None);
    }
    dispose() {
        this._validators.clear();
    }
};
OpenerService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, ICommandService)
], OpenerService);
export { OpenerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL29wZW5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sZ0JBQWdCLEdBU2hCLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYTtJQUNsQixZQUE4QyxlQUFnQztRQUFoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7SUFBRyxDQUFDO0lBRWxGLEtBQUssQ0FBQyxJQUFJLENB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