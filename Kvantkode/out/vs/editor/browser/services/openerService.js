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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvb3BlbmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzVFLE9BQU8sRUFDTixnQkFBZ0IsR0FTaEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBQ2xCLFlBQThDLGVBQWdDO1FBQWhDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtJQUFHLENBQUM7SUFFbEYsS0FBSyxDQUFDLElB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