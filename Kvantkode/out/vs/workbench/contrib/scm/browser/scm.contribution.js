/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2, Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { QuickDiffWorkbenchController } from './quickDiffDecorator.js';
import { VIEWLET_ID, ISCMService, VIEW_PANE_ID, ISCMViewService, REPOSITORIES_VIEW_PANE_ID, HISTORY_VIEW_PANE_ID, } from '../common/scm.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { SCMActiveResourceContextKeyController, SCMActiveRepositoryController } from './activity.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { SCMService } from '../common/scmService.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { SCMViewPaneContainer } from './scmViewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ContextKeys, SCMViewPane } from './scmViewPane.js';
import { RepositoryPicker, SCMViewService } from './scmViewService.js';
import { SCMRepositoriesViewPane } from './scmRepositoriesViewPane.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Context as SuggestContext } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { MANAGE_TRUST_COMMAND_ID, WorkspaceTrustContext } from '../../workspace/common/workspace.js';
import { IQuickDiffService } from '../common/quickDiff.js';
import { QuickDiffService } from '../common/quickDiffService.js';
import { getActiveElement, isActiveElement } from '../../../../base/browser/dom.js';
import { SCMWorkingSetController } from './workingSet.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { isSCMRepository } from './util.js';
import { SCMHistoryViewPane } from './scmHistoryViewPane.js';
import { QuickDiffModelService, IQuickDiffModelService } from './quickDiffModel.js';
import { QuickDiffEditorController } from './quickDiffWidget.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { SCMAccessibilityHelp } from './scmAccessibilityHelp.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
ModesRegistry.registerLanguage({
    id: 'scminput',
    extensions: [],
    aliases: [], // hide from language selector
    mimetypes: ['text/x-scm-input'],
});
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(QuickDiffWorkbenchController, 3 /* LifecyclePhase.Restored */);
registerEditorContribution(QuickDiffEditorController.ID, QuickDiffEditorController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
const sourceControlViewIcon = registerIcon('source-control-view-icon', Codicon.sourceControl, localize('sourceControlViewIcon', 'View icon of the Source Control view.'));
const viewContainer = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: localize2('source control', 'Source Control'),
    ctorDescriptor: new SyncDescriptor(SCMViewPaneContainer),
    storageId: 'workbench.scm.views.state',
    icon: sourceControlViewIcon,
    alwaysUseContainerInfo: true,
    order: 2,
    hideIfEmpty: true,
}, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
const containerTitle = localize('source control view', 'Source Control');
viewsRegistry.registerViewWelcomeContent(VIEW_PANE_ID, {
    content: localize('no open repo', 'No source control providers registered.'),
    when: 'default',
});
viewsRegistry.registerViewWelcomeContent(VIEW_PANE_ID, {
    content: localize('no open repo in an untrusted workspace', 'None of the registered source control providers work in Restricted Mode.'),
    when: ContextKeyExpr.and(ContextKeyExpr.equals('scm.providerCount', 0), WorkspaceTrustContext.IsEnabled, WorkspaceTrustContext.IsTrusted.toNegated()),
});
viewsRegistry.registerViewWelcomeContent(VIEW_PANE_ID, {
    content: `[${localize('manageWorkspaceTrustAction', 'Manage Workspace Trust')}](command:${MANAGE_TRUST_COMMAND_ID})`,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('scm.providerCount', 0), WorkspaceTrustContext.IsEnabled, WorkspaceTrustContext.IsTrusted.toNegated()),
});
viewsRegistry.registerViewWelcomeContent(HISTORY_VIEW_PANE_ID, {
    content: localize('no history items', 'The selected source control provider does not have any source control history items.'),
    when: ContextKeys.SCMHistoryItemCount.isEqualTo(0),
});
viewsRegistry.registerViews([
    {
        id: REPOSITORIES_VIEW_PANE_ID,
        containerTitle,
        name: localize2('scmRepositories', 'Repositories'),
        singleViewPaneContainerTitle: localize('source control repositories', 'Source Control Repositories'),
        ctorDescriptor: new SyncDescriptor(SCMRepositoriesViewPane),
        canToggleVisibility: true,
        hideByDefault: true,
        canMoveView: true,
        weight: 20,
        order: 0,
        when: ContextKeyExpr.and(ContextKeyExpr.has('scm.providerCount'), ContextKeyExpr.notEquals('scm.providerCount', 0)),
        // readonly when = ContextKeyExpr.or(ContextKeyExpr.equals('config.scm.alwaysShowProviders', true), ContextKeyExpr.and(ContextKeyExpr.notEquals('scm.providerCount', 0), ContextKeyExpr.notEquals('scm.providerCount', 1)));
        containerIcon: sourceControlViewIcon,
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: VIEW_PANE_ID,
        containerTitle,
        name: localize2('scmChanges', 'Changes'),
        singleViewPaneContainerTitle: containerTitle,
        ctorDescriptor: new SyncDescriptor(SCMViewPane),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 40,
        order: 1,
        containerIcon: sourceControlViewIcon,
        openCommandActionDescriptor: {
            id: viewContainer.id,
            mnemonicTitle: localize({ key: 'miViewSCM', comment: ['&& denotes a mnemonic'] }, 'Source &&Control'),
            keybindings: {
                primary: 0,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */ },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */ },
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */ },
            },
            order: 2,
        },
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: HISTORY_VIEW_PANE_ID,
        containerTitle,
        name: localize2('scmGraph', 'Graph'),
        singleViewPaneContainerTitle: localize('source control graph', 'Source Control Graph'),
        ctorDescriptor: new SyncDescriptor(SCMHistoryViewPane),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 40,
        order: 2,
        when: ContextKeyExpr.and(ContextKeyExpr.has('scm.historyProviderCount'), ContextKeyExpr.notEquals('scm.historyProviderCount', 0)),
        containerIcon: sourceControlViewIcon,
    },
], viewContainer);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SCMActiveRepositoryController, 3 /* LifecyclePhase.Restored */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SCMActiveResourceContextKeyController, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(SCMWorkingSetController.ID, SCMWorkingSetController, 3 /* WorkbenchPhase.AfterRestored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'scm',
    order: 5,
    title: localize('scmConfigurationTitle', 'Source Control'),
    type: 'object',
    scope: 5 /* ConfigurationScope.RESOURCE */,
    properties: {
        'scm.diffDecorations': {
            type: 'string',
            enum: ['all', 'gutter', 'overview', 'minimap', 'none'],
            enumDescriptions: [
                localize('scm.diffDecorations.all', 'Show the diff decorations in all available locations.'),
                localize('scm.diffDecorations.gutter', 'Show the diff decorations only in the editor gutter.'),
                localize('scm.diffDecorations.overviewRuler', 'Show the diff decorations only in the overview ruler.'),
                localize('scm.diffDecorations.minimap', 'Show the diff decorations only in the minimap.'),
                localize('scm.diffDecorations.none', 'Do not show the diff decorations.'),
            ],
            default: 'all',
            description: localize('diffDecorations', 'Controls diff decorations in the editor.'),
        },
        'scm.diffDecorationsGutterWidth': {
            type: 'number',
            enum: [1, 2, 3, 4, 5],
            default: 3,
            description: localize('diffGutterWidth', 'Controls the width(px) of diff decorations in gutter (added & modified).'),
        },
        'scm.diffDecorationsGutterVisibility': {
            type: 'string',
            enum: ['always', 'hover'],
            enumDescriptions: [
                localize('scm.diffDecorationsGutterVisibility.always', 'Show the diff decorator in the gutter at all times.'),
                localize('scm.diffDecorationsGutterVisibility.hover', 'Show the diff decorator in the gutter only on hover.'),
            ],
            description: localize('scm.diffDecorationsGutterVisibility', 'Controls the visibility of the Source Control diff decorator in the gutter.'),
            default: 'always',
        },
        'scm.diffDecorationsGutterAction': {
            type: 'string',
            enum: ['diff', 'none'],
            enumDescriptions: [
                localize('scm.diffDecorationsGutterAction.diff', 'Show the inline diff Peek view on click.'),
                localize('scm.diffDecorationsGutterAction.none', 'Do nothing.'),
            ],
            description: localize('scm.diffDecorationsGutterAction', 'Controls the behavior of Source Control diff gutter decorations.'),
            default: 'diff',
        },
        'scm.diffDecorationsGutterPattern': {
            type: 'object',
            description: localize('diffGutterPattern', 'Controls whether a pattern is used for the diff decorations in gutter.'),
            additionalProperties: false,
            properties: {
                added: {
                    type: 'boolean',
                    description: localize('diffGutterPatternAdded', 'Use pattern for the diff decorations in gutter for added lines.'),
                },
                modified: {
                    type: 'boolean',
                    description: localize('diffGutterPatternModifed', 'Use pattern for the diff decorations in gutter for modified lines.'),
                },
            },
            default: {
                added: false,
                modified: true,
            },
        },
        'scm.diffDecorationsIgnoreTrimWhitespace': {
            type: 'string',
            enum: ['true', 'false', 'inherit'],
            enumDescriptions: [
                localize('scm.diffDecorationsIgnoreTrimWhitespace.true', 'Ignore leading and trailing whitespace.'),
                localize('scm.diffDecorationsIgnoreTrimWhitespace.false', 'Do not ignore leading and trailing whitespace.'),
                localize('scm.diffDecorationsIgnoreTrimWhitespace.inherit', 'Inherit from `diffEditor.ignoreTrimWhitespace`.'),
            ],
            description: localize('diffDecorationsIgnoreTrimWhitespace', 'Controls whether leading and trailing whitespace is ignored in Source Control diff gutter decorations.'),
            default: 'false',
        },
        'scm.alwaysShowActions': {
            type: 'boolean',
            description: localize('alwaysShowActions', 'Controls whether inline actions are always visible in the Source Control view.'),
            default: false,
        },
        'scm.countBadge': {
            type: 'string',
            enum: ['all', 'focused', 'off'],
            enumDescriptions: [
                localize('scm.countBadge.all', 'Show the sum of all Source Control Provider count badges.'),
                localize('scm.countBadge.focused', 'Show the count badge of the focused Source Control Provider.'),
                localize('scm.countBadge.off', 'Disable the Source Control count badge.'),
            ],
            description: localize('scm.countBadge', 'Controls the count badge on the Source Control icon on the Activity Bar.'),
            default: 'all',
        },
        'scm.providerCountBadge': {
            type: 'string',
            enum: ['hidden', 'auto', 'visible'],
            enumDescriptions: [
                localize('scm.providerCountBadge.hidden', 'Hide Source Control Provider count badges.'),
                localize('scm.providerCountBadge.auto', 'Only show count badge for Source Control Provider when non-zero.'),
                localize('scm.providerCountBadge.visible', 'Show Source Control Provider count badges.'),
            ],
            markdownDescription: localize('scm.providerCountBadge', 'Controls the count badges on Source Control Provider headers. These headers appear in the Source Control view when there is more than one provider or when the {0} setting is enabled, and in the Source Control Repositories view.', '\`#scm.alwaysShowRepositories#\`'),
            default: 'hidden',
        },
        'scm.defaultViewMode': {
            type: 'string',
            enum: ['tree', 'list'],
            enumDescriptions: [
                localize('scm.defaultViewMode.tree', 'Show the repository changes as a tree.'),
                localize('scm.defaultViewMode.list', 'Show the repository changes as a list.'),
            ],
            description: localize('scm.defaultViewMode', 'Controls the default Source Control repository view mode.'),
            default: 'list',
        },
        'scm.defaultViewSortKey': {
            type: 'string',
            enum: ['name', 'path', 'status'],
            enumDescriptions: [
                localize('scm.defaultViewSortKey.name', 'Sort the repository changes by file name.'),
                localize('scm.defaultViewSortKey.path', 'Sort the repository changes by path.'),
                localize('scm.defaultViewSortKey.status', 'Sort the repository changes by Source Control status.'),
            ],
            description: localize('scm.defaultViewSortKey', 'Controls the default Source Control repository changes sort order when viewed as a list.'),
            default: 'path',
        },
        'scm.autoReveal': {
            type: 'boolean',
            description: localize('autoReveal', 'Controls whether the Source Control view should automatically reveal and select files when opening them.'),
            default: true,
        },
        'scm.inputFontFamily': {
            type: 'string',
            markdownDescription: localize('inputFontFamily', "Controls the font for the input message. Use `default` for the workbench user interface font family, `editor` for the `#editor.fontFamily#`'s value, or a custom font family."),
            default: 'default',
        },
        'scm.inputFontSize': {
            type: 'number',
            markdownDescription: localize('inputFontSize', 'Controls the font size for the input message in pixels.'),
            default: 13,
        },
        'scm.inputMaxLineCount': {
            type: 'number',
            markdownDescription: localize('inputMaxLines', 'Controls the maximum number of lines that the input will auto-grow to.'),
            minimum: 1,
            maximum: 50,
            default: 10,
        },
        'scm.inputMinLineCount': {
            type: 'number',
            markdownDescription: localize('inputMinLines', 'Controls the minimum number of lines that the input will auto-grow from.'),
            minimum: 1,
            maximum: 50,
            default: 1,
        },
        'scm.alwaysShowRepositories': {
            type: 'boolean',
            markdownDescription: localize('alwaysShowRepository', 'Controls whether repositories should always be visible in the Source Control view.'),
            default: false,
        },
        'scm.repositories.sortOrder': {
            type: 'string',
            enum: ['discovery time', 'name', 'path'],
            enumDescriptions: [
                localize('scm.repositoriesSortOrder.discoveryTime', 'Repositories in the Source Control Repositories view are sorted by discovery time. Repositories in the Source Control view are sorted in the order that they were selected.'),
                localize('scm.repositoriesSortOrder.name', 'Repositories in the Source Control Repositories and Source Control views are sorted by repository name.'),
                localize('scm.repositoriesSortOrder.path', 'Repositories in the Source Control Repositories and Source Control views are sorted by repository path.'),
            ],
            description: localize('repositoriesSortOrder', 'Controls the sort order of the repositories in the source control repositories view.'),
            default: 'discovery time',
        },
        'scm.repositories.visible': {
            type: 'number',
            description: localize('providersVisible', 'Controls how many repositories are visible in the Source Control Repositories section. Set to 0, to be able to manually resize the view.'),
            default: 10,
        },
        'scm.showActionButton': {
            type: 'boolean',
            markdownDescription: localize('showActionButton', 'Controls whether an action button can be shown in the Source Control view.'),
            default: true,
        },
        'scm.showInputActionButton': {
            type: 'boolean',
            markdownDescription: localize('showInputActionButton', 'Controls whether an action button can be shown in the Source Control input.'),
            default: true,
        },
        'scm.workingSets.enabled': {
            type: 'boolean',
            description: localize('scm.workingSets.enabled', 'Controls whether to store editor working sets when switching between source control history item groups.'),
            default: false,
        },
        'scm.workingSets.default': {
            type: 'string',
            enum: ['empty', 'current'],
            enumDescriptions: [
                localize('scm.workingSets.default.empty', 'Use an empty working set when switching to a source control history item group that does not have a working set.'),
                localize('scm.workingSets.default.current', 'Use the current working set when switching to a source control history item group that does not have a working set.'),
            ],
            description: localize('scm.workingSets.default', 'Controls the default working set to use when switching to a source control history item group that does not have a working set.'),
            default: 'current',
        },
        'scm.compactFolders': {
            type: 'boolean',
            description: localize('scm.compactFolders', 'Controls whether the Source Control view should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element.'),
            default: true,
        },
        'scm.graph.pageOnScroll': {
            type: 'boolean',
            description: localize('scm.graph.pageOnScroll', 'Controls whether the Source Control Graph view will load the next page of items when you scroll to the end of the list.'),
            default: true,
        },
        'scm.graph.pageSize': {
            type: 'number',
            description: localize('scm.graph.pageSize', 'The number of items to show in the Source Control Graph view by default and when loading more items.'),
            minimum: 1,
            maximum: 1000,
            default: 50,
        },
        'scm.graph.badges': {
            type: 'string',
            enum: ['all', 'filter'],
            enumDescriptions: [
                localize('scm.graph.badges.all', 'Show badges of all history item groups in the Source Control Graph view.'),
                localize('scm.graph.badges.filter', 'Show only the badges of history item groups used as a filter in the Source Control Graph view.'),
            ],
            description: localize('scm.graph.badges', 'Controls which badges are shown in the Source Control Graph view. The badges are shown on the right side of the graph indicating the names of history item groups.'),
            default: 'filter',
        },
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'scm.acceptInput',
    metadata: { description: localize('scm accept', 'Source Control: Accept Input'), args: [] },
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.has('scmRepository'),
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    handler: (accessor) => {
        const contextKeyService = accessor.get(IContextKeyService);
        const context = contextKeyService.getContext(getActiveElement());
        const repositoryId = context.getValue('scmRepository');
        if (!repositoryId) {
            return Promise.resolve(null);
        }
        const scmService = accessor.get(ISCMService);
        const repository = scmService.getRepository(repositoryId);
        if (!repository?.provider.acceptInputCommand) {
            return Promise.resolve(null);
        }
        const id = repository.provider.acceptInputCommand.id;
        const args = repository.provider.acceptInputCommand.arguments;
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(id, ...(args || []));
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'scm.clearInput',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.has('scmRepository'), SuggestContext.Visible.toNegated(), EditorContextKeys.hasNonEmptySelection.toNegated()),
    primary: 9 /* KeyCode.Escape */,
    handler: async (accessor) => {
        const scmService = accessor.get(ISCMService);
        const contextKeyService = accessor.get(IContextKeyService);
        const context = contextKeyService.getContext(getActiveElement());
        const repositoryId = context.getValue('scmRepository');
        const repository = repositoryId ? scmService.getRepository(repositoryId) : undefined;
        repository?.input.setValue('', true);
    },
});
const viewNextCommitCommand = {
    description: {
        description: localize('scm view next commit', 'Source Control: View Next Commit'),
        args: [],
    },
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: (accessor) => {
        const contextKeyService = accessor.get(IContextKeyService);
        const scmService = accessor.get(ISCMService);
        const context = contextKeyService.getContext(getActiveElement());
        const repositoryId = context.getValue('scmRepository');
        const repository = repositoryId ? scmService.getRepository(repositoryId) : undefined;
        repository?.input.showNextHistoryValue();
    },
};
const viewPreviousCommitCommand = {
    description: {
        description: localize('scm view previous commit', 'Source Control: View Previous Commit'),
        args: [],
    },
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: (accessor) => {
        const contextKeyService = accessor.get(IContextKeyService);
        const scmService = accessor.get(ISCMService);
        const context = contextKeyService.getContext(getActiveElement());
        const repositoryId = context.getValue('scmRepository');
        const repository = repositoryId ? scmService.getRepository(repositoryId) : undefined;
        repository?.input.showPreviousHistoryValue();
    },
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    ...viewNextCommitCommand,
    id: 'scm.viewNextCommit',
    when: ContextKeyExpr.and(ContextKeyExpr.has('scmRepository'), ContextKeyExpr.has('scmInputIsInLastPosition'), SuggestContext.Visible.toNegated()),
    primary: 18 /* KeyCode.DownArrow */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    ...viewPreviousCommitCommand,
    id: 'scm.viewPreviousCommit',
    when: ContextKeyExpr.and(ContextKeyExpr.has('scmRepository'), ContextKeyExpr.has('scmInputIsInFirstPosition'), SuggestContext.Visible.toNegated()),
    primary: 16 /* KeyCode.UpArrow */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    ...viewNextCommitCommand,
    id: 'scm.forceViewNextCommit',
    when: ContextKeyExpr.has('scmRepository'),
    primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    ...viewPreviousCommitCommand,
    id: 'scm.forceViewPreviousCommit',
    when: ContextKeyExpr.has('scmRepository'),
    primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
});
CommandsRegistry.registerCommand('scm.openInIntegratedTerminal', async (accessor, ...providers) => {
    if (!providers || providers.length === 0) {
        return;
    }
    const commandService = accessor.get(ICommandService);
    const listService = accessor.get(IListService);
    let provider = providers.length === 1 ? providers[0] : undefined;
    if (!provider) {
        const list = listService.lastFocusedList;
        const element = list?.getHTMLElement();
        if (list instanceof WorkbenchList && element && isActiveElement(element)) {
            const [index] = list.getFocus();
            const focusedElement = list.element(index);
            // Source Control Repositories
            if (isSCMRepository(focusedElement)) {
                provider = focusedElement.provider;
            }
        }
    }
    if (!provider?.rootUri) {
        return;
    }
    await commandService.executeCommand('openInIntegratedTerminal', provider.rootUri);
});
CommandsRegistry.registerCommand('scm.openInTerminal', async (accessor, provider) => {
    if (!provider || !provider.rootUri) {
        return;
    }
    const commandService = accessor.get(ICommandService);
    await commandService.executeCommand('openInTerminal', provider.rootUri);
});
CommandsRegistry.registerCommand('scm.setActiveProvider', async (accessor) => {
    const instantiationService = accessor.get(IInstantiationService);
    const scmViewService = accessor.get(ISCMViewService);
    const placeHolder = localize('scmActiveRepositoryPlaceHolder', 'Select the active repository, type to filter all repositories');
    const autoQuickItemDescription = localize('scmActiveRepositoryAutoDescription', 'The active repository is updated based on focused repository/active editor');
    const repositoryPicker = instantiationService.createInstance(RepositoryPicker, placeHolder, autoQuickItemDescription);
    const result = await repositoryPicker.pickRepository();
    if (result?.repository) {
        const repository = result.repository !== 'auto' ? result.repository : undefined;
        scmViewService.pinActiveRepository(repository);
    }
});
MenuRegistry.appendMenuItem(MenuId.SCMSourceControl, {
    group: '100_end',
    command: {
        id: 'scm.openInTerminal',
        title: localize('open in external terminal', 'Open in External Terminal'),
    },
    when: ContextKeyExpr.and(RemoteNameContext.isEqualTo(''), ContextKeyExpr.equals('scmProviderHasRootUri', true), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.sourceControlRepositoriesKind', 'external'), ContextKeyExpr.equals('config.terminal.sourceControlRepositoriesKind', 'both'))),
});
MenuRegistry.appendMenuItem(MenuId.SCMSourceControl, {
    group: '100_end',
    command: {
        id: 'scm.openInIntegratedTerminal',
        title: localize('open in integrated terminal', 'Open in Integrated Terminal'),
    },
    when: ContextKeyExpr.and(ContextKeyExpr.equals('scmProviderHasRootUri', true), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.sourceControlRepositoriesKind', 'integrated'), ContextKeyExpr.equals('config.terminal.sourceControlRepositoriesKind', 'both'))),
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.scm.action.focusPreviousInput',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeys.RepositoryVisibilityCount.notEqualsTo(0),
    handler: async (accessor) => {
        const viewsService = accessor.get(IViewsService);
        const scmView = await viewsService.openView(VIEW_PANE_ID);
        if (scmView) {
            scmView.focusPreviousInput();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.scm.action.focusNextInput',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeys.RepositoryVisibilityCount.notEqualsTo(0),
    handler: async (accessor) => {
        const viewsService = accessor.get(IViewsService);
        const scmView = await viewsService.openView(VIEW_PANE_ID);
        if (scmView) {
            scmView.focusNextInput();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.scm.action.focusPreviousResourceGroup',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor) => {
        const viewsService = accessor.get(IViewsService);
        const scmView = await viewsService.openView(VIEW_PANE_ID);
        if (scmView) {
            scmView.focusPreviousResourceGroup();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.scm.action.focusNextResourceGroup',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor) => {
        const viewsService = accessor.get(IViewsService);
        const scmView = await viewsService.openView(VIEW_PANE_ID);
        if (scmView) {
            scmView.focusNextResourceGroup();
        }
    },
});
registerSingleton(ISCMService, SCMService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISCMViewService, SCMViewService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickDiffService, QuickDiffService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickDiffModelService, QuickDiffModelService, 1 /* InstantiationType.Delayed */);
AccessibleViewRegistry.register(new SCMAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sOEJBQThCLEVBQzlCLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sVUFBVSxFQUNWLFdBQVcsRUFDWCxZQUFZLEVBRVosZUFBZSxFQUNmLHlCQUF5QixFQUN6QixvQkFBb0IsR0FDcEIsTUFBTSxrQkFBa0IsQ0FBQTtBQUV6QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUVwRyxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxF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