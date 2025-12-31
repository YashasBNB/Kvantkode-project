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
var UserDataProfilesEditor_1, ExistingProfileResourceTreeRenderer_1, NewProfileResourceTreeRenderer_1, ProfileResourceChildTreeItemRenderer_1, WorkspaceUriHostColumnRenderer_1, WorkspaceUriPathColumnRenderer_1, WorkspaceUriActionsColumnRenderer_1, UserDataProfilesEditorInput_1;
import './media/userDataProfilesEditor.css';
import { $, addDisposableListener, append, clearNode, Dimension, EventHelper, EventType, trackFocus, } from '../../../../base/browser/dom.js';
import { Action, Separator, SubmenuAction, toAction, } from '../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { defaultUserDataProfileIcon, IUserDataProfileManagementService, IUserDataProfileService, PROFILE_FILTER, } from '../../../services/userDataProfile/common/userDataProfile.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Button, ButtonBar, ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultSelectBoxStyles, getInputBoxStyle, getListStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, foreground, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../common/theme.js';
import { WorkbenchAsyncDataTree, WorkbenchList, WorkbenchTable, } from '../../../../platform/list/browser/listService.js';
import { CachedListVirtualDelegate, } from '../../../../base/browser/ui/list/list.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { DEFAULT_ICON, ICONS, } from '../../../services/userDataProfile/common/userDataProfileIcons.js';
import { WorkbenchIconSelectBox } from '../../../services/userDataProfile/browser/iconSelectBox.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { basename } from '../../../../base/common/resources.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels, } from '../../../browser/labels.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { AbstractUserDataProfileElement, isProfileResourceChildElement, isProfileResourceTypeElement, NewProfileElement, UserDataProfileElement, UserDataProfilesEditorModel, } from './userDataProfilesEditorModel.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate, } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Radio } from '../../../../base/browser/ui/radio/radio.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { settingsTextInputBorder } from '../../preferences/common/settingsEditorColorRegistry.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { posix, win32 } from '../../../../base/common/path.js';
import { hasDriveLetter } from '../../../../base/common/extpath.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
const editIcon = registerIcon('profiles-editor-edit-folder', Codicon.edit, localize('editIcon', 'Icon for the edit folder icon in the profiles editor.'));
const removeIcon = registerIcon('profiles-editor-remove-folder', Codicon.close, localize('removeIcon', 'Icon for the remove folder icon in the profiles editor.'));
export const profilesSashBorder = registerColor('profiles.sashBorder', PANEL_BORDER, localize('profilesSashBorder', 'The color of the Profiles editor splitview sash border.'));
const listStyles = getListStyles({
    listActiveSelectionBackground: editorBackground,
    listActiveSelectionForeground: foreground,
    listFocusAndSelectionBackground: editorBackground,
    listFocusAndSelectionForeground: foreground,
    listFocusBackground: editorBackground,
    listFocusForeground: foreground,
    listHoverForeground: foreground,
    listHoverBackground: editorBackground,
    listHoverOutline: editorBackground,
    listFocusOutline: editorBackground,
    listInactiveSelectionBackground: editorBackground,
    listInactiveSelectionForeground: foreground,
    listInactiveFocusBackground: editorBackground,
    listInactiveFocusOutline: editorBackground,
    treeIndentGuidesStroke: undefined,
    treeInactiveIndentGuidesStroke: undefined,
    tableOddRowsBackgroundColor: editorBackground,
});
let UserDataProfilesEditor = class UserDataProfilesEditor extends EditorPane {
    static { UserDataProfilesEditor_1 = this; }
    static { this.ID = 'workbench.editor.userDataProfiles'; }
    constructor(group, telemetryService, themeService, storageService, quickInputService, fileDialogService, contextMenuService, instantiationService) {
        super(UserDataProfilesEditor_1.ID, group, telemetryService, themeService, storageService);
        this.quickInputService = quickInputService;
        this.fileDialogService = fileDialogService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.templates = [];
    }
    layout(dimension, position) {
        if (this.container && this.splitView) {
            const height = dimension.height - 20;
            this.splitView.layout(this.container?.clientWidth, height);
            this.splitView.el.style.height = `${height}px`;
        }
    }
    createEditor(parent) {
        this.container = append(parent, $('.profiles-editor'));
        const sidebarView = append(this.container, $('.sidebar-view'));
        const sidebarContainer = append(sidebarView, $('.sidebar-container'));
        const contentsView = append(this.container, $('.contents-view'));
        const contentsContainer = append(contentsView, $('.contents-container'));
        this.profileWidget = this._register(this.instantiationService.createInstance(ProfileWidget, contentsContainer));
        this.splitView = new SplitView(this.container, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true,
        });
        this.renderSidebar(sidebarContainer);
        this.splitView.addView({
            onDidChange: Event.None,
            element: sidebarView,
            minimumSize: 200,
            maximumSize: 350,
            layout: (width, _, height) => {
                sidebarView.style.width = `${width}px`;
                if (height && this.profilesList) {
                    const listHeight = height - 40 /* new profile button */ - 15; /* marginTop */
                    this.profilesList.getHTMLElement().style.height = `${listHeight}px`;
                    this.profilesList.layout(listHeight, width);
                }
            },
        }, 300, undefined, true);
        this.splitView.addView({
            onDidChange: Event.None,
            element: contentsView,
            minimumSize: 550,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                contentsView.style.width = `${width}px`;
                if (height) {
                    this.profileWidget?.layout(new Dimension(width, height));
                }
            },
        }, Sizing.Distribute, undefined, true);
        this.registerListeners();
        this.updateStyles();
    }
    updateStyles() {
        const borderColor = this.theme.getColor(profilesSashBorder);
        this.splitView?.style({ separatorBorder: borderColor });
    }
    renderSidebar(parent) {
        // render New Profile Button
        this.renderNewProfileButton(append(parent, $('.new-profile-button')));
        // render profiles list
        const renderer = this.instantiationService.createInstance(ProfileElementRenderer);
        const delegate = new ProfileElementDelegate();
        this.profilesList = this._register(this.instantiationService.createInstance((WorkbenchList), 'ProfilesList', append(parent, $('.profiles-list')), delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(profileElement) {
                    return profileElement?.name ?? '';
                },
                getWidgetAriaLabel() {
                    return localize('profiles', 'Profiles');
                },
            },
            openOnSingleClick: true,
            identityProvider: {
                getId(e) {
                    if (e instanceof UserDataProfileElement) {
                        return e.profile.id;
                    }
                    return e.name;
                },
            },
            alwaysConsumeMouseWheel: false,
        }));
    }
    renderNewProfileButton(parent) {
        const button = this._register(new ButtonWithDropdown(parent, {
            actions: {
                getActions: () => {
                    const actions = [];
                    if (this.templates.length) {
                        actions.push(new SubmenuAction('from.template', localize('from template', 'From Template'), this.getCreateFromTemplateActions()));
                        actions.push(new Separator());
                    }
                    actions.push(toAction({
                        id: 'importProfile',
                        label: localize('importProfile', 'Import Profile...'),
                        run: () => this.importProfile(),
                    }));
                    return actions;
                },
            },
            addPrimaryActionToDropdown: false,
            contextMenuProvider: this.contextMenuService,
            supportIcons: true,
            ...defaultButtonStyles,
        }));
        button.label = localize('newProfile', 'New Profile');
        this._register(button.onDidClick((e) => this.createNewProfile()));
    }
    getCreateFromTemplateActions() {
        return this.templates.map((template) => toAction({
            id: `template:${template.url}`,
            label: template.name,
            run: () => this.createNewProfile(URI.parse(template.url)),
        }));
    }
    registerListeners() {
        if (this.profilesList) {
            this._register(this.profilesList.onDidChangeSelection((e) => {
                const [element] = e.elements;
                if (element instanceof AbstractUserDataProfileElement) {
                    this.profileWidget?.render(element);
                }
            }));
            this._register(this.profilesList.onContextMenu((e) => {
                const actions = [];
                if (!e.element) {
                    actions.push(...this.getTreeContextMenuActions());
                }
                if (e.element instanceof AbstractUserDataProfileElement) {
                    actions.push(...e.element.actions[1]);
                }
                if (actions.length) {
                    this.contextMenuService.showContextMenu({
                        getAnchor: () => e.anchor,
                        getActions: () => actions,
                        getActionsContext: () => e.element,
                    });
                }
            }));
            this._register(this.profilesList.onMouseDblClick((e) => {
                if (!e.element) {
                    this.createNewProfile();
                }
            }));
        }
    }
    getTreeContextMenuActions() {
        const actions = [];
        actions.push(toAction({
            id: 'newProfile',
            label: localize('newProfile', 'New Profile'),
            run: () => this.createNewProfile(),
        }));
        const templateActions = this.getCreateFromTemplateActions();
        if (templateActions.length) {
            actions.push(new SubmenuAction('from.template', localize('new from template', 'New Profile From Template'), templateActions));
        }
        actions.push(new Separator());
        actions.push(toAction({
            id: 'importProfile',
            label: localize('importProfile', 'Import Profile...'),
            run: () => this.importProfile(),
        }));
        return actions;
    }
    async importProfile() {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick());
        const updateQuickPickItems = (value) => {
            const quickPickItems = [];
            if (value) {
                quickPickItems.push({
                    label: quickPick.value,
                    description: localize('import from url', 'Import from URL'),
                });
            }
            quickPickItems.push({ label: localize('import from file', 'Select File...') });
            quickPick.items = quickPickItems;
        };
        quickPick.title = localize('import profile quick pick title', 'Import from Profile Template...');
        quickPick.placeholder = localize('import profile placeholder', 'Provide Profile Template URL');
        quickPick.ignoreFocusOut = true;
        disposables.add(quickPick.onDidChangeValue(updateQuickPickItems));
        updateQuickPickItems();
        quickPick.matchOnLabel = false;
        quickPick.matchOnDescription = false;
        disposables.add(quickPick.onDidAccept(async () => {
            quickPick.hide();
            const selectedItem = quickPick.selectedItems[0];
            if (!selectedItem) {
                return;
            }
            const url = selectedItem.label === quickPick.value
                ? URI.parse(quickPick.value)
                : await this.getProfileUriFromFileSystem();
            if (url) {
                this.createNewProfile(url);
            }
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        quickPick.show();
    }
    async createNewProfile(copyFrom) {
        await this.model?.createNewProfile(copyFrom);
    }
    selectProfile(profile) {
        const index = this.model?.profiles.findIndex((p) => p instanceof UserDataProfileElement && p.profile.id === profile.id);
        if (index !== undefined && index >= 0) {
            this.profilesList?.setSelection([index]);
        }
    }
    async getProfileUriFromFileSystem() {
        const profileLocation = await this.fileDialogService.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: PROFILE_FILTER,
            title: localize('import profile dialog', 'Select Profile Template File'),
        });
        if (!profileLocation) {
            return null;
        }
        return profileLocation[0];
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this.model = await input.resolve();
        this.model.getTemplates().then((templates) => {
            this.templates = templates;
            if (this.profileWidget) {
                this.profileWidget.templates = templates;
            }
        });
        this.updateProfilesList();
        this._register(this.model.onDidChange((element) => this.updateProfilesList(element)));
    }
    focus() {
        super.focus();
        this.profilesList?.domFocus();
    }
    updateProfilesList(elementToSelect) {
        if (!this.model) {
            return;
        }
        const currentSelectionIndex = this.profilesList?.getSelection()?.[0];
        const currentSelection = currentSelectionIndex !== undefined
            ? this.profilesList?.element(currentSelectionIndex)
            : undefined;
        this.profilesList?.splice(0, this.profilesList.length, this.model.profiles);
        if (elementToSelect) {
            this.profilesList?.setSelection([this.model.profiles.indexOf(elementToSelect)]);
        }
        else if (currentSelection) {
            if (!this.model.profiles.includes(currentSelection)) {
                const elementToSelect = this.model.profiles.find((profile) => profile.name === currentSelection.name) ??
                    this.model.profiles[0];
                if (elementToSelect) {
                    this.profilesList?.setSelection([this.model.profiles.indexOf(elementToSelect)]);
                }
            }
        }
        else {
            const elementToSelect = this.model.profiles.find((profile) => profile.active) ?? this.model.profiles[0];
            if (elementToSelect) {
                this.profilesList?.setSelection([this.model.profiles.indexOf(elementToSelect)]);
            }
        }
    }
};
UserDataProfilesEditor = UserDataProfilesEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IQuickInputService),
    __param(5, IFileDialogService),
    __param(6, IContextMenuService),
    __param(7, IInstantiationService)
], UserDataProfilesEditor);
export { UserDataProfilesEditor };
class ProfileElementDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId() {
        return 'profileListElement';
    }
}
let ProfileElementRenderer = class ProfileElementRenderer {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.templateId = 'profileListElement';
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        container.classList.add('profile-list-item');
        const icon = append(container, $('.profile-list-item-icon'));
        const label = append(container, $('.profile-list-item-label'));
        const dirty = append(container, $(`span${ThemeIcon.asCSSSelector(Codicon.circleFilled)}`));
        const description = append(container, $('.profile-list-item-description'));
        append(description, $(`span${ThemeIcon.asCSSSelector(Codicon.check)}`), $('span', undefined, localize('activeProfile', 'Active')));
        const actionsContainer = append(container, $('.profile-tree-item-actions-container'));
        const actionBar = disposables.add(this.instantiationService.createInstance(WorkbenchToolBar, actionsContainer, {
            hoverDelegate: disposables.add(createInstantHoverDelegate()),
            highlightToggledItems: true,
        }));
        return { label, icon, dirty, description, actionBar, disposables, elementDisposables };
    }
    renderElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
        templateData.label.textContent = element.name;
        templateData.label.classList.toggle('new-profile', element instanceof NewProfileElement);
        templateData.icon.className = ThemeIcon.asClassName(element.icon ? ThemeIcon.fromId(element.icon) : DEFAULT_ICON);
        templateData.dirty.classList.toggle('hide', !(element instanceof NewProfileElement));
        templateData.description.classList.toggle('hide', !element.active);
        templateData.elementDisposables.add(element.onDidChange((e) => {
            if (e.name) {
                templateData.label.textContent = element.name;
            }
            if (e.icon) {
                if (element.icon) {
                    templateData.icon.className = ThemeIcon.asClassName(ThemeIcon.fromId(element.icon));
                }
                else {
                    templateData.icon.className = 'hide';
                }
            }
            if (e.active) {
                templateData.description.classList.toggle('hide', !element.active);
            }
        }));
        const setActions = () => templateData.actionBar.setActions(element.actions[0].filter((a) => a.enabled), element.actions[1].filter((a) => a.enabled));
        setActions();
        const events = [];
        for (const action of element.actions.flat()) {
            if (action instanceof Action) {
                events.push(action.onDidChange);
            }
        }
        templateData.elementDisposables.add(Event.any(...events)((e) => {
            if (e.enabled !== undefined) {
                setActions();
            }
        }));
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.elementDisposables.dispose();
    }
};
ProfileElementRenderer = __decorate([
    __param(0, IInstantiationService)
], ProfileElementRenderer);
let ProfileWidget = class ProfileWidget extends Disposable {
    set templates(templates) {
        this.copyFromProfileRenderer.setTemplates(templates);
        this.profileTree.rerender();
    }
    constructor(parent, editorProgressService, instantiationService) {
        super();
        this.editorProgressService = editorProgressService;
        this.instantiationService = instantiationService;
        this._profileElement = this._register(new MutableDisposable());
        this.layoutParticipants = [];
        const header = append(parent, $('.profile-header'));
        const title = append(header, $('.profile-title-container'));
        this.profileTitle = append(title, $(''));
        const body = append(parent, $('.profile-body'));
        const delegate = new ProfileTreeDelegate();
        const contentsRenderer = this._register(this.instantiationService.createInstance(ContentsProfileRenderer));
        const associationsRenderer = this._register(this.instantiationService.createInstance(ProfileWorkspacesRenderer));
        this.layoutParticipants.push(associationsRenderer);
        this.copyFromProfileRenderer = this._register(this.instantiationService.createInstance(CopyFromProfileRenderer));
        this.profileTreeContainer = append(body, $('.profile-tree'));
        this.profileTree = this._register(this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'ProfileEditor-Tree', this.profileTreeContainer, delegate, [
            this._register(this.instantiationService.createInstance(ProfileNameRenderer)),
            this._register(this.instantiationService.createInstance(ProfileIconRenderer)),
            this._register(this.instantiationService.createInstance(UseForCurrentWindowPropertyRenderer)),
            this._register(this.instantiationService.createInstance(UseAsDefaultProfileRenderer)),
            this.copyFromProfileRenderer,
            contentsRenderer,
            associationsRenderer,
        ], this.instantiationService.createInstance(ProfileTreeDataSource), {
            multipleSelectionSupport: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(element) {
                    return element?.element ?? '';
                },
                getWidgetAriaLabel() {
                    return '';
                },
            },
            identityProvider: {
                getId(element) {
                    return element.element;
                },
            },
            expandOnlyOnTwistieClick: true,
            renderIndentGuides: RenderIndentGuides.None,
            enableStickyScroll: false,
            openOnSingleClick: false,
            setRowLineHeight: false,
            supportDynamicHeights: true,
            alwaysConsumeMouseWheel: false,
        }));
        this.profileTree.style(listStyles);
        this._register(contentsRenderer.onDidChangeContentHeight((e) => this.profileTree.updateElementHeight(e, undefined)));
        this._register(associationsRenderer.onDidChangeContentHeight((e) => this.profileTree.updateElementHeight(e, undefined)));
        this._register(contentsRenderer.onDidChangeSelection((e) => {
            if (e.selected) {
                this.profileTree.setFocus([]);
                this.profileTree.setSelection([]);
            }
        }));
        this._register(this.profileTree.onDidChangeContentHeight((e) => {
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }));
        this._register(this.profileTree.onDidChangeSelection((e) => {
            if (e.elements.length) {
                contentsRenderer.clearSelection();
            }
        }));
        this.buttonContainer = append(body, $('.profile-row-container.profile-button-container'));
    }
    layout(dimension) {
        this.dimension = dimension;
        const treeContentHeight = this.profileTree.contentHeight;
        const height = Math.min(treeContentHeight, dimension.height -
            (this._profileElement.value?.element instanceof NewProfileElement ? 116 : 54));
        this.profileTreeContainer.style.height = `${height}px`;
        this.profileTree.layout(height, dimension.width);
        for (const participant of this.layoutParticipants) {
            participant.layout();
        }
    }
    render(profileElement) {
        if (this._profileElement.value?.element === profileElement) {
            return;
        }
        if (this._profileElement.value?.element instanceof UserDataProfileElement) {
            this._profileElement.value.element.reset();
        }
        this.profileTree.setInput(profileElement);
        const disposables = new DisposableStore();
        this._profileElement.value = { element: profileElement, dispose: () => disposables.dispose() };
        this.profileTitle.textContent = profileElement.name;
        disposables.add(profileElement.onDidChange((e) => {
            if (e.name) {
                this.profileTitle.textContent = profileElement.name;
            }
        }));
        const [primaryTitleButtons, secondatyTitleButtons] = profileElement.titleButtons;
        if (primaryTitleButtons?.length || secondatyTitleButtons?.length) {
            this.buttonContainer.classList.remove('hide');
            if (secondatyTitleButtons?.length) {
                for (const action of secondatyTitleButtons) {
                    const button = disposables.add(new Button(this.buttonContainer, {
                        ...defaultButtonStyles,
                        secondary: true,
                    }));
                    button.label = action.label;
                    button.enabled = action.enabled;
                    disposables.add(button.onDidClick(() => this.editorProgressService.showWhile(action.run())));
                    disposables.add(action.onDidChange((e) => {
                        if (!isUndefined(e.enabled)) {
                            button.enabled = action.enabled;
                        }
                        if (!isUndefined(e.label)) {
                            button.label = action.label;
                        }
                    }));
                }
            }
            if (primaryTitleButtons?.length) {
                for (const action of primaryTitleButtons) {
                    const button = disposables.add(new Button(this.buttonContainer, {
                        ...defaultButtonStyles,
                    }));
                    button.label = action.label;
                    button.enabled = action.enabled;
                    disposables.add(button.onDidClick(() => this.editorProgressService.showWhile(action.run())));
                    disposables.add(action.onDidChange((e) => {
                        if (!isUndefined(e.enabled)) {
                            button.enabled = action.enabled;
                        }
                        if (!isUndefined(e.label)) {
                            button.label = action.label;
                        }
                    }));
                    disposables.add(profileElement.onDidChange((e) => {
                        if (e.message) {
                            button.setTitle(profileElement.message ?? action.label);
                            button.element.classList.toggle('error', !!profileElement.message);
                        }
                    }));
                }
            }
        }
        else {
            this.buttonContainer.classList.add('hide');
        }
        if (profileElement instanceof NewProfileElement) {
            this.profileTree.focusFirst();
        }
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
};
ProfileWidget = __decorate([
    __param(1, IEditorProgressService),
    __param(2, IInstantiationService)
], ProfileWidget);
class ProfileTreeDelegate extends CachedListVirtualDelegate {
    getTemplateId({ element }) {
        return element;
    }
    hasDynamicHeight({ element }) {
        return element === 'contents' || element === 'workspaces';
    }
    estimateHeight({ element, root }) {
        switch (element) {
            case 'name':
                return 72;
            case 'icon':
                return 68;
            case 'copyFrom':
                return 90;
            case 'useForCurrent':
            case 'useAsDefault':
                return 68;
            case 'contents':
                return 258;
            case 'workspaces':
                return (root.workspaces ? root.workspaces.length * 24 + 30 : 0) + 112;
        }
    }
}
class ProfileTreeDataSource {
    hasChildren(element) {
        return element instanceof AbstractUserDataProfileElement;
    }
    async getChildren(element) {
        if (element instanceof AbstractUserDataProfileElement) {
            const children = [];
            if (element instanceof NewProfileElement) {
                children.push({ element: 'name', root: element });
                children.push({ element: 'icon', root: element });
                children.push({ element: 'copyFrom', root: element });
                children.push({ element: 'contents', root: element });
            }
            else if (element instanceof UserDataProfileElement) {
                if (!element.profile.isDefault) {
                    children.push({ element: 'name', root: element });
                    children.push({ element: 'icon', root: element });
                }
                children.push({ element: 'useAsDefault', root: element });
                children.push({ element: 'contents', root: element });
                children.push({ element: 'workspaces', root: element });
            }
            return children;
        }
        return [];
    }
}
class ProfileContentTreeElementDelegate {
    getTemplateId(element) {
        if (!element.element.resourceType) {
            return ProfileResourceChildTreeItemRenderer.TEMPLATE_ID;
        }
        if (element.root instanceof NewProfileElement) {
            return NewProfileResourceTreeRenderer.TEMPLATE_ID;
        }
        return ExistingProfileResourceTreeRenderer.TEMPLATE_ID;
    }
    getHeight(element) {
        return 24;
    }
}
let ProfileResourceTreeDataSource = class ProfileResourceTreeDataSource {
    constructor(editorProgressService) {
        this.editorProgressService = editorProgressService;
    }
    hasChildren(element) {
        if (element instanceof AbstractUserDataProfileElement) {
            return true;
        }
        if (element.element.resourceType) {
            if (element.element.resourceType !==
                "extensions" /* ProfileResourceType.Extensions */ &&
                element.element.resourceType !== "snippets" /* ProfileResourceType.Snippets */) {
                return false;
            }
            if (element.root instanceof NewProfileElement) {
                const resourceType = element.element.resourceType;
                if (element.root.getFlag(resourceType)) {
                    return true;
                }
                if (!element.root.hasResource(resourceType)) {
                    return false;
                }
                if (element.root.copyFrom === undefined) {
                    return false;
                }
                if (!element.root.getCopyFlag(resourceType)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    async getChildren(element) {
        if (element instanceof AbstractUserDataProfileElement) {
            const children = await element.getChildren();
            return children.map((e) => ({ element: e, root: element }));
        }
        if (element.element.resourceType) {
            const progressRunner = this.editorProgressService.show(true, 500);
            try {
                const extensions = await element.root.getChildren(element.element.resourceType);
                return extensions.map((e) => ({ element: e, root: element.root }));
            }
            finally {
                progressRunner.done();
            }
        }
        return [];
    }
};
ProfileResourceTreeDataSource = __decorate([
    __param(0, IEditorProgressService)
], ProfileResourceTreeDataSource);
class AbstractProfileResourceTreeRenderer extends Disposable {
    getResourceTypeTitle(resourceType) {
        switch (resourceType) {
            case "settings" /* ProfileResourceType.Settings */:
                return localize('settings', 'Settings');
            case "keybindings" /* ProfileResourceType.Keybindings */:
                return localize('keybindings', 'Keyboard Shortcuts');
            case "snippets" /* ProfileResourceType.Snippets */:
                return localize('snippets', 'Snippets');
            case "tasks" /* ProfileResourceType.Tasks */:
                return localize('tasks', 'Tasks');
            case "extensions" /* ProfileResourceType.Extensions */:
                return localize('extensions', 'Extensions');
        }
        return '';
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
}
class ProfilePropertyRenderer extends AbstractProfileResourceTreeRenderer {
    renderElement({ element }, index, templateData, height) {
        templateData.elementDisposables.clear();
        templateData.element = element;
    }
}
let ProfileNameRenderer = class ProfileNameRenderer extends ProfilePropertyRenderer {
    constructor(userDataProfilesService, contextViewService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.contextViewService = contextViewService;
        this.templateId = 'name';
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const nameContainer = append(parent, $('.profile-row-container'));
        append(nameContainer, $('.profile-label-element', undefined, localize('name', 'Name')));
        const nameInput = disposables.add(new InputBox(nameContainer, this.contextViewService, {
            inputBoxStyles: getInputBoxStyle({
                inputBorder: settingsTextInputBorder,
            }),
            ariaLabel: localize('profileName', 'Profile Name'),
            placeholder: localize('profileName', 'Profile Name'),
            validationOptions: {
                validation: (value) => {
                    if (!value) {
                        return {
                            content: localize('name required', 'Profile name is required and must be a non-empty value.'),
                            type: 2 /* MessageType.WARNING */,
                        };
                    }
                    if (profileElement?.root.disabled) {
                        return null;
                    }
                    if (!profileElement?.root.shouldValidateName()) {
                        return null;
                    }
                    const initialName = profileElement?.root.getInitialName();
                    value = value.trim();
                    if (initialName !== value &&
                        this.userDataProfilesService.profiles.some((p) => !p.isTransient && p.name === value)) {
                        return {
                            content: localize('profileExists', 'Profile with name {0} already exists.', value),
                            type: 2 /* MessageType.WARNING */,
                        };
                    }
                    return null;
                },
            },
        }));
        nameInput.onDidChange((value) => {
            if (profileElement && value) {
                profileElement.root.name = value;
            }
        });
        const focusTracker = disposables.add(trackFocus(nameInput.inputElement));
        disposables.add(focusTracker.onDidBlur(() => {
            if (profileElement && !nameInput.value) {
                nameInput.value = profileElement.root.name;
            }
        }));
        const renderName = (profileElement) => {
            nameInput.value = profileElement.root.name;
            nameInput.validate();
            const isDefaultProfile = profileElement.root instanceof UserDataProfileElement &&
                profileElement.root.profile.isDefault;
            if (profileElement.root.disabled || isDefaultProfile) {
                nameInput.disable();
            }
            else {
                nameInput.enable();
            }
            if (isDefaultProfile) {
                nameInput.setTooltip(localize('defaultProfileName', 'Name cannot be changed for the default profile'));
            }
            else {
                nameInput.setTooltip(localize('profileName', 'Profile Name'));
            }
        };
        return {
            set element(element) {
                profileElement = element;
                renderName(profileElement);
                elementDisposables.add(profileElement.root.onDidChange((e) => {
                    if (e.name || e.disabled) {
                        renderName(element);
                    }
                    if (e.profile) {
                        nameInput.validate();
                    }
                }));
            },
            disposables,
            elementDisposables,
        };
    }
};
ProfileNameRenderer = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IContextViewService)
], ProfileNameRenderer);
let ProfileIconRenderer = class ProfileIconRenderer extends ProfilePropertyRenderer {
    constructor(instantiationService, hoverService) {
        super();
        this.instantiationService = instantiationService;
        this.hoverService = hoverService;
        this.templateId = 'icon';
        this.hoverDelegate = getDefaultHoverDelegate('element');
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const iconContainer = append(parent, $('.profile-row-container'));
        append(iconContainer, $('.profile-label-element', undefined, localize('icon-label', 'Icon')));
        const iconValueContainer = append(iconContainer, $('.profile-icon-container'));
        const iconElement = append(iconValueContainer, $(`${ThemeIcon.asCSSSelector(DEFAULT_ICON)}`, {
            tabindex: '0',
            role: 'button',
            'aria-label': localize('icon', 'Profile Icon'),
        }));
        const iconHover = disposables.add(this.hoverService.setupManagedHover(this.hoverDelegate, iconElement, ''));
        const iconSelectBox = disposables.add(this.instantiationService.createInstance(WorkbenchIconSelectBox, {
            icons: ICONS,
            inputBoxStyles: defaultInputBoxStyles,
        }));
        let hoverWidget;
        const showIconSelectBox = () => {
            if (profileElement?.root instanceof UserDataProfileElement &&
                profileElement.root.profile.isDefault) {
                return;
            }
            if (profileElement?.root.disabled) {
                return;
            }
            if (profileElement?.root instanceof UserDataProfileElement &&
                profileElement.root.profile.isDefault) {
                return;
            }
            iconSelectBox.clearInput();
            hoverWidget = this.hoverService.showInstantHover({
                content: iconSelectBox.domNode,
                target: iconElement,
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
                persistence: {
                    sticky: true,
                },
                appearance: {
                    showPointer: true,
                },
            }, true);
            if (hoverWidget) {
                iconSelectBox.layout(new Dimension(486, 292));
                iconSelectBox.focus();
            }
        };
        disposables.add(addDisposableListener(iconElement, EventType.CLICK, (e) => {
            EventHelper.stop(e, true);
            showIconSelectBox();
        }));
        disposables.add(addDisposableListener(iconElement, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                EventHelper.stop(event, true);
                showIconSelectBox();
            }
        }));
        disposables.add(addDisposableListener(iconSelectBox.domNode, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(9 /* KeyCode.Escape */)) {
                EventHelper.stop(event, true);
                hoverWidget?.dispose();
                iconElement.focus();
            }
        }));
        disposables.add(iconSelectBox.onDidSelect((selectedIcon) => {
            hoverWidget?.dispose();
            iconElement.focus();
            if (profileElement) {
                profileElement.root.icon = selectedIcon.id;
            }
        }));
        append(iconValueContainer, $('.profile-description-element', undefined, localize('icon-description', 'Profile icon to be shown in the activity bar')));
        const renderIcon = (profileElement) => {
            if (profileElement?.root instanceof UserDataProfileElement &&
                profileElement.root.profile.isDefault) {
                iconValueContainer.classList.add('disabled');
                iconHover.update(localize('defaultProfileIcon', 'Icon cannot be changed for the default profile'));
            }
            else {
                iconHover.update(localize('changeIcon', 'Click to change icon'));
                iconValueContainer.classList.remove('disabled');
            }
            if (profileElement.root.icon) {
                iconElement.className = ThemeIcon.asClassName(ThemeIcon.fromId(profileElement.root.icon));
            }
            else {
                iconElement.className = ThemeIcon.asClassName(ThemeIcon.fromId(DEFAULT_ICON.id));
            }
        };
        return {
            set element(element) {
                profileElement = element;
                renderIcon(profileElement);
                elementDisposables.add(profileElement.root.onDidChange((e) => {
                    if (e.icon) {
                        renderIcon(element);
                    }
                }));
            },
            disposables,
            elementDisposables,
        };
    }
};
ProfileIconRenderer = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHoverService)
], ProfileIconRenderer);
let UseForCurrentWindowPropertyRenderer = class UseForCurrentWindowPropertyRenderer extends ProfilePropertyRenderer {
    constructor(userDataProfileService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.templateId = 'useForCurrent';
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const useForCurrentWindowContainer = append(parent, $('.profile-row-container'));
        append(useForCurrentWindowContainer, $('.profile-label-element', undefined, localize('use for curren window', 'Use for Current Window')));
        const useForCurrentWindowValueContainer = append(useForCurrentWindowContainer, $('.profile-use-for-current-container'));
        const useForCurrentWindowTitle = localize('enable for current window', 'Use this profile for the current window');
        const useForCurrentWindowCheckbox = disposables.add(new Checkbox(useForCurrentWindowTitle, false, defaultCheckboxStyles));
        append(useForCurrentWindowValueContainer, useForCurrentWindowCheckbox.domNode);
        const useForCurrentWindowLabel = append(useForCurrentWindowValueContainer, $('.profile-description-element', undefined, useForCurrentWindowTitle));
        disposables.add(useForCurrentWindowCheckbox.onChange(() => {
            if (profileElement?.root instanceof UserDataProfileElement) {
                profileElement.root.toggleCurrentWindowProfile();
            }
        }));
        disposables.add(addDisposableListener(useForCurrentWindowLabel, EventType.CLICK, () => {
            if (profileElement?.root instanceof UserDataProfileElement) {
                profileElement.root.toggleCurrentWindowProfile();
            }
        }));
        const renderUseCurrentProfile = (profileElement) => {
            useForCurrentWindowCheckbox.checked =
                profileElement.root instanceof UserDataProfileElement &&
                    this.userDataProfileService.currentProfile.id === profileElement.root.profile.id;
            if (useForCurrentWindowCheckbox.checked &&
                this.userDataProfileService.currentProfile.isDefault) {
                useForCurrentWindowCheckbox.disable();
            }
            else {
                useForCurrentWindowCheckbox.enable();
            }
        };
        const that = this;
        return {
            set element(element) {
                profileElement = element;
                renderUseCurrentProfile(profileElement);
                elementDisposables.add(that.userDataProfileService.onDidChangeCurrentProfile((e) => {
                    renderUseCurrentProfile(element);
                }));
            },
            disposables,
            elementDisposables,
        };
    }
};
UseForCurrentWindowPropertyRenderer = __decorate([
    __param(0, IUserDataProfileService)
], UseForCurrentWindowPropertyRenderer);
class UseAsDefaultProfileRenderer extends ProfilePropertyRenderer {
    constructor() {
        super(...arguments);
        this.templateId = 'useAsDefault';
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const useAsDefaultProfileContainer = append(parent, $('.profile-row-container'));
        append(useAsDefaultProfileContainer, $('.profile-label-element', undefined, localize('use for new windows', 'Use for New Windows')));
        const useAsDefaultProfileValueContainer = append(useAsDefaultProfileContainer, $('.profile-use-as-default-container'));
        const useAsDefaultProfileTitle = localize('enable for new windows', 'Use this profile as the default for new windows');
        const useAsDefaultProfileCheckbox = disposables.add(new Checkbox(useAsDefaultProfileTitle, false, defaultCheckboxStyles));
        append(useAsDefaultProfileValueContainer, useAsDefaultProfileCheckbox.domNode);
        const useAsDefaultProfileLabel = append(useAsDefaultProfileValueContainer, $('.profile-description-element', undefined, useAsDefaultProfileTitle));
        disposables.add(useAsDefaultProfileCheckbox.onChange(() => {
            if (profileElement?.root instanceof UserDataProfileElement) {
                profileElement.root.toggleNewWindowProfile();
            }
        }));
        disposables.add(addDisposableListener(useAsDefaultProfileLabel, EventType.CLICK, () => {
            if (profileElement?.root instanceof UserDataProfileElement) {
                profileElement.root.toggleNewWindowProfile();
            }
        }));
        const renderUseAsDefault = (profileElement) => {
            useAsDefaultProfileCheckbox.checked =
                profileElement.root instanceof UserDataProfileElement &&
                    profileElement.root.isNewWindowProfile;
        };
        return {
            set element(element) {
                profileElement = element;
                renderUseAsDefault(profileElement);
                elementDisposables.add(profileElement.root.onDidChange((e) => {
                    if (e.newWindowProfile) {
                        renderUseAsDefault(element);
                    }
                }));
            },
            disposables,
            elementDisposables,
        };
    }
}
let CopyFromProfileRenderer = class CopyFromProfileRenderer extends ProfilePropertyRenderer {
    constructor(userDataProfilesService, instantiationService, uriIdentityService, contextViewService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.contextViewService = contextViewService;
        this.templateId = 'copyFrom';
        this.templates = [];
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const copyFromContainer = append(parent, $('.profile-row-container.profile-copy-from-container'));
        append(copyFromContainer, $('.profile-label-element', undefined, localize('create from', 'Copy from')));
        append(copyFromContainer, $('.profile-description-element', undefined, localize('copy from description', 'Select the profile source from which you want to copy contents')));
        const copyFromSelectBox = disposables.add(this.instantiationService.createInstance(SelectBox, [], 0, this.contextViewService, defaultSelectBoxStyles, {
            useCustomDrawn: true,
            ariaLabel: localize('copy profile from', 'Copy profile from'),
        }));
        copyFromSelectBox.render(append(copyFromContainer, $('.profile-select-container')));
        const render = (profileElement, copyFromOptions) => {
            copyFromSelectBox.setOptions(copyFromOptions);
            const id = profileElement.copyFrom instanceof URI
                ? profileElement.copyFrom.toString()
                : profileElement.copyFrom?.id;
            const index = id ? copyFromOptions.findIndex((option) => option.id === id) : 0;
            copyFromSelectBox.select(index);
        };
        const that = this;
        return {
            set element(element) {
                profileElement = element;
                if (profileElement.root instanceof NewProfileElement) {
                    const newProfileElement = profileElement.root;
                    let copyFromOptions = that.getCopyFromOptions(newProfileElement);
                    render(newProfileElement, copyFromOptions);
                    copyFromSelectBox.setEnabled(!newProfileElement.previewProfile && !newProfileElement.disabled);
                    elementDisposables.add(profileElement.root.onDidChange((e) => {
                        if (e.copyFrom || e.copyFromInfo) {
                            copyFromOptions = that.getCopyFromOptions(newProfileElement);
                            render(newProfileElement, copyFromOptions);
                        }
                        if (e.preview || e.disabled) {
                            copyFromSelectBox.setEnabled(!newProfileElement.previewProfile && !newProfileElement.disabled);
                        }
                    }));
                    elementDisposables.add(copyFromSelectBox.onDidSelect((option) => {
                        newProfileElement.copyFrom = copyFromOptions[option.index].source;
                    }));
                }
            },
            disposables,
            elementDisposables,
        };
    }
    setTemplates(templates) {
        this.templates = templates;
    }
    getCopyFromOptions(profileElement) {
        const separator = { text: '\u2500\u2500\u2500\u2500\u2500\u2500', isDisabled: true };
        const copyFromOptions = [];
        copyFromOptions.push({ text: localize('empty profile', 'None') });
        for (const [copyFromTemplate, name] of profileElement.copyFromTemplates) {
            if (!this.templates.some((template) => this.uriIdentityService.extUri.isEqual(URI.parse(template.url), copyFromTemplate))) {
                copyFromOptions.push({
                    text: `${name} (${basename(copyFromTemplate)})`,
                    id: copyFromTemplate.toString(),
                    source: copyFromTemplate,
                });
            }
        }
        if (this.templates.length) {
            copyFromOptions.push({
                ...separator,
                decoratorRight: localize('from templates', 'Profile Templates'),
            });
            for (const template of this.templates) {
                copyFromOptions.push({
                    text: template.name,
                    id: template.url,
                    source: URI.parse(template.url),
                });
            }
        }
        copyFromOptions.push({
            ...separator,
            decoratorRight: localize('from existing profiles', 'Existing Profiles'),
        });
        for (const profile of this.userDataProfilesService.profiles) {
            if (!profile.isTransient) {
                copyFromOptions.push({ text: profile.name, id: profile.id, source: profile });
            }
        }
        return copyFromOptions;
    }
};
CopyFromProfileRenderer = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IContextViewService)
], CopyFromProfileRenderer);
let ContentsProfileRenderer = class ContentsProfileRenderer extends ProfilePropertyRenderer {
    constructor(userDataProfilesService, contextMenuService, instantiationService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.templateId = 'contents';
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const configureRowContainer = append(parent, $('.profile-row-container'));
        append(configureRowContainer, $('.profile-label-element', undefined, localize('contents', 'Contents')));
        const contentsDescriptionElement = append(configureRowContainer, $('.profile-description-element'));
        const contentsTreeHeader = append(configureRowContainer, $('.profile-content-tree-header'));
        const optionsLabel = $('.options-header', undefined, $('span', undefined, localize('options', 'Source')));
        append(contentsTreeHeader, $(''), $('', undefined, localize('contents', 'Contents')), optionsLabel, $(''));
        const delegate = new ProfileContentTreeElementDelegate();
        const profilesContentTree = (this.profilesContentTree = disposables.add(this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'ProfileEditor-ContentsTree', append(configureRowContainer, $('.profile-content-tree.file-icon-themable-tree.show-file-icons')), delegate, [
            this.instantiationService.createInstance(ExistingProfileResourceTreeRenderer),
            this.instantiationService.createInstance(NewProfileResourceTreeRenderer),
            this.instantiationService.createInstance(ProfileResourceChildTreeItemRenderer),
        ], this.instantiationService.createInstance(ProfileResourceTreeDataSource), {
            multipleSelectionSupport: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(element) {
                    if ((element?.element).resourceType) {
                        return (element?.element).resourceType;
                    }
                    if ((element?.element).label) {
                        return (element?.element).label;
                    }
                    return '';
                },
                getWidgetAriaLabel() {
                    return '';
                },
            },
            identityProvider: {
                getId(element) {
                    if (element?.element.handle) {
                        return element.element.handle;
                    }
                    return '';
                },
            },
            expandOnlyOnTwistieClick: true,
            renderIndentGuides: RenderIndentGuides.None,
            enableStickyScroll: false,
            openOnSingleClick: false,
            alwaysConsumeMouseWheel: false,
        })));
        this.profilesContentTree.style(listStyles);
        disposables.add(toDisposable(() => (this.profilesContentTree = undefined)));
        disposables.add(this.profilesContentTree.onDidChangeContentHeight((height) => {
            this.profilesContentTree?.layout(height);
            if (profileElement) {
                this._onDidChangeContentHeight.fire(profileElement);
            }
        }));
        disposables.add(this.profilesContentTree.onDidChangeSelection((e) => {
            if (profileElement) {
                this._onDidChangeSelection.fire({
                    element: profileElement,
                    selected: !!e.elements.length,
                });
            }
        }));
        disposables.add(this.profilesContentTree.onDidOpen(async (e) => {
            if (!e.browserEvent) {
                return;
            }
            if (e.element?.element.openAction) {
                await e.element.element.openAction.run();
            }
        }));
        disposables.add(this.profilesContentTree.onContextMenu(async (e) => {
            if (!e.element?.element.actions?.contextMenu?.length) {
                return;
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => e.element?.element?.actions?.contextMenu ?? [],
                getActionsContext: () => e.element,
            });
        }));
        const updateDescription = (element) => {
            clearNode(contentsDescriptionElement);
            const markdown = new MarkdownString();
            if (element.root instanceof UserDataProfileElement && element.root.profile.isDefault) {
                markdown.appendMarkdown(localize('default profile contents description', 'Browse contents of this profile\n'));
            }
            else {
                markdown.appendMarkdown(localize('contents source description', 'Configure source of contents for this profile\n'));
                if (element.root instanceof NewProfileElement) {
                    const copyFromName = element.root.getCopyFromName();
                    const optionName = copyFromName === this.userDataProfilesService.defaultProfile.name
                        ? localize('copy from default', '{0} (Copy)', copyFromName)
                        : copyFromName;
                    if (optionName) {
                        markdown.appendMarkdown(localize('copy info', '- *{0}:* Copy contents from the {1} profile\n', optionName, copyFromName));
                    }
                    markdown
                        .appendMarkdown(localize('default info', '- *Default:* Use contents from the Default profile\n'))
                        .appendMarkdown(localize('none info', '- *None:* Create empty contents\n'));
                }
            }
            append(contentsDescriptionElement, elementDisposables.add(renderMarkdown(markdown)).element);
        };
        const that = this;
        return {
            set element(element) {
                profileElement = element;
                updateDescription(element);
                if (element.root instanceof NewProfileElement) {
                    contentsTreeHeader.classList.remove('default-profile');
                }
                else if (element.root instanceof UserDataProfileElement) {
                    contentsTreeHeader.classList.toggle('default-profile', element.root.profile.isDefault);
                }
                profilesContentTree.setInput(profileElement.root);
                elementDisposables.add(profileElement.root.onDidChange((e) => {
                    if (e.copyFrom || e.copyFlags || e.flags || e.extensions || e.snippets || e.preview) {
                        profilesContentTree.updateChildren(element.root);
                    }
                    if (e.copyFromInfo) {
                        updateDescription(element);
                        that._onDidChangeContentHeight.fire(element);
                    }
                }));
            },
            disposables,
            elementDisposables: new DisposableStore(),
        };
    }
    clearSelection() {
        if (this.profilesContentTree) {
            this.profilesContentTree.setSelection([]);
            this.profilesContentTree.setFocus([]);
        }
    }
};
ContentsProfileRenderer = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IContextMenuService),
    __param(2, IInstantiationService)
], ContentsProfileRenderer);
let ProfileWorkspacesRenderer = class ProfileWorkspacesRenderer extends ProfilePropertyRenderer {
    constructor(labelService, uriIdentityService, fileDialogService, instantiationService) {
        super();
        this.labelService = labelService;
        this.uriIdentityService = uriIdentityService;
        this.fileDialogService = fileDialogService;
        this.instantiationService = instantiationService;
        this.templateId = 'workspaces';
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const elementDisposables = disposables.add(new DisposableStore());
        let profileElement;
        const profileWorkspacesRowContainer = append(parent, $('.profile-row-container'));
        append(profileWorkspacesRowContainer, $('.profile-label-element', undefined, localize('folders_workspaces', 'Folders & Workspaces')));
        const profileWorkspacesDescriptionElement = append(profileWorkspacesRowContainer, $('.profile-description-element'));
        const workspacesTableContainer = append(profileWorkspacesRowContainer, $('.profile-associations-table'));
        const table = (this.workspacesTable = disposables.add(this.instantiationService.createInstance((WorkbenchTable), 'ProfileEditor-AssociationsTable', workspacesTableContainer, new (class {
            constructor() {
                this.headerRowHeight = 30;
            }
            getHeight() {
                return 24;
            }
        })(), [
            {
                label: '',
                tooltip: '',
                weight: 1,
                minimumWidth: 30,
                maximumWidth: 30,
                templateId: WorkspaceUriEmptyColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('hostColumnLabel', 'Host'),
                tooltip: '',
                weight: 2,
                templateId: WorkspaceUriHostColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('pathColumnLabel', 'Path'),
                tooltip: '',
                weight: 7,
                templateId: WorkspaceUriPathColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: '',
                tooltip: '',
                weight: 1,
                minimumWidth: 84,
                maximumWidth: 84,
                templateId: WorkspaceUriActionsColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [
            new WorkspaceUriEmptyColumnRenderer(),
            this.instantiationService.createInstance(WorkspaceUriHostColumnRenderer),
            this.instantiationService.createInstance(WorkspaceUriPathColumnRenderer),
            this.instantiationService.createInstance(WorkspaceUriActionsColumnRenderer),
        ], {
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            openOnSingleClick: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    const hostLabel = getHostLabel(this.labelService, item.workspace);
                    if (hostLabel === undefined || hostLabel.length === 0) {
                        return localize('trustedFolderAriaLabel', '{0}, trusted', this.labelService.getUriLabel(item.workspace));
                    }
                    return localize('trustedFolderWithHostAriaLabel', '{0} on {1}, trusted', this.labelService.getUriLabel(item.workspace), hostLabel);
                },
                getWidgetAriaLabel: () => localize('trustedFoldersAndWorkspaces', 'Trusted Folders & Workspaces'),
            },
            identityProvider: {
                getId(element) {
                    return element.workspace.toString();
                },
            },
        })));
        this.workspacesTable.style(listStyles);
        disposables.add(toDisposable(() => (this.workspacesTable = undefined)));
        disposables.add(this.workspacesTable.onDidChangeSelection((e) => {
            if (profileElement) {
                this._onDidChangeSelection.fire({
                    element: profileElement,
                    selected: !!e.elements.length,
                });
            }
        }));
        const addButtonBarElement = append(profileWorkspacesRowContainer, $('.profile-workspaces-button-container'));
        const buttonBar = disposables.add(new ButtonBar(addButtonBarElement));
        const addButton = this._register(buttonBar.addButton({ title: localize('addButton', 'Add Folder'), ...defaultButtonStyles }));
        addButton.label = localize('addButton', 'Add Folder');
        disposables.add(addButton.onDidClick(async () => {
            const uris = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: true,
                openLabel: localize('addFolder', 'Add Folder'),
                title: localize('addFolderTitle', 'Select Folders To Add'),
            });
            if (uris) {
                if (profileElement?.root instanceof UserDataProfileElement) {
                    profileElement.root.updateWorkspaces(uris, []);
                }
            }
        }));
        disposables.add(table.onDidOpen((item) => {
            if (item?.element) {
                item.element.profileElement.openWorkspace(item.element.workspace);
            }
        }));
        const updateTable = () => {
            if (profileElement?.root instanceof UserDataProfileElement &&
                profileElement.root.workspaces?.length) {
                profileWorkspacesDescriptionElement.textContent = localize('folders_workspaces_description', 'Following folders and workspaces are using this profile');
                workspacesTableContainer.classList.remove('hide');
                table.splice(0, table.length, profileElement.root.workspaces
                    .map((workspace) => ({
                    workspace,
                    profileElement: profileElement.root,
                }))
                    .sort((a, b) => this.uriIdentityService.extUri.compare(a.workspace, b.workspace)));
                this.layout();
            }
            else {
                profileWorkspacesDescriptionElement.textContent = localize('no_folder_description', 'No folders or workspaces are using this profile');
                workspacesTableContainer.classList.add('hide');
            }
        };
        const that = this;
        return {
            set element(element) {
                profileElement = element;
                if (element.root instanceof UserDataProfileElement) {
                    updateTable();
                }
                elementDisposables.add(profileElement.root.onDidChange((e) => {
                    if (profileElement && e.workspaces) {
                        updateTable();
                        that._onDidChangeContentHeight.fire(profileElement);
                    }
                }));
            },
            disposables,
            elementDisposables: new DisposableStore(),
        };
    }
    layout() {
        if (this.workspacesTable) {
            this.workspacesTable.layout(this.workspacesTable.length * 24 + 30, undefined);
        }
    }
    clearSelection() {
        if (this.workspacesTable) {
            this.workspacesTable.setSelection([]);
            this.workspacesTable.setFocus([]);
        }
    }
};
ProfileWorkspacesRenderer = __decorate([
    __param(0, ILabelService),
    __param(1, IUriIdentityService),
    __param(2, IFileDialogService),
    __param(3, IInstantiationService)
], ProfileWorkspacesRenderer);
let ExistingProfileResourceTreeRenderer = class ExistingProfileResourceTreeRenderer extends AbstractProfileResourceTreeRenderer {
    static { ExistingProfileResourceTreeRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'ExistingProfileResourceTemplate'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.templateId = ExistingProfileResourceTreeRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const container = append(parent, $('.profile-tree-item-container.existing-profile-resource-type-container'));
        const label = append(container, $('.profile-resource-type-label'));
        const radio = disposables.add(new Radio({ items: [] }));
        append(append(container, $('.profile-resource-options-container')), radio.domNode);
        const actionsContainer = append(container, $('.profile-resource-actions-container'));
        const actionBar = disposables.add(this.instantiationService.createInstance(WorkbenchToolBar, actionsContainer, {
            hoverDelegate: disposables.add(createInstantHoverDelegate()),
            highlightToggledItems: true,
        }));
        return {
            label,
            radio,
            actionBar,
            disposables,
            elementDisposables: disposables.add(new DisposableStore()),
        };
    }
    renderElement({ element: profileResourceTreeElement }, index, templateData, height) {
        templateData.elementDisposables.clear();
        const { element, root } = profileResourceTreeElement;
        if (!(root instanceof UserDataProfileElement)) {
            throw new Error('ExistingProfileResourceTreeRenderer can only render existing profile element');
        }
        if (isString(element) || !isProfileResourceTypeElement(element)) {
            throw new Error('Invalid profile resource element');
        }
        const updateRadioItems = () => {
            templateData.radio.setItems([
                {
                    text: localize('default', 'Default'),
                    tooltip: localize('default description', 'Use {0} from the Default profile', resourceTypeTitle),
                    isActive: root.getFlag(element.resourceType),
                },
                {
                    text: root.name,
                    tooltip: localize('current description', 'Use {0} from the {1} profile', resourceTypeTitle, root.name),
                    isActive: !root.getFlag(element.resourceType),
                },
            ]);
        };
        const resourceTypeTitle = this.getResourceTypeTitle(element.resourceType);
        templateData.label.textContent = resourceTypeTitle;
        if (root instanceof UserDataProfileElement && root.profile.isDefault) {
            templateData.radio.domNode.classList.add('hide');
        }
        else {
            templateData.radio.domNode.classList.remove('hide');
            updateRadioItems();
            templateData.elementDisposables.add(root.onDidChange((e) => {
                if (e.name) {
                    updateRadioItems();
                }
            }));
            templateData.elementDisposables.add(templateData.radio.onDidSelect((index) => root.setFlag(element.resourceType, index === 0)));
        }
        const actions = [];
        if (element.openAction) {
            actions.push(element.openAction);
        }
        if (element.actions?.primary) {
            actions.push(...element.actions.primary);
        }
        templateData.actionBar.setActions(actions);
    }
};
ExistingProfileResourceTreeRenderer = ExistingProfileResourceTreeRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], ExistingProfileResourceTreeRenderer);
let NewProfileResourceTreeRenderer = class NewProfileResourceTreeRenderer extends AbstractProfileResourceTreeRenderer {
    static { NewProfileResourceTreeRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'NewProfileResourceTemplate'; }
    constructor(userDataProfilesService, instantiationService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.instantiationService = instantiationService;
        this.templateId = NewProfileResourceTreeRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const container = append(parent, $('.profile-tree-item-container.new-profile-resource-type-container'));
        const labelContainer = append(container, $('.profile-resource-type-label-container'));
        const label = append(labelContainer, $('span.profile-resource-type-label'));
        const radio = disposables.add(new Radio({ items: [] }));
        append(append(container, $('.profile-resource-options-container')), radio.domNode);
        const actionsContainer = append(container, $('.profile-resource-actions-container'));
        const actionBar = disposables.add(this.instantiationService.createInstance(WorkbenchToolBar, actionsContainer, {
            hoverDelegate: disposables.add(createInstantHoverDelegate()),
            highlightToggledItems: true,
        }));
        return {
            label,
            radio,
            actionBar,
            disposables,
            elementDisposables: disposables.add(new DisposableStore()),
        };
    }
    renderElement({ element: profileResourceTreeElement }, index, templateData, height) {
        templateData.elementDisposables.clear();
        const { element, root } = profileResourceTreeElement;
        if (!(root instanceof NewProfileElement)) {
            throw new Error('NewProfileResourceTreeRenderer can only render new profile element');
        }
        if (isString(element) || !isProfileResourceTypeElement(element)) {
            throw new Error('Invalid profile resource element');
        }
        const resourceTypeTitle = this.getResourceTypeTitle(element.resourceType);
        templateData.label.textContent = resourceTypeTitle;
        const renderRadioItems = () => {
            const options = [
                {
                    text: localize('default', 'Default'),
                    tooltip: localize('default description', 'Use {0} from the Default profile', resourceTypeTitle),
                },
                {
                    text: localize('none', 'None'),
                    tooltip: localize('none description', 'Create empty {0}', resourceTypeTitle),
                },
            ];
            const copyFromName = root.getCopyFromName();
            const name = copyFromName === this.userDataProfilesService.defaultProfile.name
                ? localize('copy from default', '{0} (Copy)', copyFromName)
                : copyFromName;
            if (root.copyFrom && name) {
                templateData.radio.setItems([
                    {
                        text: name,
                        tooltip: name
                            ? localize('copy from profile description', 'Copy {0} from the {1} profile', resourceTypeTitle, name)
                            : localize('copy description', 'Copy'),
                    },
                    ...options,
                ]);
                templateData.radio.setActiveItem(root.getCopyFlag(element.resourceType) ? 0 : root.getFlag(element.resourceType) ? 1 : 2);
            }
            else {
                templateData.radio.setItems(options);
                templateData.radio.setActiveItem(root.getFlag(element.resourceType) ? 0 : 1);
            }
        };
        if (root.copyFrom) {
            templateData.elementDisposables.add(templateData.radio.onDidSelect((index) => {
                root.setFlag(element.resourceType, index === 1);
                root.setCopyFlag(element.resourceType, index === 0);
            }));
        }
        else {
            templateData.elementDisposables.add(templateData.radio.onDidSelect((index) => {
                root.setFlag(element.resourceType, index === 0);
            }));
        }
        renderRadioItems();
        templateData.radio.setEnabled(!root.disabled && !root.previewProfile);
        templateData.elementDisposables.add(root.onDidChange((e) => {
            if (e.disabled || e.preview) {
                templateData.radio.setEnabled(!root.disabled && !root.previewProfile);
            }
            if (e.copyFrom || e.copyFromInfo) {
                renderRadioItems();
            }
        }));
        const actions = [];
        if (element.openAction) {
            actions.push(element.openAction);
        }
        if (element.actions?.primary) {
            actions.push(...element.actions.primary);
        }
        templateData.actionBar.setActions(actions);
    }
};
NewProfileResourceTreeRenderer = NewProfileResourceTreeRenderer_1 = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IInstantiationService)
], NewProfileResourceTreeRenderer);
let ProfileResourceChildTreeItemRenderer = class ProfileResourceChildTreeItemRenderer extends AbstractProfileResourceTreeRenderer {
    static { ProfileResourceChildTreeItemRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'ProfileResourceChildTreeItemTemplate'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.templateId = ProfileResourceChildTreeItemRenderer_1.TEMPLATE_ID;
        this.labels = instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER);
        this.hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'mouse', undefined, {}));
    }
    renderTemplate(parent) {
        const disposables = new DisposableStore();
        const container = append(parent, $('.profile-tree-item-container.profile-resource-child-container'));
        const checkbox = disposables.add(new Checkbox('', false, defaultCheckboxStyles));
        append(container, checkbox.domNode);
        const resourceLabel = disposables.add(this.labels.create(container, { hoverDelegate: this.hoverDelegate }));
        const actionsContainer = append(container, $('.profile-resource-actions-container'));
        const actionBar = disposables.add(this.instantiationService.createInstance(WorkbenchToolBar, actionsContainer, {
            hoverDelegate: disposables.add(createInstantHoverDelegate()),
            highlightToggledItems: true,
        }));
        return {
            checkbox,
            resourceLabel,
            actionBar,
            disposables,
            elementDisposables: disposables.add(new DisposableStore()),
        };
    }
    renderElement({ element: profileResourceTreeElement }, index, templateData, height) {
        templateData.elementDisposables.clear();
        const { element } = profileResourceTreeElement;
        if (isString(element) || !isProfileResourceChildElement(element)) {
            throw new Error('Invalid profile resource element');
        }
        if (element.checkbox) {
            templateData.checkbox.domNode.setAttribute('tabindex', '0');
            templateData.checkbox.domNode.classList.remove('hide');
            templateData.checkbox.checked = element.checkbox.isChecked;
            templateData.checkbox.domNode.ariaLabel =
                element.checkbox.accessibilityInformation?.label ?? '';
            if (element.checkbox.accessibilityInformation?.role) {
                templateData.checkbox.domNode.role = element.checkbox.accessibilityInformation.role;
            }
        }
        else {
            templateData.checkbox.domNode.removeAttribute('tabindex');
            templateData.checkbox.domNode.classList.add('hide');
        }
        templateData.resourceLabel.setResource({
            name: element.resource ? basename(element.resource) : element.label,
            description: element.description,
            resource: element.resource,
        }, {
            forceLabel: true,
            icon: element.icon,
            hideIcon: !element.resource && !element.icon,
        });
        const actions = [];
        if (element.openAction) {
            actions.push(element.openAction);
        }
        if (element.actions?.primary) {
            actions.push(...element.actions.primary);
        }
        templateData.actionBar.setActions(actions);
    }
};
ProfileResourceChildTreeItemRenderer = ProfileResourceChildTreeItemRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], ProfileResourceChildTreeItemRenderer);
class WorkspaceUriEmptyColumnRenderer {
    constructor() {
        this.templateId = WorkspaceUriEmptyColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'empty'; }
    renderTemplate(container) {
        return {};
    }
    renderElement(item, index, templateData, height) { }
    disposeTemplate() { }
}
let WorkspaceUriHostColumnRenderer = class WorkspaceUriHostColumnRenderer {
    static { WorkspaceUriHostColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'host'; }
    constructor(uriIdentityService, labelService) {
        this.uriIdentityService = uriIdentityService;
        this.labelService = labelService;
        this.templateId = WorkspaceUriHostColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const renderDisposables = disposables.add(new DisposableStore());
        const element = container.appendChild($('.host'));
        const hostContainer = element.appendChild($('div.host-label'));
        const buttonBarContainer = element.appendChild($('div.button-bar'));
        return {
            element,
            hostContainer,
            buttonBarContainer,
            disposables,
            renderDisposables,
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        templateData.renderDisposables.add({
            dispose: () => {
                clearNode(templateData.buttonBarContainer);
            },
        });
        templateData.hostContainer.innerText = getHostLabel(this.labelService, item.workspace);
        templateData.element.classList.toggle('current-workspace', this.uriIdentityService.extUri.isEqual(item.workspace, item.profileElement.getCurrentWorkspace()));
        templateData.hostContainer.style.display = '';
        templateData.buttonBarContainer.style.display = 'none';
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
WorkspaceUriHostColumnRenderer = WorkspaceUriHostColumnRenderer_1 = __decorate([
    __param(0, IUriIdentityService),
    __param(1, ILabelService)
], WorkspaceUriHostColumnRenderer);
let WorkspaceUriPathColumnRenderer = class WorkspaceUriPathColumnRenderer {
    static { WorkspaceUriPathColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'path'; }
    constructor(uriIdentityService, hoverService) {
        this.uriIdentityService = uriIdentityService;
        this.hoverService = hoverService;
        this.templateId = WorkspaceUriPathColumnRenderer_1.TEMPLATE_ID;
        this.hoverDelegate = getDefaultHoverDelegate('mouse');
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const element = container.appendChild($('.path'));
        const pathLabel = element.appendChild($('div.path-label'));
        const pathHover = disposables.add(this.hoverService.setupManagedHover(this.hoverDelegate, pathLabel, ''));
        const renderDisposables = disposables.add(new DisposableStore());
        return {
            element,
            pathLabel,
            pathHover,
            disposables,
            renderDisposables,
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        const stringValue = this.formatPath(item.workspace);
        templateData.pathLabel.innerText = stringValue;
        templateData.element.classList.toggle('current-workspace', this.uriIdentityService.extUri.isEqual(item.workspace, item.profileElement.getCurrentWorkspace()));
        templateData.pathHover.update(stringValue);
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.renderDisposables.dispose();
    }
    formatPath(uri) {
        if (uri.scheme === Schemas.file) {
            return normalizeDriveLetter(uri.fsPath);
        }
        // If the path is not a file uri, but points to a windows remote, we should create windows fs path
        // e.g. /c:/user/directory => C:\user\directory
        if (uri.path.startsWith(posix.sep)) {
            const pathWithoutLeadingSeparator = uri.path.substring(1);
            const isWindowsPath = hasDriveLetter(pathWithoutLeadingSeparator, true);
            if (isWindowsPath) {
                return normalizeDriveLetter(win32.normalize(pathWithoutLeadingSeparator), true);
            }
        }
        return uri.path;
    }
};
WorkspaceUriPathColumnRenderer = WorkspaceUriPathColumnRenderer_1 = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IHoverService)
], WorkspaceUriPathColumnRenderer);
let ChangeProfileAction = class ChangeProfileAction extends Action {
    constructor(item, userDataProfilesService) {
        super('changeProfile', '', ThemeIcon.asClassName(editIcon));
        this.item = item;
        this.userDataProfilesService = userDataProfilesService;
        this.tooltip = localize('change profile', 'Change Profile');
    }
    getSwitchProfileActions() {
        return this.userDataProfilesService.profiles
            .filter((profile) => !profile.isTransient)
            .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name)))
            .map((profile) => ({
            id: `switchProfileTo${profile.id}`,
            label: profile.name,
            class: undefined,
            enabled: true,
            checked: profile.id === this.item.profileElement.profile.id,
            tooltip: '',
            run: () => {
                if (profile.id === this.item.profileElement.profile.id) {
                    return;
                }
                this.userDataProfilesService.updateProfile(profile, {
                    workspaces: [...(profile.workspaces ?? []), this.item.workspace],
                });
            },
        }));
    }
};
ChangeProfileAction = __decorate([
    __param(1, IUserDataProfilesService)
], ChangeProfileAction);
let WorkspaceUriActionsColumnRenderer = class WorkspaceUriActionsColumnRenderer {
    static { WorkspaceUriActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(userDataProfilesService, userDataProfileManagementService, contextMenuService, uriIdentityService) {
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.contextMenuService = contextMenuService;
        this.uriIdentityService = uriIdentityService;
        this.templateId = WorkspaceUriActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const element = container.appendChild($('.profile-workspaces-actions-container'));
        const hoverDelegate = disposables.add(createInstantHoverDelegate());
        const actionBar = disposables.add(new ActionBar(element, {
            hoverDelegate,
            actionViewItemProvider: (action) => {
                if (action instanceof ChangeProfileAction) {
                    return new DropdownMenuActionViewItem(action, { getActions: () => action.getSwitchProfileActions() }, this.contextMenuService, {
                        classNames: action.class,
                        hoverDelegate,
                    });
                }
                return undefined;
            },
        }));
        return { actionBar, disposables };
    }
    renderElement(item, index, templateData, height) {
        templateData.actionBar.clear();
        const actions = [];
        actions.push(this.createOpenAction(item));
        actions.push(new ChangeProfileAction(item, this.userDataProfilesService));
        actions.push(this.createDeleteAction(item));
        templateData.actionBar.push(actions, { icon: true });
    }
    createOpenAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(Codicon.window),
            enabled: !this.uriIdentityService.extUri.isEqual(item.workspace, item.profileElement.getCurrentWorkspace()),
            id: 'openWorkspace',
            tooltip: localize('open', 'Open in New Window'),
            run: () => item.profileElement.openWorkspace(item.workspace),
        };
    }
    createDeleteAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(removeIcon),
            enabled: this.userDataProfileManagementService.getDefaultProfileToUse().id !==
                item.profileElement.profile.id,
            id: 'deleteTrustedUri',
            tooltip: localize('deleteTrustedUri', 'Delete Path'),
            run: () => item.profileElement.updateWorkspaces([], [item.workspace]),
        };
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
WorkspaceUriActionsColumnRenderer = WorkspaceUriActionsColumnRenderer_1 = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IUserDataProfileManagementService),
    __param(2, IContextMenuService),
    __param(3, IUriIdentityService)
], WorkspaceUriActionsColumnRenderer);
function getHostLabel(labelService, workspaceUri) {
    return workspaceUri.authority
        ? labelService.getHostLabel(workspaceUri.scheme, workspaceUri.authority)
        : localize('localAuthority', 'Local');
}
let UserDataProfilesEditorInput = class UserDataProfilesEditorInput extends EditorInput {
    static { UserDataProfilesEditorInput_1 = this; }
    static { this.ID = 'workbench.input.userDataProfiles'; }
    get dirty() {
        return this._dirty;
    }
    set dirty(dirty) {
        if (this._dirty !== dirty) {
            this._dirty = dirty;
            this._onDidChangeDirty.fire();
        }
    }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.resource = undefined;
        this._dirty = false;
        this.model = UserDataProfilesEditorModel.getInstance(this.instantiationService);
        this._register(this.model.onDidChange((e) => (this.dirty = this.model.profiles.some((profile) => profile instanceof NewProfileElement))));
    }
    get typeId() {
        return UserDataProfilesEditorInput_1.ID;
    }
    getName() {
        return localize('userDataProfiles', 'Profiles');
    }
    getIcon() {
        return defaultUserDataProfileIcon;
    }
    async resolve() {
        await this.model.resolve();
        return this.model;
    }
    isDirty() {
        return this.dirty;
    }
    async save() {
        await this.model.saveNewProfile();
        return this;
    }
    async revert() {
        this.model.revert();
    }
    matches(otherInput) {
        return otherInput instanceof UserDataProfilesEditorInput_1;
    }
    dispose() {
        for (const profile of this.model.profiles) {
            if (profile instanceof UserDataProfileElement) {
                profile.reset();
            }
        }
        super.dispose();
    }
};
UserDataProfilesEditorInput = UserDataProfilesEditorInput_1 = __decorate([
    __param(0, IInstantiationService)
], UserDataProfilesEditorInput);
export { UserDataProfilesEditorInput };
export class UserDataProfilesEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(UserDataProfilesEditorInput);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZXNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFFVCxVQUFVLEdBQ1YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sTUFBTSxFQUdOLFNBQVMsRUFDVCxhQUFhLEVBQ2IsUUFBUSxHQUNSLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBRU4sd0JBQXdCLEdBRXhCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxN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