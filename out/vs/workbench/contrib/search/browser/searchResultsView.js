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
var TextSearchResultRenderer_1, FolderMatchRenderer_1, FileMatchRenderer_1, MatchRenderer_1;
import * as DOM from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as paths from '../../../../base/common/path.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isEqual } from '../../../../base/common/resources.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuWorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { SearchContext } from '../common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isTextSearchHeading, isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, isPlainTextSearchHeading, } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
export class SearchDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return SearchDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (isSearchTreeFolderMatch(element)) {
            return FolderMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeFileMatch(element)) {
            return FileMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeMatch(element)) {
            return MatchRenderer.TEMPLATE_ID;
        }
        else if (isTextSearchHeading(element)) {
            return TextSearchResultRenderer.TEMPLATE_ID;
        }
        console.error('Invalid search tree element', element);
        throw new Error('Invalid search tree element');
    }
}
let TextSearchResultRenderer = class TextSearchResultRenderer extends Disposable {
    static { TextSearchResultRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'textResultMatch'; }
    constructor(labels, contextService, instantiationService, contextKeyService) {
        super();
        this.labels = labels;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = TextSearchResultRenderer_1.TEMPLATE_ID;
    }
    disposeCompressedElements(node, index, templateData, height) { }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const textSearchResultElement = DOM.append(container, DOM.$('.textsearchresult'));
        const label = this.labels.create(textSearchResultElement, {
            supportDescriptionHighlights: true,
            supportHighlights: true,
            supportIcons: true,
        });
        disposables.add(label);
        const actionBarContainer = DOM.append(textSearchResultElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true,
            },
            highlightToggledItems: true,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return { label, disposables, actions, contextKeyService: contextKeyServiceMain };
    }
    async renderElement(node, index, templateData, height) {
        if (isPlainTextSearchHeading(node.element)) {
            templateData.label.setLabel(nls.localize('searchFolderMatch.plainText.label', 'Text Results'));
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(false);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
        else {
            let aiName = 'Copilot';
            try {
                aiName =
                    (await node.element.parent().searchModel.getAITextResultProviderName()) || 'Copilot';
            }
            catch {
                // ignore
            }
            const localizedLabel = nls.localize({
                key: 'searchFolderMatch.aiText.label',
                comment: [
                    'This is displayed before the AI text search results, where {0} will be in the place of the AI name (ie: Copilot)',
                ],
            }, '{0} Results', aiName);
            // todo: make icon extension-contributed.
            templateData.label.setLabel(`$(${Codicon.copilot.id}) ${localizedLabel}`);
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(true);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderCompressedElements(node, index, templateData, height) { }
};
TextSearchResultRenderer = TextSearchResultRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], TextSearchResultRenderer);
export { TextSearchResultRenderer };
let FolderMatchRenderer = class FolderMatchRenderer extends Disposable {
    static { FolderMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'folderMatch'; }
    constructor(searchView, labels, contextService, labelService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FolderMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map((e) => e.name());
        if (folder.resource) {
            const fileKind = isSearchTreeFolderMatchWorkspaceRoot(folder)
                ? FileKind.ROOT_FOLDER
                : FileKind.FOLDER;
            templateData.label.setResource({ resource: folder.resource, name: label }, {
                fileKind,
                separator: this.labelService.getSeparator(folder.resource.scheme),
            });
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', 'Other files'));
        }
        this.renderFolderDetails(folder, templateData);
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const folderMatchElement = DOM.append(container, DOM.$('.foldermatch'));
        const label = this.labels.create(folderMatchElement, {
            supportDescriptionHighlights: true,
            supportHighlights: true,
        });
        disposables.add(label);
        const badge = new CountBadge(DOM.append(folderMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(folderMatchElement, DOM.$('.actionBarContainer'));
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(true);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true,
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain,
        };
    }
    renderElement(node, index, templateData) {
        const folderMatch = node.element;
        if (folderMatch.resource) {
            const workspaceFolder = this.contextService.getWorkspaceFolder(folderMatch.resource);
            if (workspaceFolder && isEqual(workspaceFolder.uri, folderMatch.resource)) {
                templateData.label.setFile(folderMatch.resource, {
                    fileKind: FileKind.ROOT_FOLDER,
                    hidePath: true,
                });
            }
            else {
                templateData.label.setFile(folderMatch.resource, {
                    fileKind: FileKind.FOLDER,
                    hidePath: this.searchView.isTreeLayoutViewVisible,
                });
            }
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', 'Other files'));
        }
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(folderMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        }));
        this.renderFolderDetails(folderMatch, templateData);
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderFolderDetails(folder, templateData) {
        const count = folder.recursiveMatchCount();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1
            ? nls.localize('searchFileMatches', '{0} files found', count)
            : nls.localize('searchFileMatch', '{0} file found', count));
        templateData.actions.context = {
            viewer: this.searchView.getControl(),
            element: folder,
        };
    }
};
FolderMatchRenderer = FolderMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, ILabelService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FolderMatchRenderer);
export { FolderMatchRenderer };
let FileMatchRenderer = class FileMatchRenderer extends Disposable {
    static { FileMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'fileMatch'; }
    constructor(searchView, labels, contextService, configurationService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FileMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const fileMatchElement = DOM.append(container, DOM.$('.filematch'));
        const label = this.labels.create(fileMatchElement);
        disposables.add(label);
        const badge = new CountBadge(DOM.append(fileMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(fileMatchElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true,
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            el: fileMatchElement,
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain,
        };
    }
    renderElement(node, index, templateData) {
        const fileMatch = node.element;
        templateData.el.setAttribute('data-resource', fileMatch.resource.toString());
        const decorationConfig = this.configurationService.getValue('search').decorations;
        templateData.label.setFile(fileMatch.resource, {
            range: isSearchTreeAIFileMatch(fileMatch) ? fileMatch.getFullRange() : undefined,
            hidePath: this.searchView.isTreeLayoutViewVisible &&
                !isSearchTreeFolderMatchNoRoot(fileMatch.parent()),
            hideIcon: false,
            fileDecorations: { colors: decorationConfig.colors, badges: decorationConfig.badges },
        });
        const count = fileMatch.count();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1
            ? nls.localize('searchMatches', '{0} matches found', count)
            : nls.localize('searchMatch', '{0} match found', count));
        templateData.actions.context = {
            viewer: this.searchView.getControl(),
            element: fileMatch,
        };
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(fileMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        }));
        // when hidesExplorerArrows: true, then the file nodes should still have a twistie because it would otherwise
        // be hard to tell whether the node is collapsed or expanded.
        const twistieContainer = templateData.el.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.add('force-twistie');
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
FileMatchRenderer = FileMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FileMatchRenderer);
export { FileMatchRenderer };
let MatchRenderer = class MatchRenderer extends Disposable {
    static { MatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'match'; }
    constructor(searchView, contextService, configurationService, instantiationService, contextKeyService, hoverService) {
        super();
        this.searchView = searchView;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.templateId = MatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        container.classList.add('linematch');
        const lineNumber = DOM.append(container, DOM.$('span.matchLineNum'));
        const parent = DOM.append(container, DOM.$('a.plain.match'));
        const before = DOM.append(parent, DOM.$('span'));
        const match = DOM.append(parent, DOM.$('span.findInFileMatch'));
        const replace = DOM.append(parent, DOM.$('span.replaceMatch'));
        const after = DOM.append(parent, DOM.$('span'));
        const actionBarContainer = DOM.append(container, DOM.$('span.actionBarContainer'));
        const disposables = new DisposableStore();
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true,
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            parent,
            before,
            match,
            replace,
            after,
            lineNumber,
            actions,
            disposables,
            contextKeyService: contextKeyServiceMain,
        };
    }
    renderElement(node, index, templateData) {
        const match = node.element;
        const preview = match.preview();
        const replace = this.searchView.model.isReplaceActive() &&
            !!this.searchView.model.replaceString &&
            !match.isReadonly;
        templateData.before.textContent = preview.before;
        templateData.match.textContent = preview.inside;
        templateData.match.classList.toggle('replace', replace);
        templateData.replace.textContent = replace ? match.replaceString : '';
        templateData.after.textContent = preview.after;
        const title = (preview.fullBefore +
            (replace ? match.replaceString : preview.inside) +
            preview.after)
            .trim()
            .substr(0, 999);
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.parent, title));
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!match.isReadonly);
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const extraLinesStr = numLines > 0 ? `+${numLines}` : '';
        const showLineNumbers = this.configurationService.getValue('search').showLineNumbers;
        const lineNumberStr = showLineNumbers ? `${match.range().startLineNumber}:` : '';
        templateData.lineNumber.classList.toggle('show', numLines > 0 || showLineNumbers);
        templateData.lineNumber.textContent = lineNumberStr + extraLinesStr;
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.lineNumber, this.getMatchTitle(match, showLineNumbers)));
        templateData.actions.context = {
            viewer: this.searchView.getControl(),
            element: match,
        };
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    getMatchTitle(match, showLineNumbers) {
        const startLine = match.range().startLineNumber;
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const lineNumStr = showLineNumbers
            ? nls.localize('lineNumStr', 'From line {0}', startLine, numLines) + ' '
            : '';
        const numLinesStr = numLines > 0 ? '+ ' + nls.localize('numLinesStr', '{0} more lines', numLines) : '';
        return lineNumStr + numLinesStr;
    }
};
MatchRenderer = MatchRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IHoverService)
], MatchRenderer);
export { MatchRenderer };
let SearchAccessibilityProvider = class SearchAccessibilityProvider {
    constructor(searchView, labelService) {
        this.searchView = searchView;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return nls.localize('search', 'Search');
    }
    getAriaLabel(element) {
        if (isSearchTreeFolderMatch(element)) {
            const count = element
                .allDownstreamFileMatches()
                .reduce((total, current) => total + current.count(), 0);
            return element.resource
                ? nls.localize('folderMatchAriaLabel', '{0} matches in folder root {1}, Search result', count, element.name())
                : nls.localize('otherFilesAriaLabel', '{0} matches outside of the workspace, Search result', count);
        }
        if (isSearchTreeFileMatch(element)) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) ||
                element.resource.fsPath;
            return nls.localize('fileMatchAriaLabel', '{0} matches in file {1} of folder {2}, Search result', element.count(), element.name(), paths.dirname(path));
        }
        if (isSearchTreeMatch(element)) {
            const match = element;
            const searchModel = this.searchView.model;
            const replace = searchModel.isReplaceActive() && !!searchModel.replaceString;
            const matchString = match.getMatchString();
            const range = match.range();
            const matchText = match.text().substr(0, range.endColumn + 150);
            if (replace) {
                return nls.localize('replacePreviewResultAria', "'{0}' at column {1} replace {2} with {3}", matchText, range.startColumn, matchString, match.replaceString);
            }
            return nls.localize('searchResultAria', "'{0}' at column {1} found {2}", matchText, range.startColumn, matchString);
        }
        return null;
    }
};
SearchAccessibilityProvider = __decorate([
    __param(1, ILabelService)
], SearchAccessibilityProvider);
export { SearchAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hSZXN1bHRzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFJakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUc3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVB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