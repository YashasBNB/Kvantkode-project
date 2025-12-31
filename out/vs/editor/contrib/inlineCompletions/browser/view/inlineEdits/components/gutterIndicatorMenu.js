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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yTWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvck1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQixDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNwRixPQUFPLEVBQ04sU0FBUyxHQUVULE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixlQUFlLEVBQ2YsOEJBQThCLEdBQzlCLE1BQU0seUVBQXlFLENBQUE7QUFFaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXRFLE9BQU8sRUFFTixPQUFPLEVBQ1AsZUFBZSxFQUNmLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNs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