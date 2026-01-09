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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBS04sZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QiwrQkFBK0IsRUFFL0IsMEJBQTBCLEVBQzFCLDBCQUEwQixHQUMxQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1C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