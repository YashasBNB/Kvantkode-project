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
import { localize } from '../../../nls.js';
import { Action, Separator } from '../../../base/common/actions.js';
import { $, addDisposableListener, append, clearNode, EventHelper, EventType, getDomNodePagePosition, hide, show, } from '../../../base/browser/dom.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { toDisposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { NumberBadge, ProgressBadge, IconBadge, } from '../../services/activity/common/activity.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { DelayedDragHandler } from '../../../base/browser/dnd.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { CompositeDragAndDropObserver, toggleDropEffect, } from '../dnd.js';
import { BaseActionViewItem, } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { badgeBackground, badgeForeground, contrastBorder, } from '../../../platform/theme/common/colorRegistry.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { createConfigureKeybindingAction } from '../../../platform/actions/common/menuService.js';
export class CompositeBarAction extends Action {
    constructor(item) {
        super(item.id, item.name, item.classNames?.join(' '), true);
        this.item = item;
        this._onDidChangeCompositeBarActionItem = this._register(new Emitter());
        this.onDidChangeCompositeBarActionItem = this._onDidChangeCompositeBarActionItem.event;
        this._onDidChangeActivity = this._register(new Emitter());
        this.onDidChangeActivity = this._onDidChangeActivity.event;
        this._activities = [];
    }
    get compositeBarActionItem() {
        return this.item;
    }
    set compositeBarActionItem(item) {
        this._label = item.name;
        this.item = item;
        this._onDidChangeCompositeBarActionItem.fire(this);
    }
    get activities() {
        return this._activities;
    }
    set activities(activities) {
        this._activities = activities;
        this._onDidChangeActivity.fire(activities);
    }
    activate() {
        if (!this.checked) {
            this._setChecked(true);
        }
    }
    deactivate() {
        if (this.checked) {
            this._setChecked(false);
        }
    }
}
let CompositeBarActionViewItem = class CompositeBarActionViewItem extends BaseActionViewItem {
    constructor(action, options, badgesEnabled, themeService, hoverService, configurationService, keybindingService) {
        super(null, action, options);
        this.badgesEnabled = badgesEnabled;
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.options = options;
        this._register(this.themeService.onDidColorThemeChange(this.onThemeChange, this));
        this._register(action.onDidChangeCompositeBarActionItem(() => this.update()));
        this._register(Event.filter(keybindingService.onDidUpdateKeybindings, () => this.keybindingLabel !== this.computeKeybindingLabel())(() => this.updateTitle()));
        this._register(action.onDidChangeActivity(() => this.updateActivity()));
    }
    get compositeBarActionItem() {
        return this._action.compositeBarActionItem;
    }
    updateStyles() {
        const theme = this.themeService.getColorTheme();
        const colors = this.options.colors(theme);
        if (this.label) {
            if (this.options.icon) {
                const foreground = this._action.checked
                    ? colors.activeForegroundColor
                    : colors.inactiveForegroundColor;
                if (this.compositeBarActionItem.iconUrl) {
                    // Apply background color to activity bar item provided with iconUrls
                    this.label.style.backgroundColor = foreground ? foreground.toString() : '';
                    this.label.style.color = '';
                }
                else {
                    // Apply foreground color to activity bar items provided with codicons
                    this.label.style.color = foreground ? foreground.toString() : '';
                    this.label.style.backgroundColor = '';
                }
            }
            else {
                const foreground = this._action.checked
                    ? colors.activeForegroundColor
                    : colors.inactiveForegroundColor;
                const borderBottomColor = this._action.checked ? colors.activeBorderBottomColor : null;
                this.label.style.color = foreground ? foreground.toString() : '';
                this.label.style.borderBottomColor = borderBottomColor ? borderBottomColor.toString() : '';
            }
            this.container.style.setProperty('--insert-border-color', colors.dragAndDropBorder ? colors.dragAndDropBorder.toString() : '');
        }
        // Badge
        if (this.badgeContent) {
            const badgeStyles = this.getActivities()[0]?.badge.getColors(theme);
            const badgeFg = badgeStyles?.badgeForeground ?? colors.badgeForeground ?? theme.getColor(badgeForeground);
            const badgeBg = badgeStyles?.badgeBackground ?? colors.badgeBackground ?? theme.getColor(badgeBackground);
            const contrastBorderColor = badgeStyles?.badgeBorder ?? theme.getColor(contrastBorder);
            this.badgeContent.style.color = badgeFg ? badgeFg.toString() : '';
            this.badgeContent.style.backgroundColor = badgeBg ? badgeBg.toString() : '';
            this.badgeContent.style.borderStyle =
                contrastBorderColor && !this.options.compact ? 'solid' : '';
            this.badgeContent.style.borderWidth = contrastBorderColor ? '1px' : '';
            this.badgeContent.style.borderColor = contrastBorderColor
                ? contrastBorderColor.toString()
                : '';
        }
    }
    render(container) {
        super.render(container);
        this.container = container;
        if (this.options.icon) {
            this.container.classList.add('icon');
        }
        if (this.options.hasPopup) {
            this.container.setAttribute('role', 'button');
            this.container.setAttribute('aria-haspopup', 'true');
        }
        else {
            this.container.setAttribute('role', 'tab');
        }
        // Try hard to prevent keyboard only focus feedback when using mouse
        this._register(addDisposableListener(this.container, EventType.MOUSE_DOWN, () => {
            this.container.classList.add('clicked');
        }));
        this._register(addDisposableListener(this.container, EventType.MOUSE_UP, () => {
            if (this.mouseUpTimeout) {
                clearTimeout(this.mouseUpTimeout);
            }
            this.mouseUpTimeout = setTimeout(() => {
                this.container.classList.remove('clicked');
            }, 800); // delayed to prevent focus feedback from showing on mouse up
        }));
        this._register(this.hoverService.setupDelayedHover(this.container, () => ({
            content: this.computeTitle(),
            position: {
                hoverPosition: this.options.hoverOptions.position(),
            },
            persistence: {
                hideOnKeyDown: true,
            },
            appearance: {
                showPointer: true,
                compact: true,
            },
        }), { groupId: 'composite-bar-actions' }));
        // Label
        this.label = append(container, $('a'));
        // Badge
        this.badge = append(container, $('.badge'));
        this.badgeContent = append(this.badge, $('.badge-content'));
        // pane composite bar active border + background
        append(container, $('.active-item-indicator'));
        hide(this.badge);
        this.update();
        this.updateStyles();
        this.updateTitle();
    }
    onThemeChange(theme) {
        this.updateStyles();
    }
    update() {
        this.updateLabel();
        this.updateActivity();
        this.updateTitle();
        this.updateStyles();
    }
    getActivities() {
        if (this._action instanceof CompositeBarAction) {
            return this._action.activities;
        }
        return [];
    }
    updateActivity() {
        if (!this.badge || !this.badgeContent || !(this._action instanceof CompositeBarAction)) {
            return;
        }
        const { badges, type } = this.getVisibleBadges(this.getActivities());
        this.badgeDisposable.value = new DisposableStore();
        clearNode(this.badgeContent);
        hide(this.badge);
        const shouldRenderBadges = this.badgesEnabled(this.compositeBarActionItem.id);
        if (badges.length > 0 && shouldRenderBadges) {
            const classes = [];
            if (this.options.compact) {
                classes.push('compact');
            }
            // Progress
            if (type === 'progress') {
                show(this.badge);
                classes.push('progress-badge');
            }
            // Number
            else if (type === 'number') {
                const total = badges.reduce((r, b) => r + (b instanceof NumberBadge ? b.number : 0), 0);
                if (total > 0) {
                    let badgeNumber = total.toString();
                    if (total > 999) {
                        const noOfThousands = total / 1000;
                        const floor = Math.floor(noOfThousands);
                        badgeNumber = noOfThousands > floor ? `${floor}K+` : `${noOfThousands}K`;
                    }
                    if (this.options.compact && badgeNumber.length >= 3) {
                        classes.push('compact-content');
                    }
                    this.badgeContent.textContent = badgeNumber;
                    show(this.badge);
                }
            }
            // Icon
            else if (type === 'icon') {
                classes.push('icon-badge');
                const badgeContentClassess = [
                    'icon-overlay',
                    ...ThemeIcon.asClassNameArray(badges[0].icon),
                ];
                this.badgeContent.classList.add(...badgeContentClassess);
                this.badgeDisposable.value.add(toDisposable(() => this.badgeContent?.classList.remove(...badgeContentClassess)));
                show(this.badge);
            }
            if (classes.length) {
                this.badge.classList.add(...classes);
                this.badgeDisposable.value.add(toDisposable(() => this.badge.classList.remove(...classes)));
            }
        }
        this.updateTitle();
        this.updateStyles();
    }
    getVisibleBadges(activities) {
        const progressBadges = activities
            .filter((activity) => activity.badge instanceof ProgressBadge)
            .map((activity) => activity.badge);
        if (progressBadges.length > 0) {
            return { badges: progressBadges, type: 'progress' };
        }
        const iconBadges = activities
            .filter((activity) => activity.badge instanceof IconBadge)
            .map((activity) => activity.badge);
        if (iconBadges.length > 0) {
            return { badges: iconBadges, type: 'icon' };
        }
        const numberBadges = activities
            .filter((activity) => activity.badge instanceof NumberBadge)
            .map((activity) => activity.badge);
        if (numberBadges.length > 0) {
            return { badges: numberBadges, type: 'number' };
        }
        return { badges: [], type: undefined };
    }
    updateLabel() {
        this.label.className = 'action-label';
        if (this.compositeBarActionItem.classNames) {
            this.label.classList.add(...this.compositeBarActionItem.classNames);
        }
        if (!this.options.icon) {
            this.label.textContent = this.action.label;
        }
    }
    updateTitle() {
        const title = this.computeTitle();
        [this.label, this.badge, this.container].forEach((element) => {
            if (element) {
                element.setAttribute('aria-label', title);
                element.setAttribute('title', '');
                element.removeAttribute('title');
            }
        });
    }
    computeTitle() {
        this.keybindingLabel = this.computeKeybindingLabel();
        let title = this.keybindingLabel
            ? localize('titleKeybinding', '{0} ({1})', this.compositeBarActionItem.name, this.keybindingLabel)
            : this.compositeBarActionItem.name;
        const badges = this.getVisibleBadges(this.action.activities).badges;
        for (const badge of badges) {
            const description = badge.getDescription();
            if (!description) {
                continue;
            }
            title = `${title} - ${badge.getDescription()}`;
        }
        return title;
    }
    computeKeybindingLabel() {
        const keybinding = this.compositeBarActionItem.keybindingId
            ? this.keybindingService.lookupKeybinding(this.compositeBarActionItem.keybindingId)
            : null;
        return keybinding?.getLabel();
    }
    dispose() {
        super.dispose();
        if (this.mouseUpTimeout) {
            clearTimeout(this.mouseUpTimeout);
        }
        this.badge.remove();
    }
};
CompositeBarActionViewItem = __decorate([
    __param(3, IThemeService),
    __param(4, IHoverService),
    __param(5, IConfigurationService),
    __param(6, IKeybindingService)
], CompositeBarActionViewItem);
export { CompositeBarActionViewItem };
export class CompositeOverflowActivityAction extends CompositeBarAction {
    constructor(showMenu) {
        super({
            id: 'additionalComposites.action',
            name: localize('additionalViews', 'Additional Views'),
            classNames: ThemeIcon.asClassNameArray(Codicon.more),
        });
        this.showMenu = showMenu;
    }
    async run() {
        this.showMenu();
    }
}
let CompositeOverflowActivityActionViewItem = class CompositeOverflowActivityActionViewItem extends CompositeBarActionViewItem {
    constructor(action, getOverflowingComposites, getActiveCompositeId, getBadge, getCompositeOpenAction, colors, hoverOptions, contextMenuService, themeService, hoverService, configurationService, keybindingService) {
        super(action, { icon: true, colors, hasPopup: true, hoverOptions }, () => true, themeService, hoverService, configurationService, keybindingService);
        this.getOverflowingComposites = getOverflowingComposites;
        this.getActiveCompositeId = getActiveCompositeId;
        this.getBadge = getBadge;
        this.getCompositeOpenAction = getCompositeOpenAction;
        this.contextMenuService = contextMenuService;
    }
    showMenu() {
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.container,
            getActions: () => this.getActions(),
            getCheckedActionsRepresentation: () => 'radio',
        });
    }
    getActions() {
        return this.getOverflowingComposites().map((composite) => {
            const action = this.getCompositeOpenAction(composite.id);
            action.checked = this.getActiveCompositeId() === action.id;
            const badge = this.getBadge(composite.id);
            let suffix;
            if (badge instanceof NumberBadge) {
                suffix = badge.number;
            }
            if (suffix) {
                action.label = localize('numberBadge', '{0} ({1})', composite.name, suffix);
            }
            else {
                action.label = composite.name || '';
            }
            return action;
        });
    }
};
CompositeOverflowActivityActionViewItem = __decorate([
    __param(7, IContextMenuService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IConfigurationService),
    __param(11, IKeybindingService)
], CompositeOverflowActivityActionViewItem);
export { CompositeOverflowActivityActionViewItem };
let CompositeActionViewItem = class CompositeActionViewItem extends CompositeBarActionViewItem {
    constructor(options, compositeActivityAction, toggleCompositePinnedAction, toggleCompositeBadgeAction, compositeContextMenuActionsProvider, contextMenuActionsProvider, dndHandler, compositeBar, contextMenuService, keybindingService, instantiationService, themeService, hoverService, configurationService, commandService) {
        super(compositeActivityAction, options, compositeBar.areBadgesEnabled.bind(compositeBar), themeService, hoverService, configurationService, keybindingService);
        this.toggleCompositePinnedAction = toggleCompositePinnedAction;
        this.toggleCompositeBadgeAction = toggleCompositeBadgeAction;
        this.compositeContextMenuActionsProvider = compositeContextMenuActionsProvider;
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.dndHandler = dndHandler;
        this.compositeBar = compositeBar;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
        this.updateEnabled();
        this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, (e) => {
            EventHelper.stop(e, true);
            this.showContextMenu(container);
        }));
        // Allow to drag
        let insertDropBefore = undefined;
        this._register(CompositeDragAndDropObserver.INSTANCE.registerDraggable(this.container, () => {
            return { type: 'composite', id: this.compositeBarActionItem.id };
        }, {
            onDragOver: (e) => {
                const isValidMove = e.dragAndDropData.getData().id !== this.compositeBarActionItem.id &&
                    this.dndHandler.onDragOver(e.dragAndDropData, this.compositeBarActionItem.id, e.eventData);
                toggleDropEffect(e.eventData.dataTransfer, 'move', isValidMove);
                insertDropBefore = this.updateFromDragging(container, isValidMove, e.eventData);
            },
            onDragLeave: (e) => {
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDragEnd: (e) => {
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDrop: (e) => {
                EventHelper.stop(e.eventData, true);
                this.dndHandler.drop(e.dragAndDropData, this.compositeBarActionItem.id, e.eventData, insertDropBefore);
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDragStart: (e) => {
                if (e.dragAndDropData.getData().id !== this.compositeBarActionItem.id) {
                    return;
                }
                if (e.eventData.dataTransfer) {
                    e.eventData.dataTransfer.effectAllowed = 'move';
                }
                this.blur(); // Remove focus indicator when dragging
            },
        }));
        [this.badge, this.label].forEach((element) => this._register(new DelayedDragHandler(element, () => {
            if (!this.action.checked) {
                this.action.run();
            }
        })));
        this.updateStyles();
    }
    updateFromDragging(element, showFeedback, event) {
        const rect = element.getBoundingClientRect();
        const posX = event.clientX;
        const posY = event.clientY;
        const height = rect.bottom - rect.top;
        const width = rect.right - rect.left;
        const forceTop = posY <= rect.top + height * 0.4;
        const forceBottom = posY > rect.bottom - height * 0.4;
        const preferTop = posY <= rect.top + height * 0.5;
        const forceLeft = posX <= rect.left + width * 0.4;
        const forceRight = posX > rect.right - width * 0.4;
        const preferLeft = posX <= rect.left + width * 0.5;
        const classes = element.classList;
        const lastClasses = {
            vertical: classes.contains('top') ? 'top' : classes.contains('bottom') ? 'bottom' : undefined,
            horizontal: classes.contains('left')
                ? 'left'
                : classes.contains('right')
                    ? 'right'
                    : undefined,
        };
        const top = forceTop ||
            (preferTop && !lastClasses.vertical) ||
            (!forceBottom && lastClasses.vertical === 'top');
        const bottom = forceBottom ||
            (!preferTop && !lastClasses.vertical) ||
            (!forceTop && lastClasses.vertical === 'bottom');
        const left = forceLeft ||
            (preferLeft && !lastClasses.horizontal) ||
            (!forceRight && lastClasses.horizontal === 'left');
        const right = forceRight ||
            (!preferLeft && !lastClasses.horizontal) ||
            (!forceLeft && lastClasses.horizontal === 'right');
        element.classList.toggle('top', showFeedback && top);
        element.classList.toggle('bottom', showFeedback && bottom);
        element.classList.toggle('left', showFeedback && left);
        element.classList.toggle('right', showFeedback && right);
        if (!showFeedback) {
            return undefined;
        }
        return { verticallyBefore: top, horizontallyBefore: left };
    }
    showContextMenu(container) {
        const actions = [];
        if (this.compositeBarActionItem.keybindingId) {
            actions.push(createConfigureKeybindingAction(this.commandService, this.keybindingService, this.compositeBarActionItem.keybindingId));
        }
        actions.push(this.toggleCompositePinnedAction, this.toggleCompositeBadgeAction);
        const compositeContextMenuActions = this.compositeContextMenuActionsProvider(this.compositeBarActionItem.id);
        if (compositeContextMenuActions.length) {
            actions.push(...compositeContextMenuActions);
        }
        const isPinned = this.compositeBar.isPinned(this.compositeBarActionItem.id);
        if (isPinned) {
            this.toggleCompositePinnedAction.label = localize('hide', "Hide '{0}'", this.compositeBarActionItem.name);
            this.toggleCompositePinnedAction.checked = false;
            this.toggleCompositePinnedAction.enabled =
                this.compositeBar.getPinnedCompositeIds().length > 1;
        }
        else {
            this.toggleCompositePinnedAction.label = localize('keep', "Keep '{0}'", this.compositeBarActionItem.name);
            this.toggleCompositePinnedAction.enabled = true;
        }
        const isBadgeEnabled = this.compositeBar.areBadgesEnabled(this.compositeBarActionItem.id);
        if (isBadgeEnabled) {
            this.toggleCompositeBadgeAction.label = localize('hideBadge', 'Hide Badge');
        }
        else {
            this.toggleCompositeBadgeAction.label = localize('showBadge', 'Show Badge');
        }
        const otherActions = this.contextMenuActionsProvider();
        if (otherActions.length) {
            actions.push(new Separator());
            actions.push(...otherActions);
        }
        const elementPosition = getDomNodePagePosition(container);
        const anchor = {
            x: Math.floor(elementPosition.left + elementPosition.width / 2),
            y: elementPosition.top + elementPosition.height,
        };
        this.contextMenuService.showContextMenu({
            getAnchor: () => anchor,
            getActions: () => actions,
            getActionsContext: () => this.compositeBarActionItem.id,
        });
    }
    updateChecked() {
        if (this.action.checked) {
            this.container.classList.add('checked');
            this.container.setAttribute('aria-label', this.getTooltip() ?? this.container.title);
            this.container.setAttribute('aria-expanded', 'true');
            this.container.setAttribute('aria-selected', 'true');
        }
        else {
            this.container.classList.remove('checked');
            this.container.setAttribute('aria-label', this.getTooltip() ?? this.container.title);
            this.container.setAttribute('aria-expanded', 'false');
            this.container.setAttribute('aria-selected', 'false');
        }
        this.updateStyles();
    }
    updateEnabled() {
        if (!this.element) {
            return;
        }
        if (this.action.enabled) {
            this.element.classList.remove('disabled');
        }
        else {
            this.element.classList.add('disabled');
        }
    }
    dispose() {
        super.dispose();
        this.label.remove();
    }
};
CompositeActionViewItem = __decorate([
    __param(8, IContextMenuService),
    __param(9, IKeybindingService),
    __param(10, IInstantiationService),
    __param(11, IThemeService),
    __param(12, IHoverService),
    __param(13, IConfigurationService),
    __param(14, ICommandService)
], CompositeActionViewItem);
export { CompositeActionViewItem };
export class ToggleCompositePinnedAction extends Action {
    constructor(activity, compositeBar) {
        super('show.toggleCompositePinned', activity ? activity.name : localize('toggle', 'Toggle View Pinned'));
        this.activity = activity;
        this.compositeBar = compositeBar;
        this.checked = !!this.activity && this.compositeBar.isPinned(this.activity.id);
    }
    async run(context) {
        const id = this.activity ? this.activity.id : context;
        if (this.compositeBar.isPinned(id)) {
            this.compositeBar.unpin(id);
        }
        else {
            this.compositeBar.pin(id);
        }
    }
}
export class ToggleCompositeBadgeAction extends Action {
    constructor(compositeBarActionItem, compositeBar) {
        super('show.toggleCompositeBadge', compositeBarActionItem
            ? compositeBarActionItem.name
            : localize('toggleBadge', 'Toggle View Badge'));
        this.compositeBarActionItem = compositeBarActionItem;
        this.compositeBar = compositeBar;
        this.checked = false;
    }
    async run(context) {
        const id = this.compositeBarActionItem ? this.compositeBarActionItem.id : context;
        this.compositeBar.toggleBadgeEnablement(id);
    }
}
export class SwitchCompositeViewAction extends Action2 {
    constructor(desc, location, offset) {
        super(desc);
        this.location = location;
        this.offset = offset;
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const activeComposite = paneCompositeService.getActivePaneComposite(this.location);
        if (!activeComposite) {
            return;
        }
        let targetCompositeId;
        const visibleCompositeIds = paneCompositeService.getVisiblePaneCompositeIds(this.location);
        for (let i = 0; i < visibleCompositeIds.length; i++) {
            if (visibleCompositeIds[i] === activeComposite.getId()) {
                targetCompositeId =
                    visibleCompositeIds[(i + visibleCompositeIds.length + this.offset) % visibleCompositeIds.length];
                break;
            }
        }
        if (typeof targetCompositeId !== 'undefined') {
            await paneCompositeService.openPaneComposite(targetCompositeId, this.location, true);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlQmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2NvbXBvc2l0ZUJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUUsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxXQUFXLEVBQ1gsU0FBUyxFQUNULHNCQUFzQixFQUN0QixJQUFJLEVBQ0osSUFBSSxHQUNKLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLGdEQUFnRCxDQUFBO0FBQzNGLE9BQU8sRUFDTixXQUFXLEVBR1gsYUFBYSxFQUNiLFNBQVMsR0FDVCxNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8s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