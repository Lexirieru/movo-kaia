import jwt from "jsonwebtoken";

export function generateToken(payload: object): string {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "30d", // atau "15m", "7d", "2h",
  });
  return token;
}
