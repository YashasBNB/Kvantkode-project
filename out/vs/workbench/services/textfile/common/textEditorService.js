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
import { Event } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorExtensions, isResourceDiffEditorInput, isResourceSideBySideEditorInput, DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput, } from '../../../common/editor.js';
import { IUntitledTextEditorService, } from '../../untitled/common/untitledTextEditorService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../untitled/common/untitledTextEditorInput.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../editor/common/editorResolverService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export const ITextEditorService = createDecorator('textEditorService');
let TextEditorService = class TextEditorService extends Disposable {
    constructor(untitledTextEditorService, instantiationService, uriIdentityService, fileService, editorResolverService) {
        super();
        this.untitledTextEditorService = untitledTextEditorService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.editorResolverService = editorResolverService;
        this.editorInputCache = new ResourceMap();
        this.fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        // Register the default editor to the editor resolver
        // service so that it shows up in the editors picker
        this.registerDefaultEditor();
    }
    registerDefaultEditor() {
        this._register(this.editorResolverService.registerEditor('*', {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createEditorInput: (editor) => ({ editor: this.createTextEditor(editor) }),
            createUntitledEditorInput: (untitledEditor) => ({
                editor: this.createTextEditor(untitledEditor),
            }),
            createDiffEditorInput: (diffEditor) => ({ editor: this.createTextEditor(diffEditor) }),
        }));
    }
    async resolveTextEditor(input) {
        return this.createTextEditor(input);
    }
    createTextEditor(input) {
        // Merge Editor Not Supported (we fallback to showing the result only)
        if (isResourceMergeEditorInput(input)) {
            return this.createTextEditor(input.result);
        }
        // Diff Editor Support
        if (isResourceDiffEditorInput(input)) {
            const original = this.createTextEditor(input.original);
            const modified = this.createTextEditor(input.modified);
            return this.instantiationService.createInstance(DiffEditorInput, input.label, input.description, original, modified, undefined);
        }
        // Side by Side Editor Support
        if (isResourceSideBySideEditorInput(input)) {
            const primary = this.createTextEditor(input.primary);
            const secondary = this.createTextEditor(input.secondary);
            return this.instantiationService.createInstance(SideBySideEditorInput, input.label, input.description, secondary, primary);
        }
        // Untitled text file support
        const untitledInput = input;
        if (untitledInput.forceUntitled ||
            !untitledInput.resource ||
            untitledInput.resource.scheme === Schemas.untitled) {
            const untitledOptions = {
                languageId: untitledInput.languageId,
                initialValue: untitledInput.contents,
                encoding: untitledInput.encoding,
            };
            // Untitled resource: use as hint for an existing untitled editor
            let untitledModel;
            if (untitledInput.resource?.scheme === Schemas.untitled) {
                untitledModel = this.untitledTextEditorService.create({
                    untitledResource: untitledInput.resource,
                    ...untitledOptions,
                });
            }
            // Other resource: use as hint for associated filepath
            else {
                untitledModel = this.untitledTextEditorService.create({
                    associatedResource: untitledInput.resource,
                    ...untitledOptions,
                });
            }
            return this.createOrGetCached(untitledModel.resource, () => this.instantiationService.createInstance(UntitledTextEditorInput, untitledModel));
        }
        // Text File/Resource Editor Support
        const textResourceEditorInput = input;
        if (textResourceEditorInput.resource instanceof URI) {
            // Derive the label from the path if not provided explicitly
            const label = textResourceEditorInput.label || basename(textResourceEditorInput.resource);
            // We keep track of the preferred resource this input is to be created
            // with but it may be different from the canonical resource (see below)
            const preferredResource = textResourceEditorInput.resource;
            // From this moment on, only operate on the canonical resource
            // to ensure we reduce the chance of opening the same resource
            // with different resource forms (e.g. path casing on Windows)
            const canonicalResource = this.uriIdentityService.asCanonicalUri(preferredResource);
            return this.createOrGetCached(canonicalResource, () => {
                // File
                if (textResourceEditorInput.forceFile ||
                    this.fileService.hasProvider(canonicalResource)) {
                    return this.fileEditorFactory.createFileEditor(canonicalResource, preferredResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.encoding, textResourceEditorInput.languageId, textResourceEditorInput.contents, this.instantiationService);
                }
                // Resource
                return this.instantiationService.createInstance(TextResourceEditorInput, canonicalResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.languageId, textResourceEditorInput.contents);
            }, (cachedInput) => {
                // Untitled
                if (cachedInput instanceof UntitledTextEditorInput) {
                    return;
                }
                // Files
                else if (!(cachedInput instanceof TextResourceEditorInput)) {
                    cachedInput.setPreferredResource(preferredResource);
                    if (textResourceEditorInput.label) {
                        cachedInput.setPreferredName(textResourceEditorInput.label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setPreferredDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.encoding) {
                        cachedInput.setPreferredEncoding(textResourceEditorInput.encoding);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
                // Resources
                else {
                    if (label) {
                        cachedInput.setName(label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
            });
        }
        throw new Error(`ITextEditorService: Unable to create texteditor from ${JSON.stringify(input)}`);
    }
    createOrGetCached(resource, factoryFn, cachedFn) {
        // Return early if already cached
        let input = this.editorInputCache.get(resource);
        if (input) {
            cachedFn?.(input);
            return input;
        }
        // Otherwise create and add to cache
        input = factoryFn();
        this.editorInputCache.set(resource, input);
        Event.once(input.onWillDispose)(() => this.editorInputCache.delete(resource));
        return input;
    }
};
TextEditorService = __decorate([
    __param(0, IUntitledTextEditorService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IFileService),
    __param(4, IEditorResolverService)
], TextEditorService);
export { TextEditorService };
registerSingleton(ITextEditorService, TextEditorService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvY29tbW9uL3RleHRFZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUtOLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsK0JBQStCLEVBRS9CLDBCQUEwQixFQUMxQiwwQkFBMEIsR0FDMUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxD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