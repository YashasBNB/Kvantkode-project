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
import { coalesce } from '../../../../base/common/arrays.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DocumentPasteTriggerKind, } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
class SimplePasteAndDropProvider {
    constructor(kind) {
        this.copyMimeTypes = [];
        this.kind = kind;
        this.providedDropEditKinds = [this.kind];
        this.providedPasteEditKinds = [this.kind];
    }
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        const edit = await this.getEdit(dataTransfer, token);
        if (!edit) {
            return undefined;
        }
        return {
            edits: [
                {
                    insertText: edit.insertText,
                    title: edit.title,
                    kind: edit.kind,
                    handledMimeType: edit.handledMimeType,
                    yieldTo: edit.yieldTo,
                },
            ],
            dispose() { },
        };
    }
    async provideDocumentDropEdits(_model, _position, dataTransfer, token) {
        const edit = await this.getEdit(dataTransfer, token);
        if (!edit) {
            return;
        }
        return {
            edits: [
                {
                    insertText: edit.insertText,
                    title: edit.title,
                    kind: edit.kind,
                    handledMimeType: edit.handledMimeType,
                    yieldTo: edit.yieldTo,
                },
            ],
            dispose() { },
        };
    }
}
export class DefaultTextPasteOrDropEditProvider extends SimplePasteAndDropProvider {
    static { this.id = 'text'; }
    constructor() {
        super(HierarchicalKind.Empty.append('text', 'plain'));
        this.id = DefaultTextPasteOrDropEditProvider.id;
        this.dropMimeTypes = [Mimes.text];
        this.pasteMimeTypes = [Mimes.text];
    }
    async getEdit(dataTransfer, _token) {
        const textEntry = dataTransfer.get(Mimes.text);
        if (!textEntry) {
            return;
        }
        // Suppress if there's also a uriList entry.
        // Typically the uri-list contains the same text as the text entry so showing both is confusing.
        if (dataTransfer.has(Mimes.uriList)) {
            return;
        }
        const insertText = await textEntry.asString();
        return {
            handledMimeType: Mimes.text,
            title: localize('text.label', 'Insert Plain Text'),
            insertText,
            kind: this.kind,
        };
    }
}
class PathProvider extends SimplePasteAndDropProvider {
    constructor() {
        super(HierarchicalKind.Empty.append('uri', 'path', 'absolute'));
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        let uriCount = 0;
        const insertText = entries
            .map(({ uri, originalText }) => {
            if (uri.scheme === Schemas.file) {
                return uri.fsPath;
            }
            else {
                uriCount++;
                return originalText;
            }
        })
            .join(' ');
        let label;
        if (uriCount > 0) {
            // Dropping at least one generic uri (such as https) so use most generic label
            label =
                entries.length > 1
                    ? localize('defaultDropProvider.uriList.uris', 'Insert Uris')
                    : localize('defaultDropProvider.uriList.uri', 'Insert Uri');
        }
        else {
            // All the paths are file paths
            label =
                entries.length > 1
                    ? localize('defaultDropProvider.uriList.paths', 'Insert Paths')
                    : localize('defaultDropProvider.uriList.path', 'Insert Path');
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText,
            title: label,
            kind: this.kind,
        };
    }
}
let RelativePathProvider = class RelativePathProvider extends SimplePasteAndDropProvider {
    constructor(_workspaceContextService) {
        super(HierarchicalKind.Empty.append('uri', 'path', 'relative'));
        this._workspaceContextService = _workspaceContextService;
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        const relativeUris = coalesce(entries.map(({ uri }) => {
            const root = this._workspaceContextService.getWorkspaceFolder(uri);
            return root ? relativePath(root.uri, uri) : undefined;
        }));
        if (!relativeUris.length) {
            return;
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText: relativeUris.join(' '),
            title: entries.length > 1
                ? localize('defaultDropProvider.uriList.relativePaths', 'Insert Relative Paths')
                : localize('defaultDropProvider.uriList.relativePath', 'Insert Relative Path'),
            kind: this.kind,
        };
    }
};
RelativePathProvider = __decorate([
    __param(0, IWorkspaceContextService)
], RelativePathProvider);
class PasteHtmlProvider {
    constructor() {
        this.kind = new HierarchicalKind('html');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = ['text/html'];
        this._yieldTo = [{ mimeType: Mimes.text }];
    }
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        if (context.triggerKind !== DocumentPasteTriggerKind.PasteAs &&
            !context.only?.contains(this.kind)) {
            return;
        }
        const entry = dataTransfer.get('text/html');
        const htmlText = await entry?.asString();
        if (!htmlText || token.isCancellationRequested) {
            return;
        }
        return {
            dispose() { },
            edits: [
                {
                    insertText: htmlText,
                    yieldTo: this._yieldTo,
                    title: localize('pasteHtmlLabel', 'Insert HTML'),
                    kind: this.kind,
                },
            ],
        };
    }
}
async function extractUriList(dataTransfer) {
    const urlListEntry = dataTransfer.get(Mimes.uriList);
    if (!urlListEntry) {
        return [];
    }
    const strUriList = await urlListEntry.asString();
    const entries = [];
    for (const entry of UriList.parse(strUriList)) {
        try {
            entries.push({ uri: URI.parse(entry), originalText: entry });
        }
        catch {
            // noop
        }
    }
    return entries;
}
const genericLanguageSelector = { scheme: '*', hasAccessToAllModels: true };
let DefaultDropProvidersFeature = class DefaultDropProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new PathProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new RelativePathProvider(workspaceContextService)));
    }
};
DefaultDropProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultDropProvidersFeature);
export { DefaultDropProvidersFeature };
let DefaultPasteProvidersFeature = class DefaultPasteProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new PathProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new RelativePathProvider(workspaceContextService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new PasteHtmlProvider()));
    }
};
DefaultPasteProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultPasteProvidersFeature);
export { DefaultPasteProvidersFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvZGVmYXVsdFByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUEyQixPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUc3RixPQUFPLEVBT04sd0JBQXdCLEdBQ3hCLE1BQU0sOEJBQThCLENBQUE7QUFHckMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdkYsTUFBZSwwQkFBMEI7SUFXeEMsWUFBWSxJQUFzQjtRQUh6QixrQkFBYSxHQUFHLEVBQUUsQ0FBQTtRQUkxQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNoQixJQUFJLENBQUMscUJBQXFCLEdBQUcs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