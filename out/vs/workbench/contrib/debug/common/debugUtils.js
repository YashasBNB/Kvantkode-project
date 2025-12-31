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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFLNUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQTtBQUVyQyxNQUFNLFVBQVUsU0FBUyxDQUN4QixLQUFhLEVBQ2IsVUFBbUIsRUFDbkIsSUFBMkM7SUFFM0MsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLFVBQVUsS0FBSyxFQUFFLEtBQUs7UUFDNUQsSUFBSSxVQUFVLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3hELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FB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