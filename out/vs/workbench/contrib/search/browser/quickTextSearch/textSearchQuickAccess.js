var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { getSelectionKeyboardEvent, } from '../../../../../platform/list/browser/listService.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { DefaultQuickAccessFilterValue, } from '../../../../../platform/quickinput/common/quickAccess.js';
import { QuickInputButtonLocation, QuickInputHideReason, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { searchDetailsIcon, searchOpenInFileIcon, searchActivityBarIcon } from '../searchIcons.js';
import { getEditorSelectionFromMatch } from '../searchView.js';
import { getOutOfWorkspaceEditorResources, } from '../../common/search.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../../services/editor/common/editorService.js';
import { QueryBuilder, } from '../../../../services/search/common/queryBuilder.js';
import { VIEW_ID, } from '../../../../services/search/common/search.js';
import { Event } from '../../../../../base/common/event.js';
import { PickerEditorState } from '../../../../browser/quickaccess.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { Sequencer } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { SearchModelImpl } from '../searchTreeModel/searchModel.js';
import { SearchModelLocation, } from '../searchTreeModel/searchTreeCommon.js';
import { searchComparer } from '../searchCompare.js';
export const TEXT_SEARCH_QUICK_ACCESS_PREFIX = '%';
const DEFAULT_TEXT_QUERY_BUILDER_OPTIONS = {
    _reason: 'quickAccessSearch',
    disregardIgnoreFiles: false,
    disregardExcludeSettings: false,
    onlyOpenEditors: false,
    expandPatterns: true,
};
const MAX_FILES_SHOWN = 30;
const MAX_RESULTS_PER_FILE = 10;
const DEBOUNCE_DELAY = 75;
let TextSearchQuickAccess = class TextSearchQuickAccess extends PickerQuickAccessProvider {
    _getTextQueryBuilderOptions(charsPerLine) {
        return {
            ...DEFAULT_TEXT_QUERY_BUILDER_OPTIONS,
            ...{
                extraFileResources: this._instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
                maxResults: this.configuration.maxResults ?? undefined,
                isSmartCase: this.configuration.smartCase,
            },
            previewOptions: {
                matchLines: 1,
                charsPerLine,
            },
        };
    }
    constructor(_instantiationService, _contextService, _editorService, _labelService, _viewsService, _configurationService) {
        super(TEXT_SEARCH_QUICK_ACCESS_PREFIX, {
            canAcceptInBackground: true,
            shouldSkipTrimPickFilter: true,
        });
        this._instantiationService = _instantiationService;
        this._contextService = _contextService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._viewsService = _viewsService;
        this._configurationService = _configurationService;
        this.currentAsyncSearch = Promise.resolve({
            results: [],
            messages: [],
        });
        this.queryBuilder = this._instantiationService.createInstance(QueryBuilder);
        this.searchModel = this._register(this._instantiationService.createInstance(SearchModelImpl));
        this.editorViewState = this._register(this._instantiationService.createInstance(PickerEditorState));
        this.searchModel.location = SearchModelLocation.QUICK_ACCESS;
        this.editorSequencer = new Sequencer();
    }
    dispose() {
        this.searchModel.dispose();
        super.dispose();
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        if (TEXT_SEARCH_QUICK_ACCESS_PREFIX.length < picker.value.length) {
            picker.valueSelection = [TEXT_SEARCH_QUICK_ACCESS_PREFIX.length, picker.value.length];
        }
        picker.buttons = [
            {
                location: QuickInputButtonLocation.Inline,
                iconClass: ThemeIcon.asClassName(Codicon.goToSearch),
                tooltip: localize('goToSearch', 'Open in Search View'),
            },
        ];
        this.editorViewState.reset();
        disposables.add(picker.onDidTriggerButton(async () => {
            if (this.searchModel.searchResult.count() > 0) {
                await this.moveToSearchViewlet(undefined);
            }
            else {
                this._viewsService.openView(VIEW_ID, true);
            }
            picker.hide();
        }));
        const onDidChangeActive = () => {
            const [item] = picker.activeItems;
            if (item?.match) {
                // we must remember our curret view state to be able to restore (will automatically track if there is already stored state)
                this.editorViewState.set();
                const itemMatch = item.match;
                this.editorSequencer.queue(async () => {
                    await this.editorViewState.openTransientEditor({
                        resource: itemMatch.parent().resource,
                        options: {
                            preserveFocus: true,
                            revealIfOpened: true,
                            ignoreError: true,
                            selection: itemMatch.range(),
                        },
                    });
                });
            }
        };
        disposables.add(Event.debounce(picker.onDidChangeActive, (last, event) => event, DEBOUNCE_DELAY, true)(onDidChangeActive));
        disposables.add(Event.once(picker.onWillHide)(({ reason }) => {
            // Restore view state upon cancellation if we changed it
            // but only when the picker was closed via explicit user
            // gesture and not e.g. when focus was lost because that
            // could mean the user clicked into the editor directly.
            if (reason === QuickInputHideReason.Gesture) {
                this.editorViewState.restore();
            }
        }));
        disposables.add(Event.once(picker.onDidHide)(({ reason }) => {
            this.searchModel.searchResult.toggleHighlights(false);
        }));
        disposables.add(super.provide(picker, token, runOptions));
        disposables.add(picker.onDidAccept(() => this.searchModel.searchResult.toggleHighlights(false)));
        return disposables;
    }
    get configuration() {
        const editorConfig = this._configurationService.getValue().workbench?.editor;
        const searchConfig = this._configurationService.getValue().search;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            preserveInput: searchConfig.quickAccess.preserveInput,
            maxResults: searchConfig.maxResults,
            smartCase: searchConfig.smartCase,
            sortOrder: searchConfig.sortOrder,
        };
    }
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    doSearch(contentPattern, token) {
        if (contentPattern === '') {
            return undefined;
        }
        const folderResources = this._contextService.getWorkspace().folders;
        const content = {
            pattern: contentPattern,
        };
        this.searchModel.searchResult.toggleHighlights(false);
        const charsPerLine = content.isRegExp ? 10000 : 1000; // from https://github.com/microsoft/vscode/blob/e7ad5651ac26fa00a40aa1e4010e81b92f655569/src/vs/workbench/contrib/search/browser/searchView.ts#L1508
        const query = this.queryBuilder.text(content, folderResources.map((folder) => folder.uri), this._getTextQueryBuilderOptions(charsPerLine));
        const result = this.searchModel.search(query, undefined, token);
        const getAsyncResults = async () => {
            this.currentAsyncSearch = result.asyncResults;
            await result.asyncResults;
            const syncResultURIs = new ResourceSet(result.syncResults.map((e) => e.resource));
            return this.searchModel.searchResult
                .matches(false)
                .filter((e) => !syncResultURIs.has(e.resource));
        };
        return {
            syncResults: this.searchModel.searchResult.matches(false),
            asyncResults: getAsyncResults(),
        };
    }
    async moveToSearchViewlet(currentElem) {
        // this function takes this._searchModel and moves it to the search viewlet's search model.
        // then, this._searchModel will construct a new (empty) SearchModel.
        this._viewsService.openView(VIEW_ID, false);
        const viewlet = this._viewsService.getActiveViewWithId(VIEW_ID);
        await viewlet.replaceSearchModel(this.searchModel, this.currentAsyncSearch);
        this.searchModel = this._instantiationService.createInstance(SearchModelImpl);
        this.searchModel.location = SearchModelLocation.QUICK_ACCESS;
        const viewer = viewlet?.getControl();
        if (currentElem) {
            viewer.setFocus([currentElem], getSelectionKeyboardEvent());
            viewer.setSelection([currentElem], getSelectionKeyboardEvent());
            viewer.reveal(currentElem);
        }
        else {
            viewlet.searchAndReplaceWidget.focus();
        }
    }
    _getPicksFromMatches(matches, limit, firstFile) {
        matches = matches.sort((a, b) => {
            if (firstFile) {
                if (firstFile === a.resource) {
                    return -1;
                }
                else if (firstFile === b.resource) {
                    return 1;
                }
            }
            return searchComparer(a, b, this.configuration.sortOrder);
        });
        const files = matches.length > limit ? matches.slice(0, limit) : matches;
        const picks = [];
        for (let fileIndex = 0; fileIndex < matches.length; fileIndex++) {
            if (fileIndex === limit) {
                picks.push({
                    type: 'separator',
                });
                picks.push({
                    label: localize('QuickSearchSeeMoreFiles', 'See More Files'),
                    iconClass: ThemeIcon.asClassName(searchDetailsIcon),
                    accept: async () => {
                        await this.moveToSearchViewlet(matches[limit]);
                    },
                });
                break;
            }
            const iFileInstanceMatch = files[fileIndex];
            const label = basenameOrAuthority(iFileInstanceMatch.resource);
            const description = this._labelService.getUriLabel(dirname(iFileInstanceMatch.resource), {
                relative: true,
            });
            picks.push({
                label,
                type: 'separator',
                description,
                buttons: [
                    {
                        iconClass: ThemeIcon.asClassName(searchOpenInFileIcon),
                        tooltip: localize('QuickSearchOpenInFile', 'Open File'),
                    },
                ],
                trigger: async () => {
                    await this.handleAccept(iFileInstanceMatch, {});
                    return TriggerAction.CLOSE_PICKER;
                },
            });
            const results = iFileInstanceMatch.matches() ?? [];
            for (let matchIndex = 0; matchIndex < results.length; matchIndex++) {
                const element = results[matchIndex];
                if (matchIndex === MAX_RESULTS_PER_FILE) {
                    picks.push({
                        label: localize('QuickSearchMore', 'More'),
                        iconClass: ThemeIcon.asClassName(searchDetailsIcon),
                        accept: async () => {
                            await this.moveToSearchViewlet(element);
                        },
                    });
                    break;
                }
                const preview = element.preview();
                const previewText = (preview.before + preview.inside + preview.after)
                    .trim()
                    .substring(0, 999);
                const match = [
                    {
                        start: preview.before.length,
                        end: preview.before.length + preview.inside.length,
                    },
                ];
                picks.push({
                    label: `${previewText}`,
                    highlights: {
                        label: match,
                    },
                    buttons: [
                        {
                            iconClass: ThemeIcon.asClassName(searchActivityBarIcon),
                            tooltip: localize('showMore', 'Open in Search View'),
                        },
                    ],
                    ariaLabel: `Match at location ${element.range().startLineNumber}:${element.range().startColumn} - ${previewText}`,
                    accept: async (keyMods, event) => {
                        await this.handleAccept(iFileInstanceMatch, {
                            keyMods,
                            selection: getEditorSelectionFromMatch(element, this.searchModel),
                            preserveFocus: event.inBackground,
                            forcePinned: event.inBackground,
                        });
                    },
                    trigger: async () => {
                        await this.moveToSearchViewlet(element);
                        return TriggerAction.CLOSE_PICKER;
                    },
                    match: element,
                });
            }
        }
        return picks;
    }
    async handleAccept(iFileInstanceMatch, options) {
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.keyMods?.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
            selection: options.selection,
        };
        // from https://github.com/microsoft/vscode/blob/f40dabca07a1622b2a0ae3ee741cfc94ab964bef/src/vs/workbench/contrib/search/browser/anythingQuickAccess.ts#L1037
        const targetGroup = options.keyMods?.alt ||
            (this.configuration.openEditorPinned && options.keyMods?.ctrlCmd) ||
            options.forceOpenSideBySide
            ? SIDE_GROUP
            : ACTIVE_GROUP;
        await this._editorService.openEditor({
            resource: iFileInstanceMatch.resource,
            options: editorOptions,
        }, targetGroup);
    }
    _getPicks(contentPattern, disposables, token) {
        const searchModelAtTimeOfSearch = this.searchModel;
        if (contentPattern === '') {
            this.searchModel.searchResult.clear();
            return [
                {
                    label: localize('enterSearchTerm', 'Enter a term to search for across your files.'),
                },
            ];
        }
        const conditionalTokenCts = disposables.add(new CancellationTokenSource());
        disposables.add(token.onCancellationRequested(() => {
            if (searchModelAtTimeOfSearch.location === SearchModelLocation.QUICK_ACCESS) {
                // if the search model has not been imported to the panel, you can cancel
                conditionalTokenCts.cancel();
            }
        }));
        const allMatches = this.doSearch(contentPattern, conditionalTokenCts.token);
        if (!allMatches) {
            return null;
        }
        const matches = allMatches.syncResults;
        const syncResult = this._getPicksFromMatches(matches, MAX_FILES_SHOWN, this._editorService.activeEditor?.resource);
        if (syncResult.length > 0) {
            this.searchModel.searchResult.toggleHighlights(true);
        }
        if (matches.length >= MAX_FILES_SHOWN) {
            return syncResult;
        }
        return {
            picks: syncResult,
            additionalPicks: allMatches.asyncResults
                .then((asyncResults) => asyncResults.length + syncResult.length === 0
                ? [
                    {
                        label: localize('noAnythingResults', 'No matching results'),
                    },
                ]
                : this._getPicksFromMatches(asyncResults, MAX_FILES_SHOWN - matches.length))
                .then((picks) => {
                if (picks.length > 0) {
                    this.searchModel.searchResult.toggleHighlights(true);
                }
                return picks;
            }),
        };
    }
};
TextSearchQuickAccess = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorService),
    __param(3, ILabelService),
    __param(4, IViewsService),
    __param(5, IConfigurationService)
], TextSearchQuickAccess);
export { TextSearchQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9xdWlja1RleHRTZWFyY2gvdGV4dFNlYXJjaFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUlOLHlCQUF5QixFQUV6QixhQUFhLEdBQ2IsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sNkJBQTZCLEdBRTdCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUlOLHdCQUF3QixFQUN4QixvQkFBb0IsR0FDcEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sdURB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