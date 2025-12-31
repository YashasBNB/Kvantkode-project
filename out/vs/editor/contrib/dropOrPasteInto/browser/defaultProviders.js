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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2RlZmF1bHRQcm92aWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBMkIsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFHN0YsT0FBTyxFQU9OLHdCQUF3QixHQUN4QixNQUFNLDhCQUE4QixDQUFBO0FBR3JDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE1BQWUsMEJBQTBCO0lBV3hDLFlBQVksSUFBc0I7UUFIekIsa0JBQWEsR0FBRyxFQUFFLENBQUE7UUFJMUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FB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