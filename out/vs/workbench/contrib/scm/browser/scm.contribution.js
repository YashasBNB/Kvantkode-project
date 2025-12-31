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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLDhCQUE4QixFQUM5QixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEUsT0FBTyxFQUNOLFVBQVUsRUFDVixXQUFXLEVBQ1gsWUFBWSxFQUVaLGVBQWUsRUFDZix5QkFBeUIsRUFDekIsb0JBQW9CLEdBQ3BCLE1BQU0sa0JBQWtCLENBQUE7QUFFekIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUNBQXFDLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFcEcsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxV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