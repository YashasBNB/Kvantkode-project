/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { deepClone } from '../../../../base/common/objects.js';
import { Schemas } from '../../../../base/common/network.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { coalesce } from '../../../../base/common/arrays.js';
const _formatPIIRegexp = /{([^}]+)}/g;
export function formatPII(value, excludePII, args) {
    return value.replace(_formatPIIRegexp, function (match, group) {
        if (excludePII && group.length > 0 && group[0] !== '_') {
            return match;
        }
        return args && args.hasOwnProperty(group) ? args[group] : match;
    });
}
/**
 * Filters exceptions (keys marked with "!") from the given object. Used to
 * ensure exception data is not sent on web remotes, see #97628.
 */
export function filterExceptionsFromTelemetry(data) {
    const output = {};
    for (const key of Object.keys(data)) {
        if (!key.startsWith('!')) {
            output[key] = data[key];
        }
    }
    return output;
}
export function isSessionAttach(session) {
    return (session.configuration.request === 'attach' &&
        !getExtensionHostDebugSession(session) &&
        (!session.parentSession || isSessionAttach(session.parentSession)));
}
/**
 * Returns the session or any parent which is an extension host debug session.
 * Returns undefined if there's none.
 */
export function getExtensionHostDebugSession(session) {
    let type = session.configuration.type;
    if (!type) {
        return;
    }
    if (type === 'vslsShare') {
        type = session.configuration.adapterProxy.configuration.type;
    }
    if (equalsIgnoreCase(type, 'extensionhost') || equalsIgnoreCase(type, 'pwa-extensionhost')) {
        return session;
    }
    return session.parentSession ? getExtensionHostDebugSession(session.parentSession) : undefined;
}
// only a debugger contributions with a label, program, or runtime attribute is considered a "defining" or "main" debugger contribution
export function isDebuggerMainContribution(dbg) {
    return dbg.type && (dbg.label || dbg.program || dbg.runtime);
}
export function getExactExpressionStartAndEnd(lineContent, looseStart, looseEnd) {
    let matchingExpression = undefined;
    let startOffset = 0;
    // Some example supported expressions: myVar.prop, a.b.c.d, myVar?.prop, myVar->prop, MyClass::StaticProp, *myVar
    // Match any character except a set of characters which often break interesting sub-expressions
    const expression = /([^()\[\]{}<>\s+\-/%~#^;=|,`!]|\->)+/g;
    let result = null;
    // First find the full expression under the cursor
    while ((result = expression.exec(lineContent))) {
        const start = result.index + 1;
        const end = start + result[0].length;
        if (start <= looseStart && end >= looseEnd) {
            matchingExpression = result[0];
            startOffset = start;
            break;
        }
    }
    // If there are non-word characters after the cursor, we want to truncate the expression then.
    // For example in expression 'a.b.c.d', if the focus was under 'b', 'a.b' would be evaluated.
    if (matchingExpression) {
        const subExpression = /(\w|\p{L})+/gu;
        let subExpressionResult = null;
        while ((subExpressionResult = subExpression.exec(matchingExpression))) {
            const subEnd = subExpressionResult.index + 1 + startOffset + subExpressionResult[0].length;
            if (subEnd >= looseEnd) {
                break;
            }
        }
        if (subExpressionResult) {
            matchingExpression = matchingExpression.substring(0, subExpression.lastIndex);
        }
    }
    return matchingExpression
        ? { start: startOffset, end: startOffset + matchingExpression.length - 1 }
        : { start: 0, end: 0 };
}
export async function getEvaluatableExpressionAtPosition(languageFeaturesService, model, position, token) {
    if (languageFeaturesService.evaluatableExpressionProvider.has(model)) {
        const supports = languageFeaturesService.evaluatableExpressionProvider.ordered(model);
        const results = coalesce(await Promise.all(supports.map(async (support) => {
            try {
                return await support.provideEvaluatableExpression(model, position, token ?? CancellationToken.None);
            }
            catch (err) {
                return undefined;
            }
        })));
        if (results.length > 0) {
            let matchingExpression = results[0].expression;
            const range = results[0].range;
            if (!matchingExpression) {
                const lineContent = model.getLineContent(position.lineNumber);
                matchingExpression = lineContent.substring(range.startColumn - 1, range.endColumn - 1);
            }
            return { range, matchingExpression };
        }
    }
    else {
        // old one-size-fits-all strategy
        const lineContent = model.getLineContent(position.lineNumber);
        const { start, end } = getExactExpressionStartAndEnd(lineContent, position.column, position.column);
        // use regex to extract the sub-expression #9821
        const matchingExpression = lineContent.substring(start - 1, end);
        return {
            matchingExpression,
            range: new Range(position.lineNumber, start, position.lineNumber, start + matchingExpression.length),
        };
    }
    return null;
}
// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const _schemePattern = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;
export function isUri(s) {
    // heuristics: a valid uri starts with a scheme and
    // the scheme has at least 2 characters so that it doesn't look like a drive letter.
    return !!(s && s.match(_schemePattern));
}
function stringToUri(source) {
    if (typeof source.path === 'string') {
        if (typeof source.sourceReference === 'number' && source.sourceReference > 0) {
            // if there is a source reference, don't touch path
        }
        else {
            if (isUri(source.path)) {
                return uri.parse(source.path);
            }
            else {
                // assume path
                if (isAbsolute(source.path)) {
                    return uri.file(source.path);
                }
                else {
                    // leave relative path as is
                }
            }
        }
    }
    return source.path;
}
function uriToString(source) {
    if (typeof source.path === 'object') {
        const u = uri.revive(source.path);
        if (u) {
            if (u.scheme === Schemas.file) {
                return u.fsPath;
            }
            else {
                return u.toString();
            }
        }
    }
    return source.path;
}
export function convertToDAPaths(message, toUri) {
    const fixPath = toUri ? stringToUri : uriToString;
    // since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
    const msg = deepClone(message);
    convertPaths(msg, (toDA, source) => {
        if (toDA && source) {
            source.path = fixPath(source);
        }
    });
    return msg;
}
export function convertToVSCPaths(message, toUri) {
    const fixPath = toUri ? stringToUri : uriToString;
    // since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
    const msg = deepClone(message);
    convertPaths(msg, (toDA, source) => {
        if (!toDA && source) {
            source.path = fixPath(source);
        }
    });
    return msg;
}
function convertPaths(msg, fixSourcePath) {
    switch (msg.type) {
        case 'event': {
            const event = msg;
            switch (event.event) {
                case 'output':
                    fixSourcePath(false, event.body.source);
                    break;
                case 'loadedSource':
                    fixSourcePath(false, event.body.source);
                    break;
                case 'breakpoint':
                    fixSourcePath(false, event.body.breakpoint.source);
                    break;
                default:
                    break;
            }
            break;
        }
        case 'request': {
            const request = msg;
            switch (request.command) {
                case 'setBreakpoints':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'breakpointLocations':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'source':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'gotoTargets':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'launchVSCode':
                    request.arguments.args.forEach((arg) => fixSourcePath(false, arg));
                    break;
                default:
                    break;
            }
            break;
        }
        case 'response': {
            const response = msg;
            if (response.success && response.body) {
                switch (response.command) {
                    case 'stackTrace':
                        ;
                        response.body.stackFrames.forEach((frame) => fixSourcePath(false, frame.source));
                        break;
                    case 'loadedSources':
                        ;
                        response.body.sources.forEach((source) => fixSourcePath(false, source));
                        break;
                    case 'scopes':
                        ;
                        response.body.scopes.forEach((scope) => fixSourcePath(false, scope.source));
                        break;
                    case 'setFunctionBreakpoints':
                        ;
                        response.body.breakpoints.forEach((bp) => fixSourcePath(false, bp.source));
                        break;
                    case 'setBreakpoints':
                        ;
                        response.body.breakpoints.forEach((bp) => fixSourcePath(false, bp.source));
                        break;
                    case 'disassemble':
                        {
                            const di = response;
                            di.body?.instructions.forEach((di) => fixSourcePath(false, di.location));
                        }
                        break;
                    case 'locations':
                        fixSourcePath(false, response.body?.source);
                        break;
                    default:
                        break;
                }
            }
            break;
        }
    }
}
export function getVisibleAndSorted(array) {
    return array
        .filter((config) => !config.presentation?.hidden)
        .sort((first, second) => {
        if (!first.presentation) {
            if (!second.presentation) {
                return 0;
            }
            return 1;
        }
        if (!second.presentation) {
            return -1;
        }
        if (!first.presentation.group) {
            if (!second.presentation.group) {
                return compareOrders(first.presentation.order, second.presentation.order);
            }
            return 1;
        }
        if (!second.presentation.group) {
            return -1;
        }
        if (first.presentation.group !== second.presentation.group) {
            return first.presentation.group.localeCompare(second.presentation.group);
        }
        return compareOrders(first.presentation.order, second.presentation.order);
    });
}
function compareOrders(first, second) {
    if (typeof first !== 'number') {
        if (typeof second !== 'number') {
            return 0;
        }
        return 1;
    }
    if (typeof second !== 'number') {
        return -1;
    }
    return first - second;
}
export async function saveAllBeforeDebugStart(configurationService, editorService) {
    const saveBeforeStartConfig = configurationService.getValue('debug.saveBeforeStart', {
        overrideIdentifier: editorService.activeTextEditorLanguageId,
    });
    if (saveBeforeStartConfig !== 'none') {
        await editorService.saveAll();
        if (saveBeforeStartConfig === 'allEditorsInActiveGroup') {
            const activeEditor = editorService.activeEditorPane;
            if (activeEditor && activeEditor.input.resource?.scheme === Schemas.untitled) {
                // Make sure to save the active editor in case it is in untitled file it wont be saved as part of saveAll #111850
                await editorService.save({ editor: activeEditor.input, groupId: activeEditor.group.id });
            }
        }
    }
    await configurationService.reloadConfiguration();
}
export const sourcesEqual = (a, b) => !a || !b
    ? a === b
    : a.name === b.name && a.path === b.path && a.sourceReference === b.sourceReference;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUs1RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzVELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFBO0FBRXJDLE1BQU0sVUFBVSxTQUFTLENBQ3hCLEtBQWEsRUFDYixVQUFtQixFQUNuQixJQUEyQztJQUUzQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxLQUFLLEVBQUUsS0FBSztRQUM1RCxJQUFJLFVBQVUsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDeEQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFB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