import {Channel} from "./Channel";

export class User {
    id:number;
    username: string;
    channel:Channel;
    badges: number[];

    constructor(
        id:number,
    username: string,
    channel:Channel,
    badges: number[],
    ) {
        this.id = id;
        this.username = username;
        this.channel = channel;
        this.badges = badges;
    }

    static fromTwitchApi(data: any, channel: Channel): User {
        return new User(data.id, data.username, channel, []);
    }

}