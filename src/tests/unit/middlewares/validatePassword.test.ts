import { validatePassword } from "../../../middlewares/validatePassword";
import { Response } from "express";

describe("Password Validation Tests", () => {
  let res: Response;

  const dataTest = [
    {
      input: "short",
      expected: "The password must be at least 8 characters long.",
      itTitle: "Should reject a short password.",
    },
    {
      input: "lowercase1!",
      expected: "The password must contain at least one uppercase letter.",
      itTitle: "Should reject a password without uppercase letter.",
    },
    {
      input: "UPPERCASE1!",
      expected: "The password must contain at least one lowercase letter.",
      itTitle: "Should reject a password without lowercase letter.",
    },
    {
      input: "Password!",
      expected: "The password must contain at least one digit.",
      itTitle: "Should reject a password without digit.",
    },
    {
      input: "Password1",
      expected:
        "The password must contain at least one special character (@$!%*?&).",
      itTitle: "Should reject a password without special character.",
    },
    {
      input: "ValidPassword1!",
      expected: "",
      itTitle: "Should accept a valid password.",
    },
  ];

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  });

  dataTest.forEach((data) => {
    it(data.itTitle, () => {
      try {
        validatePassword(data.input, res);
        if (data.expected !== "") {
          throw new Error("Expected validation to fail but it passed.");
        }
      } catch (error) {
        if (data.expected === "") {
          throw new Error("Expected validation to pass but it failed.");
        }
        expect((error as Error).message).toBe(data.expected);
      }
    });
  });
});
