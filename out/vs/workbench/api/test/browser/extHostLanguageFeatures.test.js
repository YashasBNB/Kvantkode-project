/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { setUnexpectedErrorHandler, errorHandler } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import * as types from '../../common/extHostTypes.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { Position as EditorPosition, Position } from '../../../../editor/common/core/position.js';
import { Range as EditorRange } from '../../../../editor/common/core/range.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { ExtHostLanguageFeatures } from '../../common/extHostLanguageFeatures.js';
import { MainThreadLanguageFeatures } from '../../browser/mainThreadLanguageFeatures.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import * as languages from '../../../../editor/common/languages.js';
import { getCodeLensModel } from '../../../../editor/contrib/codelens/browser/codelens.js';
import { getDefinitionsAtPosition, getImplementationsAtPosition, getTypeDefinitionsAtPosition, getDeclarationsAtPosition, getReferencesAtPosition, } from '../../../../editor/contrib/gotoSymbol/browser/goToSymbol.js';
import { getHoversPromise } from '../../../../editor/contrib/hover/browser/getHover.js';
import { getOccurrencesAtPosition } from '../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import { getCodeActions } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { getWorkspaceSymbols } from '../../../contrib/search/common/search.js';
import { rename } from '../../../../editor/contrib/rename/browser/rename.js';
import { provideSignatureHelp } from '../../../../editor/contrib/parameterHints/browser/provideSignatureHelp.js';
import { provideSuggestionItems, CompletionOptions, } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { getDocumentFormattingEditsUntilResult, getDocumentRangeFormattingEditsUntilResult, getOnTypeFormattingEdits, } from '../../../../editor/contrib/format/browser/format.js';
import { getLinks } from '../../../../editor/contrib/links/browser/getLinks.js';
import { MainContext, ExtHostContext } from '../../common/extHost.protocol.js';
import { ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { getColors } from '../../../../editor/contrib/colorPicker/browser/color.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { nullExtensionDescription as defaultExtension } from '../../../services/extensions/common/extensions.js';
import { provideSelectionRanges } from '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import { mock } from '../../../../base/test/common/mock.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { OutlineModel } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { CodeActionTriggerSource } from '../../../../editor/contrib/codeAction/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
suite('ExtHostLanguageFeatures', function () {
    const defaultSelector = { scheme: 'far' };
    let model;
    let extHost;
    let mainThread;
    const disposables = new DisposableStore();
    let rpcProtocol;
    let languageFeaturesService;
    let originalErrorHandler;
    let instantiationService;
    setup(() => {
        model = createTextModel(['This is the first line', 'This is the second line', 'This is the third line'].join('\n'), undefined, undefined, URI.parse('far://testing/file.a'));
        rpcProtocol = new TestRPCProtocol();
        languageFeaturesService = new LanguageFeaturesService();
        // Use IInstantiationService to get typechecking when instantiating
        let inst;
        {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IMarkerService, MarkerService);
            instantiationService.set(ILanguageFeaturesService, languageFeaturesService);
            instantiationService.set(IUriIdentityService, new (class extends mock() {
                asCanonicalUri(uri) {
                    return uri;
                }
            })());
            inst = instantiationService;
        }
        originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => { });
        const extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    isDirty: false,
                    versionId: model.getVersionId(),
                    languageId: model.getLanguageId(),
                    uri: model.uri,
                    lines: model.getValue().split(model.getEOL()),
                    EOL: model.getEOL(),
                    encoding: 'utf8',
                },
            ],
        });
        const extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDocuments, extHostDocuments);
        const commands = new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
        rpcProtocol.set(MainContext.MainThreadCommands, disposables.add(inst.createInstance(MainThreadCommands, rpcProtocol)));
        const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService(), new (class extends mock() {
        })(), extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);
        extHost = new ExtHostLanguageFeatures(rpcProtocol, new URITransformerService(null), extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService, new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);
        mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, disposables.add(inst.createInstance(MainThreadLanguageFeatures, rpcProtocol)));
    });
    teardown(() => {
        disposables.clear();
        setUnexpectedErrorHandler(originalErrorHandler);
        model.dispose();
        mainThread.dispose();
        instantiationService.dispose();
        return rpcProtocol.sync();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- outline
    test('DocumentSymbols, register/deregister', async () => {
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 0);
        const d1 = extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [];
            }
        })());
        await rpcProtocol.sync();
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 1);
        d1.dispose();
        return rpcProtocol.sync();
    });
    test('DocumentSymbols, evil provider', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                throw new Error('evil document symbol provider');
            }
        })()));
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
    });
    test('DocumentSymbols, data conversion', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
        const entry = value[0];
        assert.strictEqual(entry.name, 'test');
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Quick Outline uses a not ideal sorting, #138502', async function () {
        const symbols = [
            {
                name: 'containers',
                range: { startLineNumber: 1, startColumn: 1, endLineNumber: 4, endColumn: 26 },
            },
            {
                name: 'container 0',
                range: { startLineNumber: 2, startColumn: 5, endLineNumber: 5, endColumn: 1 },
            },
            {
                name: 'name',
                range: { startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 16 },
            },
            {
                name: 'ports',
                range: { startLineNumber: 3, startColumn: 5, endLineNumber: 5, endColumn: 1 },
            },
            {
                name: 'ports 0',
                range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 },
            },
            {
                name: 'containerPort',
                range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 },
            },
        ];
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, {
            provideDocumentSymbols: (doc, token) => {
                return symbols.map((s) => {
                    return new types.SymbolInformation(s.name, types.SymbolKind.Object, new types.Range(s.range.startLineNumber - 1, s.range.startColumn - 1, s.range.endLineNumber - 1, s.range.endColumn - 1));
                });
            },
        }));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 6);
        assert.deepStrictEqual(value.map((s) => s.name), ['containers', 'container 0', 'name', 'ports', 'ports 0', 'containerPort']);
    });
    // --- code lens
    test('CodeLens, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    throw new Error('evil');
                }
            })()));
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            value.dispose();
        });
    });
    test('CodeLens, do not resolve a resolved lens', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [
                        new types.CodeLens(new types.Range(0, 0, 0, 0), { command: 'id', title: 'Title' }),
                    ];
                }
                resolveCodeLens() {
                    assert.ok(false, 'do not resolve');
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol.command.id, 'id');
            assert.strictEqual(symbol.command.title, 'Title');
            value.dispose();
        });
    });
    test('CodeLens, missing command', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol, undefined);
            value.dispose();
        });
    });
    // --- definition
    test('Definition, data conversion', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    test('Definition, one or many', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 1, 1, 1))];
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(2, 1, 1, 1));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
    });
    test('Definition, registration order', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(URI.parse('far://first'), new types.Range(2, 3, 4, 5))];
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(URI.parse('far://second'), new types.Range(1, 2, 3, 4));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        // let [first, second] = value;
        assert.strictEqual(value[0].uri.authority, 'second');
        assert.strictEqual(value[1].uri.authority, 'first');
    });
    test('Definition, evil provider', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                throw new Error('evil provider');
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(1, 1, 1, 1));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // -- declaration
    test('Declaration, data conversion', async () => {
        disposables.add(extHost.registerDeclarationProvider(defaultExtension, defaultSelector, new (class {
            provideDeclaration() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- implementation
    test('Implementation, data conversion', async () => {
        disposables.add(extHost.registerImplementationProvider(defaultExtension, defaultSelector, new (class {
            provideImplementation() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- type definition
    test('Type Definition, data conversion', async () => {
        disposables.add(extHost.registerTypeDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideTypeDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- extra info
    test('HoverProvider, word range at pos', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello');
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
    });
    test('HoverProvider, given range', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello', new types.Range(3, 0, 8, 7));
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 4,
            startColumn: 1,
            endLineNumber: 9,
            endColumn: 8,
        });
    });
    test('HoverProvider, registration order', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('registered first');
            }
        })()));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('registered second');
            }
        })()));
        await rpcProtocol.sync();
        const value = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.contents[0].value, 'registered second');
        assert.strictEqual(second.contents[0].value, 'registered first');
    });
    test('HoverProvider, evil provider', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello');
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
    });
    // --- occurrences
    test('Occurrences, data conversion', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 1/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return undefined;
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 2/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 2))];
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 3,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, evil provider', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None);
        assert.strictEqual(value.size, 1);
    });
    // --- references
    test('References, registration order', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [
                    new types.Location(URI.parse('far://register/first'), new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [
                    new types.Location(URI.parse('far://register/second'), new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.uri.path, '/second');
        assert.strictEqual(second.uri.path, '/first');
    });
    test('References, data conversion', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Position(0, 0))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [item] = value;
        assert.deepStrictEqual(item.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
        assert.strictEqual(item.uri.toString(), model.uri.toString());
    });
    test('References, evil provider', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Range(0, 0, 0, 0))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // --- quick fix
    test('Quick Fix, command data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        { command: 'test1', title: 'Testing1' },
                        { command: 'test2', title: 'Testing2' },
                    ];
                },
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.QuickFix,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 2);
            const [first, second] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(second.action.title, 'Testing2');
            assert.strictEqual(second.action.command.id, 'test2');
            value.dispose();
        });
    });
    test('Quick Fix, code action data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        {
                            title: 'Testing1',
                            command: { title: 'Testing1Command', command: 'test1' },
                            kind: types.CodeActionKind.Empty.append('test.scope'),
                        },
                    ];
                },
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.Default,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            const [first] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.title, 'Testing1Command');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(first.action.kind, 'test.scope');
            value.dispose();
        });
    });
    test("Cannot read property 'id' of undefined, #29469", async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    return [undefined, null, { command: 'test', title: 'Testing' }];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.Default,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    test('Quick Fix, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    throw new Error('evil');
                }
            })()));
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    return [{ command: 'test', title: 'Testing' }];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.QuickFix,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    // --- navigate types
    test('Navigate types, evil provider', async () => {
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('testing', types.SymbolKind.Array, new types.Range(0, 0, 1, 1)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.symbol.name, 'testing');
    });
    test('Navigate types, de-duplicate results', async () => {
        const uri = URI.from({ scheme: 'foo', path: '/some/path' });
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ];
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ]; // get de-duped
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, undefined)),
                ]; // NO dedupe because of resolve
            }
            resolveWorkspaceSymbol(a) {
                return a;
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Struct, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ]; // NO dedupe because of kind
            }
        })()));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 3);
    });
    // --- rename
    test('Rename, evil provider 0/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                throw new (class Foo {
                })();
            }
        })()));
        await rpcProtocol.sync();
        try {
            await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
            throw Error();
        }
        catch (err) {
            // expected
        }
    });
    test('Rename, evil provider 1/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                throw Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.rejectReason, 'evil');
    });
    test('Rename, evil provider 2/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new (class {
            provideRenameEdits() {
                throw Error('evil');
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                return edit;
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.edits.length, 1);
    });
    test('Rename, ordering', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new (class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                edit.replace(model.uri, new types.Range(1, 0, 1, 0), 'testing');
                return edit;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                return;
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // least relevant rename provider
        assert.strictEqual(value.edits.length, 2);
    });
    test("Multiple RenameProviders don't respect all possible PrepareRename handlers 1/2, #98352", async function () {
        const called = [false, false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[2] = true;
                return Promise.reject('Cannot rename this symbol2.');
            }
            provideRenameEdits() {
                called[3] = true;
                return undefined;
            }
        })()));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.deepStrictEqual(called, [true, true, true, false]);
    });
    test("Multiple RenameProviders don't respect all possible PrepareRename handlers 2/2, #98352", async function () {
        const called = [false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits(document, position, newName) {
                called[2] = true;
                return new types.WorkspaceEdit();
            }
        })()));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // first provider has NO prepare which means it is taken by default
        assert.deepStrictEqual(called, [false, false, true]);
    });
    // --- parameter hints
    test('Parameter Hints, order', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                return undefined;
            }
        })(), []));
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                return {
                    signatures: [],
                    activeParameter: 0,
                    activeSignature: 0,
                };
            }
        })(), []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.ok(value);
    });
    test('Parameter Hints, evil provider', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                throw new Error('evil');
            }
        })(), []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.strictEqual(value, undefined);
    });
    // --- suggestions
    test('Suggest, order 1/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing1')];
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing2')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'testing2');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 2/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('weak-selector')]; // weaker selector but result
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return []; // stronger selector but not a good result;
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'weak-selector');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 3/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-1')];
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-2')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 2);
            assert.strictEqual(value.items[0].completion.insertText, 'strong-1'); // sort by label
            assert.strictEqual(value.items[1].completion.insertText, 'strong-2');
            value.disposable.dispose();
        });
    });
    test('Suggest, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    throw new Error('evil');
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items[0].container.incomplete, false);
            value.disposable.dispose();
        });
    });
    test('Suggest, CompletionList', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return new types.CompletionList([new types.CompletionItem('hello')], true);
                }
            })(), []));
            await rpcProtocol.sync();
            await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */))).then((model) => {
                assert.strictEqual(model.items[0].container.incomplete, true);
                model.disposable.dispose();
            });
        });
    });
    // --- format
    const NullWorkerService = new (class extends mock() {
        computeMoreMinimalEdits(resource, edits) {
            return Promise.resolve(edits ?? undefined);
        }
    })();
    test('Format Doc, data conversion', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [
                    new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing'),
                    types.TextEdit.setEndOfLine(types.EndOfLine.LF),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
        assert.strictEqual(second.eol, 0 /* EndOfLineSequence.LF */);
        assert.strictEqual(second.text, '');
        assert.deepStrictEqual(second.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Doc, evil provider', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                throw new Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        return getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format Doc, order', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Range, data conversion', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Range, + format_doc', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'range')];
            }
        })()));
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(2, 3, 4, 5), 'range2')];
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 1, 1), 'doc')];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'range2');
        assert.strictEqual(first.range.startLineNumber, 3);
        assert.strictEqual(first.range.startColumn, 4);
        assert.strictEqual(first.range.endLineNumber, 5);
        assert.strictEqual(first.range.endColumn, 6);
    });
    test('Format Range, evil provider', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                throw new Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        return getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format on Type, data conversion', async () => {
        disposables.add(extHost.registerOnTypeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideOnTypeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), arguments[2])];
            }
        })(), [';']));
        await rpcProtocol.sync();
        const value = (await getOnTypeFormattingEdits(NullWorkerService, languageFeaturesService, model, new EditorPosition(1, 1), ';', { insertSpaces: true, tabSize: 2 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, ';');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Links, data conversion', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                const link = new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'));
                link.tooltip = 'tooltip';
                return [link];
            }
        })()));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 2,
        });
        assert.strictEqual(first.tooltip, 'tooltip');
    });
    test('Links, evil provider', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'))];
            }
        })()));
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                throw new Error();
            }
        })()));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 2,
        });
    });
    test('Document colors, data conversion', async () => {
        disposables.add(extHost.registerColorProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentColors() {
                return [
                    new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4)),
                ];
            }
            provideColorPresentations(color, context) {
                return [];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getColors(languageFeaturesService.colorProvider, model, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.deepStrictEqual(first.colorInfo.color, { red: 0.1, green: 0.2, blue: 0.3, alpha: 0.4 });
        assert.deepStrictEqual(first.colorInfo.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 21,
        });
    });
    // -- selection ranges
    test('Selection Ranges, data conversion', async () => {
        disposables.add(extHost.registerSelectionRangeProvider(defaultExtension, defaultSelector, new (class {
            provideSelectionRanges() {
                return [
                    new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
                ];
            }
        })()));
        await rpcProtocol.sync();
        provideSelectionRanges(languageFeaturesService.selectionRangeProvider, model, [new Position(1, 17)], { selectLeadingAndTrailingWhitespace: true, selectSubwords: true }, CancellationToken.None).then((ranges) => {
            assert.strictEqual(ranges.length, 1);
            assert.ok(ranges[0].length >= 2);
        });
    });
    test('Selection Ranges, bad data', async () => {
        try {
            const _a = new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 11, 0, 18)));
            assert.ok(false, String(_a));
        }
        catch (err) {
            assert.ok(true);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDckgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssS0FBSyxNQUFNLDhCQUE4QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxJQUFJLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsS0FBSyxJQUFJLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUs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