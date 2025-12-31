/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/singleeditortabscontrol.css';
import { EditorResourceAccessor, SideBySideEditor, preventEditorClose, EditorCloseMethod, } from '../../../common/editor.js';
import { EditorTabsControl } from './editorTabsControl.js';
import { ResourceLabel } from '../../labels.js';
import { TAB_ACTIVE_FOREGROUND, TAB_UNFOCUSED_ACTIVE_FOREGROUND } from '../../../common/theme.js';
import { EventType as TouchEventType, Gesture, } from '../../../../base/browser/touch.js';
import { addDisposableListener, EventType, EventHelper, Dimension, isAncestor, DragAndDropObserver, isHTMLElement, $, } from '../../../../base/browser/dom.js';
import { CLOSE_EDITOR_COMMAND_ID, UNLOCK_GROUP_COMMAND_ID } from './editorCommands.js';
import { Color } from '../../../../base/common/color.js';
import { assertIsDefined, assertAllDefined } from '../../../../base/common/types.js';
import { equals } from '../../../../base/common/objects.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { BreadcrumbsControlFactory } from './breadcrumbsControl.js';
export class SingleEditorTabsControl extends EditorTabsControl {
    constructor() {
        super(...arguments);
        this.activeLabel = Object.create(null);
    }
    get breadcrumbsControl() {
        return this.breadcrumbsControlFactory?.control;
    }
    create(parent) {
        super.create(parent);
        const titleContainer = (this.titleContainer = parent);
        titleContainer.draggable = true;
        // Container listeners
        this.registerContainerListeners(titleContainer);
        // Gesture Support
        this._register(Gesture.addTarget(titleContainer));
        const labelContainer = $('.label-container');
        titleContainer.appendChild(labelContainer);
        // Editor Label
        this.editorLabel = this._register(this.instantiationService.createInstance(ResourceLabel, labelContainer, {})).element;
        this._register(addDisposableListener(this.editorLabel.element, EventType.CLICK, (e) => this.onTitleLabelClick(e)));
        // Breadcrumbs
        this.breadcrumbsControlFactory = this._register(this.instantiationService.createInstance(BreadcrumbsControlFactory, labelContainer, this.groupView, {
            showFileIcons: false,
            showSymbolIcons: true,
            showDecorationColors: false,
            widgetStyles: {
                ...defaultBreadcrumbsWidgetStyles,
                breadcrumbsBackground: Color.transparent.toString(),
            },
            showPlaceholder: false,
            dragEditor: true,
        }));
        this._register(this.breadcrumbsControlFactory.onDidEnablementChange(() => this.handleBreadcrumbsEnablementChange()));
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this._register(toDisposable(() => titleContainer.classList.remove('breadcrumbs'))); // important to remove because the container is a shared dom node
        // Create editor actions toolbar
        this.createEditorActionsToolBar(titleContainer, ['title-actions']);
        return titleContainer;
    }
    registerContainerListeners(titleContainer) {
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        this._register(new DragAndDropObserver(titleContainer, {
            onDragStart: (e) => {
                isNewWindowOperation = this.onGroupDragStart(e, titleContainer);
            },
            onDrag: (e) => {
                lastDragEvent = e;
            },
            onDragEnd: (e) => {
                this.onGroupDragEnd(e, lastDragEvent, titleContainer, isNewWindowOperation);
            },
        }));
        // Pin on double click
        this._register(addDisposableListener(titleContainer, EventType.DBLCLICK, (e) => this.onTitleDoubleClick(e)));
        // Detect mouse click
        this._register(addDisposableListener(titleContainer, EventType.AUXCLICK, (e) => this.onTitleAuxClick(e)));
        // Detect touch
        this._register(addDisposableListener(titleContainer, TouchEventType.Tap, (e) => this.onTitleTap(e)));
        // Context Menu
        for (const event of [EventType.CONTEXT_MENU, TouchEventType.Contextmenu]) {
            this._register(addDisposableListener(titleContainer, event, (e) => {
                if (this.tabsModel.activeEditor) {
                    this.onTabContextMenu(this.tabsModel.activeEditor, e, titleContainer);
                }
            }));
        }
    }
    onTitleLabelClick(e) {
        EventHelper.stop(e, false);
        // delayed to let the onTitleClick() come first which can cause a focus change which can close quick access
        setTimeout(() => this.quickInputService.quickAccess.show());
    }
    onTitleDoubleClick(e) {
        EventHelper.stop(e);
        this.groupView.pinEditor();
    }
    onTitleAuxClick(e) {
        if (e.button === 1 /* Middle Button */ && this.tabsModel.activeEditor) {
            EventHelper.stop(e, true /* for https://github.com/microsoft/vscode/issues/56715 */);
            if (!preventEditorClose(this.tabsModel, this.tabsModel.activeEditor, EditorCloseMethod.MOUSE, this.groupsView.partOptions)) {
                this.groupView.closeEditor(this.tabsModel.activeEditor);
            }
        }
    }
    onTitleTap(e) {
        // We only want to open the quick access picker when
        // the tap occurred over the editor label, so we need
        // to check on the target
        // (https://github.com/microsoft/vscode/issues/107543)
        const target = e.initialTarget;
        if (!isHTMLElement(target) ||
            !this.editorLabel ||
            !isAncestor(target, this.editorLabel.element)) {
            return;
        }
        // TODO@rebornix gesture tap should open the quick access
        // editorGroupView will focus on the editor again when there
        // are mouse/pointer/touch down events we need to wait a bit as
        // `GesureEvent.Tap` is generated from `touchstart` and then
        // `touchend` events, which are not an atom event.
        setTimeout(() => this.quickInputService.quickAccess.show(), 50);
    }
    openEditor(editor) {
        return this.doHandleOpenEditor();
    }
    openEditors(editors) {
        return this.doHandleOpenEditor();
    }
    doHandleOpenEditor() {
        const activeEditorChanged = this.ifActiveEditorChanged(() => this.redraw());
        if (!activeEditorChanged) {
            this.ifActiveEditorPropertiesChanged(() => this.redraw());
        }
        return activeEditorChanged;
    }
    beforeCloseEditor(editor) {
        // Nothing to do before closing an editor
    }
    closeEditor(editor) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    closeEditors(editors) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    moveEditor(editor, fromIndex, targetIndex) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    pinEditor(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    setActive(isActive) {
        this.redraw();
    }
    updateEditorSelections() { }
    updateEditorLabel(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    updateEditorDirty(editor) {
        this.ifEditorIsActive(editor, () => {
            const titleContainer = assertIsDefined(this.titleContainer);
            // Signal dirty (unless saving)
            if (editor.isDirty() && !editor.isSaving()) {
                titleContainer.classList.add('dirty');
            }
            // Otherwise, clear dirty
            else {
                titleContainer.classList.remove('dirty');
            }
        });
    }
    updateOptions(oldOptions, newOptions) {
        super.updateOptions(oldOptions, newOptions);
        if (oldOptions.labelFormat !== newOptions.labelFormat ||
            !equals(oldOptions.decorations, newOptions.decorations)) {
            this.redraw();
        }
    }
    updateStyles() {
        this.redraw();
    }
    handleBreadcrumbsEnablementChange() {
        const titleContainer = assertIsDefined(this.titleContainer);
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this.redraw();
    }
    ifActiveEditorChanged(fn) {
        if ((!this.activeLabel.editor && this.tabsModel.activeEditor) || // active editor changed from null => editor
            (this.activeLabel.editor && !this.tabsModel.activeEditor) || // active editor changed from editor => null
            !this.activeLabel.editor ||
            !this.tabsModel.isActive(this.activeLabel.editor) // active editor changed from editorA => editorB
        ) {
            fn();
            return true;
        }
        return false;
    }
    ifActiveEditorPropertiesChanged(fn) {
        if (!this.activeLabel.editor || !this.tabsModel.activeEditor) {
            return; // need an active editor to check for properties changed
        }
        if (this.activeLabel.pinned !== this.tabsModel.isPinned(this.tabsModel.activeEditor)) {
            fn(); // only run if pinned state has changed
        }
    }
    ifEditorIsActive(editor, fn) {
        if (this.tabsModel.isActive(editor)) {
            fn(); // only run if editor is current active
        }
    }
    redraw() {
        const editor = this.tabsModel.activeEditor ?? undefined;
        const options = this.groupsView.partOptions;
        const isEditorPinned = editor ? this.tabsModel.isPinned(editor) : false;
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        this.activeLabel = { editor, pinned: isEditorPinned };
        // Update Breadcrumbs
        if (this.breadcrumbsControl) {
            if (isGroupActive) {
                this.breadcrumbsControl.update();
                this.breadcrumbsControl.domNode.classList.toggle('preview', !isEditorPinned);
            }
            else {
                this.breadcrumbsControl.hide();
            }
        }
        // Clear if there is no editor
        const [titleContainer, editorLabel] = assertAllDefined(this.titleContainer, this.editorLabel);
        if (!editor) {
            titleContainer.classList.remove('dirty');
            editorLabel.clear();
            this.clearEditorActionsToolbar();
        }
        // Otherwise render it
        else {
            // Dirty state
            this.updateEditorDirty(editor);
            // Editor Label
            const { labelFormat } = this.groupsView.partOptions;
            let description;
            if (this.breadcrumbsControl && !this.breadcrumbsControl.isHidden()) {
                description = ''; // hide description when showing breadcrumbs
            }
            else if (labelFormat === 'default' && !isGroupActive) {
                description = ''; // hide description when group is not active and style is 'default'
            }
            else {
                description = editor.getDescription(this.getVerbosity(labelFormat)) || '';
            }
            editorLabel.setResource({
                resource: EditorResourceAccessor.getOriginalUri(editor, {
                    supportSideBySide: SideBySideEditor.BOTH,
                }),
                name: editor.getName(),
                description,
            }, {
                title: this.getHoverTitle(editor),
                italic: !isEditorPinned,
                extraClasses: ['single-tab', 'title-label'].concat(editor.getLabelExtraClasses()),
                fileDecorations: {
                    colors: Boolean(options.decorations?.colors),
                    badges: Boolean(options.decorations?.badges),
                },
                icon: editor.getIcon(),
                hideIcon: options.showIcons === false,
            });
            if (isGroupActive) {
                titleContainer.style.color = this.getColor(TAB_ACTIVE_FOREGROUND) || '';
            }
            else {
                titleContainer.style.color = this.getColor(TAB_UNFOCUSED_ACTIVE_FOREGROUND) || '';
            }
            // Update Editor Actions Toolbar
            this.updateEditorActionsToolbar();
        }
    }
    getVerbosity(style) {
        switch (style) {
            case 'short':
                return 0 /* Verbosity.SHORT */;
            case 'long':
                return 2 /* Verbosity.LONG */;
            default:
                return 1 /* Verbosity.MEDIUM */;
        }
    }
    prepareEditorActions(editorActions) {
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        // Active: allow all actions
        if (isGroupActive) {
            return editorActions;
        }
        // Inactive: only show "Close, "Unlock" and secondary actions
        else {
            return {
                primary: this.groupsView.partOptions.alwaysShowEditorActions
                    ? editorActions.primary
                    : editorActions.primary.filter((action) => action.id === CLOSE_EDITOR_COMMAND_ID || action.id === UNLOCK_GROUP_COMMAND_ID),
                secondary: editorActions.secondary,
            };
        }
    }
    getHeight() {
        return this.tabHeight;
    }
    layout(dimensions) {
        this.breadcrumbsControl?.layout(undefined);
        return new Dimension(dimensions.container.width, this.getHeight());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlRWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3Ivc2luZ2xlRWRpdG9yVGFic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04sc0JBQXNCLEVBR3RCLGdCQUFnQixFQUNoQixrQkFBa0IsRUFDbEIsaUJBQWlCLEdBRWpCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sU0FBUyxJQUFJLGNBQWMsRUFFM0IsT0FBTyxHQUNQLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFDVCxVQUFVLEVBQ1YsbUJBQW1CLEVBQ25CLGFBQWEsRUFDYixDQUFDLEdBQ0QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7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