import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });

  response.cookies.delete({
    name: "access_token",
    path: "/",
  });

  response.cookies.delete({
    name: "refresh_token",
    path: "/",
  });

  return response;
}
