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
import { disposableTimeout } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableFromPromise, observableFromValueWithChangeEvent, observableSignalFromEvent, wasEventTriggeredRecently, } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../../debug/common/debug.js';
let EditorTextPropertySignalsContribution = class EditorTextPropertySignalsContribution extends Disposable {
    constructor(_editorService, _instantiationService, _accessibilitySignalService) {
        super();
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._textProperties = [
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.errorAtPosition, AccessibilitySignal.errorOnLine, MarkerSeverity.Error),
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.warningAtPosition, AccessibilitySignal.warningOnLine, MarkerSeverity.Warning),
            this._instantiationService.createInstance(FoldedAreaTextProperty),
            this._instantiationService.createInstance(BreakpointTextProperty),
        ];
        this._someAccessibilitySignalIsEnabled = derived(this, (reader) => this._textProperties
            .flatMap((p) => [p.lineSignal, p.positionSignal])
            .filter(isDefined)
            .some((signal) => observableFromValueWithChangeEvent(this, this._accessibilitySignalService.getEnabledState(signal, false)).read(reader)));
        this._activeEditorObservable = observableFromEvent(this, this._editorService.onDidActiveEditorChange, (_) => {
            const activeTextEditorControl = this._editorService.activeTextEditorControl;
            const editor = isDiffEditor(activeTextEditorControl)
                ? activeTextEditorControl.getOriginalEditor()
                : isCodeEditor(activeTextEditorControl)
                    ? activeTextEditorControl
                    : undefined;
            return editor && editor.hasModel() ? { editor, model: editor.getModel() } : undefined;
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description updateSignalsEnabled */
            if (!this._someAccessibilitySignalIsEnabled.read(reader)) {
                return;
            }
            const activeEditor = this._activeEditorObservable.read(reader);
            if (activeEditor) {
                this._registerAccessibilitySignalsForEditor(activeEditor.editor, activeEditor.model, store);
            }
        }));
    }
    _registerAccessibilitySignalsForEditor(editor, editorModel, store) {
        let lastLine = -1;
        const ignoredLineSignalsForCurrentLine = new Set();
        const timeouts = store.add(new DisposableStore());
        const propertySources = this._textProperties.map((p) => ({
            source: p.createSource(editor, editorModel),
            property: p,
        }));
        const didType = wasEventTriggeredRecently(editor.onDidChangeModelContent, 100, store);
        store.add(editor.onDidChangeCursorPosition((args) => {
            timeouts.clear();
            if (args &&
                args.reason !== 3 /* CursorChangeReason.Explicit */ &&
                args.reason !== 0 /* CursorChangeReason.NotSet */) {
                // Ignore cursor changes caused by navigation (e.g. which happens when execution is paused).
                ignoredLineSignalsForCurrentLine.clear();
                return;
            }
            const trigger = (property, source, mode) => {
                const signal = mode === 'line' ? property.lineSignal : property.positionSignal;
                if (!signal ||
                    !this._accessibilitySignalService.getEnabledState(signal, false).value ||
                    !source.isPresent(position, mode, undefined)) {
                    return;
                }
                for (const modality of ['sound', 'announcement']) {
                    if (this._accessibilitySignalService.getEnabledState(signal, false, modality).value) {
                        const delay = this._accessibilitySignalService.getDelayMs(signal, modality, mode) +
                            (didType.get() ? 1000 : 0);
                        timeouts.add(disposableTimeout(() => {
                            if (source.isPresent(position, mode, undefined)) {
                                if (!(mode === 'line') || !ignoredLineSignalsForCurrentLine.has(property)) {
                                    this._accessibilitySignalService.playSignal(signal, { modality });
                                }
                                ignoredLineSignalsForCurrentLine.add(property);
                            }
                        }, delay));
                    }
                }
            };
            // React to cursor changes
            const position = args.position;
            const lineNumber = position.lineNumber;
            if (lineNumber !== lastLine) {
                ignoredLineSignalsForCurrentLine.clear();
                lastLine = lineNumber;
                for (const p of propertySources) {
                    trigger(p.property, p.source, 'line');
                }
            }
            for (const p of propertySources) {
                trigger(p.property, p.source, 'positional');
            }
            // React to property state changes for the current cursor position
            for (const s of propertySources) {
                if (![s.property.lineSignal, s.property.positionSignal].some((s) => s && this._accessibilitySignalService.getEnabledState(s, false).value)) {
                    return;
                }
                let lastValueAtPosition = undefined;
                let lastValueOnLine = undefined;
                timeouts.add(autorun((reader) => {
                    const newValueAtPosition = s.source.isPresentAtPosition(args.position, reader);
                    const newValueOnLine = s.source.isPresentOnLine(args.position.lineNumber, reader);
                    if (lastValueAtPosition !== undefined && lastValueAtPosition !== undefined) {
                        if (!lastValueAtPosition && newValueAtPosition) {
                            trigger(s.property, s.source, 'positional');
                        }
                        if (!lastValueOnLine && newValueOnLine) {
                            trigger(s.property, s.source, 'line');
                        }
                    }
                    lastValueAtPosition = newValueAtPosition;
                    lastValueOnLine = newValueOnLine;
                }));
            }
        }));
    }
};
EditorTextPropertySignalsContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IInstantiationService),
    __param(2, IAccessibilitySignalService)
], EditorTextPropertySignalsContribution);
export { EditorTextPropertySignalsContribution };
class TextPropertySource {
    static { this.notPresent = new TextPropertySource({
        isPresentAtPosition: () => false,
        isPresentOnLine: () => false,
    }); }
    constructor(options) {
        this.isPresentOnLine = options.isPresentOnLine;
        this.isPresentAtPosition = options.isPresentAtPosition ?? (() => false);
    }
    isPresent(position, mode, reader) {
        return mode === 'line'
            ? this.isPresentOnLine(position.lineNumber, reader)
            : this.isPresentAtPosition(position, reader);
    }
}
let MarkerTextProperty = class MarkerTextProperty {
    constructor(positionSignal, lineSignal, severity, markerService) {
        this.positionSignal = positionSignal;
        this.lineSignal = lineSignal;
        this.severity = severity;
        this.markerService = markerService;
        this.debounceWhileTyping = true;
    }
    createSource(editor, model) {
        const obs = observableSignalFromEvent('onMarkerChanged', this.markerService.onMarkerChanged);
        return new TextPropertySource({
            isPresentAtPosition: (position, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= position.lineNumber &&
                    position.lineNumber <= m.endLineNumber &&
                    m.startColumn <= position.column &&
                    position.column <= m.endColumn);
                return hasMarker;
            },
            isPresentOnLine: (lineNumber, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= lineNumber &&
                    lineNumber <= m.endLineNumber);
                return hasMarker;
            },
        });
    }
};
MarkerTextProperty = __decorate([
    __param(3, IMarkerService)
], MarkerTextProperty);
class FoldedAreaTextProperty {
    constructor() {
        this.lineSignal = AccessibilitySignal.foldedArea;
    }
    createSource(editor, _model) {
        const foldingController = FoldingController.get(editor);
        if (!foldingController) {
            return TextPropertySource.notPresent;
        }
        const foldingModel = observableFromPromise(foldingController.getFoldingModel() ?? Promise.resolve(undefined));
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                const m = foldingModel.read(reader);
                const regionAtLine = m.value?.getRegionAtLine(lineNumber);
                const hasFolding = !regionAtLine
                    ? false
                    : regionAtLine.isCollapsed && regionAtLine.startLineNumber === lineNumber;
                return hasFolding;
            },
        });
    }
}
let BreakpointTextProperty = class BreakpointTextProperty {
    constructor(debugService) {
        this.debugService = debugService;
        this.lineSignal = AccessibilitySignal.break;
    }
    createSource(editor, model) {
        const signal = observableSignalFromEvent('onDidChangeBreakpoints', this.debugService.getModel().onDidChangeBreakpoints);
        const debugService = this.debugService;
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                signal.read(reader);
                const breakpoints = debugService.getModel().getBreakpoints({ uri: model.uri, lineNumber });
                const hasBreakpoints = breakpoints.length > 0;
                return hasBreakpoints;
            },
        });
    }
};
BreakpointTextProperty = __decorate([
    __param(0, IDebugService)
], BreakpointTextProperty);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGV4dFByb3BlcnR5U2lnbmFsc0NvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvZWRpdG9yVGV4dFByb3BlcnR5U2lnbmFsc0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLE9BQU8sRUFDUCxtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLGtDQUFrQyxFQUNsQyx5QkFBeUIsRUFDekIseUJBQXlCLEdBQ3pCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sNkNBQTZDLENBQUE7QUFJcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUVOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFcEQsSUFBTSxx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