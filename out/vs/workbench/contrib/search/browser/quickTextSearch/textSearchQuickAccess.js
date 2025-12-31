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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvcXVpY2tUZXh0U2VhcmNoL3RleHRTZWFyY2hRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFJTix5QkFBeUIsRUFFekIsYUFBYSxHQUNiLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUNOLDZCQUE2QixHQUU3QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFJTix3QkFBd0IsRUFDeEIsb0JBQW9CLEdBQ3BCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLHVEQUF1RCxD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