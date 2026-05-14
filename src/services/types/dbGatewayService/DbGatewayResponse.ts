export interface DbGatewayResponse {
  id: string;
  username: string;
  profileImageUrl: string | null;
  channelDescription: string | null;
  scope: string | null;
  lastUpdateTimestamp: string;
  xp: number;
}
