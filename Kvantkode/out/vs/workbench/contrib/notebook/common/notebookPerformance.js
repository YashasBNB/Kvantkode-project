/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class NotebookPerfMarks {
    constructor() {
        this._marks = {};
    }
    get value() {
        return { ...this._marks };
    }
    mark(name) {
        if (this._marks[name]) {
            console.error(`Skipping overwrite of notebook perf value: ${name}`);
            return;
        }
        this._marks[name] = Date.now();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQZXJmb3JtYW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rUGVyZm9ybWFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEcsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUNTLFdBQU0sR0FBb0IsRUFBRSxDQUFBO0lBY3JDLENBQUM7SUFaQSxJQUFJLEtBQUs7UUFDUixPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFjO1FBQ2xCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUMsOENBQThDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDbkUsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0NBQ0QifQ==