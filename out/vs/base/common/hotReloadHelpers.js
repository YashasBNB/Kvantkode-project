/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHotReloadEnabled, registerHotReloadHandler } from './hotReload.js';
import { constObservable, observableSignalFromEvent, observableValue, } from './observable.js';
export function readHotReloadableExport(value, reader) {
    observeHotReloadableExports([value], reader);
    return value;
}
export function observeHotReloadableExports(values, reader) {
    if (isHotReloadEnabled()) {
        const o = observableSignalFromEvent('reload', (event) => registerHotReloadHandler(({ oldExports }) => {
            if (![...Object.values(oldExports)].some((v) => values.includes(v))) {
                return undefined;
            }
            return (_newExports) => {
                event(undefined);
                return true;
            };
        }));
        o.read(reader);
    }
}
const classes = new Map();
export function createHotClass(clazz) {
    if (!isHotReloadEnabled()) {
        return constObservable(clazz);
    }
    const id = clazz.name;
    let existing = classes.get(id);
    if (!existing) {
        existing = observableValue(id, clazz);
        classes.set(id, existing);
    }
    else {
        setTimeout(() => {
            existing.set(clazz, undefined);
        }, 0);
    }
    return existing;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG90UmVsb2FkSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2hvdFJlbG9hZEhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDN0UsT0FBTyxFQUNOLGVBQWUsRUFJZix5QkFBeUIsRUFDekIsZUFBZSxHQUNmLE1BQU0saUJBQWlCLENBQUE7QUFFeEIsTUFBTSxVQUFVLHVCQUF1QixDQUFJLEtBQVEsRUFBRSxNQUEyQjtJQUMvRSwyQkFBMkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzVDLE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxNQUFhLEVBQUUsTUFBMkI7SUFDckYsSUFBSSxrQkFBa0IsRUFBRSxFQUFFLENBQUM7UUFDMUIsTUFBTSxDQUFDLEdBQUcseUJBQXlCLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDdkQsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDckUsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNoQixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUMsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtBQUUvRCxNQUFNLFVBQVUsY0FBYyxDQUFJLEtBQVE7SUFDekMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQztRQUMzQixPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsTUFBTSxFQUFFLEdBQUksS0FBYSxDQUFDLElBQUksQ0FBQTtJQUU5QixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzlCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLFFBQVEsR0FBRyxlQUFlLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFCLENBQUM7U0FBTSxDQUFDO1FBQ1AsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLFFBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2hDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFDRCxPQUFPLFFBQTBCLENBQUE7QUFDbEMsQ0FBQyJ9