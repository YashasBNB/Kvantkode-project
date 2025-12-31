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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvaW1lUmVjb3JkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVNwRixPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4RUFBOEUsQ0FFN0c7QUFBQSxDQUFDLEdBQUcsRUFBRTtJQUNOLE1BQU0sV0FBVyxHQUFzQixVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFBO0lBQzVGLE1BQU0sU0FBUyxHQUFzQixVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUUsQ0FBQTtJQUV4RixJQUFJLFNBQThCLENBQUE7SUFDbEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7SUFDdkIsSUFBSSxRQUFRLEdBQWM7UUFDekIsR0FBRyxFQUFFLElBQUs7UUFDVixPQUFPLEVBQUUsSUFBSztRQUNkLE1BQU0sRUFBRSxFQUFFO1FBQ1YsS0FBSyxFQUFFLElBQUs7S0FDWixDQUFBO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxHQUEyQixFQUFFO1FBQ3RELE9BQU87WUFDTixrQkFBa0IsRUFBRSxTQUFTLENBQUMsa0JBQWtCO1lBQ2hELFlBQVksRUFBRSxTQUFTLENBQUMsWUFBWTtZQUNwQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7WUFDeEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLO1NBQ3RCLENBQUE7SUFDRixDQUFDLENBQUE7SUFFRCxXQUFXLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtRQUMxQixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsU0FBUyxFQUFFLENBQUE7UUFDWCxlQUFlLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLFFBQVEsR0FBRztZQUNWLEdBQUcsRUFBRTtnQkFDSixFQUFFLEVBQUUsUUFBUSxDQUFDLEVBQUU7Z0JBQ2YsT0FBTyxFQUFFO29CQUNSLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztvQkFDNUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO29CQUM1QixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7b0JBQzFCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtpQkFDMUI7YUFDRDtZQUNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRTtZQUM1QixNQUFNLEVBQUUsRUFBRTtZQUNWLEtBQUssRUFBRSxJQUFLO1NBQ1osQ0FBQTtJQUNGLENBQUMsQ0FBQTtJQUNELFNBQVMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFO1FBQ3hCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUE7SUFFRCxTQUFTLGlCQUFpQjtRQUN6QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDaEIsS0FBSyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzNDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEQsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFELEtBQUssQ0FBQyxJQUFJLENBQ1Qsb0JBQW9CLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FDdkYsQ0FBQTtRQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyRCxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWYsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXZCLFNBQVMsV0FBVyxDQUFDLEdBQVc7WUFDL0IsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFDRCxTQUFTLFVBQVUsQ0FBQyxLQUE2QjtZQUNoRCxPQUFPLGFBQWEsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEtBQUssQ0FBQyxjQUFjLG1CQUFtQixLQUFLLENBQUMsWUFBWSwwQkFBMEIsS0FBSyxDQUFDLGtCQUFrQixLQUFLLENBQUE7UUFDbkwsQ0FBQztRQUNELFNBQVMsVUFBVSxDQUFDLEVBQWtCO1lBQ3JDLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDNUUsT0FBTyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxNQUFNLGVBQWUsRUFBRSxDQUFDLFFBQVEsWUFBWSxFQUFFLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxPQUFPLGtCQUFrQixFQUFFLENBQUMsV0FBVyxXQUFXLEVBQUUsQ0FBQyxHQUFHLGVBQWUsRUFBRSxDQUFDLE9BQU8sZUFBZSxFQUFFLENBQUMsUUFBUSxjQUFjLEVBQUUsQ0FBQyxPQUFPLGFBQWEsRUFBRSxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsUUFBUSxJQUFJLENBQUE7WUFDL1csQ0FBQztZQUNELElBQ0MsRUFBRSxDQUFDLElBQUksS0FBSyxrQkFBa0I7Z0JBQzlCLEVBQUUsQ0FBQyxJQUFJLEtBQUssbUJBQW1CO2dCQUMvQixFQUFFLENBQUMsSUFBSSxLQUFLLGdCQUFnQixFQUMzQixDQUFDO2dCQUNGLE9BQU8sZ0JBQWdCLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksYUFBYSxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDeEksQ0FBQztZQUNELElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDdEQsT0FBTyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLFNBQVMsbUJBQW1CLEVBQUUsQ0FBQyxXQUFXLElBQUksQ0FBQTtZQUN2TyxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxTQUFTO1FBQ2pCLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDakIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRS9ELE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5DLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBaUIsRUFBRSxFQUFFO1lBQ3pDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLENBQUMsQ0FBQTtRQUVELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFnQixFQUFRLEVBQUU7WUFDdEQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUN6RSxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUNELElBQUksZUFBZSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixlQUFlLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUM5QixDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQTJCO2dCQUNsQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxlQUFlO2dCQUN4QyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQzFCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU07Z0JBQ2hCLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUTtnQkFDcEIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTztnQkFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO2dCQUMxQixHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUc7Z0JBQ1YsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2dCQUNsQixRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7Z0JBQ3BCLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTztnQkFDbEIsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNO2dCQUNoQixRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7YUFDcEIsQ0FBQTtZQUNELFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUE7UUFFRCxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBbUIsRUFBUSxFQUFFO1lBQzVELElBQ0MsQ0FBQyxDQUFDLElBQUksS0FBSyxrQkFBa0I7Z0JBQzdCLENBQUMsQ0FBQyxJQUFJLEtBQUssbUJBQW1CO2dCQUM5QixDQUFDLENBQUMsSUFBSSxLQUFLLGdCQUFnQixFQUMxQixDQUFDO2dCQUNGLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBQ0QsSUFBSSxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLGVBQWUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQzlCLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBOEI7Z0JBQ3JDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLGVBQWU7Z0JBQ3hDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtnQkFDMUIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTthQUNaLENBQUE7WUFDRCxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEIsQ0FBQyxDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQWEsRUFBUSxFQUFFO1lBQ2hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7WUFDRCxJQUFJLGVBQWUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsZUFBZSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDOUIsQ0FBQztZQUNELE1BQU0sRUFBRSxHQUF3QjtnQkFDL0IsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsZUFBZTtnQkFDeEMsS0FBSyxFQUFFLGlCQUFpQixFQUFFO2dCQUMxQixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0JBQ1osSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUztnQkFDdEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO2FBQzFCLENBQUE7WUFDRCxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEIsQ0FBQyxDQUFBO1FBRUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3RDLE9BQU8sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN2QyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDcEMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbEQsT0FBTyxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbkQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDaEQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQSJ9