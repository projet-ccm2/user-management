
export class Channel {
    mods: string[];
    channelId: number;
    channelName: string;

    constructor(
        mods: string[],
        channelId: number,
        channelName: string,

    ) {
        this.mods = mods;
        this.channelId = channelId;
        this.channelName = channelName;
    }

    static fromTwitchApi(data: any): Channel {
        return new Channel(
            data.mods,
            data.channelId,
            data.channelName,
        );
    }

}