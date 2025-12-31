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
import { localize } from '../../../../nls.js';
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { VIEW_PANE_ID, ISCMService, ISCMViewService, } from '../common/scm.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { getRepositoryResourceCount } from './util.js';
import { autorun, autorunWithStore, derived, observableFromEvent, } from '../../../../base/common/observable.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
const ActiveRepositoryContextKeys = {
    ActiveRepositoryName: new RawContextKey('scmActiveRepositoryName', ''),
    ActiveRepositoryBranchName: new RawContextKey('scmActiveRepositoryBranchName', ''),
};
let SCMActiveRepositoryController = class SCMActiveRepositoryController extends Disposable {
    constructor(activityService, configurationService, contextKeyService, scmService, scmViewService, statusbarService, titleService) {
        super();
        this.activityService = activityService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this._activeRepositoryNameContextKey = ActiveRepositoryContextKeys.ActiveRepositoryName.bindTo(this.contextKeyService);
        this._activeRepositoryBranchNameContextKey =
            ActiveRepositoryContextKeys.ActiveRepositoryBranchName.bindTo(this.contextKeyService);
        this.titleService.registerVariables([
            {
                name: 'activeRepositoryName',
                contextKey: ActiveRepositoryContextKeys.ActiveRepositoryName.key,
            },
            {
                name: 'activeRepositoryBranchName',
                contextKey: ActiveRepositoryContextKeys.ActiveRepositoryBranchName.key,
            },
        ]);
        this._countBadgeConfig = observableConfigValue('scm.countBadge', 'all', this.configurationService);
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._activeRepositoryHistoryItemRefName = derived((reader) => {
            const repository = this.scmViewService.activeRepository.read(reader);
            const historyProvider = repository?.provider.historyProvider.read(reader);
            const historyItemRef = historyProvider?.historyItemRef.read(reader);
            return historyItemRef?.name;
        });
        this._countBadgeRepositories = derived(this, (reader) => {
            switch (this._countBadgeConfig.read(reader)) {
                case 'all': {
                    const repositories = this._repositories.read(reader);
                    return [
                        ...Iterable.map(repositories, (r) => ({
                            provider: r.provider,
                            resourceCount: this._getRepositoryResourceCount(r),
                        })),
                    ];
                }
                case 'focused': {
                    const repository = this.scmViewService.activeRepository.read(reader);
                    return repository
                        ? [
                            {
                                provider: repository.provider,
                                resourceCount: this._getRepositoryResourceCount(repository),
                            },
                        ]
                        : [];
                }
                case 'off':
                    return [];
                default:
                    throw new Error('Invalid countBadge setting');
            }
        });
        this._countBadge = derived(this, (reader) => {
            let total = 0;
            for (const repository of this._countBadgeRepositories.read(reader)) {
                const count = repository.provider.count?.read(reader);
                const resourceCount = repository.resourceCount.read(reader);
                total = total + (count ?? resourceCount);
            }
            return total;
        });
        this._register(autorunWithStore((reader, store) => {
            const countBadge = this._countBadge.read(reader);
            this._updateActivityCountBadge(countBadge, store);
        }));
        this._register(autorunWithStore((reader, store) => {
            this._repositories.read(reader);
            const repository = this.scmViewService.activeRepository.read(reader);
            const commands = repository?.provider.statusBarCommands.read(reader);
            this._updateStatusBar(repository, commands ?? [], store);
        }));
        this._register(autorun((reader) => {
            const repository = this.scmViewService.activeRepository.read(reader);
            const historyItemRefName = this._activeRepositoryHistoryItemRefName.read(reader);
            this._updateActiveRepositoryContextKeys(repository?.provider.name, historyItemRefName);
        }));
    }
    _getRepositoryResourceCount(repository) {
        return observableFromEvent(this, repository.provider.onDidChangeResources, () => 
        /** @description repositoryResourceCount */ getRepositoryResourceCount(repository.provider));
    }
    _updateActivityCountBadge(count, store) {
        if (count === 0) {
            return;
        }
        const badge = new NumberBadge(count, (num) => localize('scmPendingChangesBadge', '{0} pending changes', num));
        store.add(this.activityService.showViewActivity(VIEW_PANE_ID, { badge }));
    }
    _updateStatusBar(repository, commands, store) {
        if (!repository) {
            return;
        }
        const label = repository.provider.rootUri
            ? `${basename(repository.provider.rootUri)} (${repository.provider.label})`
            : repository.provider.label;
        for (let index = 0; index < commands.length; index++) {
            const command = commands[index];
            const tooltip = `${label}${command.tooltip ? ` - ${command.tooltip}` : ''}`;
            // Get a repository agnostic name for the status bar action, derive this from the
            // first command argument which is in the form "git.<command>/<number>"
            let repoAgnosticActionName = command.arguments?.[0];
            if (repoAgnosticActionName && typeof repoAgnosticActionName === 'string') {
                repoAgnosticActionName = repoAgnosticActionName
                    .substring(0, repoAgnosticActionName.lastIndexOf('/'))
                    .replace(/^git\./, '');
                if (repoAgnosticActionName.length > 1) {
                    repoAgnosticActionName =
                        repoAgnosticActionName[0].toLocaleUpperCase() + repoAgnosticActionName.slice(1);
                }
            }
            else {
                repoAgnosticActionName = '';
            }
            const statusbarEntry = {
                name: localize('status.scm', 'Source Control') +
                    (repoAgnosticActionName ? ` ${repoAgnosticActionName}` : ''),
                text: command.title,
                ariaLabel: tooltip,
                tooltip,
                command: command.id ? command : undefined,
            };
            store.add(index === 0
                ? this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, 10000)
                : this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, {
                    location: { id: `status.scm.${index - 1}`, priority: 10000 },
                    alignment: 1 /* MainThreadStatusBarAlignment.RIGHT */,
                    compact: true,
                }));
        }
        // Ssource control provider status bar entry
        if (this.scmService.repositoryCount > 1) {
            const repositoryStatusbarEntry = {
                name: localize('status.scm.provider', 'Source Control Provider'),
                text: `$(repo) ${repository.provider.name}`,
                ariaLabel: label,
                tooltip: label,
                command: 'scm.setActiveProvider',
            };
            store.add(this.statusbarService.addEntry(repositoryStatusbarEntry, 'status.scm.provider', 0 /* MainThreadStatusBarAlignment.LEFT */, {
                location: { id: `status.scm.0`, priority: 10000 },
                alignment: 0 /* MainThreadStatusBarAlignment.LEFT */,
                compact: true,
            }));
        }
    }
    _updateActiveRepositoryContextKeys(repositoryName, branchName) {
        this._activeRepositoryNameContextKey.set(repositoryName ?? '');
        this._activeRepositoryBranchNameContextKey.set(branchName ?? '');
    }
};
SCMActiveRepositoryController = __decorate([
    __param(0, IActivityService),
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, ISCMService),
    __param(4, ISCMViewService),
    __param(5, IStatusbarService),
    __param(6, ITitleService)
], SCMActiveRepositoryController);
export { SCMActiveRepositoryController };
let SCMActiveResourceContextKeyController = class SCMActiveResourceContextKeyController extends Disposable {
    constructor(editorGroupsService, scmService, uriIdentityService) {
        super();
        this.scmService = scmService;
        this.uriIdentityService = uriIdentityService;
        this._onDidRepositoryChange = new Emitter();
        const activeResourceHasChangesContextKey = new RawContextKey('scmActiveResourceHasChanges', false, localize('scmActiveResourceHasChanges', 'Whether the active resource has changes'));
        const activeResourceRepositoryContextKey = new RawContextKey('scmActiveResourceRepository', undefined, localize('scmActiveResourceRepository', "The active resource's repository"));
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._store.add(autorunWithStore((reader, store) => {
            for (const repository of this._repositories.read(reader)) {
                store.add(Event.runAndSubscribe(repository.provider.onDidChangeResources, () => {
                    this._onDidRepositoryChange.fire();
                }));
            }
        }));
        // Create context key providers which will update the context keys based on each groups active editor
        const hasChangesContextKeyProvider = {
            contextKey: activeResourceHasChangesContextKey,
            getGroupContextKeyValue: (group) => this._getEditorHasChanges(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event,
        };
        const repositoryContextKeyProvider = {
            contextKey: activeResourceRepositoryContextKey,
            getGroupContextKeyValue: (group) => this._getEditorRepositoryId(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event,
        };
        this._store.add(editorGroupsService.registerContextKeyProvider(hasChangesContextKeyProvider));
        this._store.add(editorGroupsService.registerContextKeyProvider(repositoryContextKeyProvider));
    }
    _getEditorHasChanges(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return false;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        for (const resourceGroup of activeResourceRepository?.provider.groups ?? []) {
            if (resourceGroup.resources.some((scmResource) => this.uriIdentityService.extUri.isEqual(activeResource, scmResource.sourceUri))) {
                return true;
            }
        }
        return false;
    }
    _getEditorRepositoryId(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return undefined;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        return activeResourceRepository?.id;
    }
    dispose() {
        this._onDidRepositoryChange.dispose();
        super.dispose();
    }
};
SCMActiveResourceContextKeyController = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, ISCMService),
    __param(2, IUriIdentityService)
], SCMActiveResourceContextKeyController);
export { SCMActiveResourceContextKeyController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9hY3Rpdml0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sWUFBWSxFQUNaLFdBQVcsRUFFWCxlQUFlLEdBRWYsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFN0YsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4saUJBQWlCLEdBRWpCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFFL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1B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