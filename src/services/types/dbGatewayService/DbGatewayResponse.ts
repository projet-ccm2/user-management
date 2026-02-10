export interface DbGatewayResponse {
  id: string;
  username: string;
  twitchUserId: string;
  profileImageUrl: string | null;
  channelDescription: string | null;
  scope: string | null;
}
