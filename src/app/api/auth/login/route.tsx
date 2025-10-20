import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // Sign access token
  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_ACCESS_SECRET! as Secret,
    { expiresIn: Number(process.env.JWT_ACCESS_EXPIRES) || 900 } // 15 mins
  );

  // Sign refresh token
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET! as Secret,
    { expiresIn: Number(process.env.JWT_REFRESH_EXPIRES) || 604800 } // 7 days
  );

  // Store refresh token in DB (optional, for token revocation)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Set tokens in HttpOnly cookies
  const response = NextResponse.json({ message: "Login successful" });

  response.cookies.set({
    name: "access_token",
    value: accessToken,
    httpOnly: true,
    path: "/",
    maxAge: Number(process.env.JWT_ACCESS_EXPIRES) || 900,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  response.cookies.set({
    name: "refresh_token",
    value: refreshToken,
    httpOnly: true,
    path: "/",
    maxAge: Number(process.env.JWT_REFRESH_EXPIRES) || 604800,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
