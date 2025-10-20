import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt, { Secret } from "jsonwebtoken";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET! as Secret) as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET! as Secret,
      { expiresIn: Number(process.env.JWT_ACCESS_EXPIRES) || 900 }
    );

    const response = NextResponse.json({ message: "Access token refreshed" });

    response.cookies.set({
      name: "access_token",
      value: accessToken,
      httpOnly: true,
      path: "/",
      maxAge: Number(process.env.JWT_ACCESS_EXPIRES) || 900,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }
}
