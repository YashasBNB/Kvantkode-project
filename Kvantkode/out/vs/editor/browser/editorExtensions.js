/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { ICodeEditorService } from './services/codeEditorService.js';
import { Position } from '../common/core/position.js';
import { IModelService } from '../common/services/model.js';
import { ITextModelService } from '../common/services/resolverService.js';
import { MenuId, MenuRegistry, Action2 } from '../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { assertType } from '../../base/common/types.js';
import { ILogService } from '../../platform/log/common/log.js';
import { getActiveElement } from '../../base/browser/dom.js';
export var EditorContributionInstantiation;
(function (EditorContributionInstantiation) {
    /**
     * The contribution is created eagerly when the {@linkcode ICodeEditor} is instantiated.
     * Only Eager contributions can participate in saving or restoring of view state.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Eager"] = 0] = "Eager";
    /**
     * The contribution is created at the latest 50ms after the first render after attaching a text model.
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     * If there is idle time available, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["AfterFirstRender"] = 1] = "AfterFirstRender";
    /**
     * The contribution is created before the editor emits events produced by user interaction (mouse events, keyboard events).
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     * If there is idle time available, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["BeforeFirstInteraction"] = 2] = "BeforeFirstInteraction";
    /**
     * The contribution is created when there is idle time available, at the latest 5000ms after the editor creation.
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Eventually"] = 3] = "Eventually";
    /**
     * The contribution is created only when explicitly requested via `getContribution`.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Lazy"] = 4] = "Lazy";
})(EditorContributionInstantiation || (EditorContributionInstantiation = {}));
export class Command {
    constructor(opts) {
        this.id = opts.id;
        this.precondition = opts.precondition;
        this._kbOpts = opts.kbOpts;
        this._menuOpts = opts.menuOpts;
        this.metadata = opts.metadata;
    }
    register() {
        if (Array.isArray(this._menuOpts)) {
            this._menuOpts.forEach(this._registerMenuItem, this);
        }
        else if (this._menuOpts) {
            this._registerMenuItem(this._menuOpts);
        }
        if (this._kbOpts) {
            const kbOptsArr = Array.isArray(this._kbOpts) ? this._kbOpts : [this._kbOpts];
            for (const kbOpts of kbOptsArr) {
                let kbWhen = kbOpts.kbExpr;
                if (this.precondition) {
                    if (kbWhen) {
                        kbWhen = ContextKeyExpr.and(kbWhen, this.precondition);
                    }
                    else {
                        kbWhen = this.precondition;
                    }
                }
                const desc = {
                    id: this.id,
                    weight: kbOpts.weight,
                    args: kbOpts.args,
                    when: kbWhen,
                    primary: kbOpts.primary,
                    secondary: kbOpts.secondary,
                    win: kbOpts.win,
                    linux: kbOpts.linux,
                    mac: kbOpts.mac,
                };
                KeybindingsRegistry.registerKeybindingRule(desc);
            }
        }
        CommandsRegistry.registerCommand({
            id: this.id,
            handler: (accessor, args) => this.runCommand(accessor, args),
            metadata: this.metadata,
        });
    }
    _registerMenuItem(item) {
        MenuRegistry.appendMenuItem(item.menuId, {
            group: item.group,
            command: {
                id: this.id,
                title: item.title,
                icon: item.icon,
                precondition: this.precondition,
            },
            when: item.when,
            order: item.order,
        });
    }
}
export class MultiCommand extends Command {
    constructor() {
        super(...arguments);
        this._implementations = [];
    }
    /**
     * A higher priority gets to be looked at first
     */
    addImplementation(priority, name, implementation, when) {
        this._implementations.push({ priority, name, implementation, when });
        this._implementations.sort((a, b) => b.priority - a.priority);
        return {
            dispose: () => {
                for (let i = 0; i < this._implementations.length; i++) {
                    if (this._implementations[i].implementation === implementation) {
                        this._implementations.splice(i, 1);
                        return;
                    }
                }
            },
        };
    }
    runCommand(accessor, args) {
        const logService = accessor.get(ILogService);
        const contextKeyService = accessor.get(IContextKeyService);
        logService.trace(`Executing Command '${this.id}' which has ${this._implementations.length} bound.`);
        for (const impl of this._implementations) {
            if (impl.when) {
                const context = contextKeyService.getContext(getActiveElement());
                const value = impl.when.evaluate(context);
                if (!value) {
                    continue;
                }
            }
            const result = impl.implementation(accessor, args);
            if (result) {
                logService.trace(`Command '${this.id}' was handled by '${impl.name}'.`);
                if (typeof result === 'boolean') {
                    return;
                }
                return result;
            }
        }
        logService.trace(`The Command '${this.id}' was not handled by any implementation.`);
    }
}
//#endregion
/**
 * A command that delegates to another command's implementation.
 *
 * This lets different commands be registered but share the same implementation
 */
export class ProxyCommand extends Command {
    constructor(command, opts) {
        super(opts);
        this.command = command;
    }
    runCommand(accessor, args) {
        return this.command.runCommand(accessor, args);
    }
}
export class EditorCommand extends Command {
    /**
     * Create a command class that is bound to a certain editor contribution.
     */
    static bindToContribution(controllerGetter) {
        return class EditorControllerCommandImpl extends EditorCommand {
            constructor(opts) {
                super(opts);
                this._callback = opts.handler;
            }
            runEditorCommand(accessor, editor, args) {
                const controller = controllerGetter(editor);
                if (controller) {
                    this._callback(controller, args);
                }
            }
        };
    }
    static runEditorCommand(accessor, args, precondition, runner) {
        const codeEditorService = accessor.get(ICodeEditorService);
        // Find the editor with text focus or active
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (!editor) {
            // well, at least we tried...
            return;
        }
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            if (!kbService.contextMatchesRules(precondition ?? undefined)) {
                // precondition does not hold
                return;
            }
            return runner(editorAccessor, editor, args);
        });
    }
    runCommand(accessor, args) {
        return EditorCommand.runEditorCommand(accessor, args, this.precondition, (accessor, editor, args) => this.runEditorCommand(accessor, editor, args));
    }
}
export class EditorAction extends EditorCommand {
    static convertOptions(opts) {
        let menuOpts;
        if (Array.isArray(opts.menuOpts)) {
            menuOpts = opts.menuOpts;
        }
        else if (opts.menuOpts) {
            menuOpts = [opts.menuOpts];
        }
        else {
            menuOpts = [];
        }
        function withDefaults(item) {
            if (!item.menuId) {
                item.menuId = MenuId.EditorContext;
            }
            if (!item.title) {
                item.title = typeof opts.label === 'string' ? opts.label : opts.label.value;
            }
            item.when = ContextKeyExpr.and(opts.precondition, item.when);
            return item;
        }
        if (Array.isArray(opts.contextMenuOpts)) {
            menuOpts.push(...opts.contextMenuOpts.map(withDefaults));
        }
        else if (opts.contextMenuOpts) {
            menuOpts.push(withDefaults(opts.contextMenuOpts));
        }
        opts.menuOpts = menuOpts;
        return opts;
    }
    constructor(opts) {
        super(EditorAction.convertOptions(opts));
        if (typeof opts.label === 'string') {
            this.label = opts.label;
            this.alias = opts.alias ?? opts.label;
        }
        else {
            this.label = opts.label.value;
            this.alias = opts.alias ?? opts.label.original;
        }
    }
    runEditorCommand(accessor, editor, args) {
        this.reportTelemetry(accessor, editor);
        return this.run(accessor, editor, args || {});
    }
    reportTelemetry(accessor, editor) {
        accessor
            .get(ITelemetryService)
            .publicLog2('editorActionInvoked', { name: this.label, id: this.id });
    }
}
export class MultiEditorAction extends EditorAction {
    constructor() {
        super(...arguments);
        this._implementations = [];
    }
    /**
     * A higher priority gets to be looked at first
     */
    addImplementation(priority, implementation) {
        this._implementations.push([priority, implementation]);
        this._implementations.sort((a, b) => b[0] - a[0]);
        return {
            dispose: () => {
                for (let i = 0; i < this._implementations.length; i++) {
                    if (this._implementations[i][1] === implementation) {
                        this._implementations.splice(i, 1);
                        return;
                    }
                }
            },
        };
    }
    run(accessor, editor, args) {
        for (const impl of this._implementations) {
            const result = impl[1](accessor, editor, args);
            if (result) {
                if (typeof result === 'boolean') {
                    return;
                }
                return result;
            }
        }
    }
}
//#endregion EditorAction
//#region EditorAction2
export class EditorAction2 extends Action2 {
    run(accessor, ...args) {
        // Find the editor with text focus or active
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (!editor) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this.runEditorCommand(editorAccessor, editor, ...args);
        });
    }
}
//#endregion
// --- Registration of commands and actions
export function registerModelAndPositionCommand(id, handler) {
    CommandsRegistry.registerCommand(id, function (accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const [resource, position] = args;
        assertType(URI.isUri(resource));
        assertType(Position.isIPosition(position));
        const model = accessor.get(IModelService).getModel(resource);
        if (model) {
            const editorPosition = Position.lift(position);
            return instaService.invokeFunction(handler, model, editorPosition, ...args.slice(2));
        }
        return accessor
            .get(ITextModelService)
            .createModelReference(resource)
            .then((reference) => {
            return new Promise((resolve, reject) => {
                try {
                    const result = instaService.invokeFunction(handler, reference.object.textEditorModel, Position.lift(position), args.slice(2));
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
            }).finally(() => {
                reference.dispose();
            });
        });
    });
}
export function registerEditorCommand(editorCommand) {
    EditorContributionRegistry.INSTANCE.registerEditorCommand(editorCommand);
    return editorCommand;
}
export function registerEditorAction(ctor) {
    const action = new ctor();
    EditorContributionRegistry.INSTANCE.registerEditorAction(action);
    return action;
}
export function registerMultiEditorAction(action) {
    EditorContributionRegistry.INSTANCE.registerEditorAction(action);
    return action;
}
export function registerInstantiatedEditorAction(editorAction) {
    EditorContributionRegistry.INSTANCE.registerEditorAction(editorAction);
}
/**
 * Registers an editor contribution. Editor contributions have a lifecycle which is bound
 * to a specific code editor instance.
 */
export function registerEditorContribution(id, ctor, instantiation) {
    EditorContributionRegistry.INSTANCE.registerEditorContribution(id, ctor, instantiation);
}
/**
 * Registers a diff editor contribution. Diff editor contributions have a lifecycle which
 * is bound to a specific diff editor instance.
 */
export function registerDiffEditorContribution(id, ctor) {
    EditorContributionRegistry.INSTANCE.registerDiffEditorContribution(id, ctor);
}
export var EditorExtensionsRegistry;
(function (EditorExtensionsRegistry) {
    function getEditorCommand(commandId) {
        return EditorContributionRegistry.INSTANCE.getEditorCommand(commandId);
    }
    EditorExtensionsRegistry.getEditorCommand = getEditorCommand;
    function getEditorActions() {
        return EditorContributionRegistry.INSTANCE.getEditorActions();
    }
    EditorExtensionsRegistry.getEditorActions = getEditorActions;
    function getEditorContributions() {
        return EditorContributionRegistry.INSTANCE.getEditorContributions();
    }
    EditorExtensionsRegistry.getEditorContributions = getEditorContributions;
    function getSomeEditorContributions(ids) {
        return EditorContributionRegistry.INSTANCE.getEditorContributions().filter((c) => ids.indexOf(c.id) >= 0);
    }
    EditorExtensionsRegistry.getSomeEditorContributions = getSomeEditorContributions;
    function getDiffEditorContributions() {
        return EditorContributionRegistry.INSTANCE.getDiffEditorContributions();
    }
    EditorExtensionsRegistry.getDiffEditorContributions = getDiffEditorContributions;
})(EditorExtensionsRegistry || (EditorExtensionsRegistry = {}));
// Editor extension points
const Extensions = {
    EditorCommonContributions: 'editor.contributions',
};
class EditorContributionRegistry {
    static { this.INSTANCE = new EditorContributionRegistry(); }
    constructor() {
        this.editorContributions = [];
        this.diffEditorContributions = [];
        this.editorActions = [];
        this.editorCommands = Object.create(null);
    }
    registerEditorContribution(id, ctor, instantiation) {
        this.editorContributions.push({ id, ctor: ctor, instantiation });
    }
    getEditorContributions() {
        return this.editorContributions.slice(0);
    }
    registerDiffEditorContribution(id, ctor) {
        this.diffEditorContributions.push({ id, ctor: ctor });
    }
    getDiffEditorContributions() {
        return this.diffEditorContributions.slice(0);
    }
    registerEditorAction(action) {
        action.register();
        this.editorActions.push(action);
    }
    getEditorActions() {
        return this.editorActions;
    }
    registerEditorCommand(editorCommand) {
        editorCommand.register();
        this.editorCommands[editorCommand.id] = editorCommand;
    }
    getEditorCommand(commandId) {
        return this.editorCommands[commandId] || null;
    }
}
Registry.add(Extensions.EditorCommonContributions, EditorContributionRegistry.INSTANCE);
function registerCommand(command) {
    command.register();
    return command;
}
export const UndoCommand = registerCommand(new MultiCommand({
    id: 'undo',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
    },
    menuOpts: [
        {
            menuId: MenuId.MenubarEditMenu,
            group: '1_do',
            title: nls.localize({ key: 'miUndo', comment: ['&& denotes a mnemonic'] }, '&&Undo'),
            order: 1,
        },
        {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('undo', 'Undo'),
            order: 1,
        },
        {
            menuId: MenuId.SimpleEditorContext,
            group: '1_do',
            title: nls.localize('undo', 'Undo'),
            order: 1,
        },
    ],
}));
registerCommand(new ProxyCommand(UndoCommand, { id: 'default:undo', precondition: undefined }));
export const RedoCommand = registerCommand(new MultiCommand({
    id: 'redo',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */],
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */ },
    },
    menuOpts: [
        {
            menuId: MenuId.MenubarEditMenu,
            group: '1_do',
            title: nls.localize({ key: 'miRedo', comment: ['&& denotes a mnemonic'] }, '&&Redo'),
            order: 2,
        },
        {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('redo', 'Redo'),
            order: 1,
        },
        {
            menuId: MenuId.SimpleEditorContext,
            group: '1_do',
            title: nls.localize('redo', 'Redo'),
            order: 2,
        },
    ],
}));
registerCommand(new ProxyCommand(RedoCommand, { id: 'default:redo', precondition: undefined }));
export const SelectAllCommand = registerCommand(new MultiCommand({
    id: 'editor.action.selectAll',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
    },
    menuOpts: [
        {
            menuId: MenuId.MenubarSelectionMenu,
            group: '1_basic',
            title: nls.localize({ key: 'miSelectAll', comment: ['&& denotes a mnemonic'] }, '&&Select All'),
            order: 1,
        },
        {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('selectAll', 'Select All'),
            order: 1,
        },
        {
            menuId: MenuId.SimpleEditorContext,
            group: '9_select',
            title: nls.localize('selectAll', 'Select All'),
            order: 1,
        },
    ],
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZWRpdG9yRXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBR3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sNENBQTRDLENBQUE7QUFDL0YsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FFbEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBR04scUJBQXFCLEdBRXJCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLG1CQUFtQixHQUVuQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFJdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFB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