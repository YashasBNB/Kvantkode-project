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
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Expression, ExpressionContainer, Variable } from '../common/debugModel.js';
import { ReplEvaluationResult } from '../common/replModel.js';
import { splitExpressionOrScopeHighlights } from './baseDebugView.js';
import { handleANSIOutput } from './debugANSIHandling.js';
import { COPY_EVALUATE_PATH_ID, COPY_VALUE_ID } from './debugCommands.js';
import { LinkDetector, } from './linkDetector.js';
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
const booleanRegex = /^(true|false)$/i;
const stringRegex = /^(['"]).*\1$/;
var Cls;
(function (Cls) {
    Cls["Value"] = "value";
    Cls["Unavailable"] = "unavailable";
    Cls["Error"] = "error";
    Cls["Changed"] = "changed";
    Cls["Boolean"] = "boolean";
    Cls["String"] = "string";
    Cls["Number"] = "number";
})(Cls || (Cls = {}));
const allClasses = Object.keys({
    ["value" /* Cls.Value */]: 0,
    ["unavailable" /* Cls.Unavailable */]: 0,
    ["error" /* Cls.Error */]: 0,
    ["changed" /* Cls.Changed */]: 0,
    ["boolean" /* Cls.Boolean */]: 0,
    ["string" /* Cls.String */]: 0,
    ["number" /* Cls.Number */]: 0,
});
let DebugExpressionRenderer = class DebugExpressionRenderer {
    constructor(commandService, configurationService, instantiationService, hoverService) {
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.linkDetector = instantiationService.createInstance(LinkDetector);
        this.displayType = observableConfigValue('debug.showVariableTypes', false, configurationService);
    }
    renderVariable(data, variable, options = {}) {
        const displayType = this.displayType.get();
        const highlights = splitExpressionOrScopeHighlights(variable, options.highlights || []);
        if (variable.available) {
            data.type.textContent = '';
            let text = variable.name;
            if (variable.value && typeof variable.name === 'string') {
                if (variable.type && displayType) {
                    text += ': ';
                    data.type.textContent = variable.type + ' =';
                }
                else {
                    text += ' =';
                }
            }
            data.label.set(text, highlights.name, variable.type && !displayType ? variable.type : variable.name);
            data.name.classList.toggle('virtual', variable.presentationHint?.kind === 'virtual');
            data.name.classList.toggle('internal', variable.presentationHint?.visibility === 'internal');
        }
        else if (variable.value && typeof variable.name === 'string' && variable.name) {
            data.label.set(':');
        }
        data.expression.classList.toggle('lazy', !!variable.presentationHint?.lazy);
        const commands = [{ id: COPY_VALUE_ID, args: [variable, [variable]] }];
        if (variable.evaluateName) {
            commands.push({ id: COPY_EVALUATE_PATH_ID, args: [{ variable }] });
        }
        return this.renderValue(data.value, variable, {
            showChanged: options.showChanged,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            hover: { commands },
            highlights: highlights.value,
            colorize: true,
            session: variable.getSession(),
        });
    }
    renderValue(container, expressionOrValue, options = {}) {
        const store = new DisposableStore();
        // Use remembered capabilities so REPL elements can render even once a session ends
        const supportsANSI = options.session?.rememberedCapabilities?.supportsANSIStyling ?? options.wasANSI ?? false;
        let value = typeof expressionOrValue === 'string' ? expressionOrValue : expressionOrValue.value;
        // remove stale classes
        for (const cls of allClasses) {
            container.classList.remove(cls);
        }
        container.classList.add("value" /* Cls.Value */);
        // when resolving expressions we represent errors from the server as a variable with name === null.
        if (value === null ||
            ((expressionOrValue instanceof Expression ||
                expressionOrValue instanceof Variable ||
                expressionOrValue instanceof ReplEvaluationResult) &&
                !expressionOrValue.available)) {
            container.classList.add("unavailable" /* Cls.Unavailable */);
            if (value !== Expression.DEFAULT_VALUE) {
                container.classList.add("error" /* Cls.Error */);
            }
        }
        else {
            if (typeof expressionOrValue !== 'string' &&
                options.showChanged &&
                expressionOrValue.valueChanged &&
                value !== Expression.DEFAULT_VALUE) {
                // value changed color has priority over other colors.
                container.classList.add("changed" /* Cls.Changed */);
                expressionOrValue.valueChanged = false;
            }
            if (options.colorize && typeof expressionOrValue !== 'string') {
                if (expressionOrValue.type === 'number' ||
                    expressionOrValue.type === 'boolean' ||
                    expressionOrValue.type === 'string') {
                    container.classList.add(expressionOrValue.type);
                }
                else if (!isNaN(+value)) {
                    container.classList.add("number" /* Cls.Number */);
                }
                else if (booleanRegex.test(value)) {
                    container.classList.add("boolean" /* Cls.Boolean */);
                }
                else if (stringRegex.test(value)) {
                    container.classList.add("string" /* Cls.String */);
                }
            }
        }
        if (options.maxValueLength && value && value.length > options.maxValueLength) {
            value = value.substring(0, options.maxValueLength) + '...';
        }
        if (!value) {
            value = '';
        }
        const session = options.session ??
            (expressionOrValue instanceof ExpressionContainer
                ? expressionOrValue.getSession()
                : undefined);
        // Only use hovers for links if thre's not going to be a hover for the value.
        const hoverBehavior = options.hover === false
            ? { type: 0 /* DebugLinkHoverBehavior.Rich */, store }
            : { type: 2 /* DebugLinkHoverBehavior.None */ };
        dom.clearNode(container);
        const locationReference = options.locationReference ??
            (expressionOrValue instanceof ExpressionContainer && expressionOrValue.valueLocationReference);
        let linkDetector = this.linkDetector;
        if (locationReference && session) {
            linkDetector = this.linkDetector.makeReferencedLinkDetector(locationReference, session);
        }
        if (supportsANSI) {
            container.appendChild(handleANSIOutput(value, linkDetector, session ? session.root : undefined, options.highlights));
        }
        else {
            container.appendChild(linkDetector.linkify(value, false, session?.root, true, hoverBehavior, options.highlights));
        }
        if (options.hover !== false) {
            const { commands = [] } = options.hover || {};
            store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), container, () => {
                const container = dom.$('div');
                const markdownHoverElement = dom.$('div.hover-row');
                const hoverContentsElement = dom.append(markdownHoverElement, dom.$('div.hover-contents'));
                const hoverContentsPre = dom.append(hoverContentsElement, dom.$('pre.debug-var-hover-pre'));
                if (supportsANSI) {
                    // note: intentionally using `this.linkDetector` so we don't blindly linkify the
                    // entire contents and instead only link file paths that it contains.
                    hoverContentsPre.appendChild(handleANSIOutput(value, this.linkDetector, session ? session.root : undefined, options.highlights));
                }
                else {
                    hoverContentsPre.textContent = value;
                }
                container.appendChild(markdownHoverElement);
                return container;
            }, {
                actions: commands.map(({ id, args }) => {
                    const description = CommandsRegistry.getCommand(id)?.metadata?.description;
                    return {
                        label: typeof description === 'string'
                            ? description
                            : description
                                ? description.value
                                : id,
                        commandId: id,
                        run: () => this.commandService.executeCommand(id, ...args),
                    };
                }),
            }));
        }
        return store;
    }
};
DebugExpressionRenderer = __decorate([
    __param(0, ICommandService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IHoverService)
], DebugExpressionRenderer);
export { DebugExpressionRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHByZXNzaW9uUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnRXhwcmVzc2lvblJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBRW5GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFFekcsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM3RCxPQUFPLEVBQXlCLGdDQUFnQyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3pFLE9BQU8sRUFJTixZQUFZLEdBQ1osTUFBTSxtQkFBbUIsQ0FBQTtBQStCMUIsTUFB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