/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isCancellationError, isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler, } from '../../../base/common/errors.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
export default class ErrorTelemetry extends BaseErrorTelemetry {
    installErrorListeners() {
        setUnexpectedErrorHandler((err) => console.error(err));
        // Print a console message when rejection isn't handled within N seconds. For details:
        // see https://nodejs.org/api/process.html#process_event_unhandledrejection
        // and https://nodejs.org/api/process.html#process_event_rejectionhandled
        const unhandledPromises = [];
        process.on('unhandledRejection', (reason, promise) => {
            unhandledPromises.push(promise);
            setTimeout(() => {
                const idx = unhandledPromises.indexOf(promise);
                if (idx >= 0) {
                    promise.catch((e) => {
                        unhandledPromises.splice(idx, 1);
                        if (!isCancellationError(e)) {
                            console.warn(`rejected promise not handled within 1 second: ${e}`);
                            if (e.stack) {
                                console.warn(`stack trace: ${e.stack}`);
                            }
                            if (reason) {
                                onUnexpectedError(reason);
                            }
                        }
                    });
                }
            }, 1000);
        });
        process.on('rejectionHandled', (promise) => {
            const idx = unhandledPromises.indexOf(promise);
            if (idx >= 0) {
                unhandledPromises.splice(idx, 1);
            }
        });
        // Print a console message when an exception isn't handled.
        process.on('uncaughtException', (err) => {
            if (isSigPipeError(err)) {
                return;
            }
            onUnexpectedError(err);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvbm9kZS9lcnJvclRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIseUJBQXlCLEdBQ3pCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxrQkFBa0IsTUFBTSw2QkFBNkIsQ0FBQTtBQUU1RCxNQUFNLENBQUMsT0FBTyxPQUFPLGNBQWUsU0FBUSxrQkFBa0I7SUFDMUMscUJBQXFCO1FBQ3ZDLHlCQUF5QixDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFdEQsc0ZBQXNGO1FBQ3RGLDJFQUEyRTtRQUMzRSx5RUFBeUU7UUFDekUsTUFBTSxpQkFBaUIsR0FBbUIsRUFBRSxDQUFBO1FBQzVDLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFXLEVBQUUsT0FBcUIsRUFBRSxFQUFFO1lBQ3ZFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMvQixVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO3dCQUNuQixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO3dCQUNoQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0QkFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxFQUFFLENBQUMsQ0FBQTs0QkFDbEUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7NEJBQ3hDLENBQUM7NEJBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQ0FDWixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTs0QkFDMUIsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDVCxDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxPQUFxQixFQUFFLEVBQUU7WUFDeEQsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzlDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNkLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsMkRBQTJEO1FBQzNELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFrQyxFQUFFLEVBQUU7WUFDdEUsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTTtZQUNQLENBQUM7WUFFRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9