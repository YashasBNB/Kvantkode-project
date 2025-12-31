/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TelemetryAppenderChannel {
    constructor(appenders) {
        this.appenders = appenders;
    }
    listen(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, { eventName, data }) {
        this.appenders.forEach((a) => a.log(eventName, data));
        return Promise.resolve(null);
    }
}
export class TelemetryAppenderClient {
    constructor(channel) {
        this.channel = channel;
    }
    log(eventName, data) {
        this.channel
            .call('log', { eventName, data })
            .then(undefined, (err) => `Failed to log telemetry: ${console.warn(err)}`);
        return Promise.resolve(null);
    }
    flush() {
        // TODO
        return Promise.resolve();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5SXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnlJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxZQUFvQixTQUErQjtRQUEvQixjQUFTLEdBQVQsU0FBUyxDQUFzQjtJQUFHLENBQUM7SUFFdkQsTUFBTSxDQUFJLENBQVUsRUFBRSxLQUFhO1FBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFVLEVBQUUsT0FBZSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBaUI7UUFDbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDckQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFDbkMsWUFBb0IsT0FBaUI7UUFBakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUFHLENBQUM7SUFFekMsR0FBRyxDQUFDLFNBQWlCLEVBQUUsSUFBVTtRQUNoQyxJQUFJLENBQUMsT0FBTzthQUNWLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDaEMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsNEJBQTRCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTNFLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87UUFDUCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0NBQ0QifQ==