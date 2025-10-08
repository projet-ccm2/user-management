import authRoutes from "../../../routes/authRoute";

describe("authRoute", () => {
  it("should export router as default", () => {
    expect(authRoutes).toBeDefined();
    expect(typeof authRoutes).toBe("function");
  });

  it("should have middleware stack", () => {
    const routes = authRoutes.stack;
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should be a valid Express router", () => {
    expect(authRoutes).toBeDefined();
    expect(typeof authRoutes).toBe("function");
  });
});
