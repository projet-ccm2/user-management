export type UserChannelInfo = {
  id: string;
  username: string;
  channelDescription: string;
  profileImageUrl: string;
};

export type UserAuthApproval = {
  accessToken: string;
  idToken: string;
  tokenType?: string;
  scope?: string[];
  expiresIn?: number;
  expiresAt?: Date;
  state?: string;
  approvedAt: Date;
};

class User {
  username: string;
  channel: UserChannelInfo;
  channelsWhichIsMod: UserChannelInfo[];
  auth?: UserAuthApproval;

  constructor(params: {
    username: string;
    channel: UserChannelInfo;
    channelsWhichIsMod?: UserChannelInfo[];
    auth?: UserAuthApproval;
  }) {
    this.username = params.username;
    this.channel = params.channel;
    this.channelsWhichIsMod = params.channelsWhichIsMod
      ? [...params.channelsWhichIsMod]
      : [];
    if (params.auth) {
      this.auth = {
        ...params.auth,
        scope: params.auth.scope ? [...params.auth.scope] : undefined,
      };
    }
  }

  public getAllWithoutAuth(): Partial<User> {
    return {
      username: this.username,
      channel: this.channel,
      channelsWhichIsMod: this.channelsWhichIsMod,
    };
  }
}

export default User;
