/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFalsyOrEmpty } from '../../../base/common/arrays.js';
import { Schemas, matchesSomeScheme } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as languages from '../../../editor/common/languages.js';
import { decodeSemanticTokensDto } from '../../../editor/common/services/semanticTokensDto.js';
import { validateWhenClauses } from '../../../platform/contextkey/common/contextkey.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult, } from './extHostCommands.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as types from './extHostTypes.js';
//#region --- NEW world
const newCommands = [
    // -- document highlights
    new ApiCommand('vscode.executeDocumentHighlights', '_executeDocumentHighlights', 'Execute document highlight provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of DocumentHighlight-instances.', tryMapWith(typeConverters.DocumentHighlight.to))),
    // -- document symbols
    new ApiCommand('vscode.executeDocumentSymbolProvider', '_executeDocumentSymbolProvider', 'Execute document symbol provider.', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.', (value, apiArgs) => {
        if (isFalsyOrEmpty(value)) {
            return undefined;
        }
        class MergedInfo extends types.SymbolInformation {
            static to(symbol) {
                const res = new MergedInfo(symbol.name, typeConverters.SymbolKind.to(symbol.kind), symbol.containerName || '', new types.Location(apiArgs[0], typeConverters.Range.to(symbol.range)));
                res.detail = symbol.detail;
                res.range = res.location.range;
                res.selectionRange = typeConverters.Range.to(symbol.selectionRange);
                res.children = symbol.children ? symbol.children.map(MergedInfo.to) : [];
                return res;
            }
        }
        return value.map(MergedInfo.to);
    })),
    // -- formatting
    new ApiCommand('vscode.executeFormatDocumentProvider', '_executeFormatDocumentProvider', 'Execute document format provider.', [
        ApiCommandArgument.Uri,
        new ApiCommandArgument('options', 'Formatting options', (_) => true, (v) => v),
    ], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    new ApiCommand('vscode.executeFormatRangeProvider', '_executeFormatRangeProvider', 'Execute range format provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Range,
        new ApiCommandArgument('options', 'Formatting options', (_) => true, (v) => v),
    ], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    new ApiCommand('vscode.executeFormatOnTypeProvider', '_executeFormatOnTypeProvider', 'Execute format on type provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Position,
        new ApiCommandArgument('ch', 'Trigger character', (v) => typeof v === 'string', (v) => v),
        new ApiCommandArgument('options', 'Formatting options', (_) => true, (v) => v),
    ], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    // -- go to symbol (definition, type definition, declaration, impl, references)
    new ApiCommand('vscode.executeDefinitionProvider', '_executeDefinitionProvider', 'Execute all definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeDefinitionProvider_recursive', '_executeDefinitionProvider_recursive', 'Execute all definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeTypeDefinitionProvider', '_executeTypeDefinitionProvider', 'Execute all type definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeTypeDefinitionProvider_recursive', '_executeTypeDefinitionProvider_recursive', 'Execute all type definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeDeclarationProvider', '_executeDeclarationProvider', 'Execute all declaration providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeDeclarationProvider_recursive', '_executeDeclarationProvider_recursive', 'Execute all declaration providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeImplementationProvider', '_executeImplementationProvider', 'Execute all implementation providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeImplementationProvider_recursive', '_executeImplementationProvider_recursive', 'Execute all implementation providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeReferenceProvider', '_executeReferenceProvider', 'Execute all reference providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location-instances.', tryMapWith(typeConverters.location.to))),
    new ApiCommand('vscode.experimental.executeReferenceProvider', '_executeReferenceProvider_recursive', 'Execute all reference providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location-instances.', tryMapWith(typeConverters.location.to))),
    // -- hover
    new ApiCommand('vscode.executeHoverProvider', '_executeHoverProvider', 'Execute all hover providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Hover-instances.', tryMapWith(typeConverters.Hover.to))),
    new ApiCommand('vscode.experimental.executeHoverProvider_recursive', '_executeHoverProvider_recursive', 'Execute all hover providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Hover-instances.', tryMapWith(typeConverters.Hover.to))),
    // -- selection range
    new ApiCommand('vscode.executeSelectionRangeProvider', '_executeSelectionRangeProvider', 'Execute selection range provider.', [
        ApiCommandArgument.Uri,
        new ApiCommandArgument('position', 'A position in a text document', (v) => Array.isArray(v) && v.every((v) => types.Position.isPosition(v)), (v) => v.map(typeConverters.Position.from)),
    ], new ApiCommandResult('A promise that resolves to an array of ranges.', (result) => {
        return result.map((ranges) => {
            let node;
            for (const range of ranges.reverse()) {
                node = new types.SelectionRange(typeConverters.Range.to(range), node);
            }
            return node;
        });
    })),
    // -- symbol search
    new ApiCommand('vscode.executeWorkspaceSymbolProvider', '_executeWorkspaceSymbolProvider', 'Execute all workspace symbol providers.', [ApiCommandArgument.String.with('query', 'Search string')], new ApiCommandResult('A promise that resolves to an array of SymbolInformation-instances.', (value) => {
        return value.map(typeConverters.WorkspaceSymbol.to);
    })),
    // --- call hierarchy
    new ApiCommand('vscode.prepareCallHierarchy', '_executePrepareCallHierarchy', 'Prepare call hierarchy at a position inside a document', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of CallHierarchyItem-instances', (v) => v.map(typeConverters.CallHierarchyItem.to))),
    new ApiCommand('vscode.provideIncomingCalls', '_executeProvideIncomingCalls', 'Compute incoming calls for an item', [ApiCommandArgument.CallHierarchyItem], new ApiCommandResult('A promise that resolves to an array of CallHierarchyIncomingCall-instances', (v) => v.map(typeConverters.CallHierarchyIncomingCall.to))),
    new ApiCommand('vscode.provideOutgoingCalls', '_executeProvideOutgoingCalls', 'Compute outgoing calls for an item', [ApiCommandArgument.CallHierarchyItem], new ApiCommandResult('A promise that resolves to an array of CallHierarchyOutgoingCall-instances', (v) => v.map(typeConverters.CallHierarchyOutgoingCall.to))),
    // --- rename
    new ApiCommand('vscode.prepareRename', '_executePrepareRename', 'Execute the prepareRename of rename provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to a range and placeholder text.', (value) => {
        if (!value) {
            return undefined;
        }
        return {
            range: typeConverters.Range.to(value.range),
            placeholder: value.text,
        };
    })),
    new ApiCommand('vscode.executeDocumentRenameProvider', '_executeDocumentRenameProvider', 'Execute rename provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Position,
        ApiCommandArgument.String.with('newName', 'The new symbol name'),
    ], new ApiCommandResult('A promise that resolves to a WorkspaceEdit.', (value) => {
        if (!value) {
            return undefined;
        }
        if (value.rejectReason) {
            throw new Error(value.rejectReason);
        }
        return typeConverters.WorkspaceEdit.to(value);
    })),
    // --- links
    new ApiCommand('vscode.executeLinkProvider', '_executeLinkProvider', 'Execute document link provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Number.with('linkResolveCount', 'Number of links that should be resolved, only when links are unresolved.').optional(),
    ], new ApiCommandResult('A promise that resolves to an array of DocumentLink-instances.', (value) => value.map(typeConverters.DocumentLink.to))),
    // --- semantic tokens
    new ApiCommand('vscode.provideDocumentSemanticTokensLegend', '_provideDocumentSemanticTokensLegend', 'Provide semantic tokens legend for a document', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to SemanticTokensLegend.', (value) => {
        if (!value) {
            return undefined;
        }
        return new types.SemanticTokensLegend(value.tokenTypes, value.tokenModifiers);
    })),
    new ApiCommand('vscode.provideDocumentSemanticTokens', '_provideDocumentSemanticTokens', 'Provide semantic tokens for a document', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to SemanticTokens.', (value) => {
        if (!value) {
            return undefined;
        }
        const semanticTokensDto = decodeSemanticTokensDto(value);
        if (semanticTokensDto.type !== 'full') {
            // only accepting full semantic tokens from provideDocumentSemanticTokens
            return undefined;
        }
        return new types.SemanticTokens(semanticTokensDto.data, undefined);
    })),
    new ApiCommand('vscode.provideDocumentRangeSemanticTokensLegend', '_provideDocumentRangeSemanticTokensLegend', 'Provide semantic tokens legend for a document range', [ApiCommandArgument.Uri, ApiCommandArgument.Range.optional()], new ApiCommandResult('A promise that resolves to SemanticTokensLegend.', (value) => {
        if (!value) {
            return undefined;
        }
        return new types.SemanticTokensLegend(value.tokenTypes, value.tokenModifiers);
    })),
    new ApiCommand('vscode.provideDocumentRangeSemanticTokens', '_provideDocumentRangeSemanticTokens', 'Provide semantic tokens for a document range', [ApiCommandArgument.Uri, ApiCommandArgument.Range], new ApiCommandResult('A promise that resolves to SemanticTokens.', (value) => {
        if (!value) {
            return undefined;
        }
        const semanticTokensDto = decodeSemanticTokensDto(value);
        if (semanticTokensDto.type !== 'full') {
            // only accepting full semantic tokens from provideDocumentRangeSemanticTokens
            return undefined;
        }
        return new types.SemanticTokens(semanticTokensDto.data, undefined);
    })),
    // --- completions
    new ApiCommand('vscode.executeCompletionItemProvider', '_executeCompletionItemProvider', 'Execute completion item provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Position,
        ApiCommandArgument.String.with('triggerCharacter', 'Trigger completion when the user types the character, like `,` or `(`').optional(),
        ApiCommandArgument.Number.with('itemResolveCount', 'Number of completions to resolve (too large numbers slow down completions)').optional(),
    ], new ApiCommandResult('A promise that resolves to a CompletionList-instance.', (value, _args, converter) => {
        if (!value) {
            return new types.CompletionList([]);
        }
        const items = value.suggestions.map((suggestion) => typeConverters.CompletionItem.to(suggestion, converter));
        return new types.CompletionList(items, value.incomplete);
    })),
    // --- signature help
    new ApiCommand('vscode.executeSignatureHelpProvider', '_executeSignatureHelpProvider', 'Execute signature help provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Position,
        ApiCommandArgument.String.with('triggerCharacter', 'Trigger signature help when the user types the character, like `,` or `(`').optional(),
    ], new ApiCommandResult('A promise that resolves to SignatureHelp.', (value) => {
        if (value) {
            return typeConverters.SignatureHelp.to(value);
        }
        return undefined;
    })),
    // --- code lens
    new ApiCommand('vscode.executeCodeLensProvider', '_executeCodeLensProvider', 'Execute code lens provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Number.with('itemResolveCount', 'Number of lenses that should be resolved and returned. Will only return resolved lenses, will impact performance)').optional(),
    ], new ApiCommandResult('A promise that resolves to an array of CodeLens-instances.', (value, _args, converter) => {
        return tryMapWith((item) => {
            return new types.CodeLens(typeConverters.Range.to(item.range), item.command && converter.fromInternal(item.command));
        })(value);
    })),
    // --- code actions
    new ApiCommand('vscode.executeCodeActionProvider', '_executeCodeActionProvider', 'Execute code action provider.', [
        ApiCommandArgument.Uri,
        new ApiCommandArgument('rangeOrSelection', 'Range in a text document. Some refactoring provider requires Selection object.', (v) => types.Range.isRange(v), (v) => types.Selection.isSelection(v)
            ? typeConverters.Selection.from(v)
            : typeConverters.Range.from(v)),
        ApiCommandArgument.String.with('kind', 'Code action kind to return code actions for').optional(),
        ApiCommandArgument.Number.with('itemResolveCount', 'Number of code actions to resolve (too large numbers slow down code actions)').optional(),
    ], new ApiCommandResult('A promise that resolves to an array of Command-instances.', (value, _args, converter) => {
        return tryMapWith((codeAction) => {
            if (codeAction._isSynthetic) {
                if (!codeAction.command) {
                    throw new Error('Synthetic code actions must have a command');
                }
                return converter.fromInternal(codeAction.command);
            }
            else {
                const ret = new types.CodeAction(codeAction.title, codeAction.kind ? new types.CodeActionKind(codeAction.kind) : undefined);
                if (codeAction.edit) {
                    ret.edit = typeConverters.WorkspaceEdit.to(codeAction.edit);
                }
                if (codeAction.command) {
                    ret.command = converter.fromInternal(codeAction.command);
                }
                ret.isPreferred = codeAction.isPreferred;
                return ret;
            }
        })(value);
    })),
    // --- colors
    new ApiCommand('vscode.executeDocumentColorProvider', '_executeDocumentColorProvider', 'Execute document color provider.', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of ColorInformation objects.', (result) => {
        if (result) {
            return result.map((ci) => new types.ColorInformation(typeConverters.Range.to(ci.range), typeConverters.Color.to(ci.color)));
        }
        return [];
    })),
    new ApiCommand('vscode.executeColorPresentationProvider', '_executeColorPresentationProvider', 'Execute color presentation provider.', [
        new ApiCommandArgument('color', 'The color to show and insert', (v) => v instanceof types.Color, typeConverters.Color.from),
        new ApiCommandArgument('context', 'Context object with uri and range', (_v) => true, (v) => ({ uri: v.uri, range: typeConverters.Range.from(v.range) })),
    ], new ApiCommandResult('A promise that resolves to an array of ColorPresentation objects.', (result) => {
        if (result) {
            return result.map(typeConverters.ColorPresentation.to);
        }
        return [];
    })),
    // --- inline hints
    new ApiCommand('vscode.executeInlayHintProvider', '_executeInlayHintProvider', 'Execute inlay hints provider', [ApiCommandArgument.Uri, ApiCommandArgument.Range], new ApiCommandResult('A promise that resolves to an array of Inlay objects', (result, args, converter) => {
        return result.map(typeConverters.InlayHint.to.bind(undefined, converter));
    })),
    // --- folding
    new ApiCommand('vscode.executeFoldingRangeProvider', '_executeFoldingRangeProvider', 'Execute folding range provider', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of FoldingRange objects', (result, args) => {
        if (result) {
            return result.map(typeConverters.FoldingRange.to);
        }
        return undefined;
    })),
    // --- notebooks
    new ApiCommand('vscode.resolveNotebookContentProviders', '_resolveNotebookContentProvider', 'Resolve Notebook Content Providers', [
    // new ApiCommandArgument<string, string>('viewType', '', v => typeof v === 'string', v => v),
    // new ApiCommandArgument<string, string>('displayName', '', v => typeof v === 'string', v => v),
    // new ApiCommandArgument<object, object>('options', '', v => typeof v === 'object', v => v),
    ], new ApiCommandResult('A promise that resolves to an array of NotebookContentProvider static info objects.', tryMapWith((item) => {
        return {
            viewType: item.viewType,
            displayName: item.displayName,
            options: {
                transientOutputs: item.options.transientOutputs,
                transientCellMetadata: item.options.transientCellMetadata,
                transientDocumentMetadata: item.options.transientDocumentMetadata,
            },
            filenamePattern: item.filenamePattern.map((pattern) => typeConverters.NotebookExclusiveDocumentPattern.to(pattern)),
        };
    }))),
    // --- debug support
    new ApiCommand('vscode.executeInlineValueProvider', '_executeInlineValueProvider', 'Execute inline value provider', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Range,
        new ApiCommandArgument('context', 'An InlineValueContext', (v) => v && typeof v.frameId === 'number' && v.stoppedLocation instanceof types.Range, (v) => typeConverters.InlineValueContext.from(v)),
    ], new ApiCommandResult('A promise that resolves to an array of InlineValue objects', (result) => {
        return result.map(typeConverters.InlineValue.to);
    })),
    // --- open'ish commands
    new ApiCommand('vscode.open', '_workbench.open', 'Opens the provided resource in the editor. Can be a text or binary file, or an http(s) URL. If you need more control over the options for opening a text file, use vscode.window.showTextDocument instead.', [
        new ApiCommandArgument('uriOrString', 'Uri-instance or string (only http/https)', (v) => URI.isUri(v) ||
            (typeof v === 'string' && matchesSomeScheme(v, Schemas.http, Schemas.https)), (v) => v),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', (v) => v === undefined || typeof v === 'number' || typeof v === 'object', (v) => !v
            ? v
            : typeof v === 'number'
                ? [typeConverters.ViewColumn.from(v), undefined]
                : [
                    typeConverters.ViewColumn.from(v.viewColumn),
                    typeConverters.TextEditorOpenOptions.from(v),
                ]).optional(),
        ApiCommandArgument.String.with('label', '').optional(),
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.openWith', '_workbench.openWith', 'Opens the provided resource with a specific editor.', [
        ApiCommandArgument.Uri.with('resource', 'Resource to open'),
        ApiCommandArgument.String.with('viewId', "Custom editor view id. This should be the viewType string for custom editors or the notebookType string for notebooks. Use 'default' to use VS Code's default text editor"),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', (v) => v === undefined || typeof v === 'number' || typeof v === 'object', (v) => !v
            ? v
            : typeof v === 'number'
                ? [typeConverters.ViewColumn.from(v), undefined]
                : [
                    typeConverters.ViewColumn.from(v.viewColumn),
                    typeConverters.TextEditorOpenOptions.from(v),
                ]).optional(),
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.diff', '_workbench.diff', 'Opens the provided resources in the diff editor to compare their contents.', [
        ApiCommandArgument.Uri.with('left', 'Left-hand side resource of the diff editor'),
        ApiCommandArgument.Uri.with('right', 'Right-hand side resource of the diff editor'),
        ApiCommandArgument.String.with('title', 'Human readable title for the diff editor').optional(),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', (v) => v === undefined || typeof v === 'object', (v) => v && [
            typeConverters.ViewColumn.from(v.viewColumn),
            typeConverters.TextEditorOpenOptions.from(v),
        ]).optional(),
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.changes', '_workbench.changes', 'Opens a list of resources in the changes editor to compare their contents.', [
        ApiCommandArgument.String.with('title', 'Human readable title for the changes editor'),
        new ApiCommandArgument('resourceList', 'List of resources to compare', (resources) => {
            for (const resource of resources) {
                if (resource.length !== 3) {
                    return false;
                }
                const [label, left, right] = resource;
                if (!URI.isUri(label) ||
                    (!URI.isUri(left) && left !== undefined && left !== null) ||
                    (!URI.isUri(right) && right !== undefined && right !== null)) {
                    return false;
                }
            }
            return true;
        }, (v) => v),
    ], ApiCommandResult.Void),
    // --- type hierarchy
    new ApiCommand('vscode.prepareTypeHierarchy', '_executePrepareTypeHierarchy', 'Prepare type hierarchy at a position inside a document', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', (v) => v.map(typeConverters.TypeHierarchyItem.to))),
    new ApiCommand('vscode.provideSupertypes', '_executeProvideSupertypes', 'Compute supertypes for an item', [ApiCommandArgument.TypeHierarchyItem], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', (v) => v.map(typeConverters.TypeHierarchyItem.to))),
    new ApiCommand('vscode.provideSubtypes', '_executeProvideSubtypes', 'Compute subtypes for an item', [ApiCommandArgument.TypeHierarchyItem], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', (v) => v.map(typeConverters.TypeHierarchyItem.to))),
    // --- testing
    new ApiCommand('vscode.revealTestInExplorer', '_revealTestInExplorer', 'Reveals a test instance in the explorer', [ApiCommandArgument.TestItem], ApiCommandResult.Void),
    new ApiCommand('vscode.startContinuousTestRun', 'testing.startContinuousRunFromExtension', 'Starts running the given tests with continuous run mode.', [ApiCommandArgument.TestProfile, ApiCommandArgument.Arr(ApiCommandArgument.TestItem)], ApiCommandResult.Void),
    new ApiCommand('vscode.stopContinuousTestRun', 'testing.stopContinuousRunFromExtension', 'Stops running the given tests with continuous run mode.', [ApiCommandArgument.Arr(ApiCommandArgument.TestItem)], ApiCommandResult.Void),
    // --- continue edit session
    new ApiCommand('vscode.experimental.editSession.continue', '_workbench.editSessions.actions.continueEditSession', 'Continue the current edit session in a different workspace', [
        ApiCommandArgument.Uri.with('workspaceUri', 'The target workspace to continue the current edit session in'),
    ], ApiCommandResult.Void),
    // --- context keys
    new ApiCommand('setContext', '_setContext', 'Set a custom context key value that can be used in when clauses.', [
        ApiCommandArgument.String.with('name', 'The context key name'),
        new ApiCommandArgument('value', 'The context key value', () => true, (v) => v),
    ], ApiCommandResult.Void),
    // --- inline chat
    new ApiCommand('vscode.editorChat.start', 'inlineChat.start', 'Invoke a new editor chat session', [
        new ApiCommandArgument('Run arguments', '', (_v) => true, (v) => {
            if (!v) {
                return undefined;
            }
            return {
                initialRange: v.initialRange ? typeConverters.Range.from(v.initialRange) : undefined,
                initialSelection: types.Selection.isSelection(v.initialSelection)
                    ? typeConverters.Selection.from(v.initialSelection)
                    : undefined,
                message: v.message,
                autoSend: v.autoSend,
                position: v.position ? typeConverters.Position.from(v.position) : undefined,
            };
        }),
    ], ApiCommandResult.Void),
];
//#endregion
//#region OLD world
export class ExtHostApiCommands {
    static register(commands) {
        newCommands.forEach(commands.registerApiCommand, commands);
        this._registerValidateWhenClausesCommand(commands);
    }
    static _registerValidateWhenClausesCommand(commands) {
        commands.registerCommand(false, '_validateWhenClauses', validateWhenClauses);
    }
}
function tryMapWith(f) {
    return (value) => {
        if (Array.isArray(value)) {
            return value.map(f);
        }
        return undefined;
    };
}
function mapLocationOrLocationLink(values) {
    if (!Array.isArray(values)) {
        return undefined;
    }
    const result = [];
    for (const item of values) {
        if (languages.isLocationLink(item)) {
            result.push(typeConverters.DefinitionLink.to(item));
        }
        else {
            result.push(typeConverters.location.to(item));
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEFwaUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBSWpELE9BQU8sS0FBSyxTQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFXdkYsT0FBTyxFQUNOLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsZ0JBQWdCLEdBRWhCLE1BQU0sc0JBQXNCLENBQUE7QUFFN0IsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFBO0FBUTFDLHVCQUF1QjtBQUV2QixNQUFNLFdBQVcsR0FBaUI7SUFDakMseUJBQXlCO0lBQ3pCLElBQUksVUFBVSxDQUNiLGtDQUFrQyxFQUNsQyw0QkFBNEIsRUFDNUIsc0NBQXNDLEVBQ3RDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxFQUNyRCxJQUFJLGdCQUFnQixDQUNuQixxRUFBcUUsRUFDckUsVUFBVSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FDL0MsQ0FDRDtJQUNELHNCQUFzQjtJQUN0QixJQUFJLFVBQVUsQ0FDYixzQ0FB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