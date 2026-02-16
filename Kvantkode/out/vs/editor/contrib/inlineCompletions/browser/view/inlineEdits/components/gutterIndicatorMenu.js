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
import { n } from '../../../../../../../base/browser/dom.js';
import { ActionBar, } from '../../../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions, } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { autorun, constObservable, derived, derivedWithStore, observableFromEvent, observableValue, } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../../base/common/themables.js';
import { localize } from '../../../../../../../nls.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { nativeHoverDelegate } from '../../../../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { asCssVariable, descriptionForeground, editorActionListForeground, editorHoverBorder, } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { hideInlineCompletionId, inlineSuggestCommitId, jumpToNextInlineEditId, toggleShowCollapsedId, } from '../../../controller/commandIds.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
let GutterIndicatorMenuContent = class GutterIndicatorMenuContent {
    constructor(_model, _close, _editorObs, _contextKeyService, _keybindingService, _commandService) {
        this._model = _model;
        this._close = _close;
        this._editorObs = _editorObs;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._inlineEditsShowCollapsed = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((s) => s.edits.showCollapsed);
    }
    toDisposableLiveElement() {
        return this._createHoverContent().toDisposableLiveElement();
    }
    _createHoverContent() {
        const activeElement = observableValue('active', undefined);
        const createOptionArgs = (options) => {
            return {
                title: options.title,
                icon: options.icon,
                keybinding: typeof options.commandId === 'string'
                    ? this._getKeybinding(options.commandArgs ? undefined : options.commandId)
                    : derived((reader) => typeof options.commandId === 'string'
                        ? undefined
                        : this._getKeybinding(options.commandArgs ? undefined : options.commandId.read(reader)).read(reader)),
                isActive: activeElement.map((v) => v === options.id),
                onHoverChange: (v) => activeElement.set(v ? options.id : undefined, undefined),
                onAction: () => {
                    this._close(true);
                    return this._commandService.executeCommand(typeof options.commandId === 'string' ? options.commandId : options.commandId.get(), ...(options.commandArgs ?? []));
                },
            };
        };
        const title = header(this._model.displayName);
        const gotoAndAccept = option(createOptionArgs({
            id: 'gotoAndAccept',
            title: `${localize('goto', 'Go To')} / ${localize('accept', 'Accept')}`,
            icon: this._model.tabAction.map((action) => action === InlineEditTabAction.Accept ? Codicon.check : Codicon.arrowRight),
            commandId: this._model.tabAction.map((action) => action === InlineEditTabAction.Accept ? inlineSuggestCommitId : jumpToNextInlineEditId),
        }));
        const reject = option(createOptionArgs({
            id: 'reject',
            title: localize('reject', 'Reject'),
            icon: Codicon.close,
            commandId: hideInlineCompletionId,
        }));
        const extensionCommands = this._model.extensionCommands.map((c, idx) => option(createOptionArgs({
            id: c.id + '_' + idx,
            title: c.title,
            icon: Codicon.symbolEvent,
            commandId: c.id,
            commandArgs: c.arguments,
        })));
        const toggleCollapsedMode = this._inlineEditsShowCollapsed.map((showCollapsed) => showCollapsed
            ? option(createOptionArgs({
                id: 'showExpanded',
                title: localize('showExpanded', 'Show Expanded'),
                icon: Codicon.expandAll,
                commandId: toggleShowCollapsedId,
            }))
            : option(createOptionArgs({
                id: 'showCollapsed',
                title: localize('showCollapsed', 'Show Collapsed'),
                icon: Codicon.collapseAll,
                commandId: toggleShowCollapsedId,
            })));
        const settings = option(createOptionArgs({
            id: 'settings',
            title: localize('settings', 'Settings'),
            icon: Codicon.gear,
            commandId: 'workbench.action.openSettings',
            commandArgs: ['@tag:nextEditSuggestions'],
        }));
        const actions = this._model.action ? [this._model.action] : [];
        const actionBarFooter = actions.length > 0
            ? actionBar(actions.map((action) => ({
                id: action.id,
                label: action.title,
                enabled: true,
                run: () => this._commandService.executeCommand(action.id, ...(action.arguments ?? [])),
                class: undefined,
                tooltip: action.tooltip ?? action.title,
            })), { hoverDelegate: nativeHoverDelegate /* unable to show hover inside another hover */ })
            : undefined;
        return hoverContent([
            title,
            gotoAndAccept,
            reject,
            toggleCollapsedMode,
            settings,
            extensionCommands.length ? separator() : undefined,
            ...extensionCommands,
            actionBarFooter ? separator() : undefined,
            actionBarFooter,
        ]);
    }
    _getKeybinding(commandId) {
        if (!commandId) {
            return constObservable(undefined);
        }
        return observableFromEvent(this._contextKeyService.onDidChangeContext, () => this._keybindingService.lookupKeybinding(commandId)); // TODO: use contextkeyservice to use different renderings
    }
};
GutterIndicatorMenuContent = __decorate([
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, ICommandService)
], GutterIndicatorMenuContent);
export { GutterIndicatorMenuContent };
function hoverContent(content) {
    return n.div({
        class: 'content',
        style: {
            margin: 4,
            minWidth: 150,
        },
    }, content);
}
function header(title) {
    return n.div({
        class: 'header',
        style: {
            color: asCssVariable(descriptionForeground),
            fontSize: '12px',
            fontWeight: '600',
            padding: '0 10px',
            lineHeight: 26,
        },
    }, [title]);
}
function option(props) {
    return derivedWithStore((_reader, store) => n.div({
        class: ['monaco-menu-option', props.isActive?.map((v) => v && 'active')],
        onmouseenter: () => props.onHoverChange?.(true),
        onmouseleave: () => props.onHoverChange?.(false),
        onclick: props.onAction,
        onkeydown: (e) => {
            if (e.key === 'Enter') {
                props.onAction?.();
            }
        },
        tabIndex: 0,
        style: {
            borderRadius: 3, // same as hover widget border radius
        },
    }, [
        n.elem('span', {
            style: {
                fontSize: 16,
                display: 'flex',
            },
        }, [
            ThemeIcon.isThemeIcon(props.icon)
                ? renderIcon(props.icon)
                : props.icon.map((icon) => renderIcon(icon)),
        ]),
        n.elem('span', {}, [props.title]),
        n.div({
            style: { marginLeft: 'auto', opacity: '0.6' },
            ref: (elem) => {
                const keybindingLabel = store.add(new KeybindingLabel(elem, OS, {
                    disableTitle: true,
                    ...unthemedKeybindingLabelOptions,
                }));
                store.add(autorun((reader) => {
                    keybindingLabel.set(props.keybinding.read(reader));
                }));
            },
        }),
    ]));
}
// TODO: make this observable
function actionBar(actions, options) {
    return derivedWithStore((_reader, store) => n.div({
        class: ['action-widget-action-bar'],
        style: {
            padding: '0 10px',
        },
    }, [
        n.div({
            ref: (elem) => {
                const actionBar = store.add(new ActionBar(elem, options));
                actionBar.push(actions, { icon: false, label: true });
            },
        }),
    ]));
}
function separator() {
    return n.div({
        id: 'inline-edit-gutter-indicator-menu-separator',
        class: 'menu-separator',
        style: {
            color: asCssVariable(editorActionListForeground),
            padding: '4px 0',
        },
    }, n.div({
        style: {
            borderBottom: `1px solid ${asCssVariable(editorHoverBorder)}`,
        },
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yTWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2NvbXBvbmVudHMvZ3V0dGVySW5kaWNhdG9yTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTBCLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3BGLE9BQU8sRUFDTixTQUFTLEdBRVQsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUNOLGVBQWUsRUFDZiw4QkFBOEIsR0FDOUIsTUFBTSx5RUFBeUUsQ0FBQTtBQUVoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdEUsT0FBTyxFQUVOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUNQLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFB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