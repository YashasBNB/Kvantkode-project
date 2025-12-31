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
var DropOverlay_1;
import './media/editordroptarget.css';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, addDisposableListener, DragAndDropObserver, EventHelper, EventType, getWindow, isAncestor, } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { assertAllDefined, assertIsDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { activeContrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { isTemporaryWorkspace, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { CodeDataTransfers, containsDragType, Extensions as DragAndDropExtensions, LocalSelectionTransfer, } from '../../../../platform/dnd/browser/dnd.js';
import { DraggedEditorGroupIdentifier, DraggedEditorIdentifier, extractTreeDropData, ResourcesDropHandler, } from '../../dnd.js';
import { prepareMoveCopyEditors } from './editor.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND, EDITOR_DROP_INTO_PROMPT_BACKGROUND, EDITOR_DROP_INTO_PROMPT_BORDER, EDITOR_DROP_INTO_PROMPT_FOREGROUND, } from '../../../common/theme.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
function isDropIntoEditorEnabledGlobally(configurationService) {
    return configurationService.getValue('editor.dropIntoEditor.enabled');
}
function isDragIntoEditorEvent(e) {
    return e.shiftKey;
}
let DropOverlay = class DropOverlay extends Themable {
    static { DropOverlay_1 = this; }
    static { this.OVERLAY_ID = 'monaco-workbench-editor-drop-overlay'; }
    get disposed() {
        return !!this._disposed;
    }
    constructor(groupView, themeService, configurationService, instantiationService, editorService, editorGroupService, treeViewsDragAndDropService, contextService) {
        super(themeService);
        this.groupView = groupView;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.contextService = contextService;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.cleanupOverlayScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));
        this.enableDropIntoEditor =
            isDropIntoEditorEnabledGlobally(this.configurationService) &&
                this.isDropIntoActiveEditorEnabled();
        this.create();
    }
    create() {
        const overlayOffsetHeight = this.getOverlayOffsetHeight();
        // Container
        const container = (this.container = $('div', { id: DropOverlay_1.OVERLAY_ID }));
        container.style.top = `${overlayOffsetHeight}px`;
        // Parent
        this.groupView.element.appendChild(container);
        this.groupView.element.classList.add('dragged-over');
        this._register(toDisposable(() => {
            container.remove();
            this.groupView.element.classList.remove('dragged-over');
        }));
        // Overlay
        this.overlay = $('.editor-group-overlay-indicator');
        container.appendChild(this.overlay);
        if (this.enableDropIntoEditor) {
            this.dropIntoPromptElement = renderFormattedText(localize('dropIntoEditorPrompt', 'Hold __{0}__ to drop into editor', isMacintosh ? '⇧' : 'Shift'), {});
            this.dropIntoPromptElement.classList.add('editor-group-overlay-drop-into-prompt');
            this.overlay.appendChild(this.dropIntoPromptElement);
        }
        // Overlay Event Handling
        this.registerListeners(container);
        // Styles
        this.updateStyles();
    }
    updateStyles() {
        const overlay = assertIsDefined(this.overlay);
        // Overlay drop background
        overlay.style.backgroundColor = this.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND) || '';
        // Overlay contrast border (if any)
        const activeContrastBorderColor = this.getColor(activeContrastBorder);
        overlay.style.outlineColor = activeContrastBorderColor || '';
        overlay.style.outlineOffset = activeContrastBorderColor ? '-2px' : '';
        overlay.style.outlineStyle = activeContrastBorderColor ? 'dashed' : '';
        overlay.style.outlineWidth = activeContrastBorderColor ? '2px' : '';
        if (this.dropIntoPromptElement) {
            this.dropIntoPromptElement.style.backgroundColor =
                this.getColor(EDITOR_DROP_INTO_PROMPT_BACKGROUND) ?? '';
            this.dropIntoPromptElement.style.color =
                this.getColor(EDITOR_DROP_INTO_PROMPT_FOREGROUND) ?? '';
            const borderColor = this.getColor(EDITOR_DROP_INTO_PROMPT_BORDER);
            if (borderColor) {
                this.dropIntoPromptElement.style.borderWidth = '1px';
                this.dropIntoPromptElement.style.borderStyle = 'solid';
                this.dropIntoPromptElement.style.borderColor = borderColor;
            }
            else {
                this.dropIntoPromptElement.style.borderWidth = '0';
            }
        }
    }
    registerListeners(container) {
        this._register(new DragAndDropObserver(container, {
            onDragOver: (e) => {
                if (this.enableDropIntoEditor && isDragIntoEditorEvent(e)) {
                    this.dispose();
                    return;
                }
                const isDraggingGroup = this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype);
                const isDraggingEditor = this.editorTransfer.hasData(DraggedEditorIdentifier.prototype);
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!isDraggingEditor && !isDraggingGroup && e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
                // Find out if operation is valid
                let isCopy = true;
                if (isDraggingGroup) {
                    isCopy = this.isCopyOperation(e);
                }
                else if (isDraggingEditor) {
                    const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
                    if (Array.isArray(data) && data.length > 0) {
                        isCopy = this.isCopyOperation(e, data[0].identifier);
                    }
                }
                if (!isCopy) {
                    const sourceGroupView = this.findSourceGroupView();
                    if (sourceGroupView === this.groupView) {
                        if (isDraggingGroup || (isDraggingEditor && sourceGroupView.count < 2)) {
                            this.hideOverlay();
                            return; // do not allow to drop group/editor on itself if this results in an empty group
                        }
                    }
                }
                // Position overlay and conditionally enable or disable
                // editor group splitting support based on setting and
                // keymodifiers used.
                let splitOnDragAndDrop = !!this.editorGroupService.partOptions.splitOnDragAndDrop;
                if (this.isToggleSplitOperation(e)) {
                    splitOnDragAndDrop = !splitOnDragAndDrop;
                }
                this.positionOverlay(e.offsetX, e.offsetY, isDraggingGroup, splitOnDragAndDrop);
                // Make sure to stop any running cleanup scheduler to remove the overlay
                if (this.cleanupOverlayScheduler.isScheduled()) {
                    this.cleanupOverlayScheduler.cancel();
                }
            },
            onDragLeave: (e) => this.dispose(),
            onDragEnd: (e) => this.dispose(),
            onDrop: (e) => {
                EventHelper.stop(e, true);
                // Dispose overlay
                this.dispose();
                // Handle drop if we have a valid operation
                if (this.currentDropOperation) {
                    this.handleDrop(e, this.currentDropOperation.splitDirection);
                }
            },
        }));
        this._register(addDisposableListener(container, EventType.MOUSE_OVER, () => {
            // Under some circumstances we have seen reports where the drop overlay is not being
            // cleaned up and as such the editor area remains under the overlay so that you cannot
            // type into the editor anymore. This seems related to using VMs and DND via host and
            // guest OS, though some users also saw it without VMs.
            // To protect against this issue we always destroy the overlay as soon as we detect a
            // mouse event over it. The delay is used to guarantee we are not interfering with the
            // actual DROP event that can also trigger a mouse over event.
            if (!this.cleanupOverlayScheduler.isScheduled()) {
                this.cleanupOverlayScheduler.schedule();
            }
        }));
    }
    isDropIntoActiveEditorEnabled() {
        return !!this.groupView.activeEditor?.hasCapability(128 /* EditorInputCapabilities.CanDropIntoEditor */);
    }
    findSourceGroupView() {
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                return this.editorGroupService.getGroup(data[0].identifier);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                return this.editorGroupService.getGroup(data[0].identifier.groupId);
            }
        }
        return undefined;
    }
    async handleDrop(event, splitDirection) {
        // Determine target group
        const ensureTargetGroup = () => {
            let targetGroup;
            if (typeof splitDirection === 'number') {
                targetGroup = this.editorGroupService.addGroup(this.groupView, splitDirection);
            }
            else {
                targetGroup = this.groupView;
            }
            return targetGroup;
        };
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorGroupService.getGroup(data[0].identifier);
                if (sourceGroup) {
                    if (typeof splitDirection !== 'number' && sourceGroup === this.groupView) {
                        return;
                    }
                    // Split to new group
                    let targetGroup;
                    if (typeof splitDirection === 'number') {
                        if (this.isCopyOperation(event)) {
                            targetGroup = this.editorGroupService.copyGroup(sourceGroup, this.groupView, splitDirection);
                        }
                        else {
                            targetGroup = this.editorGroupService.moveGroup(sourceGroup, this.groupView, splitDirection);
                        }
                    }
                    // Merge into existing group
                    else {
                        let mergeGroupOptions = undefined;
                        if (this.isCopyOperation(event)) {
                            mergeGroupOptions = { mode: 0 /* MergeGroupMode.COPY_EDITORS */ };
                        }
                        this.editorGroupService.mergeGroup(sourceGroup, this.groupView, mergeGroupOptions);
                    }
                    if (targetGroup) {
                        this.editorGroupService.activateGroup(targetGroup);
                    }
                }
                this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const draggedEditors = data;
                const firstDraggedEditor = data[0].identifier;
                const sourceGroup = this.editorGroupService.getGroup(firstDraggedEditor.groupId);
                if (sourceGroup) {
                    const copyEditor = this.isCopyOperation(event, firstDraggedEditor);
                    let targetGroup = undefined;
                    // Optimization: if we move the last editor of an editor group
                    // and we are configured to close empty editor groups, we can
                    // rather move the entire editor group according to the direction
                    if (this.editorGroupService.partOptions.closeEmptyGroups &&
                        sourceGroup.count === 1 &&
                        typeof splitDirection === 'number' &&
                        !copyEditor) {
                        targetGroup = this.editorGroupService.moveGroup(sourceGroup, this.groupView, splitDirection);
                    }
                    // In any other case do a normal move/copy operation
                    else {
                        targetGroup = ensureTargetGroup();
                        if (sourceGroup === targetGroup) {
                            return;
                        }
                        const editorsWithOptions = prepareMoveCopyEditors(this.groupView, draggedEditors.map((editor) => editor.identifier.editor));
                        if (!copyEditor) {
                            sourceGroup.moveEditors(editorsWithOptions, targetGroup);
                        }
                        else {
                            sourceGroup.copyEditors(editorsWithOptions, targetGroup);
                        }
                    }
                    // Ensure target has focus
                    targetGroup.focus();
                }
                this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
            }
        }
        // Check for tree items
        else if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const editors = [];
                for (const id of data) {
                    const dataTransferItem = await this.treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (dataTransferItem) {
                        const treeDropData = await extractTreeDropData(dataTransferItem);
                        editors.push(...treeDropData.map((editor) => ({
                            ...editor,
                            options: { ...editor.options, pinned: true },
                        })));
                    }
                }
                if (editors.length) {
                    this.editorService.openEditors(editors, ensureTargetGroup(), { validateTrust: true });
                }
            }
            this.treeItemsTransfer.clearData(DraggedTreeItemsIdentifier.prototype);
        }
        // Check for URI transfer
        else {
            const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, {
                allowWorkspaceOpen: !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace()),
            });
            dropHandler.handleDrop(event, getWindow(this.groupView.element), () => ensureTargetGroup(), (targetGroup) => targetGroup?.focus());
        }
    }
    isCopyOperation(e, draggedEditor) {
        if (draggedEditor?.editor.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            return false; // Singleton editors cannot be split
        }
        return (e.ctrlKey && !isMacintosh) || (e.altKey && isMacintosh);
    }
    isToggleSplitOperation(e) {
        return (e.altKey && !isMacintosh) || (e.shiftKey && isMacintosh);
    }
    positionOverlay(mousePosX, mousePosY, isDraggingGroup, enableSplitting) {
        const preferSplitVertically = this.editorGroupService.partOptions.openSideBySideDirection === 'right';
        const editorControlWidth = this.groupView.element.clientWidth;
        const editorControlHeight = this.groupView.element.clientHeight - this.getOverlayOffsetHeight();
        let edgeWidthThresholdFactor;
        let edgeHeightThresholdFactor;
        if (enableSplitting) {
            if (isDraggingGroup) {
                edgeWidthThresholdFactor = preferSplitVertically ? 0.3 : 0.1; // give larger threshold when dragging group depending on preferred split direction
            }
            else {
                edgeWidthThresholdFactor = 0.1; // 10% threshold to split if dragging editors
            }
            if (isDraggingGroup) {
                edgeHeightThresholdFactor = preferSplitVertically ? 0.1 : 0.3; // give larger threshold when dragging group depending on preferred split direction
            }
            else {
                edgeHeightThresholdFactor = 0.1; // 10% threshold to split if dragging editors
            }
        }
        else {
            edgeWidthThresholdFactor = 0;
            edgeHeightThresholdFactor = 0;
        }
        const edgeWidthThreshold = editorControlWidth * edgeWidthThresholdFactor;
        const edgeHeightThreshold = editorControlHeight * edgeHeightThresholdFactor;
        const splitWidthThreshold = editorControlWidth / 3; // offer to split left/right at 33%
        const splitHeightThreshold = editorControlHeight / 3; // offer to split up/down at 33%
        // No split if mouse is above certain threshold in the center of the view
        let splitDirection;
        if (mousePosX > edgeWidthThreshold &&
            mousePosX < editorControlWidth - edgeWidthThreshold &&
            mousePosY > edgeHeightThreshold &&
            mousePosY < editorControlHeight - edgeHeightThreshold) {
            splitDirection = undefined;
        }
        // Offer to split otherwise
        else {
            // User prefers to split vertically: offer a larger hitzone
            // for this direction like so:
            // ----------------------------------------------
            // |		|		SPLIT UP		|			|
            // | SPLIT 	|-----------------------|	SPLIT	|
            // |		|		  MERGE			|			|
            // | LEFT	|-----------------------|	RIGHT	|
            // |		|		SPLIT DOWN		|			|
            // ----------------------------------------------
            if (preferSplitVertically) {
                if (mousePosX < splitWidthThreshold) {
                    splitDirection = 2 /* GroupDirection.LEFT */;
                }
                else if (mousePosX > splitWidthThreshold * 2) {
                    splitDirection = 3 /* GroupDirection.RIGHT */;
                }
                else if (mousePosY < editorControlHeight / 2) {
                    splitDirection = 0 /* GroupDirection.UP */;
                }
                else {
                    splitDirection = 1 /* GroupDirection.DOWN */;
                }
            }
            // User prefers to split horizontally: offer a larger hitzone
            // for this direction like so:
            // ----------------------------------------------
            // |				SPLIT UP					|
            // |--------------------------------------------|
            // |  SPLIT LEFT  |	   MERGE	|  SPLIT RIGHT  |
            // |--------------------------------------------|
            // |				SPLIT DOWN					|
            // ----------------------------------------------
            else {
                if (mousePosY < splitHeightThreshold) {
                    splitDirection = 0 /* GroupDirection.UP */;
                }
                else if (mousePosY > splitHeightThreshold * 2) {
                    splitDirection = 1 /* GroupDirection.DOWN */;
                }
                else if (mousePosX < editorControlWidth / 2) {
                    splitDirection = 2 /* GroupDirection.LEFT */;
                }
                else {
                    splitDirection = 3 /* GroupDirection.RIGHT */;
                }
            }
        }
        // Draw overlay based on split direction
        switch (splitDirection) {
            case 0 /* GroupDirection.UP */:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '50%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 1 /* GroupDirection.DOWN */:
                this.doPositionOverlay({ top: '50%', left: '0', width: '100%', height: '50%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 2 /* GroupDirection.LEFT */:
                this.doPositionOverlay({ top: '0', left: '0', width: '50%', height: '100%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 3 /* GroupDirection.RIGHT */:
                this.doPositionOverlay({ top: '0', left: '50%', width: '50%', height: '100%' });
                this.toggleDropIntoPrompt(false);
                break;
            default:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '100%' });
                this.toggleDropIntoPrompt(true);
        }
        // Make sure the overlay is visible now
        const overlay = assertIsDefined(this.overlay);
        overlay.style.opacity = '1';
        // Enable transition after a timeout to prevent initial animation
        setTimeout(() => overlay.classList.add('overlay-move-transition'), 0);
        // Remember as current split direction
        this.currentDropOperation = { splitDirection };
    }
    doPositionOverlay(options) {
        const [container, overlay] = assertAllDefined(this.container, this.overlay);
        // Container
        const offsetHeight = this.getOverlayOffsetHeight();
        if (offsetHeight) {
            container.style.height = `calc(100% - ${offsetHeight}px)`;
        }
        else {
            container.style.height = '100%';
        }
        // Overlay
        overlay.style.top = options.top;
        overlay.style.left = options.left;
        overlay.style.width = options.width;
        overlay.style.height = options.height;
    }
    getOverlayOffsetHeight() {
        // With tabs and opened editors: use the area below tabs as drop target
        if (!this.groupView.isEmpty && this.editorGroupService.partOptions.showTabs === 'multiple') {
            return this.groupView.titleHeight.offset;
        }
        // Without tabs or empty group: use entire editor area as drop target
        return 0;
    }
    hideOverlay() {
        const overlay = assertIsDefined(this.overlay);
        // Reset overlay
        this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '100%' });
        overlay.style.opacity = '0';
        overlay.classList.remove('overlay-move-transition');
        // Reset current operation
        this.currentDropOperation = undefined;
    }
    toggleDropIntoPrompt(showing) {
        if (!this.dropIntoPromptElement) {
            return;
        }
        this.dropIntoPromptElement.style.opacity = showing ? '1' : '0';
    }
    contains(element) {
        return element === this.container || element === this.overlay;
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
};
DropOverlay = DropOverlay_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, IEditorGroupsService),
    __param(6, ITreeViewsDnDService),
    __param(7, IWorkspaceContextService)
], DropOverlay);
let EditorDropTarget = class EditorDropTarget extends Themable {
    constructor(container, delegate, editorGroupService, themeService, configurationService, instantiationService) {
        super(themeService);
        this.container = container;
        this.delegate = delegate;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.counter = 0;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.registerListeners();
    }
    get overlay() {
        if (this._overlay && !this._overlay.disposed) {
            return this._overlay;
        }
        return undefined;
    }
    registerListeners() {
        this._register(addDisposableListener(this.container, EventType.DRAG_ENTER, (e) => this.onDragEnter(e)));
        this._register(addDisposableListener(this.container, EventType.DRAG_LEAVE, () => this.onDragLeave()));
        for (const target of [this.container, getWindow(this.container)]) {
            this._register(addDisposableListener(target, EventType.DRAG_END, () => this.onDragEnd()));
        }
    }
    onDragEnter(event) {
        if (isDropIntoEditorEnabledGlobally(this.configurationService) &&
            isDragIntoEditorEvent(event)) {
            return;
        }
        this.counter++;
        // Validate transfer
        if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype) &&
            !this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype) &&
            event.dataTransfer) {
            const dndContributions = Registry.as(DragAndDropExtensions.DragAndDropContribution).getAll();
            const dndContributionKeys = Array.from(dndContributions).map((e) => e.dataFormatKey);
            if (!containsDragType(event, DataTransfers.FILES, CodeDataTransfers.FILES, DataTransfers.RESOURCES, CodeDataTransfers.EDITORS, ...dndContributionKeys)) {
                // see https://github.com/microsoft/vscode/issues/25789
                event.dataTransfer.dropEffect = 'none';
                return; // unsupported transfer
            }
        }
        // Signal DND start
        this.updateContainer(true);
        const target = event.target;
        if (target) {
            // Somehow we managed to move the mouse quickly out of the current overlay, so destroy it
            if (this.overlay && !this.overlay.contains(target)) {
                this.disposeOverlay();
            }
            // Create overlay over target
            if (!this.overlay) {
                const targetGroupView = this.findTargetGroupView(target);
                if (targetGroupView) {
                    this._overlay = this.instantiationService.createInstance(DropOverlay, targetGroupView);
                }
            }
        }
    }
    onDragLeave() {
        this.counter--;
        if (this.counter === 0) {
            this.updateContainer(false);
        }
    }
    onDragEnd() {
        this.counter = 0;
        this.updateContainer(false);
        this.disposeOverlay();
    }
    findTargetGroupView(child) {
        const groups = this.editorGroupService.groups;
        return groups.find((groupView) => isAncestor(child, groupView.element) || this.delegate.containsGroup?.(groupView));
    }
    updateContainer(isDraggedOver) {
        this.container.classList.toggle('dragged-over', isDraggedOver);
    }
    dispose() {
        super.dispose();
        this.disposeOverlay();
    }
    disposeOverlay() {
        if (this.overlay) {
            this.overlay.dispose();
            this._overlay = undefined;
        }
    }
};
EditorDropTarget = __decorate([
    __param(2, IEditorGroupsService),
    __param(3, IThemeService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService)
], EditorDropTarget);
export { EditorDropTarget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRHJvcFRhcmdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JEcm9wVGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsV0FBVyxFQUNYLFNBQVMsRUFDVCxTQUFTLEVBQ1QsVUFBVSxHQUNWLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFB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