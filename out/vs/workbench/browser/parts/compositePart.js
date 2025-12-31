/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/compositepart.css';
import { localize } from '../../../nls.js';
import { defaultGenerator } from '../../../base/common/idGenerator.js';
import { dispose, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { prepareActions, } from '../../../base/browser/ui/actionbar/actionbar.js';
import { ProgressBar } from '../../../base/browser/ui/progressbar/progressbar.js';
import { Part } from '../part.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IEditorProgressService, } from '../../../platform/progress/common/progress.js';
import { Dimension, append, $, hide, show } from '../../../base/browser/dom.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { createActionViewItem } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { AbstractProgressScope, ScopedProgressIndicator, } from '../../services/progress/browser/progressIndicator.js';
import { WorkbenchToolBar } from '../../../platform/actions/browser/toolbar.js';
import { defaultProgressBarStyles } from '../../../platform/theme/browser/defaultStyles.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate, } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class CompositePart extends Part {
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, registry, activeCompositeSettingsKey, defaultCompositeId, nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, id, options) {
        super(id, options, themeService, storageService, layoutService);
        this.notificationService = notificationService;
        this.storageService = storageService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.registry = registry;
        this.activeCompositeSettingsKey = activeCompositeSettingsKey;
        this.defaultCompositeId = defaultCompositeId;
        this.nameForTelemetry = nameForTelemetry;
        this.compositeCSSClass = compositeCSSClass;
        this.titleForegroundColor = titleForegroundColor;
        this.titleBorderColor = titleBorderColor;
        this.onDidCompositeOpen = this._register(new Emitter());
        this.onDidCompositeClose = this._register(new Emitter());
        this.mapCompositeToCompositeContainer = new Map();
        this.mapActionsBindingToComposite = new Map();
        this.instantiatedCompositeItems = new Map();
        this.actionsListener = this._register(new MutableDisposable());
        this.lastActiveCompositeId = storageService.get(activeCompositeSettingsKey, 1 /* StorageScope.WORKSPACE */, this.defaultCompositeId);
        this.toolbarHoverDelegate = this._register(createInstantHoverDelegate());
    }
    openComposite(id, focus) {
        // Check if composite already visible and just focus in that case
        if (this.activeComposite?.getId() === id) {
            if (focus) {
                this.activeComposite.focus();
            }
            // Fullfill promise with composite that is being opened
            return this.activeComposite;
        }
        // We cannot open the composite if we have not been created yet
        if (!this.element) {
            return;
        }
        // Open
        return this.doOpenComposite(id, focus);
    }
    doOpenComposite(id, focus = false) {
        // Use a generated token to avoid race conditions from long running promises
        const currentCompositeOpenToken = defaultGenerator.nextId();
        this.currentCompositeOpenToken = currentCompositeOpenToken;
        // Hide current
        if (this.activeComposite) {
            this.hideActiveComposite();
        }
        // Update Title
        this.updateTitle(id);
        // Create composite
        const composite = this.createComposite(id, true);
        // Check if another composite opened meanwhile and return in that case
        if (this.currentCompositeOpenToken !== currentCompositeOpenToken ||
            (this.activeComposite && this.activeComposite.getId() !== composite.getId())) {
            return undefined;
        }
        // Check if composite already visible and just focus in that case
        if (this.activeComposite?.getId() === composite.getId()) {
            if (focus) {
                composite.focus();
            }
            this.onDidCompositeOpen.fire({ composite, focus });
            return composite;
        }
        // Show Composite and Focus
        this.showComposite(composite);
        if (focus) {
            composite.focus();
        }
        // Return with the composite that is being opened
        if (composite) {
            this.onDidCompositeOpen.fire({ composite, focus });
        }
        return composite;
    }
    createComposite(id, isActive) {
        // Check if composite is already created
        const compositeItem = this.instantiatedCompositeItems.get(id);
        if (compositeItem) {
            return compositeItem.composite;
        }
        // Instantiate composite from registry otherwise
        const compositeDescriptor = this.registry.getComposite(id);
        if (compositeDescriptor) {
            const that = this;
            const compositeProgressIndicator = new ScopedProgressIndicator(assertIsDefined(this.progressBar), new (class extends AbstractProgressScope {
                constructor() {
                    super(compositeDescriptor.id, !!isActive);
                    this._register(that.onDidCompositeOpen.event((e) => this.onScopeOpened(e.composite.getId())));
                    this._register(that.onDidCompositeClose.event((e) => this.onScopeClosed(e.getId())));
                }
            })());
            const compositeInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IEditorProgressService, compositeProgressIndicator])));
            const composite = compositeDescriptor.instantiate(compositeInstantiationService);
            const disposable = new DisposableStore();
            // Remember as Instantiated
            this.instantiatedCompositeItems.set(id, {
                composite,
                disposable,
                progress: compositeProgressIndicator,
            });
            // Register to title area update events from the composite
            disposable.add(composite.onTitleAreaUpdate(() => this.onTitleAreaUpdate(composite.getId()), this));
            disposable.add(compositeInstantiationService);
            return composite;
        }
        throw new Error(`Unable to find composite with id ${id}`);
    }
    showComposite(composite) {
        // Remember Composite
        this.activeComposite = composite;
        // Store in preferences
        const id = this.activeComposite.getId();
        if (id !== this.defaultCompositeId) {
            this.storageService.store(this.activeCompositeSettingsKey, id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(this.activeCompositeSettingsKey, 1 /* StorageScope.WORKSPACE */);
        }
        // Remember
        this.lastActiveCompositeId = this.activeComposite.getId();
        // Composites created for the first time
        let compositeContainer = this.mapCompositeToCompositeContainer.get(composite.getId());
        if (!compositeContainer) {
            // Build Container off-DOM
            compositeContainer = $('.composite');
            compositeContainer.classList.add(...this.compositeCSSClass.split(' '));
            compositeContainer.id = composite.getId();
            composite.create(compositeContainer);
            composite.updateStyles();
            // Remember composite container
            this.mapCompositeToCompositeContainer.set(composite.getId(), compositeContainer);
        }
        // Fill Content and Actions
        // Make sure that the user meanwhile did not open another composite or closed the part containing the composite
        if (!this.activeComposite || composite.getId() !== this.activeComposite.getId()) {
            return undefined;
        }
        // Take Composite on-DOM and show
        const contentArea = this.getContentArea();
        contentArea?.appendChild(compositeContainer);
        show(compositeContainer);
        // Setup action runner
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.actionRunner = composite.getActionRunner();
        // Update title with composite title if it differs from descriptor
        const descriptor = this.registry.getComposite(composite.getId());
        if (descriptor && descriptor.name !== composite.getTitle()) {
            this.updateTitle(composite.getId(), composite.getTitle());
        }
        // Handle Composite Actions
        let actionsBinding = this.mapActionsBindingToComposite.get(composite.getId());
        if (!actionsBinding) {
            actionsBinding = this.collectCompositeActions(composite);
            this.mapActionsBindingToComposite.set(composite.getId(), actionsBinding);
        }
        actionsBinding();
        // Action Run Handling
        this.actionsListener.value = toolBar.actionRunner.onDidRun((e) => {
            // Check for Error
            if (e.error && !isCancellationError(e.error)) {
                this.notificationService.error(e.error);
            }
        });
        // Indicate to composite that it is now visible
        composite.setVisible(true);
        // Make sure that the user meanwhile did not open another composite or closed the part containing the composite
        if (!this.activeComposite || composite.getId() !== this.activeComposite.getId()) {
            return;
        }
        // Make sure the composite is layed out
        if (this.contentAreaSize) {
            composite.layout(this.contentAreaSize);
        }
        // Make sure boundary sashes are propagated
        if (this.boundarySashes) {
            composite.setBoundarySashes(this.boundarySashes);
        }
    }
    onTitleAreaUpdate(compositeId) {
        // Title
        const composite = this.instantiatedCompositeItems.get(compositeId);
        if (composite) {
            this.updateTitle(compositeId, composite.composite.getTitle());
        }
        // Active Composite
        if (this.activeComposite?.getId() === compositeId) {
            // Actions
            const actionsBinding = this.collectCompositeActions(this.activeComposite);
            this.mapActionsBindingToComposite.set(this.activeComposite.getId(), actionsBinding);
            actionsBinding();
        }
        // Otherwise invalidate actions binding for next time when the composite becomes visible
        else {
            this.mapActionsBindingToComposite.delete(compositeId);
        }
    }
    updateTitle(compositeId, compositeTitle) {
        const compositeDescriptor = this.registry.getComposite(compositeId);
        if (!compositeDescriptor || !this.titleLabel) {
            return;
        }
        if (!compositeTitle) {
            compositeTitle = compositeDescriptor.name;
        }
        const keybinding = this.keybindingService.lookupKeybinding(compositeId);
        this.titleLabel.updateTitle(compositeId, compositeTitle, keybinding?.getLabel() ?? undefined);
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.setAriaLabel(localize('ariaCompositeToolbarLabel', '{0} actions', compositeTitle));
    }
    collectCompositeActions(composite) {
        // From Composite
        const menuIds = composite?.getMenuIds();
        const primaryActions = composite?.getActions().slice(0) || [];
        const secondaryActions = composite?.getSecondaryActions().slice(0) || [];
        // Update context
        const toolBar = assertIsDefined(this.toolBar);
        toolBar.context = this.actionsContextProvider();
        // Return fn to set into toolbar
        return () => toolBar.setActions(prepareActions(primaryActions), prepareActions(secondaryActions), menuIds);
    }
    getActiveComposite() {
        return this.activeComposite;
    }
    getLastActiveCompositeId() {
        return this.lastActiveCompositeId;
    }
    hideActiveComposite() {
        if (!this.activeComposite) {
            return undefined; // Nothing to do
        }
        const composite = this.activeComposite;
        this.activeComposite = undefined;
        const compositeContainer = this.mapCompositeToCompositeContainer.get(composite.getId());
        // Indicate to Composite
        composite.setVisible(false);
        // Take Container Off-DOM and hide
        if (compositeContainer) {
            compositeContainer.remove();
            hide(compositeContainer);
        }
        // Clear any running Progress
        this.progressBar?.stop().hide();
        // Empty Actions
        if (this.toolBar) {
            this.collectCompositeActions()();
        }
        this.onDidCompositeClose.fire(composite);
        return composite;
    }
    createTitleArea(parent) {
        // Title Area Container
        const titleArea = append(parent, $('.composite'));
        titleArea.classList.add('title');
        // Left Title Label
        this.titleLabel = this.createTitleLabel(titleArea);
        // Right Actions Container
        const titleActionsContainer = append(titleArea, $('.title-actions'));
        // Toolbar
        this.toolBar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, titleActionsContainer, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            anchorAlignmentProvider: () => this.getTitleAreaDropDownAnchorAlignment(),
            toggleMenuTitle: localize('viewsAndMoreActions', 'Views and More Actions...'),
            telemetrySource: this.nameForTelemetry,
            hoverDelegate: this.toolbarHoverDelegate,
        }));
        this.collectCompositeActions()();
        return titleArea;
    }
    createTitleLabel(parent) {
        const titleContainer = append(parent, $('.title-label'));
        const titleLabel = append(titleContainer, $('h2'));
        this.titleLabelElement = titleLabel;
        const hover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), titleLabel, ''));
        const $this = this;
        return {
            updateTitle: (id, title, keybinding) => {
                // The title label is shared for all composites in the base CompositePart
                if (!this.activeComposite || this.activeComposite.getId() === id) {
                    titleLabel.innerText = title;
                    hover.update(keybinding ? localize('titleTooltip', '{0} ({1})', title, keybinding) : title);
                }
            },
            updateStyles: () => {
                titleLabel.style.color = $this.titleForegroundColor
                    ? $this.getColor($this.titleForegroundColor) || ''
                    : '';
                const borderColor = $this.titleBorderColor
                    ? $this.getColor($this.titleBorderColor)
                    : undefined;
                parent.style.borderBottom = borderColor ? `1px solid ${borderColor}` : '';
            },
        };
    }
    createHeaderArea() {
        return $('.composite');
    }
    createFooterArea() {
        return $('.composite');
    }
    updateStyles() {
        super.updateStyles();
        // Forward to title label
        const titleLabel = assertIsDefined(this.titleLabel);
        titleLabel.updateStyles();
    }
    actionViewItemProvider(action, options) {
        // Check Active Composite
        if (this.activeComposite) {
            return this.activeComposite.getActionViewItem(action, options);
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    actionsContextProvider() {
        // Check Active Composite
        if (this.activeComposite) {
            return this.activeComposite.getActionsContext();
        }
        return null;
    }
    createContentArea(parent) {
        const contentContainer = append(parent, $('.content'));
        this.progressBar = this._register(new ProgressBar(contentContainer, defaultProgressBarStyles));
        this.progressBar.hide();
        return contentContainer;
    }
    getProgressIndicator(id) {
        const compositeItem = this.instantiatedCompositeItems.get(id);
        return compositeItem ? compositeItem.progress : undefined;
    }
    getTitleAreaDropDownAnchorAlignment() {
        return 1 /* AnchorAlignment.RIGHT */;
    }
    layout(width, height, top, left) {
        super.layout(width, height, top, left);
        // Layout contents
        this.contentAreaSize = Dimension.lift(super.layoutContents(width, height).contentSize);
        // Layout composite
        this.activeComposite?.layout(this.contentAreaSize);
    }
    setBoundarySashes(sashes) {
        this.boundarySashes = sashes;
        this.activeComposite?.setBoundarySashes(sashes);
    }
    removeComposite(compositeId) {
        if (this.activeComposite?.getId() === compositeId) {
            return false; // do not remove active composite
        }
        this.mapCompositeToCompositeContainer.delete(compositeId);
        this.mapActionsBindingToComposite.delete(compositeId);
        const compositeItem = this.instantiatedCompositeItems.get(compositeId);
        if (compositeItem) {
            compositeItem.composite.dispose();
            dispose(compositeItem.disposable);
            this.instantiatedCompositeItems.delete(compositeId);
        }
        return true;
    }
    dispose() {
        this.mapCompositeToCompositeContainer.clear();
        this.mapActionsBindingToComposite.clear();
        this.instantiatedCompositeItems.forEach((compositeItem) => {
            compositeItem.composite.dispose();
            dispose(compositeItem.disposable);
        });
        this.instantiatedCompositeItems.clear();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2NvbXBvc2l0ZVBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUVOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BFLE9BQU8sRUFHTixjQUFjLEdBQ2QsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFakYsT0FBTyxFQUFFLElBQUksRUFBZ0IsTUFBTSxZQUFZLENBQUE7QUFXL0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLCtDQUErQyxDQUFBO0FBSXRELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ25HLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsdUJBQXVCLEdBQ3ZCLE1BQU0sc0RB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