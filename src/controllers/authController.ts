import { Request, Response } from "express";
import {TwitchAuthInfo} from "../class/TwitchAuthInfo";
import {User} from "../class/User";
import {Channel} from "../class/Channel";
import {getUser} from "../services/authService";

export const callbackConnexion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({
        error:
          "Missing env var TWITCH_CLIENT_ID. Configure it to validate id_token audience.",
      });
      return;
    }
    const twitchInfo = TwitchAuthInfo.fromResBody(res.body)

      if(!twitchInfo){
          res.status(400).json({
                error: "Invalid Twitch auth info",
          })
      }

      //TODO: get data from twitch API
      const dataUser = await fetch("http://localhost:8080")
      const channel = Channel.fromTwitchApi(dataUser)
      const user = User.fromTwitchApi(dataUser, channel)

      // getUser
      const userDb = await getUser(user.id)

    res.status(200).json({
      ok: true,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error);
      res
        .status(400)
        .json({ error: "Error during registration :" + error.message });
      return;
    } else {
      console.error("Unknown error", error);
    }
  }
};
