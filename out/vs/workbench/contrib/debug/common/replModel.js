/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import severity from '../../../../base/common/severity.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { ExpressionContainer } from './debugModel.js';
const MAX_REPL_LENGTH = 10000;
let topReplElementCounter = 0;
const getUniqueId = () => `topReplElement:${topReplElementCounter++}`;
/**
 * General case of data from DAP the `output` event. {@link ReplVariableElement}
 * is used instead only if there is a `variablesReference` with no `output` text.
 */
export class ReplOutputElement {
    constructor(session, id, value, severity, sourceData, expression) {
        this.session = session;
        this.id = id;
        this.value = value;
        this.severity = severity;
        this.sourceData = sourceData;
        this.expression = expression;
        this._count = 1;
        this._onDidChangeCount = new Emitter();
    }
    toString(includeSource = false) {
        let valueRespectCount = this.value;
        for (let i = 1; i < this.count; i++) {
            valueRespectCount += (valueRespectCount.endsWith('\n') ? '' : '\n') + this.value;
        }
        const sourceStr = this.sourceData && includeSource ? ` ${this.sourceData.source.name}` : '';
        return valueRespectCount + sourceStr;
    }
    getId() {
        return this.id;
    }
    getChildren() {
        return this.expression?.getChildren() || Promise.resolve([]);
    }
    set count(value) {
        this._count = value;
        this._onDidChangeCount.fire();
    }
    get count() {
        return this._count;
    }
    get onDidChangeCount() {
        return this._onDidChangeCount.event;
    }
    get hasChildren() {
        return !!this.expression?.hasChildren;
    }
}
/** Top-level variable logged via DAP output when there's no `output` string */
export class ReplVariableElement {
    constructor(session, expression, severity, sourceData) {
        this.session = session;
        this.expression = expression;
        this.severity = severity;
        this.sourceData = sourceData;
        this.id = generateUuid();
        this.hasChildren = expression.hasChildren;
    }
    getSession() {
        return this.session;
    }
    getChildren() {
        return this.expression.getChildren();
    }
    toString() {
        return this.expression.toString();
    }
    getId() {
        return this.id;
    }
}
export class RawObjectReplElement {
    static { this.MAX_CHILDREN = 1000; } // upper bound of children per value
    constructor(id, name, valueObj, sourceData, annotation) {
        this.id = id;
        this.name = name;
        this.valueObj = valueObj;
        this.sourceData = sourceData;
        this.annotation = annotation;
    }
    getId() {
        return this.id;
    }
    getSession() {
        return undefined;
    }
    get value() {
        if (this.valueObj === null) {
            return 'null';
        }
        else if (Array.isArray(this.valueObj)) {
            return `Array[${this.valueObj.length}]`;
        }
        else if (isObject(this.valueObj)) {
            return 'Object';
        }
        else if (isString(this.valueObj)) {
            return `"${this.valueObj}"`;
        }
        return String(this.valueObj) || '';
    }
    get hasChildren() {
        return ((Array.isArray(this.valueObj) && this.valueObj.length > 0) ||
            (isObject(this.valueObj) && Object.getOwnPropertyNames(this.valueObj).length > 0));
    }
    evaluateLazy() {
        throw new Error('Method not implemented.');
    }
    getChildren() {
        let result = [];
        if (Array.isArray(this.valueObj)) {
            result = this.valueObj
                .slice(0, RawObjectReplElement.MAX_CHILDREN)
                .map((v, index) => new RawObjectReplElement(`${this.id}:${index}`, String(index), v));
        }
        else if (isObject(this.valueObj)) {
            result = Object.getOwnPropertyNames(this.valueObj)
                .slice(0, RawObjectReplElement.MAX_CHILDREN)
                .map((key, index) => new RawObjectReplElement(`${this.id}:${index}`, key, this.valueObj[key]));
        }
        return Promise.resolve(result);
    }
    toString() {
        return `${this.name}\n${this.value}`;
    }
}
export class ReplEvaluationInput {
    constructor(value) {
        this.value = value;
        this.id = generateUuid();
    }
    toString() {
        return this.value;
    }
    getId() {
        return this.id;
    }
}
export class ReplEvaluationResult extends ExpressionContainer {
    get available() {
        return this._available;
    }
    constructor(originalExpression) {
        super(undefined, undefined, 0, generateUuid());
        this.originalExpression = originalExpression;
        this._available = true;
    }
    async evaluateExpression(expression, session, stackFrame, context) {
        const result = await super.evaluateExpression(expression, session, stackFrame, context);
        this._available = result;
        return result;
    }
    toString() {
        return `${this.value}`;
    }
}
export class ReplGroup {
    static { this.COUNTER = 0; }
    constructor(session, name, autoExpand, sourceData) {
        this.session = session;
        this.name = name;
        this.autoExpand = autoExpand;
        this.sourceData = sourceData;
        this.children = [];
        this.ended = false;
        this.id = `replGroup:${ReplGroup.COUNTER++}`;
    }
    get hasChildren() {
        return true;
    }
    getId() {
        return this.id;
    }
    toString(includeSource = false) {
        const sourceStr = includeSource && this.sourceData ? ` ${this.sourceData.source.name}` : '';
        return this.name + sourceStr;
    }
    addChild(child) {
        const lastElement = this.children.length ? this.children[this.children.length - 1] : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.addChild(child);
        }
        else {
            this.children.push(child);
        }
    }
    getChildren() {
        return this.children;
    }
    end() {
        const lastElement = this.children.length ? this.children[this.children.length - 1] : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.end();
        }
        else {
            this.ended = true;
        }
    }
    get hasEnded() {
        return this.ended;
    }
}
function areSourcesEqual(first, second) {
    if (!first && !second) {
        return true;
    }
    if (first && second) {
        return (first.column === second.column &&
            first.lineNumber === second.lineNumber &&
            first.source.uri.toString() === second.source.uri.toString());
    }
    return false;
}
export class ReplModel {
    constructor(configurationService) {
        this.configurationService = configurationService;
        this.replElements = [];
        this._onDidChangeElements = new Emitter();
        this.onDidChangeElements = this._onDidChangeElements.event;
    }
    getReplElements() {
        return this.replElements;
    }
    async addReplExpression(session, stackFrame, expression) {
        this.addReplElement(new ReplEvaluationInput(expression));
        const result = new ReplEvaluationResult(expression);
        await result.evaluateExpression(expression, session, stackFrame, 'repl');
        this.addReplElement(result);
    }
    appendToRepl(session, { output, expression, sev, source }) {
        const clearAnsiSequence = '\u001b[2J';
        const clearAnsiIndex = output.lastIndexOf(clearAnsiSequence);
        if (clearAnsiIndex !== -1) {
            // [2J is the ansi escape sequence for clearing the display http://ascii-table.com/ansi-escape-sequences.php
            this.removeReplExpressions();
            this.appendToRepl(session, {
                output: nls.localize('consoleCleared', 'Console was cleared'),
                sev: severity.Ignore,
            });
            output = output.substring(clearAnsiIndex + clearAnsiSequence.length);
        }
        if (expression) {
            // if there is an output string, prefer to show that, since the DA could
            // have formatted it nicely e.g. with ANSI color codes.
            this.addReplElement(output
                ? new ReplOutputElement(session, getUniqueId(), output, sev, source, expression)
                : new ReplVariableElement(session, expression, sev, source));
            return;
        }
        const previousElement = this.replElements.length
            ? this.replElements[this.replElements.length - 1]
            : undefined;
        if (previousElement instanceof ReplOutputElement && previousElement.severity === sev) {
            const config = this.configurationService.getValue('debug');
            if (previousElement.value === output &&
                areSourcesEqual(previousElement.sourceData, source) &&
                config.console.collapseIdenticalLines) {
                previousElement.count++;
                // No need to fire an event, just the count updates and badge will adjust automatically
                return;
            }
            if (!previousElement.value.endsWith('\n') &&
                !previousElement.value.endsWith('\r\n') &&
                previousElement.count === 1) {
                this.replElements[this.replElements.length - 1] = new ReplOutputElement(session, getUniqueId(), previousElement.value + output, sev, source);
                this._onDidChangeElements.fire(undefined);
                return;
            }
        }
        const element = new ReplOutputElement(session, getUniqueId(), output, sev, source);
        this.addReplElement(element);
    }
    startGroup(session, name, autoExpand, sourceData) {
        const group = new ReplGroup(session, name, autoExpand, sourceData);
        this.addReplElement(group);
    }
    endGroup() {
        const lastElement = this.replElements[this.replElements.length - 1];
        if (lastElement instanceof ReplGroup) {
            lastElement.end();
        }
    }
    addReplElement(newElement) {
        const lastElement = this.replElements.length
            ? this.replElements[this.replElements.length - 1]
            : undefined;
        if (lastElement instanceof ReplGroup && !lastElement.hasEnded) {
            lastElement.addChild(newElement);
        }
        else {
            this.replElements.push(newElement);
            if (this.replElements.length > MAX_REPL_LENGTH) {
                this.replElements.splice(0, this.replElements.length - MAX_REPL_LENGTH);
            }
        }
        this._onDidChangeElements.fire(newElement);
    }
    removeReplExpressions() {
        if (this.replElements.length > 0) {
            this.replElements = [];
            this._onDidChangeElements.fire(undefined);
        }
    }
    /** Returns a new REPL model that's a copy of this one. */
    clone() {
        const newRepl = new ReplModel(this.configurationService);
        newRepl.replElements = this.replElements.slice();
        return newRepl;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL3JlcGxNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQVd6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVyRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUE7QUFDN0IsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUE7QUFDN0IsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFLENBQUMsa0JBQWtCLHFCQUFxQixFQUFFLEVBQUUsQ0FBQTtBQUVyRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBSTdCLFlBQ1EsT0FBc0IsRUFDckIsRUFBVSxFQUNYLEtBQWEsRUFDYixRQUFrQixFQUNsQixVQUErQixFQUN0QixVQUF3QjtRQUxqQyxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQ3JCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDWCxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUN0QixlQUFVLEdBQVYsVUFBVSxDQUFjO1FBVGpDLFdBQU0sR0FBRyxDQUFDLENBQUE7UUFDVixzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxD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