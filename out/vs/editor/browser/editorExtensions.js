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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2VkaXRvckV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLDRDQUE0QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBRWxCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUdOLHFCQUFxQixHQUVyQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixtQkFBbUIsR0FFbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBSXZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdC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