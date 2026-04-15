import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.TWITCH_CLIENT_ID = "test_client_id";
process.env.TWITCH_EXTENSION_SECRET = "dGVzdF9leHRlbnNpb25fc2VjcmV0";
process.env.PORT = "3000";

jest.setTimeout(10000);
