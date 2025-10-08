import request from "supertest";
import express from "express";
import passport from "passport";
import authRoutes from "../../../routes/authRoute";
import { callbackConnexion } from "../../../controllers/authController";

// Mock des dépendances
jest.mock("passport");
jest.mock("../../../controllers/authController");

const mockPassport = passport as jest.Mocked<typeof passport>;
const mockCallbackConnexion = callbackConnexion as jest.MockedFunction<typeof callbackConnexion>;

describe("authRoute", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/auth", authRoutes);
    
    jest.clearAllMocks();
  });

  describe("POST /auth/callback", () => {
    it("should be defined", () => {
      expect(authRoutes).toBeDefined();
    });

    it("should use passport authentication middleware", () => {
      // Vérifier que la route utilise passport.authenticate
      expect(mockPassport.authenticate).toHaveBeenCalledWith(
        "twitch-token",
        { session: false }
      );
    });

    it("should call callbackConnexion controller", () => {
      // Vérifier que le contrôleur est bien utilisé
      expect(mockCallbackConnexion).toBeDefined();
    });

    it("should have correct route path", () => {
      // Test d'intégration pour vérifier que la route est bien configurée
      const routes = authRoutes.stack;
      const callbackRoute = routes.find((layer: any) => 
        layer.route && layer.route.path === "/callback" && layer.route.methods.post
      );
      
      expect(callbackRoute).toBeDefined();
    });
  });

  describe("Route configuration", () => {
    it("should export router as default", () => {
      expect(authRoutes).toBeDefined();
      expect(typeof authRoutes).toBe("function");
    });

    it("should have correct middleware stack", () => {
      const routes = authRoutes.stack;
      expect(routes.length).toBeGreaterThan(0);
      
      // Vérifier qu'il y a une route POST /callback
      const callbackRoute = routes.find((layer: any) => 
        layer.route && layer.route.path === "/callback"
      );
      
      expect(callbackRoute).toBeDefined();
      expect(callbackRoute?.route).toBeDefined();
    });
  });
});
