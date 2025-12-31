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
var DisassemblyView_1, BreakpointRenderer_1, InstructionRenderer_1;
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { $, addStandardDisposableListener, append, } from '../../../../base/browser/dom.js';
import { binarySearch2 } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { applyFontInfo } from '../../../../editor/browser/config/domFontInfo.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { Range } from '../../../../editor/common/core/range.js';
import { StringBuilder } from '../../../../editor/common/core/stringBuilder.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { focusedStackFrameColor, topStackFrameColor } from './callStackEditorContribution.js';
import * as icons from './debugIcons.js';
import { CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST, DISASSEMBLY_VIEW_ID, IDebugService, } from '../common/debug.js';
import { InstructionBreakpoint } from '../common/debugModel.js';
import { getUriFromSource } from '../common/debugSource.js';
import { isUri, sourcesEqual } from '../common/debugUtils.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
// Special entry as a placeholer when disassembly is not available
const disassemblyNotAvailable = {
    allowBreakpoint: false,
    isBreakpointSet: false,
    isBreakpointEnabled: false,
    instructionReference: '',
    instructionOffset: 0,
    instructionReferenceOffset: 0,
    address: 0n,
    instruction: {
        address: '-1',
        instruction: localize('instructionNotAvailable', 'Disassembly not available.'),
    },
};
let DisassemblyView = class DisassemblyView extends EditorPane {
    static { DisassemblyView_1 = this; }
    static { this.NUM_INSTRUCTIONS_TO_LOAD = 50; }
    constructor(group, telemetryService, themeService, storageService, _configurationService, _instantiationService, _debugService) {
        super(DISASSEMBLY_VIEW_ID, group, telemetryService, themeService, storageService);
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._debugService = _debugService;
        this._instructionBpList = [];
        this._enableSourceCodeRender = true;
        this._loadingLock = false;
        this._referenceToMemoryAddress = new Map();
        this._disassembledInstructions = undefined;
        this._onDidChangeStackFrame = this._register(new Emitter({ leakWarningThreshold: 1000 }));
        this._previousDebuggingState = _debugService.state;
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug')) {
                // show/hide source code requires changing height which WorkbenchTable doesn't support dynamic height, thus force a total reload.
                const newValue = this._configurationService.getValue('debug').disassemblyView
                    .showSourceCode;
                if (this._enableSourceCodeRender !== newValue) {
                    this._enableSourceCodeRender = newValue;
                    // todo: trigger rerender
                }
                else {
                    this._disassembledInstructions?.rerender();
                }
            }
        }));
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
            this._register(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('editor')) {
                    this._fontInfo = this.createFontInfo();
                }
            }));
        }
        return this._fontInfo;
    }
    createFontInfo() {
        return BareFontInfo.createFromRawSettings(this._configurationService.getValue('editor'), PixelRatio.getInstance(this.window).value);
    }
    get currentInstructionAddresses() {
        return this._debugService
            .getModel()
            .getSessions(false)
            .map((session) => session.getAllThreads())
            .reduce((prev, curr) => prev.concat(curr), [])
            .map((thread) => thread.getTopStackFrame())
            .map((frame) => frame?.instructionPointerReference)
            .map((ref) => (ref ? this.getReferenceAddress(ref) : undefined));
    }
    // Instruction reference of the top stack frame of the focused stack
    get focusedCurrentInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.thread.getTopStackFrame()
            ?.instructionPointerReference;
    }
    get focusedCurrentInstructionAddress() {
        const ref = this.focusedCurrentInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get focusedInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.instructionPointerReference;
    }
    get focusedInstructionAddress() {
        const ref = this.focusedInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get isSourceCodeRender() {
        return this._enableSourceCodeRender;
    }
    get debugSession() {
        return this._debugService.getViewModel().focusedSession;
    }
    get onDidChangeStackFrame() {
        return this._onDidChangeStackFrame.event;
    }
    get focusedAddressAndOffset() {
        const element = this._disassembledInstructions?.getFocusedElements()[0];
        if (!element) {
            return undefined;
        }
        const reference = element.instructionReference;
        const offset = Number(element.address - this.getReferenceAddress(reference));
        return { reference, offset, address: element.address };
    }
    createEditor(parent) {
        this._enableSourceCodeRender =
            this._configurationService.getValue('debug').disassemblyView.showSourceCode;
        const lineHeight = this.fontInfo.lineHeight;
        const thisOM = this;
        const delegate = new (class {
            constructor() {
                this.headerRowHeight = 0; // No header
            }
            getHeight(row) {
                if (thisOM.isSourceCodeRender &&
                    row.showSourceLocation &&
                    row.instruction.location?.path &&
                    row.instruction.line) {
                    // instruction line + source lines
                    if (row.instruction.endLine) {
                        return lineHeight * (row.instruction.endLine - row.instruction.line + 2);
                    }
                    else {
                        // source is only a single line.
                        return lineHeight * 2;
                    }
                }
                // just instruction line
                return lineHeight;
            }
        })();
        const instructionRenderer = this._register(this._instantiationService.createInstance(InstructionRenderer, this));
        this._disassembledInstructions = this._register(this._instantiationService.createInstance(WorkbenchTable, 'DisassemblyView', parent, delegate, [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: this.fontInfo.lineHeight,
                maximumWidth: this.fontInfo.lineHeight,
                templateId: BreakpointRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('disassemblyTableColumnLabel', 'instructions'),
                tooltip: '',
                weight: 0.3,
                templateId: InstructionRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [this._instantiationService.createInstance(BreakpointRenderer, this), instructionRenderer], {
            identityProvider: { getId: (e) => e.instruction.address },
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground,
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: false,
            accessibilityProvider: new AccessibilityProvider(),
            mouseSupport: false,
        }));
        this._disassembledInstructions.domNode.classList.add('disassembly-view');
        if (this.focusedInstructionReference) {
            this.reloadDisassembly(this.focusedInstructionReference, 0);
        }
        this._register(this._disassembledInstructions.onDidScroll((e) => {
            if (this._loadingLock) {
                return;
            }
            if (e.oldScrollTop > e.scrollTop && e.scrollTop < e.height) {
                this._loadingLock = true;
                const prevTop = Math.floor(e.scrollTop / this.fontInfo.lineHeight);
                this.scrollUp_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then((loaded) => {
                    if (loaded > 0) {
                        this._disassembledInstructions.reveal(prevTop + loaded, 0);
                    }
                    this._loadingLock = false;
                });
            }
            else if (e.oldScrollTop < e.scrollTop &&
                e.scrollTop + e.height > e.scrollHeight - e.height) {
                this._loadingLock = true;
                this.scrollDown_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then(() => {
                    this._loadingLock = false;
                });
            }
        }));
        this._register(this._debugService.getViewModel().onDidFocusStackFrame(({ stackFrame }) => {
            if (this._disassembledInstructions && stackFrame?.instructionPointerReference) {
                this.goToInstructionAndOffset(stackFrame.instructionPointerReference, 0);
            }
            this._onDidChangeStackFrame.fire();
        }));
        // refresh breakpoints view
        this._register(this._debugService.getModel().onDidChangeBreakpoints((bpEvent) => {
            if (bpEvent && this._disassembledInstructions) {
                // draw viewable BP
                let changed = false;
                bpEvent.added?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = true;
                            this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                            changed = true;
                        }
                    }
                });
                bpEvent.removed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = false;
                            changed = true;
                        }
                    }
                });
                bpEvent.changed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            if (this._disassembledInstructions.row(index).isBreakpointEnabled !== bp.enabled) {
                                this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                                changed = true;
                            }
                        }
                    }
                });
                // get an updated list so that items beyond the current range would render when reached.
                this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
                // breakpoints restored from a previous session can be based on memory
                // references that may no longer exist in the current session. Request
                // those instructions to be loaded so the BP can be displayed.
                for (const bp of this._instructionBpList) {
                    this.primeMemoryReference(bp.instructionReference);
                }
                if (changed) {
                    this._onDidChangeStackFrame.fire();
                }
            }
        }));
        this._register(this._debugService.onDidChangeState((e) => {
            if ((e === 3 /* State.Running */ || e === 2 /* State.Stopped */) &&
                this._previousDebuggingState !== 3 /* State.Running */ &&
                this._previousDebuggingState !== 2 /* State.Stopped */) {
                // Just started debugging, clear the view
                this.clear();
                this._enableSourceCodeRender =
                    this._configurationService.getValue('debug').disassemblyView.showSourceCode;
            }
            this._previousDebuggingState = e;
            this._onDidChangeStackFrame.fire();
        }));
    }
    layout(dimension) {
        this._disassembledInstructions?.layout(dimension.height);
    }
    async goToInstructionAndOffset(instructionReference, offset, focus) {
        let addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            await this.loadDisassembledInstructions(instructionReference, 0, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 2);
            addr = this._referenceToMemoryAddress.get(instructionReference);
        }
        if (addr) {
            this.goToAddress(addr + BigInt(offset), focus);
        }
    }
    /** Gets the address associated with the instruction reference. */
    getReferenceAddress(instructionReference) {
        return this._referenceToMemoryAddress.get(instructionReference);
    }
    /**
     * Go to the address provided. If no address is provided, reveal the address of the currently focused stack frame. Returns false if that address is not available.
     */
    goToAddress(address, focus) {
        if (!this._disassembledInstructions) {
            return false;
        }
        if (!address) {
            return false;
        }
        const index = this.getIndexFromAddress(address);
        if (index >= 0) {
            this._disassembledInstructions.reveal(index);
            if (focus) {
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([index]);
            }
            return true;
        }
        return false;
    }
    async scrollUp_LoadDisassembledInstructions(instructionCount) {
        const first = this._disassembledInstructions?.row(0);
        if (first) {
            return this.loadDisassembledInstructions(first.instructionReference, first.instructionReferenceOffset, first.instructionOffset - instructionCount, instructionCount);
        }
        return 0;
    }
    async scrollDown_LoadDisassembledInstructions(instructionCount) {
        const last = this._disassembledInstructions?.row(this._disassembledInstructions?.length - 1);
        if (last) {
            return this.loadDisassembledInstructions(last.instructionReference, last.instructionReferenceOffset, last.instructionOffset + 1, instructionCount);
        }
        return 0;
    }
    /**
     * Sets the memory reference address. We don't just loadDisassembledInstructions
     * for this, since we can't really deal with discontiguous ranges (we can't
     * detect _if_ a range is discontiguous since we don't know how much memory
     * comes between instructions.)
     */
    async primeMemoryReference(instructionReference) {
        if (this._referenceToMemoryAddress.has(instructionReference)) {
            return true;
        }
        const s = await this.debugSession?.disassemble(instructionReference, 0, 0, 1);
        if (s && s.length > 0) {
            try {
                this._referenceToMemoryAddress.set(instructionReference, BigInt(s[0].address));
                return true;
            }
            catch {
                return false;
            }
        }
        return false;
    }
    /** Loads disasembled instructions. Returns the number of instructions that were loaded. */
    async loadDisassembledInstructions(instructionReference, offset, instructionOffset, instructionCount) {
        const session = this.debugSession;
        const resultEntries = await session?.disassemble(instructionReference, offset, instructionOffset, instructionCount);
        // Ensure we always load the baseline instructions so we know what address the instructionReference refers to.
        if (!this._referenceToMemoryAddress.has(instructionReference) && instructionOffset !== 0) {
            await this.loadDisassembledInstructions(instructionReference, 0, 0, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD);
        }
        if (session && resultEntries && this._disassembledInstructions) {
            const newEntries = [];
            let lastLocation;
            let lastLine;
            for (let i = 0; i < resultEntries.length; i++) {
                const instruction = resultEntries[i];
                const thisInstructionOffset = instructionOffset + i;
                // Forward fill the missing location as detailed in the DAP spec.
                if (instruction.location) {
                    lastLocation = instruction.location;
                    lastLine = undefined;
                }
                if (instruction.line) {
                    const currentLine = {
                        startLineNumber: instruction.line,
                        startColumn: instruction.column ?? 0,
                        endLineNumber: instruction.endLine ?? instruction.line,
                        endColumn: instruction.endColumn ?? 0,
                    };
                    // Add location only to the first unique range. This will give the appearance of grouping of instructions.
                    if (!Range.equalsRange(currentLine, lastLine ?? null)) {
                        lastLine = currentLine;
                        instruction.location = lastLocation;
                    }
                }
                let address;
                try {
                    address = BigInt(instruction.address);
                }
                catch {
                    console.error(`Could not parse disassembly address ${instruction.address} (in ${JSON.stringify(instruction)})`);
                    continue;
                }
                const entry = {
                    allowBreakpoint: true,
                    isBreakpointSet: false,
                    isBreakpointEnabled: false,
                    instructionReference,
                    instructionReferenceOffset: offset,
                    instructionOffset: thisInstructionOffset,
                    instruction,
                    address,
                };
                newEntries.push(entry);
                // if we just loaded the first instruction for this reference, mark its address.
                if (offset === 0 && thisInstructionOffset === 0) {
                    this._referenceToMemoryAddress.set(instructionReference, address);
                }
            }
            if (newEntries.length === 0) {
                return 0;
            }
            const refBaseAddress = this._referenceToMemoryAddress.get(instructionReference);
            const bps = this._instructionBpList.map((p) => {
                const base = this._referenceToMemoryAddress.get(p.instructionReference);
                if (!base) {
                    return undefined;
                }
                return {
                    enabled: p.enabled,
                    address: base + BigInt(p.offset || 0),
                };
            });
            if (refBaseAddress !== undefined) {
                for (const entry of newEntries) {
                    const bp = bps.find((p) => p?.address === entry.address);
                    if (bp) {
                        entry.isBreakpointSet = true;
                        entry.isBreakpointEnabled = bp.enabled;
                    }
                }
            }
            const da = this._disassembledInstructions;
            if (da.length === 1 && this._disassembledInstructions.row(0) === disassemblyNotAvailable) {
                da.splice(0, 1);
            }
            const firstAddr = newEntries[0].address;
            const lastAddr = newEntries[newEntries.length - 1].address;
            const startN = binarySearch2(da.length, (i) => Number(da.row(i).address - firstAddr));
            const start = startN < 0 ? ~startN : startN;
            const endN = binarySearch2(da.length, (i) => Number(da.row(i).address - lastAddr));
            const end = endN < 0 ? ~endN : endN + 1;
            const toDelete = end - start;
            // Go through everything we're about to add, and only show the source
            // location if it's different from the previous one, "grouping" instructions by line
            let lastLocated;
            for (let i = start - 1; i >= 0; i--) {
                const { instruction } = da.row(i);
                if (instruction.location && instruction.line !== undefined) {
                    lastLocated = instruction;
                    break;
                }
            }
            const shouldShowLocation = (instruction) => instruction.line !== undefined &&
                instruction.location !== undefined &&
                (!lastLocated ||
                    !sourcesEqual(instruction.location, lastLocated.location) ||
                    instruction.line !== lastLocated.line);
            for (const entry of newEntries) {
                if (shouldShowLocation(entry.instruction)) {
                    entry.showSourceLocation = true;
                    lastLocated = entry.instruction;
                }
            }
            da.splice(start, toDelete, newEntries);
            return newEntries.length - toDelete;
        }
        return 0;
    }
    getIndexFromReferenceAndOffset(instructionReference, offset) {
        const addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            return -1;
        }
        return this.getIndexFromAddress(addr + BigInt(offset));
    }
    getIndexFromAddress(address) {
        const disassembledInstructions = this._disassembledInstructions;
        if (disassembledInstructions && disassembledInstructions.length > 0) {
            return binarySearch2(disassembledInstructions.length, (index) => {
                const row = disassembledInstructions.row(index);
                return Number(row.address - address);
            });
        }
        return -1;
    }
    /**
     * Clears the table and reload instructions near the target address
     */
    reloadDisassembly(instructionReference, offset) {
        if (!this._disassembledInstructions) {
            return;
        }
        this._loadingLock = true; // stop scrolling during the load.
        this.clear();
        this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
        this.loadDisassembledInstructions(instructionReference, offset, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 4, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 8).then(() => {
            // on load, set the target instruction in the middle of the page.
            if (this._disassembledInstructions.length > 0) {
                const targetIndex = Math.floor(this._disassembledInstructions.length / 2);
                this._disassembledInstructions.reveal(targetIndex, 0.5);
                // Always focus the target address on reload, or arrow key navigation would look terrible
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([targetIndex]);
            }
            this._loadingLock = false;
        });
    }
    clear() {
        this._referenceToMemoryAddress.clear();
        this._disassembledInstructions?.splice(0, this._disassembledInstructions.length, [
            disassemblyNotAvailable,
        ]);
    }
};
DisassemblyView = DisassemblyView_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IDebugService)
], DisassemblyView);
export { DisassemblyView };
let BreakpointRenderer = class BreakpointRenderer {
    static { BreakpointRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'breakpoint'; }
    constructor(_disassemblyView, _debugService) {
        this._disassemblyView = _disassemblyView;
        this._debugService = _debugService;
        this.templateId = BreakpointRenderer_1.TEMPLATE_ID;
        this._breakpointIcon = 'codicon-' + icons.breakpoint.regular.id;
        this._breakpointDisabledIcon = 'codicon-' + icons.breakpoint.disabled.id;
        this._breakpointHintIcon = 'codicon-' + icons.debugBreakpointHint.id;
        this._debugStackframe = 'codicon-' + icons.debugStackframe.id;
        this._debugStackframeFocused = 'codicon-' + icons.debugStackframeFocused.id;
    }
    renderTemplate(container) {
        // align from the bottom so that it lines up with instruction when source code is present.
        container.style.alignSelf = 'flex-end';
        const icon = append(container, $('.codicon'));
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.height = this._disassemblyView.fontInfo.lineHeight + 'px';
        const currentElement = { element: undefined };
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderDebugStackframe(icon, currentElement.element)),
            addStandardDisposableListener(container, 'mouseover', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.add(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'mouseout', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.remove(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'click', () => {
                if (currentElement.element?.allowBreakpoint) {
                    // click show hint while waiting for BP to resolve.
                    icon.classList.add(this._breakpointHintIcon);
                    const reference = currentElement.element.instructionReference;
                    const offset = Number(currentElement.element.address - this._disassemblyView.getReferenceAddress(reference));
                    if (currentElement.element.isBreakpointSet) {
                        this._debugService.removeInstructionBreakpoints(reference, offset);
                    }
                    else if (currentElement.element.allowBreakpoint &&
                        !currentElement.element.isBreakpointSet) {
                        this._debugService.addInstructionBreakpoint({
                            instructionReference: reference,
                            offset,
                            address: currentElement.element.address,
                            canPersist: false,
                        });
                    }
                }
            }),
        ];
        return { currentElement, icon, disposables };
    }
    renderElement(element, index, templateData, height) {
        templateData.currentElement.element = element;
        this.rerenderDebugStackframe(templateData.icon, element);
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderDebugStackframe(icon, element) {
        if (element?.address === this._disassemblyView.focusedCurrentInstructionAddress) {
            icon.classList.add(this._debugStackframe);
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            icon.classList.add(this._debugStackframeFocused);
        }
        else {
            icon.classList.remove(this._debugStackframe);
            icon.classList.remove(this._debugStackframeFocused);
        }
        icon.classList.remove(this._breakpointHintIcon);
        if (element?.isBreakpointSet) {
            if (element.isBreakpointEnabled) {
                icon.classList.add(this._breakpointIcon);
                icon.classList.remove(this._breakpointDisabledIcon);
            }
            else {
                icon.classList.remove(this._breakpointIcon);
                icon.classList.add(this._breakpointDisabledIcon);
            }
        }
        else {
            icon.classList.remove(this._breakpointIcon);
            icon.classList.remove(this._breakpointDisabledIcon);
        }
    }
};
BreakpointRenderer = BreakpointRenderer_1 = __decorate([
    __param(1, IDebugService)
], BreakpointRenderer);
let InstructionRenderer = class InstructionRenderer extends Disposable {
    static { InstructionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'instruction'; }
    static { this.INSTRUCTION_ADDR_MIN_LENGTH = 25; }
    static { this.INSTRUCTION_BYTES_MIN_LENGTH = 30; }
    constructor(_disassemblyView, themeService, editorService, textModelService, uriService, logService) {
        super();
        this._disassemblyView = _disassemblyView;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.uriService = uriService;
        this.logService = logService;
        this.templateId = InstructionRenderer_1.TEMPLATE_ID;
        this._topStackFrameColor = themeService.getColorTheme().getColor(topStackFrameColor);
        this._focusedStackFrameColor = themeService.getColorTheme().getColor(focusedStackFrameColor);
        this._register(themeService.onDidColorThemeChange((e) => {
            this._topStackFrameColor = e.getColor(topStackFrameColor);
            this._focusedStackFrameColor = e.getColor(focusedStackFrameColor);
        }));
    }
    renderTemplate(container) {
        const sourcecode = append(container, $('.sourcecode'));
        const instruction = append(container, $('.instruction'));
        this.applyFontInfo(sourcecode);
        this.applyFontInfo(instruction);
        const currentElement = { element: undefined };
        const cellDisposable = [];
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderBackground(instruction, sourcecode, currentElement.element)),
            addStandardDisposableListener(sourcecode, 'dblclick', () => this.openSourceCode(currentElement.element?.instruction)),
        ];
        return { currentElement, instruction, sourcecode, cellDisposable, disposables };
    }
    renderElement(element, index, templateData, height) {
        this.renderElementInner(element, index, templateData, height);
    }
    async renderElementInner(element, index, templateData, height) {
        templateData.currentElement.element = element;
        const instruction = element.instruction;
        templateData.sourcecode.innerText = '';
        const sb = new StringBuilder(1000);
        if (this._disassemblyView.isSourceCodeRender &&
            element.showSourceLocation &&
            instruction.location?.path &&
            instruction.line !== undefined) {
            const sourceURI = this.getUriFromSource(instruction);
            if (sourceURI) {
                let textModel = undefined;
                const sourceSB = new StringBuilder(10000);
                const ref = await this.textModelService.createModelReference(sourceURI);
                if (templateData.currentElement.element !== element) {
                    return; // avoid a race, #192831
                }
                textModel = ref.object.textEditorModel;
                templateData.cellDisposable.push(ref);
                // templateData could have moved on during async.  Double check if it is still the same source.
                if (textModel && templateData.currentElement.element === element) {
                    let lineNumber = instruction.line;
                    while (lineNumber && lineNumber >= 1 && lineNumber <= textModel.getLineCount()) {
                        const lineContent = textModel.getLineContent(lineNumber);
                        sourceSB.appendString(`  ${lineNumber}: `);
                        sourceSB.appendString(lineContent + '\n');
                        if (instruction.endLine && lineNumber < instruction.endLine) {
                            lineNumber++;
                            continue;
                        }
                        break;
                    }
                    templateData.sourcecode.innerText = sourceSB.build();
                }
            }
        }
        let spacesToAppend = 10;
        if (instruction.address !== '-1') {
            sb.appendString(instruction.address);
            if (instruction.address.length < InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH) {
                spacesToAppend =
                    InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH - instruction.address.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        if (instruction.instructionBytes) {
            sb.appendString(instruction.instructionBytes);
            spacesToAppend = 10;
            if (instruction.instructionBytes.length < InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH) {
                spacesToAppend =
                    InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH - instruction.instructionBytes.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        sb.appendString(instruction.instruction);
        templateData.instruction.innerText = sb.build();
        this.rerenderBackground(templateData.instruction, templateData.sourcecode, element);
    }
    disposeElement(element, index, templateData, height) {
        dispose(templateData.cellDisposable);
        templateData.cellDisposable = [];
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderBackground(instruction, sourceCode, element) {
        if (element && this._disassemblyView.currentInstructionAddresses.includes(element.address)) {
            instruction.style.background = this._topStackFrameColor?.toString() || 'transparent';
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            instruction.style.background = this._focusedStackFrameColor?.toString() || 'transparent';
        }
        else {
            instruction.style.background = 'transparent';
        }
    }
    openSourceCode(instruction) {
        if (instruction) {
            const sourceURI = this.getUriFromSource(instruction);
            const selection = instruction.endLine
                ? {
                    startLineNumber: instruction.line,
                    endLineNumber: instruction.endLine,
                    startColumn: instruction.column || 1,
                    endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                }
                : {
                    startLineNumber: instruction.line,
                    endLineNumber: instruction.line,
                    startColumn: instruction.column || 1,
                    endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                };
            this.editorService.openEditor({
                resource: sourceURI,
                description: localize('editorOpenedFromDisassemblyDescription', 'from disassembly'),
                options: {
                    preserveFocus: false,
                    selection: selection,
                    revealIfOpened: true,
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                    pinned: false,
                },
            });
        }
    }
    getUriFromSource(instruction) {
        // Try to resolve path before consulting the debugSession.
        const path = instruction.location.path;
        if (path && isUri(path)) {
            // path looks like a uri
            return this.uriService.asCanonicalUri(URI.parse(path));
        }
        // assume a filesystem path
        if (path && isAbsolute(path)) {
            return this.uriService.asCanonicalUri(URI.file(path));
        }
        return getUriFromSource(instruction.location, instruction.location.path, this._disassemblyView.debugSession.getId(), this.uriService, this.logService);
    }
    applyFontInfo(element) {
        applyFontInfo(element, this._disassemblyView.fontInfo);
        element.style.whiteSpace = 'pre';
    }
};
InstructionRenderer = InstructionRenderer_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IEditorService),
    __param(3, ITextModelService),
    __param(4, IUriIdentityService),
    __param(5, ILogService)
], InstructionRenderer);
class AccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('disassemblyView', 'Disassembly View');
    }
    getAriaLabel(element) {
        let label = '';
        const instruction = element.instruction;
        if (instruction.address !== '-1') {
            label += `${localize('instructionAddress', 'Address')}: ${instruction.address}`;
        }
        if (instruction.instructionBytes) {
            label += `, ${localize('instructionBytes', 'Bytes')}: ${instruction.instructionBytes}`;
        }
        label += `, ${localize(`instructionText`, 'Instruction')}: ${instruction.instruction}`;
        return label;
    }
}
let DisassemblyViewContribution = class DisassemblyViewContribution {
    constructor(editorService, debugService, contextKeyService) {
        contextKeyService.bufferChangeEvents(() => {
            this._languageSupportsDisassembleRequest =
                CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST.bindTo(contextKeyService);
        });
        const onDidActiveEditorChangeListener = () => {
            if (this._onDidChangeModelLanguage) {
                this._onDidChangeModelLanguage.dispose();
                this._onDidChangeModelLanguage = undefined;
            }
            const activeTextEditorControl = editorService.activeTextEditorControl;
            if (isCodeEditor(activeTextEditorControl)) {
                const language = activeTextEditorControl.getModel()?.getLanguageId();
                // TODO: instead of using idDebuggerInterestedInLanguage, have a specific ext point for languages
                // support disassembly
                this._languageSupportsDisassembleRequest?.set(!!language && debugService.getAdapterManager().someDebuggerInterestedInLanguage(language));
                this._onDidChangeModelLanguage = activeTextEditorControl.onDidChangeModelLanguage((e) => {
                    this._languageSupportsDisassembleRequest?.set(debugService.getAdapterManager().someDebuggerInterestedInLanguage(e.newLanguage));
                });
            }
            else {
                this._languageSupportsDisassembleRequest?.set(false);
            }
        };
        onDidActiveEditorChangeListener();
        this._onDidActiveEditorChangeListener = editorService.onDidActiveEditorChange(onDidActiveEditorChangeListener);
    }
    dispose() {
        this._onDidActiveEditorChangeListener.dispose();
        this._onDidChangeModelLanguage?.dispose();
    }
};
DisassemblyViewContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IDebugService),
    __param(2, IContextKeyService)
], DisassemblyViewContribution);
export { DisassemblyViewContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kaXNhc3NlbWJseVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sQ0FBQyxFQUVELDZCQUE2QixFQUM3QixNQUFNLEdBQ04sTUFBTSxpQ0FBaUMsQ0FBQTtBQUd4QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtB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