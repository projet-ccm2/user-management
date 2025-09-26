
export class TwitchAuthInfo {
    accessToken: string;
    idToken: string;
    tokenType?: string;
    expiresIn?: number;
    scope?: string[];
    state?: string;

    constructor(params: {
        accessToken: string;
        idToken: string;
        tokenType?: string;
        expiresIn?: number;
        scope?: string[];
        state?: string;
    }) {
        this.accessToken = params.accessToken;
        this.idToken = params.idToken;
        this.tokenType = params.tokenType;
        this.expiresIn = params.expiresIn;
        this.scope = params.scope;
        this.state = params.state;
    }

    static fromResBody(body: any): TwitchAuthInfo | null {
        if (!body.accessToken || !body.idToken) {
            return null
        }

        return new TwitchAuthInfo(body);
    }
}
