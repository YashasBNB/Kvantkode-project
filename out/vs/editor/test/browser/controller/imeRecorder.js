/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import * as browser from '../../../../base/browser/browser.js';
import * as platform from '../../../../base/common/platform.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { TextAreaWrapper } from '../../../browser/controller/editContext/textArea/textAreaEditContextInput.js';
(() => {
    const startButton = mainWindow.document.getElementById('startRecording');
    const endButton = mainWindow.document.getElementById('endRecording');
    let inputarea;
    const disposables = new DisposableStore();
    let originTimeStamp = 0;
    let recorded = {
        env: null,
        initial: null,
        events: [],
        final: null,
    };
    const readTextareaState = () => {
        return {
            selectionDirection: inputarea.selectionDirection,
            selectionEnd: inputarea.selectionEnd,
            selectionStart: inputarea.selectionStart,
            value: inputarea.value,
        };
    };
    startButton.onclick = () => {
        disposables.clear();
        startTest();
        originTimeStamp = 0;
        recorded = {
            env: {
                OS: platform.OS,
                browser: {
                    isAndroid: browser.isAndroid,
                    isFirefox: browser.isFirefox,
                    isChrome: browser.isChrome,
                    isSafari: browser.isSafari,
                },
            },
            initial: readTextareaState(),
            events: [],
            final: null,
        };
    };
    endButton.onclick = () => {
        recorded.final = readTextareaState();
        console.log(printRecordedData());
    };
    function printRecordedData() {
        const lines = [];
        lines.push(`const recorded: IRecorded = {`);
        lines.push(`\tenv: ${JSON.stringify(recorded.env)}, `);
        lines.push(`\tinitial: ${printState(recorded.initial)}, `);
        lines.push(`\tevents: [\n\t\t${recorded.events.map((ev) => printEvent(ev)).join(',\n\t\t')}\n\t],`);
        lines.push(`\tfinal: ${printState(recorded.final)},`);
        lines.push(`}`);
        return lines.join('\n');
        function printString(str) {
            return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        }
        function printState(state) {
            return `{ value: '${printString(state.value)}', selectionStart: ${state.selectionStart}, selectionEnd: ${state.selectionEnd}, selectionDirection: '${state.selectionDirection}' }`;
        }
        function printEvent(ev) {
            if (ev.type === 'keydown' || ev.type === 'keypress' || ev.type === 'keyup') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', altKey: ${ev.altKey}, charCode: ${ev.charCode}, code: '${ev.code}', ctrlKey: ${ev.ctrlKey}, isComposing: ${ev.isComposing}, key: '${ev.key}', keyCode: ${ev.keyCode}, location: ${ev.location}, metaKey: ${ev.metaKey}, repeat: ${ev.repeat}, shiftKey: ${ev.shiftKey} }`;
            }
            if (ev.type === 'compositionstart' ||
                ev.type === 'compositionupdate' ||
                ev.type === 'compositionend') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', data: '${printString(ev.data)}' }`;
            }
            if (ev.type === 'beforeinput' || ev.type === 'input') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', data: ${ev.data === null ? 'null' : `'${printString(ev.data)}'`}, inputType: '${ev.inputType}', isComposing: ${ev.isComposing} }`;
            }
            return JSON.stringify(ev);
        }
    }
    function startTest() {
        inputarea = document.createElement('textarea');
        mainWindow.document.body.appendChild(inputarea);
        inputarea.focus();
        disposables.add(toDisposable(() => {
            inputarea.remove();
        }));
        const wrapper = disposables.add(new TextAreaWrapper(inputarea));
        wrapper.setValue('', `aaaa`);
        wrapper.setSelectionRange('', 2, 2);
        const recordEvent = (e) => {
            recorded.events.push(e);
        };
        const recordKeyboardEvent = (e) => {
            if (e.type !== 'keydown' && e.type !== 'keypress' && e.type !== 'keyup') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                altKey: e.altKey,
                charCode: e.charCode,
                code: e.code,
                ctrlKey: e.ctrlKey,
                isComposing: e.isComposing,
                key: e.key,
                keyCode: e.keyCode,
                location: e.location,
                metaKey: e.metaKey,
                repeat: e.repeat,
                shiftKey: e.shiftKey,
            };
            recordEvent(ev);
        };
        const recordCompositionEvent = (e) => {
            if (e.type !== 'compositionstart' &&
                e.type !== 'compositionupdate' &&
                e.type !== 'compositionend') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                data: e.data,
            };
            recordEvent(ev);
        };
        const recordInputEvent = (e) => {
            if (e.type !== 'beforeinput' && e.type !== 'input') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                data: e.data,
                inputType: e.inputType,
                isComposing: e.isComposing,
            };
            recordEvent(ev);
        };
        wrapper.onKeyDown(recordKeyboardEvent);
        wrapper.onKeyPress(recordKeyboardEvent);
        wrapper.onKeyUp(recordKeyboardEvent);
        wrapper.onCompositionStart(recordCompositionEvent);
        wrapper.onCompositionUpdate(recordCompositionEvent);
        wrapper.onCompositionEnd(recordCompositionEvent);
        wrapper.onBeforeInput(recordInputEvent);
        wrapper.onInput(recordInputEvent);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9pbWVSZWNvcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBU3BGLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhFQUE4RSxDQUU3RztBQUFBLENBQUMsR0FBRyxFQUFFO0lBQ04sTUFBTSxXQUFXLEdBQXNCLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFFLENBQUE7SUFDNUYsTUFBTSxTQUFTLEdBQXNCLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBRSxDQUFBO0lBRXhGLElBQUksU0FBOEIsQ0FBQTtJQUNsQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQTtJQUN2QixJQUFJLFFBQVEsR0FBYztRQUN6QixHQUFHLEVBQUUsSUFBSztRQUNWLE9BQU8sRUFBRSxJQUFLO1FBQ2QsTUFBTSxFQUFFLEVBQUU7UUFDVixLQUFLLEVBQUUsSUFBSztLQUNaLENBQUE7SUFFRCxNQUFNLGlCQUFpQixHQUFHLEdBQTJCLEVBQUU7UUFDdEQsT0FBTztZQUNOLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxrQkFBa0I7WUFDaEQsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1lBQ3BDLGNBQWMs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