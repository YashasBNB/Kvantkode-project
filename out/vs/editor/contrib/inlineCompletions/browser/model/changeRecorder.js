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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CodeEditorWidget } from '../../../../browser/widget/codeEditor/codeEditorWidget.js';
import { StructuredLogger } from '../structuredLogger.js';
let TextModelChangeRecorder = class TextModelChangeRecorder extends Disposable {
    constructor(_editor, _instantiationService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._structuredLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logChangeReason.commandId'));
        this._register(autorunWithStore((reader, store) => {
            if (!(this._editor instanceof CodeEditorWidget)) {
                return;
            }
            if (!this._structuredLogger.isEnabled.read(reader)) {
                return;
            }
            const sources = [];
            store.add(this._editor.onBeforeExecuteEdit(({ source }) => {
                if (source) {
                    sources.push(source);
                }
            }));
            store.add(this._editor.onDidChangeModelContent((e) => {
                const tm = this._editor.getModel();
                if (!tm) {
                    return;
                }
                for (const source of sources) {
                    const data = {
                        sourceId: 'TextModel.setChangeReason',
                        source: source,
                        time: Date.now(),
                        modelUri: tm.uri.toString(),
                        modelVersion: tm.getVersionId(),
                    };
                    this._structuredLogger.log(data);
                }
                sources.length = 0;
            }));
        }));
    }
};
TextModelChangeRecorder = __decorate([
    __param(1, IInstantiationService)
], TextModelChangeRecorder);
export { TextModelChangeRecorder };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2NoYW5nZVJlY29yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM1RixPQUFPLEVBQTZCLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFN0UsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBUXRELFlBQ2tCLE9BQW9CLEVBQ2QscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSFUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFUcEUsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDeEMsZ0JBQWdCLENBQUMsSUFBSSxFQUFrRCxFQUN2RSxnREFBZ0QsQ0FDaEQsQ0FDRCxDQUFBO1FBT0EsSUFBSSxDQUFDLFNBQVMsQ0FDYixnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNsQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxZQUFZLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDakQsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDcEQsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7WUFFNUIsS0FBSyxDQUFDLEdBQUcsQ0FDUixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUMvQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3JCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FDUixJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ2xDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDVCxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxJQUFJLEdBQW1EO3dCQUM1RCxRQUFRLEVBQUUsMkJBQTJCO3dCQUNyQyxNQUFNLEVBQUUsTUFBTTt3QkFDZCxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDaEIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO3dCQUMzQixZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRTtxQkFDL0IsQ0FBQTtvQkFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO2dCQUNELE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ25CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF0RFksdUJBQXVCO0lBVWpDLFdBQUEscUJBQXFCLENBQUE7R0FWWCx1QkFBdUIsQ0FzRG5DIn0=