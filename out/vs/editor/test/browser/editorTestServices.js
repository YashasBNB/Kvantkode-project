/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { AbstractCodeEditorService, GlobalStyleSheet, } from '../../browser/services/abstractCodeEditorService.js';
import { CommandsRegistry, } from '../../../platform/commands/common/commands.js';
export class TestCodeEditorService extends AbstractCodeEditorService {
    constructor() {
        super(...arguments);
        this.globalStyleSheet = new TestGlobalStyleSheet();
    }
    _createGlobalStyleSheet() {
        return this.globalStyleSheet;
    }
    getActiveCodeEditor() {
        return null;
    }
    openCodeEditor(input, source, sideBySide) {
        this.lastInput = input;
        return Promise.resolve(null);
    }
}
export class TestGlobalStyleSheet extends GlobalStyleSheet {
    constructor() {
        super(null);
        this.rules = [];
    }
    insertRule(selector, rule) {
        this.rules.unshift(`${selector} {${rule}}`);
    }
    removeRulesContainingSelector(ruleName) {
        for (let i = 0; i < this.rules.length; i++) {
            if (this.rules[i].indexOf(ruleName) >= 0) {
                this.rules.splice(i, 1);
                i--;
            }
        }
    }
    read() {
        return this.rules.join('\n');
    }
}
export class TestCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this._onDidExecuteCommand = new Emitter();
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [
                command.handler,
                ...args,
            ]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9lZGl0b3JUZXN0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFDTix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBQ2hCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUNOLGdCQUFnQixHQUdoQixNQUFNLCtDQUErQyxDQUFBO0FBSXRELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSx5QkFBeUI7SUFBcEU7O1FBQ2lCLHFCQUFnQixHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtJQWtCOUQsQ0FBQztJQWhCbUIsdUJBQXVCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRVEsY0FBYyxDQUN0QixLQUEyQixFQUMzQixNQUEwQixFQUMxQixVQUFvQjtRQUVwQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGdCQUFnQjtJQUd6RDtRQUNDLEtBQUssQ0FBQyxJQUFLLENBQUMsQ0FBQTtRQUhOLFVBQUssR0FBYSxFQUFFLENBQUE7SUFJM0IsQ0FBQztJQUVlLFVBQVUsQ0FBQyxRQUFnQixFQUFFLElBQVk7UUFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxRQUFRLEtBQUssSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRWUsNkJBQTZCLENBQUMsUUFBZ0I7UUFDN0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixDQUFDLEVBQUUsQ0FBQTtZQUNKLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFXOUIsWUFBWSxvQkFBMkM7UUFOdEMsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUE7UUFDckQseUJBQW9CLEdBQXlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFNUUseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUE7UUFDcEQsd0JBQW1CLEdBQXlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFHMUYsSUFBSSxDQUFDLHFCQUFxQixHQUFHLG9CQUFvQixDQUFBO0lBQ2xELENBQUM7SUFFTSxjQUFjLENBQUksRUFBVSxFQUFFLEdBQUcsSUFBVztRQUNsRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtnQkFDMUYsT0FBTyxDQUFDLE9BQU87Z0JBQ2YsR0FBRyxJQUFJO2FBQ1AsQ0FBTSxDQUFBO1lBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUN2RCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9