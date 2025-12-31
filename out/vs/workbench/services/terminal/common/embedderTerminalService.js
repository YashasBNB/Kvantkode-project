/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export const IEmbedderTerminalService = createDecorator('embedderTerminalService');
class EmbedderTerminalService {
    constructor() {
        this._onDidCreateTerminal = new Emitter();
        this.onDidCreateTerminal = Event.buffer(this._onDidCreateTerminal.event);
    }
    createTerminal(options) {
        const slc = {
            name: options.name,
            isFeatureTerminal: true,
            customPtyImplementation(terminalId, cols, rows) {
                return new EmbedderTerminalProcess(terminalId, options.pty);
            },
        };
        this._onDidCreateTerminal.fire(slc);
    }
}
class EmbedderTerminalProcess extends Disposable {
    constructor(id, pty) {
        super();
        this.id = id;
        this.shouldPersist = false;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._pty = pty;
        this.onProcessData = this._pty.onDidWrite;
        if (this._pty.onDidClose) {
            this._register(this._pty.onDidClose((e) => this._onProcessExit.fire(e || undefined)));
        }
        if (this._pty.onDidChangeName) {
            this._register(this._pty.onDidChangeName((e) => this._onDidChangeProperty.fire({
                type: "title" /* ProcessPropertyType.Title */,
                value: e,
            })));
        }
    }
    async start() {
        this._onProcessReady.fire({ pid: -1, cwd: '', windowsPty: undefined });
        this._pty.open();
        return undefined;
    }
    shutdown() {
        this._pty.close();
    }
    // TODO: A lot of these aren't useful for some implementations of ITerminalChildProcess, should
    // they be optional? Should there be a base class for "external" consumers to implement?
    input() {
        // not supported
    }
    async processBinary() {
        // not supported
    }
    resize() {
        // no-op
    }
    clearBuffer() {
        // no-op
    }
    acknowledgeDataEvent() {
        // no-op, flow control not currently implemented
    }
    async setUnicodeVersion() {
        // no-op
    }
    async getInitialCwd() {
        return '';
    }
    async getCwd() {
        return '';
    }
    refreshProperty(property) {
        throw new Error(`refreshProperty is not suppported in EmbedderTerminalProcess. property: ${property}`);
    }
    updateProperty(property, value) {
        throw new Error(`updateProperty is not suppported in EmbedderTerminalProcess. property: ${property}, value: ${value}`);
    }
}
registerSingleton(IEmbedderTerminalService, EmbedderTerminalService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZXJUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVybWluYWwvY29tbW9uL2VtYmVkZGVyVGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVdqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQ3BDLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQTtBQTRDckUsTUFBTSx1QkFBdUI7SUFBN0I7UUFHa0IseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQXNCLENBQUE7UUFDaEUsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7SUFZN0UsQ0FBQztJQVZBLGNBQWMsQ0FBQyxPQUFpQztRQUMvQyxNQUFNLEdBQUcsR0FBcUI7WUFDN0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsdUJBQXVCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJO2dCQUM3QyxPQUFPLElBQUksdUJBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7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