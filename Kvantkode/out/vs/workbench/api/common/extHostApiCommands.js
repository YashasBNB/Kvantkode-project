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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QXBpQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFJakQsT0FBTyxLQUFLLFNBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQVd2RixPQUFPLEVBQ04sVUFBVSxFQUNWLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FFaEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUU3QixPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUE7QUFRMUMsdUJBQXVCO0FBRXZCLE1BQU0sV0FBVyxHQUFpQjtJQUNqQyx5QkFBeUI7SUFDekIsSUFBSSxVQUFVLENBQ2Isa0NBQWtDLEVBQ2xDLDRCQUE0QixFQUM1QixzQ0FBc0MsRUFDdEMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQ3JELElBQUksZ0JBQWdCLENBQ25CLHFFQUFxRSxFQUNyRSxVQUFVLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUMvQyxDQUNEO0lBQ0Qsc0JBQXNCO0lB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