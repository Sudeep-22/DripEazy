import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  return NextResponse.json(user);
}